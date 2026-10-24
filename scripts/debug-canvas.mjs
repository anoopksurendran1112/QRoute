import { chromium } from "@playwright/test";
import path from "node:path";

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => console.log("C:", m.type(), m.text()));
page.on("pageerror", (e) => console.log("ERR:", e.message));

await page.goto("http://localhost:5173/login");
await page.getByLabel("Email").fill("admin@sjcet.local");
await page.getByLabel("Password").fill("Admin@12345!");
await page.getByRole("button", { name: "Sign in" }).click();
await page.getByText(/Signed in as/).waitFor({ timeout: 10000 });

await page.goto("http://localhost:5173/graph-editor");
const fb = page.getByRole("button", { name: /Level \d/ }).first();
await fb.waitFor({ timeout: 10000 });
await fb.click();
await page.getByRole("heading", { name: "Upload Floor Plan" }).waitFor({ timeout: 10000 });

const imgCount = await page.locator('img[alt="Floor plan"]').count();
console.log("img count:", imgCount);
const nodes = await page.locator(".react-flow__node").count();
console.log("nodes:", nodes);
const html = await page.locator(".react-flow").innerHTML();
console.log(html.slice(0, 500));

await browser.close();
