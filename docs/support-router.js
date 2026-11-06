/* ESKO support router — public channels only; no personal phone numbers in static files. */
(() => {
  'use strict';
  const CHANNELS = Object.freeze([
    'https://whatsapp.com/channel/0029VbE7vGO4tRrwmz95M73S',
    'https://whatsapp.com/channel/0029VbEH9N2LY6d4aZ8FRW0I',
    'https://whatsapp.com/channel/0029Vb9NAZoKAwEu7UjBxJ02'
  ]);
  const DEFAULT_MESSAGE = 'مرحبًا، أحتاج إلى مساعدة بخصوص ESKO OPEN HUB.';
  function open(_message = DEFAULT_MESSAGE) {
    const url = CHANNELS[0];
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('[data-random-support]');
    if (!link) return;
    event.preventDefault();
    open(link.dataset.supportMessage || DEFAULT_MESSAGE);
  });
  window.ESKORandomSupport = Object.freeze({ open, channels: CHANNELS });
})();
