#!/usr/bin/env python3
"""
능률보카 중등기본 DAY 01~50 *_review.csv를 Supabase(vocab_words/vocab_batches/vocab_batch_items)로
가져오는 1회성 스크립트. PRD 4.7 흐름의 4단계("검수 끝난 CSV들을 읽어 Supabase에 upsert").

사진 촬영 → OCR 등록 경로(Phase 1의 2~4번)는 이번 Phase에서 제외하기로 함(2026-09-14 사용자 결정) —
이 스크립트가 그 대신 단어 등록의 주 경로가 된다.

실행: python3 scripts/import_vocab_csv.py
      (voca_learning/.env.local의 SUPABASE_SERVICE_ROLE_KEY로 RLS를 우회해 서버 role로 실행됨.
       service_role 키가 코드에 절대 하드코딩되지 않도록 .env.local에서만 읽는다.)

재실행해도 안전(idempotent): 이미 같은 child_id+title로 만들어진 배치는 건너뛴다. vocab_words는
DB의 unique(child_id, korean, english) + upsert(on_conflict)로 자동 병합된다.
"""
import csv
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

# CSV/오디오 원본은 이 리포 안 voca_mp3/에 있다(오디오 STT+PDF 대조 작업 자체는 별도
# MP3_stt 작업 디렉터리에서 했고, 검수 끝난 결과물만 여기로 복사해왔다 — PRD 4.7/4.8 참고).
# mp3 파일 자체는 .gitignore로 제외하고 리뷰 CSV만 추적한다.
SOURCE_DIR = os.path.join(os.path.dirname(__file__), "..", "voca_mp3")
CSV_GLOB = os.path.join(SOURCE_DIR, "*_review.csv")

# 2026-09-14 사용자 확인: 실제 쌍둥이 자녀 프로필(리딩버디 공유 Supabase 프로젝트의 profiles 테이블).
# 이 목록에 없는 프로필(예: 테스트/시딩 데이터로 보이는 "아빠"(role=child), "정보라", 다른 family의
# "민준")은 의도적으로 제외했다 — 실수로 그쪽에 데이터를 넣지 않기 위해 하드코딩으로 고정한다.
FAMILY_ID = "d60d0acc-88b4-41ce-940b-b2f9fe375932"
CHILDREN = [
    {"id": "62f98c6a-2b80-4bb2-bb09-e2c6c3f223e2", "name": "고아린"},
    {"id": "8e0cd81f-47d9-42ff-8b08-f80aae9bef93", "name": "황유니"},
]

DAY_RE = re.compile(r"DAY_(\d+)")


def load_env_local(path):
    env = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    return env


def supabase_request(base_url, service_key, method, path, body=None, prefer=None):
    url = f"{base_url}/rest/v1/{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("apikey", service_key)
    req.add_header("Authorization", f"Bearer {service_key}")
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path} -> {e.code}: {e.read().decode('utf-8')}") from e


def parse_csv(path):
    """CSV 컬럼: 영어,한글뜻,확인필요. 확인필요(⚠️)는 임포트 대상에서 제외하지 않고 그대로 가져온다
    (이미 검수 완료한 데이터를 신뢰 — VOCAB_AUDIT_REPORT.md 기준 별도 정제는 이 스크립트 책임 밖).

    (english, korean)이 완전히 동일한 연속 중복 행은 제거한다 — 일부 DAY 파일(예: DAY_10)에
    STT dedup이 빠져 원본 CSV에 그대로 남아있는 경우가 있는데, 그대로 두면 같은 (child_id,
    korean, english) 조합이 한 INSERT 안에 두 번 들어가 ON CONFLICT가 "affect row a second time"
    에러를 낸다. 완전 동일 쌍만 제거하고, 같은 영어에 다른 뜻이 달린 행은 그대로 둔다."""
    rows = []
    seen = set()
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            english = (row.get("영어") or "").strip()
            korean = (row.get("한글뜻") or "").strip()
            if not english or not korean:
                continue
            key = (english, korean)
            if key in seen:
                continue
            seen.add(key)
            rows.append((english, korean))
    return rows


def day_title(filename):
    m = DAY_RE.search(filename)
    day_num = m.group(1) if m else "?"
    return f"능률보카 중등기본 DAY {day_num}"


def batch_exists(base_url, service_key, child_id, title):
    path = f"vocab_batches?child_id=eq.{child_id}&title=eq.{urllib.parse.quote(title)}&select=id"
    existing = supabase_request(base_url, service_key, "GET", path)
    return existing[0]["id"] if existing else None


def import_day(base_url, service_key, csv_path, child):
    title = day_title(os.path.basename(csv_path))
    rows = parse_csv(csv_path)
    if not rows:
        print(f"  [{child['name']}] {title}: 빈 파일, 건너뜀")
        return

    existing_id = batch_exists(base_url, service_key, child["id"], title)
    if existing_id:
        print(f"  [{child['name']}] {title}: 이미 등록됨(batch {existing_id}), 건너뜀")
        return

    # 1) vocab_words upsert (child_id+korean+english 유니크 — 이미 있으면 merge, id는 기존 것 반환)
    word_payload = [
        {"family_id": FAMILY_ID, "child_id": child["id"], "korean": korean, "english": english}
        for english, korean in rows
    ]
    upserted = supabase_request(
        base_url, service_key, "POST", "vocab_words?on_conflict=child_id,korean,english",
        body=word_payload, prefer="resolution=merge-duplicates,return=representation",
    )
    word_id_by_pair = {(w["korean"], w["english"]): w["id"] for w in upserted}

    # 2) vocab_batches 생성 (이 배치는 이미 검수된 데이터이므로 confirmed로 바로 생성)
    batch = supabase_request(
        base_url, service_key, "POST", "vocab_batches",
        body=[{
            "family_id": FAMILY_ID,
            "child_id": child["id"],
            "title": title,
            "source_image_url": None,
            "status": "confirmed",
        }],
        prefer="return=representation",
    )
    batch_id = batch[0]["id"]

    # 3) vocab_batch_items — CSV 원래 순서를 position으로 보존
    items = []
    missing = 0
    for position, (english, korean) in enumerate(rows):
        word_id = word_id_by_pair.get((korean, english))
        if not word_id:
            missing += 1
            continue
        items.append({"batch_id": batch_id, "word_id": word_id, "position": position})
    if items:
        supabase_request(base_url, service_key, "POST", "vocab_batch_items", body=items)

    print(f"  [{child['name']}] {title}: 단어 {len(rows)}개 등록 완료(batch {batch_id})" +
          (f", 매칭 실패 {missing}개" if missing else ""))


def main():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    env = load_env_local(env_path)
    base_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not service_key:
        sys.exit(".env.local에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.")

    csv_files = sorted(glob.glob(CSV_GLOB), key=lambda p: int(DAY_RE.search(p).group(1)))
    if not csv_files:
        sys.exit(f"{CSV_GLOB} 에서 CSV를 찾지 못했습니다.")

    print(f"{len(csv_files)}개 DAY 파일, {len(CHILDREN)}명 자녀 대상으로 가져오기 시작")
    for csv_path in csv_files:
        for child in CHILDREN:
            import_day(base_url, service_key, csv_path, child)


if __name__ == "__main__":
    main()
