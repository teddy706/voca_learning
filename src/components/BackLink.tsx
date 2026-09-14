import Link from "next/link";

// 리딩버디 BackLink.tsx 그대로 포팅 — 화면 아래까지 안 내려가도 위쪽에서 바로 나갈 수 있게.
export function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="btn-pill mb-4">
      ← 뒤로
    </Link>
  );
}
