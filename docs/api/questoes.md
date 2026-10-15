# API de questões — T12

Esta implementação usa o schema já presente na main e a base do back-end da T09.
As telas ainda dependem de T18 e a emissão dos tokens depende de T11.

## Autenticação e contrato com T11

Todas as rotas exigem `Authorization: Bearer <JWT>`. O token deve usar HS256,
assinatura com `JWT_SECRET` de pelo menos 32 bytes, `iss: "sgp"`,
`aud: "sgp-api"`, `sub: "<id do professor>"`, `role: "professor"` e
`exp` obrigatório. Recomenda-se expiração curta. O middleware pode ser
substituído pelo middleware compartilhado da T11 preservando `req.usuario.id`.
Não há fallback por cabeçalho `x-professor-id`, parâmetro ou corpo da requisição.

Sem configuração de segredo: 503. Token ausente/inválido/expirado: 401.
Papel diferente de professor: 403. O login deve consultar a tabela
`professores` para emitir o identificador correto.

## Rotas

- GET /api/questoes: lista somente as questões do professor autenticado, mais
  recentes primeiro. Uma lista vazia retorna [].
- POST /api/questoes: cria e retorna 201, objeto completo e Location.
- GET /api/questoes/:id: retorna o objeto ou 404.
- PUT /api/questoes/:id: substitui os campos editáveis e todas as alternativas.
- DELETE /api/questoes/:id: remove a questão e alternativas, retorna 204 sem corpo.

Corpo completo para POST/PUT:

```json
{
  "enunciado": "Quanto é 2 + 2?",
  "disciplina": "Matemática",
  "assunto": "Adição",
  "tipo": "Múltipla escolha",
  "alternativas": ["3", "4", "5"],
  "alternativaCorreta": 1
}
```

Enunciado: 1–10000 caracteres; disciplina/assunto: 1–120; alternativas:
2–5 textos de 1–255 caracteres. Espaços externos são removidos.
Há uma única resposta correta, representada por índice inteiro a partir de zero.
`tipo` é opcional e só aceita Múltipla escolha. Campos adicionais são rejeitados,
inclusive professorId. A API retorna campos em português; T18 deve mapear
text/subject/topic/alternatives/correctAlternative do formulário atual.

Erros retornam `{"erro":"mensagem"}`: 400 para dados/ID inválidos, 404 para
questão inexistente ou pertencente a outro professor, 409 ao alterar/excluir
questão vinculada a uma prova. Essa proteção preserva enunciado e gabarito de
provas já montadas; crie uma nova questão para modificar o conteúdo nesses casos.

Questão e alternativas são gravadas na mesma transação, com rollback em falhas.
Alteração/remoção bloqueiam a linha da questão durante a operação. O repositório
sempre restringe pelo professor autenticado e usa parâmetros SQL.

## Testes

`npm test` cobre validações, autenticação e HTTP com substituições isoladas
do repositório. `npm run test:integration` usa um MySQL real e cria um banco
temporário próprio, removido no final. Requer DB_HOST, DB_PORT, DB_USER e
DB_PASSWORD de um servidor de testes no qual o usuário possa criar bancos.
Não altera o DB_NAME da aplicação. Verifica persistência, CRUD, isolamento,
rollback, alternativas e conflitos com avaliações.
