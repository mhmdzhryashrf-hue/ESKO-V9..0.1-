'use strict';

const JOKES = [
  'مرة كمبيوتر راح للدكتور… قاله عندي فيروس! 😂',
  'واحد نام متأخر… فاته الحلم! 😴',
  'مرة مبرمج اتجوز مبرمجة… خلفوا توأم، واحد نسخة احتياطية والتاني تحديث! 🃏'
];

const RIDDLES = [
  { q: 'ما الشيء الذي كلما أخذت منه كبر؟', a: 'الحفرة' },
  { q: 'له أسنان ولا يعض، ما هو؟', a: 'المشط' },
  { q: 'ما الذي يكتب ولا يقرأ؟', a: 'القلم' }
];

const QUESTIONS = [
  { q: 'ما عاصمة مصر؟', a: 'القاهرة' },
  { q: 'كم يومًا في الأسبوع؟', a: '7' },
  { q: 'ما الكوكب المعروف بالكوكب الأحمر؟', a: 'المريخ' }
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getJoke() { return pick(JOKES); }
function getRiddle() { return pick(RIDDLES); }
function getQuestion() { return pick(QUESTIONS); }

module.exports = { getJoke, getRiddle, getQuestion };
