import { BackLink } from "@/components/BackLink";
import { DemoQuizSession } from "@/components/demo/DemoQuizSession";
import { DEMO_DAY1_WORDS } from "@/lib/demoWords";

export default function DemoTypingPage() {
  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-lg flex-1">
        <BackLink href="/demo" />
        <h1 className="mb-4 mt-1 text-center text-xl font-bold">타이핑 입력 (체험판)</h1>
        <DemoQuizSession mode="typing" words={DEMO_DAY1_WORDS} />
      </div>
    </div>
  );
}
