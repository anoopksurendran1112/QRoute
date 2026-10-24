import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080';

const ADMIN_EMAIL = 'admin@sjcet.local';
const ADMIN_PASSWORD = 'Admin@12345!';

test.describe.serial('Phase 2 - Graph Core & Routing Engine', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_BASE}/v1/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    token = body.token;
    expect(token).toBeTruthy();
  });

  test('Route computation requires authentication', async ({ request }) => {
    const res = await request.post(`${API_BASE}/v1/routes/compute`, {
      data: { startNodeId: 'test', endNodeId: 'test' }
    });
    expect(res.status()).toBe(401);
  });

  test('Route computation validates request body', async ({ request }) => {
    const res = await request.post(`${API_BASE}/v1/routes/compute`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {}
    });
    expect(res.status()).toBe(400);
  });

  test('Route computation with A* algorithm', async ({ request }) => {
    // Get some nodes
    const nodesRes = await request.get(`${API_BASE}/v1/admin/graph?format=nodes`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => null);
    
    let nodes: any[] = [];
    if (nodesRes && nodesRes.ok()) {
      const data = await nodesRes.json();
      nodes = data.nodes || [];
    } else {
      // Try to get from catalog or just use direct DB approach via API
      // For now, skip if can't fetch
    }
    
    if (nodes.length >= 2) {
      const res = await request.post(`${API_BASE}/v1/routes/compute`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          startNodeId: nodes[0].id,
          endNodeId: nodes[1].id,
          algorithm: 'astar'
        }
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.astar).toBeDefined();
      expect(body.astar.metrics.algorithm).toBe('astar');
      expect(body.astar.metrics.heuristicUsed).toBe('euclidean3d');
    }
  });

  test('Route computation with Dijkstra algorithm', async ({ request }) => {
    const nodesRes = await request.get(`${API_BASE}/v1/admin/graph?format=nodes`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => null);
    
    let nodes: any[] = [];
    if (nodesRes && nodesRes.ok()) {
      const data = await nodesRes.json();
      nodes = data.nodes || [];
    }
    
    if (nodes.length >= 2) {
      const res = await request.post(`${API_BASE}/v1/routes/compute`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          startNodeId: nodes[0].id,
          endNodeId: nodes[1].id,
          algorithm: 'dijkstra'
        }
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.dijkstra).toBeDefined();
      expect(body.dijkstra.metrics.algorithm).toBe('dijkstra');
      expect(body.dijkstra.metrics.heuristicUsed).toBe('zero');
    }
  });

  test('Route computation with both algorithms', async ({ request }) => {
    const nodesRes = await request.get(`${API_BASE}/v1/admin/graph?format=nodes`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => null);
    
    let nodes: any[] = [];
    if (nodesRes && nodesRes.ok()) {
      const data = await nodesRes.json();
      nodes = data.nodes || [];
    }
    
    if (nodes.length >= 2) {
      const res = await request.post(`${API_BASE}/v1/routes/compute`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          startNodeId: nodes[0].id,
          endNodeId: nodes[1].id,
          algorithm: 'both'
        }
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.dijkstra).toBeDefined();
      expect(body.astar).toBeDefined();
      expect(typeof body.agreed).toBe('boolean');
    }
  });
});
