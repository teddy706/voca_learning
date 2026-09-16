# 단어콕 🔤

초등 3학년 쌍둥이(고아린, 황유니)와 가족이 함께 쓰는 영단어 스펠링 암기 PWA입니다. 학원 영단어 시험 대비를 "종이 단어장 손으로 가리고 구두로 확인"하던 방식에서, 앱으로 복습하고 채점 기록이 남는 방식으로 대체합니다.

**서비스 중**: https://voca-learning-blush.vercel.app

## 주요 기능

- **회원가입 없이 체험**: 로그인 화면에서 바로 DAY 1 단어로 복습·시험을 체험할 수 있는 데모(`/demo`)
- **복습(암기) 모드**: 한글 카드를 탭하면 영어로 뒤집히는 플래시카드. 발음 자동 재생(음소거 가능), "알아요/몰라요" 자기평가와 배지 표시
- **시험 도전 3종**: 타이핑 입력, 4지선다(유사 스펠링 오답 자동 생성), 글자 배열(타일 탭으로 순서 맞추기) — 서버가 채점을 authoritative하게 처리
- **별 보상**: 오답 없이 만점을 받으면 별이 쌓이고, 반복해서 만점을 받을수록 계속 누적
- **부모용 기능**: 자녀 PIN 없이 화면 미리보기, 자녀별 학습 현황 대시보드(등록 단어/DAY 수, 정답률, 누적 별, 최근 학습 기록)
- **자녀 PIN 로그인**: 부모 계정 아래 여러 자녀 프로필을 PIN으로 전환
- **PWA**: 홈 화면에 설치해서 앱처럼 사용 가능(아이폰/아이패드 대상 반응형)

## 기술 스택

| 레이어 | 선택 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| 백엔드 | Supabase (PostgreSQL + Auth + RLS) — 자매 프로젝트 reading-buddy와 같은 프로젝트 공유 |
| 배포 | Vercel (서울 리전), GitHub 연동 자동 배포 |
| 발음 재생 | Web Speech API (브라우저 내장, 서버 비용 없음) |
| 테스트 | Vitest |
| 사진/OCR 인프라 | Azure Blob Storage / Document Intelligence — 현재는 보류 상태(아래 참고) |

## 단어 등록 방식

원래는 학원 단어장을 사진으로 찍어 OCR로 등록할 계획이었지만, 실제 시험 범위가 시판 교재(능률보카 중등기본 DAY 01~50)와 같다는 걸 확인해서 **오디오 음성 인식 + 정답지 대조로 만든 CSV를 일괄 가져오는 방식**으로 대체했습니다. 사진 OCR 등록에 필요한 Azure 인프라는 만들어 두었지만, 다른 교재로 바뀌는 등 필요해질 때까지 사용하지 않습니다.

```
MP3_stt/voca_mp3/*_review.csv  (별도 작업 디렉터리에서 완성)
        │
        ▼
scripts/import_vocab_csv.py  (이 저장소)
        │
        ▼
Supabase: vocab_words / vocab_batches / vocab_batch_items
        │
        ▼
복습 · 시험 도전 · 대시보드
```

## 로컬 개발

```bash
npm install
cp .env.local.example .env.local   # 아래 환경변수 채우기
npm run dev
```

### 환경변수 (`.env.local`)

Supabase 관련 값은 **reading-buddy 프로젝트와 완전히 동일한 값**을 그대로 복사해야 합니다(새로 발급하지 않음) — 같은 Supabase 프로젝트를 공유하는 구조입니다.

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | reading-buddy와 동일 |
| `SUPABASE_SERVICE_ROLE_KEY` | reading-buddy와 동일, legacy JWT 형식이어야 함 |
| `CHILD_AUTH_SECRET` | reading-buddy와 정확히 동일해야 자녀 PIN 로그인이 기존 계정에 붙음 |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` / `_KEY` | 현재 미사용(OCR 경로 보류) |
| `AZURE_STORAGE_ACCOUNT_NAME` / `_ACCOUNT_KEY` / `_CONTAINER_NAME` | 현재 미사용(사진 등록 경로 보류) |

### 자주 쓰는 명령

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run test        # vitest run
npm run build       # 프로덕션 빌드 — dev 서버가 떠 있을 때는 실행하지 말 것(.next 캐시 충돌)
```

배포는 `main` 브랜치에 push하면 Vercel이 자동으로 재배포합니다. 로컬에서 즉시 배포하려면 `vercel --prod --yes`(dev 서버와 독립적으로 동작하므로 언제든 실행 가능).

## 저장소 구조

```
src/
├── app/          # Next.js App Router 페이지 + API 라우트
├── components/   # 복습/시험 세션 UI, 데모 전용 컴포넌트(components/demo)
└── lib/          # 인증, Supabase 클라이언트, 채점/디스트랙터 로직 등
scripts/          # CSV → Supabase 일괄 등록 스크립트
supabase/migrations/  # 이 앱 전용 테이블·RLS 마이그레이션(SQL Editor에서 수동 실행)
docs/             # PRD, 유저 스토리, 브리프, 아키텍처 문서
```

## 문서

- [CLAUDE.md](CLAUDE.md) — 개발 진행 로그 겸 AI 코딩 어시스턴트용 프로젝트 지침(가장 최신 상태)
- [docs/PRD.md](docs/PRD.md) — 기획 배경, 확정 결정, 로드맵
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — as-built 아키텍처, 데이터 모델, 알려진 함정
- [docs/STORIES.md](docs/STORIES.md) — 에픽/유저 스토리 목록
- [docs/BRIEF.md](docs/BRIEF.md) — 한 페이지 요약

## 비공개 저장소 안내

이 프로젝트는 특정 가족을 위해 만든 개인용 앱으로, 실제 아동 사용자 데이터와 자매 프로젝트 인증 정보를 다룹니다. 저장소는 비공개(private)로 유지합니다.
