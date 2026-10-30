# ADR-002: MySQL como banco de dados relacional

## Contexto

O SGP mantém entidades relacionadas — usuários, turmas, matrículas, questões,
alternativas, avaliações, aplicações e resultados. Os dados precisam sobreviver
entre sessões e respeitar vínculos, propriedade dos recursos e regras de
integridade. A stack da disciplina determina o uso de MySQL.

## Decisão

Usar MySQL como persistência relacional da aplicação, acessado pelo back-end
Node.js por meio do `mysql2`. O esquema define as entidades e relacionamentos
com chaves primárias, chaves estrangeiras, restrições e índices. Operações que
gravam dados relacionados, como criar uma avaliação e associar suas questões,
usam transações. A definição do esquema fica versionada em
[`database/schema.sql`](../../database/schema.sql).

## Consequências

O banco garante integridade referencial e permite consultar dados relacionados
de forma consistente; transações evitam persistência parcial em operações
compostas. A equipe precisa manter o esquema e as migrações compatíveis com o
código e operar uma instância MySQL. Recursos específicos do MySQL, como tipos
`ENUM`, `JSON` e colunas geradas, também devem ser considerados ao portar ou
testar o sistema em outro banco.
