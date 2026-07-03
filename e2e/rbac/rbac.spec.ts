import { test, expect } from "@playwright/test";
import {
  credsFor,
  expandNavGroup,
  loginAs,
  pageDenied,
  rbacImplemented,
  sidebarHrefVisible,
  sidebarLinkVisible,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const ok = await rbacImplemented();
  test.skip(!ok, "RBAC migration not applied (permissions[] missing in session)");
});

test.describe("RBAC-AUTH / ROUTE", () => {
  test("RBAC-AUTH-01 U-ADMIN lands on dashboard", async ({ page }) => {
    test.skip(!credsFor("ADMIN"), "U-ADMIN creds missing");
    await loginAs(page, "ADMIN");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("RBAC-AUTH-01 U-NOROLE limited home", async ({ page }) => {
    test.skip(!credsFor("NOROLE"), "U-NOROLE creds missing");
    await loginAs(page, "NOROLE");
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings/);
  });

  test("ROUTE-01 U-TESORERO denied /settings/users", async ({ page }) => {
    test.skip(!credsFor("TESORERO"), "U-TESORERO creds missing");
    await loginAs(page, "TESORERO");
    expect(await pageDenied(page, "/settings/users")).toBeTruthy();
  });

  test("ROUTE-02 U-NOROLE denied /members", async ({ page }) => {
    test.skip(!credsFor("NOROLE"), "U-NOROLE creds missing");
    await loginAs(page, "NOROLE");
    expect(await pageDenied(page, "/members")).toBeTruthy();
  });

  test("ROUTE-03 U-NOROLE allowed /settings", async ({ page }) => {
    test.skip(!credsFor("NOROLE"), "U-NOROLE creds missing");
    await loginAs(page, "NOROLE");
    await page.goto("/settings");
    await expect(page.getByText(/Perfil|Configuración/i).first()).toBeVisible();
  });
});

test.describe("RBAC NAV sidebar", () => {
  test("NAV-01 U-ADMIN full nav", async ({ page }) => {
    test.skip(!credsFor("ADMIN"), "U-ADMIN creds missing");
    await loginAs(page, "ADMIN");
    await page.goto("/dashboard");
    expect(await sidebarLinkVisible(page, "Miembros")).toBeTruthy();
    expect(await sidebarLinkVisible(page, "Ministerios")).toBeTruthy();
    expect(await sidebarLinkVisible(page, "Usuarios")).toBeTruthy();
  });

  test("NAV-02 U-TESORERO finances without admin users", async ({ page }) => {
    test.skip(!credsFor("TESORERO"), "U-TESORERO creds missing");
    await loginAs(page, "TESORERO");
    await page.goto("/dashboard");
    await expandNavGroup(page, "Finanzas");
    expect(await sidebarHrefVisible(page, "/finances/transactions")).toBeTruthy();
    expect(await sidebarHrefVisible(page, "/settings/users")).toBeFalsy();
  });

  test("NAV-03 U-LIDER ministries without finances", async ({ page }) => {
    test.skip(!credsFor("LIDER"), "U-LIDER creds missing");
    await loginAs(page, "LIDER");
    await page.goto("/ministerios");
    expect(await sidebarHrefVisible(page, "/ministerios")).toBeTruthy();
    expect(await sidebarHrefVisible(page, "/finances/transactions")).toBeFalsy();
    expect(await sidebarHrefVisible(page, "/finances/contributions")).toBeFalsy();
  });

  test("NAV-04 U-NOROLE minimal nav", async ({ page }) => {
    test.skip(!credsFor("NOROLE"), "U-NOROLE creds missing");
    await loginAs(page, "NOROLE");
    await page.goto("/settings");
    expect(await sidebarHrefVisible(page, "/members")).toBeFalsy();
    expect(await sidebarHrefVisible(page, "/finances/transactions")).toBeFalsy();
  });
});

test.describe("RBAC UI actions", () => {
  test("UI-01 U-TESORERO sees transactions page", async ({ page }) => {
    test.skip(!credsFor("TESORERO"), "U-TESORERO creds missing");
    await loginAs(page, "TESORERO");
    await page.goto("/finances/transactions");
    await expect(page.getByText(/Transacciones|transacciones/i).first()).toBeVisible();
  });

  test("UI-02 U-TESORERO no Nuevo miembro", async ({ page }) => {
    test.skip(!credsFor("TESORERO"), "U-TESORERO creds missing");
    await loginAs(page, "TESORERO");
    const denied = await pageDenied(page, "/members");
    if (!denied) {
      await expect(page.getByRole("button", { name: /Nuevo miembro/i })).toHaveCount(0);
    }
  });

  test("UI-04 U-LIDER no Nuevo ministerio", async ({ page }) => {
    test.skip(!credsFor("LIDER"), "U-LIDER creds missing");
    await loginAs(page, "LIDER");
    await page.goto("/ministerios");
    await expect(page.getByRole("button", { name: /Nuevo ministerio/i })).toHaveCount(0);
  });

  test("UI-06 U-ADMIN Nuevo ministerio visible", async ({ page }) => {
    test.skip(!credsFor("ADMIN"), "U-ADMIN creds missing");
    await loginAs(page, "ADMIN");
    await page.goto("/ministerios");
    await expect(page.getByRole("button", { name: /Nuevo ministerio/i })).toBeVisible();
  });
});

test.describe("RBAC REG regression smoke", () => {
  test("REG-01 U-ADMIN dashboard loads", async ({ page }) => {
    test.skip(!credsFor("ADMIN"), "U-ADMIN creds missing");
    await loginAs(page, "ADMIN");
    await page.goto("/dashboard");
    await expect(page.locator("body")).not.toContainText("Error 500");
  });

  test("REG-02 U-ADMIN contributions page 2", async ({ page }) => {
    test.skip(!credsFor("ADMIN"), "U-ADMIN creds missing");
    await loginAs(page, "ADMIN");
    await page.goto("/finances/contributions?page=2");
    await expect(page).toHaveURL(/page=2/);
  });
});
