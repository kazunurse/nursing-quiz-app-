// 用語の取り違え点検（再発防止 2026-11-16）
// 「カウプ指数＝乳幼児／ローレル指数＝学童期」のように、取り違えやすい組み合わせを、ルールで点検する。
// 使い方: node scripts/fact-lint.js [questions.json]   （npm run check に含む）
// ルールを足すときは RULES に1行足す。確認済みで保留する問題は scripts/consistency-known.json に id と理由を書く。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const qPath = process.argv[2] || path.join(__dirname, '..', 'src', 'data', 'questions.json');
const kPath = path.join(__dirname, 'consistency-known.json');
const data = JSON.parse(fs.readFileSync(qPath, 'utf-8'));
const known = fs.existsSync(kPath) ? JSON.parse(fs.readFileSync(kPath, 'utf-8')) : {};

const answerText = q => (Array.isArray(q.answer) ? q.answer : [q.answer]).map(i => q.choices[i] || '').join(' ');
const lines = q => String(q.explanation || '').split(/<br\s*\/?>|\n/);

// 各ルール: check(q) が文字列（理由）を返したら警告
const RULES = [
  { name: '指数の対象',
    check: q => {
      const t = q.question, a = answerText(q);
      if (/学童|小学生|学齢/.test(t) && /指数/.test(t) && /カウプ/.test(a)) return '学童期の指数の正解に、乳幼児用のカウプ指数が選ばれている（学童期＝ローレル指数）';
      if (/乳幼児|乳児|幼児/.test(t) && /指数/.test(t) && /ローレル/.test(a)) return '乳幼児の指数の正解に、学童用のローレル指数が選ばれている（乳幼児＝カウプ指数）';
      return null;
    } },
  { name: '解説の○の説明（指数）',
    check: q => {
      for (const l of lines(q)) {
        if (/→\s*○/.test(l) && /ローレル/.test(l) && /乳幼児|0〜1歳/.test(l) && !/学童/.test(l)) return 'ローレル指数の○の説明が乳幼児になっている（学童期のはず）';
        if (/→\s*○/.test(l) && /カウプ/.test(l) && /学童/.test(l) && !/乳幼児/.test(l)) return 'カウプ指数の○の説明が学童期になっている（乳幼児のはず）';
      }
      return null;
    } },
  { name: '受胎調節の実地指導の法律',
    check: q => {
      for (const l of lines(q)) {
        if (/受胎調節/.test(l) && /→\s*○/.test(l) && /母子保健法/.test(l) && !/母体保護法/.test(l)) return '受胎調節の実地指導は母体保護法の規定（母子保健法ではない）';
      }
      return null;
    } },
  { name: '労働基準法と育児・介護休業法',
    check: q => {
      for (const l of lines(q)) {
        if (/育児休業/.test(l) && /→\s*○/.test(l) && /労働基準法/.test(l) && !/育児・介護休業法|育介法/.test(l)) return '育児休業は育児・介護休業法の規定（労働基準法ではない）';
      }
      return null;
    } },
];

const hits = [];
for (const q of data.questions) {
  for (const r of RULES) {
    const msg = r.check(q);
    if (msg) hits.push({ q, rule: r.name, msg });
  }
}
const fresh = hits.filter(h => !known[h.q.id]);
const skipped = hits.filter(h => known[h.q.id]);

console.log(`\n🔎 用語の取り違え点検: ${RULES.length}ルール × ${data.questions.length}問`);
if (skipped.length) {
  console.log(`  ・確認済みで保留中: ${skipped.length}件`);
  for (const h of skipped) console.log(`      [${h.q.category}] ${h.q.question.slice(0, 30)}… (${h.rule})`);
}
if (fresh.length === 0) { console.log('  ✅ 取り違えは見つかりませんでした\n'); process.exit(0); }
console.log(`\n  ⚠️ 取り違えの疑い: ${fresh.length}件`);
for (const h of fresh) {
  console.log(`  - [${h.q.category}] ${h.q.question.slice(0, 40).replace(/\n/g, ' ')}`);
  console.log(`      id: ${h.q.id}`);
  console.log(`      ${h.rule}: ${h.msg}`);
}
console.log('\n  → Notionの「正解」「解説」を直してから、もう一度取り込んでください。\n');
process.exit(1);
