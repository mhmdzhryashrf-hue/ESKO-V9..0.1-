'use strict';

const path = require('node:path');

const DEFAULT_CONFIG = Object.freeze({
  prefix: '!',
  dataFile: path.join(__dirname, '..', '..', 'data', 'esko-data.json'),
  antiSpam: {
    enabled: true,
    maxMessages: 6,
    windowMs: 8000,
    cooldownMs: 12000
  },
  moderation: {
    welcome: true,
    blockLinks: false,
    badWords: true,
    deleteViolations: false
  },
  maxCustomReplyLength: 500,
  maxWarningsBeforeNotice: 3
});

module.exports = { DEFAULT_CONFIG };
