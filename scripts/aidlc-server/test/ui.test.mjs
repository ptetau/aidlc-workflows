/* ui.test.mjs — Playwright UI tests for the AI-DLC Workspace.
   Run: node --test  (from scripts/aidlc-server). Needs Go + a Playwright Chromium. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, closeBrowser, readWorkspaceDoc, readDigests, appendAgentDigest } from './helpers.mjs';

after(closeBrowser);

const WORKSPACES = ['Clarification', 'Stories', 'Architecture', 'Infrastructure', 'Tests', 'Steering'];
const POLL_WAIT = 3600; // digest panel polls every 3s

test('renders all six workspaces with headings, no console errors', async (t) => {
  const app = await openApp();
  t.after(app.cleanup);
  const { page } = app;

  assert.equal(await page.locator('nav button').count(), 6, 'six nav items');
  for (const label of WORKSPACES) {
    await page.locator('nav button', { hasText: label }).first().click();
    await page.waitForTimeout(200);
    const h1 = (await page.locator('h1').first().innerText()).trim();
    assert.ok(h1.length > 0, `${label} renders a heading`);
  }
  assert.deepEqual(page.__errors, [], 'no console/page errors while navigating');
});

test('dark mode toggle sets data-theme', async (t) => {
  const app = await openApp();
  t.after(app.cleanup);
  const { page } = app;

  await page.locator('button', { hasText: 'Dark' }).first().click();
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
  await page.locator('button', { hasText: 'Light' }).first().click();
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light');
});

test('offline fonts (Newsreader + JetBrains Mono) load from vendored woff2', async (t) => {
  const app = await openApp();
  t.after(app.cleanup);
  const { page } = app;

  const ok = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check("500 16px 'Newsreader'") && document.fonts.check("12px 'JetBrains Mono'");
  });
  assert.ok(ok, 'vendored fonts are loaded (no CDN, works offline)');
});

test('copy-to-json is gone — Save is the export action', async (t) => {
  const app = await openApp();
  t.after(app.cleanup);
  const { page } = app;

  for (const label of WORKSPACES) {
    await page.locator('nav button', { hasText: label }).first().click();
    await page.waitForTimeout(150);
    assert.equal(await page.getByRole('button', { name: /copy to json/i }).count(), 0,
      `${label}: no "copy to json" button`);
    assert.ok(await page.getByRole('button', { name: /^Save$/ }).count() >= 1,
      `${label}: has a Save button`);
  }
});

test('Save persists JSON + records a user digest, and does NOT raise the unread badge', async (t) => {
  const app = await openApp();
  t.after(app.cleanup);
  const { page, ws } = app;

  // Clarification is the default view; seed answer for q-cadence is index 0 — pick a different option
  await page.locator('button:has-text("Per-customer anniversary")').first().click();
  await page.locator('button', { hasText: /^Save$/ }).first().click();
  await page.waitForSelector('.toast', { timeout: 4000 });
  const toast = await page.locator('.toast').first().innerText();
  assert.match(toast, /Saved/i, 'toast confirms the save');

  // on disk: clarify changed + exactly one user digest, no agent digest
  const digests = readDigests(ws);
  assert.equal(digests.length, 1, 'one digest entry recorded');
  assert.equal(digests[0].actor, 'user');
  assert.equal(digests[0].workspace, 'clarify');
  const clarify = readWorkspaceDoc(ws, 'clarify');
  assert.equal(clarify.questions.find(q => q.id === 'q-cadence').answer, 1, 'answer persisted as index 1');

  // a user's own save must not badge them (badge counts agent replies only)
  await page.waitForTimeout(POLL_WAIT);
  assert.equal(await page.locator('button:has-text("Digest") span.mono').count(), 0, 'no unread badge after own save');
});

test('agent ingest reply auto-appears via polling (no reload) and raises the unread badge', async (t) => {
  const app = await openApp();
  t.after(app.cleanup);
  const { page, ws } = app;

  // simulate `/aidlc ingest` appending an agent reply after the page is already open
  appendAgentDigest(ws, {
    workspace: 'stories',
    summary: 'Regenerated 3 stories from the resolved ambiguity.',
    nextSteps: ['Review the new stories', 'Estimate points on s7'],
    changes: [{ field: 'cards', before: '7 items', after: '10 items' }],
  });

  // unread badge should appear within one poll cycle, WITHOUT reloading
  await page.waitForSelector('button:has-text("Digest") span.mono', { timeout: POLL_WAIT + 1500 });
  assert.equal((await page.locator('button:has-text("Digest") span.mono').first().innerText()).trim(), '1');

  // open the drawer; the agent summary + next steps render
  await page.locator('button:has-text("Digest")').first().click();
  await page.waitForTimeout(300);
  assert.ok(await page.getByText('Regenerated 3 stories from the resolved ambiguity.').first().isVisible());
  assert.ok(await page.getByText('Estimate points on s7').first().isVisible(), 'next steps shown');

  // opening clears the unread badge
  await page.waitForTimeout(200);
  assert.equal(await page.locator('button:has-text("Digest") span.mono').count(), 0, 'badge cleared after opening');
});

test('Tests workspace renders on a non-demo project (regression: no hardcoded cell id)', async (t) => {
  // a project whose components are NOT the billing-service demo ids — used to crash on `selC.name`
  const app = await openApp({
    project: { name: 'Reg', repo: 'o/reg', branch: 'main', version: 'v1' },
    tests: {
      types: ['Unit', 'Integration'],
      components: [{ id: 'widget', name: 'Widget' }, { id: 'gizmo', name: 'Gizmo' }],
      cells: { 'widget-0': { status: 'pass', code: "it('works', ()=>{})" }, 'gizmo-1': { status: 'none', code: '' } },
    },
  });
  t.after(app.cleanup);
  const { page } = app;
  await page.evaluate(() => localStorage.setItem('aidlc-ws', 'tests'));
  await page.reload({ waitUntil: 'networkidle' });
  await assert.doesNotReject(page.waitForSelector('h1', { timeout: 4000 }), 'Tests renders without crashing');
  assert.deepEqual(page.__errors, [], 'no page errors on the Tests workspace');
  assert.ok(await page.getByText('Widget').first().isVisible(), 'real component shown');
});

test('Stories outline: readiness + human marker, inline criteria editing', async (t) => {
  const app = await openApp({
    project: { name: 'Reg', repo: 'o/reg', branch: 'main', version: 'v1' },
    stories: {
      intent: 'Ship it.',
      epics: [{ id: 'e1', title: 'Core', color: 'var(--blue)' }],
      cards: [
        { id: 's1', epic: 'e1', title: 'Done one', criteria: ['Given a\nWhen b\nThen c'], human: false, done: true, points: 2 },
        { id: 's2', epic: 'e1', title: 'Human one', criteria: [], human: true, done: false, points: 1 },
      ],
    },
  });
  t.after(app.cleanup);
  const { page } = app;
  await page.evaluate(() => localStorage.setItem('aidlc-ws', 'stories'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('h1');
  assert.equal(await page.getByRole('button', { name: /Backlog|In Progress|This Sprint/ }).count(), 0, 'no kanban columns');
  assert.ok(await page.getByText('done').first().isVisible(), 'readiness pill shown');
  assert.ok(await page.getByText('human').first().isVisible(), 'human marker shown');
  // expanding a story reveals inline criteria editing
  await page.getByText('Done one').first().click();
  await page.waitForTimeout(200);
  assert.ok(await page.getByText('Acceptance criteria').first().isVisible(), 'inline editor opens');
  assert.deepEqual(page.__errors, []);
});

test('boots from a real (non-demo) seeded project', async (t) => {
  const app = await openApp({
    project: { name: 'AcmeWidgets', repo: 'acme/widgets', branch: 'main', version: 'v9' },
    clarify: { requirement: [{ t: 'Build the widget pipeline.' }], questions: [], notes: [] },
  });
  t.after(app.cleanup);
  const { page } = app;
  await assert.doesNotReject(page.waitForSelector('text=AcmeWidgets', { timeout: 3000 }),
    'rail shows the seeded project name, not the demo billing-service');
});
