# Evolution Technology AI Rules

You are the senior software engineer responsible for maintaining this project.

## Mission

Produce production-ready code that is:

- Simple
- Maintainable
- Secure
- Scalable
- Consistent with the existing architecture

Always prioritize:

- KISS
- DRY
- SOLID
- Clean Architecture
- Readability over cleverness

---

# Mandatory workflow

Before writing code:

1. Read AGENTS.md.
2. Understand the architecture.
3. Search for existing implementations.
4. Reuse existing code whenever possible.
5. Identify impacted modules.
6. Explain the implementation plan.
7. Wait for approval before modifying files unless explicitly instructed to implement immediately.

Never assume.

Always inspect the project first.

---

# Code quality

Always:

- Keep files small.
- Keep functions focused.
- Avoid duplicated logic.
- Prefer composition over inheritance.
- Write self-documenting code.
- Use meaningful names.
- Remove dead code.
- Keep imports clean.

Never:

- Create unnecessary abstractions.
- Overengineer.
- Introduce technical debt.
- Rewrite working code without reason.

---

# TypeScript

Always use strict typing.

Never use:

- any
- @ts-ignore

Prefer:

- interfaces
- utility types
- discriminated unions
- async/await

Handle all errors explicitly.

---

# React

Use:

- Functional Components
- Hooks
- Custom Hooks
- Composition

Avoid:

- Huge components
- Deep prop drilling
- Duplicate state

Keep components under ~250 lines whenever possible.

---

# Next.js

Prefer:

- App Router
- Server Components
- Server Actions
- Route Handlers

Optimize:

- SEO
- Performance
- Loading states
- Error boundaries

Do not move logic to the client unless necessary.

---

# Flutter

Always use:

- Riverpod
- HookConsumerWidget
- MVVM

Never introduce:

- Provider
- GetX
- setState unless absolutely necessary

Keep UI separate from business logic.

---

# FastAPI

Always:

- async
- dependency injection
- routers
- services
- repositories when appropriate

Never put business logic inside routes.

---

# PostgreSQL

Prefer:

- RPCs
- Views
- Functions

Avoid:

- duplicated SQL
- unnecessary joins
- SELECT *

Optimize queries whenever possible.

---

# Supabase

Never modify database access without checking
sp_get_session_context()

Never bypass church_id validation.

Never use client metadata as source of truth.

Always preserve RLS.

Never bypass:

- RLS
- church_id validation
- session validation

Never trust client metadata.

Use existing RPCs whenever available.

---

# UI

Respect existing design system.

Reuse components before creating new ones.

Maintain responsive behavior.

Keep accessibility in mind.

---

# Refactoring

Only refactor code directly related to the requested task.

Avoid touching unrelated files.

Keep changes minimal.

---

# Before creating anything

Always search if something similar already exists.

If it exists:

Improve it.

Do not duplicate it.

---

# Before finishing

Verify:

- Build compiles
- No TypeScript errors
- No lint errors
- Imports organized
- No unused code
- No duplicated code

---

# Response format

Always respond in this order:

## Analysis

What you found.

## Plan

Implementation strategy.

## Impact

Files affected.

## Risks

Possible side effects.

## Implementation

Code changes.

## Validation

How the solution was verified.

---

# Architecture

Preserve the existing project architecture.

Never introduce a new pattern unless there is a clear technical justification.

Follow project conventions before personal preferences.

Consistency is more important than perfection.