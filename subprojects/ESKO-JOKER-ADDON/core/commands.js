'use strict';

const { createGame, answerMatches, pick, randomInt } = require('./games');
const { firstMention, isGroup, normalize } = require('./utils');
const { isAdmin } = require('./moderation');

const HELP = `🃏 *ESKO JOKER — قائمة الأوامر*
🎮 الترفيه:
!نكتة | !لغز | !سؤال | !تخمين | !تحدي
!نقاط | !ترتيب | !حجر_ورقة_مقص | !نرد
🛡️ الحماية:
!حماية | !تحذير @عضو السبب | !تحذيراتي
!مسح_تحذيرات @عضو
⚙️ الإعدادات (للمشرفين):
!اعدادات
!اعداد الروابط تشغيل|إيقاف
!اعداد المنشن تشغيل|إيقاف
!اعداد السبام تشغيل|إيقاف
!اعداد حذف_المخالفات تشغيل|إيقاف
!اعداد الطرد_بعد_التحذيرات تشغيل|إيقاف
!اعداد حد_التحذيرات 3
👥 الإدارة:
!احصائيات | !اضف_رد كلمة | الرد | !حذف_رد كلمة | !ردود`;

async function send(sock, jid, text, quoted) {
  return sock.sendMessage(jid, { text }, quoted ? { quoted } : undefined);
}

async function handleCommand(ctx) {
  const { sock, message, store, jid, sender, text, cfg } = ctx;
  if (!text.startsWith(cfg.prefix)) return false;
  const body = text.slice(cfg.prefix.length).trim();
  const [cmdRaw, ...argArr] = body.split(/\s+/);
  const cmd = normalize(cmdRaw);
  const args = argArr.join(' ');
  const group = store.group(jid);

  const aliases = {
    'help': 'مساعدة', 'menu': 'منيو', 'joke': 'نكتة', 'riddle': 'لغز',
    'quiz': 'سؤال', 'points': 'نقاط', 'rank': 'ترتيب', 'settings': 'اعدادات'
  };
  const c = aliases[cmd] || cmd;

  if (['مساعدة', 'منيو'].includes(c)) { await send(sock, jid, HELP, message); return true; }
  if (c === 'نكتة') { await send(sock, jid, `😂 ${createGame('joke').text}`, message); return true; }

  if (['لغز', 'سؤال', 'تخمين', 'تحدي'].includes(c)) {
    const type = ({ 'لغز': 'riddle', 'سؤال': 'question', 'تخمين': 'guess', 'تحدي': 'question' })[c];
    const game = createGame(type);
    group.games.active = { ...game, at: Date.now(), by: sender };
    store.save();
    await send(sock, jid, `🧩 *${c} الجوكر*\n${game.question}\n\nأول إجابة صحيحة تكسب ${game.points} نقطة. لديك 5 دقائق.`, message);
    return true;
  }

  if (c === 'نقاط') {
    const u = store.user(jid, sender);
    await send(sock, jid, `🏆 نقاطك: ${u.points}\n🎮 مرات اللعب: ${u.played || 0}\n⚠️ تحذيراتك: ${(group.warnings[sender] || []).length}`, message);
    return true;
  }
  if (c === 'ترتيب') {
    const rows = Object.entries(group.games.scores || {}).sort((a,b) => b[1]-a[1]).slice(0,10);
    await sock.sendMessage(jid, {
      text: rows.length ? `🏆 *أفضل اللاعبين*\n${rows.map(([id, points], i) => `${i+1}. @${id.split('@')[0]} — ${points} نقطة`).join('\n')}` : 'لا توجد نقاط حتى الآن.',
      mentions: rows.map(([id]) => id)
    });
    return true;
  }
  if (c === 'حجر_ورقة_مقص') {
    const options = ['حجر 🪨', 'ورقة 📄', 'مقص ✂️'];
    await send(sock, jid, `🤖 اختياري: ${pick(options)}\nاكتب !حجر_ورقة_مقص حجر أو ورقة أو مقص لجولة اختيارية.`, message);
    return true;
  }
  if (c === 'نرد') { await send(sock, jid, `🎲 النتيجة: ${randomInt(1, 6)}`, message); return true; }

  if (!isGroup(jid)) { await send(sock, jid, 'هذا الأمر مخصص للمجموعات.', message); return true; }

  if (c === 'تحذيراتي') {
    await send(sock, jid, `⚠️ تحذيراتك الحالية: ${(group.warnings[sender] || []).length}`, message);
    return true;
  }

  const adminOnly = ['حماية', 'اعدادات', 'اعداد', 'تحذير', 'مسح_تحذيرات', 'احصائيات', 'اضف_رد', 'حذف_رد'];
  if (adminOnly.includes(c) && !(await isAdmin(sock, jid, sender))) {
    await send(sock, jid, '⛔ هذا الأمر للمشرفين فقط.', message);
    return true;
  }

  if (c === 'حماية' || c === 'اعدادات') {
    const s = group.settings;
    await send(sock, jid, `🛡️ *إعدادات حماية المجموعة*\nالروابط: ${s.links?'تشغيل':'إيقاف'}\nالمنشن الجماعي: ${s.mentions?'تشغيل':'إيقاف'}\nالسبام: ${s.spam?'تشغيل':'إيقاف'}\nحذف المخالفات: ${s.deleteViolations?'تشغيل':'إيقاف'}\nالطرد بعد التحذيرات: ${s.kickAfterWarnings?'تشغيل':'إيقاف'}\nحد التحذيرات: ${s.warningsBeforeKick}\n\nاستخدم !اعداد اسم_الميزة تشغيل|إيقاف`, message);
    return true;
  }

  if (c === 'اعداد') {
    const [key, value] = args.split(/\s+/);
    const map = {
      'الروابط':'links', 'المنشن':'mentions', 'السبام':'spam',
      'حذف_المخالفات':'deleteViolations', 'الطرد_بعد_التحذيرات':'kickAfterWarnings'
    };
    if (key === 'حد_التحذيرات') {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 2 || n > 10) {
        await send(sock, jid, 'اكتب رقمًا من 2 إلى 10. مثال: !اعداد حد_التحذيرات 3', message); return true;
      }
      group.settings.warningsBeforeKick = n;
    } else {
      if (!map[key] || !['تشغيل','إيقاف'].includes(value)) {
        await send(sock, jid, 'الصيغة: !اعداد الروابط تشغيل أو !اعداد حذف_المخالفات إيقاف', message); return true;
      }
      group.settings[map[key]] = value === 'تشغيل';
    }
    store.save();
    await send(sock, jid, '✅ تم حفظ الإعداد لهذه المجموعة فقط.', message);
    return true;
  }

  if (c === 'تحذير') {
    const target = firstMention(message);
    if (!target) { await send(sock, jid, 'اعمل منشن للعضو واكتب السبب بعده.', message); return true; }
    const reason = args.replace(/@\S+/g, '').trim() || 'مخالفة قواعد المجموعة';
    const n = store.addWarning(jid, target, reason, cfg.maxWarningsStored);
    await send(sock, jid, `⚠️ تم تسجيل تحذير ${n}/${group.settings.warningsBeforeKick}\nالسبب: ${reason}`, message);
    if (group.settings.kickAfterWarnings && n >= group.settings.warningsBeforeKick) {
      try {
        if (!(await isAdmin(sock, jid, target))) {
          await sock.groupParticipantsUpdate(jid, [target], 'remove');
          store.clearWarnings(jid, target);
          await send(sock, jid, '🚪 تم إخراج العضو بعد بلوغ حد التحذيرات.', message);
        } else await send(sock, jid, 'لم يتم طرد العضو لأنه مشرف.', message);
      } catch {
        await send(sock, jid, '⚠️ فشل الطرد. تأكد أن البوت مشرف.', message);
      }
    }
    return true;
  }

  if (c === 'مسح_تحذيرات') {
    const target = firstMention(message);
    if (!target) { await send(sock, jid, 'اعمل منشن للعضو المطلوب.', message); return true; }
    store.clearWarnings(jid, target);
    await send(sock, jid, '✅ تم مسح تحذيرات العضو.', message);
    return true;
  }

  if (c === 'احصائيات') {
    const members = Object.keys(group.games.scores || {}).length;
    const warns = Object.values(group.warnings).reduce((n, a) => n + a.length, 0);
    await send(sock, jid, `📊 إحصائيات المجموعة\nلاعبون: ${members}\nتحذيرات محفوظة: ${warns}\nردود مخصصة: ${Object.keys(group.replies).length}`, message);
    return true;
  }

  if (c === 'اضف_رد') {
    const parts = args.split('|');
    const key = normalize(parts.shift());
    const value = parts.join('|').trim();
    if (!key || !value || value.length > cfg.maxReplyLength) {
      await send(sock, jid, `الصيغة: !اضف_رد كلمة | الرد (حتى ${cfg.maxReplyLength} حرف)`, message); return true;
    }
    group.replies[key] = value; store.save();
    await send(sock, jid, '✅ تم حفظ الرد.', message); return true;
  }
  if (c === 'حذف_رد') {
    const key = normalize(args);
    if (!group.replies[key]) { await send(sock, jid, 'الرد غير موجود.', message); return true; }
    delete group.replies[key]; store.save();
    await send(sock, jid, '🗑️ تم حذف الرد.', message); return true;
  }
  if (c === 'ردود') {
    const keys = Object.keys(group.replies);
    await send(sock, jid, keys.length ? `📋 الردود:\n${keys.map((x,i)=>`${i+1}. ${x}`).join('\n')}` : 'لا توجد ردود مخصصة.', message);
    return true;
  }
  return false;
}

module.exports = { handleCommand, HELP };
