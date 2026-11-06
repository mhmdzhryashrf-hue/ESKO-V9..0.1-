/* ESKO local bot-draft validation. It never handles credentials or connects to a platform. */
(function attachBotDraftValidation(scope) {
  'use strict';
  const NAME_PATTERN = /^[\p{L}\d _-]{2,50}$/u;
  const COMMAND_PATTERN = /^\/[a-z][a-z0-9_]{1,31}$/i;

  function validateName(value) {
    return NAME_PATTERN.test(String(value ?? '').trim());
  }

  function parseCommands(value) {
    const lines = String(value ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 1 || lines.length > 100) {
      throw new Error('يجب إدخال أمر واحد على الأقل وبحد أقصى 100 أمر.');
    }
    const seen = new Set();
    return lines.map((line) => {
      const match = line.match(/^(\/[a-z][a-z0-9_]{1,31})\s*\|\s*(.{1,180})$/i);
      if (!match) throw new Error('صيغة الأمر غير صحيحة. استخدم: /command | وصف الأمر.');
      const name = match[1].toLowerCase();
      if (seen.has(name)) throw new Error(`الأمر ${name} مكرر.`);
      seen.add(name);
      return { name, description: match[2].trim().replace(/\s+/g, ' ').slice(0, 180) };
    });
  }

  scope.ESKOBotDraftValidation = Object.freeze({
    MAX_COMMANDS: 100,
    validateName,
    parseCommands
  });
})(window);
