# ADR-001: Arquitetura em camadas no back-end

## Contexto

A disciplina exige a organização do sistema em camadas e atribui a cada uma
uma responsabilidade específica. Sem limites explícitos, regras de negócio,
tratamento HTTP e acesso ao banco podem se misturar, dificultando a manutenção,
os testes e a evolução independente das funcionalidades.

## Decisão

O back-end seguirá o fluxo `rota → controle → serviço → repositório → model`:

- **Rota:** declara os endpoints HTTP, aplica middlewares e encaminha a
  requisição ao controle correspondente.
- **Controle:** lê e valida a entrada da requisição, chama o serviço e traduz
  o resultado para uma resposta HTTP.
- **Serviço:** implementa e coordena as regras de negócio, sem executar SQL
  diretamente.
- **Repositório:** concentra as consultas e comandos de persistência; é a
  única camada que acessa o MySQL.
- **Model:** representa e mapeia as entidades e estruturas do domínio, sem
  responsabilidade de acesso ao banco.

## Consequências

A separação torna mais claro onde cada comportamento deve ser implementado,
facilita testar regras de negócio isoladamente e reduz o acoplamento entre
endpoints e persistência. Em contrapartida, uma operação percorre mais
componentes e exige disciplina para evitar lógica duplicada ou acesso direto
ao banco fora dos repositórios. A estrutura também precisa ser mantida nas
novas funcionalidades.
