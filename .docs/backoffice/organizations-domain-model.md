# EvoChurch BackOffice

## Feature: Organizations — Modelo de Dominio (MVP 0.1)

> Documento de diseño de dominio. **No** contiene SQL, migraciones ni código.
> Su objetivo es dejar el negocio tan claro que la base de datos de `Organizations`
> pueda diseñarse sin volver a discutir el dominio.
>
> Fuentes: `prd.md` (Sales Hub PRD v0.1) y `mockup/organizations-feature-mockup.html`.

---

## 0. Encuadre del Bounded Context

`Organizations` vive dentro del **Sales Context** (esquema `sales`) del BackOffice.

Es fundamental separar dos conceptos que comparten la palabra "organización/iglesia" pero
son entidades distintas en dos contextos distintos:

| Concepto | Contexto | Qué es |
|----------|----------|--------|
| **Organization** (este documento) | BackOffice · `sales` | Una organización con la que EvoChurch tiene (o quiere tener) una **relación comercial**. Es un *prospecto / cuenta comercial*. |
| **Church / Tenant** (`church_id`) | App EvoChurch · `church` | La iglesia ya **cliente**, operando dentro del producto con sus miembros, finanzas, etc. |

Una `Organization` del BackOffice puede *eventualmente* convertirse en un `church_id` del
producto, pero **son entidades diferentes, en bases lógicas diferentes, con ciclos de vida
diferentes**. Este documento modela únicamente la primera.

`Organization` es el **Aggregate Root** de este bounded context.

---

## 1. Responsabilidad de la entidad `Organization`

### Qué representa

`Organization` representa **cualquier organización que sostiene una relación comercial con
EvoChurch**: hoy iglesias, mañana ministerios, concilios y fundaciones.

Es la **entidad central del proceso de captación comercial**. Concentra la identidad y los
datos descriptivos de la organización como *cuenta*:

- Quién es (nombre, tipo, denominación).
- Dónde está (ubicación).
- Cómo contactarla (teléfono, email, web, redes).
- De dónde vino (fuente comercial).
- En qué estado de registro se encuentra (activa / archivada).

Es el **punto de anclaje** (ancla de agregación) al que en el futuro colgarán contactos,
actividades, tareas, oportunidades y, finalmente, la conversión en cliente.

### Qué NO representa

- **No** representa una persona. Las personas de la organización (pastor, tesorero,
  secretario) son **Contacts** (feature futura).
- **No** representa el proceso de venta ni la etapa del pipeline. El avance comercial
  (Nuevo → Investigación → … → Ganada/Perdida) pertenece a la futura **Opportunity /
  Pipeline** (ver §4 y §8). En el mockup el pipeline se *muestra* sobre la organización por
  conveniencia de UX, pero **el dominio no lo posee aquí**.
- **No** representa interacciones. Llamadas, WhatsApp, demos, notas son **Activities**.
- **No** representa la relación de suscripción/facturación ni el tenant del producto
  (`church_id`). Eso vive en otros contextos.
- **No** representa "el próximo paso" ni "la última actividad". Esos son **datos derivados**
  proyectados desde Activities/Tasks, no atributos propios de `Organization`.

> Regla mental: si un dato cambia porque *ocurrió una interacción o avanzó una venta*, no
> pertenece a `Organization`. Si describe *quién es y cómo es* la organización, sí pertenece.

---

## 2. Atributos de `Organization`

Atributos **propios** del agregado (no columnas SQL todavía). Los que se agrupan en Value
Objects se marcan como tales y se detallan en §3.

### 2.1 Identidad y clasificación

| Atributo | Descripción | Tipo (dominio) | Oblig. |
|----------|-------------|----------------|--------|
| `id` | Identidad única del agregado. | Identity | Sí (generado) |
| `name` | Nombre de la organización. | Texto | **Sí** |
| `type` | Tipo de organización. | `OrganizationType` (enum §4) | **Sí** |
| `denomination` | Denominación / corriente (ej. Bautista, Pentecostal). Relevante sobre todo para `CHURCH`. | Texto | No |
| `status` | Estado del **registro** en el sistema (no del pipeline). | `OrganizationStatus` (enum §4) | **Sí** (default `ACTIVE`) |

### 2.2 Ubicación (Value Object `Address` — §3)

| Atributo | Descripción | Oblig. |
|----------|-------------|--------|
| `address.country` | País. | No (default país operativo) |
| `address.province` | Provincia / estado. | No |
| `address.city` | Ciudad. | **Sí** *(según UI/PRD)* |
| `address.line` | Dirección (calle, número, sector). | No |

### 2.3 Información de contacto de la organización (Value Object `ContactInformation` — §3)

> Ojo: es el contacto **institucional** de la organización, no una persona (Contacts).

| Atributo | Descripción | Oblig. |
|----------|-------------|--------|
| `contactInfo.phone` | Teléfono principal. | No |
| `contactInfo.email` | Email institucional. | No |

### 2.4 Presencia web y social (Value Object `WebPresence` — §3)

| Atributo | Descripción | Oblig. |
|----------|-------------|--------|
| `webPresence.website` | Sitio web. | No |
| `webPresence.facebook` | Facebook. | No |
| `webPresence.instagram` | Instagram. | No |

### 2.5 Comercial (metadatos de captación)

| Atributo | Descripción | Tipo (dominio) | Oblig. |
|----------|-------------|----------------|--------|
| `source` | Cómo se captó la organización. | `OrganizationSource` (enum §4) | **Sí** |
| `ownerId` | Responsable comercial asignado (referencia a usuario del BackOffice / IAM). | Identity (ref) | No (recomendado sí a nivel operativo) |
| `notes` | Observaciones internas del equipo comercial. | Texto largo | No |

### 2.6 Auditoría (metadatos técnicos del dominio)

| Atributo | Descripción | Oblig. |
|----------|-------------|--------|
| `createdAt` | Fecha de creación. | Sí (sistema) |
| `updatedAt` | Última modificación. | Sí (sistema) |
| `createdBy` | Usuario que creó el registro. | Sí (sistema) |
| `archivedAt` | Fecha de archivado (si aplica). | No |

### 2.7 Atributos que aparecen en la UI pero **NO** son de este agregado

Se documentan explícitamente para evitar que se modelen como columnas de `organizations`:

| Dato en UI | Dónde vive realmente |
|------------|----------------------|
| Pipeline (Nuevo, Seguimiento, Demo…) | **Opportunity / Pipeline context** (proyección de solo lectura). |
| Prioridad / Temperatura (Alta, Tibio…) | Opportunity context (o extensión futura de la relación comercial). |
| Próxima acción / Próximo seguimiento | **Tasks** (derivado). |
| Última actividad | **Activities** (derivado). |
| Contacto principal (Pastor Juan Pérez…) | **Contacts** (relación 1..N con flag `isPrimary`). |
| Responsable (nombre visible) | Resuelto desde IAM vía `ownerId`. |

> Nota de decisión (importante para el diseño de BD): mantener el **agregado `Organization`
> limpio** de pipeline, prioridad, temperatura, próxima acción y última actividad. La UI del
> listado/detalle los compone con *joins/proyecciones* desde otros contextos. Si por velocidad
> de MVP se decidiera denormalizar alguno sobre la tabla `organizations`, debe tratarse
> explícitamente como **cache de lectura** propiedad de otro contexto, nunca como fuente de
> verdad de este agregado.

---

## 3. Value Objects

Se proponen **solo los necesarios**. Un Value Object no tiene identidad propia, es inmutable
y se compara por valor. Agrupa atributos que conceptualmente viajan juntos y comparten reglas
de validación.

### 3.1 `Address`
Agrupa la ubicación física.
- Campos: `country`, `province`, `city`, `line`.
- Regla: `city` es el mínimo significativo para el MVP.
- Racional: permite evolucionar a geocodificación / normalización de país-provincia sin tocar
  el resto del agregado.

### 3.2 `ContactInformation`
Agrupa los medios de contacto **institucionales** de la organización.
- Campos: `phone`, `email`.
- Reglas: si `email` está presente debe ser un email válido; si `phone` está presente debe
  tener formato telefónico razonable.
- Racional: mismas reglas de validación reutilizables donde haya "email + teléfono".

### 3.3 `WebPresence`
Agrupa la huella digital pública.
- Campos: `website`, `facebook`, `instagram`.
- Reglas: `website` debe ser URL válida si está presente; los handles sociales se normalizan
  (ej. quitar/añadir `@` o `/` de forma consistente).
- Racional: separa "identidad digital" de "contacto directo"; ambos crecen distinto.

### Value Objects **descartados** para el MVP
- `SocialMedia` como VO independiente → se absorbe en `WebPresence` (evita sobre-modelar).
- `GeoCoordinates`, `PhoneNumber` tipado fuerte, `Money` → innecesarios en 0.1 (YAGNI).

---

## 4. Enums (catálogos)

### 4.1 `OrganizationType`
Tipo de organización. **Extensible sin romper el modelo** (ese es el requisito clave).

| Valor | Estado MVP |
|-------|-----------|
| `CHURCH` | Activo (único usado en 0.1) |
| `MINISTRY` | Reservado (soporte futuro) |
| `COUNCIL` | Reservado (soporte futuro) |
| `FOUNDATION` | Reservado (soporte futuro) |

> Estrategia de extensibilidad: el agregado es **único con discriminador** (`type`). Los
> atributos específicos por tipo (hoy `denomination` es casi exclusivo de `CHURCH`) se manejan
> como atributos opcionales o, cuando crezcan, como un **perfil por tipo** anexo al agregado.
> No se crean entidades separadas `Church`/`Ministry`; se evita la explosión de tablas.

### 4.2 `OrganizationStatus`
Ciclo de vida del **registro** (no del pipeline comercial).

| Valor | Significado |
|-------|-------------|
| `ACTIVE` | Registro vigente y trabajable. Estado inicial por defecto. |
| `ARCHIVED` | Retirada de la operación diaria; se conserva por historial. |

> Deliberadamente **minimalista**. La distinción prospecto/cliente/ganada/perdida NO es
> status del registro; es responsabilidad del pipeline/oportunidad (§8). Añadir `MERGED`
> (para deduplicación) es una extensión futura razonable, no requerida en 0.1.

### 4.3 `OrganizationSource`
Origen de captación comercial. (Tomado literal de la UI.)

| Valor | Etiqueta UI |
|-------|-------------|
| `REFERRAL` | Referido |
| `VISIT` | Visita |
| `SOCIAL_MEDIA` | Redes sociales |
| `EVENT` | Evento |
| `WEB` | Web |
| `OTHER` | Otro |

### Enums que **NO** pertenecen a este contexto (aclaración)
- `PipelineStage` (Nuevo, Investigación, Contacto, Seguimiento, Demo, Ganada, Perdida) →
  **Opportunity/Pipeline context**.
- `Priority` / `Temperature` → Opportunity context.
- `ActivityType`, `ContactRole` → Activities / Contacts.

---

## 5. Reglas de negocio

**Invariantes del agregado (siempre verdaderas):**

1. Una `Organization` **siempre** tiene `name` no vacío.
2. El `type` es **obligatorio** y debe ser un valor válido de `OrganizationType`.
3. La `source` es **obligatoria** al crear (trazabilidad comercial desde el minuto cero).
4. `city` es obligatoria (mínimo geográfico útil para el equipo comercial).
5. `status` nunca es nulo; nace en `ACTIVE`.
6. Si `email` está presente, debe ser **válido**.
7. Si `website` está presente, debe ser una **URL válida**.
8. En 0.1 solo se permite crear organizaciones de tipo `CHURCH`; los demás tipos existen en el
   catálogo pero están **deshabilitados para creación** (feature flag / regla de aplicación).

**Reglas de comportamiento:**

9. **Archivar** una organización cambia `status` a `ARCHIVED` y fija `archivedAt`; el registro
   deja de aparecer en listados operativos por defecto, pero **no se borra**.
10. Una organización `ARCHIVED` puede **reactivarse** (`status` → `ACTIVE`, `archivedAt` → null).
11. **Unicidad razonable**: no deberían existir dos organizaciones activas con el mismo `name`
    en la misma `city` (regla suave anti-duplicados; se resuelve con advertencia, no bloqueo
    duro, en MVP).
12. El `ownerId` referencia a un usuario válido del BackOffice; reasignar responsable es una
    operación explícita (§6).
13. Los datos derivados (próxima acción, última actividad, pipeline) **no se validan ni se
    escriben** en este agregado.

---

## 6. Casos de uso

Listado (sin diseñar API ni endpoints):

1. **Crear organización** — Alta con datos mínimos (name, type, source, city) en < 2 min.
2. **Editar organización** — Actualizar identidad, ubicación, contacto, web y observaciones.
3. **Consultar organización (detalle)** — Ver la ficha completa.
4. **Listar organizaciones** — Listado paginado para operación diaria.
5. **Buscar organizaciones** — Por nombre / contacto / ciudad.
6. **Filtrar organizaciones** — Por tipo, ciudad, responsable (y por pipeline vía proyección).
7. **Archivar organización** — Retirar del flujo operativo conservando historial.
8. **Reactivar organización** — Devolver una archivada a `ACTIVE`.
9. **Reasignar responsable** — Cambiar `ownerId` ("Cambiar responsable" del menú del detalle).

> Fuera de alcance de este agregado (viven en otras features): registrar actividad, agendar
> seguimiento, avanzar pipeline / marcar ganada-perdida, gestionar contactos.

---

## 7. Eventos de dominio

Solo definición (no implementación). Nombrados en pasado, como corresponde a eventos.

| Evento | Cuándo ocurre | Payload esencial |
|--------|---------------|------------------|
| `OrganizationCreated` | Se registra una nueva organización. | `id`, `type`, `source`, `ownerId`, `createdBy`, `createdAt` |
| `OrganizationUpdated` | Cambian datos descriptivos. | `id`, campos modificados |
| `OrganizationArchived` | Se archiva. | `id`, `archivedAt`, `archivedBy` |
| `OrganizationReactivated` | Se reactiva una archivada. | `id`, `reactivatedAt` |
| `OrganizationOwnerChanged` | Se reasigna responsable. | `id`, `previousOwnerId`, `newOwnerId` |

> Estos eventos son el **contrato de integración** hacia futuras features: p. ej.
> `OrganizationCreated` podrá disparar la creación de una oportunidad inicial en el pipeline;
> `OrganizationArchived` podrá cerrar oportunidades y tareas abiertas.

---

## 8. Preparación para futuras features

`Organization` es diseñada como **ancla estable**. Las siguientes features se relacionan con
ella **sin modificar su núcleo**:

- **Contacts** — Relación **1..N**. Una organización tiene varios contactos (pastor, tesorero,
  secretario). Uno marcado como `isPrimary` alimenta el "Contacto principal" del detalle.
  Referencia: `contact.organizationId → organization.id`.

- **Activities** — Relación **1..N**. Cada interacción (llamada, WhatsApp, demo, nota) apunta a
  la organización. De aquí se **derivan** "última actividad" y el timeline. `Organization`
  nunca escribe estos datos; solo los recibe como proyección de lectura.

- **Tasks** — Relación **1..N**. Los "próximos pasos / seguimientos" agendados. De aquí se
  deriva "próxima acción" y "próximo seguimiento". Regla de negocio del PRD: toda organización
  activa **debería** tener una tarea abierta; su ausencia es una señal de riesgo (se evalúa en
  la feature Tasks, no como invariante de este agregado).

- **Opportunities / Pipeline** — Relación **1..N** (una organización puede tener varias
  oportunidades a lo largo del tiempo). La **etapa del pipeline**, la **prioridad** y la
  **temperatura** viven aquí, no en `Organization`. El listado/detalle del BackOffice compone
  la etapa "actual" desde la oportunidad activa. Conversión Ganada = camino hacia Customer.

- **Customers** — Cuando una organización se convierte en cliente, se crea/enlaza un
  **Customer** (y, del lado del producto, se aprovisiona su `church_id`/tenant). `Organization`
  **permanece** como registro comercial de origen; no se transforma ni se destruye. Relación
  esperada: `customer.organizationId → organization.id` (1..1 lógico tras conversión).

**Principio de evolución:** todas estas relaciones apuntan *hacia* `organization.id`. Mientras
la identidad del agregado y sus eventos de dominio (§7) se mantengan estables, cada feature
futura se añade como un contexto satélite sin renegociar el dominio de Organizations.

---

## 9. Resumen para el diseño de base de datos

Con este dominio, quien diseñe la BD ya sabe, sin ambigüedad, que:

- La tabla raíz `sales.organizations` contiene: identidad, `name`, `type`, `denomination`,
  `status`, los VO `Address` / `ContactInformation` / `WebPresence` (aplanados o embebidos),
  `source`, `owner_id`, `notes` y auditoría.
- Los enums `OrganizationType`, `OrganizationStatus`, `OrganizationSource` son catálogos
  cerrados (con espacio a extenderse).
- **No** se crean columnas para pipeline, prioridad, temperatura, próxima acción, última
  actividad ni contacto principal: son datos de otros contextos que se proyectan por lectura.
- Las features futuras se enganchan por FK hacia `organizations.id`.
