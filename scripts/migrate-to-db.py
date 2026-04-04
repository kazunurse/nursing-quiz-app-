#!/usr/bin/env python3
"""
正答率別ページ（段落形式）→ データベース形式 移行スクリプト
"""
import requests, time, re, os
from datetime import datetime

API_KEY = os.environ.get("NOTION_API_KEY", "")
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}

# 移行元ページID（段落形式）
SOURCE_PAGES = {
    "90": "2f1a79a5bcf08054a0bace5059ef4e49",
    "80": "2f1a79a5bcf080d7977fc1587e3a7420",
    "70": "2f1a79a5bcf080cc8922e99dd047daa1",
    "60": "2f1a79a5bcf08046ba1dc42fd754c7e6",
    "50": "2f1a79a5bcf08092a415e3db89473a6e",
    "40": "2f1a79a5bcf08005b256c73d614e9146",
    "30": "2f1a79a5bcf080b7ade0cc02b757ef80",
    "20": "2f1a79a5bcf08021b89ffc7205049843",
    "10": "2f1a79a5bcf08050b995fa6f70654b20",
}

# 移行先ページID（データベースを含む）
TARGET_PAGES = {
    "90": "2f5a79a5bcf0814bbf8ccf1c374f8a3f",
    "80": "2f5a79a5bcf081e4a3e2c74e84a672fb",
    "70": "2f5a79a5bcf081fbb6f9f2bc28e93e6b",
    "60": "2f5a79a5bcf081a8b32ce6e032b3cd11",
    "50": "2f5a79a5bcf081a6adfaf7efed6fb7c4",
    "40": "2f5a79a5bcf081c99ebdefacc47d5d32",
    "30": "2f5a79a5bcf0818e8519f4cf95de91a9",
    "20": "2f5a79a5bcf08187958fdc0122db413d",
    "10": "2f5a79a5bcf081429014e974614b56ab",
}


def get_all_blocks(page_id):
    blocks, cursor = [], None
    while True:
        url = f"https://api.notion.com/v1/blocks/{page_id}/children?page_size=100"
        if cursor:
            url += f"&start_cursor={cursor}"
        data = requests.get(url, headers=HEADERS).json()
        if data.get("object") == "error":
            print(f"  エラー: {data.get('message')}")
            break
        blocks.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
        time.sleep(0.3)
    return blocks


def txt(block):
    btype = block["type"]
    return "".join(t.get("plain_text", "") for t in block.get(btype, {}).get("rich_text", [])).strip()


def is_date(s):
    return bool(re.match(r"\d{4}/\d{2}/\d{2}", s))


def is_rate(s):
    return "正答率" in s


def parse_answer(s):
    mapping = {"①": "1", "②": "2", "③": "3", "④": "4"}
    for k, v in mapping.items():
        if k in s:
            return v
    r = re.search(r"([1-4])", s)
    return r.group(1) if r else ""


def parse_questions(blocks):
    qs = []
    i = 0
    while i < len(blocks):
        t = txt(blocks[i])
        bt = blocks[i]["type"]

        # 問題開始: 日付ブロック OR (段落 + 次が日付)
        start_date = None
        bunya = ""

        if bt == "paragraph" and is_date(t):
            start_date = t
            i += 1
        elif bt == "paragraph" and t and not is_rate(t) and not t.startswith("正解"):
            if i + 1 < len(blocks) and is_date(txt(blocks[i + 1])):
                bunya = t
                i += 1
                start_date = txt(blocks[i])
                i += 1
            else:
                i += 1
                continue
        else:
            i += 1
            continue

        # 正答率
        rate = ""
        if i < len(blocks) and is_rate(txt(blocks[i])):
            rate = txt(blocks[i])
            i += 1

        # 空行スキップ
        while i < len(blocks) and not txt(blocks[i]):
            i += 1

        # 問題文
        if i >= len(blocks) or blocks[i]["type"] != "paragraph":
            continue
        mondai = txt(blocks[i])
        i += 1

        # 空行スキップ
        while i < len(blocks) and not txt(blocks[i]):
            i += 1

        # 選択肢
        choices = []
        while i < len(blocks) and blocks[i]["type"] == "numbered_list_item":
            choices.append(txt(blocks[i]))
            i += 1
        if not choices:
            continue

        # 正解
        seikai = ""
        if i < len(blocks) and "正解" in txt(blocks[i]):
            seikai = parse_answer(txt(blocks[i]))
            i += 1

        # 解説
        kaisetsu_parts = []
        while i < len(blocks):
            t2 = txt(blocks[i])
            bt2 = blocks[i]["type"]
            if not t2:
                i += 1
                if i < len(blocks):
                    nt = txt(blocks[i])
                    if not nt or is_date(nt):
                        break
                    if i + 1 < len(blocks) and is_date(txt(blocks[i + 1])):
                        break
                else:
                    break
                continue
            if bt2 in ["numbered_list_item", "paragraph"]:
                kaisetsu_parts.append(t2)
                i += 1
            else:
                break

        qs.append({
            "bunya": bunya,
            "date": start_date,
            "rate": rate,
            "mondai": mondai,
            "choices": "\n".join([f"{k+1}. {c}" for k, c in enumerate(choices)]),
            "seikai": seikai,
            "kaisetsu": "\n".join(kaisetsu_parts),
        })

    return qs


def get_target_db_id(target_page_id):
    blocks = get_all_blocks(target_page_id)
    for block in blocks:
        if block["type"] == "child_database":
            return block["id"].replace("-", "")
    return None


def create_db_record(db_id, q):
    date_iso = None
    if q["date"]:
        try:
            dt = datetime.strptime(q["date"], "%Y/%m/%d")
            date_iso = dt.strftime("%Y-%m-%d")
        except:
            pass

    full_mondai = q["mondai"]
    if q["choices"]:
        full_mondai += "\n\n" + q["choices"]

    properties = {
        "Name": {"title": [{"text": {"content": q["mondai"][:100]}}]},
        "問題文": {"rich_text": [{"text": {"content": full_mondai[:2000]}}]},
        "回答": {"rich_text": [{"text": {"content": q["seikai"]}}]},
        "解説": {"rich_text": [{"text": {"content": q["kaisetsu"][:2000]}}]},
    }
    if q["bunya"]:
        properties["分野"] = {"select": {"name": q["bunya"]}}
    if date_iso:
        properties["日付"] = {"date": {"start": date_iso}}

    res = requests.post(
        "https://api.notion.com/v1/pages",
        headers=HEADERS,
        json={"parent": {"database_id": db_id}, "properties": properties}
    )
    return res.json()


def main():
    print("=" * 50)
    print("正答率別データ移行スクリプト")
    print("=" * 50)

    total_migrated = 0

    for level in ["90", "80", "70", "60", "50", "40", "30", "20", "10"]:
        source_id = SOURCE_PAGES[level]
        target_page_id = TARGET_PAGES[level]

        print(f"\n--- {level}% 処理中 ---")

        blocks = get_all_blocks(source_id)
        print(f"  取得ブロック数: {len(blocks)}")

        if not blocks:
            print(f"  データなし、スキップ")
            continue

        questions = parse_questions(blocks)
        print(f"  解析した問題数: {len(questions)}")

        if not questions:
            print(f"  問題なし、スキップ")
            continue

        db_id = get_target_db_id(target_page_id)
        if not db_id:
            print(f"  データベースが見つかりません、スキップ")
            continue

        for idx, q in enumerate(questions):
            result = create_db_record(db_id, q)
            if result.get("object") == "error":
                print(f"  [{idx+1}/{len(questions)}] ❌ {result.get('message','')[:60]}")
            else:
                print(f"  [{idx+1}/{len(questions)}] ✅ {q['mondai'][:50]}...")
            time.sleep(0.4)

        total_migrated += len(questions)

    print(f"\n{'='*50}")
    print(f"完了！合計 {total_migrated} 問を移行しました。")


if __name__ == "__main__":
    main()
