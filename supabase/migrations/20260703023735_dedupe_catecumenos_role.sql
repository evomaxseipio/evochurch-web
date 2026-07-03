-- Unificar roles duplicados: conservar Catecumenos (catecumenos), eliminar Catecumeno (catecumeno).

DO $dedupe$
DECLARE
  v_keep_id uuid;
  v_drop_id uuid;
BEGIN
  SELECT id INTO v_keep_id
  FROM public.member_roles
  WHERE role_code = 'catecumenos'
  ORDER BY id
  LIMIT 1;

  SELECT id INTO v_drop_id
  FROM public.member_roles
  WHERE role_code = 'catecumeno'
  ORDER BY id
  LIMIT 1;

  IF v_keep_id IS NULL THEN
    RAISE EXCEPTION 'Rol canónico catecumenos no encontrado.';
  END IF;

  IF v_drop_id IS NOT NULL AND v_drop_id <> v_keep_id THEN
    UPDATE public.membership
    SET member_role_id = v_keep_id
    WHERE member_role_id = v_drop_id;

    DELETE FROM public.member_roles
    WHERE id = v_drop_id;
  END IF;
END $dedupe$;

NOTIFY pgrst, 'reload schema';
