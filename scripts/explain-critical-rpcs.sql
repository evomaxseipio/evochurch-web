-- Sprint 4 (P3-OBS-4): EXPLAIN ANALYZE for critical RPCs on staging.
-- Run in Supabase SQL editor or psql as an authenticated user with realistic church data.
--
-- 1. Replace :church_id with a medium-sized tenant (e.g. 500+ income entries).
-- 2. For sp_get_session_context, run while logged in (auth.uid() must be set).
-- 3. Compare Planning Time, Execution Time, and seq scans vs index scans.

\set church_id 1

-- Session context (every navigation)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT public.sp_get_session_context();

-- Dashboard summary (12 months)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT public.sp_get_dashboard_summary(:church_id, 12);

-- Paginated income entries (typical contributions page)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT public.sp_get_income_entries(
  p_church_id := :church_id,
  p_fund_id := NULL,
  p_date_from := NULL,
  p_date_to := NULL,
  p_category := NULL,
  p_page := 1,
  p_page_size := 25
);

-- Paginated finance ledger (typical transactions page)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT public.sp_get_finance_ledger(
  p_church_id := :church_id,
  p_fund_id := NULL,
  p_date_from := NULL,
  p_date_to := NULL,
  p_status := NULL,
  p_page := 1,
  p_page_size := 25
);
