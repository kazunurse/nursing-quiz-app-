import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = '2022-06-28';

// 正答率別ページ（データベースを含む）
const RATE_PAGES = [
  { rate: 90, pageId: '2f5a79a5bcf0814bbf8ccf1c374f8a3f' },
  { rate: 80, pageId: '2f5a79a5bcf081e4a3e2c74e84a672fb' },
  { rate: 70, pageId: '2f5a79a5bcf081fbb6f9f2bc28e93e6b' },
  { rate: 60, pageId: '2f5a79a5bcf081a8b32ce6e032b3cd11' },
  { rate: 50, pageId: '2f5a79a5bcf081a6adfaf7efed6fb7c4' },
  { rate: 40, pageId: '2f5a79a5bcf081c99ebdefacc47d5d32' },
  { rate: 30, pageId: '2f5a79a5bcf0818e8519f4cf95de91a9' },
  { rate: 20, pageId: '2f5a79a5bcf08187958fdc0122db413d' },
  { rate: 10, pageId: '2f5a79a5bcf081429014e974614b56ab' },
];

// Notion APIリクエスト
async function notionRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`https://api.notion.com/v1${endpoint}`, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Notion API error');
  }
  return response.json();
}

// ページ内のデータベースIDを取得
async function getDatabaseId(pageId) {
  try {
    const data = await notionRequest(`/blocks/${pageId}/children`);
    for (const block of data.results) {
      if (block.type === 'child_database') return block.id;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// データベースから問題を全件取得（ページネーション対応）
async function getAllFromDatabase(databaseId) {
  const results = [];
  let cursor = null;

  while (true) {
    const body = cursor ? { start_cursor: cursor } : {};
    const data = await notionRequest(`/databases/${databaseId}/query`, 'POST', body);
    results.push(...data.results);
    if (!data.has_more) break;
    cursor = data.next_cursor;
    await sleep(300);
  }
  return results;
}

// 問題テキストの正規化（重複チェック用）
function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

// 問題文から選択肢を抽出
function parseQuestion(text) {
  if (!text) return { question: '', choices: [] };
  const lines = text.split('\n');
  let questionLines = [], choices = [], inChoices = false;
  for (const line of lines) {
    const m = line.match(/^([1-4])[.）\)]\s*(.+)/);
    if (m) { inChoices = true; choices.push(m[2].trim()); }
    else if (!inChoices) questionLines.push(line);
  }
  return { question: questionLines.join('\n').trim(), choices };
}

// データベースから正答率別問題を取得
async function getQuestionsFromRate(rate, pageId) {
  const dbId = await getDatabaseId(pageId);
  if (!dbId) { console.log(`  ⚠️  データベースが見つかりません`); return []; }

  const pages = await getAllFromDatabase(dbId);
  const questions = [];

  for (const page of pages) {
    const props = page.properties;
    const questionText = props['問題文']?.rich_text?.[0]?.plain_text || '';
    const { question, choices } = parseQuestion(questionText);
    const answerText = props['回答']?.rich_text?.[0]?.plain_text || '';
    const bunya = props['分野']?.select?.name || '';
    const explanation = props['解説']?.rich_text?.[0]?.plain_text || '';
    const dateStr = props['日付']?.date?.start || '';

    // 回答番号を数値に変換（0始まり）
    let answer;
    if (answerText.includes(',')) {
      answer = answerText.split(',').map(s => parseInt(s.trim()) - 1).filter(n => !isNaN(n));
    } else {
      answer = parseInt(answerText) - 1;
      if (isNaN(answer)) answer = 0;
    }

    if (question && choices.length > 0) {
      questions.push({
        id: page.id,
        rate,
        category: bunya,
        question,
        choices,
        answer,
        explanation,
        date: dateStr,
        _normalized: normalizeText(question), // 重複チェック用（保存しない）
      });
    }
  }

  return questions;
}

// 重複チェック
function checkDuplicates(questions) {
  const seen = new Map(); // normalized text → 最初のインデックス
  const duplicates = [];

  for (let i = 0; i < questions.length; i++) {
    const key = questions[i]._normalized;
    if (seen.has(key)) {
      duplicates.push({
        index: i,
        first: seen.get(key),
        rate: questions[i].rate,
        question: questions[i].question.substring(0, 60),
      });
    } else {
      seen.set(key, i);
    }
  }

  return duplicates;
}

// 差分表示
function showDiff(existingData, newQuestions, duplicates) {
  const existingIds = new Set((existingData?.questions || []).map(q => q.id));
  const newIds = new Set(newQuestions.map(q => q.id));

  const added = newQuestions.filter(q => !existingIds.has(q.id));
  const removed = (existingData?.questions || []).filter(q => !newIds.has(q.id));

  console.log('\n========================================');
  console.log('📊 更新内容の確認');
  console.log('========================================\n');
  console.log(`📝 現在の問題数: ${existingData?.questions?.length || 0}問`);
  console.log(`📝 新しい問題数: ${newQuestions.length}問\n`);

  // 正答率別内訳
  console.log('📂 正答率別:');
  for (const { rate } of RATE_PAGES) {
    const count = newQuestions.filter(q => q.rate === rate).length;
    if (count > 0) {
      const prev = (existingData?.questions || []).filter(q => q.rate === rate).length;
      const diff = count - prev;
      const diffStr = diff > 0 ? ` (+${diff})` : diff < 0 ? ` (${diff})` : '';
      console.log(`  • ${rate}%: ${count}問${diffStr}`);
    }
  }

  if (added.length > 0) {
    console.log(`\n✨ 新規追加: ${added.length}問`);
    for (const q of added.slice(0, 5)) {
      console.log(`  [${q.rate}%] ${q.question.substring(0, 50)}...`);
    }
    if (added.length > 5) console.log(`  ...他${added.length - 5}問`);
  }

  if (removed.length > 0) {
    console.log(`\n🗑️  削除: ${removed.length}問`);
    for (const q of removed) {
      console.log(`  [${q.rate}%] ${q.question.substring(0, 50)}...`);
    }
  }

  // ⚠️ 重複警告
  if (duplicates.length > 0) {
    console.log(`\n⚠️  重複が ${duplicates.length} 件検出されました（自動スキップします）:`);
    for (const d of duplicates) {
      console.log(`  [${d.rate}%] ${d.question}...`);
    }
  } else {
    console.log('\n✅ 重複なし');
  }

  if (added.length === 0 && removed.length === 0 && duplicates.length === 0) {
    console.log('\n✅ 変更はありません');
  }

  console.log('\n========================================\n');
  return { added, removed };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

// メイン処理
async function main() {
  console.log('📥 Notionから正答率別データを取得中...\n');

  let allQuestions = [];

  for (const { rate, pageId } of RATE_PAGES) {
    process.stdout.write(`  ${rate}%の問題... `);
    const questions = await getQuestionsFromRate(rate, pageId);
    allQuestions.push(...questions);
    console.log(`${questions.length}問取得`);
    await sleep(300);
  }

  // 重複チェック
  const duplicates = checkDuplicates(allQuestions);

  // 重複を除外（最初の出現を残す）
  const duplicateIndexes = new Set(duplicates.map(d => d.index));
  const uniqueQuestions = allQuestions
    .filter((_, i) => !duplicateIndexes.has(i))
    .map(({ _normalized, ...q }) => q); // _normalized を除いて保存

  // 既存データ読み込み
  const outputDir = path.join(__dirname, '..', 'src', 'data');
  const outputPath = path.join(outputDir, 'questions-rate.json');
  let existingData = null;
  if (fs.existsSync(outputPath)) {
    try { existingData = JSON.parse(fs.readFileSync(outputPath, 'utf-8')); } catch (e) {}
  }

  // 差分表示
  showDiff(existingData, uniqueQuestions, duplicates);

  // 確認
  const ans = await askQuestion('この内容で更新しますか？ (y/n): ');
  if (ans.toLowerCase() !== 'y' && ans.toLowerCase() !== 'yes') {
    console.log('❌ キャンセルしました');
    process.exit(0);
  }

  // 保存
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputData = {
    lastUpdated: new Date().toISOString(),
    totalCount: uniqueQuestions.length,
    rates: RATE_PAGES.map(({ rate }) => ({
      rate,
      count: uniqueQuestions.filter(q => q.rate === rate).length,
    })).filter(r => r.count > 0),
    questions: uniqueQuestions,
  };

  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');

  console.log(`\n✅ 完了！ ${uniqueQuestions.length}問を保存しました。`);
  if (duplicates.length > 0) {
    console.log(`⚠️  重複 ${duplicates.length}問はスキップされました。`);
  }
  console.log(`📁 保存先: src/data/questions-rate.json`);
}

main().catch(console.error);
