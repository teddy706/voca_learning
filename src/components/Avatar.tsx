// 리딩버디의 Avatar.tsx를 단순화해서 포팅 — 이 앱은 자녀 얼굴 사진 아바타를 쓰지 않으므로
// emoji만 지원한다(필요해지면 photoUrl prop을 다시 추가).
export function Avatar({ emoji, size = "md" }: { emoji: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-16 w-16 text-4xl" : size === "sm" ? "h-9 w-9 text-lg" : "h-12 w-12 text-2xl";

  return (
    <span
      className={`inline-flex ${sizeClass} items-center justify-center rounded-full border-2 border-ink bg-a-light`}
    >
      {emoji}
    </span>
  );
}
