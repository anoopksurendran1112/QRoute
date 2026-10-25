const API = 'http://localhost:8080';
async function main() {
  const login = await fetch(API + '/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sjcet.local', password: 'Admin@12345!' }),
  });
  const loginBody = await login.json();
  const token = loginBody.token;
  const h = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  const floorsRes = await fetch(API + '/v1/floors', { headers: { Authorization: 'Bearer ' + token } });
  const floors = await floorsRes.json();
  const floorList = Array.isArray(floors) ? floors : floors.floors;
  const f = floorList[0];

  const graphRes = await fetch(API + '/v1/graph/floors/' + f.id + '/graph', { headers: { Authorization: 'Bearer ' + token } });
  const graphBody = await graphRes.json();
  const node = graphBody.graph.nodes[0];

  const qrRes = await fetch(API + '/v1/qr/nodes/' + node.id, { headers: { Authorization: 'Bearer ' + token } });
  const qrBody = await qrRes.json();
  console.log('qr:', qrBody.token?.startsWith('SJCETNAV:v1:'));

  const resolveRes = await fetch(API + '/v1/scan/resolve', { method: 'POST', headers: h, body: JSON.stringify({ token: qrBody.token }) });
  console.log('resolve:', resolveRes.status);
  const resolveBody = await resolveRes.json();
  console.log(resolveBody.location);

  const snapRes = await fetch(API + '/v1/graph/snapshot', { headers: { Authorization: 'Bearer ' + token } });
  console.log('snapshot:', snapRes.status);
  const snapBody = await snapRes.json();
  console.log('nodes:', snapBody.nodes?.length);

  const sessRes = await fetch(API + '/v1/navigation/sessions', {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ startNodeId: node.id, endNodeId: graphBody.graph.nodes[1]?.id || node.id, algorithm: 'astar' }),
  });
  console.log('session:', sessRes.status);
}
main().catch(console.error);
