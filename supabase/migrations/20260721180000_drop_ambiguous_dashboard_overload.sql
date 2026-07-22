-- PostgREST cannot disambiguate an exact one-argument overload from the
-- protected two-argument RPC when p_months has a default. Dropping the legacy
-- overload preserves one-argument API calls through that default.

DROP FUNCTION IF EXISTS public.sp_get_dashboard_summary(integer);

NOTIFY pgrst, 'reload schema';

