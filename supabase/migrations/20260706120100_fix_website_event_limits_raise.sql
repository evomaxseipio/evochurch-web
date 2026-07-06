-- Fix RAISE syntax in website event limit trigger (MESSAGE option conflict).

CREATE OR REPLACE FUNCTION public.fn_assert_website_event_limits()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.is_website_listed THEN
    IF public.fn_count_website_listed(NEW.church_id, NEW.id) >= 10 THEN
      RAISE EXCEPTION 'Máximo 10 eventos pueden mostrarse en el sitio web.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.is_website_promoted OR NEW.is_featured THEN
    IF public.fn_count_website_promoted(NEW.church_id, NEW.id) >= 3 THEN
      RAISE EXCEPTION 'Máximo 3 eventos pueden promocionarse en el header del sitio (incluye destacados).'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
