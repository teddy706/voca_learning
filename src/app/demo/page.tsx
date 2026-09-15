import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { DEMO_BATCH_TITLE, DEMO_DAY1_WORDS } from "@/lib/demoWords";

// 회원가입 없이 체험할 수 있는 데모 허브 — 실제 /check/[batchId] 모드 허브와 같은 구성
// (복습 + 시험 도전 3종)이지만 로그인/DB 조회가 전혀 없는 정적 페이지라 middleware의 세션
// 갱신 외에는 별도 접근 제어가 없다(누구나 볼 수 있음, 의도된 동작).
const TEST_MODES = [
  { mode: "typing", emoji: "⌨️", label: "타이핑 입력", desc: "한글을 보고 영어 스펠링을 입력해요" },
  { mode: "choice", emoji: "🔤", label: "4지선다", desc: "비슷하게 생긴 보기 중에서 골라요" },
  { mode: "arrange", emoji: "🧩", label: "글자 배열", desc: "섞인 글자 타일을 순서대로 놓아요" },
] as const;

export default function DemoHubPage() {
  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-lg flex-1">
        <BackLink href="/login" />

        <div className="mb-4 rounded-card border-2 border-ink bg-a-light px-4 py-2 text-center text-sm font-bold">
          🎈 회원가입 없이 체험 중이에요 · 단어 {DEMO_DAY1_WORDS.length}개
        </div>

        <h1 className="mb-6 mt-1 text-center text-xl font-bold">{DEMO_BATCH_TITLE}</h1>

        <Link href="/demo/review" className="card mb-4 block text-center">
          <p className="text-2xl">📖</p>
          <p className="font-bold">복습하기</p>
          <p className="text-sm text-soft">한글을 보고 터치하면 영어가 나와요</p>
        </Link>

        <p className="mb-2 text-center text-sm font-bold text-soft">시험 도전</p>
        <div className="mb-6 flex flex-col gap-3">
          {TEST_MODES.map(({ mode, emoji, label, desc }) => (
            <Link key={mode} href={`/demo/${mode}`} className="card mb-0 flex items-center gap-3">
              <span className="text-2xl">{emoji}</span>
              <span className="flex-1">
                <span className="block font-bold">{label}</span>
                <span className="block text-sm text-soft">{desc}</span>
              </span>
            </Link>
          ))}
        </div>

        <Link href="/login" className="btn btn-primary mb-0">
          가입하고 전체 단어장 시작하기
        </Link>
      </div>
    </div>
  );
}
