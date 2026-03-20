#!/usr/bin/env python3
"""
Notionの解説を「1.選択肢 → ○/× 理由」形式に自動整形するスクリプト
"""
import requests, json, time, subprocess, sys, re, os
from pathlib import Path
# .envから読み込み
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if line.startswith("NOTION_API_KEY="):
            os.environ["NOTION_API_KEY"] = line.split("=", 1)[1].strip()
NOTION_KEY = os.environ.get("NOTION_API_KEY", "")
HEADERS = {
    "Authorization": f"Bearer {NOTION_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}

CATEGORIES = [
    { "id": "2f3a79a5bcf0810b85afe28ad8702a12", "name": "循環器系" },
    { "id": "2f3a79a5bcf081a9967bda95f883a332", "name": "呼吸器系" },
    { "id": "2f3a79a5bcf081aeb6ddf8a10c749b91", "name": "消化器系" },
    { "id": "2f3a79a5bcf08115b342eabde6fdd881", "name": "泌尿器系" },
    { "id": "2f3a79a5bcf081d7aa5bc96cead6a0fb", "name": "内分泌・代謝系" },
    { "id": "2f3a79a5bcf0817da71ef7ea929e7f96", "name": "血液・造血器系" },
    { "id": "2f3a79a5bcf0816ead62c937effc83c5", "name": "脳神経系" },
    { "id": "2f3a79a5bcf0817aaaf6c825e4b3bf5b", "name": "運動器系" },
    { "id": "2f3a79a5bcf081e09a7aeb49d5775745", "name": "感覚器系" },
    { "id": "2f3a79a5bcf081019f63ddadd61af091", "name": "皮膚科" },
    { "id": "2f3a79a5bcf081e78e32c1d183968dac", "name": "免疫・アレルギー・膠原病" },
    { "id": "2f3a79a5bcf081348b4cc8155b68017b", "name": "感染症" },
    { "id": "2f5a79a5bcf0802f8361e417a46cd78a", "name": "生殖器系" },
    { "id": "2f3a79a5bcf081ba81e0dbf6e0b403eb", "name": "周手術期看護" },
    { "id": "2f3a79a5bcf08180bc40d52f236a1658", "name": "がん看護" },
    { "id": "2f3a79a5bcf081bcbf3dda4776c9b4b8", "name": "母性看護" },
    { "id": "2f3a79a5bcf081a6aa1dc4cdc1be900a", "name": "小児看護" },
    { "id": "2f3a79a5bcf081edb11cc9d7df97c473", "name": "精神看護" },
    { "id": "2f3a79a5bcf081f98ba9e6e093e1d53f", "name": "老年看護" },
    { "id": "2f3a79a5bcf0819b8820e0c70f02b967", "name": "在宅・地域看護" },
    { "id": "2f3a79a5bcf08136ab70e80db98dfb9a", "name": "看護技術・基礎" },
    { "id": "2f3a79a5bcf081a29189c21ac318b9db", "name": "法律・制度" },
    { "id": "2f3a79a5bcf081f4a49ce05e28330b2b", "name": "栄養代謝" },
]

def get_text(prop):
    rich = prop.get("rich_text", [])
    return rich[0].get("plain_text", "") if rich else ""

def is_formatted(exp):
    return "→ ○" in exp or "→ ×" in exp or "→○" in exp or "→×" in exp

def get_db_id(page_id):
    r = requests.get(f"https://api.notion.com/v1/blocks/{page_id}/children", headers=HEADERS)
    for b in r.json().get("results", []):
        if b["type"] == "child_database":
            return b["id"]
    return None

def format_with_claude(question, answer, explanation, category):
    """claude -p で解説をフォーマット"""
    prompt = f"""以下の看護師国家試験問題の解説を「N.選択肢テキスト → ○/× 理由」形式に整形してください。

カテゴリ: {category}
問題文（選択肢含む）:
{question}

正解: {answer}

現在の解説:
{explanation if explanation else "(解説なし)"}

出力ルール:
- 各選択肢を「N.選択肢テキスト → ○ 理由」または「N.選択肢テキスト → × 理由」の形式で記述
- 正解の選択肢には → ○、不正解には → × をつける
- 理由は簡潔に（1〜2文）。現在の解説文がある場合はその内容を活用する
- 選択肢が問題文にない場合はスキップ
- 「2つ選べ」問題は複数の○がある
- 日本語で回答
- 余計な前置き・後書きなし（整形後の解説テキストのみ出力）"""

    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--model", "claude-haiku-4-5-20251001"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            print(f"  Claude error: {result.stderr[:100]}")
            return None
    except subprocess.TimeoutExpired:
        print("  Timeout!")
        return None
    except Exception as e:
        print(f"  Error: {e}")
        return None

def update_notion_explanation(page_id, new_explanation):
    """Notionの解説フィールドを更新"""
    # 2000文字制限
    truncated = new_explanation[:1999] if len(new_explanation) > 1999 else new_explanation
    payload = {
        "properties": {
            "解説": {
                "rich_text": [{"text": {"content": truncated}}]
            }
        }
    }
    r = requests.patch(f"https://api.notion.com/v1/pages/{page_id}", headers=HEADERS, json=payload)
    return r.json().get("object") == "page"

def main():
    # 処理済みを記録するファイル
    progress_file = "/tmp/format_progress.json"
    try:
        with open(progress_file, encoding="utf-8") as f:
            processed = set(json.load(f))
    except:
        processed = set()

    print("=== 解説フォーマット整形スクリプト ===\n")

    total_done = 0
    total_skip = 0
    total_error = 0

    for cat in CATEGORIES:
        db_id = get_db_id(cat["name"] if False else cat["id"])
        if not db_id:
            continue

        all_pages = []
        cursor = None
        while True:
            body = {"page_size": 100}
            if cursor:
                body["start_cursor"] = cursor
            r = requests.post(f"https://api.notion.com/v1/databases/{db_id}/query", headers=HEADERS, json=body)
            data = r.json()
            all_pages.extend(data.get("results", []))
            if not data.get("has_more"):
                break
            cursor = data.get("next_cursor")
            time.sleep(0.3)

        unformatted = []
        for p in all_pages:
            props = p["properties"]
            exp = get_text(props.get("解説", {}))
            if not is_formatted(exp) and "重複・削除" not in exp and p["id"] not in processed:
                q_text = get_text(props.get("問題文", {}))
                answer = get_text(props.get("正解", {}))
                if q_text:  # 空問題はスキップ
                    unformatted.append({
                        "id": p["id"],
                        "question": q_text,
                        "answer": answer,
                        "explanation": exp,
                    })

        if not unformatted:
            continue

        print(f"\n[{cat['name']}] {len(unformatted)}問を処理...")

        for q in unformatted:
            print(f"  処理中: {q['question'][:50]}...")

            new_exp = format_with_claude(q["question"], q["answer"], q["explanation"], cat["name"])

            if new_exp and (is_formatted(new_exp) or "→" in new_exp):
                if update_notion_explanation(q["id"], new_exp):
                    print(f"  ✅ 更新完了")
                    processed.add(q["id"])
                    total_done += 1
                    # 進捗保存
                    with open(progress_file, "w", encoding="utf-8") as f:
                        json.dump(list(processed), f)
                else:
                    print(f"  ❌ Notion更新失敗")
                    total_error += 1
            else:
                print(f"  ⚠️ フォーマット結果が不正: {str(new_exp)[:50]}")
                total_skip += 1

            time.sleep(1)  # API制限対策

        time.sleep(0.5)

    print(f"\n=== 完了 ===")
    print(f"  更新: {total_done}問")
    print(f"  スキップ: {total_skip}問")
    print(f"  エラー: {total_error}問")

if __name__ == "__main__":
    main()
