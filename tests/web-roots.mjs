import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}
async function startRoot(webDir) {
  const port = await freePort();
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'esko-web-root-'));
  const child = spawn(process.execPath, ['backend/server.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, ESKO_HOST: '127.0.0.1', ESKO_PORT: String(port), ESKO_WEB_DIR: webDir, ESKO_DATA_DIR: dataDir },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) { ready = true; break; }
    } catch {}
    if (child.exitCode !== null) break;
    await wait(100);
  }
  if (!ready) {
    child.kill('SIGTERM');
    await rm(dataDir, { recursive: true, force: true });
    throw new Error(`${webDir} server did not start: ${stderr}`);
  }
  return { base, child, dataDir };
}

const cases = [
  { root: 'public', title: 'ESKO', addon: '/esko-titan-update.js', key: 'data-hub' },
  { root: 'docs', title: 'ESKO', addon: '/esko-titan-update.js', key: 'data-hub' },
  { root: 'docs/v501', title: 'ESKO', addon: '/esko-titan-update.js', key: 'data-hub' }
];
const opened = [];
try {
  for (const item of cases) {
    const server = await startRoot(item.root);
    opened.push(server);
    const page = await fetch(`${server.base}/`);
    assert.equal(page.status, 200, `${item.root} index status`);
    const html = await page.text();
    assert.match(html, /<html/i, `${item.root} contains HTML`);
    assert.match(html, /esko-titan-update\.js/, `${item.root} loads Titan add-on`);
    assert.match(html, /bot-draft-validation\.js/, `${item.root} loads draft validator`);
    assert.match(html, /six-sections\.js/, `${item.root} loads six-section navigation`);
    for (const [section, label] of [['home','البيت'],['store','المتجر الإلكتروني'],['repositories','المستودعات'],['assistant','المساعد'],['sections','الأقسام'],['account','الحساب']]) {
      assert.match(html, new RegExp(`data-section=\"${section}\"`), `${item.root} has ${label} navigation item`);
    }
    const sixSectionScript = await fetch(`${server.base}/six-sections.js`);
    assert.equal(sixSectionScript.status, 200, `${item.root} serves six-section controller`);
    assert.match(await sixSectionScript.text(), /ESKO_API_BASE/, `${item.root} respects configured API base`);
    const validator = await fetch(`${server.base}/bot-draft-validation.js`);
    assert.equal(validator.status, 200, `${item.root} bot draft validator status`);
    assert.match(await validator.text(), /MAX_COMMANDS: 100/, `${item.root} exposes the bounded draft validator`);
    const addon = await fetch(`${server.base}${item.addon}`);
    assert.equal(addon.status, 200, `${item.root} Titan asset status`);
    const js = await addon.text();
    assert.match(js, /البيت/);
    assert.match(js, /البوتات/);
    assert.match(js, /المستودعات/);
    assert.match(js, /المتجر الإلكتروني/);
    assert.match(js, /المساعد/);
    assert.match(js, /الحساب/);
    assert.match(js, /data-hub=\"assistant\"/, `${item.root} exposes the assistant shortcut`);
    assert.match(js, /aria-disabled=\"true\"/, `${item.root} keeps Books as a disabled work-in-progress item`);
    assert.match(js, /الكتب/);
    const escaped = await fetch(`${server.base}/..%2fbackend%2fserver.mjs`);
    assert.ok([400, 403, 404].includes(escaped.status), `${item.root} blocks traversal`);
    console.log(`PASS ${item.root}: index, six-section add-on delivery, traversal guard`);
  }
} finally {
  for (const server of opened) {
    server.child.kill('SIGTERM');
    await rm(server.dataDir, { recursive: true, force: true });
  }
}
