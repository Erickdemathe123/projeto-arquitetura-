import * as layoutModule from "../../../shared/folhaRespostasLayout.js";
const layout = layoutModule;

function solveLinearSystem(matrix, values) {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let item = column; item <= size; item++) augmented[column][item] /= divisor;
    for (let row = 0; row < size; row++) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let item = column; item <= size; item++) augmented[row][item] -= factor * augmented[column][item];
    }
  }
  return augmented.map((row) => row[size]);
}

export function criarHomografia(sourcePoints, destinationPoints) {
  if (sourcePoints.length !== 4 || destinationPoints.length !== 4) return null;
  const matrix = [];
  const values = [];
  for (let index = 0; index < 4; index++) {
    const [x, y] = sourcePoints[index];
    const [u, v] = destinationPoints[index];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    values.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    values.push(v);
  }
  const coefficients = solveLinearSystem(matrix, values);
  if (!coefficients) return null;
  return [...coefficients, 1];
}

export function aplicarHomografia(homography, x, y) {
  const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = homography;
  const divisor = h6 * x + h7 * y + h8;
  if (Math.abs(divisor) < 1e-12) return null;
  return {
    x: (h0 * x + h1 * y + h2) / divisor,
    y: (h3 * x + h4 * y + h5) / divisor
  };
}

function luminanceAt(imageData, width, height, x, y) {
  const px = Math.max(0, Math.min(width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(height - 1, Math.round(y)));
  const offset = (py * width + px) * 4;
  const r = imageData[offset];
  const g = imageData[offset + 1];
  const b = imageData[offset + 2];
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export function pontuacaoBolha(imageData, width, height, center, radius) {
  let dark = 0;
  let total = 0;
  const pixelRadius = Math.max(2, radius);
  for (let y = -pixelRadius; y <= pixelRadius; y++) {
    for (let x = -pixelRadius; x <= pixelRadius; x++) {
      if (x * x + y * y > pixelRadius * pixelRadius) continue;
      const luminance = luminanceAt(imageData, width, height, center.x + x, center.y + y);
      if (luminance < 170) dark++;
      total++;
    }

  }
  return total ? dark / total : 0;
}

export function classificarMarcacao(scores) {
  const ordered = [...scores].sort((a, b) => b - a);
  const markedIndex = scores.indexOf(ordered[0]);
  if (ordered[0] < 0.28) {
    return { markedIndex: null, status: "blank", confidence: ordered[0] };
  }
  if (ordered[0] - ordered[1] < 0.08) {
    return { markedIndex: null, status: "multiple", confidence: ordered[0] - ordered[1] };
  }
  return { markedIndex, status: "marked", confidence: ordered[0] - ordered[1] };
}

export function lerRespostasDaFolha(imageData, width, height, qrLocation, questionCount) {
  if (!qrLocation || !questionCount) return [];
  const source = [
    [layout.QR.xMm, layout.QR.yMm],
    [layout.QR.xMm + layout.QR.sizeMm, layout.QR.yMm],
    [layout.QR.xMm + layout.QR.sizeMm, layout.QR.yMm + layout.QR.sizeMm],
    [layout.QR.xMm, layout.QR.yMm + layout.QR.sizeMm]
  ];
  const destination = [
    [qrLocation.topLeftCorner.x, qrLocation.topLeftCorner.y],
    [qrLocation.topRightCorner.x, qrLocation.topRightCorner.y],
    [qrLocation.bottomRightCorner.x, qrLocation.bottomRightCorner.y],
    [qrLocation.bottomLeftCorner.x, qrLocation.bottomLeftCorner.y]
  ];
  const homography = criarHomografia(source, destination);
  if (!homography) return [];
  const answers = [];
  for (let questionIndex = 0; questionIndex < Math.min(questionCount, 20); questionIndex++) {
    const scores = [];
    for (let alternativeIndex = 0; alternativeIndex < 5; alternativeIndex++) {
      const mmPosition = layout.obterPosicaoBolha(questionIndex, alternativeIndex);
      const pixelPosition = aplicarHomografia(homography, mmPosition.xMm, mmPosition.yMm);
      if (!pixelPosition) {
        scores.push(0);
        continue;
      }
      const qrPixelWidth = Math.hypot(
        qrLocation.topRightCorner.x - qrLocation.topLeftCorner.x,
        qrLocation.topRightCorner.y - qrLocation.topLeftCorner.y
      );
      const mmPerPixel = layout.QR.sizeMm / Math.max(qrPixelWidth, 1);
      const radius = Math.max(3, (layout.BUBBLE_GRID.bubbleDiameterMm / 2) / mmPerPixel);
      scores.push(pontuacaoBolha(imageData, width, height, pixelPosition, radius));
    }
    answers.push(classificarMarcacao(scores));
  }
  return answers;
}
