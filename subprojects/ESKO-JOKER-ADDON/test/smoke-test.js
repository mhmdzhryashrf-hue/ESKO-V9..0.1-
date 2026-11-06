'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../store');
const { violationFor, spamCheck } = require('../core/moderation');
const { createGame, answerMatches } = require('../core/games');
const { CONFIG } = require('../config');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'esko-addon-'));
const store = new Store(path.join(dir, 'data.json')).init();
const g = store.group('g@g.us');

assert.equal(violationFor('https://example.com', {}, { ...g.settings, links: true }).type, 'links');
assert.equal(violationFor('hello', {}, g.settings), null);
const game = createGame('riddle');
assert.ok(game.question && game.answers.length);
assert.equal(answerMatches({ answers: ['القاهرة'] }, 'القاهرة'), true);
assert.equal(CONFIG.defaults.deleteViolations, false, 'message deletion must be disabled by default');
assert.equal(CONFIG.defaults.kickAfterWarnings, false, 'automatic removal must be disabled by default');
store.addPoints('g@g.us', 'u@s.whatsapp.net', 3);
assert.equal(store.user('g@g.us', 'u@s.whatsapp.net').points, 3);
assert.ok(fs.existsSync(path.join(dir, 'data.json')));
fs.rmSync(dir, { recursive: true, force: true });
console.log('✅ اختبارات الإضافة الأساسية نجحت');
