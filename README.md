# 看護師国家試験アプリ - かずからの挑戦状

## サイトURL
https://deft-profiterole-9ab44b.netlify.app

---

## 問題を更新する方法（Notionで追加・編集した後）

ターミナルを開いて、以下をコピペして実行：

```bash
cd /Users/katsuradakazuto/Desktop/アプリ/nursing-quiz-app && npm run fetch-notion && git add . && git commit -m "問題を更新" && git push
```

→ 1〜2分後にサイトが自動更新されます

---

## ローカルで確認したいとき

```bash
cd /Users/katsuradakazuto/Desktop/アプリ/nursing-quiz-app && npm run dev
```

→ http://localhost:5173 をブラウザで開く

---

## デザインを変更したいとき

1. ファイルを編集：
   - デザイン → `src/App.css`
   - 機能・表示 → `src/App.jsx`
   - 画像 → `public/hero.png` を差し替え

2. ローカルで確認（上のコマンド）

3. 本番に反映：
```bash
cd /Users/katsuradakazuto/Desktop/アプリ/nursing-quiz-app && git add . && git commit -m "デザイン更新" && git push
```

---

## 重要なファイル

| ファイル | 内容 |
|---------|------|
| `.env` | Notion APIキー（絶対に公開しない） |
| `src/data/questions.json` | Notionから取得した問題データ |
| `src/App.jsx` | アプリのメイン機能 |
| `src/App.css` | デザイン |

---

## 困ったとき

Claude Codeに聞いてください：
- 「デザインを〇〇に変えて」
- 「〇〇の機能を追加して」
- 「エラーが出た」→ エラーメッセージを貼り付け

---

## Notion APIキー（バックアップ）

紛失した場合：https://www.notion.so/my-integrations で再発行

---

作成日: 2026年3月1日
