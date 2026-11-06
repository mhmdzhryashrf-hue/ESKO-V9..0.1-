'use strict';

const { getText, getJid, getSender, isGroup, normalize } = require('./utils');
const { violationFor, spamCheck, applyViolation } = require('./moderation');
const { handleCommand } = require('./commands');
const { answerMatches } = require('./games');

function createProcessor({ sock, store, cfg, logger = console }) {
  const inFlight = new Set();

  async function handleMessage(message) {
    if (!message?.message || message.key?.fromMe) return null;
    const jid = getJid(message);
    const sender = getSender(message);
    const text = getText(message).trim();
    if (!jid || !sender || !text) return null;

    const dedupeKey = `${jid}:${message.key?.id || `${sender}:${text}`}`;
    if (inFlight.has(dedupeKey)) return null;
    inFlight.add(dedupeKey);

    try {
      const group = store.group(jid);

      // أجب عن اللعبة النشطة قبل معالجة الأوامر، مع انتهاء صلاحية آمن.
      if (isGroup(jid) && group.games.active && !text.startsWith(cfg.prefix)) {
        const active = group.games.active;
        if (Date.now() - active.at <= 5 * 60 * 1000 && answerMatches(active, text)) {
          group.games.active = null;
          const user = store.addPoints(jid, sender, active.points || 2);
          await sock.sendMessage(jid, {
            text: `🎉 إجابة صحيحة يا @${sender.split('@')[0]}!\n+${active.points || 2} نقطة\nرصيدك: ${user.points}`,
            mentions: [sender]
          });
          return true;
        }
        if (Date.now() - active.at > 5 * 60 * 1000) {
          group.games.active = null;
          store.save();
        }
      }

      if (isGroup(jid)) {
        if (spamCheck(jid, sender, group.settings, cfg)) {
          await sock.sendMessage(jid, { text: `🛡️ @${sender.split('@')[0]} تم رصد رسائل متكررة بسرعة؛ انتظر قليلًا.`, mentions: [sender] });
          return true;
        }
        const violation = violationFor(text, message, group.settings);
        if (violation) {
          await applyViolation({ sock, message, store, jid, sender, violation, cfg, logger });
          return true;
        }
      }

      if (await handleCommand({ sock, message, store, jid, sender, text, cfg })) return true;

      if (isGroup(jid)) {
        const reply = group.replies[normalize(text)];
        if (reply) {
          await sock.sendMessage(jid, { text: reply }, { quoted: message });
          return true;
        }
      }
      return null;
    } catch (error) {
      logger.error('[ESKO JOKER] فشل المعالج:', error);
      return null;
    } finally {
      inFlight.delete(dedupeKey);
    }
  }

  async function handleParticipantsUpdate(update) {
    if (!update || update.action !== 'add' || !Array.isArray(update.participants)) return null;
    try {
      const group = store.group(update.id);
      if (!group.settings.welcome) return null;
      let meta;
      try { meta = await sock.groupMetadata(update.id); } catch {}
      for (const participant of update.participants) {
        await sock.sendMessage(update.id, {
          text: `🃏 أهلًا وسهلًا @${String(participant).split('@')[0]} في *${meta?.subject || 'المجموعة'}*!\nاقرأ القوانين واستمتع معنا.`,
          mentions: [participant]
        });
      }
      return true;
    } catch (error) {
      logger.error('[ESKO JOKER] فشل الترحيب:', error);
      return null;
    }
  }

  return { handleMessage, handleParticipantsUpdate };
}

module.exports = { createProcessor };
