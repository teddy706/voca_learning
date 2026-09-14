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
  const { data } = await supabase.from("vocab_words").select("english").eq("child_id", childId);
  return (data ?? []).map((w) => w.english);
}

export type WordMarkStatus = "known" | "unknown";

/** 복습 모드 "알아요/몰라요" 표시 — child_id+word_id당 최신 상태. 예전에 다른 배치에서
 * 표시한 것도 그대로 살아있어서 "전에 알았다고 표기했다"는 걸 보여줄 수 있다. */
export async function getWordMarks(
  childId: string,
  wordIds: string[]
): Promise<Map<string, WordMarkStatus>> {
  if (wordIds.length === 0) return new Map();
  // word_id를 전부 .in() 쿼리에 나열하는 방식이라, 아주 많은 단어(수백 개+)를 한 번에 넘기면
  // URL이 너무 길어져 요청이 조용히 실패할 수 있다(2026-09-14 getBatchHistorySummaries에서
  // 876개로 실제로 겪음 — 그쪽은 child_id 전체 조회로 바꿔서 고침). 이 함수는 배치 하나 분량
  // (수십 개) 호출만 상정한다 — 더 많이 넘길 일이 생기면 child_id 전체 조회로 바꿀 것.
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vocab_word_marks")
    .select("word_id, status")
    .eq("child_id", childId)
    .in("word_id", wordIds);
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

  // 배치가 많으면(최대 50개) 단어도 수백~수천 개가 되는데, getWordMarks처럼 word_id를
  // 전부 .in() 쿼리에 나열하면 URL이 너무 길어져 요청이 조용히 실패한다(876개 UUID ≈ 32,000자,
  // 2026-09-14 실제로 겪음 — marks가 항상 빈 Map으로 돌아왔었다). 여기서는 word_id로 좁히지
  // 않고 child_id 하나로만 vocab_word_marks 전체를 가져와(이 자녀의 단어 수만큼이 상한이라
  // 어차피 크지 않다) 애플리케이션에서 batch_items와 조인한다.
  const [itemsRes, marksRes, starsRes] = await Promise.all([
    supabase.from("vocab_batch_items").select("batch_id, word_id").in("batch_id", batchIds),
    supabase.from("vocab_word_marks").select("word_id, status").eq("child_id", childId),
    supabase.from("vocab_stars").select("batch_id, star_count").eq("child_id", childId).in("batch_id", batchIds),
  ]);
  if (itemsRes.error) console.error("getBatchHistorySummaries batch_items 조회 실패:", itemsRes.error);
  if (marksRes.error) console.error("getBatchHistorySummaries word_marks 조회 실패:", marksRes.error);
  if (starsRes.error) console.error("getBatchHistorySummaries stars 조회 실패:", starsRes.error);

  const items = itemsRes.data;
  const stars = starsRes.data;
  const marks = new Map((marksRes.data ?? []).map((m) => [m.word_id, m.status as WordMarkStatus]));

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
