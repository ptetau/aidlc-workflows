/* uitest.mjs — headless browser smoke test of the running aidlc-server.
   Usage: node uitest.mjs <baseURL>  (server must already be running) */
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:7423';
const EXE = 'C:/Users/User/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';

const errors = [];
const failedReqs = [];

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('requestfailed', r => failedReqs.push(r.url() + ' — ' + (r.failure()?.errorText || '')));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('nav button', { timeout: 8000 });

const navCount = await page.locator('nav button').count();
console.log('nav items:', navCount);

// visit each workspace and confirm a WorkHeader <h1> renders
const ids = ['Clarification', 'Stories', 'Architecture', 'Infrastructure', 'Tests', 'Steering'];
const rendered = {};
for (const label of ids) {
  await page.locator('nav button', { hasText: label }).first().click();
  await page.waitForTimeout(250);
  const h1 = await page.locator('h1').first().innerText().catch(() => '(none)');
  rendered[label] = h1;
}
console.log('workspace headings:', JSON.stringify(rendered, null, 2));

// fonts actually applied?
const fontFam = await page.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily);
console.log('h1 font-family:', fontFam);
const fontsLoaded = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check("500 16px 'Newsreader'") && document.fonts.check("12px 'JetBrains Mono'"); });
console.log('Newsreader(500) + JetBrains Mono loaded:', fontsLoaded);

// dark mode toggle
await page.locator('button', { hasText: 'Dark' }).first().click();
await page.waitForTimeout(150);
const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
console.log('theme after Dark click:', theme);
await page.locator('button', { hasText: 'Light' }).first().click();

// Save round-trip on Clarification: pick an answer, hit Save, expect a toast
await page.locator('nav button', { hasText: 'Clarification' }).first().click();
await page.waitForTimeout(250);
// pick a radio option that differs from the seed answer (seed q-cadence = 0), so the diff is real
await page.locator('button:has-text("Per-customer anniversary")').first().click().catch(() => {});
await page.locator('button:has-text("Save")').first().click();
await page.waitForTimeout(400);
const toast = await page.locator('.toast').first().innerText().catch(() => '(no toast)');
console.log('toast after Save:', toast.replace(/\n/g, ' '));

// open the Digest panel; expect at least one entry
await page.locator('button:has-text("Digest")').first().click();
await page.waitForTimeout(400);
const digestText = await page.locator('.serif:has-text("Digest")').first().isVisible().catch(() => false);
const entryCount = await page.locator('.card:has-text("you")').count().catch(() => 0);
console.log('digest drawer open:', digestText, '| user entries visible:', entryCount);

await page.screenshot({ path: 'uitest-shot.png', fullPage: false });
console.log('screenshot: uitest-shot.png');

console.log('\nconsole errors:', errors.length ? errors : 'none');
console.log('failed requests:', failedReqs.length ? failedReqs : 'none');

await browser.close();
const ok = navCount === 6 && Object.values(rendered).every(h => h && h !== '(none)') && errors.length === 0 && failedReqs.length === 0;
console.log('\nRESULT:', ok ? 'PASS' : 'CHECK ABOVE');
process.exit(ok ? 0 : 1);
