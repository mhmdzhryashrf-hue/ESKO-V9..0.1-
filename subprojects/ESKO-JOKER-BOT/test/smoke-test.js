'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { JsonStore } = require('../src/store/json-store');
const { detectViolation } = require('../src/core/moderation');
const { getText, isGroupJid } = require('../src/core/utils');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'esko-joker-'));
const file = path.join(temp, 'data.json');
const store = new JsonStore(file).init();

assert.equal(isGroupJid('123@g.us'), true);
assert.equal(isGroupJid('123@s.whatsapp.net'), false);
assert.equal(getText({ message: { conversation: 'اختبار' } }), 'اختبار');
assert.equal(detectViolation('https://example.com', { blockLinks: true, badWords: false }).type, 'link');
assert.equal(detectViolation('نص عادي', { blockLinks: true, badWords: true }), null);

store.addPoints('group@g.us', 'user@s.whatsapp.net', 3);
assert.equal(store.user('group@g.us', 'user@s.whatsapp.net').points, 3);
assert.ok(fs.existsSync(file));

console.log('✅ نجحت اختبارات ESKO JOKER BOT الأساسية');
fs.rmSync(temp, { recursive: true, force: true });
