// 손으로 쓴 타입. 나중에 `supabase gen types typescript`로 생성한 정식 타입으로 교체 권장.
// Family/Profile은 리딩버디와 공유하는 테이블 그대로(docs/ARCHITECTURE.md 4장) — 필드 정의도
// 리딩버디 src/lib/types.ts에서 그대로 가져왔다.

export interface Family {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
}

export type ProfileRole = "parent" | "child";

export interface Profile {
  id: string;
  family_id: string;
  user_id: string | null;
  role: ProfileRole;
  name: string;
  avatar: string;
  avatar_photo_path: string | null;
  pin_hash: string | null;
  pin_fail_count: number;
  pin_locked_until: string | null;
  created_at: string;
}

// --- 이 앱(단어콕) 고유 테이블. docs/PRD.md 3장 참고. ---

export interface VocabWord {
  id: string;
  family_id: string;
  child_id: string;
  korean: string;
  english: string;
  created_at: string;
}

export type VocabBatchStatus = "pending_review" | "confirmed";

export interface VocabBatch {
  id: string;
  family_id: string;
  child_id: string;
  title: string | null;
  source_image_url: string | null;
  status: VocabBatchStatus;
  registered_at: string;
}

export interface VocabBatchItem {
  batch_id: string;
  word_id: string;
  position: number;
}

export type VocabAttemptMode = "check" | "game";
export type VocabAnswerMode = "typing" | "choice" | "arrange";

export interface VocabAttempt {
  id: string;
  family_id: string;
  word_id: string;
  child_id: string;
  mode: VocabAttemptMode;
  answer_mode: VocabAnswerMode;
  user_input: string;
  is_correct: boolean;
  attempted_at: string;
}
