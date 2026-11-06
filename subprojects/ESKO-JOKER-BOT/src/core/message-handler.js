'use strict';

const { getText, getSender, getJid, isGroupJid } = require('./utils');
const { detectViolation, checkSpam } = require('./moderation');
const { handleCommand } = require('./commands');

async function handleMessage({ sock, message, store, logger, config }) {
  if (!message?.message || message.key?.fromMe) return null;
  const jid = getJid(message);
  const sender = getSender(message);
  const text = getText(message).trim();
  if (!jid || !text) return null;

  const group = store.group(jid);

  // إجابات الألعاب: نقاط فقط عند الإجابة الصحيحة خلال 10 دقائق.
  if (isGroupJid(jid) && !text.startsWith(config.prefix)) {
    for (const field of ['activeRiddle', 'activeQuestion']) {
      const active = group[field];
      if (active && Date.now() - active.at < 10 * 60 * 1000 && text.toLowerCase() === active.answer) {
        const points = field === 'activeRiddle' ? 3 : 2;
        delete group[field];
        const user = store.addPoints(jid, sender, points);
        await sock.sendMessage(jid, { text: `🎉 إجابة صحيحة يا @${sender.split('@')[0]}!\n+${points} نقاط\nرصيدك: ${user.points}`, mentions: [sender] });
        return true;
      }
    }
  }

  if (isGroupJid(jid)) {
    const spam = checkSpam(store, jid, sender, config);
    if (spam) {
      await sock.sendMessage(jid, { text: `🛡️ @${sender.split('@')[0]} بالراحة شوية، تم رصد رسائل سريعة متكررة.`, mentions: [sender] });
      return true;
    }

    const violation = detectViolation(text, group.settings);
    if (violation) {
      const count = store.warn(jid, sender, violation.reason);
      await sock.sendMessage(jid, { text: `⚠️ تنبيه حماية\nالسبب: ${violation.reason}\nالتحذير رقم: ${count}\nيرجى الالتزام بقواعد المجموعة.` });
      if (group.settings.deleteViolations && message.key?.id) {
        try {
          await sock.sendMessage(jid, { delete: message.key });
        } catch (error) {
          logger.warn('[ESKO JOKER] تعذر حذف الرسالة (تحقق من صلاحيات البوت):', error.message);
        }
      }
      return true;
    }
  }

  const handled = await handleCommand({ sock, message, store, text, jid, sender, prefix: config.prefix });
  if (handled) return true;

  if (isGroupJid(jid)) {
    const reply = group.replies[text.toLowerCase()];
    if (reply) await sock.sendMessage(jid, { text: reply }, { quoted: message });
  }
  return null;
}

module.exports = { handleMessage };
