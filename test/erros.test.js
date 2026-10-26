const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const criarApp = require('../src/app');
const {
  AppError,
  ErroDeNegocio,
  RequisicaoInvalidaError,
  NaoEncontradoError,
  NaoAutorizadoError,
  ProibidoError,
  ConflitoError
} = require('../src/errors/appError');
const errorHandler = require('../src/middlewares/errorHandler');
const notFoundHandler = require('../src/middlewares/notFoundHandler');
const {
  validarCamposObrigatorios,
  validarParamId,
  validarFormatoEmail
} = require('../src/middlewares/validator');

test('Validações e Tratamento de Erros da API (T17)', async (t) => {
  const app = criarApp({
    configurarRotas(rotas) {
      rotas.get('/api/teste-erro-negocio', (req, res, next) => {
        next(new ErroDeNegocio(400, 'Regra de negócio violada.'));
      });

      rotas.get('/api/teste-conflito', (req, res, next) => {
        next(new ConflitoError('Recurso já existente no sistema.'));
      });

      rotas.get('/api/teste-nao-encontrado', (req, res, next) => {
        next(new NaoEncontradoError('Registro de exemplo não encontrado.'));
      });

      rotas.get('/api/teste-nao-autorizado', (req, res, next) => {
        next(new NaoAutorizadoError('Sessão expirada.'));
      });

      rotas.get('/api/teste-proibido', (req, res, next) => {
        next(new ProibidoError('Apenas administradores podem acessar.'));
      });

      rotas.post(
        '/api/teste-validacao-campos',
        validarCamposObrigatorios(['titulo', 'disciplina']),
        (req, res) => {
          res.json({ ok: true });
        }
      );

      rotas.get(
        '/api/teste-validacao-param/:id',
        validarParamId('id'),
        (req, res) => {
          res.json({ id: req.params.id });
        }
      );

      rotas.get('/api/teste-erro-500-inesperado', () => {
        throw new Error('Falha catastrófica: SELECT * FROM senhas_secretas WHERE id = 123');
      });
    }
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const url = `http://127.0.0.1:${server.address().port}`;

  // 1. Rota inexistente (404 Not Found)
  const res404 = await fetch(`${url}/api/rota-completamente-inexistente`);
  assert.equal(res404.status, 404);
  const json404 = await res404.json();
  assert.equal(json404.erro, 'Rota não encontrada.');

  // 2. JSON malformado no body (400 Bad Request)
  const resJsonInvalido = await fetch(`${url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"email": "invalido", senha: ' // JSON sintaticamente quebrado
  });
  assert.equal(resJsonInvalido.status, 400);
  const jsonInvalido = await resJsonInvalido.json();
  assert.match(jsonInvalido.erro, /JSON inválido/i);

  // 3. Erro de negócio controlado (ErroDeNegocio / AppError 400)
  const resNegocio = await fetch(`${url}/api/teste-erro-negocio`);
  assert.equal(resNegocio.status, 400);
  const jsonNegocio = await resNegocio.json();
  assert.equal(jsonNegocio.erro, 'Regra de negócio violada.');

  // 4. Erro de conflito (409 Conflict)
  const resConflito = await fetch(`${url}/api/teste-conflito`);
  assert.equal(resConflito.status, 409);
  const jsonConflito = await resConflito.json();
  assert.equal(jsonConflito.erro, 'Recurso já existente no sistema.');

  // 5. Erro de recurso não encontrado (404 NotFoundError)
  const resNaoEncontrado = await fetch(`${url}/api/teste-nao-encontrado`);
  assert.equal(resNaoEncontrado.status, 404);
  const jsonNaoEncontrado = await resNaoEncontrado.json();
  assert.equal(jsonNaoEncontrado.erro, 'Registro de exemplo não encontrado.');

  // 6. Erro de autorização (401 Unauthorized)
  const resNaoAutorizado = await fetch(`${url}/api/teste-nao-autorizado`);
  assert.equal(resNaoAutorizado.status, 401);
  const jsonNaoAutorizado = await resNaoAutorizado.json();
  assert.equal(jsonNaoAutorizado.erro, 'Sessão expirada.');

  // 7. Erro de permissão (403 Forbidden)
  const resProibido = await fetch(`${url}/api/teste-proibido`);
  assert.equal(resProibido.status, 403);
  const jsonProibido = await resProibido.json();
  assert.equal(jsonProibido.erro, 'Apenas administradores podem acessar.');

  // 8. Middleware de validação de campos obrigatórios (400 com lista de faltantes)
  const resCamposFaltando = await fetch(`${url}/api/teste-validacao-campos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo: 'Prova Bimestral' }) // falta 'disciplina'
  });
  assert.equal(resCamposFaltando.status, 400);
  const jsonCamposFaltando = await resCamposFaltando.json();
  assert.match(jsonCamposFaltando.erro, /disciplina/i);
  assert.ok(jsonCamposFaltando.detalhes);
  assert.deepEqual(jsonCamposFaltando.detalhes.camposFaltantes, ['disciplina']);

  // 9. Middleware de validação de ID numérico em parâmetros de rota
  const resIdInvalido = await fetch(`${url}/api/teste-validacao-param/abc`);
  assert.equal(resIdInvalido.status, 400);
  const jsonIdInvalido = await resIdInvalido.json();
  assert.match(jsonIdInvalido.erro, /número inteiro positivo/i);

  const resIdValido = await fetch(`${url}/api/teste-validacao-param/42`);
  assert.equal(resIdValido.status, 200);
  const jsonIdValido = await resIdValido.json();
  assert.equal(jsonIdValido.id, 42);

  // 10. Erro 500 inesperado: nunca deve vazar mensagens sensíveis ou stack trace
  const res500 = await fetch(`${url}/api/teste-erro-500-inesperado`);
  assert.equal(res500.status, 500);
  const json500 = await res500.json();
  assert.equal(json500.erro, 'Erro interno no servidor.');
  assert.equal(json500.stack, undefined);
  assert.equal(json500.sql, undefined);
  assert.ok(!JSON.stringify(json500).includes('senhas_secretas'));

  // 11. Teste unitário do helper validarFormatoEmail
  assert.equal(validarFormatoEmail('professor@catolicasc.edu.br'), true);
  assert.equal(validarFormatoEmail('invalido@semdominio'), false);
  assert.equal(validarFormatoEmail('sem_arroba.com'), false);
  assert.equal(validarFormatoEmail(''), false);
});
