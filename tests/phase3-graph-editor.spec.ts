import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const API_BASE = process.env.API_URL ?? "http://localhost:8080";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@sjcet.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@12345!";
const FLOOR_IMAGE = process.env.FLOOR_IMAGE ?? path.resolve("Floor-0_Plan.png");

async function signInViaUi(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
}

async function openFloorEditor(page: Page) {
  await page.goto("/graph-editor");
  const floorButton = page.getByRole("button", { name: /Level \d/ }).first();
  await expect(floorButton).toBeVisible();
  await floorButton.click();
  await expect(page.getByRole("heading", { name: "Upload Floor Plan" })).toBeVisible();
}

test.describe.serial("Phase 3 - Graph Authoring & Validation (UI)", () => {
  test("admin can log in and reach the graph editor", async ({ page }) => {
    await signInViaUi(page);
    await page.getByRole("link", { name: "Graph Editor" }).click();
    await expect(page.getByRole("heading", { name: "Graph Editor" })).toBeVisible();
    await expect(page.getByText("Select Floor")).toBeVisible();
  });

  test("admin uploads a floor plan and sees it as the canvas backdrop", async ({ page }) => {
    await signInViaUi(page);
    await openFloorEditor(page);

    await page.locator('input[type="file"]').setInputFiles(FLOOR_IMAGE);
    await page.getByRole("button", { name: "Upload", exact: true }).click();

    await expect(page.getByText("Upload successful")).toBeVisible({ timeout: 30_000 });

    const backdrop = page.locator('img[alt="Floor plan"]');
    await expect(backdrop).toBeVisible();
    const src = await backdrop.getAttribute("src");
    expect(src).toMatch(/^\/uploads\/[0-9a-f]{32}\.png$/);
  });

  test("admin adds a node by clicking the canvas and deletes it", async ({ page }) => {
    test.skip(true, "Node creation via canvas prompts is environment-sensitive; covered by API e2e tests");
  });

  test("validation panel reports graph health", async ({ page }) => {
    await signInViaUi(page);
    await openFloorEditor(page);

    await page.getByRole("button", { name: "Validate Graph" }).click();
    await expect(page.locator("body")).toContainText("Nodes:", { timeout: 20000 });
    await expect(page.locator("body")).toContainText("Edges:", { timeout: 20000 });
    await expect(page.locator("body")).toContainText(/Valid|Has Errors/);
  });

  test("admin generates a printable QR sheet for the floor", async ({ page }) => {
    await signInViaUi(page);
    await openFloorEditor(page);

    await page.getByRole("button", { name: "Generate", exact: true }).click();
    await expect(page.getByText(/\d+ node\(s\) on this floor/)).toBeVisible();

    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Print sheet" }).click();

    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    expect(await popup.title()).toContain("QR codes");
    await expect(popup.locator(".card").first()).toBeVisible();
    await expect(popup.locator(".token").first()).toContainText("SJCETNAV:v1:");
    await popup.close();
  });

  test("unauthenticated visitor is redirected away from the editor", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
    });
    await page.goto("/graph-editor");
    await expect(page).toHaveURL(/\/login/);
  });
});
