import { test, expect } from '@playwright/test';

test('debug scan connectivity', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('PAGEERR:', err.message));
  
  await page.goto('/scan');
  await page.waitForTimeout(2000);
  
  // Check API base
  const apiBase = await page.evaluate(() => {
    // Try to access the module
    return localStorage.getItem('apiBase') || 'unknown';
  });
  console.log('API Base:', apiBase);
  
  // Click start scanning
  await page.click('button:has-text("Start Scanning")');
  await page.waitForTimeout(3000);
  
  // Check for errors
  const errorText = await page.locator('.bg-red-50').textContent().catch(() => null);
  console.log('Error:', errorText);
});
