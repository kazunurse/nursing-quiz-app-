// 答えと解説の一致チェック（再発防止 2026-11-16）
// 使い方: node scripts/check-consistency.js   （npm run check）
// - 解説の「N.〜 → ○/×」の○が、answer と一致しているかを確認する
// - 食い違いがあれば一覧を出して終了コード1（update で止まる）
// - 確認済みで直さない問題は scripts/consistency-known.json に id を入れる（理由つき）
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const qPath = process.argv[2] || path.join(__dirname, '..', 'src', 'data', 'questions.json');
const kPath = path.join(__dirname, 'consistency-known.json');

const data = JSON.parse(fs.readFileSync(qPath, 'utf-8'));
const known = fs.existsSync(kPath) ? JSON.parse(fs.readFileSync(kPath, 'utf-8')) : {};

const problems = [];   // 食い違い（止める）
const gaps = [];       // 答えの選択肢の説明が解説に無い（警告のみ）
const unreadable = [];

for (const q of data.questions) {
  const ex = String(q.explanation || '');
  // <br> と改行で分割して、1行ずつ「N.〜 → ○/×」を探す
  const lines = ex.split(/<br\s*\/?>|\n/);
  const marks = [];
  for (const line of lines) {
    const m = line.match(/^\s*(\d)\s*[.．]\s*.*?→\s*([○×])/);
    if (m) marks.push([Number(m[1]), m[2]]);
  }
  if (marks.length === 0) { unreadable.push(q); continue; }
  const circled = marks.filter(([, s]) => s === '○').map(([n]) => n).sort((a, b) => a - b);
  const ans = (Array.isArray(q.answer) ? q.answer : [q.answer]).map(a => a + 1).sort((a, b) => a - b);
  if (JSON.stringify(circled) !== JSON.stringify(ans)) {
    // 答えの番号の行が解説にそもそも無い（例：5択なのに解説が1〜4まで）→ 説明不足として警告
    const explained = new Set(marks.map(([n]) => n));
    const missing = ans.filter(a => !explained.has(a));
    // 解説にある行だけで見て矛盾していなければ「説明不足」、矛盾していれば「食い違い」
    const circledOnlyExplained = circled;
    const ansExplained = ans.filter(a => explained.has(a));
    const conflict = JSON.stringify(circledOnlyExplained) !== JSON.stringify(ansExplained);
    if (conflict) problems.push({ q, ans, circled });
    else gaps.push({ q, ans, missing });
  }
}

const fresh = problems.filter(p => !known[p.q.id]);
const skipped = problems.filter(p => known[p.q.id]);

console.log(`\n🔎 答えと解説の一致チェック: ${data.questions.length}問`);
if (unreadable.length) console.log(`  ・解説に「→ ○/×」の印が読み取れない問題: ${unreadable.length}問（印のない書式）`);
if (skipped.length) {
  console.log(`  ・確認済みで保留中: ${skipped.length}問`);
  for (const p of skipped) console.log(`      [${p.q.category}] ${p.q.question.slice(0, 36)}… 理由: ${known[p.q.id]}`);
}
if (gaps.length) {
  console.log(`  ・答えの選択肢の説明が解説に無い（説明不足・警告のみ）: ${gaps.length}問`);
  for (const g of gaps) console.log(`      [${g.q.category}] ${g.q.question.slice(0, 36).replace(/\n/g, ' ')}… 解説に無い番号: ${g.missing.join(',')}`);
}
if (fresh.length === 0) {
  console.log('  ✅ 答えと解説の食い違いはありません\n');
  process.exit(0);
}
console.log(`\n  ⚠️ 答えと解説の○が食い違う問題: ${fresh.length}問`);
for (const p of fresh) {
  const q = p.q;
  console.log(`  - [${q.category}] ${q.question.slice(0, 40).replace(/\n/g, ' ')}`);
  console.log(`      id: ${q.id}`);
  console.log(`      answer: ${p.ans.join(',')} ／ 解説の○: ${p.circled.join(',') || 'なし'}`);
}
console.log('\n  → Notionの「正解」「解説」を直してから、もう一度取り込んでください。');
console.log('    直さず保留する場合は scripts/consistency-known.json に id と理由を書きます。\n');
process.exit(1);
