const { chromium } = require('playwright-core');
const path = require('path');
const OUT = 'C:/Users/nabil/AppData/Local/Temp/claude/c--Users-nabil-Downloads-marjane-with-admin-carte-version-marjane-with-admin/f1c0bf53-1441-4fe9-a84b-49d56d6b052b/scratchpad';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  await page.goto('http://localhost:8443/admin/login', { waitUntil: 'networkidle' });
  const inputs = await page.$$('input');
  await inputs[0].fill('admin@campaignhub.ma');
  await inputs[1].fill('admin123');
  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(1000);
  await page.click('text=Marjane');
  await page.waitForTimeout(800);

  // Switch admin language to French via the topbar
  await page.locator('header button:has(svg.lucide-globe)').click();
  await page.waitForTimeout(300);
  await page.getByText('Français', { exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '70-admin-fr.png') });

  // Team page
  await page.goto('http://localhost:8443/admin/team', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '71-team-fr.png') });

  // Switch to Arabic and check RTL
  await page.locator('header button:has(svg.lucide-globe)').click();
  await page.waitForTimeout(300);
  await page.getByText('العربية', { exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '72-team-ar-rtl.png') });

  await browser.close();
  if (errors.length) console.log('PAGE ERRORS:', JSON.stringify(errors));
  else console.log('No page errors.');
})();
