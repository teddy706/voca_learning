import { describe, expect, it } from "vitest";
import { buildChoices, generateDistractors, levenshtein } from "./distractors";

describe("levenshtein", () => {
  it("동일 문자열은 거리 0", () => {
    expect(levenshtein("apple", "apple")).toBe(0);
  });
  it("한 글자 치환은 거리 1", () => {
    expect(levenshtein("bag", "bad")).toBe(1);
  });
  it("완전히 다른 문자열은 더 먼 거리", () => {
    expect(levenshtein("cat", "elephant")).toBeGreaterThan(2);
  });
});

describe("generateDistractors", () => {
  it("정답과 겹치지 않는 개수만큼 오답을 만든다", () => {
    const distractors = generateDistractors("apple", ["bag", "bad", "cat"], 3);
    expect(distractors).toHaveLength(3);
    expect(distractors).not.toContain("apple");
  });

  it("풀에 유사 단어가 있으면 우선 사용한다", () => {
    const distractors = generateDistractors("bag", ["bad", "completely-unrelated-word"], 1);
    expect(distractors[0]).toBe("bad");
  });

  it("풀이 부족해도 규칙 기반 합성으로 채운다", () => {
    const distractors = generateDistractors("apple", [], 3);
    expect(distractors).toHaveLength(3);
    expect(new Set(distractors).size).toBe(3);
  });
});

describe("buildChoices", () => {
  it("정답을 포함해 지정한 개수의 보기를 만든다", () => {
    const choices = buildChoices("apple", ["bag", "bad", "cat", "hat"], 4);
    expect(choices).toHaveLength(4);
    expect(choices).toContain("apple");
  });
});
