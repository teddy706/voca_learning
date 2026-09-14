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
  const supabase = createClient();
  const { data } = await supabase
    .from("vocab_word_marks")
    .select("word_id, status")
    .eq("child_id", childId)
    .in("word_id", wordIds);
  return new Map((data ?? []).map((m) => [m.word_id, m.status as WordMarkStatus]));
}
