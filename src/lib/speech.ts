// 브라우저 내장 Web Speech API로 영어 발음을 읽어준다 — 서버 호출/비용 없음(PRD 4.6).
// iOS Safari는 사용자 제스처(탭) 핸들러 안에서 직접 호출해야만 재생을 허용하므로, 이 함수는
// 항상 버튼 onClick 같은 이벤트 핸들러 안에서 동기적으로 호출할 것 — setTimeout이나 프로미스
// 이후로 미루면 iOS에서 조용히 무시된다.
export function speakEnglish(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel(); // 이전 발음이 겹쳐 재생되지 않게
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}
