'use strict';

const path = require('node:path');

const CONFIG = Object.freeze({
  prefix: '!',
  dataFile: path.join(__dirname, 'data', 'esko-addon.json'),
  antiSpam: { enabled: true, maxMessages: 7, windowMs: 8000, cooldownMs: 15000 },
  defaults: {
    links: true,
    mentions: true,
    spam: true,
    badWords: false,
    deleteViolations: false,
    kickAfterWarnings: false,
    warningsBeforeKick: 3,
    welcome: true
  },
  maxReplyLength: 700,
  maxWarningsStored: 50
});

module.exports = { CONFIG };
