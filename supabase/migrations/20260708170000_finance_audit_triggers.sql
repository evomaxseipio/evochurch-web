-- Audit triggers: income_entries (contributions + operational income) and
-- transactions (update/delete only — create/authorize already logged in RPCs).

CREATE OR REPLACE FUNCTION public.fn_is_fund_transfer_income_entry(
  p_income_type_id integer,
  p_notes text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.income_type_catalog itc
    WHERE itc.id = p_income_type_id
      AND COALESCE(itc.is_operational, false) = true
      AND itc.type_name = 'Transferencia'
      AND COALESCE(p_notes, '') LIKE 'Transferencia desde%hacia%'
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_income_entry_contributor_label(p_income_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(CONCAT(pr.first_name, ' ', pr.last_name)), ''),
    NULLIF(TRIM(co.contact_name), ''),
    NULLIF(TRIM(co.company_name), ''),
  '—')
  FROM public.income_contributors ic
  INNER JOIN public.contributors co
    ON co.contributor_id = ic.contributor_id
  LEFT JOIN public.profiles pr
    ON pr.id = co.profile_id
  WHERE ic.income_id = p_income_id
    AND ic.is_primary = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.trg_audit_income_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_row public.income_entries%ROWTYPE;
  v_action text;
  v_church_id integer;
  v_income_id uuid;
  v_is_operational boolean;
  v_type_name text;
  v_fund_name text;
  v_contributor text;
  v_amount_text text;
  v_entity_type text;
  v_summary text;
  v_summary_key text;
  v_params jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
    v_action := 'delete';
  ELSIF TG_OP = 'UPDATE' THEN
    v_row := NEW;
    v_action := 'update';
  ELSE
    v_row := NEW;
    v_action := 'create';
  END IF;

  v_church_id := v_row.church_id;
  v_income_id := v_row.income_id;

  IF public.fn_is_fund_transfer_income_entry(v_row.income_type_id, v_row.notes) THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(itc.is_operational, false),
    COALESCE(itc.type_name, '')
  INTO v_is_operational, v_type_name
  FROM public.income_type_catalog itc
  WHERE itc.id = v_row.income_type_id;

  SELECT COALESCE(f.fund_name, '')
  INTO v_fund_name
  FROM public.funds f
  WHERE f.fund_id = v_row.fund_id
    AND f.church_id = v_church_id;

  v_amount_text := COALESCE(v_row.amount::text, '0');
  v_contributor := public.fn_income_entry_contributor_label(v_income_id);

  IF v_is_operational THEN
    v_entity_type := 'operational_income';
    v_summary_key := 'actions.finances.operational_income.' || v_action;
    v_params := jsonb_build_object(
      'amount', v_amount_text,
      'type', v_type_name,
      'fund', v_fund_name,
      'description', COALESCE(NULLIF(TRIM(v_row.notes), ''), v_type_name)
    );
    v_summary := CASE v_action
      WHEN 'create' THEN 'Registró ingreso operacional (' || v_type_name || ') por RD$' || v_amount_text
      WHEN 'update' THEN 'Editó ingreso operacional (' || v_type_name || ') por RD$' || v_amount_text
      ELSE 'Eliminó ingreso operacional (' || v_type_name || ') por RD$' || v_amount_text
    END;
  ELSE
    v_entity_type := 'contribution';
    v_summary_key := 'actions.finances.contribution.' || v_action;
    v_params := jsonb_build_object(
      'amount', v_amount_text,
      'type', v_type_name,
      'fund', v_fund_name,
      'contributor', v_contributor
    );
    v_summary := CASE v_action
      WHEN 'create' THEN
        'Registró contribución (' || v_type_name || ') por RD$' || v_amount_text
        || CASE WHEN v_fund_name <> '' THEN ' · ' || v_fund_name ELSE '' END
      WHEN 'update' THEN
        'Editó contribución (' || v_type_name || ') por RD$' || v_amount_text
        || CASE WHEN v_contributor <> '—' THEN ' · ' || v_contributor ELSE '' END
      ELSE
        'Eliminó contribución (' || v_type_name || ') por RD$' || v_amount_text
    END;
  END IF;

  PERFORM public.fn_append_church_audit_log(
    v_church_id,
    'finances',
    v_action,
    v_entity_type,
    v_income_id::text,
    v_summary,
    v_summary_key,
    v_params
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_audit_transactions_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_row public.transactions%ROWTYPE;
  v_action text;
  v_amount_text text;
  v_fund_name text;
  v_type_name text;
  v_summary text;
  v_params jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Authorization flows already log via sp_authorize_transaction / sp_authorize_fund_transfer.
    IF OLD.authorization_status IS DISTINCT FROM NEW.authorization_status THEN
      RETURN NEW;
    END IF;
    IF OLD.authorized_by_profile_id IS DISTINCT FROM NEW.authorized_by_profile_id
       AND OLD.transaction_amount IS NOT DISTINCT FROM NEW.transaction_amount
       AND OLD.fund_id IS NOT DISTINCT FROM NEW.fund_id
       AND OLD.expenses_type_id IS NOT DISTINCT FROM NEW.expenses_type_id
       AND OLD.transaction_description IS NOT DISTINCT FROM NEW.transaction_description
       AND OLD.payment_method IS NOT DISTINCT FROM NEW.payment_method
       AND OLD.transaction_date IS NOT DISTINCT FROM NEW.transaction_date THEN
      RETURN NEW;
    END IF;
    v_row := NEW;
    v_action := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    v_row := OLD;
    v_action := 'delete';
  ELSE
    RETURN NEW;
  END IF;

  SELECT COALESCE(f.fund_name, '')
  INTO v_fund_name
  FROM public.funds f
  WHERE f.fund_id = v_row.fund_id
    AND f.church_id = v_row.church_id;

  SELECT COALESCE(et.expenses_name, '')
  INTO v_type_name
  FROM public.expenses_type et
  WHERE et.expenses_type_id = v_row.expenses_type_id
    AND et.church_id = v_row.church_id;

  v_amount_text := COALESCE(v_row.transaction_amount::text, '0');
  v_params := jsonb_build_object(
    'amount', v_amount_text,
    'id', v_row.transaction_id::text,
    'fund', v_fund_name,
    'type', v_type_name
  );

  v_summary := CASE v_action
    WHEN 'update' THEN 'Editó egreso por RD$' || v_amount_text
    ELSE 'Eliminó egreso por RD$' || v_amount_text
  END;

  PERFORM public.fn_append_church_audit_log(
    v_row.church_id,
    'finances',
    v_action,
    'transaction',
    v_row.transaction_id::text,
    v_summary,
    'actions.finances.transaction.' || v_action,
    v_params
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_income_entries ON public.income_entries;
CREATE TRIGGER audit_income_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.income_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_income_entries();

DROP TRIGGER IF EXISTS audit_transactions_mutation ON public.transactions;
CREATE TRIGGER audit_transactions_mutation
  AFTER UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_transactions_mutation();

NOTIFY pgrst, 'reload schema';
