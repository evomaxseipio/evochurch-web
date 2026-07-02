-- church_ministries: add descripcion, migrate integer id → uuid.

ALTER TABLE public.church_ministries
  ADD COLUMN IF NOT EXISTS descripcion text;

UPDATE public.church_ministries SET descripcion = CASE id
  WHEN 1 THEN 'Formación bíblica para niños, jóvenes y adultos. Estudia la Palabra de Dios de forma sistemática para fortalecer la fe y el conocimiento cristiano en la congregación.'
  WHEN 2 THEN 'Espacio de comunión, discipulado y servicio para las hermanas. Organiza reuniones, actividades de apoyo y proyectos que edifican familias y la vida congregacional.'
  WHEN 3 THEN 'Formación y participación de niños y preadolescentes en la iglesia. Promueve valores cristianos mediante actividades dinámicas, enseñanza bíblica y servicio.'
  WHEN 4 THEN 'Grupo femenino de servicio misionero y apoyo comunitario. Participa en visitas, ayuda social y actividades que extienden el amor de Cristo más allá del templo.'
  WHEN 5 THEN 'Coordina el apoyo a misioneros, proyectos misioneros y la participación de la iglesia en la evangelización local y en otros territorios.'
  WHEN 6 THEN 'Atiende a los niños durante cultos y eventos con enseñanza bíblica adaptada a su edad, juegos y cuidado en un ambiente seguro y amoroso.'
  WHEN 7 THEN 'Intercede por la iglesia, los miembros y la comunidad. Organiza vigilias, cadenas de oración y acompañamiento espiritual en momentos de necesidad.'
  WHEN 8 THEN 'Usa música, teatro, danza y otras artes para adorar a Dios y comunicar el evangelio de forma creativa y edificante.'
  WHEN 9 THEN 'Lidera la planificación, administración y decisiones estratégicas de la iglesia conforme a sus estatutos, visión y objetivos ministeriales.'
  WHEN 10 THEN 'Reúne a los hombres de la congregación para discipulado, responsabilidad espiritual, servicio y apoyo mutuo en la familia y la iglesia.'
  WHEN 11 THEN 'Ministerio para niños y jóvenes que combina formación bíblica, aventura y servicio, inspirado en el programa de exploradores cristianos.'
  WHEN 12 THEN 'Comparte el evangelio mediante visitas, campañas y estrategias para alcanzar personas que aún no conocen a Cristo.'
  WHEN 13 THEN 'Acompaña a jóvenes adolescentes con enseñanza, actividades, mentoría y espacios seguros para crecer en la fe.'
  WHEN 14 THEN 'Coordina el equipo de alabanza, músicos y cantores para cultos y eventos, promoviendo una adoración genuina a Dios.'
  WHEN 15 THEN 'Proyecto social que busca el desarrollo espiritual, educativo y comunitario de familias y personas en situación de necesidad.'
  WHEN 16 THEN 'Fortalece matrimonios y relaciones de pareja mediante reuniones, talleres y acompañamiento basado en principios bíblicos.'
  WHEN 17 THEN 'Produce y transmite contenido cristiano por radio o televisión para edificar a la audiencia y extender el mensaje del evangelio.'
  WHEN 18 THEN 'Agrupa iniciativas ministeriales adicionales que contribuyen al servicio, la comunión y el crecimiento de la iglesia.'
  WHEN 19 THEN 'Da seguimiento a visitantes, nuevos miembros y personas en proceso de integración a la vida congregacional.'
  WHEN 20 THEN 'Proyecto de servicio comunitario que provee agua potable como expresión práctica del amor cristiano hacia la comunidad.'
  WHEN 21 THEN 'Brinda acompañamiento espiritual y apoyo emocional, especialmente en contextos de adicción y procesos de recuperación.'
  WHEN 22 THEN 'Institución educativa vinculada a la iglesia que ofrece formación académica con valores cristianos integrados.'
  WHEN 23 THEN 'Servicio de atención médica orientado a apoyar a la comunidad con cuidado profesional y compasivo.'
  WHEN 24 THEN 'Atiende a personas con discapacidad auditiva con enseñanza adaptada, interpretación y comunión inclusiva en la iglesia.'
  WHEN 25 THEN 'Organiza grupos pequeños para discipulado, comunión y crecimiento espiritual en un formato cercano y constante.'
  WHEN 26 THEN 'Ofrece orientación psicológica o terapéutica desde una perspectiva de cuidado integral para miembros y comunidad.'
  WHEN 27 THEN 'Registro de ministerios complementarios activos en la iglesia que no tienen una categoría principal asignada.'
  ELSE descripcion
END
WHERE descripcion IS NULL;

ALTER TABLE public.church_ministries
  ADD COLUMN IF NOT EXISTS id_new uuid;

UPDATE public.church_ministries
SET id_new = gen_random_uuid()
WHERE id_new IS NULL;

ALTER TABLE public.church_ministries
  ALTER COLUMN id_new SET NOT NULL;

ALTER TABLE public.church_ministries
  DROP CONSTRAINT church_ministries_pkey;

ALTER TABLE public.church_ministries
  DROP COLUMN id;

ALTER TABLE public.church_ministries
  RENAME COLUMN id_new TO id;

ALTER TABLE public.church_ministries
  ADD CONSTRAINT church_ministries_pkey PRIMARY KEY (id);

ALTER TABLE public.church_ministries
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DROP SEQUENCE IF EXISTS public.church_ministries_id_seq;

COMMENT ON COLUMN public.church_ministries.descripcion IS 'Descripción breve del ministerio (máx. ~100 palabras).';
COMMENT ON COLUMN public.church_ministries.id IS 'Identificador UUID del ministerio.';
