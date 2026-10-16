# Banco MySQL segundo o diagrama de Gabriel

A referência é o documento N2_Parte1_SGP_Gabriel_editavel.docx fornecido em
15/10/2026. O schema usa as oito entidades do diagrama:
User → users; Class → classes; Enrollment → enrollments;
Question → questions; Alternative → alternatives; Exam → exams;
ExamQuestion → exam_questions; Application → applications.

Os atributos camelCase do domínio são mapeados para snake_case no MySQL.
Todos os IDs são BIGINT UNSIGNED. O contrato HTTP atual aceita IDs até
Number.MAX_SAFE_INTEGER. Não há professor e aluno em tabelas independentes:
users.role distingue professor/aluno e email tem unicidade global.

## Instalação nova

Requer MySQL 8.4+ e Node 22. Execute `npm ci`, configure `.env` e aplique
`mysql -u root -p < database/schema.sql`. O script cria e seleciona sgp.
Não rode o seed na hospedagem. Use usuário com privilégios restritos para a API.

## Migração de banco existente

1. Faça backup e interrompa as gravações na aplicação.
2. Execute schema.sql: as novas tabelas são criadas ao lado das antigas.
3. Execute `node database/migrations/002-modelo-gabriel.cjs` com o .env do banco.
4. Valide contagens e troque a aplicação para esta versão. Invalide sessões
   anteriores: IDs de alunos mudam ao unificar User.

A migração exige as oito tabelas novas vazias. Copia os dados numa transação,
mantendo as tabelas legadas intactas; falhas desfazem todas as inserções novas.
Repete-se apenas após resolver a falha. Após sucesso, uma segunda execução
recusa o destino preenchido. DDL não tem rollback: criação de tabelas vazias
pode permanecer após falha, sem afetar a origem.

IDs de professores, turmas, questões e provas são preservados. IDs de alunos
recebem o deslocamento do maior ID de professor; matrículas usam o novo ID.
RA permite reconciliar o aluno com a origem. E-mails repetidos entre professor
e aluno precisam ser resolvidos antes da migração: não são fundidos
automaticamente. Questões com mais de cinco alternativas, posições faltantes
ou gabarito inexistente também interrompem a cópia, sem descartar conteúdo.
Metadados antigos de avaliações são preservados em exams.legacy_details.
A tabela antiga correcoes é mantida como origem de N3, sem inventar modelo de
correção ausente no diagrama.

O script 001 da primeira proposta da PR foi substituído pela migração 002.
Mesmo quem executou o 001 pode usar o 002; aplicações adicionais são copiadas.

## Invariantes e integração

- FKs compostas com role impedem aluno como dono de turma/prova/questão e
  professor como aluno de matrícula. O campo técnico teacher_role/student_role
  tem CHECK fixo; não representa um segundo usuário.
- Alternative guarda text, is_correct e position (0–4). Índice único condicional
  impede duas corretas; a API T12 exige 2–5 e exatamente uma na mesma transação.
- Exam não tem class_id. Application liga prova e turma do mesmo professor.
  ExamQuestion possui ID próprio, points positivo e position única por prova.
- T15/T16 devem exigir ao menos um item antes da aplicação e mudar draft para
  ready na primeira aplicação, em uma transação. DDL não implementa essas APIs.
- RA, descrição, arquivamento, disciplina e assunto preservam necessidades já
  existentes no sistema. Alunos importados por CSV podem ficar sem e-mail/senha
  até a ativação da conta; professores exigem ambos.
- As rotas existentes /api/turmas mantêm o JSON em português. Seus repositórios
  e models agora mapeiam classes, enrollments e users. A identificação provisória
  por cabeçalho dessas rotas ainda depende da autenticação T11.

## Seed e testes

`mysql -u root -p < database/seed.sql` popula dados fictícios e repetíveis em
desenvolvimento: dois professores, dois alunos, duas turmas, matrículas,
questões com alternativas, prova e aplicação. Senha de teste dos professores:
SgpTeste2026! (bcrypt). Não carregar essas contas em produção.

`node database/test-schema.cjs` cria bancos temporários próprios e testa schema,
seed repetido, papéis, e-mail global, limites, FKs, migração e compatibilidade
das rotas de turmas. Requer um servidor de teste com permissão de criar bancos.
O workflow Banco MySQL (T07) executa esse teste em MySQL 8.4.
