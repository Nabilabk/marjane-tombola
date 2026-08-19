import { chromium } from 'playwright'
const OUT = process.env.OUT_DIR || '.'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 460, height: 900 } })
await page.addInitScript(() => {
  localStorage.setItem('campaignhub_admin_session', JSON.stringify({ email: 'admin@campaignhub.ma', name: 'Administrator', loggedInAt: new Date().toISOString() }))
})
await page.goto('http://localhost:8443/admin/create', { waitUntil: 'networkidle' })
await page.getByPlaceholder('e.g. Marjane Summer Campaign').fill('Look QA')
await page.click('button:has-text("Create website")')
await page.waitForURL(/\/admin\/site\/.+\/theme/, { timeout: 10000 })
const siteId = page.url().match(/site\/([^/]+)\//)[1]
await page.goto(`http://localhost:8443/admin/site/${siteId}/prizes`, { waitUntil: 'networkidle' })
await page.click('button:has-text("Cups")')
await page.waitForTimeout(300)

// Look at the raw public site instead of the cramped admin preview frame.
await page.route('**/api/play', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ prizes: [20, 40, 60] }) })
})
await page.goto(`http://localhost:8443/look-qa`, { waitUntil: 'networkidle' })
await page.fill('input >> nth=0', 'Test')
await page.fill('input >> nth=1', 'User')
await page.fill('input[dir="ltr"]', '0612345670')
await page.click('input[type="checkbox"]')
await page.click('button[type="submit"]')
await page.waitForTimeout(400)
await page.route('**/api/receipt/validate', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, receipt: { store: 'Test', total: 200, receiptNumber: 'X', date: '2026-01-01' }, errors: [] }) })
})
const fc = page.waitForEvent('filechooser')
await page.locator('input[type="file"]').evaluate((el) => el.click())
const chooser = await fc
await chooser.setFiles({ name: 'r.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') })
await page.waitForTimeout(2200)
await page.screenshot({ path: `${OUT}/look01-ready.png` })

await page.click('.dice-btn:not([disabled])')
await page.waitForTimeout(3800)
await page.screenshot({ path: `${OUT}/look02-picking.png` })

await page.goto('http://localhost:8443/admin', { waitUntil: 'networkidle' })
const nameNode = page.getByText('Look QA', { exact: true })
const card = nameNode.locator('xpath=ancestor::*[contains(@class,"group")][1]')
page.on('dialog', d => d.accept())
await card.locator('button[aria-label="Website actions"]').click()
await page.click('text=Delete')
await page.waitForTimeout(300)
await browser.close()
