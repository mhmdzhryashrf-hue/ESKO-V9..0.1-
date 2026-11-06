'use strict';

const path = require('node:path');
const { CONFIG } = require('./config');
const { Store } = require('./store');
const { createProcessor } = require('./core/processor');

function createEskoAddon({ sock, dataFile = CONFIG.dataFile, logger = console } = {}) {
  if (!sock || typeof sock.sendMessage !== 'function') {
    throw new TypeError('الإضافة تحتاج عميل واتساب قائمًا يوفّر sendMessage');
  }
  const store = new Store(dataFile || path.join(__dirname, 'data', 'esko-addon.json')).init();
  const processor = createProcessor({ sock, store, cfg: CONFIG, logger });
  return { store, ...processor };
}

module.exports = { createEskoAddon };
