'use strict';

const { JsonStore } = require('./store/json-store');
const { handleMessage } = require('./core/message-handler');
const { DEFAULT_CONFIG } = require('./config');

function createBot({ sock, dataFile, logger = console } = {}) {
  if (!sock || typeof sock.sendMessage !== 'function') {
    throw new TypeError('createBot يحتاج sock موجودًا ويوفّر sendMessage');
  }

  const store = new JsonStore(dataFile);
  store.init();

  return {
    store,
    async handleMessage(message) {
      try {
        return await handleMessage({ sock, message, store, logger, config: DEFAULT_CONFIG });
      } catch (error) {
        logger.error('[ESKO JOKER] خطأ في معالجة رسالة:', error);
        return null;
      }
    }
  };
}

module.exports = { createBot };
