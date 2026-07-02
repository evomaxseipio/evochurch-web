-- Líderes de ministerio: uno o varios (parejas, co-líderes).

ALTER TABLE public.church_ministries
  ADD COLUMN IF NOT EXISTS leader_profile_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

UPDATE public.church_ministries
SET leader_profile_ids = ARRAY[leader_profile_id]
WHERE leader_profile_id IS NOT NULL
  AND cardinality(leader_profile_ids) = 0;

ALTER TABLE public.church_ministries
  DROP COLUMN IF EXISTS leader_profile_id;

COMMENT ON COLUMN public.church_ministries.leader_profile_ids IS 'Perfiles de líderes del ministerio (uno o varios).';
