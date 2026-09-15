// 로그인 없이 체험할 수 있는 데모용 고정 단어 목록 — 실제 등록된 능률보카 중등기본
// DAY 01(voca_mp3/능률보카_중등기본_DAY_01_표제어_뜻_review.csv)에서 뜻이 깨끗하게 잡힌
// 단어 10개만 추려왔다(⚠️ 표시가 붙었거나 STT 오인식으로 뜻이 부자연스러운 항목은 제외 —
// 첫인상용 데모라 정확한 항목만 쓴다, 4.7 참고). DB에 없는 로컬 상수라 id는 "demo-" 접두사로
// 실제 vocab_words.id(uuid)와 절대 겹치지 않게 한다.
export interface DemoWord {
  id: string;
  korean: string;
  english: string;
}

export const DEMO_BATCH_TITLE = "능률보카 중등기본 DAY 01 (체험판)";

export const DEMO_DAY1_WORDS: DemoWord[] = [
  { id: "demo-1", korean: "키가 큰", english: "tall" },
  { id: "demo-2", korean: "가지다", english: "have" },
  { id: "demo-3", korean: "만나다", english: "meet" },
  { id: "demo-4", korean: "보다", english: "see" },
  { id: "demo-5", korean: "배우", english: "actor" },
  { id: "demo-6", korean: "만들다", english: "make" },
  { id: "demo-7", korean: "친구", english: "friend" },
  { id: "demo-8", korean: "학교", english: "school" },
  { id: "demo-9", korean: "방", english: "room" },
  { id: "demo-10", korean: "춤추다", english: "dance" },
];
