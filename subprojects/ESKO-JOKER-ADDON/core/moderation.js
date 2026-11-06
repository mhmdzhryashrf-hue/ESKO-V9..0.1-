'use strict';

const { isUrl, isMassMention } = require('./utils');

const BAD_WORDS = []; // أضف الكلمات التي تريد منعها بنفسك لتقليل الحظر الخاطئ.
const spamMemory = new Map();

function violationFor(text, message, settings) {
  if (settings.links && isUrl(text)) return { type: 'links', reason: 'إرسال رابط' };
  if (settings.mentions && isMassMention(text, message)) return { type: 'mentions', reason: 'منشن جماعي' };
  if (settings.badWords && BAD_WORDS.some(w => w && text.toLowerCase().includes(w.toLowerCase()))) {
    return { type: 'badWords', reason: 'كلمات ممنوعة' };
  }
  return null;
}

function spamCheck(jid, sender, settings, cfg) {
  if (!settings.spam || !cfg.antiSpam.enabled) return false;
  const now = Date.now(), key = `${jid}:${sender}`;
  const row = spamMemory.get(key) || { times: [], blockedUntil: 0 };
  if (row.blockedUntil > now) return true;
  row.times = row.times.filter(t => now - t < cfg.antiSpam.windowMs);
  row.times.push(now);
  if (row.times.length > cfg.antiSpam.maxMessages) {
    row.blockedUntil = now + cfg.antiSpam.cooldownMs;
    row.times = [];
    spamMemory.set(key, row);
    return true;
  }
  spamMemory.set(key, row);
  return false;
}

async function isAdmin(sock, jid, sender) {
  try {
    const meta = await sock.groupMetadata(jid);
    const p = (meta.participants || []).find(x => x.id === sender || x.jid === sender);
    return Boolean(p && (p.admin || p.isAdmin || p.isSuperAdmin));
  } catch { return false; }
}

async function applyViolation({ sock, message, store, jid, sender, violation, cfg, logger }) {
  const g = store.group(jid);
  const count = store.addWarning(jid, sender, violation.reason, cfg.maxWarningsStored);
  await sock.sendMessage(jid, {
    text: `🛡️ *حماية ESKO JOKER*\nالمخالفة: ${violation.reason}\nالتحذير: ${count}/${g.settings.warningsBeforeKick}\nالرجاء الالتزام بقوانين المجموعة.`,
    mentions: [sender]
  });
  if (g.settings.deleteViolations && message.key?.id) {
    try { await sock.sendMessage(jid, { delete: message.key }); }
    catch (e) { logger.warn('[ESKO] فشل حذف الرسالة؛ تحقق من صلاحيات البوت:', e.message); }
  }
  if (g.settings.kickAfterWarnings && count >= Number(g.settings.warningsBeforeKick || 3)) {
    try {
      if (await isAdmin(sock, jid, sender)) {
        await sock.sendMessage(jid, { text: '⚠️ لم يتم طرد مشرف؛ لا يطبّق البوت العقوبة على المشرفين.' });
      } else {
        await sock.groupParticipantsUpdate(jid, [sender], 'remove');
        store.clearWarnings(jid, sender);
        await sock.sendMessage(jid, { text: `🚪 تم إخراج العضو بعد ${count} تحذيرات متراكمة.` });
      }
    } catch (e) {
      logger.warn('[ESKO] تعذر الطرد؛ تحقق من أن البوت مشرف:', e.message);
      await sock.sendMessage(jid, { text: '⚠️ تعذر تنفيذ الطرد. تأكد أن البوت مشرف وأن المكتبة تدعم العملية.' });
    }
  }
  return count;
}

module.exports = { BAD_WORDS, violationFor, spamCheck, isAdmin, applyViolation };
