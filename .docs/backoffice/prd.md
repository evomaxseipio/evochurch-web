# EvoChurch BackOffice

## Sales Hub — Product Requirements Document (PRD)

### Versión 0.1

---

# Contexto

Este proyecto forma parte del ecosistema **EvoChurch**.

No es el sistema utilizado por las iglesias.

No es un CRM genérico.

No es un ERP.

No es una aplicación administrativa.

Es la plataforma interna utilizada por EvoChurch para captar organizaciones, administrar el proceso comercial y convertir prospectos en clientes.

Inicialmente estará enfocada en iglesias, pero la arquitectura debe permitir crecer hacia otros tipos de organizaciones.

---

# Objetivo del proyecto

Construir una plataforma comercial especializada para vender EvoChurch.

Su misión es:

- Captar organizaciones.

- Dar seguimiento.

- Gestionar oportunidades.

- Convertir prospectos en clientes.

- Administrar el onboarding inicial.

El éxito del sistema no se mide por la cantidad de funcionalidades.

Se mide por la cantidad de organizaciones convertidas en clientes.

---

# Filosofía

Cada funcionalidad debe responder al menos una pregunta.

- ¿Ayuda a conseguir más clientes?

- ¿Reduce trabajo administrativo?

- ¿Mejora el seguimiento?

- ¿Evita perder oportunidades?

- ¿Hace más productivo al equipo comercial?

Si no responde afirmativamente al menos una de ellas, debe cuestionarse antes de desarrollarse.

---

# Objetivo del MVP

No construir un CRM.

Construir una herramienta que permita empezar a vender EvoChurch inmediatamente.

Al finalizar este MVP el equipo comercial debe ser capaz de:

- Registrar organizaciones.

- Registrar contactos.

- Registrar actividades.

- Agendar seguimientos.

- Llevar un pipeline.

- Saber qué debe hacer cada día.

Nada más.

---

# Público objetivo

Inicialmente:

Equipo comercial de EvoChurch.

Posteriormente:

- Distribuidores

- Partners

- Representantes

- Ejecutivos comerciales

---

# Tecnología

Next.js

TypeScript

Material UI

Supabase

PostgreSQL

Storage

Realtime

Arquitectura por Features

---

# Arquitectura

No crear otro proyecto.

Este módulo formará parte del BackOffice.

Ejemplo:

src/

    app/

        (backoffice)

            sales/

            organizations/

            support/

            billing/

            analytics/

    features/

        sales/

        organizations/

        contacts/

        activities/

        tasks/

---

# Organización del código

Cada feature debe ser completamente independiente.

Ejemplo:

features/

    sales/

        components/

        hooks/

        services/

        repositories/

        models/

        types/

        pages/

        views/

No organizar el proyecto únicamente por tipo de archivo.

---

# Alcance MVP 0.1

## Dashboard

Mostrar únicamente:

- Prospectos

- Seguimientos pendientes

- Demos

- Clientes

- Próximas actividades

- Resumen del Pipeline

---

## Organizations

Listado de organizaciones.

Acciones:

- Crear

- Editar

- Buscar

- Filtrar

---

## Organization Detail

Pestañas:

- Información

- Contactos

- Actividades

- Notas

---

## Pipeline

Etapas:

Nuevo

↓

Investigación

↓

Contacto

↓

Seguimiento

↓

Demo

↓

Ganada

↓

Perdida

---

## Agenda

Listado simple de actividades pendientes.

---

# Flujo Comercial

Nueva Organización → Investigación → Contacto → Seguimiento → Demo → Ganada / Perdida

No complicar este flujo.

Posteriormente crecerá.

---

# Organización

La entidad principal es Organization.

No Church.

No Prospect.

No Customer.

Organization.

Una organización puede representar:

- Iglesia

- Ministerio

- Concilio

- Fundación

Inicialmente solamente se utilizará Church.

Pero la arquitectura debe permitir crecer.

---

# Organización

Campos iniciales

- Nombre

- Tipo

- Denominación

- País

- Provincia

- Ciudad

- Dirección

- Sitio Web

- Facebook

- Instagram

- Teléfono

- Email

- Fuente

- Pipeline

- Observaciones

---

# Contactos

Una organización puede tener múltiples contactos.

Ejemplo:

Pastor

Secretario

Administrador

Tesorero

Cada contacto tendrá:

- Nombre

- Cargo

- Teléfono

- WhatsApp

- Email

- Principal

---

# Actividades

Tipos

- Llamada

- WhatsApp

- Correo

- Visita

- Demo

- Nota

Campos

- Fecha

- Resultado

- Comentario

- Próxima acción

- Fecha próxima acción

Registrar una actividad debe tomar menos de 15 segundos.

---

# Próxima Acción

Toda organización debe tener una siguiente acción.

Ejemplos:

Llamar

Enviar WhatsApp

Enviar correo

Visitar

Agendar demo

Si una organización no tiene próxima acción significa que probablemente se perderá.

---

# Base de Datos

Usar la misma instancia de Supabase.

No crear otra base de datos.

Separar por dominios utilizando esquemas.

Ejemplo:

sales

iam

church

billing

audit

Para este MVP solamente utilizar:

sales

---

# Tablas iniciales

sales.organizations

sales.contacts

sales.activities

sales.tasks

sales.pipeline_stages

No crear tablas innecesarias.

---

# UX

Registrar una organización:

menos de 2 minutos.

Registrar una actividad:

menos de 15 segundos.

Máximo dos clics para registrar una llamada.

El sistema debe sentirse rápido.

---

# Lo que NO debe desarrollarse

No IA

No automatizaciones

No WhatsApp API

No correos automáticos

No reportes avanzados

No dashboards ejecutivos

No soporte

No facturación

No implementaciones

Todo eso llegará después.

---

# Objetivo del Sprint

Cuando este sprint termine el equipo comercial debe poder salir a buscar iglesias reales.

El sistema debe ser suficiente para administrar las primeras 100 organizaciones.

No buscamos perfección.

Buscamos velocidad.

---

# Roadmap

## MVP 0.1

Captación

Prospectos

Contactos

Pipeline

Agenda

Seguimientos

---

## MVP 0.2

Demos

Propuestas

Archivos

Dashboard

Búsquedas

---

## MVP 0.3

Implementaciones

Onboarding

Clientes

Trial

---

## MVP 0.4

Suscripciones

Planes

Facturación

---

## MVP 0.5

IA Comercial

Automatizaciones

Scoring

Predicciones

---

# Regla Principal

Nunca desarrollar una funcionalidad porque "algún día podría servir".

Primero validar.

Luego mejorar.

Siempre construir lo mínimo necesario para vender más EvoChurch.