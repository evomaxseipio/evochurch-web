-- church_ministries: campos UI (mockup project) + RLS multitenant.

ALTER TABLE public.church_ministries
  ADD COLUMN IF NOT EXISTS leader_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS member_profile_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'violet',
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

UPDATE public.church_ministries
SET color = 'violet'
WHERE color IS NULL OR color = '';

ALTER TABLE public.church_ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_ministries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_church_ministries_select ON public.church_ministries;
DROP POLICY IF EXISTS tenant_church_ministries_insert ON public.church_ministries;
DROP POLICY IF EXISTS tenant_church_ministries_update ON public.church_ministries;
DROP POLICY IF EXISTS tenant_church_ministries_delete ON public.church_ministries;

CREATE POLICY tenant_church_ministries_select ON public.church_ministries
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_church_ministries_insert ON public.church_ministries
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_church_ministries_update ON public.church_ministries
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_church_ministries_delete ON public.church_ministries
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

COMMENT ON COLUMN public.church_ministries.leader_profile_id IS 'Perfil del líder del ministerio.';
COMMENT ON COLUMN public.church_ministries.member_profile_ids IS 'Perfiles de miembros asignados al ministerio.';
COMMENT ON COLUMN public.church_ministries.color IS 'Color identificador: violet, lila, green.';
COMMENT ON COLUMN public.church_ministries.is_featured IS 'Destacado en el listado.';
