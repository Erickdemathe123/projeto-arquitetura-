// @vitest-environment node
// Regressão do erro "Não foi possível processar a imagem da câmera" no celular.
// O shared/folhaRespostasLayout.js é CommonJS; no build de produção do Vite o
// leitor recebia um módulo vazio (layout.QR undefined) e quebrava assim que o QR
// era encontrado. Os outros testes rodam o código-fonte e não pegavam isso, por
// isso este teste empacota o leitor com a mesma configuração do deploy.
import { describe, expect, it } from "vitest";
import { build } from "vite";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(__dirname, "..");

describe("leitor da folha empacotado pelo build de produção", () => {
  it("recebe o layout compartilhado e lê a grade sem lançar erro", async () => {
    // Dentro do projeto: o Vitest só importa arquivos que estão sob a raiz.
    const cacheDir = resolve(root, "node_modules/.cache");
    await mkdir(cacheDir, { recursive: true });
    const outDir = await mkdtemp(join(cacheDir, "sgp-omr-"));
    try {
      await build({
        root,
        configFile: resolve(root, "vite.config.js"),
        logLevel: "silent",
        build: {
          outDir,
          emptyOutDir: true,
          lib: { entry: resolve(root, "src/utils/answerSheetScan.js"), formats: ["es"], fileName: () => "omr.mjs" }
        }
      });
      const { lerRespostasDaFolha } = await import(pathToFileURL(join(outDir, "omr.mjs")).href);

      const width = 400;
      const height = 600;
      const imagemBranca = new Uint8ClampedArray(width * height * 4).fill(255);
      const qrLocation = {
        topLeftCorner: { x: 200, y: 340 },
        topRightCorner: { x: 260, y: 340 },
        bottomRightCorner: { x: 260, y: 400 },
        bottomLeftCorner: { x: 200, y: 400 }
      };

      const respostas = lerRespostasDaFolha(imagemBranca, width, height, qrLocation, 3);
      expect(respostas).toHaveLength(3);
      expect(respostas.every((resposta) => resposta.status === "blank")).toBe(true);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  }, 30000);
});
