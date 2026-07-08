-- Restaura color primario de marca (#5B21B6) si quedó con tonos del tema oscuro global.

UPDATE public.church
SET primary_color = '#5B21B6'
WHERE upper(primary_color) IN ('#A78BFA', '#7C5CF5');

ALTER TABLE public.church
  ALTER COLUMN primary_color SET DEFAULT '#5B21B6';
