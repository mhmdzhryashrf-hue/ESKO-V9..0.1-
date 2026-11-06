'use strict';

/*
 * مثال منفصل اختياري لإنشاء اتصال Baileys جديد.
 * لا تشغله إذا كان مشروعك متصلًا بالفعل؛ جلسة ثانية قد تفصل الأولى.
 * احتفظ بمجلد auth_info سرّيًا ولا ترسله لأحد.
 *
 * للتفعيل: ثبّت @whiskeysockets/baileys في مشروع مستقل ثم راجع وثائق نسختك
 * الرسمية لأن أسماء الدوال وخيارات pairing قد تختلف بين الإصدارات.
 * لا يحتوي هذا المثال على رقم هاتف أو رمز اقتران جاهز أو بيانات حساب.
 */

async function startConnection() {
  const baileys = require('@whiskeysockets/baileys');
  const makeWASocket = baileys.default || baileys.makeWASocket;
  const { useMultiFileAuthState, DisconnectReason } = baileys;
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const sock = makeWASocket({ auth: state, printQRInTerminal: false });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) console.log('رمز QR متاح في بيانات الاتصال؛ استخدم آلية الربط الرسمية للمكتبة.');
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log('انقطع الاتصال. أعد التشغيل يدويًا بعد فحص السبب.');
      } else {
        console.log('تم تسجيل الخروج؛ يلزم ربط جديد.');
      }
    }
    if (connection === 'open') console.log('✅ اتصال واتساب قائم.');
  });

  const { createEskoAddon } = require('./index');
  const addon = createEskoAddon({ sock });
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const message of messages) await addon.handleMessage(message);
  });
  sock.ev.on('group-participants.update', update => addon.handleParticipantsUpdate(update));
  return sock;
}

if (require.main === module) {
  startConnection().catch(err => {
    console.error('فشل تشغيل مثال الاتصال:', err);
    process.exitCode = 1;
  });
}
module.exports = { startConnection };
