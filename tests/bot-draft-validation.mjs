import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/bot-draft-validation.js', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { timeout: 1000 });
const validator = sandbox.window.ESKOBotDraftValidation;
assert.equal(validator.MAX_COMMANDS, 100);
assert.equal(validator.validateName('ESKO Helper'), true);
assert.equal(validator.validateName('x'), false);
assert.deepEqual(JSON.parse(JSON.stringify(validator.parseCommands('/start | بدء\n/help | مساعدة'))), [
  { name: '/start', description: 'بدء' },
  { name: '/help', description: 'مساعدة' }
]);
assert.throws(() => validator.parseCommands(''), /100/);
assert.throws(() => validator.parseCommands('/start'), /صيغة/);
assert.throws(() => validator.parseCommands('/start | واحد\n/start | اثنان'), /مكرر/);
assert.throws(() => validator.parseCommands(Array.from({ length: 101 }, (_, i) => `/c${i + 1} | وصف`).join('\n')), /100/);
console.log('PASS: bot draft validation, Unicode name bounds, command syntax, duplicate detection, and 100-command maximum');
