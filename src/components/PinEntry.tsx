"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PinDots, PinKeypad, PinConfirmButton } from "@/components/PinKeypad";

// 리딩버디 PinEntry.tsx를 포팅 — "PIN을 잊어버렸어요" 링크는 이 앱에 자녀 관리 설정 화면이
// 없어서 뺐다(PIN 재설정은 리딩버디 쪽에서 하면 됨, 같은 계정을 공유하므로).
export function PinEntry({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockedForSec, setLockedForSec] = useState(0);

  useEffect(() => {
    if (lockedForSec <= 0) return;
    const timer = setInterval(() => {
      setLockedForSec((sec) => {
        if (sec <= 1) {
          setError(null);
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedForSec]);

  function onChange(next: string) {
    if (lockedForSec > 0) return;
    setError(null);
    setPin(next);
  }

  async function submit() {
    if (pin.length !== 4 || lockedForSec > 0 || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/children/${profileId}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "PIN이 맞지 않아요.");
        setPin("");
        setShake(true);
        setTimeout(() => setShake(false), 400);
        if (data.lockedForSec) setLockedForSec(data.lockedForSec);
        return;
      }
      router.push("/home");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className={shake ? "animate-[shake_0.4s]" : ""}>
        <PinDots length={4} filled={pin.length} />
      </div>
      {lockedForSec > 0 ? (
        <p className="mb-4 text-center text-sm font-semibold text-red-500">
          너무 많이 틀렸어요. {lockedForSec}초 후 다시 시도해주세요.
        </p>
      ) : (
        error && <p className="mb-4 text-center text-sm font-semibold text-red-500">{error}</p>
      )}
      <PinKeypad value={pin} onChange={onChange} disabled={loading || lockedForSec > 0} />
      <PinConfirmButton ready={pin.length === 4 && lockedForSec === 0} loading={loading} onClick={submit} />
    </div>
  );
}
