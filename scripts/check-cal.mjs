const API = "http://localhost:8080";
async function main() {
  const r = await fetch(API + "/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@sjcet.local", password: "Admin@12345!" }),
  });
  const { token } = await r.json();
  const fr = await fetch(API + "/v1/floors", { headers: { Authorization: "Bearer " + token } });
  const floors = await fr.json();
  const list = Array.isArray(floors) ? floors : floors.floors ?? [];
  for (const f of list) {
    console.log(f.id + " L" + f.level + " mpp=" + f.metersPerPixel + " img=" + (f.imagePath ? "yes" : "no"));
  }
}
main().catch(console.error);
