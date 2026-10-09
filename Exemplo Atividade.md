# SGP - Sistema de Geracao de Provas — Guia de Modelagem UML

## 📋 Cenário Base

> *"O cliente (professor) precisa de uma solução para otimizar o tempo gasto na correção de grandes volumes de provas. O sistema deve permitir criar e organizar provas (embaralhando questões e alternativas para evitar cola), gerar folhas de respostas com QR code/gabarito e realizar a correção automatizada através da leitura dessas folhas. Além disso, o sistema deve oferecer relatórios de notas e análises estatísticas sobre o desempenho dos alunos para auxílio pedagógico."*

---

## 1️⃣ Diagrama de Casos de Uso

### 🔎 Passo 1A — Análise do Cenário ("Caça aos Atores e Ações")

**Atores identificados:**

| Ator | Papel no sistema |
|---|---|
| `Professor` | Responsável pela gestão académica de avaliações, desde a importação de alunos, elaboração e correção de exames até à emissão de relatórios e estatísticas. |
| `Aluno` | Responsável por identificar-se e por consultar os seus resultados. |


**Ações / Casos de uso identificados:**

- Importar lista de alunos
- Criar e editar provas 
- Gerar provas
- Gerar gabarito
- Corrigir prova
- Consultar avaliação
- Gerar estatística das respostas 
- Gerar relatório de notas
- Editar layout da prova
- Identificar-se na prova
- Consultar resultado

### 🖼️ Diagrama de Caso de Uso

![Diagrama de Caso de Uso do SGP](docs/uml/casodeuso.png)


---

## 2️⃣ Diagrama de Atividades

### 🔎 Passo 2A — Análise do Fluxo Cronológico

Sequência lógica extraída do relato:

1. Cliente consulta o cardápio e monta o pedido.
2. Cliente finaliza a compra (informando pagamento e endereço).
3. O Atendente recebe o pedido.
4. O Atendente verifica os detalhes.
5. **Decisão:** o pedido foi aprovado?
   - **[Não]** → Atendente notifica o cliente do cancelamento/erro.
   - **[Sim]** → Cozinha prepara o pedido.
6. Pedido fica pronto e é repassado ao Entregador.
7. Entregador realiza o transporte e entrega ao cliente.
8. Entregador atualiza o status para **"Entregue"** (fim).

**Raias identificadas:** cada etapa do processo pertence a um responsável diferente, o que torna o diagrama de atividades com raias o mais adequado para representar este cenário:

| Raia | Responsabilidades |
|---|---|
| **Cliente** | Consultar cardápio, montar pedido, finalizar compra, receber o produto |
| **Atendente** | Receber pedido, verificar detalhes, aprovar/rejeitar |
| **Cozinha** | Preparar o pedido |
| **Entregador** | Receber rota, transportar, atualizar status |

### 🖼️ Diagrama de Atividades

![Diagrama de Atividades do FastBurger com raias](atividade.png)

> 💡 Cada raia (coluna) representa uma nova coluna no diagrama, indicando a transferência de responsabilidade entre os atores/participantes do processo — é essa notação que diferencia um diagrama de atividades "simples" de um diagrama de atividades **com raias**, exigido pela notação UML quando o processo envolve mais de um responsável.


---

## 3️⃣ Diagrama de Classes

### 🔎 Passo 3A — Extração do Texto ("Truque do Detetive")

#### Identificando as classes (substantivos)

| Classe | Descrição |
|---|---|
| **Cliente** | Quem consome e faz os pedidos |
| **Pedido** | O registro central da compra realizada |
| **Atendente** | Quem gerencia e valida os pedidos recebidos |
| **Entregador** | Quem executa o transporte do produto até o cliente |

#### Interpretando associações e multiplicidades

Pergunta-chave: *"Quantos desse podem estar ligados a aquele?"*

- **Cliente ↔ Pedido**
  Um Cliente pode realizar zero ou vários pedidos ao longo do tempo (`0..*`). Um Pedido específico pertence obrigatoriamente a um, e somente um, Cliente (`1..1`).
  → Associação simples `1` — `0..*`.

- **Pedido ↔ Atendente**
  Um Atendente pode gerenciar vários pedidos (`0..*`). Um Pedido é supervisionado/aprovado por um atendente específico (`1..1`).

- **Pedido ↔ Entregador**
  Um Entregador pode realizar várias entregas/pedidos ao longo do dia (`0..*`). Um Pedido de entrega é atribuído a um entregador (`0..1` se pendente, ou `1..1` quando despachado).

### 🖼️ Diagrama de Classes

![Diagrama de Classes do FastBurger](classe.png)

---

## 4️⃣ Diagrama de Sequência

### 🔎 Passo 4A — Como Analisar e Ler o Diagrama

**Regra de ouro:** leia de cima para baixo; quanto mais abaixo a mensagem aparece, mais tarde ela acontece.

Cenário analisado: **Montar e salvar avaliação no SGP.**

Pré-condição: **o Professor já está autenticado no sistema**. O login não faz parte desta sequência.

1. **Atores e objetos (o elenco):** no topo estão `Professor`, `Front-end Web`, `Rota de Avaliações`, `AvaliacaoController`, `AvaliacaoService`, `AvaliacaoRepository`, `AvaliacaoModel`/`AvaliacaoQuestaoModel` e `MySQL`.
2. **Linhas de vida (o tempo passando):** as linhas tracejadas verticais representam cada participante ao longo da interação.
3. **Mensagens (os diálogos):** as setas contínuas representam solicitações ou chamadas entre participantes; as setas tracejadas representam retornos.
4. **Sequência principal:** o Professor preenche os dados e seleciona questões no Front-end. O Front-end envia a solicitação à API, que encaminha a operação pela rota, controller e service. O service valida os dados e as questões. Com dados válidos, o repository prepara as entidades, inicia uma transação no MySQL, grava a avaliação e associa cada questão selecionada com sua ordem e peso. Após confirmar a transação, o sistema retorna os dados da avaliação criada ao Front-end, que confirma o sucesso ao Professor.
5. **Bloco `alt` (alternativas/decisões):** representa a validação dos dados. Se forem inválidos, a API retorna HTTP 400 e o Front-end apresenta as mensagens para correção. Se forem válidos, a avaliação é persistida e o sistema retorna HTTP 201.
6. **Responsabilidade do Model e do Repository:** o Model representa e prepara as entidades do domínio; o Repository é responsável pelo acesso ao banco de dados. O Model não acessa o MySQL diretamente.

### 🖼️ Diagrama de Sequência

![Diagrama de Sequência - Montar e salvar avaliação no SGP](docs/uml/sequencia.png)
