-- Revoca acceso anon/public a sp_get_income_entries (complemento tenant guards).

REVOKE ALL ON FUNCTION public.sp_get_income_entries(integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sp_get_income_entries(integer, uuid)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
