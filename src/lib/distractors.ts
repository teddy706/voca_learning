// 4지선다 보기용 오답(디스트랙터) 생성 — PRD 4.3.1.
// 1순위: 같은 단어은행에서 편집거리(Levenshtein) 1~2인 실제 유사 단어.
// 2순위: 부족하면 규칙 기반 합성 오답(인접 글자 순서 바꾸기 / 글자 하나 빠뜨리기 /
//        흔한 혼동 철자 치환)으로 채운다. 순수 함수라 유닛 테스트로 커버하기 좋다.

export function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

const CONFUSABLE_SUBSTITUTIONS: [string, string][] = [
  ["c", "k"],
  ["k", "c"],
  ["s", "z"],
  ["z", "s"],
  ["ph", "f"],
  ["f", "ph"],
];

function swapAdjacent(word: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length - 1; i++) {
    if (word[i] === word[i + 1]) continue;
    out.push(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
  }
  return out;
}

function dropOneLetter(word: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length; i++) {
    if (word.length <= 2) break;
    out.push(word.slice(0, i) + word.slice(i + 1));
  }
  return out;
}

function substituteConfusable(word: string): string[] {
  const out: string[] = [];
  for (const [from, to] of CONFUSABLE_SUBSTITUTIONS) {
    const idx = word.indexOf(from);
    if (idx === -1) continue;
    out.push(word.slice(0, idx) + to + word.slice(idx + from.length));
  }
  return out;
}

function synthesizeCandidates(word: string): string[] {
  return [...swapAdjacent(word), ...dropOneLetter(word), ...substituteConfusable(word)];
}

/**
 * 정답(answer)에 대한 오답 보기 count개를 만든다. pool은 같은 단어은행의 다른 영어 단어들
 * (정답 자신은 호출 쪽에서 제외하고 넘길 것).
 */
export function generateDistractors(answer: string, pool: string[], count: number): string[] {
  const normalizedAnswer = answer.toLowerCase();
  const seen = new Set([normalizedAnswer]);
  const result: string[] = [];

  // 1순위: 실제 단어은행에서 편집거리 1~2
  const realCandidates = pool
    .map((w) => w.toLowerCase())
    .filter((w) => !seen.has(w))
    .map((w) => ({ word: w, dist: levenshtein(normalizedAnswer, w) }))
    .filter((c) => c.dist >= 1 && c.dist <= 2)
    .sort((a, b) => a.dist - b.dist);

  for (const c of realCandidates) {
    if (result.length >= count) break;
    if (seen.has(c.word)) continue;
    seen.add(c.word);
    result.push(c.word);
  }

  // 2순위: 규칙 기반 합성 오답으로 나머지 채움
  if (result.length < count) {
    const synthesized = shuffle(synthesizeCandidates(normalizedAnswer));
    for (const w of synthesized) {
      if (result.length >= count) break;
      if (!w || seen.has(w)) continue;
      seen.add(w);
      result.push(w);
    }
  }

  // 그래도 부족하면(아주 짧은 단어 등) pool에서 무작위로 채운다 — 최후 폴백.
  if (result.length < count) {
    const fallback = shuffle(pool.map((w) => w.toLowerCase()).filter((w) => !seen.has(w)));
    for (const w of fallback) {
      if (result.length >= count) break;
      seen.add(w);
      result.push(w);
    }
  }

  return result.slice(0, count);
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** 정답 + 디스트랙터를 섞어 4지선다 보기 배열을 만든다. */
export function buildChoices(answer: string, pool: string[], optionCount = 4): string[] {
  const distractors = generateDistractors(answer, pool, optionCount - 1);
  return shuffle([answer, ...distractors]);
}

/**
 * 글자 배열(ArrangeSession) 모드용 — 정답 스펠링의 글자를 섞은 타일 배열을 만든다. 공백(구동사
 * 등 "come from")은 채울 필요 없는 고정 칸으로 취급해 타일에서 뺀다. ArrangeSession.tsx와
 * 데모(DemoQuizSession.tsx)가 동일한 로직을 쓰므로 여기 하나로 모아 재사용한다.
 */
export function buildLetterTiles(english: string) {
  const chars = english.toLowerCase().split("");
  const letterIndexes = chars.map((c, i) => (c === " " ? -1 : i)).filter((i) => i !== -1);
  const tiles = shuffle(letterIndexes.map((i) => chars[i]));
  return { chars, letterIndexes, tiles };
}
