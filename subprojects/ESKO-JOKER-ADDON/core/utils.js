'use strict';

function getText(message) {
  const m = message?.message;
  if (!m) return '';
  return m.conversation
    || m.extendedTextMessage?.text
    || m.imageMessage?.caption
    || m.videoMessage?.caption
    || m.documentMessage?.caption
    || m.buttonsResponseMessage?.selectedButtonId
    || m.listResponseMessage?.singleSelectReply?.selectedRowId
    || '';
}
function getJid(message) { return message?.key?.remoteJid || ''; }
function getSender(message) { return message?.key?.participant || message?.key?.remoteJid || ''; }
function isGroup(jid) { return typeof jid === 'string' && jid.endsWith('@g.us'); }
function mentions(message) {
  return message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}
function firstMention(message) { return mentions(message)[0] || null; }
function normalize(s) { return String(s || '').trim().toLocaleLowerCase('ar'); }
function isUrl(s) {
  return /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/)[^\s]*/i.test(s);
}
function isMassMention(text, message) {
  const count = mentions(message).length;
  return count >= 5 || /@everyone|@all|منشن\s*(الكل|جميع)/i.test(text);
}
function getQuoted(message) { return message; }
module.exports = { getText, getJid, getSender, isGroup, mentions, firstMention, normalize, isUrl, isMassMention, getQuoted };
