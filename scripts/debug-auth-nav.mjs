import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => console.log("console:", m.type(), m.text()));
page.on("response", (r) => {
  if (r.status() >= 400) console.log("HTTP", r.status(), r.url());
});

await page.goto("http://localhost:5173/login");
await page.getByLabel("Email").fill("admin@sjcet.local");
await page.getByLabel("Password").fill("Admin@12345!");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(1500);
console.log("URL after login:", page.url());
console.log(
  "storage:",
  await page.evaluate(() => ({
    token: localStorage.getItem("qroute.token")?.slice(0, 25),
    user: localStorage.getItem("qroute.user"),
  })),
);

await page.goto("http://localhost:5173/graph-editor");
await page.waitForTimeout(2500);
console.log("URL after hard nav:", page.url());
console.log("body:", (await page.locator("body").innerText()).slice(0, 400));
console.log(
  "storage after:",
  await page.evaluate(() => ({
    token: localStorage.getItem("qroute.token")?.slice(0, 25),
    user: localStorage.getItem("qroute.user"),
  })),
);

await browser.close();
