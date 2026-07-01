-- Verificación multitenant EvoChurch (ejecutar en Supabase SQL Editor o vía MCP execute_sql).
-- Esperado: todas las filas con status = 'ok'.

-- 1) Helpers y RPC clave existen
SELECT 'helpers_exist' AS check_name,
  CASE WHEN COUNT(*) = 2 THEN 'ok' ELSE 'fail' END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('fn_assert_profile_in_session_church', 'sp_get_profile_by_id');

-- 2) Guards en RPCs críticos
SELECT p.proname AS check_name,
  CASE
    WHEN p.proname IN ('spinsertprofiles', 'spgetfunds', 'sp_get_income_entries', 'fn_create_transaction')
     AND pg_get_functiondef(p.oid) LIKE '%fn_assert_session%'
    THEN 'ok'
    WHEN p.proname IN ('spupdateprofiles', 'spmaintancemembership', 'sp_get_profile_by_id')
     AND pg_get_functiondef(p.oid) LIKE '%fn_assert_profile%'
    THEN 'ok'
    ELSE 'fail'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'spinsertprofiles', 'spupdateprofiles', 'spmaintancemembership',
    'sp_get_income_entries', 'fn_create_transaction', 'spgetfunds', 'sp_get_profile_by_id'
  )
ORDER BY p.proname;

-- 3) RLS tenant policies
SELECT 'tenant_rls_policies' AS check_name,
  CASE WHEN COUNT(*) >= 40 THEN 'ok' ELSE 'fail' END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'tenant_%';

-- 4) sp_get_income_entries no ejecutable por anon
SELECT 'income_entries_anon_revoked' AS check_name,
  CASE
    WHEN has_function_privilege('anon', 'public.sp_get_income_entries(integer,uuid)', 'EXECUTE')
    THEN 'fail'
    ELSE 'ok'
  END AS status;

-- 5) Índices por church_id
SELECT 'tenant_indexes' AS check_name,
  CASE WHEN COUNT(*) >= 6 THEN 'ok' ELSE 'fail' END AS status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_profiles_church_id',
    'idx_income_entries_church_payment_date',
    'idx_transactions_church_status',
    'idx_contributors_church_profile',
    'idx_membership_church_profile',
    'idx_funds_church_id'
  );
