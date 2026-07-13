-- Seed de prueba — Organizations MVP 0.1
-- Idempotente: no duplica si ya existen registros con los mismos nombres.

INSERT INTO sales.organizations (
  name,
  type,
  denomination,
  status,
  country,
  province,
  city,
  address_line,
  phone,
  email,
  website,
  facebook,
  instagram,
  source,
  notes,
  archived_at
)
SELECT *
FROM (
  VALUES
    (
      'Iglesia Central Bautista',
      'CHURCH',
      'Bautista',
      'ACTIVE',
      'DO',
      'Distrito Nacional',
      'Santo Domingo',
      'Av. Independencia #142',
      '+1 809 555 0100',
      'info@centralbautista.org',
      'https://centralbautista.org',
      '/centralbautista',
      '@centralbautista',
      'REFERRAL',
      'Congregación de ~350 miembros. Interesados en módulo de finanzas.',
      NULL::timestamptz
    ),
    (
      'Concilio Evangélico RD',
      'COUNCIL',
      NULL::text,
      'ACTIVE',
      'DO',
      'Santiago',
      'Santiago',
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      'VISIT',
      'Prospecto en etapa de investigación (pipeline en feature futura).',
      NULL::timestamptz
    ),
    (
      'Ministerio Vida Nueva',
      'MINISTRY',
      NULL::text,
      'ACTIVE',
      'DO',
      'La Vega',
      'La Vega',
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      'SOCIAL_MEDIA',
      'Captado vía redes. Pendiente primer contacto.',
      NULL::timestamptz
    ),
    (
      'Iglesia El Redentor',
      'CHURCH',
      NULL::text,
      'ARCHIVED',
      'DO',
      'San Pedro de Macorís',
      'San Pedro',
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      'EVENT',
      'Archivada: duplicado detectado en limpieza de prueba.',
      now()
    )
) AS seed (
  name,
  type,
  denomination,
  status,
  country,
  province,
  city,
  address_line,
  phone,
  email,
  website,
  facebook,
  instagram,
  source,
  notes,
  archived_at
)
WHERE NOT EXISTS (
  SELECT 1
  FROM sales.organizations o
  WHERE o.name = seed.name
    AND o.deleted_at IS NULL
);
