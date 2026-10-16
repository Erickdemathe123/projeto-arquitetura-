# Base do back-end (T09)

Use Node.js 22 e MySQL 8.4 ou superior. Execute `npm ci`, copie `.env.example`
para `.env` e configure seu banco. Importe `database/schema.sql` no MySQL antes
de usar as rotas de negócio. O script cria e seleciona o banco `sgp`.
Execute `npm start` para a API ou `npm run dev:api` para reinício automático.
O front-end continua com `npm run dev`; para servi-lo pelo Express, use
`npm run build` antes de iniciar o servidor.

`GET /health` faz uma consulta real `SELECT 1` pelo pool mysql2. Retorna 200
com `{"status":"ok","banco":"conectado"}` ou 503 com
`{"status":"indisponivel","banco":"desconectado"}`. Não expõe credenciais.
É uma verificação de conectividade, não de existência das tabelas.

`src/app.js` monta a aplicação sem abrir porta; `server.js` carrega o ambiente,
inicia HTTP e encerra conexões nos sinais SIGINT/SIGTERM. O fluxo de saúde segue
rota → controller → service → repository. Model representa entidades de domínio,
como Turma; a consulta de conectividade não representa uma entidade persistida.

Execute `npm test` para verificar respostas HTTP de saúde, erro do banco,
rota desconhecida e JSON inválido. O teste substitui somente o acesso ao banco;
não comprova conectividade com um MySQL instalado. Para essa checagem, inicie o
servidor com `.env` configurado e consulte `curl -i http://localhost:3000/health`.

As rotas existentes de turmas ainda usam `x-professor-id` provisório. A
autenticação delas e a integração das telas dependem das tarefas T11/T19.

## Autenticação e JWT (T11)

A API de autenticação foi implementada em `src/routes/authRoutes.js`, `src/controllers/authController.js`,
`src/services/authService.js`, `src/repositories/userRepository.js` e `src/models/userModel.js`.

### Endpoints
* `POST /api/auth/cadastro`: Cria conta de professor ou aluno. Valida formato e domínio de e-mail,
  e-mail único, senha com no mínimo 6 caracteres e gera hash com `bcrypt` (12 rounds). Retorna `{ usuario, token }`.
* `POST /api/auth/login`: Autentica o usuário validando e-mail e hash da senha. Retorna `{ usuario, token }`.
* `GET /api/auth/me`: Rota protegida por JWT que retorna os dados do usuário autenticado.

### Middleware de Proteção
Para proteger qualquer rota do back-end (ex.: questões, turmas, provas), utilize o middleware em
`src/middlewares/authMiddleware.js`:

```javascript
const { autenticar, exigirRole } = require('../middlewares/authMiddleware');

// Exige token JWT válido (injetando req.usuario = { id, role, email, name })
router.use(autenticar);

// Exige papel específico (ex.: apenas professores podem criar/editar recursos)
router.post('/', exigirRole('professor'), controller.criar);
```
