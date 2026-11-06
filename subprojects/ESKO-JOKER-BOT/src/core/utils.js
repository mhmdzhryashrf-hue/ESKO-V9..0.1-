'use strict';

function getText(message) {
  const m = message && message.message;
  if (!m) return '';
  return m.conversation
    || m.extendedTextMessage?.text
    || m.imageMessage?.caption
    || m.videoMessage?.caption
    || m.documentMessage?.caption
    || '';
}

function getSender(message) {
  return message?.key?.participant || message?.key?.remoteJid || 'unknown';
}

function getJid(message) {
  return message?.key?.remoteJid || '';
}

function isGroupJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@g.us');
}

function extractMention(message) {
  const context = message?.message?.extendedTextMessage?.contextInfo;
  return context?.mentionedJid?.[0] || null;
}

function isUrl(text) {
  return /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|t\.me\/)[^\s]+/i.test(text);
}

function safeErrorText(error) {
  return String(error?.message || error || 'خطأ غير معروف').slice(0, 180);
}

module.exports = { getText, getSender, getJid, isGroupJid, extractMention, isUrl, safeErrorText };
