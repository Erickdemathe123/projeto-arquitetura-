import { describe, expect, it } from "vitest";
import { examQuestionsCountLabel, formatPoints } from "../src/utils/exam";
import { formatStoredDate, toIsoDate } from "../src/utils/date";
import { aplicarHomografia, criarHomografia, pontuacaoBolha } from "../src/utils/answerSheetScan";

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

  describe("utils/answerSheetScan", () => {
    it("mapeia coordenadas da página para a imagem pela homografia", () => {
      const homography = criarHomografia(
        [[0, 0], [100, 0], [100, 100], [0, 100]],
        [[10, 20], [210, 20], [210, 220], [10, 220]]
      );
      expect(aplicarHomografia(homography, 50, 50)).toEqual({ x: 110, y: 120 });
    });

    it("identifica uma bolha escura pelo valor médio dos pixels", () => {
      const width = 20;
      const height = 20;
      const imageData = new Uint8ClampedArray(width * height * 4);
      for (let index = 0; index < imageData.length; index += 4) {
        imageData[index] = 255;
        imageData[index + 1] = 255;
        imageData[index + 2] = 255;
        imageData[index + 3] = 255;
      }
      for (let y = 8; y <= 12; y++) {
        for (let x = 8; x <= 12; x++) {
          const offset = (y * width + x) * 4;
          imageData[offset] = 20;
          imageData[offset + 1] = 20;
          imageData[offset + 2] = 20;
        }
      }
      expect(pontuacaoBolha(imageData, width, height, { x: 10, y: 10 }, 5)).toBeGreaterThan(0.25);
    });
  });
});
