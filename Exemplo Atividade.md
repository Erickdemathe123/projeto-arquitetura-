# SGP - Sistema de Geracao de Provas — Guia de Modelagem UML

## 📋 Cenário Base

> *"O cliente (professor) precisa de uma solução para otimizar o tempo gasto na correção de grandes volumes de provas. O sistema deve permitir criar e organizar provas (embaralhando questões e alternativas para evitar cola), gerar folhas de respostas com QR code/gabarito e realizar a correção automatizada através da leitura dessas folhas. Além disso, o sistema deve oferecer relatórios de notas e análises estatísticas sobre o desempenho dos alunos para auxílio pedagógico."*

---

## 1️⃣ Diagrama de Casos de Uso

### 🔎 Passo 1A — Análise do Cenário ("Caça aos Atores e Ações")

**Atores identificados:**

| Ator | Papel no sistema |
|---|---|
| `Cliente` | Consulta cardápio, monta e finaliza o pedido |
| `Atendente` | Recebe, verifica e aprova o pedido |
| `Entregador` | Recebe a rota, transporta e atualiza o status |

**Ações / Casos de uso identificados:**

- Consultar Cardápio
- Montar Pedido
- Finalizar Compra
- Receber Pedido
- Aprovar Pedido
- Receber Rota de Entrega
- Atualizar Status de Entrega

### 🖼️ Diagrama de Caso de Uso

![Diagrama de Casos de Uso do FastBurger](casodeuso.png)

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

**Regra de ouro:** leia sempre de cima para baixo, como se fosse o feed de um celular.

Cenário analisado: **Criação e Aprovação do Pedido no FastBurger.**

1. **Atores e objetos (o elenco):** no topo, os participantes da cena na horizontal (`Cliente`, `AppMobile`, `Servidor`, `BancoDeDados`, `Atendente`).
2. **Linhas de vida (o tempo passando):** as linhas tracejadas verticais que descem de cada objeto representam o tempo correndo — quanto mais abaixo, mais tarde o evento acontece.
3. **Mensagens (os diálogos):** setas horizontais mostram o pedido/ação de um objeto para o outro. Setas contínuas = envio de mensagem/chamada de método; setas tracejadas = retorno da resposta.
4. **Bloco `alt` (alternativas/decisões):** representa desvios condicionais (o famoso SE/SENÃO) — no cenário do FastBurger, a decisão é a **aprovação manual do Atendente** após verificar os detalhes do pedido, e não uma validação automática de pagamento.


### 🖼️ Diagrama de Sequência

![Diagrama de Sequência do FastBurger](sequencia.png)

