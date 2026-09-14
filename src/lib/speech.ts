// 브라우저 내장 Web Speech API로 영어 발음을 읽어준다 — 서버 호출/비용 없음(PRD 4.6).
// iOS Safari는 사용자 제스처(탭) 핸들러 안에서 직접 호출해야만 재생을 허용하므로, 이 함수는
// 항상 버튼 onClick 같은 이벤트 핸들러 안에서 동기적으로 호출할 것 — setTimeout이나 프로미스
// 이후로 미루면 iOS에서 조용히 무시된다.

const MUTE_STORAGE_KEY = "vocab-speech-muted";

// 발음 재생 음소거 여부. 기기별 UI 취향이라 서버 저장 없이 localStorage에만 둔다(참고:
// 개인정보 보호 브라우저/시크릿 모드에서 접근이 막힐 수 있어 try/catch로 감쌈).
export function isSpeechMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSpeechMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // 저장 실패해도 이번 세션 동작에는 지장 없음 — 무시
  }
  if (muted && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function speakEnglish(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (isSpeechMuted()) return;
  window.speechSynthesis.cancel(); // 이전 발음이 겹쳐 재생되지 않게
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}
