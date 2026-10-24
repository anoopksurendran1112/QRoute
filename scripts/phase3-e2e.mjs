// Phase 3 end-to-end smoke test: login -> upload floor plan -> graph -> validate -> QR.
// Usage: node scripts/phase3-e2e.mjs
import fs from "node:fs";
import path from "node:path";

const API = process.env.API_URL ?? "http://localhost:8080";
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@sjcet.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@12345!";
const IMAGE = process.env.FLOOR_IMAGE ?? path.resolve("Floor-0_Plan.png");

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const login = await fetch(`${API}/v1/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const loginBody = await json(login);
check("login returns 200", login.status === 200, `status=${login.status}`);
const token = loginBody.token;
check("login returns token", typeof token === "string" && token.length > 20);
check("login role is admin", loginBody.user?.role === "admin", loginBody.user?.role);

const auth = { Authorization: `Bearer ${token}` };

const floorsRes = await fetch(`${API}/v1/floors`, { headers: auth });
const floorsBody = await json(floorsRes);
const floors = Array.isArray(floorsBody) ? floorsBody : floorsBody.floors ?? [];
check("floors listed", floorsRes.status === 200 && floors.length > 0, `count=${floors.length}`);

const floor = floors[0];
check("floor has id", !!floor?.id, floor?.id);

// upload
const buf = fs.readFileSync(IMAGE);
const form = new FormData();
form.append("image", new Blob([buf], { type: "image/png" }), path.basename(IMAGE));
form.append("metersPerPixel", "0.02");
const uploadRes = await fetch(`${API}/v1/graph/floors/${floor.id}/upload`, {
  method: "POST",
  headers: auth,
  body: form,
});
const uploadBody = await json(uploadRes);
check("upload returns 200", uploadRes.status === 200, `status=${uploadRes.status} ${JSON.stringify(uploadBody).slice(0, 200)}`);
const updated = uploadBody.floor;
check("imagePath set", !!updated?.imagePath, updated?.imagePath);
check("sha256 set", !!updated?.imageSha256);
check("widthPx set", Number(updated?.widthPx) > 0, String(updated?.widthPx));
check("heightPx set", Number(updated?.heightPx) > 0, String(updated?.heightPx));
check("metersPerPixel saved", Number(updated?.metersPerPixel) === 0.02, String(updated?.metersPerPixel));

// image served
if (updated?.imagePath) {
  const imgRes = await fetch(`${API}${updated.imagePath}`);
  check("uploaded image served", imgRes.status === 200, `status=${imgRes.status}`);
  check("image cache-control immutable", (imgRes.headers.get("cache-control") ?? "").includes("immutable"));
}

// graph
const graphRes = await fetch(`${API}/v1/graph/floors/${floor.id}/graph`, { headers: auth });
const graphBody = await json(graphRes);
check("graph returns 200", graphRes.status === 200);
check("graph includes floor image", !!graphBody.graph?.imagePath, graphBody.graph?.imagePath);

// create two nodes
const suffix = Date.now().toString().slice(-6);
async function createNode(code, x, y, kind = "junction") {
  const res = await fetch(`${API}/v1/graph/nodes`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ floorId: floor.id, code, kind, x, y, label: code }),
  });
  return { res, body: await json(res) };
}
const n1 = await createNode(`T${suffix}A`, 100, 100);
check("create node A", n1.res.status === 201, `status=${n1.res.status}`);
const n2 = await createNode(`T${suffix}B`, 300, 300, "door");
check("create node B", n2.res.status === 201, `status=${n2.res.status}`);
const dup = await createNode(`T${suffix}A`, 10, 10);
check("duplicate node code rejected", dup.res.status === 409, `status=${dup.res.status}`);

// create edge with auto cost
const distPx = Math.hypot(200, 200);
const costM = Number((distPx * 0.02).toFixed(3));
const edgeRes = await fetch(`${API}/v1/graph/edges`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({
    fromNodeId: n1.body.node?.id,
    toNodeId: n2.body.node?.id,
    kind: "walk",
    costM,
    accessible: true,
    bidirectional: true,
  }),
});
const edgeBody = await json(edgeRes);
check("create edge", edgeRes.status === 201, `status=${edgeRes.status}`);
check("edge cost persisted", Number(edgeBody.edge?.costM) === Number(costM.toFixed(2)), String(edgeBody.edge?.costM));

// self edge rejected
const selfRes = await fetch(`${API}/v1/graph/edges`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ fromNodeId: n1.body.node?.id, toNodeId: n1.body.node?.id, kind: "walk", costM: 1 }),
});
check("self edge rejected", selfRes.status === 400, `status=${selfRes.status}`);

// validate
const valRes = await fetch(`${API}/v1/graph/floors/${floor.id}/validate`, { headers: auth });
const valBody = await json(valRes);
check("validate returns 200", valRes.status === 200);
check("validation stats present", typeof valBody.stats?.nodeCount === "number", JSON.stringify(valBody.stats));
check(
  "new edge connects without error",
  !(valBody.issues ?? []).some((i) => i.type === "error" && (i.nodeId === n1.body.node?.id || i.nodeId === n2.body.node?.id)),
  JSON.stringify((valBody.issues ?? []).filter((i) => i.type === "error").slice(0, 3)),
);

// qr single
const qrRes = await fetch(`${API}/v1/qr/nodes/${n1.body.node?.id}`, { headers: auth });
const qrBody = await json(qrRes);
check("single QR returns 200", qrRes.status === 200);
check("QR token format", /^SJCETNAV:v1:.+\.[0-9a-f]{8}$/.test(qrBody.token ?? ""), qrBody.token);
check("QR data url is png", (qrBody.qrDataUrl ?? "").startsWith("data:image/png;base64,"));

// qr bulk
const bulkRes = await fetch(`${API}/v1/qr/bulk`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ nodeIds: [n1.body.node?.id, n2.body.node?.id] }),
});
const bulkBody = await json(bulkRes);
check("bulk QR returns 200", bulkRes.status === 200);
check("bulk QR count", (bulkBody.qrCodes ?? []).length === 2, String((bulkBody.qrCodes ?? []).length));

// cleanup
for (const id of [n1.body.node?.id, n2.body.node?.id]) {
  if (id) await fetch(`${API}/v1/graph/nodes/${id}`, { method: "DELETE", headers: auth });
}

// unauthenticated checks
const anonUpload = await fetch(`${API}/v1/graph/floors/${floor.id}/validate`);
check("validate requires auth", anonUpload.status === 401, `status=${anonUpload.status}`);
const anonQr = await fetch(`${API}/v1/qr/nodes/${floor.id}`);
check("QR requires auth", anonQr.status === 401, `status=${anonQr.status}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.log("Failures:");
  failed.forEach((f) => console.log(` - ${f.name} ${f.detail}`));
  process.exit(1);
}
