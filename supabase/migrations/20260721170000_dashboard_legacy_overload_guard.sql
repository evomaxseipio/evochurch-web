-- Close the legacy one-argument dashboard RPC bypass. Keep compatibility by
-- delegating to the protected two-argument overload instead of dropping it.

CREATE OR REPLACE FUNCTION public.sp_get_dashboard_summary(
  p_church_id integer
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO public
AS $function$
  SELECT public.sp_get_dashboard_summary(p_church_id, 12);
$function$;

REVOKE ALL ON FUNCTION public.sp_get_dashboard_summary(integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sp_get_dashboard_summary(integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.sp_get_dashboard_summary(integer) IS
  'Legacy-compatible dashboard overload; delegates to the RBAC-protected summary RPC.';

NOTIFY pgrst, 'reload schema';

