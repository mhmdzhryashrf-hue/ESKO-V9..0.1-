import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'esko-audit-regression-'));
let output = '';
const child = spawn(process.execPath, [path.join(root, 'backend/server.mjs')], {
  env: { ...process.env, NODE_ENV: 'production', ESKO_HOST: '127.0.0.1', ESKO_PORT: '0', ESKO_DATA_DIR: dataDir, ESKO_WEB_DIR: 'docs/v501' },
  stdio: ['ignore', 'pipe', 'pipe']
});
child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 8000) {
    const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
    if (match) return `http://127.0.0.1:${match[1]}`;
    if (child.exitCode !== null) throw new Error(`Server stopped: ${output}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Server did not start: ${output}`);
}
async function request(base, route, { method = 'GET', body, cookie, origin } = {}) {
  const response = await fetch(base + route, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...(origin ? { origin } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload, setCookie: response.headers.get('set-cookie') || '' };
}
try {
  const base = await waitForServer();
  const host = new URL(base).host;
  const origin = `https://${host}`;
  const home = await fetch(base + '/');
  const html = await home.text();
  assert.equal(home.status, 200);
  assert.ok(html.includes('V5.0.1') || html.includes('esko-titan-update.js'));
  assert.match(home.headers.get('content-security-policy') || '', /default-src/);
  const titan = await fetch(base + '/esko-titan-update.js');
  assert.equal(titan.status, 200);
  assert.match(titan.headers.get('content-type') || '', /javascript/);
  const audio = await fetch(base + '/assets/esko-interface-theme.mp3');
  assert.equal(audio.status, 200);
  assert.match(audio.headers.get('content-type') || '', /audio\/mpeg/);

  const createBody = { displayName: 'Race Check', username: 'race_user', age: 16, password: 'RacePassword123' };
  const pair = await Promise.all([
    request(base, '/api/account/register', { method: 'POST', body: createBody, origin }),
    request(base, '/api/account/register', { method: 'POST', body: createBody, origin })
  ]);
  assert.deepEqual(pair.map(x => x.response.status).sort(), [201, 409], 'concurrent duplicate usernames must produce one account only');
  const success = pair.find(x => x.response.status === 201);
  assert.ok(success?.payload?.recoveryCode);
  assert.match(success.setCookie, /; Secure(?:;|$)/, 'production session cookie must be Secure');
  const token = success.setCookie.split(';')[0];
  const me = await request(base, '/api/account/me', { cookie: token });
  assert.equal(me.response.status, 200);
  const logout = await request(base, '/api/account/logout', { method: 'POST', cookie: token, origin });
  assert.equal(logout.response.status, 200);
  assert.match(logout.setCookie, /Max-Age=0/);
  assert.match(logout.setCookie, /; Secure(?:;|$)/, 'production logout must clear Secure cookie correctly');
  const afterLogout = await request(base, '/api/account/me', { cookie: token });
  assert.equal(afterLogout.response.status, 401);
  console.log('PASS: configurable static root, Titan asset delivery, MP3 MIME, production secure session/logout cookies, and concurrent duplicate-registration race protection.');
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => setTimeout(resolve, 150));
  await rm(dataDir, { recursive: true, force: true });
}
