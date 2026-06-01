/* ui.test.mjs — Playwright UI tests for the AI-DLC Workspace.
   Run: node --test  (from scripts/aidlc-server). Needs Go + a Playwright Chromium. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { openApp, closeBrowser, readWorkspaceDoc, readDigests, appendAgentDigest } from './helpers.mjs';

after(closeBrowser);

const WORKSPACES = ['Clarification', 'Stories', 'Architecture', 'Infrastructure', 'Tests', 'Steering'];
const POLL_WAIT = 3600; // digest panel polls every 3s

test('renders all six workspaces with headings, no console errors', async (t) => {
  const app = await openApp();
  t.after(app.cleanup);
  const { page } = app;

  // nav = Overview + 6 workspaces + Documents
  assert.equal(await page.locator('nav button').count(), 8, 'overview + six workspaces + documents');
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
  assert.equal(await page.getByRole('button', { name: /This Sprint|In Progress/ }).count(), 0, 'no kanban columns');
  assert.ok(await page.getByText('done').first().isVisible(), 'readiness pill shown');
  assert.ok(await page.getByText('human').first().isVisible(), 'human marker shown');
  // expanding a story reveals inline criteria editing
  await page.getByText('Done one').first().click();
  await page.waitForTimeout(200);
  assert.ok(await page.getByText('Acceptance criteria').first().isVisible(), 'inline editor opens');
  assert.deepEqual(page.__errors, []);
});

test('Overview reflects aidlc-state.md; Documents lists & renders markdown', async (t) => {
  const app = await openApp();
  t.after(app.cleanup);
  const root = dirname(app.ws); // aidlc-docs/
  writeFileSync(join(root, 'aidlc-state.md'),
    '# AI-DLC State Tracking\n\n## Project Information\n- **Project Type**: Greenfield\n\n## Project Configuration\n- **Documentation Format**: html\n\n## Stage Progress\n- [x] INCEPTION - Requirements Analysis\n- [ ] CONSTRUCTION - Code Generation (SKIP)\n');
  writeFileSync(join(root, 'audit.md'), '# Audit Log\n\nA recorded entry.\n');
  const { page } = app;
  await page.reload({ waitUntil: 'networkidle' }); // re-fetch /api/project with the state file present

  // Overview
  await page.locator('nav button', { hasText: 'Overview' }).first().click();
  await page.waitForTimeout(400);
  assert.ok(await page.getByText('Requirements Analysis').first().isVisible(), 'stage from state shown');
  assert.ok(await page.getByText('Greenfield').first().isVisible(), 'project info shown');

  // Documents — list + render
  await page.locator('nav button', { hasText: 'Documents' }).first().click();
  await page.waitForTimeout(400);
  await page.getByText('Audit Log').first().click();
  await page.waitForTimeout(400);
  assert.ok(await page.locator('.doc-md h1').first().isVisible(), 'markdown rendered (heading present)');
  assert.deepEqual(page.__errors, [], 'no errors on Overview/Documents');
});

test('stories Personas + Map tabs: edit persona, toggle RBAC, persist', async (t) => {
  const app = await openApp({
    project: { name: 'Reg', repo: 'o/reg', branch: 'main', version: 'v1' },
    stories: {
      intent: 'Ship.', epics: [{ id: 'e1', title: 'Core', color: 'var(--blue)' }],
      personas: [{ id: 'p1', name: 'Admin', role: 'admin', goals: 'run it', frustrations: 'noise' }],
      cards: [{ id: 's1', epic: 'e1', title: 'Do X', criteria: [], human: false, done: false, roles: [] }],
    },
  });
  t.after(app.cleanup);
  const { page, ws } = app;
  await page.locator('nav button', { hasText: 'Stories' }).first().click();
  await page.waitForTimeout(200);

  // Personas tab renders the seeded persona
  await page.getByRole('button', { name: 'Personas' }).first().click();
  await page.waitForTimeout(300);
  assert.ok(await page.getByText('Goals').first().isVisible(), 'persona fields shown');

  // Map tab: toggle the admin cell for story s1, save → roles persisted
  await page.getByRole('button', { name: 'Map' }).first().click();
  await page.waitForTimeout(300);
  assert.ok(await page.getByText('Do X').first().isVisible(), 'story row in matrix');
  // the matrix has one toggle button per (story,role); click the role cell
  const cell = page.locator('button[title*="admin"]').first();
  await cell.click();
  await page.getByRole('button', { name: /^Save$/ }).first().click();
  await page.waitForSelector('.toast', { timeout: 4000 });
  const sd = readWorkspaceDoc(ws, 'stories');
  assert.deepEqual(sd.cards[0].roles, ['admin'], 'RBAC role persisted');
  assert.deepEqual(page.__errors, []);
});

test('tests Summary tab: build status + coverage + ready-for-ops persists', async (t) => {
  const app = await openApp({
    project: { name: 'Reg', repo: 'o/reg', branch: 'main', version: 'v1' },
    tests: {
      types: ['Unit'], components: [{ id: 'a', name: 'A' }], cells: { 'a-0': { status: 'pass', code: 'x' } },
      summary: { builds: [{ component: 'A', build: 'success', coverage: 80 }], businessRulesVerified: ['BR-1'], readyForOperations: false },
    },
  });
  t.after(app.cleanup);
  const { page, ws } = app;
  await page.locator('nav button', { hasText: 'Tests' }).first().click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Summary' }).first().click();
  await page.waitForTimeout(300);
  assert.ok(await page.getByText('Build status').first().isVisible(), 'summary shown');
  assert.ok(await page.getByText('Ready for Operations').first().isVisible(), 'ready toggle shown');
  // flip ready-for-ops and save
  await page.locator('.switch').last().click();
  await page.getByRole('button', { name: /^Save$/ }).first().click();
  await page.waitForSelector('.toast', { timeout: 4000 });
  const td = readWorkspaceDoc(ws, 'tests');
  assert.equal(td.summary.readyForOperations, true, 'ready-for-ops persisted');
  assert.deepEqual(page.__errors, []);
});

test('arch Units tab: edit a unit + story map, persist; methods on a node', async (t) => {
  const app = await openApp({
    project: { name: 'Reg', repo: 'o/reg', branch: 'main', version: 'v1' },
    arch: {
      nodes: [{ id: 'api', type: 'api', label: 'API', x: 80, y: 70, fields: [], methods: [] }],
      edges: [],
      units: [{ id: 'u1', name: 'Core', responsibilities: '', workload: 'service', datastore: 'pg', port: '8080', buildOrder: 1, components: ['api'], stories: ['US-001'] }],
    },
  });
  t.after(app.cleanup);
  const { page, ws } = app;
  await page.locator('nav button', { hasText: 'Architecture' }).first().click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Units' }).first().click();
  await page.waitForTimeout(300);
  assert.ok(await page.getByText('Units of work').first().isVisible(), 'units view shown');
  // edit the stories map and save → persists
  const storiesInput = page.getByPlaceholder('US-AGG-001, US-AGG-002').first();
  await storiesInput.fill('US-001, US-002');
  await page.getByRole('button', { name: /^Save$/ }).first().click();
  await page.waitForSelector('.toast', { timeout: 4000 });
  const a = readWorkspaceDoc(ws, 'arch');
  assert.deepEqual(a.units[0].stories, ['US-001', 'US-002'], 'story→unit map persisted');
  assert.deepEqual(page.__errors, []);
});

test('clarify Requirements tab: FR/NFR/decisions/scope edit + persist', async (t) => {
  const app = await openApp({
    project: { name: 'Reg', repo: 'o/reg', branch: 'main', version: 'v1' },
    clarify: {
      requirement: [{ t: 'Build it.' }], questions: [], notes: [],
      functional: [{ id: 'FR-001', text: 'Do the thing' }],
      nfrs: [{ category: 'Performance', requirement: 'latency', target: '<100ms' }],
      decisions: [{ decision: 'DB', choice: 'Postgres', rationale: 'relational' }],
      scope: { in: ['core'], out: ['nice-to-have'] },
    },
  });
  t.after(app.cleanup);
  const { page, ws } = app;
  // default view is Clarify; switch to Requirements
  await page.getByRole('button', { name: 'Requirements' }).first().click();
  await page.waitForTimeout(300);
  assert.ok(await page.getByText('Functional requirements').first().isVisible(), 'FR section shown');
  assert.ok(await page.getByText('In scope').first().isVisible(), 'scope shown');
  // edit the FR text (targeted by its placeholder) and Save → persists to clarify.json
  const fr = page.getByPlaceholder('The system must…').first();
  await fr.fill('Do the thing well');
  await page.getByRole('button', { name: /^Save$/ }).first().click();
  await page.waitForSelector('.toast', { timeout: 4000 });
  const cl = readWorkspaceDoc(ws, 'clarify');
  assert.equal(cl.functional[0].text, 'Do the thing well', 'requirements persisted');
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
