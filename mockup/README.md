# Prototipo HTML/React (referencia visual)

Mock interactivo sin backend. Abre en el navegador:

```bash
# Desde esta carpeta, sirve archivos estáticos (ejemplo):
npx --yes serve .
# Luego abre http://localhost:3000/EvoChurch.html
```

O abre `EvoChurch.html` directamente (algunos navegadores limitan módulos Babel por `file://`).

**Archivos:** `EvoChurch.html`, `app.jsx`, `screens-*.jsx`, `data.js`, `app.css`.

La app productiva es **Next.js** en la raíz del repositorio (`npm run dev`).

## Mockups por feature

| Archivo | Feature | Cómo abrir |
|---------|---------|------------|
| [`member-family-mockup.html`](./member-family-mockup.html) | **P1.2** Familia en perfil (cónyuge + hijos) | Abrir en navegador; barra inferior = vistas A–E |
| [`family-report-mockup.html`](./family-report-mockup.html) | **P-family-report** Reporte de familia (CRM pastoral) | Abrir en navegador; barra inferior = vistas A–D |
| [`finanzas-mockup.html`](./finanzas-mockup.html) | Finanzas (referencia) | Abrir en navegador |
| [`permisos-finanzas-mockup.html`](./permisos-finanzas-mockup.html) | Permisos finanzas | Abrir en navegador |

BackOffice (Sales / Organizations): [`.docs/backoffice/mockup/`](../.docs/backoffice/mockup/README.md).
