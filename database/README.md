# Banco MySQL — T07

O schema preserva as tabelas e nomes já usados pela API de turmas.
Requer MySQL 8.4+ (InnoDB e CHECKs efetivos).

## Banco novo

Execute `mysql -u root -p < database/schema.sql`. O script cria o banco
`sgp` com UTF-8. Configure um usuário da aplicação com privilégios apenas
sobre esse banco e preencha o `.env`. Não use root na hospedagem.

## Banco existente

`CREATE TABLE IF NOT EXISTS` não altera tabelas existentes. Faça backup,
valide os dados abaixo e execute uma única vez
`mysql -u root -p < database/migrations/001-complementos-n2.sql`.
Não rode essa migração sobre um banco criado com o novo schema.
DDL no MySQL faz commit implícito: não há rollback global da migração.

Antes de migrar, resolva e-mails de alunos duplicados, posições repetidas em
`avaliacao_questoes`, alternativas com ordem acima de 4 e gabaritos acima de 4.
Não descarte alternativas automaticamente: revise as questões com o professor.
Se um ALTER falhar, corrija o dado e retome somente as instruções ainda não
aplicadas. O script não apaga registros.

## Decisões e compatibilidade

- Professores e alunos continuam separados; e-mail é único em cada tabela.
  T11 deve definir o papel no login, pois não há unicidade global entre tabelas.
  Alunos de CSV podem não ter e-mail nem senha; vários NULLs são permitidos.
- Questões usam índice da alternativa correta a partir de zero. A API deve
  gravar questão e alternativas numa transação e validar 2–5 alternativas e
  a existência da correta. Os CHECKs limitam posições a 0–4.
- `avaliacoes.turma_id` permanece por compatibilidade com o modelo existente.
  `aplicacoes` permite a relação prova × turma e usa FKs compostas para impedir
  cruzamento entre professores. T15/T16 devem migrar o fluxo para essa relação
  e mudar o status para ready na primeira aplicação, em transação.
- `avaliacoes.status` (draft/ready/closed) é diferente do status de correção.
  O peso e a ordem única ficam em `avaliacao_questoes`.
- A remoção de uma questão usada em prova é bloqueada pela FK; alternativas
  são apagadas junto da questão. Matrículas são únicas por aluno/turma.

O MER/DER da T06 ainda não foi publicado na main. Este DDL se baseia nas classes
e tabelas existentes; reconciliar a imagem da T06 antes da entrega final.

## Seed de desenvolvimento

Execute `mysql -u root -p < database/seed.sql` apenas num banco de testes.
O seed é explícito e nunca é executado ao iniciar o servidor. Usa dados fictícios
no domínio reservado example.test, dois professores para testar isolamento,
alunos, matrículas, questões, uma avaliação e uma aplicação. Pode ser repetido
sem duplicar os dados identificados pelas chaves do seed.

A senha de teste dos professores é `SgpTeste2026!`, armazenada como bcrypt.
Essas contas não devem existir em produção. Cadastro/login ainda dependem de T11.
