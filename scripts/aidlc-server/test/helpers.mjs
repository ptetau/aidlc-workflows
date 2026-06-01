/* helpers.mjs — test harness: locate Chromium, build+launch aidlc-server, manage temp workspaces. */
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, existsSync, readdirSync, writeFileSync, mkdirSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir, homedir, platform } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const SERVER_DIR = dirname(fileURLToPath(import.meta.url)).replace(/[/\\]test$/, '');
const EXE = join(SERVER_DIR, platform() === 'win32' ? 'aidlc-server.exe' : 'aidlc-server');

/* Find a Chromium executable: env override, else the Playwright browser cache. */
export function findChromium() {
  if (process.env.AIDLC_CHROMIUM && existsSync(process.env.AIDLC_CHROMIUM)) return process.env.AIDLC_CHROMIUM;
  const roots = [
    join(homedir(), 'AppData', 'Local', 'ms-playwright'),                 // Windows
    join(homedir(), 'Library', 'Caches', 'ms-playwright'),                // macOS
    join(homedir(), '.cache', 'ms-playwright'),                           // Linux
  ].filter(existsSync);
  const rels = [
    ['chrome-win64', 'chrome.exe'], ['chrome-win', 'chrome.exe'],
    ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
    ['chrome-linux', 'chrome'],
  ];
  for (const root of roots) {
    const builds = readdirSync(root).filter(d => d.startsWith('chromium-')).sort().reverse();
    for (const b of builds) for (const rel of rels) {
      const p = join(root, b, ...rel);
      if (existsSync(p)) return p;
    }
  }
  throw new Error('No Chromium found. Set AIDLC_CHROMIUM or run: npx playwright install chromium');
}

/* Ensure the Go binary is built (assets are committed, so `go build` alone works). */
export function ensureBuilt() {
  if (existsSync(EXE)) return;
  execFileSync('go', ['build', '-o', EXE, '.'], { cwd: SERVER_DIR, stdio: 'inherit' });
}

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.once('error', rej);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
  });
}

/* Create a temp workspace dir. If `seedFiles` is given, pre-write those JSON docs (+ matching
   .snapshot baselines) so the server serves real content instead of its built-in demo seed. */
export function makeWorkspace(seedFiles) {
  const root = mkdtempSync(join(tmpdir(), 'aidlc-test-'));
  const ws = join(root, 'aidlc-docs', 'workspace');
  mkdirSync(join(ws, '.snapshot'), { recursive: true });
  if (seedFiles) {
    for (const [name, obj] of Object.entries(seedFiles)) {
      const body = JSON.stringify(obj, null, 2) + '\n';
      writeFileSync(join(ws, name + '.json'), body);
      writeFileSync(join(ws, '.snapshot', name + '.json'), body);
    }
  }
  return ws;
}

export function readWorkspaceDoc(ws, name) {
  return JSON.parse(readFileSync(join(ws, name + '.json'), 'utf8'));
}
export function readDigests(ws) {
  const p = join(ws, 'digests.ndjson');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
}
export function appendAgentDigest(ws, entry) {
  const full = { id: String(Date.now()) + '-agent', ts: new Date().toISOString(), actor: 'agent', ...entry };
  writeFileSync(join(ws, 'digests.ndjson'), JSON.stringify(full) + '\n', { flag: 'a' });
}

/* Launch the server on a free port against `ws`; resolves once /api/state answers. */
export async function startServer(ws) {
  ensureBuilt();
  const port = await freePort();
  const proc = spawn(EXE, ['-docs', ws, '-port', String(port), '-no-open'], { stdio: 'ignore' });
  const url = `http://localhost:${port}`;
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try { const r = await fetch(url + '/api/state'); if (r.ok) return { url, ws, stop: () => proc.kill() }; }
    catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 120));
  }
  proc.kill();
  throw new Error('server did not start in time');
}

let _browser = null;
export async function getBrowser() {
  if (!_browser) _browser = await chromium.launch({ executablePath: findChromium() });
  return _browser;
}
export async function closeBrowser() { if (_browser) { await _browser.close(); _browser = null; } }

/* Open a fresh server + page; collects console/page errors on `page.__errors`. */
export async function openApp(seedFiles) {
  const ws = makeWorkspace(seedFiles);
  const server = await startServer(ws);
  const ctx = await (await getBrowser()).newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.__errors = [];
  page.on('console', m => { if (m.type() === 'error') page.__errors.push(m.text()); });
  page.on('pageerror', e => page.__errors.push('pageerror: ' + e.message));
  await page.goto(server.url, { waitUntil: 'networkidle' });
  await page.waitForSelector('nav button', { timeout: 8000 });
  return { page, ctx, server, ws, cleanup: async () => { await ctx.close(); server.stop(); } };
}
