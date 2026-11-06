'use strict';

const { isUrl } = require('./utils');

// قائمة أولية بسيطة؛ عدّلها بحذر لتقليل النتائج الخاطئة.
const BAD_WORDS = ['لفظ_مسيء_مثال_1', 'لفظ_مسيء_مثال_2'];

function detectViolation(text, settings) {
  const normalized = String(text || '').toLowerCase();
  if (settings.blockLinks && isUrl(normalized)) {
    return { type: 'link', reason: 'إرسال رابط غير مسموح' };
  }
  if (settings.badWords && BAD_WORDS.some(word => word && normalized.includes(word.toLowerCase()))) {
    return { type: 'language', reason: 'مخالفة فلتر الكلمات' };
  }
  return null;
}

function checkSpam(store, jid, sender, config) {
  if (!config.antiSpam.enabled) return false;
  const now = Date.now();
  const key = `${jid}:${sender}`;
  const all = store.data.spam;
  const record = all[key] || { times: [], mutedUntil: 0 };
  if (record.mutedUntil > now) return true;

  record.times = record.times.filter(t => now - t <= config.antiSpam.windowMs);
  record.times.push(now);
  if (record.times.length > config.antiSpam.maxMessages) {
    record.mutedUntil = now + config.antiSpam.cooldownMs;
    record.times = [];
    all[key] = record;
    store.save();
    return true;
  }
  all[key] = record;
  // حفظ دوري بسيط مع كل رسالة لضمان عدم ضياع حالة الحد من الإغراق.
  store.save();
  return false;
}

module.exports = { detectViolation, checkSpam, BAD_WORDS };
