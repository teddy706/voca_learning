import { describe, expect, it } from "vitest";
import { acceptedAnswers, isAcceptedAnswer, primaryAnswer } from "./answerVariants";

describe("acceptedAnswers", () => {
  it("평범한 단어는 그대로", () => {
    expect(acceptedAnswers("Come from")).toEqual(["come from"]);
  });

  it("대괄호는 바로 앞 단어의 대체어", () => {
    expect(acceptedAnswers("turn on[off]")).toEqual(["turn on", "turn off", "turn on[off]"]);
    expect(acceptedAnswers("a little [few]").slice(0, 2)).toEqual(["a little", "a few"]);
  });

  it("소괄호는 생략 가능", () => {
    expect(acceptedAnswers("all day (long)").slice(0, 2)).toEqual(["all day long", "all day"]);
    expect(acceptedAnswers("fall in love (with)").slice(0, 2)).toEqual(["fall in love with", "fall in love"]);
  });

  it("... 는 목적어 자리라 빼고 비교", () => {
    expect(primaryAnswer("not ... anymore")).toBe("not anymore");
    expect(primaryAnswer("have … in common")).toBe("have in common");
  });
});

describe("isAcceptedAnswer", () => {
  it("변형 답안과 표기 그대로 모두 정답", () => {
    expect(isAcceptedAnswer(" Turn  Off ", "turn on[off]")).toBe(true);
    expect(isAcceptedAnswer("turn on[off]", "turn on[off]")).toBe(true);
    expect(isAcceptedAnswer("have ... in common", "have ... in common")).toBe(true);
    expect(isAcceptedAnswer("turn", "turn on[off]")).toBe(false);
  });
});
