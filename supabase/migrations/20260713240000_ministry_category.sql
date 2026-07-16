-- P2.x — Categorías de ministerios (taxonomía plana).
-- Discipulado / Casas / Niños / Adoración / Otro.
-- No crea módulo CRUD aparte: mejora filtro en /ministerios y picker de asistencia.

ALTER TABLE public.church_ministries
  ADD COLUMN IF NOT EXISTS ministry_category text;

UPDATE public.church_ministries
SET ministry_category = 'other'
WHERE ministry_category IS NULL;

ALTER TABLE public.church_ministries
  ALTER COLUMN ministry_category SET DEFAULT 'other';

ALTER TABLE public.church_ministries
  ALTER COLUMN ministry_category SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'church_ministries_ministry_category_check'
  ) THEN
    ALTER TABLE public.church_ministries
      ADD CONSTRAINT church_ministries_ministry_category_check
      CHECK (
        ministry_category IN (
          'discipleship',
          'house_group',
          'children',
          'worship',
          'other'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.church_ministries.ministry_category IS
  'Taxonomía P2.x: discipleship | house_group | children | worship | other. Alimenta filtros y presets de asistencia.';

CREATE INDEX IF NOT EXISTS idx_church_ministries_church_category
  ON public.church_ministries (church_id, ministry_category);
