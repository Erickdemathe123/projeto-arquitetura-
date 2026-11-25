
const service = require('../services/relatorioService');

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function baixarExcel(req, res, next) {
  try {
    const { buffer, filename } = await service.exportarExcel(
      req.usuario.id,
      req.params.id
    );

    res.set({
      'Content-Type': XLSX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store'
    });

    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = { baixarExcel };
