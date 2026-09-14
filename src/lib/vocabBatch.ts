import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resolveActingChild } from "@/lib/vocabAuth";

export interface BatchWord {
  id: string;
  korean: string;
  english: string;
}

/**
 * batchId로 배치를 가져오되, 지금 로그인한 세션이 그 배치의 주인(자녀 본인) 또는 같은 가족의
 * 부모일 때만 돌려준다(vocabAuth.resolveActingChild) — 요청 쪽에서 childId를 미리 알 필요가
 * 없다, 배치 자체가 누구 것인지 이미 갖고 있으므로 그걸로 권한을 역산한다.
 */
export async function getOwnedBatchWithWords(batchId: string) {
  const supabase = createClient();

  const { data: batch } = await supabase
    .from("vocab_batches")
    .select("id, title, child_id")
    .eq("id", batchId)
    // pending_review 배치(사진 OCR 등록 흐름용, 현재 보류)는 아직 등록자가 확정하지 않은
    // 상태라 목록(/check)에도 안 보인다 — 여기서도 같은 기준으로 막아야 URL을 알아도
    // 확정 전 배치를 못 열어본다(코드 리뷰에서 발견).
    .eq("status", "confirmed")
    .maybeSingle();
  if (!batch) return null;

  const acting = await resolveActingChild(batch.child_id);
  if (!acting) return null;

  const { data: items } = await supabase
    .from("vocab_batch_items")
    .select("position, word:vocab_words(id, korean, english)")
    .eq("batch_id", batch.id)
    .order("position", { ascending: true });

  // supabase-js는 생성된 DB 타입이 없으면 1:1 관계(word_id -> vocab_words.id)도 배열로 추론한다 —
  // 실제 런타임 값은 단일 객체라 unknown을 거쳐 원하는 타입으로 바꿔준다.
  const words: BatchWord[] = (items ?? [])
    .map((item) => item.word as unknown as BatchWord | null)
    .filter((word): word is BatchWord => word !== null);

  return { batch, words, child: acting.child, requester: acting.requester };
}

/** 4지선다 디스트랙터 풀용 — 이 자녀의 단어은행 전체 영어 스펠링. */
export async function getChildWordPool(childId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("vocab_words").select("english").eq("child_id", childId);
  if (error) console.error("getChildWordPool 조회 실패:", error);
  return (data ?? []).map((w) => w.english);
}

export type WordMarkStatus = "known" | "unknown";

/** 복습 모드 "알아요/몰라요" 표시 — child_id+word_id당 최신 상태. 예전에 다른 배치에서
 * 표시한 것도 그대로 살아있어서 "전에 알았다고 표기했다"는 걸 보여줄 수 있다.
 *
 * word_id 목록으로 좁히지 않고 항상 child_id 하나로 전체를 가져온다 — 예전엔 배치 하나 분량만
 * 상정하고 word_id를 .in()에 나열했는데, "배치 하나 분량"이라는 전제가 호출부마다 지켜진다는
 * 보장이 없고, 실제로 같은 실수(word_id를 수백 개 .in()에 나열해 URL이 너무 길어져 요청이
 * 조용히 실패)를 getBatchHistorySummaries에서 이미 한 번 겪었다(2026-09-14, 코드 리뷰에서
 * 지적 — "같은 파일 안 다른 함수에 같은 위험 패턴이 남아있다"). 자녀 한 명의 단어 수(최대
 * 수천 개)는 애초에 한 번에 가져와도 무리 없는 크기라, word_id 필터 자체를 없애는 게
 * 이 위험을 매 호출부에서 재발 방지하는 가장 근본적인 방법이다. */
export async function getWordMarks(childId: string): Promise<Map<string, WordMarkStatus>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vocab_word_marks")
    .select("word_id, status")
    .eq("child_id", childId);
  if (error) console.error("getWordMarks 조회 실패:", error);
  return new Map((data ?? []).map((m) => [m.word_id, m.status as WordMarkStatus]));
}

export interface BatchHistorySummary {
  known: number;
  unknown: number;
  stars: number;
}

/**
 * 단어장 목록(/check) 카드에 보여줄 간략한 학습 이력 — 배치별로 "알아요/몰라요" 표시 개수와
 * 시험 도전 3종 별 총합을 한 번에 집계한다. 배치가 많아도(최대 50개) 쿼리 3번으로 끝나게
 * batch_id별로 순회하지 않고 한 번에 가져와 애플리케이션에서 묶는다.
 */
export async function getBatchHistorySummaries(
  childId: string,
  batchIds: string[]
): Promise<Map<string, BatchHistorySummary>> {
  const empty = new Map<string, BatchHistorySummary>();
  if (batchIds.length === 0) return empty;

  const supabase = createClient();

  // 배치가 많으면(최대 50개) 단어도 수백~수천 개가 되므로, word_id로 좁히지 않고 child_id
  // 하나로 전체를 가져오는 getWordMarks를 그대로 재사용한다(이 자녀의 단어 수만큼이 상한이라
  // 어차피 크지 않다) — word_id를 .in()에 나열하다 URL이 너무 길어져 요청이 조용히 실패했던
  // 사고(2026-09-14)가 있었던 곳이라 이제 별도 구현 대신 이미 고쳐진 함수를 쓴다.
  const [itemsRes, marks, starsRes] = await Promise.all([
    supabase.from("vocab_batch_items").select("batch_id, word_id").in("batch_id", batchIds),
    getWordMarks(childId),
    supabase.from("vocab_stars").select("batch_id, star_count").eq("child_id", childId).in("batch_id", batchIds),
  ]);
  if (itemsRes.error) console.error("getBatchHistorySummaries batch_items 조회 실패:", itemsRes.error);
  if (starsRes.error) console.error("getBatchHistorySummaries stars 조회 실패:", starsRes.error);

  const items = itemsRes.data;
  const stars = starsRes.data;

  const summaries = new Map<string, BatchHistorySummary>(
    batchIds.map((id) => [id, { known: 0, unknown: 0, stars: 0 }])
  );

  for (const item of items ?? []) {
    const summary = summaries.get(item.batch_id);
    const mark = marks.get(item.word_id);
    if (!summary || !mark) continue;
    if (mark === "known") summary.known += 1;
    else summary.unknown += 1;
  }

  for (const star of stars ?? []) {
    const summary = summaries.get(star.batch_id);
    if (summary) summary.stars += star.star_count;
  }

  return summaries;
}
