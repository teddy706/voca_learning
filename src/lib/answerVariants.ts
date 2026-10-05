/**
 * 책 표기법이 들어간 영어 표제어를 실제로 인정할 답안 목록으로 풀어준다(2026-10-05 추가).
 * 능률보카 원문 표기를 그대로 살리기로 해서 vocab_words.english에 아래 표기가 들어간다:
 *   - 대괄호 = 바로 앞 단어 대신 쓸 수 있는 말: "turn on[off]" → turn on / turn off,
 *     "a little [few]" → a little / a few
 *   - 소괄호 = 생략 가능: "all day (long)" → all day long / all day
 *   - "..." = 목적어 자리: "have ... in common" → have in common
 * 표기 그대로 입력해도 정답으로 인정한다.
 */

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function expand(text: string): string[] {
  const bracket = text.match(/^(.*?)(\S+)\s*\[([^\]]+)\](.*)$/);
  if (bracket) {
    const [, before, word, alt, after] = bracket;
    return [...expand(`${before}${word}${after}`), ...expand(`${before}${alt}${after}`)];
  }
  const paren = text.match(/^(.*?)\(([^)]+)\)(.*)$/);
  if (paren) {
    const [, before, optional, after] = paren;
    return [...expand(`${before}${optional}${after}`), ...expand(`${before}${after}`)];
  }
  return [normalize(text.replace(/\.{3}|…/g, " "))];
}

/** 정답으로 인정하는 모든 답안(소문자, 공백 정리됨). 첫 번째가 대표 답안. */
export function acceptedAnswers(english: string): string[] {
  return Array.from(new Set([...expand(english), normalize(english)])).filter(Boolean);
}

/** 글자 배열 타일·4지선다 보기·발음에 쓸 대표 답안(표기 기호 없는 형태). */
export function primaryAnswer(english: string): string {
  return acceptedAnswers(english)[0];
}

export function isAcceptedAnswer(input: string, english: string): boolean {
  return acceptedAnswers(english).includes(normalize(input));
}
