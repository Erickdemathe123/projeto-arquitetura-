# ADR-005: Não migrar os dados de domínio do protótipo local

## Contexto

Na N1, algumas telas guardavam questões, avaliações, turmas e alunos no
`localStorage`, com dados de protótipo que não eram compartilhados nem
validados pelo back-end. Na integração com MySQL, a equipe precisava decidir
se converteria esses dados locais para o novo modelo persistente.

## Decisão

Não migrar os dados de domínio existentes no navegador. Questões, avaliações,
turmas, matrículas e resultados passam a ser obtidos e persistidos pela API e
pelo MySQL. O `localStorage` permanece apenas para o token de autenticação.

## Consequências

O banco passa a ser a fonte única dos dados de domínio, evitando importar
automaticamente informações de protótipo potencialmente inconsistentes ou
duplicadas. Dados locais antigos deixam de aparecer após a integração e não
há mecanismo de recuperação ou conversão desses registros; usuários precisam
cadastrar novamente os dados que desejarem manter.
