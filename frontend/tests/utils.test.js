import { describe, expect, it } from "vitest";
import { examQuestionsCountLabel, formatPoints } from "../src/utils/exam";
import { formatStoredDate, toIsoDate } from "../src/utils/date";

describe("utils/exam", () => {
  it("escreve a quantidade de questões no singular e no plural", () => {
    expect(examQuestionsCountLabel({ questionIds: [1] })).toBe("1 questão");
    expect(examQuestionsCountLabel({ questionIds: [1, 2] })).toBe("2 questões");
  });

  it("formata os pontos no padrão brasileiro", () => {
    expect(formatPoints(1)).toBe("1 ponto");
    expect(formatPoints(10.5)).toBe("10,5 pontos");
    expect(formatPoints(undefined)).toBe("0 pontos");
  });
});

describe("utils/date", () => {
  it("converte entre dd/mm/aaaa e aaaa-mm-dd", () => {
    expect(toIsoDate("20/11/2026")).toBe("2026-11-20");
    expect(formatStoredDate("2026-11-20")).toBe("20/11/2026");
  });
});
