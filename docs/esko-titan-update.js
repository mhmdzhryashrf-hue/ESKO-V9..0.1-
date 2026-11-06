/*
 * ESKO OPEN HUB — TITAN Social Update (single-file add-on)
 * Version: 1.0.0
 * Arabic RTL · Local-first · No external dependencies
 *
 * Install: place this file beside docs/index.html and add this before </body>:
 * <script src="esko-titan-update.js" defer></script>
 *
 * Posts, comments, profile, projects, listings and discussions are stored in
 * this browser only. Public sync, real accounts, live chat, generative AI,
 * payments and automatic product delivery require a separately hosted backend.
 */
(() => {
  'use strict';

  if (window.__ESKO_TITAN_UPDATE_LOADED__) return;
  window.__ESKO_TITAN_UPDATE_LOADED__ = true;

  const STORAGE_KEY = 'esko-titan-social-update-v1';
  const SUPPORT_CONTACTS = [
    { label: 'القناة الرسمية', url: 'https://whatsapp.com/channel/0029VbE7vGO4tRrwmz95M73S' },
    { label: 'أكاديمية البرمجة', url: 'https://whatsapp.com/channel/0029VbEH9N2LY6d4aZ8FRW0I' },
    { label: 'قناة التعليمات', url: 'https://whatsapp.com/channel/0029Vb9NAZoKAwEu7UjBxJ02' }
  ];
  const MAX_POSTS = 500;
  const MAX_MESSAGES = 1000;
  const MAX_LISTINGS = 300;
  const MAX_PROJECTS = 300;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const makeId = (prefix = 'ESKO') => {
    const bytes = new Uint8Array(8);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    return `${prefix}-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  };
  const nowISO = () => new Date().toISOString();
  const formatDate = (value) => {
    try { return new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return ''; }
  };
  const readState = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  };

  const state = readState();
  state.profile = state.profile && typeof state.profile === 'object' ? state.profile : {
    id: makeId('ESKO'), name: 'عضو ESKO', bio: '', joinedAt: nowISO()
  };
  if (!state.profile.id) state.profile.id = makeId('ESKO');
  if (!state.profile.name) state.profile.name = 'عضو ESKO';
  state.posts = Array.isArray(state.posts) ? state.posts : [];
  state.bots = Array.isArray(state.bots) ? state.bots : [];
  state.projects = Array.isArray(state.projects) ? state.projects : [];
  state.listings = Array.isArray(state.listings) ? state.listings : [];
  state.messages = Array.isArray(state.messages) ? state.messages : [];
  state.following = Array.isArray(state.following) ? state.following : [];
  state.enabledFeatures = Array.isArray(state.enabledFeatures) ? state.enabledFeatures : [];

  const saveState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      notify('تعذّر الحفظ: مساحة التخزين المحلية قد تكون ممتلئة. صدّر نسخة احتياطية.');
      return false;
    }
  };

  let toastTimer = 0;
  function notify(message) {
    const toast = $('#eskoTitanToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // The six primary sections follow the approved ESKO site specification.
  const hubDefinitions = [
    { key: 'home', icon: '⌂', title: 'البيت', subtitle: 'مجتمع ESKO', theme: 'home', processors: 7,
      groups: ['المنشورات', 'الصور والوسائط', 'الفيديوهات', 'التعليقات', 'التفاعلات', 'المتابعة', 'الوسوم', 'البحث', 'القصص', 'الإشارات', 'التوصيات', 'الإشعارات'] },
    { key: 'bots', icon: '⚙', title: 'البوتات', subtitle: 'القوالب ومسودات الإعداد', theme: 'bots', processors: 10,
      groups: ['قوالب البوتات', 'إنشاء بوت', 'الأوامر', 'التحقق', 'المنصات', 'الإعدادات', 'الصلاحيات', 'السجلات', 'النسخ الاحتياطية', 'التصدير', 'المراجعة', 'التوثيق'] },
    { key: 'repositories', icon: '▣', title: 'المستودعات', subtitle: 'المشاريع والملفات', theme: 'warehouse', processors: 5,
      groups: ['المشاريع', 'الملفات', 'الأكواد', 'القوالب', 'الملاحظات', 'الإصدارات', 'النسخ الاحتياطية', 'المهام', 'المكتبات', 'التوثيق', 'المجموعات', 'الصلاحيات'] },
    { key: 'store', icon: '🛒', title: 'المتجر الإلكتروني', subtitle: 'عروض وأدوات المجتمع', theme: 'store', processors: 7,
      groups: ['الأدوات', 'البوتات', 'القوالب', 'الإضافات', 'المنتجات الرقمية', 'العروض', 'البائعون', 'المفضلة', 'التقييمات', 'طلبات التواصل', 'التصنيفات', 'قوائم النشر'] },
    { key: 'assistant', icon: '✧', title: 'المساعد', subtitle: 'المساعدة والمصادر', theme: 'assistant', processors: 9,
      groups: ['الأسئلة', 'المصادر', 'الملخصات', 'المعالجة', 'التحقق', 'سجل المحادثة', 'الإعدادات', 'الخصوصية', 'التصدير', 'الملاحظات', 'المساعدة', 'التوثيق'] },
    { key: 'account', icon: '♙', title: 'الحساب', subtitle: 'ملفك وهويتك', theme: 'account', processors: 2,
      groups: ['الملف الشخصي', 'معرّف ESKO', 'المنشورات', 'الخصوصية', 'المتابعة', 'التفضيلات', 'النسخ الاحتياطي', 'الإشعارات', 'المظهر', 'الأمان', 'سجل النشاط', 'الدعم'] }
  ];
  const featureActions = ['إنشاء', 'تعديل', 'مراجعة', 'تنظيم', 'مشاركة'];
  const featureCatalog = Object.fromEntries(hubDefinitions.map((hub) => [
    hub.key,
    hub.groups.flatMap((group) => featureActions.map((action) => `${action} ${group}`))
  ]));

  // Forty local data validators/organisers (7 / 10 / 5 / 7 / 9 / 2).
  // They are not AI agents, remote services, or hardware/CPU overclockers.
  const processorDefinitions = [
    // Home: 7
    ['تنظيف نص المنشور', () => cleanText(state.posts.map((post) => post.text).join(' ')).length],
    ['حساب كلمات المنشورات', () => countWords(state.posts.map((post) => post.text).join(' '))],
    ['منع تكرار الوسوم', () => unique(state.posts.flatMap((post) => String(post.text || '').match(/#[\p{L}\d_]+/gu) || [])).length],
    ['ترتيب المنشورات', () => state.posts.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).length],
    ['فهرسة المنشورات', () => state.posts.filter((post) => String(post.text || '').trim()).length],
    ['إحصاء التفاعلات', () => state.posts.reduce((sum, post) => sum + (Array.isArray(post.likes) ? post.likes.length : 0), 0)],
    ['تجميع التعليقات', () => state.posts.reduce((sum, post) => sum + (Array.isArray(post.comments) ? post.comments.length : 0), 0)],
    // Bots: 10
    ['إحصاء مسودات البوتات', () => state.bots.length],
    ['فحص أسماء البوتات', () => state.bots.every((bot) => /^[\p{L}\d _-]{2,50}$/u.test(String(bot.name || '')))],
    ['فحص وصف البوت', () => state.bots.every((bot) => String(bot.description || '').length <= 500)],
    ['حد أوامر البوت', () => state.bots.every((bot) => Array.isArray(bot.commands) && bot.commands.length <= 100)],
    ['فحص تكرار الأوامر', () => state.bots.every((bot) => new Set((bot.commands || []).map((command) => command.name)).size === (bot.commands || []).length)],
    ['التحقق من صيغة الأوامر', () => state.bots.every((bot) => (bot.commands || []).every((command) => /^\/[a-z][a-z0-9_]{1,31}$/i.test(command.name)))],
    ['منع تخزين رموز الوصول', () => state.bots.every((bot) => !JSON.stringify(bot).match(/(?:token|password|api[_-]?key)\s*[:=]/i))],
    ['التحقق من معرّفات المسودات', () => state.bots.every((bot) => Boolean(bot.id))],
    ['تجهيزات التصدير', () => state.bots.filter((bot) => Array.isArray(bot.commands)).length],
    ['مراجعة حالة المسودات', () => state.bots.filter((bot) => bot.status === 'local-draft').length],
    // Repositories: 5
    ['فهرسة المشاريع', () => state.projects.filter((project) => project.name).length],
    ['تحليل حجم البيانات', () => `${(new Blob([JSON.stringify(state.projects)]).size / 1024).toFixed(2)} KB`],
    ['فحص أسماء المشاريع', () => state.projects.every((project) => typeof project.name === 'string')],
    ['التحقق من حقول المشاريع', () => state.projects.every((project) => project.id && project.name)],
    ['تنسيق تواريخ المشاريع', () => state.projects.filter((project) => !Number.isNaN(Date.parse(project.createdAt))).length],
    // Store: 7
    ['فحص بيانات المنتج', () => state.listings.every((item) => item.title && item.description)],
    ['فرز العروض', () => state.listings.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).length],
    ['تدقيق وصف المنتج', () => state.listings.filter((item) => String(item.description).length <= 700).length],
    ['تصنيف العروض', () => unique(state.listings.map((item) => item.category)).length],
    ['إحصاء السوق المحلي', () => state.listings.length],
    ['فحص معرّفات العروض', () => state.listings.every((item) => Boolean(item.id))],
    ['فحص حدّ العروض المحلية', () => state.listings.length <= MAX_LISTINGS],
    // Assistant: 9 (local helpers only; no generative model)
    ['تنظيف مدخل المساعد', () => cleanText(state.messages.map((item) => item.text).join(' ')).length],
    ['تجميع الملاحظات', () => state.messages.slice(-100).length],
    ['فحص طول الرسائل', () => state.messages.every((message) => String(message.text).length <= 1200)],
    ['فحص الرسائل الفارغة', () => state.messages.filter((message) => !String(message.text || '').trim()).length],
    ['حساب كلمات الرسائل', () => countWords(state.messages.map((message) => message.text).join(' '))],
    ['التحقق من التاريخ', () => state.messages.filter((message) => !Number.isNaN(Date.parse(message.createdAt))).length],
    ['تجهيز سجل محلي', () => state.messages.slice(-100).length],
    ['فحص وجود مصادر', () => document.querySelectorAll('a[href]').length],
    ['حالة اتصال المتصفح', () => navigator.onLine ? 'متصل بالشبكة' : 'غير متصل'],
    // Account: 2
    ['تدقيق معرّف ESKO', () => /^ESKO-[A-F0-9]+$/.test(state.profile.id)],
    ['فحص اكتمال الملف', () => Boolean(String(state.profile.name || '').trim() && state.profile.id)]
  ].map(([name, run], index) => ({ id: index + 1, name, run }));

  function cleanText(value) { return String(value ?? '').trim().replace(/\s+/g, ' '); }
  function countWords(value) { return cleanText(value).split(/\s+/).filter(Boolean).length; }
  function unique(values) { return Array.from(new Set(values)); }

  const root = document.createElement('div');
  root.addEventListener('error', (event) => {
    const image = event.target;
    if (image instanceof HTMLImageElement && image.closest('.etu-eagle')) {
      image.style.display = 'none';
      const fallback = image.nextElementSibling;
      if (fallback) fallback.style.display = 'block';
    }
  }, true);
  root.id = 'eskoTitanUpdateRoot';
  root.className = 'etu-root';
  root.innerHTML = `
    <header class="etu-topbar">
      <div class="etu-brand"><div class="etu-brand-mark">♛</div><div><strong>ESKO <em>TITAN</em></strong><small>OPEN HUB · SIX CORE SECTIONS</small></div></div>
      <div class="etu-top-actions"><span class="etu-local-state"><i></i> حفظ محلي</span><button type="button" class="etu-top-btn" data-hub="assistant">المساعد</button><button type="button" class="etu-top-btn" data-action="export">نسخة احتياطية</button><button type="button" class="etu-top-btn" data-action="old-site">الواجهة الأصلية</button></div>
    </header>
    <main class="etu-main" id="etuMain" aria-live="polite"></main>
    <nav class="etu-bottom-nav" aria-label="الأقسام الرئيسية">
      ${hubDefinitions.map((hub) => `<button type="button" data-hub="${hub.key}" class="etu-nav-item"><span>${hub.icon}</span><b>${hub.title}</b></button>`).join('')}
    </nav>
    <div class="etu-toast" id="eskoTitanToast" role="status" aria-live="polite"></div>
    <input id="etuImportFile" type="file" accept="application/json,.json" hidden>
  `;

  const style = document.createElement('style');
  style.id = 'eskoTitanUpdateStyle';
  style.textContent = `
    #eskoTitanUpdateRoot{--etu-bg:#080b19;--etu-panel:rgba(18,24,48,.88);--etu-panel-2:rgba(26,31,62,.94);--etu-text:#f4f3ff;--etu-muted:#a9aecb;--etu-blue:#58c8ff;--etu-purple:#9a82ff;--etu-gold:#e9c56f;--etu-line:rgba(130,151,255,.23);color:var(--etu-text);font-family:system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;position:relative;isolation:isolate;min-height:100vh;padding:12px 14px 104px;background:radial-gradient(ellipse at 12% 5%,rgba(47,111,202,.22),transparent 36%),radial-gradient(ellipse at 90% 18%,rgba(123,79,205,.2),transparent 42%),radial-gradient(ellipse at 55% 100%,rgba(220,177,82,.08),transparent 38%),var(--etu-bg);}
    #eskoTitanUpdateRoot *{box-sizing:border-box}#eskoTitanUpdateRoot button,#eskoTitanUpdateRoot input,#eskoTitanUpdateRoot textarea,#eskoTitanUpdateRoot select{font:inherit}#eskoTitanUpdateRoot button{cursor:pointer}#eskoTitanUpdateRoot button:focus-visible,#eskoTitanUpdateRoot a:focus-visible,#eskoTitanUpdateRoot input:focus-visible,#eskoTitanUpdateRoot textarea:focus-visible,#eskoTitanUpdateRoot select:focus-visible{outline:2px solid var(--etu-gold);outline-offset:2px}
    #appShell.etu-enabled .topbar,#appShell.etu-enabled .layout,#appShell.etu-enabled>.v5-main-footer,#appShell.etu-enabled>.v5-support-float{display:none!important}#appShell.etu-enabled{padding:0!important;max-width:none!important}#appShell.etu-enabled #eskoTitanUpdateRoot{display:block!important}
    .etu-topbar{max-width:1420px;margin:0 auto 18px;min-height:66px;padding:10px 16px;border:1px solid var(--etu-line);border-radius:18px;background:rgba(12,17,37,.88);display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 16px 45px rgba(0,0,0,.24);backdrop-filter:blur(18px)}.etu-brand{display:flex;align-items:center;gap:11px}.etu-brand-mark{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;color:var(--etu-gold);font-size:25px;background:linear-gradient(145deg,rgba(88,200,255,.17),rgba(154,130,255,.2));border:1px solid var(--etu-line)}.etu-brand strong{font-size:19px;letter-spacing:1.6px}.etu-brand em{color:var(--etu-gold);font-style:normal}.etu-brand small{display:block;color:var(--etu-muted);font-size:9px;letter-spacing:1.5px;margin-top:2px}.etu-top-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.etu-local-state{font-size:11px;color:#b9eed6;display:flex;align-items:center;gap:6px}.etu-local-state i{width:7px;height:7px;border-radius:50%;background:#55e0a5;box-shadow:0 0 10px #55e0a5}.etu-top-btn,.etu-outline{border:1px solid var(--etu-line);background:rgba(255,255,255,.045);color:var(--etu-text);border-radius:11px;padding:9px 11px;font-size:12px}.etu-main{max-width:1420px;margin:auto;min-height:calc(100vh - 190px)}
    .etu-hero{position:relative;overflow:hidden;isolation:isolate;min-height:172px;border:1px solid var(--etu-line);border-radius:22px;padding:24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:20px;background:linear-gradient(115deg,rgba(25,76,131,.72),rgba(48,38,104,.76)),var(--etu-panel);box-shadow:0 18px 50px rgba(0,0,0,.2)}.etu-hero:before{content:"";position:absolute;inset:0;z-index:-1;opacity:.5;background:radial-gradient(circle at 90% 15%,rgba(233,197,111,.32),transparent 28%),repeating-linear-gradient(135deg,transparent 0 22px,rgba(255,255,255,.035) 23px 24px)}.etu-hero[data-theme="bots"]{background:linear-gradient(120deg,rgba(19,92,93,.82),rgba(47,42,107,.85))}.etu-hero[data-theme="assistant"]{background:linear-gradient(120deg,rgba(52,57,124,.82),rgba(26,85,104,.83))}.etu-hero[data-theme="warehouse"]{background:linear-gradient(120deg,rgba(14,83,100,.8),rgba(31,47,91,.85))}.etu-hero[data-theme="store"]{background:linear-gradient(120deg,rgba(98,68,22,.82),rgba(65,45,105,.82))}.etu-hero[data-theme="discussions"]{background:linear-gradient(120deg,rgba(27,70,112,.85),rgba(73,44,119,.83))}.etu-hero[data-theme="sections"]{background:linear-gradient(120deg,rgba(48,53,112,.82),rgba(22,79,100,.83))}.etu-hero[data-theme="account"]{background:linear-gradient(120deg,rgba(72,49,106,.83),rgba(32,52,93,.86))}.etu-eyebrow{font-size:10px;letter-spacing:2px;color:var(--etu-gold);font-weight:800}.etu-hero h1{font-size:clamp(25px,4vw,39px);margin:8px 0 6px}.etu-hero h1 em{font-style:normal;color:var(--etu-gold)}.etu-hero p{margin:0 0 9px;color:#e0e2f5;max-width:730px;line-height:1.8}.etu-hero small{display:block;color:#c1c8e3;line-height:1.7;max-width:770px}.etu-eagle{width:116px;height:116px;flex:0 0 116px;display:grid;place-items:center;border:1px solid rgba(233,197,111,.34);border-radius:50%;background:rgba(8,12,29,.35);box-shadow:inset 0 0 25px rgba(233,197,111,.1),0 0 38px rgba(88,200,255,.14)}.etu-eagle img{width:85px;height:85px;object-fit:contain}.etu-eagle span{display:none;font-size:45px;color:var(--etu-gold)}.etu-eagle img:not([src]),.etu-eagle img[src=""]{display:none}.etu-eagle img[style*="display: none"]+span{display:block}
    .etu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.etu-card{background:var(--etu-panel);border:1px solid var(--etu-line);border-radius:18px;padding:17px;box-shadow:0 12px 34px rgba(0,0,0,.16);min-width:0}.etu-card h2,.etu-card h3{margin:0 0 12px}.etu-card p{color:#d7d9ec;line-height:1.75}.etu-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:18px 2px 10px}.etu-section-head h2{font-size:19px;margin:0}.etu-section-head small{color:var(--etu-muted)}.etu-compose label,.etu-field{display:block;color:#e9e9f7;font-size:13px;font-weight:700;margin-bottom:8px}.etu-compose input,.etu-compose textarea,.etu-compose select,.etu-search input,.etu-search select,.etu-card input,.etu-card textarea,.etu-card select{width:100%;background:rgba(4,8,23,.7);color:var(--etu-text);border:1px solid var(--etu-line);border-radius:12px;padding:12px;margin:0 0 10px;min-width:0}.etu-compose textarea,.etu-card textarea{min-height:92px;resize:vertical}.etu-compose input::placeholder,.etu-compose textarea::placeholder,.etu-search input::placeholder{color:#858cae}.etu-primary{border:1px solid rgba(233,197,111,.55);border-radius:12px;padding:10px 16px;background:linear-gradient(110deg,#b88a37,#e9c56f);color:#171322;font-weight:850}.etu-primary:hover{filter:brightness(1.08)}.etu-inline-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.etu-note{color:var(--etu-muted);font-size:11px;line-height:1.7}.etu-empty{border:1px dashed var(--etu-line);border-radius:16px;padding:24px;text-align:center;color:var(--etu-muted);background:rgba(255,255,255,.02)}
    .etu-search{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:14px}.etu-search input{flex:1 1 230px;margin:0}.etu-search select{width:auto;min-width:150px;margin:0}.etu-search-modes{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.etu-chip{border:1px solid var(--etu-line);border-radius:99px;background:rgba(255,255,255,.035);color:#d8dcf4;padding:7px 11px;font-size:11px}.etu-chip.active,.etu-chip[aria-pressed="true"]{background:rgba(88,200,255,.15);border-color:rgba(88,200,255,.6);color:#fff}.etu-feed{display:grid;gap:11px}.etu-post-head{display:flex;align-items:center;gap:10px}.etu-avatar{width:38px;height:38px;border-radius:13px;background:linear-gradient(135deg,rgba(88,200,255,.25),rgba(154,130,255,.35));display:grid;place-items:center;border:1px solid var(--etu-line);color:#fff;font-weight:800}.etu-post-head b{display:block}.etu-post-head small{color:var(--etu-muted);font-size:10px}.etu-tag{margin-right:auto;color:var(--etu-gold);font-size:10px;border:1px solid rgba(233,197,111,.28);border-radius:99px;padding:5px 8px}.etu-post-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.85;color:#f2f1fa;margin:14px 0}.etu-post-actions{display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--etu-line);padding-top:10px}.etu-post-actions button{background:none;color:#c8d9ff;border:0;padding:5px;font-size:12px}.etu-comment-list{margin-top:10px;border-right:2px solid rgba(88,200,255,.32);padding-right:10px;display:grid;gap:6px}.etu-comment{font-size:12px;color:#c6cbe1}.etu-comment b{color:var(--etu-gold)}
    .etu-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:12px 0}.etu-stat{padding:13px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid var(--etu-line)}.etu-stat b{display:block;color:var(--etu-gold);font-size:22px}.etu-stat small{color:var(--etu-muted);font-size:10px}.etu-market-item,.etu-project-item,.etu-message-item{background:rgba(255,255,255,.025);border:1px solid var(--etu-line);border-radius:14px;padding:13px}.etu-market-item p,.etu-project-item p,.etu-message-item p{margin:8px 0;overflow-wrap:anywhere}.etu-feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.etu-feature{background:rgba(255,255,255,.035);border:1px solid var(--etu-line);color:var(--etu-text);border-radius:12px;padding:11px;text-align:right;min-height:75px}.etu-feature b{display:block;font-size:12px;line-height:1.6}.etu-feature small{display:block;color:var(--etu-muted);font-size:10px;margin-top:5px}.etu-feature.active{border-color:rgba(233,197,111,.65);background:rgba(233,197,111,.1)}.etu-processors{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.etu-processor{border:1px solid var(--etu-line);border-radius:12px;padding:11px;background:rgba(255,255,255,.025);font-size:12px}.etu-processor small{display:block;color:var(--etu-muted);margin-top:4px}.etu-report{background:#050817;border:1px solid var(--etu-line);border-radius:12px;color:#c8efd9;padding:12px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:250px;overflow:auto;font-size:11px;line-height:1.7}.etu-launch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.etu-launch-card{width:100%;text-align:right;background:rgba(255,255,255,.035);border:1px solid var(--etu-line);border-radius:13px;padding:13px;color:var(--etu-text)}.etu-launch-card b{display:block}.etu-launch-card small{display:block;color:var(--etu-muted);margin-top:5px}.etu-id{font-size:12px;color:var(--etu-gold);direction:ltr;text-align:right;overflow-wrap:anywhere}
    .etu-support-list{display:grid;gap:8px}.etu-support-link{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid var(--etu-line);border-radius:12px;padding:12px;text-decoration:none;color:var(--etu-text);background:rgba(255,255,255,.025)}.etu-support-link b{color:var(--etu-gold);direction:ltr}.etu-books-placeholder{max-width:1420px;margin:18px auto 12px;padding:13px 16px;border:1px dashed var(--etu-line);border-radius:14px;background:rgba(255,255,255,.025);color:var(--etu-muted);display:flex;align-items:center;gap:9px;font-size:13px}.etu-books-placeholder small{margin-right:auto;color:var(--etu-gold)}.etu-bottom-nav{position:fixed;z-index:10020;left:50%;bottom:max(10px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(760px,calc(100vw - 18px));display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;padding:8px;border-radius:20px;background:rgba(9,13,31,.96);border:1px solid rgba(135,154,255,.32);box-shadow:0 18px 55px rgba(0,0,0,.45);backdrop-filter:blur(20px)}.etu-nav-item{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:0;min-height:58px;border:1px solid transparent;border-radius:13px;background:transparent;color:#b7bdd9}.etu-nav-item span{font-size:20px;line-height:1}.etu-nav-item b{font-size:10px;font-weight:650}.etu-nav-item.active{color:var(--etu-gold);background:linear-gradient(145deg,rgba(88,200,255,.13),rgba(154,130,255,.15));border-color:rgba(233,197,111,.36)}.etu-toast{position:fixed;z-index:10030;bottom:94px;left:50%;transform:translate(-50%,12px);opacity:0;pointer-events:none;background:#151c37;border:1px solid var(--etu-line);color:#fff;border-radius:12px;padding:11px 15px;max-width:min(92vw,520px);font-size:12px;box-shadow:0 10px 34px rgba(0,0,0,.35);transition:.2s}.etu-toast.show{opacity:1;transform:translate(-50%,0)}.etu-back{background:none;border:0;color:var(--etu-blue);padding:4px}.etu-helper{padding:12px;border-right:3px solid var(--etu-gold);border-radius:10px;background:rgba(233,197,111,.07);color:#ddd9ca;font-size:11px;line-height:1.8}
    #eskoTitanUpdateRoot.etu-old-mode{display:none!important}.etu-return{position:fixed;z-index:10025;bottom:12px;left:50%;transform:translateX(-50%);border:1px solid var(--etu-line);background:#141b38;color:#fff;border-radius:999px;padding:11px 17px;box-shadow:0 12px 35px rgba(0,0,0,.35)}
    @media(max-width:760px){#eskoTitanUpdateRoot{padding:8px 9px 100px}.etu-topbar{padding:10px;border-radius:15px;align-items:flex-start}.etu-brand strong{font-size:15px}.etu-brand-mark{width:36px;height:36px}.etu-top-actions{justify-content:flex-end}.etu-local-state{display:none}.etu-top-btn{font-size:10px;padding:8px}.etu-hero{padding:18px;min-height:150px}.etu-eagle{width:76px;height:76px;flex-basis:76px}.etu-eagle img{width:59px;height:59px}.etu-grid{grid-template-columns:1fr}.etu-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.etu-launch-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.etu-nav-item{min-height:54px}.etu-nav-item span{font-size:18px}.etu-nav-item b{font-size:9px}.etu-bottom-nav{gap:2px;padding:5px}.etu-processors{grid-template-columns:1fr}}
    @media(max-width:390px){.etu-brand small{font-size:8px}.etu-top-btn{font-size:9px;padding:7px}.etu-hero{gap:8px}.etu-eagle{width:58px;height:58px;flex-basis:58px}.etu-eagle img{width:45px;height:45px}.etu-nav-item b{font-size:8px}}
    @media(prefers-reduced-motion:reduce){#eskoTitanUpdateRoot *{scroll-behavior:auto!important;transition:none!important}}
  `;

  function buildFeatureList(hub) { return featureCatalog[hub.key]; }
  function hubByKey(key) { return hubDefinitions.find((hub) => hub.key === key) || hubDefinitions[0]; }
  let activeHub = 'home';
  let searchMode = 'posts';
  let searchQuery = '';
  let featureFilter = '';
  let processorReport = '';
  let pendingMessage = '';
  let oldMode = false;

  function appShell() { return $('#appShell'); }
  function activateShell() {
    const shell = appShell();
    if (!shell || shell.classList.contains('hidden')) return;
    if (!root.isConnected) shell.appendChild(root);
    shell.classList.add('etu-enabled');
    if (!style.isConnected) document.head.appendChild(style);
    if (oldMode) return;
    root.classList.remove('etu-old-mode');
    render();
  }

  function postCard(post) {
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const liked = Array.isArray(post.likes) && post.likes.includes(state.profile.id);
    return `<article class="etu-card" data-post-card="${escapeHTML(post.id)}">
      <div class="etu-post-head"><div class="etu-avatar">${escapeHTML((post.name || 'E').slice(0, 1))}</div><div><b>${escapeHTML(post.name || 'عضو ESKO')}</b><small>${escapeHTML(post.userId || 'معرّف محلي')} · ${escapeHTML(formatDate(post.createdAt))}</small></div><span class="etu-tag">منشور محلي</span></div>
      <p class="etu-post-text">${escapeHTML(post.text)}</p>
      <div class="etu-post-actions"><button type="button" data-action="like" data-id="${escapeHTML(post.id)}">${liked ? '♥' : '♡'} ${Array.isArray(post.likes) ? post.likes.length : 0} إعجاب</button><button type="button" data-action="focus-comment" data-id="${escapeHTML(post.id)}">💬 ${comments.length} تعليق</button></div>
      <div class="etu-comment-list">${comments.slice(-4).map((comment) => `<div class="etu-comment"><b>${escapeHTML(comment.name)}:</b> ${escapeHTML(comment.text)}</div>`).join('')}</div>
      <form class="etu-inline-comment" data-form="comment" data-id="${escapeHTML(post.id)}"><input name="comment" maxlength="300" placeholder="اكتب تعليقًا..." required aria-label="تعليق على المنشور"><button class="etu-outline" type="submit">إرسال</button></form>
    </article>`;
  }

  function listingCard(item) {
    return `<article class="etu-market-item"><div class="etu-post-head"><div class="etu-avatar">▣</div><div><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.category)} · ${escapeHTML(formatDate(item.createdAt))}</small></div><span class="etu-tag">عرض تجريبي</span></div><p>${escapeHTML(item.description)}</p><div class="etu-inline-actions"><button type="button" class="etu-outline" data-action="negotiate" data-id="${escapeHTML(item.id)}">بدء تفاوض تجريبي</button></div></article>`;
  }

  function searchResults() {
    const query = cleanText(searchQuery).toLocaleLowerCase();
    if (!query) return '<div class="etu-empty">اكتب كلمة للبحث. البحث يعمل على البيانات الموجودة في هذا المتصفح.</div>';
    let results = [];
    if (searchMode === 'posts') {
      results = state.posts.filter((post) => `${post.text} ${post.name}`.toLocaleLowerCase().includes(query)).map(postCard);
    } else if (searchMode === 'people') {
      const people = unique([state.profile.name, ...state.posts.map((post) => post.name)]).filter((name) => String(name).toLocaleLowerCase().includes(query));
      results = people.map((name) => `<div class="etu-card"><b>${escapeHTML(name)}</b><p class="etu-note">ملفات محلية ظهرت في بيانات هذا المتصفح فقط.</p></div>`);
    } else if (searchMode === 'tags') {
      results = state.posts.filter((post) => post.text.toLocaleLowerCase().includes(`#${query}`) || post.text.toLocaleLowerCase().includes(query)).map(postCard);
    } else if (searchMode === 'market') {
      results = state.listings.filter((item) => `${item.title} ${item.description} ${item.category}`.toLocaleLowerCase().includes(query)).map(listingCard);
    } else if (searchMode === 'sections') {
      results = hubDefinitions.filter((hub) => `${hub.title} ${hub.subtitle} ${buildFeatureList(hub).join(' ')}`.toLocaleLowerCase().includes(query)).map((hub) => `<button type="button" class="etu-launch-card" data-hub="${hub.key}"><b>${hub.icon} ${escapeHTML(hub.title)}</b><small>${escapeHTML(hub.subtitle)}</small></button>`);
    }
    return results.length ? `<div class="etu-feed">${results.join('')}</div>` : '<div class="etu-empty">لا توجد نتائج مطابقة في البيانات المحلية.</div>';
  }

  function communityPanel() {
    const messages = state.messages.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5);
    return `<section class="etu-card"><div class="etu-section-head"><h2>المناقشات داخل البيت</h2><small>${state.messages.length} رسالة محلية</small></div>
      <form class="etu-compose" data-form="message"><label>رسالة للمجتمع المحلي</label><select name="room"><option>الساحة العامة</option><option>مجموعة المطورين</option><option>قناة المساعدة</option><option>تفاوض المتجر</option></select><textarea name="text" maxlength="1200" required placeholder="اكتب رسالة أو سؤالًا..."></textarea><button class="etu-primary" type="submit">إرسال محلي</button></form>
      <div class="etu-feed">${messages.length ? messages.map((message) => `<article class="etu-message-item"><b>${escapeHTML(message.name || 'عضو ESKO')}</b><small> · ${escapeHTML(message.room || 'الساحة العامة')} · ${escapeHTML(formatDate(message.createdAt))}</small><p>${escapeHTML(message.text)}</p></article>`).join('') : '<div class="etu-empty">لا توجد رسائل بعد.</div>'}</div><p class="etu-note">المناقشات محفوظة في هذا المتصفح فقط؛ لا توجد مزامنة بين المستخدمين.</p></section>`;
  }

  function homeView() {
    const feed = state.posts.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return `<section class="etu-hero" data-theme="home"><div><span class="etu-eyebrow">SOCIAL UNIVERSE · ESKO</span><h1>البيت الرقمي لـ <em>ESKO</em></h1><p>شارك أفكارك ومشاريعك وتفاعل مع منشوراتك من مساحة واحدة.</p><small>المنشورات والتعليقات هنا محفوظة على هذا الجهاز. ظهورها للآخرين يحتاج خادم مجتمع.</small></div><div class="etu-eagle"><img src="assets/esko-eagle-v5.webp" alt="نسر ESKO"><span>♛</span></div></section>
      <section class="etu-card"><div class="etu-search"><input id="etuSearchInput" type="search" value="${escapeHTML(searchQuery)}" placeholder="ابحث في مجتمع ESKO..." aria-label="بحث في مجتمع ESKO"></div><div class="etu-search-modes">${[['posts','المنشورات'],['people','الأشخاص'],['tags','الوسوم'],['market','المتجر'],['sections','الأقسام']].map(([key, label]) => `<button type="button" class="etu-chip ${searchMode === key ? 'active' : ''}" data-search-mode="${key}" aria-pressed="${searchMode === key}">${label}</button>`).join('')}</div>${searchQuery ? `<div class="etu-section-head"><h2>نتائج البحث</h2><button class="etu-back" data-action="clear-search">مسح البحث</button></div>${searchResults()}` : ''}</section>
      <form class="etu-card etu-compose" data-form="post"><label for="etuPostText">إنشاء منشور</label><textarea id="etuPostText" name="text" maxlength="1200" required placeholder="شارك فكرة أو مشروعًا أو سؤالًا..."></textarea><div class="etu-inline-actions"><button class="etu-primary" type="submit">نشر في البيت</button><span class="etu-note">تجنب نشر رقم الهاتف أو بيانات الدخول أو المعلومات الخاصة.</span></div></form>
      <div class="etu-section-head"><h2>آخر المنشورات</h2><small>${feed.length} منشور محلي</small></div><div class="etu-feed">${feed.length ? feed.map(postCard).join('') : '<div class="etu-empty">لا توجد منشورات بعد. ابدأ أول منشور في مجتمع ESKO.</div>'}</div>
      ${communityPanel()}`;
  }

  function botsView() {
    const bots = state.bots.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return `<section class="etu-hero" data-theme="bots"><div><span class="etu-eyebrow">BOT WORKSPACE</span><h1>البوتات</h1><p>قوالب البوتات ومسودات إعداد أوامرها.</p><small>يتوفر في الحزمة كتالوج قوالب؛ النموذج أدناه ينشئ ملف إعداد JSON محليًا فقط. لا ينشئ كود تشغيل، ولا يتصل بواتساب أو تيليجرام أو أي حساب، ولا تطلب منه إدخال رمز وصول.</small></div><div class="etu-eagle"><span style="display:block">⚙</span></div></section>
      <div class="etu-stats"><div class="etu-stat"><b>60</b><small>قالبًا في الكتالوج</small></div><div class="etu-stat"><b>${bots.length}</b><small>مسودات محلية</small></div><div class="etu-stat"><b>100</b><small>حد أمر لكل مسودة</small></div></div>
      <form class="etu-card etu-compose" data-form="bot"><label>اسم البوت</label><input name="name" maxlength="50" required pattern="[A-Za-z0-9_ء-ي -]{2,50}" placeholder="مثال: ESKO Helper"><label>وصف البوت</label><textarea name="description" maxlength="500" placeholder="ما المهمة التي صُمم لها؟"></textarea><label>الأوامر (سطر لكل أمر)</label><textarea name="commands" rows="7" required maxlength="16000" placeholder="/start | بدء الاستخدام
/help | عرض المساعدة"></textarea><small class="etu-note">الصيغة: /command | وصف الأمر. حتى 100 أمر، دون رموز سرية أو كلمات مرور.</small><button class="etu-primary" type="submit">حفظ مسودة إعداد البوت</button></form>
      <div class="etu-section-head"><h2>مسوداتك</h2><small>${bots.length} مسودة</small></div><div class="etu-feed">${bots.length ? bots.map((bot) => `<article class="etu-project-item"><div class="etu-post-head"><b>${escapeHTML(bot.name)}</b><span class="etu-tag">مسودة محلية</span></div><p>${escapeHTML(bot.description || 'بدون وصف')}</p><small>${(bot.commands || []).length} أمرًا · ${escapeHTML(formatDate(bot.createdAt))}</small><div class="etu-inline-actions" style="margin-top:10px"><button type="button" class="etu-outline" data-action="export-bot" data-id="${escapeHTML(bot.id)}">تصدير JSON</button><button type="button" class="etu-outline" data-action="delete-bot" data-id="${escapeHTML(bot.id)}">حذف المسودة</button></div></article>`).join('') : '<div class="etu-empty">لم تنشئ مسودات بعد.</div>'}</div>
      <section class="etu-card"><h3>كتالوج القوالب</h3><p class="etu-note">توجد 60 بطاقة قالب في كتالوج V5.0.1. القوالب لا تعني أن كل منصة أو وصلة تشغيل مهيأة تلقائيًا.</p><button type="button" class="etu-outline" data-action="old-page" data-page="ai-factory">فتح مصنع الأدوات الأصلي</button></section>`;
  }

  function assistantView() {
    return `<section class="etu-hero" data-theme="assistant"><div><span class="etu-eyebrow">ESKO ASSISTANT</span><h1>المساعد</h1><p>مركز الوصول إلى أدوات المساعدة والمواد الموجودة بالموقع.</p><small>المساعد التوليدي غير متصل في هذه النسخة؛ المعالجات المحلية تنظّم البيانات ولا تُعد نموذج ذكاء اصطناعي. لا تُدخل كلمات مرور أو مفاتيح API أو بيانات شخصية.</small></div><div class="etu-eagle"><span style="display:block">✧</span></div></section>
      <section class="etu-card"><h3>أدوات المساعدة القديمة</h3><p>تستطيع فتح واجهات AI الموجودة في النسخة الأصلية، لكن وجود الواجهة وحده لا يثبت أن خدمة نموذج أو API متصلة.</p><div class="etu-inline-actions"><button type="button" class="etu-primary" data-action="old-page" data-page="ai-studio">فتح AI Studio</button><button type="button" class="etu-outline" data-action="old-page" data-page="education">المحتوى التعليمي</button><button type="button" class="etu-outline" data-action="old-page" data-page="knowledge-galaxy">مصادر المعرفة</button></div></section>
      <p class="etu-note">لوحة المعالجات المحلية للقسم تظهر مرة واحدة أسفل هذه الصفحة.</p>`;
  }

  function warehouseView() {
    const projects = state.projects.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return `<section class="etu-hero" data-theme="warehouse"><div><span class="etu-eyebrow">PROJECT VAULT</span><h1>المستودعات</h1><p>أنشئ بطاقة لكل مشروع، واحفظ وصفه وملاحظاته محليًا.</p><small>هذا المستودع محلي. مزامنة الملفات بين الأجهزة تحتاج مساحة تخزين وخادمًا.</small></div><div class="etu-eagle"><span style="display:block">▣</span></div></section>
      <div class="etu-stats"><div class="etu-stat"><b>${projects.length}</b><small>مشروع</small></div><div class="etu-stat"><b>${state.posts.length}</b><small>منشور</small></div><div class="etu-stat"><b>${state.enabledFeatures.length}</b><small>ميزة محفوظة</small></div></div>
      <form class="etu-card etu-compose" data-form="project"><label>إضافة مشروع للمستودع</label><input name="name" maxlength="80" required placeholder="اسم المشروع"><textarea name="description" maxlength="1000" placeholder="وصف المشروع أو ملاحظاتك..."></textarea><button class="etu-primary" type="submit">حفظ المشروع</button></form>
      <div class="etu-section-head"><h2>مشاريعي</h2><small>${projects.length} عنصر</small></div><div class="etu-feed">${projects.length ? projects.map((project) => `<article class="etu-project-item"><div class="etu-post-head"><b>${escapeHTML(project.name)}</b><span class="etu-tag">${escapeHTML(formatDate(project.createdAt))}</span></div><p>${escapeHTML(project.description || 'بدون وصف')}</p><button type="button" class="etu-outline" data-action="delete-project" data-id="${escapeHTML(project.id)}">حذف من المستودع المحلي</button></article>`).join('') : '<div class="etu-empty">المستودع فارغ. أضف مشروعك الأول.</div>'}</div>
      <div class="etu-card"><h3>أدوات النسخ الاحتياطي</h3><p class="etu-note">يمكنك تصدير نسخة JSON من بيانات ESKO المحلية ثم استيرادها على متصفح آخر.</p><div class="etu-inline-actions"><button type="button" class="etu-primary" data-action="export">تصدير البيانات</button><button type="button" class="etu-outline" data-action="import">استيراد نسخة</button></div></div>`;
  }

  function storeView() {
    const listings = state.listings.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return `<section class="etu-hero" data-theme="store"><div><span class="etu-eyebrow">CREATOR MARKET</span><h1>المتجر الإلكتروني</h1><p>اعرض أدواتك وبوتاتك وقوالبك، وتواصل للتفاهم حول التفاصيل.</p><small>العروض والتفاوض هنا تجريبية ومحلية. لا توجد مدفوعات أو تسليم تلقائي للمنتجات في هذا الملف.</small></div><div class="etu-eagle"><span style="display:block">🛒</span></div></section>
      <form class="etu-card etu-compose" data-form="listing"><label>إضافة عرض</label><input name="title" maxlength="70" required placeholder="اسم الأداة أو المنتج"><select name="category"><option>أداة</option><option>بوت</option><option>قالب</option><option>إضافة</option><option>منتج رقمي</option></select><textarea name="description" maxlength="700" required placeholder="اشرح ما الذي يقدمه العرض..."></textarea><button class="etu-primary" type="submit">نشر العرض محليًا</button></form>
      <div class="etu-section-head"><h2>عروض المجتمع</h2><small>${listings.length} عرض محلي</small></div><div class="etu-feed">${listings.length ? listings.map(listingCard).join('') : '<div class="etu-empty">لا توجد عروض بعد. يمكنك إضافة أول عرض تجريبي.</div>'}</div>`;
  }

  function discussionsView() {
    const messages = state.messages.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return `<section class="etu-hero" data-theme="discussions"><div><span class="etu-eyebrow">COMMUNITY ROOMS</span><h1>المناقشات</h1><p>ساحة عامة وغرف للمطورين والمساعدة والتفاوض التجريبي.</p><small>الرسائل محفوظة في متصفحك فقط ولا تصل إلى مستخدمين آخرين قبل ربط خادم آمن.</small></div><div class="etu-eagle"><span style="display:block">◎</span></div></section>
      <form class="etu-card etu-compose" data-form="message"><label>رسالة جديدة</label><select name="room"><option>الساحة العامة</option><option>مجموعة المطورين</option><option>قناة المساعدة</option><option>تفاوض المتجر</option></select><textarea name="text" maxlength="1200" required placeholder="اكتب رسالتك..."></textarea><button class="etu-primary" type="submit">إرسال وحفظ الرسالة</button></form>
      <div class="etu-section-head"><h2>سجل المناقشات</h2><small>${messages.length} رسالة محلية</small></div><div class="etu-feed">${messages.length ? messages.map((message) => `<article class="etu-message-item"><div class="etu-post-head"><div class="etu-avatar">${escapeHTML((message.name || 'E').slice(0, 1))}</div><div><b>${escapeHTML(message.name)}</b><small>${escapeHTML(message.room)} · ${escapeHTML(formatDate(message.createdAt))}</small></div></div><p>${escapeHTML(message.text)}</p></article>`).join('') : '<div class="etu-empty">لا توجد رسائل بعد. ابدأ المحادثة المحلية الأولى.</div>'}</div>
      <section class="etu-card"><h3>قنوات الدعم</h3><p class="etu-note">اختر قناة ESKO المناسبة للتواصل.</p><div class="etu-support-list">${SUPPORT_CONTACTS.map((contact) => `<a class="etu-support-link" href="${escapeHTML(contact.url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHTML(contact.label)}</span><b>فتح القناة</b></a>`).join('')}</div></section>`;
  }

  function sectionsView() {
    const oldButtons = $$('.nav-item[data-page]');
    const shortcuts = oldButtons.map((button) => `<button type="button" class="etu-launch-card" data-action="old-page" data-page="${escapeHTML(button.dataset.page)}"><b>${escapeHTML(button.textContent.trim())}</b><small>فتح الوحدة الموجودة في الموقع الأصلي</small></button>`).join('');
    return `<section class="etu-hero" data-theme="sections"><div><span class="etu-eyebrow">ALL MODULES · TITAN</span><h1>الأقسام</h1><p>مركز يجمع أقسام ESKO الحالية والكتالوج الجديد للميزات.</p><small>الوحدات القديمة تبقى متاحة من هنا ويمكن الرجوع لواجهة الموقع الأصلية في أي وقت.</small></div><div class="etu-eagle"><span style="display:block">▦</span></div></section>
      <section class="etu-card"><h3>الأقسام الستة الجديدة</h3><div class="etu-launch-grid">${hubDefinitions.map((hub) => `<button type="button" class="etu-launch-card" data-hub="${hub.key}"><b>${hub.icon} ${escapeHTML(hub.title)}</b><small>${escapeHTML(hub.subtitle)} · 60 ميزة</small></button>`).join('')}</div></section>
      <section class="etu-card"><h3>الأقسام الموجودة في النسخة الحالية</h3><div class="etu-launch-grid">${shortcuts || '<p class="etu-note">لم يتم العثور على قائمة الأقسام القديمة.</p>'}</div></section>
      <section class="etu-card"><h3>مساعد الذكاء الاصطناعي</h3><p>يمكن فتح أدوات AI الموجودة بالموقع الأصلي، لكن هذا الملف لا يضم نموذجًا توليديًا ولا يرسل أسئلتك إلى خدمة خارجية.</p><button type="button" class="etu-outline" data-action="old-page" data-page="ai-studio">فتح AI Studio الأصلي</button></section>`;
  }

  function processorPanel(hub) {
    const hubIndex = hubDefinitions.findIndex((item) => item.key === hub.key);
    const startIndex = hubDefinitions.slice(0, hubIndex).reduce((sum, item) => sum + item.processors, 0);
    const processors = processorDefinitions.slice(startIndex, startIndex + hub.processors);
    return `<section class="etu-card"><div class="etu-section-head"><h2>معالجات ${escapeHTML(hub.title)}</h2><small>${hub.processors} معالجًا</small></div><p class="etu-note">هذه معالجات JavaScript محلية لتنظيم البيانات والتحقق منها. لا تغيّر تردد المعالج أو قدرات الجهاز.</p><div class="etu-processors">${processors.map((processor) => `<div class="etu-processor"><b>${String(processor.id).padStart(2, '0')} · ${escapeHTML(processor.name)}</b><small>فحص محلي قابل للتشغيل</small></div>`).join('')}</div><div class="etu-inline-actions" style="margin-top:12px"><button type="button" class="etu-primary" data-action="run-processors" data-start="${startIndex}" data-count="${hub.processors}">تشغيل معالجات القسم</button></div>${processorReport ? `<pre class="etu-report">${escapeHTML(processorReport)}</pre>` : ''}</section>`;
  }

  function featureView() {
    const hub = hubByKey(activeHub);
    const features = buildFeatureList(hub);
    const filtered = features.map((name, index) => ({ name, index })).filter((item) => item.name.toLocaleLowerCase().includes(featureFilter.toLocaleLowerCase()));
    return `<section class="etu-hero" data-theme="${hub.theme}"><div><span class="etu-eyebrow">TITAN FEATURE MAP · 60 ITEMS</span><h1>${hub.icon} ${escapeHTML(hub.title)}</h1><p>${escapeHTML(hub.subtitle)} — كتالوج من 60 بندًا تنظيميًا للقسم.</p><small>يمكن حفظ المفضلة محليًا. بعض الأفكار المتقدمة تحتاج خدمات خلفية حتى تصبح متعددة المستخدمين.</small></div><div class="etu-eagle"><span style="display:block">${hub.icon}</span></div></section>
      <div class="etu-stats"><div class="etu-stat"><b>60</b><small>بند في الكتالوج</small></div><div class="etu-stat"><b>${hub.processors}</b><small>معالجات</small></div><div class="etu-stat"><b>${state.enabledFeatures.filter((item) => item.startsWith(`${hub.key}:`)).length}</b><small>بنود محفوظة</small></div></div>
      <section class="etu-card"><div class="etu-search"><input id="etuFeatureSearch" type="search" value="${escapeHTML(featureFilter)}" placeholder="ابحث داخل ميزات القسم..." aria-label="بحث داخل ميزات القسم"></div><div class="etu-feature-grid">${filtered.map((item) => { const id = `${hub.key}:${item.index}`; const enabled = state.enabledFeatures.includes(id); return `<button type="button" class="etu-feature ${enabled ? 'active' : ''}" data-action="toggle-feature" data-id="${id}" aria-pressed="${enabled}"><b>${escapeHTML(item.name)}</b><small>${enabled ? 'محفوظة في المفضلة' : 'اضغط لحفظها في المفضلة'}</small></button>`; }).join('') || '<div class="etu-empty">لا توجد ميزة بهذا الاسم.</div>'}</div><p class="etu-note">المعروض بنود كتالوج تنظيمية؛ الضغط يحفظ اختيارك فقط ولا ينفذ خدمة خلفية.</p></section>
      ${processorPanel(hub)}`;
  }

  function accountView() {
    const profile = state.profile;
    return `<section class="etu-hero" data-theme="account"><div><span class="etu-eyebrow">YOUR ESKO IDENTITY</span><h1>الحساب</h1><p>إدارة ملفك ومعرف ESKO وبياناتك المحلية.</p><small>المعرّف الحالي محلي لهذا المتصفح وليس حسابًا عالميًا موثقًا.</small></div><div class="etu-eagle"><span style="display:block">♙</span></div></section>
      <section class="etu-card"><label class="etu-field">معرّف ESKO</label><div class="etu-id">${escapeHTML(profile.id)}</div><div class="etu-inline-actions" style="margin-top:10px"><button type="button" class="etu-outline" data-action="copy-id">نسخ المعرّف</button></div></section>
      <form class="etu-card etu-compose" data-form="profile"><label>اسم العرض</label><input name="name" maxlength="40" value="${escapeHTML(profile.name)}" required><label>نبذة قصيرة</label><textarea name="bio" maxlength="180">${escapeHTML(profile.bio || '')}</textarea><button type="submit" class="etu-primary">حفظ الملف الشخصي</button></form>
      <section class="etu-card"><h3>ملخص النشاط المحلي</h3><div class="etu-stats"><div class="etu-stat"><b>${state.posts.length}</b><small>منشورات</small></div><div class="etu-stat"><b>${state.projects.length}</b><small>مشاريع</small></div><div class="etu-stat"><b>${state.listings.length}</b><small>عروض</small></div></div><p class="etu-note">البيانات لا تُرفع تلقائيًا إلى خادم أو حساب عام.</p><div class="etu-inline-actions"><button type="button" class="etu-primary" data-action="export">تصدير نسخة بياناتك</button><button type="button" class="etu-outline" data-action="import">استيراد نسخة</button></div></section>
      <section class="etu-card"><h3>قنوات الدعم</h3><div class="etu-support-list">${SUPPORT_CONTACTS.map((contact) => `<a class="etu-support-link" href="${escapeHTML(contact.url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHTML(contact.label)}</span><b>فتح القناة</b></a>`).join('')}</div></section>`;
  }

  function sectionExtras(key) {
    const hub = hubByKey(key);
    const items = buildFeatureList(hub).map((name, index) => ({ name, index }))
      .filter((item) => item.name.toLocaleLowerCase().includes(featureFilter.toLocaleLowerCase()));
    return `<section class="etu-card"><div class="etu-section-head"><h2>كتالوج قسم ${escapeHTML(hub.title)}</h2><small>60 بندًا تنظيميًا</small></div>
      <div class="etu-search"><input id="etuFeatureSearch" type="search" value="${escapeHTML(featureFilter)}" placeholder="ابحث داخل بنود القسم..." aria-label="بحث داخل كتالوج القسم"></div>
      <div class="etu-feature-grid">${items.map((item) => { const featureId = `${hub.key}:${item.index}`; const enabled = state.enabledFeatures.includes(featureId); return `<button type="button" class="etu-feature ${enabled ? 'active' : ''}" data-action="toggle-feature" data-id="${featureId}" aria-pressed="${enabled}"><b>${escapeHTML(item.name)}</b><small>${enabled ? 'محفوظ في المفضلة المحلية' : 'احفظ هذا البند في المفضلة'}</small></button>`; }).join('') || '<div class="etu-empty">لا توجد نتائج في هذا الكتالوج.</div>'}</div>
      <p class="etu-note">هذه بنود تنظيمية للكتالوج، وليست 60 خدمة منفذة. حفظ البند لا ينشئ اتصالًا أو وظيفة خلفية.</p></section>${processorPanel(hub)}`;
  }

  function render() {
    if (!root.isConnected || oldMode) return;
    const main = $('#etuMain', root);
    const hub = hubByKey(activeHub);
    root.querySelectorAll('[data-hub]').forEach((button) => button.classList.toggle('active', button.dataset.hub === activeHub));
    if (activeHub === 'home') main.innerHTML = homeView() + sectionExtras('home');
    else if (activeHub === 'bots') main.innerHTML = botsView() + sectionExtras('bots');
    else if (activeHub === 'repositories') main.innerHTML = warehouseView() + sectionExtras('repositories');
    else if (activeHub === 'store') main.innerHTML = storeView() + sectionExtras('store');
    else if (activeHub === 'assistant') main.innerHTML = assistantView() + sectionExtras('assistant');
    else if (activeHub === 'account') main.innerHTML = accountView() + sectionExtras('account');
    else main.innerHTML = featureView();
    main.insertAdjacentHTML('beforeend', '<aside class="etu-books-placeholder" aria-disabled="true"><span aria-hidden="true">📚</span><b>الكتب</b><small>تحت الإنشاء</small></aside>');
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportBackup() {
    const payload = {
      format: 'ESKO-TITAN-LOCAL-BACKUP', version: 1, exportedAt: nowISO(),
      profile: state.profile, posts: state.posts, bots: state.bots, projects: state.projects,
      listings: state.listings, messages: state.messages,
      following: state.following, enabledFeatures: state.enabledFeatures
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `esko-titan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify('تم تجهيز النسخة الاحتياطية');
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || typeof data !== 'object' || !data.profile || !Array.isArray(data.posts) || !Array.isArray(data.projects) || !Array.isArray(data.listings) || !Array.isArray(data.messages)) throw new Error('invalid');
        state.profile = { id: String(data.profile.id || makeId('ESKO')), name: String(data.profile.name || 'عضو ESKO').slice(0, 40), bio: String(data.profile.bio || '').slice(0, 180) };
        state.posts = data.posts.slice(-MAX_POSTS);
        state.bots = Array.isArray(data.bots) ? data.bots.filter((bot) => bot && typeof bot === 'object' && Array.isArray(bot.commands) && bot.commands.length <= 100).slice(-300).map((bot) => ({ id: String(bot.id || makeId('BOT')).slice(0, 80), name: cleanText(bot.name).slice(0, 50), description: cleanText(bot.description).slice(0, 500), status: 'local-draft', createdAt: String(bot.createdAt || nowISO()).slice(0, 40), commands: bot.commands.filter((command) => command && typeof command === 'object' && /^\/[a-z][a-z0-9_]{1,31}$/i.test(String(command.name || ''))).slice(0, 100).map((command) => ({ name: String(command.name).toLowerCase(), description: cleanText(command.description).slice(0, 180) })) })) : [];
        state.projects = data.projects.slice(-MAX_PROJECTS);
        state.listings = data.listings.slice(-MAX_LISTINGS);
        state.messages = data.messages.slice(-MAX_MESSAGES);
        state.following = Array.isArray(data.following) ? data.following.slice(0, 1000) : [];
        state.enabledFeatures = Array.isArray(data.enabledFeatures) ? data.enabledFeatures.slice(0, 1000) : [];
        saveState();
        render();
        notify('تم استيراد النسخة المحلية');
      } catch {
        notify('الملف غير صالح أو لا يحتوي على نسخة ESKO متوافقة');
      }
    };
    reader.readAsText(file);
  }

  function showOriginalPage(page) {
    oldMode = true;
    root.classList.add('etu-old-mode');
    const shell = appShell();
    shell?.classList.remove('etu-enabled');
    let returnButton = $('#etuReturnToUpdate');
    if (!returnButton) {
      returnButton = document.createElement('button');
      returnButton.id = 'etuReturnToUpdate';
      returnButton.type = 'button';
      returnButton.className = 'etu-return';
      returnButton.textContent = 'العودة إلى أقسام ESKO الستة';
      returnButton.addEventListener('click', returnToUpdate);
      document.body.appendChild(returnButton);
    }
    returnButton.hidden = false;
    const pageButton = $(`.nav-item[data-page="${CSS.escape(page)}"]`);
    if (pageButton) pageButton.click();
    else notify('لم يتم العثور على القسم الأصلي المطلوب');
  }

  function returnToUpdate() {
    oldMode = false;
    $('#etuReturnToUpdate')?.remove();
    const shell = appShell();
    if (shell) shell.classList.add('etu-enabled');
    root.classList.remove('etu-old-mode');
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function runProcessors(start, count) {
    const selected = processorDefinitions.slice(start, start + count);
    const lines = selected.map((processor) => {
      try {
        const value = processor.run();
        return `✓ ${processor.name}: ${String(value)}`;
      } catch (error) {
        return `! ${processor.name}: تعذّر إكمال الفحص (${error?.message || 'خطأ'})`;
      }
    });
    processorReport = lines.join('\n');
    render();
    notify(`تم تشغيل ${selected.length} معالجات محلية`);
  }

  root.addEventListener('click', async (event) => {
    const hubButton = event.target.closest('[data-hub]');
    if (hubButton) {
      activeHub = hubButton.dataset.hub;
      featureFilter = '';
      processorReport = '';
      searchQuery = '';
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const searchModeButton = event.target.closest('[data-search-mode]');
    if (searchModeButton) {
      searchMode = searchModeButton.dataset.searchMode;
      searchQuery = $('#etuSearchInput')?.value || searchQuery;
      render();
      return;
    }
    const action = event.target.closest('[data-action]');
    if (!action) return;
    const id = action.dataset.id;
    switch (action.dataset.action) {
      case 'like': {
        const post = state.posts.find((item) => item.id === id);
        if (!post) return;
        post.likes = Array.isArray(post.likes) ? post.likes : [];
        post.likes = post.likes.includes(state.profile.id) ? post.likes.filter((userId) => userId !== state.profile.id) : [...post.likes, state.profile.id];
        saveState(); render(); break;
      }
      case 'focus-comment': {
        const input = $(`form[data-form="comment"][data-id="${CSS.escape(id)}"] input`, root);
        input?.focus(); break;
      }
      case 'clear-search': searchQuery = ''; render(); break;
      case 'toggle-feature': {
        const key = id;
        state.enabledFeatures = state.enabledFeatures.includes(key) ? state.enabledFeatures.filter((item) => item !== key) : [...state.enabledFeatures, key];
        saveState(); render(); break;
      }
      case 'run-processors': runProcessors(Number(action.dataset.start) || 0, Number(action.dataset.count) || 0); break;
      case 'negotiate': {
        const listing = state.listings.find((item) => item.id === id);
        if (!listing) return;
        state.messages.push({ id: makeId('MSG'), name: state.profile.name, room: 'تفاوض المتجر', text: `أرغب في الاستفسار عن العرض: ${listing.title}`, createdAt: nowISO(), kind: 'reply' });
        activeHub = 'home'; saveState(); render(); notify('تم إنشاء رسالة تفاوض محلية'); break;
      }
      case 'export-bot': {
        const bot = state.bots.find((item) => item.id === id);
        if (!bot) return;
        downloadJson(`esko-bot-draft-${String(bot.name || 'bot').replace(/[^a-z0-9_-]/gi, '-').slice(0, 30)}.json`, {
          format: 'ESKO-BOT-CONFIG-DRAFT', status: 'local-draft', exportedAt: nowISO(),
          name: bot.name, description: bot.description, commands: bot.commands
        });
        notify('تم تصدير ملف الإعداد المحلي؛ لا يحتوي على كود تشغيل أو اتصال');
        break;
      }
      case 'delete-bot':
        state.bots = state.bots.filter((bot) => bot.id !== id);
        saveState(); render(); notify('تم حذف مسودة البوت من هذا الجهاز'); break;
      case 'delete-project':
        state.projects = state.projects.filter((project) => project.id !== id);
        saveState(); render(); notify('تم حذف المشروع من هذا الجهاز'); break;
      case 'copy-id':
        try { await navigator.clipboard.writeText(state.profile.id); notify('تم نسخ معرّف ESKO'); }
        catch { notify(`معرّف ESKO: ${state.profile.id}`); }
        break;
      case 'export': exportBackup(); break;
      case 'import': $('#etuImportFile')?.click(); break;
      case 'old-site': showOriginalPage('home'); break;
      case 'old-page': showOriginalPage(action.dataset.page); break;
      default: break;
    }
  });

  root.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.dataset.form) return;
    event.preventDefault();
    const data = new FormData(form);
    switch (form.dataset.form) {
      case 'post': {
        const text = cleanText(data.get('text')).slice(0, 1200);
        if (!text) return;
        state.posts.push({ id: makeId('POST'), userId: state.profile.id, name: state.profile.name, text, createdAt: nowISO(), likes: [], comments: [] });
        state.posts = state.posts.slice(-MAX_POSTS);
        saveState(); render(); notify('تم نشر المنشور وحفظه محليًا'); break;
      }
      case 'comment': {
        const post = state.posts.find((item) => item.id === form.dataset.id);
        const text = cleanText(data.get('comment')).slice(0, 300);
        if (!post || !text) return;
        post.comments = Array.isArray(post.comments) ? post.comments : [];
        post.comments.push({ name: state.profile.name, text, createdAt: nowISO() });
        saveState(); render(); notify('تم حفظ التعليق محليًا'); break;
      }
      case 'bot': {
        const name = cleanText(data.get('name')).slice(0, 50);
        const description = cleanText(data.get('description')).slice(0, 500);
        const validator = window.ESKOBotDraftValidation;
        if (!validator || !validator.validateName(name)) { notify('تحقق من اسم البوت'); return; }
        let commands;
        try { commands = validator.parseCommands(data.get('commands')); }
        catch (error) { notify(error.message || 'صيغة الأوامر غير صحيحة'); return; }
        const bot = { id: makeId('BOT'), name, description, commands, status: 'local-draft', createdAt: nowISO() };
        state.bots.push(bot);
        state.bots = state.bots.slice(-300);
        saveState(); render(); notify('تم حفظ مسودة إعداد البوت محليًا'); break;
      }
      case 'project': {
        const name = cleanText(data.get('name')).slice(0, 80);
        if (!name) return;
        state.projects.push({ id: makeId('PROJECT'), name, description: cleanText(data.get('description')).slice(0, 1000), createdAt: nowISO() });
        state.projects = state.projects.slice(-MAX_PROJECTS);
        saveState(); render(); notify('تم حفظ المشروع في المستودعات المحلية'); break;
      }
      case 'listing': {
        const title = cleanText(data.get('title')).slice(0, 70);
        const description = cleanText(data.get('description')).slice(0, 700);
        if (!title || !description) return;
        state.listings.push({ id: makeId('LISTING'), title, category: cleanText(data.get('category')) || 'أداة', description, createdAt: nowISO() });
        state.listings = state.listings.slice(-MAX_LISTINGS);
        saveState(); render(); notify('تم نشر العرض في المتجر المحلي'); break;
      }
      case 'message': {
        const text = cleanText(data.get('text')).slice(0, 1200);
        if (!text) return;
        state.messages.push({ id: makeId('MSG'), name: state.profile.name, room: cleanText(data.get('room')) || 'الساحة العامة', text, createdAt: nowISO() });
        state.messages = state.messages.slice(-MAX_MESSAGES);
        saveState(); render(); notify('تم حفظ الرسالة على هذا الجهاز'); break;
      }
      case 'profile': {
        const name = cleanText(data.get('name')).slice(0, 40);
        if (!name) return;
        state.profile.name = name;
        state.profile.bio = cleanText(data.get('bio')).slice(0, 180);
        saveState(); render(); notify('تم حفظ ملفك الشخصي محليًا'); break;
      }
      default: break;
    }
  });

  root.addEventListener('input', (event) => {
    if (event.target.id === 'etuSearchInput') {
      const position = event.target.selectionStart;
      searchQuery = event.target.value;
      // Update only the results area so typing does not lose focus.
      const existing = event.target.closest('.etu-card');
      if (existing) {
        const oldResults = existing.querySelector('.etu-live-results');
        if (oldResults) oldResults.remove();
        const results = document.createElement('div');
        results.className = 'etu-live-results';
        results.innerHTML = searchQuery ? `<div class="etu-section-head"><h2>نتائج البحث</h2></div>${searchResults()}` : '';
        existing.appendChild(results);
        event.target.setSelectionRange(position, position);
      }
    }
    if (event.target.id === 'etuFeatureSearch') {
      const position = event.target.selectionStart;
      featureFilter = event.target.value;
      const hub = hubByKey(activeHub);
      const grid = $('.etu-feature-grid', root);
      const filtered = buildFeatureList(hub).map((name, index) => ({ name, index })).filter((item) => item.name.toLocaleLowerCase().includes(featureFilter.toLocaleLowerCase()));
      if (grid) grid.innerHTML = filtered.map((item) => { const featureId = `${hub.key}:${item.index}`; const enabled = state.enabledFeatures.includes(featureId); return `<button type="button" class="etu-feature ${enabled ? 'active' : ''}" data-action="toggle-feature" data-id="${featureId}" aria-pressed="${enabled}"><b>${escapeHTML(item.name)}</b><small>${enabled ? 'محفوظة في المفضلة' : 'اضغط لحفظها في المفضلة'}</small></button>`; }).join('') || '<div class="etu-empty">لا توجد ميزة بهذا الاسم.</div>';
      event.target.setSelectionRange(position, position);
    }
  });

  $('#etuImportFile', root).addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) importBackup(file);
    event.target.value = '';
  });

  function observeShell() {
    const shell = appShell();
    if (!shell) return false;
    const observer = new MutationObserver(() => {
      if (!shell.classList.contains('hidden')) activateShell();
      else {
        shell.classList.remove('etu-enabled');
        root.classList.add('etu-old-mode');
      }
    });
    observer.observe(shell, { attributes: true, attributeFilter: ['class'] });
    if (!shell.classList.contains('hidden')) activateShell();
    return true;
  }

  function boot() {
    if (observeShell()) return;
    // Standalone fallback for a page without the original ESKO app shell.
    document.body.appendChild(root);
    document.head.appendChild(style);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
