"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했어요.");
        return;
      }
      router.push("/profiles");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell justify-center">
      <div className="mx-auto w-full max-w-sm md:max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-[18px] border-2 border-ink bg-a-light text-3xl shadow-sm">
            🔤
          </span>
          <h1 className="text-2xl font-bold">단어콕</h1>
          <p className="mt-1 text-center text-sm text-soft">부모 계정으로 로그인해요</p>
        </div>

        <form className="card" onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
          />
          {error && <p className="mb-2 text-sm font-semibold text-red-500">{error}</p>}
          <button type="submit" className="btn btn-primary mb-0" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-soft">리딩버디와 같은 계정으로 로그인할 수 있어요.</p>

        <Link href="/demo" className="btn btn-outline mb-0 mt-6">
          🎈 회원가입 없이 DAY 1 체험하기
        </Link>
      </div>
    </div>
  );
}
