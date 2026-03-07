import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = '2022-06-28';

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
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`https://api.notion.com/v1${endpoint}`, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Notion API error');
  }
  return response.json();
}

// カテゴリーページのマッピング
const CATEGORIES = [
  { id: '2f3a79a5bcf0810b85afe28ad8702a12', name: '循環器系' },
  { id: '2f3a79a5bcf081a9967bda95f883a332', name: '呼吸器系' },
  { id: '2f3a79a5bcf081aeb6ddf8a10c749b91', name: '消化器系' },
  { id: '2f3a79a5bcf08115b342eabde6fdd881', name: '泌尿器系' },
  { id: '2f3a79a5bcf081d7aa5bc96cead6a0fb', name: '内分泌・代謝系' },
  { id: '2f3a79a5bcf0817da71ef7ea929e7f96', name: '血液・造血器系' },
  { id: '2f3a79a5bcf0816ead62c937effc83c5', name: '脳神経系' },
  { id: '2f3a79a5bcf0817aaaf6c825e4b3bf5b', name: '運動器系' },
  { id: '2f3a79a5bcf081e09a7aeb49d5775745', name: '感覚器系' },
  { id: '2f3a79a5bcf081019f63ddadd61af091', name: '皮膚科' },
  { id: '2f3a79a5bcf081e78e32c1d183968dac', name: '免疫・アレルギー・膠原病' },
  { id: '2f3a79a5bcf081348b4cc8155b68017b', name: '感染症' },
  { id: '2f5a79a5bcf0802f8361e417a46cd78a', name: '生殖器系' },
  { id: '2f3a79a5bcf081ba81e0dbf6e0b403eb', name: '周手術期看護' },
  { id: '2f3a79a5bcf08180bc40d52f236a1658', name: 'がん看護' },
  { id: '2f3a79a5bcf081bcbf3dda4776c9b4b8', name: '母性看護' },
  { id: '2f3a79a5bcf081a6aa1dc4cdc1be900a', name: '小児看護' },
  { id: '2f3a79a5bcf081edb11cc9d7df97c473', name: '精神看護' },
  { id: '2f3a79a5bcf081f98ba9e6e093e1d53f', name: '老年看護' },
  { id: '2f3a79a5bcf0819b8820e0c70f02b967', name: '在宅・地域看護' },
  { id: '2f3a79a5bcf08136ab70e80db98dfb9a', name: '看護技術・基礎' },
  { id: '2f3a79a5bcf081a29189c21ac318b9db', name: '法律・制度' },
  { id: '2f3a79a5bcf081f4a49ce05e28330b2b', name: '栄養代謝' },
];

// 問題文から選択肢を抽出
function parseQuestion(text) {
  if (!text) return { question: '', choices: [] };

  const lines = text.split('\n');
  let questionLines = [];
  let choices = [];
  let inChoices = false;

  for (const line of lines) {
    const choiceMatch = line.match(/^([1-4])[.）\)]\s*(.+)/);
    if (choiceMatch) {
      inChoices = true;
      choices.push(choiceMatch[2].trim());
    } else if (!inChoices) {
      questionLines.push(line);
    }
  }

  return {
    question: questionLines.join('\n').trim(),
    choices: choices
  };
}

// ページ内のデータベースIDを取得
async function getDatabaseId(pageId) {
  try {
    const data = await notionRequest(`/blocks/${pageId}/children`);

    for (const block of data.results) {
      if (block.type === 'child_database') {
        return block.id;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error getting database from page ${pageId}:`, error.message);
    return null;
  }
}

// データベースから問題を取得
async function getQuestionsFromDatabase(databaseId, categoryName) {
  try {
    const data = await notionRequest(`/databases/${databaseId}/query`, 'POST', {});

    const questions = [];

    for (const page of data.results) {
      const props = page.properties;

      // 問題文を取得
      const questionText = props['問題文']?.rich_text?.[0]?.plain_text || '';
      const { question, choices } = parseQuestion(questionText);

      // 正解を取得（複数回答対応: "1, 2" → [0, 1]）
      const answerText = props['正解']?.rich_text?.[0]?.plain_text || '';
      let answer;
      if (answerText.includes(',')) {
        // カンマ区切りの場合は配列として処理
        answer = answerText.split(',').map(s => parseInt(s.trim()) - 1).filter(n => !isNaN(n));
      } else {
        // 単一回答の場合は数値
        answer = parseInt(answerText) - 1;
        if (isNaN(answer)) answer = 0;
      }

      // 解説を取得
      const explanation = props['解説']?.rich_text?.[0]?.plain_text || '';

      // タグを取得
      const tags = props['タグ']?.multi_select?.map(t => t.name) || [];

      if (question && choices.length > 0) {
        questions.push({
          id: page.id,
          category: categoryName,
          question,
          choices,
          answer,
          explanation,
          tags
        });
      }
    }

    return questions;
  } catch (error) {
    console.error(`Error fetching questions from database ${databaseId}:`, error.message);
    return [];
  }
}

// ユーザー入力を取得
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// 既存データと新規データの差分を表示
function showDiff(existingData, newQuestions, newCategories) {
  const existingQuestionIds = new Set((existingData?.questions || []).map(q => q.id));
  const newQuestionIds = new Set(newQuestions.map(q => q.id));

  // 新規追加された問題
  const addedQuestions = newQuestions.filter(q => !existingQuestionIds.has(q.id));

  // 削除された問題
  const removedQuestions = (existingData?.questions || []).filter(q => !newQuestionIds.has(q.id));

  console.log('\n========================================');
  console.log('📊 更新内容の確認');
  console.log('========================================\n');

  console.log(`📝 現在の問題数: ${existingData?.questions?.length || 0}問`);
  console.log(`📝 新しい問題数: ${newQuestions.length}問\n`);

  // カテゴリーごとの問題数
  console.log('📂 カテゴリー別:');
  for (const cat of newCategories.filter(c => c.questionCount > 0)) {
    const existingCat = existingData?.categories?.find(c => c.name === cat.name);
    const diff = cat.questionCount - (existingCat?.questionCount || 0);
    const diffStr = diff > 0 ? `(+${diff})` : diff < 0 ? `(${diff})` : '';
    console.log(`  • ${cat.name}: ${cat.questionCount}問 ${diffStr}`);
  }

  if (addedQuestions.length > 0) {
    console.log('\n✨ 新規追加される問題:');
    for (const q of addedQuestions) {
      const shortQuestion = q.question.substring(0, 50) + (q.question.length > 50 ? '...' : '');
      console.log(`  [${q.category}] ${shortQuestion}`);
    }
  }

  if (removedQuestions.length > 0) {
    console.log('\n🗑️ 削除される問題:');
    for (const q of removedQuestions) {
      const shortQuestion = q.question.substring(0, 50) + (q.question.length > 50 ? '...' : '');
      console.log(`  [${q.category}] ${shortQuestion}`);
    }
  }

  if (addedQuestions.length === 0 && removedQuestions.length === 0) {
    console.log('\n✅ 変更はありません');
  }

  console.log('\n========================================\n');

  return { addedQuestions, removedQuestions };
}

// メイン処理
async function main() {
  console.log('Notionからデータを取得中...');

  const allQuestions = [];
  const categories = [];

  for (const category of CATEGORIES) {
    console.log(`  ${category.name}...`);

    const databaseId = await getDatabaseId(category.id);
    if (databaseId) {
      const questions = await getQuestionsFromDatabase(databaseId, category.name);
      allQuestions.push(...questions);
      categories.push({
        id: category.id,
        name: category.name,
        questionCount: questions.length
      });
      console.log(`    → ${questions.length}問取得`);
    } else {
      console.log(`    → データベースが見つかりません`);
    }
  }

  // 既存のデータを読み込み
  const outputDir = path.join(__dirname, '..', 'src', 'data');
  const outputPath = path.join(outputDir, 'questions.json');
  let existingData = null;

  if (fs.existsSync(outputPath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    } catch (e) {
      console.log('既存ファイルの読み込みに失敗しました');
    }
  }

  // 差分を表示
  const { addedQuestions, removedQuestions } = showDiff(existingData, allQuestions, categories);

  // 確認を求める
  const answer = await askQuestion('この内容で更新しますか？ (y/n): ');

  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('❌ キャンセルしました');
    process.exit(0);
  }

  // JSONファイルに保存
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputData = {
    lastUpdated: new Date().toISOString(),
    categories: categories.filter(c => c.questionCount > 0),
    questions: allQuestions
  };

  fs.writeFileSync(
    outputPath,
    JSON.stringify(outputData, null, 2),
    'utf-8'
  );

  console.log(`\n✅ 完了！ ${allQuestions.length}問を保存しました。`);
  console.log(`📁 保存先: src/data/questions.json`);
}

main().catch(console.error);
