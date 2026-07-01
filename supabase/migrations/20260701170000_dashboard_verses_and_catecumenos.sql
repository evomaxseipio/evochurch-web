-- Versículos del dashboard (catálogo global) + rol Catecumenos.

CREATE TABLE IF NOT EXISTS public.scripture_verses (
  id serial PRIMARY KEY,
  reference text NOT NULL,
  text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.scripture_verses IS
  'Versículos bíblicos rotativos en el dashboard (lectura global).';

ALTER TABLE public.scripture_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY scripture_verses_read ON public.scripture_verses
  FOR SELECT TO authenticated
  USING (is_active = true);

GRANT SELECT ON public.scripture_verses TO authenticated;

INSERT INTO public.scripture_verses (reference, text, sort_order)
VALUES
  (
    'Mateo 18:20',
    'Porque donde están dos o tres congregados en mi nombre, allí estoy yo en medio de ellos.',
    1
  ),
  (
    'Filipenses 4:13',
    'Todo lo puedo en Cristo que me fortalece.',
    2
  ),
  (
    'Jeremías 29:11',
    'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.',
    3
  ),
  (
    'Salmo 23:1',
    'Jehová es mi pastor; nada me faltará.',
    4
  ),
  (
    'Proverbios 3:5-6',
    'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas.',
    5
  ),
  (
    'Isaías 40:31',
    'Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.',
    6
  ),
  (
    'Romanos 8:28',
    'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.',
    7
  ),
  (
    'Juan 3:16',
    'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.',
    8
  ),
  (
    'Salmo 46:1',
    'Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.',
    9
  ),
  (
    '2 Corintios 5:17',
    'De modo que si alguno está en Cristo, nueva criatura es; las cosas viejas pasaron; he aquí todas son hechas nuevas.',
    10
  );

INSERT INTO public.member_roles (role_name, role_description)
SELECT
  'Catecumenos',
  'Miembro en preparación para el bautismo y la membresía formal de la iglesia.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.member_roles WHERE role_name = 'Catecumenos'
);
