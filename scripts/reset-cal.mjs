const API = "http://localhost:8080";
const login = await fetch(API + "/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@sjcet.local", password: "Admin@12345!" }),
});
const { token } = await login.json();
const fr = await fetch(API + "/v1/floors", { headers: { Authorization: "Bearer " + token } });
const floors = await fr.json();
const f = (Array.isArray(floors) ? floors : floors.floors)[0];
const up = await fetch(API + "/v1/floors/" + f.id, {
  method: "PATCH",
  headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
  body: JSON.stringify({ metersPerPixel: 0.02 }),
});
console.log(up.status);
