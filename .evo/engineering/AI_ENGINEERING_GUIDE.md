# AI_ENGINEERING_GUIDE.md
# EvoChurch AI Engineering Guide
**Versión:** 1.0

---

# Propósito

Este documento define el estándar de ingeniería que **todo agente de IA** debe seguir antes de realizar cualquier modificación en EvoChurch.

No es un documento de programación.

Es un documento de arquitectura, calidad y criterios de decisión.

Su objetivo es garantizar que cualquier cambio realizado por un agente mantenga la calidad, consistencia y visión del producto.

Este documento es obligatorio para cualquier tarea de desarrollo.

---

# Visión de EvoChurch

EvoChurch no es un software administrativo.

EvoChurch es el Sistema Operativo de una Iglesia.

Toda decisión técnica debe fortalecer alguno de estos pilares:

- Organización
- Transparencia
- Seguimiento
- Automatización
- Crecimiento

Si una implementación no fortalece al menos uno de estos pilares, debe cuestionarse antes de desarrollarse.

---

# Filosofía de Desarrollo

Antes de escribir una sola línea de código, responder:

- ¿Qué problema real resuelve?
- ¿Quién obtiene el beneficio?
- ¿Existe una forma más simple?
- ¿La solución escala?
- ¿Estoy agregando complejidad innecesaria?

---

# Principios de Ingeniería

## 1. KISS

Keep It Simple.

Siempre elegir la solución más simple que resuelva correctamente el problema.

Evitar:

- abstracciones innecesarias
- patrones prematuros
- servicios innecesarios
- componentes excesivamente genéricos

---

## 2. DRY

Don't Repeat Yourself.

Nunca duplicar:

- lógica
- componentes
- consultas
- RPC
- hooks
- providers
- servicios

Antes de crear algo nuevo, buscar si ya existe.

---

## 3. SOLID

Toda implementación debe respetar SOLID.

Especialmente:

- Single Responsibility
- Dependency Inversion

---

## 4. Clean Architecture

Separar claramente:

- UI
- Dominio
- Servicios
- Infraestructura
- Persistencia

Nunca colocar lógica de negocio dentro de componentes visuales.

---

## 5. YAGNI

You Aren't Gonna Need It.

No implementar funcionalidades pensando en necesidades futuras sin evidencia.

Desarrollar únicamente lo que el Sprint requiere.

---

# Filosofía del Producto

Todo desarrollo debe responder afirmativamente al menos una de estas preguntas:

- ¿Reduce trabajo administrativo?
- ¿Genera transparencia?
- ¿Facilita la toma de decisiones?
- ¿Genera valor para el liderazgo?
- ¿Hace crecer la iglesia?

Si la respuesta es NO, detener la implementación y documentar el motivo.

---

# Arquitectura General

Antes de modificar cualquier módulo analizar:

- impacto
- reutilización
- compatibilidad
- escalabilidad

Nunca modificar una funcionalidad sin entender quién más la utiliza.

---

# Architecture Review (OBLIGATORIO)

Antes de programar responder internamente:

## Reutilización

¿Existe ya una implementación similar?

---

## Componentes

¿Puedo reutilizar componentes existentes?

---

## SQL

¿Existe una consulta ya implementada?

---

## RPC

¿Existe una RPC que haga esto?

---

## Hooks

¿Existe un Hook reutilizable?

---

## Servicios

¿Existe un servicio equivalente?

---

## UI

¿Existe un componente equivalente?

---

## Estado

¿Existe un Provider o Context que ya resuelva esto?

---

## Base de datos

¿Existe ya la columna?

¿Existe ya la tabla?

¿Existe ya una relación similar?

---

## Frontend

¿Existe ya una pantalla similar?

---

Si la respuesta es SI, reutilizar.

---

# Impact Analysis (OBLIGATORIO)

Antes de modificar código identificar:

## Componentes afectados

## Servicios afectados

## RPC afectadas

## Hooks afectados

## Providers afectados

## SQL afectado

## APIs afectadas

## Edge Functions afectadas

## Flutter afectado

## Next.js afectado

## Dashboard afectado

## Reportes afectados

## Exportaciones afectadas

---

# Riesgos

Todo Sprint debe documentar:

## Riesgos técnicos

## Riesgos funcionales

## Riesgos de UX

## Riesgos de rendimiento

## Riesgos de seguridad

## Riesgos de regresión

---

# Rollback Plan

Todo cambio debe poder revertirse.

El agente debe indicar:

Archivos modificados.

Orden recomendado para revertir.

Posibles efectos secundarios.

---

# Base de Datos

## Principios

No crear tablas innecesarias.

No crear columnas duplicadas.

No duplicar información.

Normalizar cuando tenga sentido.

Desnormalizar únicamente cuando exista una justificación clara de rendimiento.

---

## PostgreSQL First

Toda regla de negocio debe evaluarse primero para implementarse correctamente en PostgreSQL cuando corresponda.

Especialmente:

- restricciones
- integridad
- cálculos
- agregaciones
- validaciones

---

## Supabase

Mantener compatibilidad con:

- RPC
- Policies
- Storage
- Auth

No romper compatibilidad.

---

# Multi Tenant

Toda implementación debe respetar completamente el modelo Multi Tenant.

Nunca asumir:

- una sola iglesia
- un solo ministerio
- un solo fondo

Todo dato debe pertenecer a su contexto correspondiente.

---

# Performance

Evitar:

N+1 Queries

Consultas duplicadas

Renderizados innecesarios

Re-render de componentes grandes

Cálculos repetidos

---

# Frontend

Priorizar:

Componentes reutilizables

Consistencia visual

Material Design 3

Responsive

Dark Mode

Accesibilidad

---

# UX

Toda pantalla debe cumplir:

menos clics

menos pasos

menos escritura

menos carga cognitiva

más claridad

---

# Código

El código debe ser:

simple

legible

consistente

predecible

autoexplicativo

---

# Naming

Utilizar nombres consistentes.

Evitar abreviaturas ambiguas.

El código debe leerse como un texto.

---

# Comentarios

Comentar únicamente cuando:

la lógica no sea evidente

exista una decisión de negocio importante

se documente una limitación

No comentar código obvio.

---

# Refactor

Si durante un Sprint se detecta una mejora importante:

NO implementarla.

Documentarla como recomendación.

Mantener el alcance del Sprint.

---

# Definition of Done

Una tarea solo estará terminada cuando:

✅ Compila correctamente.

✅ No rompe funcionalidades existentes.

✅ Respeta DRY.

✅ Respeta KISS.

✅ Respeta SOLID.

✅ Mantiene consistencia visual.

✅ Mantiene consistencia arquitectónica.

✅ No agrega deuda técnica.

✅ Mantiene compatibilidad con el MVP.

✅ Pasa validación manual.

---

# Entregables Esperados

Todo agente deberá entregar:

## 1. Resumen Ejecutivo

Qué hizo.

---

## 2. Archivos Modificados

Listado completo.

---

## 3. Impact Analysis

Qué módulos podrían verse afectados.

---

## 4. Riesgos

Riesgos encontrados.

---

## 5. Decisiones Arquitectónicas

Justificación de las decisiones tomadas.

---

## 6. Mejoras Detectadas

Mejoras encontradas pero NO implementadas.

---

## 7. Validaciones

Compilación.

Build.

Lint.

Pruebas ejecutadas.

Validación manual.

---

# Restricciones

Nunca:

- romper compatibilidad
- modificar código fuera del Sprint
- hacer refactorizaciones masivas
- cambiar arquitectura sin autorización
- crear deuda técnica
- duplicar lógica
- crear componentes innecesarios

---

# Principio Rector de EvoChurch

> Cada línea de código debe hacer que administrar una iglesia sea más sencillo, más transparente y permita al liderazgo dedicar menos tiempo a la administración y más tiempo al ministerio.

Si una implementación no contribuye a esa visión, probablemente no debería formar parte de EvoChurch.

---

# Regla Final para Agentes de IA

Antes de implementar cualquier cambio, el agente debe detenerse y preguntarse:

> **"¿Estoy construyendo la solución más simple, mantenible y escalable posible, respetando la arquitectura existente y la visión de EvoChurch?"**

Si la respuesta no es un **sí** claro y justificado, debe detener la implementación, documentar el problema y proponer alternativas antes de escribir código.