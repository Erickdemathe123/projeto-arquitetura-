# ADR-004: Hospedagem separada para front-end, API e banco

## Contexto

O sistema precisa estar disponível na web e manter a interface, a API e o
banco em ambientes apropriados a cada componente. A conexão entre serviços
deve proteger credenciais e tráfego, sem expor configurações sensíveis no
código do front-end ou no repositório.

## Decisão

Hospedar o front-end Vue.js na Vercel, a API Node.js/Express no Render e o
MySQL no Aiven. A Vercel encaminha as chamadas de `/api` ao serviço do Render.
O back-end conecta-se ao Aiven com TLS; credenciais e parâmetros de ambiente
são configurados nos painéis dos serviços, e não versionados no Git.

## Consequências

A separação permite implantar cada componente de forma independente e usar
serviços gerenciados, reduzindo a necessidade de operar a infraestrutura
manualmente. Em contrapartida, a aplicação depende da disponibilidade e da
configuração correta de três provedores, da rede entre eles e de variáveis
de ambiente consistentes. A depuração de falhas de integração também precisa
considerar logs e configurações de cada serviço.
