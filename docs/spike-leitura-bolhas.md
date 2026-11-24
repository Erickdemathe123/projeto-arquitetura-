# Spike: leitura das bolhas no navegador (T47) e validação do leitor (T48)

## Decisão

A leitura das bolhas usa um **algoritmo próprio em canvas**, sem OpenCV.js. O código fica em `frontend/src/utils/answerSheetScan.js`.

| Critério | Algoritmo próprio (canvas) | OpenCV.js |
|---|---|---|
| Tamanho no bundle | ~130 linhas, 0 dependências | ~8 MB de WASM para baixar no celular |
| Referência para a perspectiva | 4 cantos do QR, que o jsQR já devolve | detecção de contornos dos 4 marcadores |
| Tempo por folha (teste abaixo) | < 1 ms | não medido (só a carga do WASM já leva segundos em 4G) |
| Manutenção pelo grupo | código simples, testável com Vitest | API grande, difícil de testar em jsdom |

## Como funciona

1. O `QrScanner.vue` captura um quadro do vídeo a cada ~120 ms e procura o QR com o jsQR.
2. Ao achar o QR, `criarHomografia` calcula a transformação de perspectiva entre os 4 cantos do QR em mm (`shared/folhaRespostasLayout.js`, a mesma fonte usada pelo gerador do PDF) e os 4 cantos em pixels na foto.
3. Para cada questão e alternativa, `obterPosicaoBolha` dá o centro da bolha em mm. O centro é levado para a foto pela homografia, e `pontuacaoBolha` mede a fração de pixels escuros (luminância < 170) dentro do raio da bolha.
4. `classificarMarcacao` decide entre **marcada** (maior pontuação ≥ 0,28 e pelo menos 0,08 acima da segunda), **em branco** (nenhuma ≥ 0,28) e **dupla marcação** (as duas maiores próximas).
5. A tela de conferência (T51) mostra o resultado e permite corrigir qualquer leitura antes de confirmar a nota.

Os 4 marcadores de canto continuam impressos na folha (T38). Eles servem de reserva caso o QR se mostre uma referência ruim nas folhas reais (T63).

## Validação (T48)

O teste `frontend/tests/answer-sheet-scan.test.js` gera a "foto" de uma folha preenchida a partir do layout compartilhado. A foto tem perspectiva trapezoidal, ruído, fundo de mesa e o contorno cinza das bolhas como o pdfkit imprime. Resultados:

- 20 questões com marcadas, em branco e duplas lidas corretamente em 720×1280 e em 1080×1920 com inclinações diferentes.
- O contorno impresso de bolhas vazias não é confundido com marcação.
- Tempo de leitura das bolhas: **≈ 0,3 ms por folha** (1080×1920, 20 questões), bem abaixo do limite de 100 ms do teste.

**Limitação:** as imagens são sintéticas. Não modelam desfoque, sombra, reflexo nem marcação fraca a lápis. A validação com 20 folhas reais impressas em Android e iPhone é a T63.
