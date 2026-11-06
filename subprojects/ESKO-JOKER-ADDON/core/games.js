'use strict';

const PACKS = {
  jokes: [
    'مرة كمبيوتر عطس… قالوا له عندك فيروس 😂',
    'مبرمج راح للدكتور قاله عندي مشكلة في الذاكرة… الدكتور قاله من إمتى؟ قاله من إمتى إيه؟',
    'مرة واحد اشترى سرير دورين، نام تحت عشان ما يوقعش من فوق 😄',
    'واحد فتح محل ساعات، قفله بدري عشان الوقت خلص ⏰',
    'مرة قلم دخل امتحان، خرج منه مبري ✏️'
  ],
  riddles: [
    { q: 'ما الشيء الذي كلما أخذت منه كبر؟', a: ['الحفرة'] },
    { q: 'له أسنان ولا يعض، ما هو؟', a: ['المشط'] },
    { q: 'يكتب ولا يقرأ، ما هو؟', a: ['القلم'] },
    { q: 'له عين ولا يرى، ما هو؟', a: ['الإبرة', 'ابرة'] },
    { q: 'ما الشيء الذي يمشي بلا قدمين؟', a: ['الوقت'] }
  ],
  questions: [
    { q: 'ما عاصمة مصر؟', a: ['القاهرة'] },
    { q: 'ما الكوكب المعروف بالكوكب الأحمر؟', a: ['المريخ'] },
    { q: 'كم يومًا في الأسبوع؟', a: ['7', 'سبعة'] },
    { q: 'ما أكبر محيط على الأرض؟', a: ['المحيط الهادئ', 'الهادئ'] },
    { q: 'كم ضلعًا للمثلث؟', a: ['3', 'ثلاثة'] }
  ],
  guess: [
    { q: 'أنا شيء تستخدمه للكتابة، ولي سنّ، فمن أنا؟', a: ['قلم', 'القلم'] },
    { q: 'أنا كوكب نعيش عليه، فمن أنا؟', a: ['الأرض', 'ارض'] },
    { q: 'أنا حيوان يُلقّب بملك الغابة، فمن أنا؟', a: ['الأسد', 'اسد'] }
  ]
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function createGame(type) {
  if (type === 'joke') return { kind: 'joke', text: pick(PACKS.jokes) };
  const map = { riddle: 'riddles', question: 'questions', guess: 'guess' };
  const item = pick(PACKS[map[type] || 'riddles']);
  return { kind: type, question: item.q, answers: item.a.map(x => x.toLocaleLowerCase('ar')), points: type === 'riddle' ? 3 : 2 };
}
function answerMatches(active, text) {
  if (!active?.answers) return false;
  const candidate = String(text).trim().toLocaleLowerCase('ar').replace(/[؟?!.,،]/g, '');
  return active.answers.some(a => candidate === a || candidate.replace(/^ال/, '') === a.replace(/^ال/, ''));
}
module.exports = { PACKS, pick, randomInt, createGame, answerMatches };
