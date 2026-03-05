# 看護師国家試験アプリ - かずからの挑戦状

## サイトURL
https://deft-profiterole-9ab44b.netlify.app

---

## プロジェクト概要

看護師国家試験対策のクイズアプリ。Notionで問題を管理し、自動的にアプリに反映できる仕組み。

**主な機能：**
- カテゴリー別クイズ
- 全問チャレンジ
- 未回答問題のみピックアップ（カテゴリー別・全体）
- 間違えた問題に再挑戦
- 学習履歴・統計の自動保存（ブラウザに保存）

**デザイン：**
- 柔らかいパステルカラー（学生向け）
- アイコン付きで見やすいUI

---

## 重要なファイル一覧

| ファイル | 役割 | 編集タイミング |
|----------|------|----------------|
| `src/App.jsx` | アプリのメイン機能・表示 | 機能追加・変更時 |
| `src/App.css` | デザイン・スタイル | デザイン変更時 |
| `src/data/questions.json` | 問題データ（自動生成） | 直接編集しない |
| `scripts/fetch-notion.js` | Notionからデータ取得 | カテゴリー追加時 |
| `public/hero.png` | ヘッダー画像 | 画像変更時 |
| `.env` | Notion APIキー | 絶対に公開しない |
| `index.html` | HTMLテンプレート | タイトル変更時 |

---

## フォルダ構成

```
/Users/katsuradakazuto/Desktop/アプリ/nursing-quiz-app/
├── src/
│   ├── App.jsx          # メインアプリ
│   ├── App.css          # スタイル
│   ├── main.jsx         # エントリーポイント
│   └── data/
│       └── questions.json  # 問題データ（自動生成）
├── scripts/
│   └── fetch-notion.js  # Notion取得スクリプト
├── public/
│   └── hero.png         # ヘッダー画像
├── .env                 # 環境変数（APIキー）
├── package.json         # 依存関係
└── README.md            # このファイル
```

---

## 操作方法

### 1. 問題を更新する（Notionで追加・編集した後）

```bash
cd /Users/katsuradakazuto/Desktop/アプリ/nursing-quiz-app && npm run fetch-notion
```

実行すると：
1. Notionから全カテゴリーの問題を取得
2. 変更内容（追加・削除された問題）を表示
3. 確認後 `y` を入力で保存

その後、GitHubにプッシュ：
```bash
git add . && git commit -m "問題を更新" && git push
```

→ 1〜2分後にサイトが自動更新されます

### 2. ローカルで確認する

```bash
cd /Users/katsuradakazuto/Desktop/アプリ/nursing-quiz-app && npm run dev
```

→ http://localhost:5173 をブラウザで開く

### 3. デザインを変更する

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

## データ保存の仕組み

### 問題データ（Notionから）
- 保存先: `src/data/questions.json`
- 更新方法: `npm run fetch-notion`
- GitHubにプッシュ → Netlifyで自動デプロイ

### 学習データ（ユーザーごと）
- 保存先: ブラウザのlocalStorage
- キー:
  - `nursing-quiz-history` - 学習履歴（最新20件）
  - `nursing-quiz-wrong` - 間違えた問題のID
  - `nursing-quiz-stats` - 統計（挑戦回数、正解数）
  - `nursing-quiz-answered` - 回答済み問題のID（未回答ピックアップ用）

**重要:** 問題を更新しても学習データは消えません（別の場所に保存）

### 未回答問題の仕組み
- 問題に回答すると、そのIDが `nursing-quiz-answered` に保存される
- カテゴリーごと、または全体で「まだ解いていない問題」だけを出題できる
- 全問回答済みのカテゴリーは「全問回答済」と表示される
- データリセットで回答履歴もクリアされる

---

## 注意点

### やってはいけないこと
- `.env` ファイルを公開・共有しない（APIキーが含まれる）
- `src/data/questions.json` を直接編集しない（Notion更新で上書きされる）

### 問題が起きやすいケース
- Notionの問題形式が違う → 選択肢が認識されない
- Notionのページが接続されていない → 問題が取得できない

### Notionの問題形式（正しい書き方）
```
問題文をここに書く

1. 選択肢1
2. 選択肢2
3. 選択肢3
4. 選択肢4
```

- 選択肢は `1.` `2.` `3.` `4.` で始める
- 正解は「正解」列に数字（1〜4）で入力
- 解説は「解説」列に入力

---

## 外部サービス情報

### Notion
- データベースURL: https://www.notion.so/2f3a79a5bcf081178115e5688538357c
- APIキー: `.env` ファイルに保存済み
- 再発行: https://www.notion.so/my-integrations

### GitHub
- リポジトリ: https://github.com/kazunurse/nursing-quiz-app-
- プッシュすると自動でNetlifyにデプロイ

### Netlify
- サイトURL: https://deft-profiterole-9ab44b.netlify.app
- 管理画面: https://app.netlify.com
- GitHubと連携済み（mainブランチにプッシュで自動デプロイ）

---

## カテゴリー一覧（Notion）

現在設定されているカテゴリー：
1. 循環器系
2. 呼吸器系
3. 消化器系
4. 泌尿器系
5. 内分泌・代謝系
6. 血液・造血器系
7. 脳神経系
8. 運動器系
9. 感覚器系
10. 皮膚科
11. 免疫・アレルギー・膠原病
12. 感染症
13. 生殖器系
14. 周手術期看護
15. がん看護
16. 母性看護
17. 小児看護
18. 精神看護
19. 老年看護
20. 在宅・地域看護
21. 看護技術・基礎
22. 法律・制度
23. 栄養代謝

新しいカテゴリーを追加する場合は `scripts/fetch-notion.js` の `CATEGORIES` 配列に追加が必要。

---

## 使用技術

- **フレームワーク:** React 19 + Vite
- **スタイリング:** CSS（カスタム）
- **アイコン:** react-icons
- **データ取得:** Notion API（REST）
- **ホスティング:** Netlify
- **バージョン管理:** GitHub

---

## トラブルシューティング

### 問題が取得できない
1. Notionのページに接続（Connections）が設定されているか確認
2. APIキーが正しいか確認（`.env`ファイル）

### デプロイされない
1. GitHubにプッシュされているか確認: `git status`
2. Netlifyの管理画面でデプロイ状況を確認

### ローカルで動かない
1. 依存関係をインストール: `npm install`
2. ポート5173が使用中でないか確認

---

## 困ったとき

Claude Codeに聞いてください：
- 「デザインを〇〇に変えて」
- 「〇〇の機能を追加して」
- 「エラーが出た」→ エラーメッセージを貼り付け

このREADMEを見せれば、前回の内容を把握できます。

---

作成日: 2026年3月1日
最終更新: 2026年3月5日

---

## 更新履歴

- **2026/3/5** - 未回答問題ピックアップ機能追加、パステルカラーデザインに変更
- **2026/3/5** - アイコン追加、Notion取得時の確認機能追加
- **2026/3/1** - 初版リリース
