const service = require('../services/cadernoService');

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME = 'application/pdf';

async function baixarDocx(req, res, next) {
  try {
    const { buffer, filename } = await service.exportarDocx(req.usuario.id, req.params.id, req.query.versao);
    res.set({
      'Content-Type': DOCX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store'
    });
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

async function baixarPdf(req, res, next) {
  try {
    const { buffer, filename } = await service.exportarPdf(
      req.usuario.id,
      req.params.id,
      req.query.versao,
      req.query.alunoId
    );
    res.set({
      'Content-Type': PDF_MIME,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store'
    });
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = { baixarDocx, baixarPdf };
