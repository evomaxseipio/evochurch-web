import { expect, test } from "@playwright/test";
import { churchPath } from "../../src/lib/apps/church-routes";
import { credsFor, loginAs } from "../rbac/helpers";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const QA_TITLE_PREFIX = "QA agregado UI ";

async function cleanupQaSessions() {
  const credentials = credsFor("ADMIN");
  const path = resolve(process.cwd(), ".env.local");
  if (!credentials || !existsSync(path)) return;
  const env = Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .flatMap((line) => {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        return match ? [[match[1], match[2].replace(/^["']|["']$/g, "")]] : [];
      }),
  );
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return;
  const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!authResponse.ok) return;
  const auth = await authResponse.json();
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${auth.access_token}`,
    "Content-Type": "application/json",
  };
  const contextResponse = await fetch(`${url}/rest/v1/rpc/sp_get_session_context`, {
    method: "POST",
    headers,
    body: "{}",
  });
  const context = await contextResponse.json();
  const churchId = Number(context.church_id ?? context.churchId);
  if (!Number.isInteger(churchId)) return;
  const listResponse = await fetch(`${url}/rest/v1/rpc/sp_list_attendance_sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      p_church_id: churchId,
      p_activity_type: null,
      p_ministry_id: null,
      p_from: null,
      p_to: null,
      p_limit: 200,
      p_offset: 0,
    }),
  });
  const list = await listResponse.json();
  const qaSessions = Array.isArray(list.sessions)
    ? list.sessions.filter((session: { title?: string }) => session.title?.startsWith(QA_TITLE_PREFIX))
    : [];
  for (const session of qaSessions) {
    await fetch(`${url}/rest/v1/rpc/sp_maintain_attendance_session`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_church_id: churchId,
        p_action: "delete",
        p_session_id: session.id,
        p_session_date: null,
        p_activity_type: null,
        p_ministry_id: null,
        p_event_id: null,
        p_title: null,
        p_notes: null,
        p_attendance_mode: null,
        p_aggregate_data: [],
      }),
    });
  }
}

test.afterEach(async () => {
  await cleanupQaSessions();
});

test("admin creates, views and deletes aggregate attendance", async ({ page }) => {
  test.skip(!credsFor("ADMIN"), "U-ADMIN creds missing");
  await loginAs(page, "ADMIN");
  await page.goto(churchPath("/attendance"));
  await expect(page.getByRole("heading", { name: "Asistencia" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sesión de casa" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sesión de estudio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sesión de niños" })).toBeVisible();

  const title = `${QA_TITLE_PREFIX}${Date.now()}`;
  await page.getByRole("button", { name: "Nueva sesión", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Nueva sesión" });
  await form.getByLabel("Tipo de actividad*").selectOption("service");
  await form.getByLabel("Título").fill(title);
  await form.getByLabel("Agregada").check();

  await form.getByRole("button", { name: "Agregar fila" }).click();
  await form.getByRole("button", { name: "Agregar fila" }).click();
  const rows = form.locator("tbody tr");
  await rows.nth(0).getByRole("textbox").fill("Adultos");
  await rows.nth(0).getByRole("spinbutton").fill("12");
  await rows.nth(1).getByRole("textbox").fill("Niños");
  await rows.nth(1).getByRole("spinbutton").fill("4");
  await expect(form.locator("tfoot")).toContainText("16");
  await form.getByRole("button", { name: "Guardar" }).click();

  const detail = page.getByRole("dialog", { name: title });
  await expect(detail).toBeVisible();
  await expect(detail).toContainText("Adultos");
  await expect(detail).toContainText("Niños");
  await expect(detail.locator("tfoot")).toContainText("16");
  await detail.getByRole("button", { name: "Cerrar" }).last().click();

  await page.getByPlaceholder(/Buscar por título/i).fill(title);
  const row = page.locator("tbody tr").filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row).toContainText("16");
  await row.getByRole("button", { name: "Acciones" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();

  const edit = page.getByRole("dialog", { name: "Editar sesión" });
  await edit.locator(".drawer-foot").getByRole("button", { name: "Eliminar", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "¿Eliminar sesión?" });
  await confirm.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.locator("tbody tr").filter({ hasText: title })).toHaveCount(0);
});

test("admin records and reopens an individual house roster", async ({ page }) => {
  test.skip(!credsFor("ADMIN"), "U-ADMIN creds missing");
  await loginAs(page, "ADMIN");
  await page.goto(churchPath("/attendance"));

  const title = `${QA_TITLE_PREFIX}casa ${Date.now()}`;
  await page.getByRole("button", { name: "Sesión de casa" }).click();
  const form = page.getByRole("dialog", { name: "Nueva sesión" });
  await expect(form.getByLabel("Tipo de actividad*")).toHaveValue("house_group");
  await form.getByLabel("Ministerio / grupo*").selectOption({ index: 1 });
  await form.getByLabel("Título").fill(title);
  await form.getByRole("button", { name: "Guardar" }).click();

  const checklist = page.getByRole("dialog", { name: title });
  await expect(checklist).toBeVisible();
  const rosterRows = checklist.locator("tbody tr");
  expect(await rosterRows.count()).toBeGreaterThanOrEqual(3);
  await rosterRows.nth(0).getByRole("button", { name: "Presente" }).click();
  await rosterRows.nth(1).getByRole("button", { name: "Tarde" }).click();
  await rosterRows.nth(2).getByRole("button", { name: "Ausente" }).click();
  await checklist.getByRole("button", { name: "Guardar asistencia" }).click();

  await page.getByPlaceholder(/Buscar por título/i).fill(title);
  let row = page.locator("tbody tr").filter({ hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Acciones" }).click();
  await page.getByRole("menuitem", { name: "Pasar lista" }).click();
  const reopened = page.getByRole("dialog", { name: title });
  await expect(reopened.getByText("Presente: 1")).toBeVisible();
  await expect(reopened.getByText("Tarde: 1")).toBeVisible();
  await reopened.getByRole("button", { name: "Todos presentes" }).click();
  await reopened.getByRole("button", { name: "Guardar asistencia" }).click();

  await page.getByPlaceholder(/Buscar por título/i).fill(title);
  row = page.locator("tbody tr").filter({ hasText: title });
  await row.getByRole("button", { name: "Acciones" }).click();
  await page.getByRole("menuitem", { name: "Pasar lista" }).click();
  const allPresent = page.getByRole("dialog", { name: title });
  await expect(allPresent.getByText(/Presente: [3-9]|Presente: [1-9][0-9]+/)).toBeVisible();
  await expect(allPresent.getByText("Tarde: 0")).toBeVisible();
  await allPresent.getByRole("button", { name: "Cancelar" }).click();

  await page.getByPlaceholder(/Buscar por título/i).fill(title);
  row = page.locator("tbody tr").filter({ hasText: title });
  await row.getByRole("button", { name: "Acciones" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  const edit = page.getByRole("dialog", { name: "Editar sesión" });
  await edit.locator(".drawer-foot").getByRole("button", { name: "Eliminar", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "¿Eliminar sesión?" });
  await confirm.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.locator("tbody tr").filter({ hasText: title })).toHaveCount(0);
});

test("user without attendance permission cannot open route", async ({ page }) => {
  test.skip(!credsFor("NOROLE"), "U-NOROLE creds missing");
  await loginAs(page, "NOROLE");
  await page.goto(churchPath("/attendance"));
  await expect(page).not.toHaveURL(/\/apps\/church\/attendance(?:\?|$)/);
});
