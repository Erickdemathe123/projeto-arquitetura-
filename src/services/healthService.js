const repository = require('../repositories/healthRepository');
async function verificarSaude() {
  try {
    await repository.verificarConexao();
    return { disponivel: true, corpo: { status: 'ok', banco: 'conectado' } };
  } catch {
    return { disponivel: false, corpo: { status: 'indisponivel', banco: 'desconectado' } };
  }
}
module.exports = { verificarSaude };
