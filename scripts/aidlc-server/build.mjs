/* build.mjs — compile the web UI into self-contained, embeddable assets.
 *
 * The design's .jsx files share ONE global lexical scope (no import/export). So we
 * CONCATENATE them in load order and run esbuild's `transform` (NOT `build`/bundle)
 * with classic JSX — exactly the semantics the browser had via <script type="text/babel">.
 * React/ReactDOM stay external globals (vendored UMD <script> tags load before app.js).
 */
import { transform } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile, readdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, 'web-src');
const VENDOR = join(here, 'vendor');
const OUT = join(here, 'assets');

// concatenation order MUST match the old HTML: primitives → workspaces → shell → entry
const ORDER = [
  'shared.jsx', 'ws-clarify.jsx', 'ws-stories.jsx', 'ws-architecture.jsx',
  'ws-infra.jsx', 'ws-tests.jsx', 'ws-steering.jsx', 'shell.jsx', 'entry.jsx',
];

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, 'fonts'), { recursive: true });

  // 1. concat sources (separators help map runtime errors back to a file)
  let combined = '';
  for (const f of ORDER) {
    combined += `\n/* ==== ${f} ==== */\n` + await readFile(join(SRC, f), 'utf8');
  }

  // 2. transform JSX → JS (classic runtime, no bundling, minified)
  const res = await transform(combined, {
    loader: 'jsx',
    jsx: 'transform',          // React.createElement — NOT 'automatic'
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    minify: true,
    legalComments: 'none',
  });
  await writeFile(join(OUT, 'app.js'), res.code, 'utf8');

  // 3. copy static assets into the embed dir
  await copyFile(join(SRC, 'styles.css'), join(OUT, 'styles.css'));
  await copyFile(join(SRC, 'index.html'), join(OUT, 'index.html'));
  await copyFile(join(VENDOR, 'react.production.min.js'), join(OUT, 'react.production.min.js'));
  await copyFile(join(VENDOR, 'react-dom.production.min.js'), join(OUT, 'react-dom.production.min.js'));
  for (const f of await readdir(join(VENDOR, 'fonts'))) {
    await copyFile(join(VENDOR, 'fonts', f), join(OUT, 'fonts', f));
  }

  console.log(`built assets/app.js (${(res.code.length / 1024).toFixed(1)} KB) + static assets`);
}

main().catch(e => { console.error(e); process.exit(1); });
