'use strict';

const { getJoke, getRiddle, getQuestion } = require('./games');
const { extractMention, isGroupJid } = require('./utils');

const HELP = `🃏 *ESKO JOKER BOT*
!منيو — الأقسام
!نكتة — نكتة عشوائية
!لغز — لغز جديد
!سؤال — سؤال معلومات عامة
!نقاط — رصيد نقاطك
!ترتيب — أفضل اللاعبين
!اعدادات — إعدادات المجموعة (للمشرف)
!اعداد الترحيب تشغيل|إيقاف
!اعداد الروابط تشغيل|إيقاف
!اعداد منع_السب تشغيل|إيقاف
!اعداد حذف_المخالفات تشغيل|إيقاف
!تحذير @منشن السبب — للمشرف
!اضف_رد كلمة | الرد — للمشرف
!حذف_رد كلمة — للمشرف
!ردود — عرض الردود`;

async function send(sock, jid, text, quoted) {
  return sock.sendMessage(jid, { text }, quoted ? { quoted } : undefined);
}

async function isAdmin(sock, jid, sender) {
  try {
    const metadata = await sock.groupMetadata(jid);
    const participant = metadata.participants?.find(p => p.id === sender || p.jid === sender);
    return Boolean(participant?.admin || participant?.isAdmin || participant?.isSuperAdmin);
  } catch {
    return false;
  }
}

async function handleCommand(ctx) {
  const { sock, message, store, text, jid, sender, prefix } = ctx;
  if (!text.startsWith(prefix)) return false;
  const body = text.slice(prefix.length).trim();
  const [rawCommand, ...rest] = body.split(/\s+/);
  const command = (rawCommand || '').toLowerCase();
  const argsText = rest.join(' ');
  const group = store.group(jid);

  if (['مساعدة', 'help'].includes(command)) return send(sock, jid, HELP, message), true;
  if (['منيو', 'menu'].includes(command)) return send(sock, jid, `🃏 الأقسام\n🎮 الترفيه: !نكتة، !لغز، !سؤال\n🏆 النقاط: !نقاط، !ترتيب\n🛡️ الحماية: !اعدادات\n⚙️ الردود: !ردود`, message), true;
  if (command === 'نكتة') return send(sock, jid, `😂 ${getJoke()}`, message), true;

  if (command === 'لغز') {
    const riddle = getRiddle();
    store.data.groups[jid].activeRiddle = { answer: riddle.a.toLowerCase(), at: Date.now() };
    store.save();
    return send(sock, jid, `🧩 لغز الجوكر:\n${riddle.q}\n\nأول إجابة صحيحة تكسب 3 نقاط.`, message), true;
  }
  if (command === 'سؤال') {
    const q = getQuestion();
    store.data.groups[jid].activeQuestion = { answer: q.a.toLowerCase(), at: Date.now() };
    store.save();
    return send(sock, jid, `🧠 سؤال سريع:\n${q.q}\n\nالإجابة الصحيحة تكسب نقطتين.`, message), true;
  }
  if (command === 'نقاط') {
    const user = store.user(jid, sender);
    return send(sock, jid, `🏆 نقاطك: ${user.points}\n🎮 مشاركاتك: ${user.gamesPlayed}\n⚠️ تحذيراتك: ${user.warnings}`, message), true;
  }
  if (command === 'ترتيب') {
    const rows = Object.entries(store.data.users)
      .filter(([key]) => key.startsWith(`${jid}:`))
      .map(([key, user]) => ({ id: key.slice(jid.length + 1), points: user.points || 0 }))
      .sort((a, b) => b.points - a.points).slice(0, 10);
    const out = rows.length ? rows.map((x, i) => `${i + 1}. @${x.id.split('@')[0]} — ${x.points} نقطة`).join('\n') : 'لسه مفيش نقاط. ابدأوا بالألغاز!';
    return sock.sendMessage(jid, { text: `🏆 ترتيب اللاعبين\n${out}`, mentions: rows.map(x => x.id) }), true;
  }

  if (!isGroupJid(jid)) return send(sock, jid, 'الأوامر الإدارية تعمل داخل المجموعات فقط.', message), true;

  if (command === 'اعدادات') {
    if (!(await isAdmin(sock, jid, sender))) return send(sock, jid, '⛔ الأمر للمشرفين فقط.', message), true;
    const s = group.settings;
    return send(sock, jid, `⚙️ إعدادات المجموعة\nالترحيب: ${s.welcome ? 'تشغيل' : 'إيقاف'}\nمنع الروابط: ${s.blockLinks ? 'تشغيل' : 'إيقاف'}\nمنع السب: ${s.badWords ? 'تشغيل' : 'إيقاف'}\nحذف المخالفات: ${s.deleteViolations ? 'تشغيل' : 'إيقاف'}\n\nاستخدم: !اعداد اسم_الميزة تشغيل|إيقاف`, message), true;
  }

  if (command === 'اعداد') {
    if (!(await isAdmin(sock, jid, sender))) return send(sock, jid, '⛔ الأمر للمشرفين فقط.', message), true;
    const parts = argsText.split(/\s+/);
    const keyMap = { 'الترحيب': 'welcome', 'الروابط': 'blockLinks', 'منع_السب': 'badWords', 'حذف_المخالفات': 'deleteViolations' };
    const key = keyMap[parts[0]];
    const val = parts[1];
    if (!key || !['تشغيل', 'إيقاف'].includes(val)) {
      return send(sock, jid, 'الصيغة: !اعداد الترحيب تشغيل\nالمتاح: الترحيب، الروابط، منع_السب، حذف_المخالفات', message), true;
    }
    group.settings[key] = val === 'تشغيل';
    store.save();
    return send(sock, jid, `✅ تم ${val} ${parts[0]} لهذه المجموعة فقط.`, message), true;
  }

  if (command === 'تحذير') {
    if (!(await isAdmin(sock, jid, sender))) return send(sock, jid, '⛔ الأمر للمشرفين فقط.', message), true;
    const target = extractMention(message);
    if (!target) return send(sock, jid, 'من فضلك اعمل منشن للعضو واكتب السبب.', message), true;
    const reason = argsText.replace(/@\S+/g, '').trim() || 'مخالفة قواعد المجموعة';
    const count = store.warn(jid, target, reason);
    return send(sock, jid, `⚠️ تم تسجيل تحذير للعضو @${target.split('@')[0]}\nالسبب: ${reason}\nإجمالي التحذيرات: ${count}`, message), true;
  }

  if (command === 'اضف_رد') {
    if (!(await isAdmin(sock, jid, sender))) return send(sock, jid, '⛔ الأمر للمشرفين فقط.', message), true;
    const split = argsText.split('|');
    const key = (split.shift() || '').trim().toLowerCase();
    const value = split.join('|').trim();
    if (!key || !value || value.length > 500) return send(sock, jid, 'الصيغة: !اضف_رد كلمة | الرد (حتى 500 حرف)', message), true;
    group.replies[key] = value;
    store.save();
    return send(sock, jid, `✅ تم حفظ الرد للكلمة: ${key}`, message), true;
  }

  if (command === 'حذف_رد') {
    if (!(await isAdmin(sock, jid, sender))) return send(sock, jid, '⛔ الأمر للمشرفين فقط.', message), true;
    const key = argsText.trim().toLowerCase();
    if (!key || !Object.prototype.hasOwnProperty.call(group.replies, key)) return send(sock, jid, 'الرد غير موجود.', message), true;
    delete group.replies[key];
    store.save();
    return send(sock, jid, `🗑️ تم حذف الرد: ${key}`, message), true;
  }

  if (command === 'ردود') {
    const keys = Object.keys(group.replies);
    return send(sock, jid, keys.length ? `📋 الردود:\n${keys.map((x, i) => `${i + 1}. ${x}`).join('\n')}` : '📋 لا توجد ردود مخصصة.', message), true;
  }

  return false;
}

module.exports = { handleCommand, isAdmin, HELP };
