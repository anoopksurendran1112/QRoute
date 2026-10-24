import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080';
const ADMIN_BASE = 'http://localhost:5173';

const ADMIN_EMAIL = 'admin@sjcet.local';
const ADMIN_PASSWORD = 'Admin@12345!';

test.describe.serial('Phase 1 CRUD - Full Coverage', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    // Login to get token
    const res = await request.post(`${API_BASE}/v1/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    token = body.token;
    expect(token).toBeTruthy();
  });

  test('Buildings CRUD - all cases', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    await page.goto(`${ADMIN_BASE}/catalog/buildings`);
    await expect(page.locator('h1')).toContainText('Buildings');
    
    // Create
    await page.click('button:has-text("New building")');
    await page.fill('input[name="code"]', 'TST1');
    await page.fill('input[name="name"]', 'Test Building 1');
    await page.fill('input[name="campus"]', 'Test Campus');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Test Building 1')).toBeVisible();
    
    // Create without campus (optional)
    await page.click('button:has-text("New building")');
    await page.fill('input[name="code"]', 'TST2');
    await page.fill('input[name="name"]', 'Test Building 2');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Test Building 2')).toBeVisible();
    
    // Edit
    const row = page.locator('tr').filter({ hasText: 'TST1' });
    await row.locator('button:has-text("Edit")').click();
    await page.fill('input[name="name"]', 'Test Building 1 Updated');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Test Building 1 Updated')).toBeVisible();
  });

  test('Floors CRUD - all cases', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    await page.goto(`${ADMIN_BASE}/catalog/floors`);
    await expect(page.locator('h1')).toContainText('Floors');
    
    // Create with minimal fields
    await page.click('button:has-text("New floor")');
    await page.selectOption('select[name="buildingId"]', { index: 1 });
    await page.fill('input[name="level"]', '10');
    await page.fill('input[name="name"]', 'Test Floor 10');
    await page.fill('input[name="metersPerPixel"]', '0.02');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1500);
    
    // Create without optional fields
    await page.click('button:has-text("New floor")');
    await page.selectOption('select[name="buildingId"]', { index: 1 });
    await page.fill('input[name="level"]', '11');
    await page.fill('input[name="metersPerPixel"]', '0.015');
    // Leave widthPx, heightPx, imagePath empty
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1500);
  });

  test('Classrooms CRUD - all cases', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    await page.goto(`${ADMIN_BASE}/catalog/classrooms`);
    await expect(page.locator('h1')).toContainText('Classrooms');
    
    // Create with minimal fields - entranceNodeId empty
    await page.click('button:has-text("New classroom")');
    await page.fill('input[name="roomNumber"]', 'T1001');
    await page.selectOption('select[name="floorId"]', { index: 1 });
    // Leave departmentId empty
    // Leave entranceNodeId empty
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1500);
    
    // Create with department and capacity
    await page.click('button:has-text("New classroom")');
    await page.fill('input[name="roomNumber"]', 'T1002');
    await page.selectOption('select[name="floorId"]', { index: 1 });
    await page.selectOption('select[name="departmentId"]', { index: 1 });
    await page.fill('input[name="capacity"]', '60');
    // Leave entranceNodeId empty
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1500);
    
    // Create with all optional empty
    await page.click('button:has-text("New classroom")');
    await page.fill('input[name="roomNumber"]', 'T1003');
    await page.selectOption('select[name="floorId"]', { index: 2 });
    // All optional fields empty
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1500);
  });

  test('Departments CRUD - all cases', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    await page.goto(`${ADMIN_BASE}/catalog/departments`);
    await expect(page.locator('h1')).toContainText('Departments');
    
    await page.click('button:has-text("New department")');
    await page.fill('input[name="code"]', 'TST');
    await page.fill('input[name="name"]', 'Test Department');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Test Department')).toBeVisible();
  });

  test('Faculty CRUD - all cases', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    await page.goto(`${ADMIN_BASE}/catalog/faculty`);
    await expect(page.locator('h1')).toContainText('Faculty');
    
    await page.click('button:has-text("New faculty")');
    await page.fill('input[name="name"]', 'Test Faculty');
    await page.fill('input[name="email"]', 'test.faculty@sjcet.local');
    await page.fill('input[name="designation"]', 'Professor');
    await page.selectOption('select[name="departmentId"]', { index: 1 });
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Test Faculty')).toBeVisible();
    
    // Without designation
    await page.click('button:has-text("New faculty")');
    await page.fill('input[name="name"]', 'Test Faculty 2');
    await page.fill('input[name="email"]', 'test.faculty2@sjcet.local');
    await page.selectOption('select[name="departmentId"]', { index: 1 });
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);
  });

  test.afterAll(async ({ request }) => {
    // Cleanup test data
    const headers = { Authorization: `Bearer ${token}` };
    
    // Delete in reverse order due to foreign keys
    try {
      const buildings = await request.get(`${API_BASE}/v1/buildings`, { headers });
      const bData = await buildings.json();
      for (const b of bData.buildings || []) {
        if (b.code?.startsWith('TST')) {
          await request.delete(`${API_BASE}/v1/buildings/${b.id}`, { headers });
        }
      }
    } catch (e) {}
    
    try {
      const depts = await request.get(`${API_BASE}/v1/departments`, { headers });
      const dData = await depts.json();
      for (const d of dData.departments || []) {
        if (d.code === 'TST') {
          await request.delete(`${API_BASE}/v1/departments/${d.id}`, { headers });
        }
      }
    } catch (e) {}
  });
});
