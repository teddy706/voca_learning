import { BackLink } from "@/components/BackLink";
import { DemoReviewSession } from "@/components/demo/DemoReviewSession";
import { DEMO_DAY1_WORDS } from "@/lib/demoWords";

export default function DemoReviewPage() {
  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-lg flex-1">
        <BackLink href="/demo" />
        <h1 className="mb-4 mt-1 text-center text-xl font-bold">복습하기 (체험판)</h1>
        <DemoReviewSession words={DEMO_DAY1_WORDS} />
      </div>
    </div>
  );
}
