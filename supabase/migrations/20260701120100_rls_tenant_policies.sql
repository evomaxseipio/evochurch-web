-- Multitenant P0: RLS por iglesia de sesión (defense in depth bajo PostgREST directo).

-- Quitar políticas permisivas previas
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.address;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.address;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.funds;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.funds;

-- Helper inline: iglesia de sesión (NULL si no hay sesión válida)
-- Usamos fn_get_session_church_id() existente en USING/WITH CHECK.

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profiles_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profiles_delete ON public.profiles
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- address (sin church_id — vía profile)
ALTER TABLE public.address ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_address_select ON public.address
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = address.profile_id
        AND p.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_address_insert ON public.address
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = address.profile_id
        AND p.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_address_update ON public.address
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = address.profile_id
        AND p.church_id = public.fn_get_session_church_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = address.profile_id
        AND p.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_address_delete ON public.address
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = address.profile_id
        AND p.church_id = public.fn_get_session_church_id()
    )
  );

-- contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_contacts_select ON public.contacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = contacts.profile_id
        AND p.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_contacts_insert ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = contacts.profile_id
        AND p.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_contacts_update ON public.contacts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = contacts.profile_id
        AND p.church_id = public.fn_get_session_church_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = contacts.profile_id
        AND p.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_contacts_delete ON public.contacts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = contacts.profile_id
        AND p.church_id = public.fn_get_session_church_id()
    )
  );

-- membership
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_membership_select ON public.membership
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_membership_insert ON public.membership
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_membership_update ON public.membership
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_membership_delete ON public.membership
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- church (solo la iglesia de la sesión)
ALTER TABLE public.church ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_church_select ON public.church
  FOR SELECT TO authenticated
  USING (id = public.fn_get_session_church_id());

-- auth_users (solo fila propia)
ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_users FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_auth_users_select ON public.auth_users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- funds
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_funds_select ON public.funds
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_funds_insert ON public.funds
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_funds_update ON public.funds
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_funds_delete ON public.funds
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_transactions_select ON public.transactions
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_transactions_insert ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_transactions_update ON public.transactions
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_transactions_delete ON public.transactions
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- income_entries
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_entries FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_income_entries_select ON public.income_entries
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_income_entries_insert ON public.income_entries
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_income_entries_update ON public.income_entries
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_income_entries_delete ON public.income_entries
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- contributors
ALTER TABLE public.contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributors FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_contributors_select ON public.contributors
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_contributors_insert ON public.contributors
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_contributors_update ON public.contributors
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_contributors_delete ON public.contributors
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- income_contributors (vía income_entries)
ALTER TABLE public.income_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_contributors FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_income_contributors_select ON public.income_contributors
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.income_entries ie
      WHERE ie.income_id = income_contributors.income_id
        AND ie.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_income_contributors_insert ON public.income_contributors
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.income_entries ie
      WHERE ie.income_id = income_contributors.income_id
        AND ie.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_income_contributors_update ON public.income_contributors
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.income_entries ie
      WHERE ie.income_id = income_contributors.income_id
        AND ie.church_id = public.fn_get_session_church_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.income_entries ie
      WHERE ie.income_id = income_contributors.income_id
        AND ie.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_income_contributors_delete ON public.income_contributors
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.income_entries ie
      WHERE ie.income_id = income_contributors.income_id
        AND ie.church_id = public.fn_get_session_church_id()
    )
  );

-- fund_transfers
ALTER TABLE public.fund_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_transfers FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_fund_transfers_select ON public.fund_transfers
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_fund_transfers_insert ON public.fund_transfers
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_fund_transfers_update ON public.fund_transfers
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_fund_transfers_delete ON public.fund_transfers
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- expenses_type
ALTER TABLE public.expenses_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses_type FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_expenses_type_select ON public.expenses_type
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_expenses_type_insert ON public.expenses_type
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_expenses_type_update ON public.expenses_type
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_expenses_type_delete ON public.expenses_type
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- income_type_catalog
ALTER TABLE public.income_type_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_type_catalog FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_income_type_catalog_select ON public.income_type_catalog
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_income_type_catalog_insert ON public.income_type_catalog
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_income_type_catalog_update ON public.income_type_catalog
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_income_type_catalog_delete ON public.income_type_catalog
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- member_roles: catálogo global de lectura
ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_roles_read ON public.member_roles
  FOR SELECT TO authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
