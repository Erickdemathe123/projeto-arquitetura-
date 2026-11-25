# Teste ponta a ponta: correção pela câmera (T63)

Valida a correção de folhas reais impressas em celulares Android e iPhone (RF08, RF09, RNF05, RNF08) e compara o resultado do sistema com a correção manual. O leitor já foi testado com folhas sintéticas (ver [spike-leitura-bolhas.md](spike-leitura-bolhas.md)); este teste cobre o que elas não modelam: desfoque, sombra, reflexo e marcação fraca a lápis.

> **Situação:** roteiro pronto; os resultados abaixo precisam ser preenchidos depois de executar o teste com as folhas reais.

## Preparação

1. No sistema hospedado, cadastre uma turma com pelo menos 20 alunos (importe um CSV ou `.xlsx`).
2. Monte uma avaliação de 10 a 20 questões, aplique-a à turma e gere as versões (A e B).
3. Gere as atribuições e baixe o PDF da turma (`GET /api/avaliacoes/:id/pdf`). Imprima em A4, em impressora comum, sem reduzir a escala.
4. Preencha as 20 folhas a caneta ou lápis, de propósito variadas:
   - 12 folhas com todas as questões marcadas corretamente (preenchimento forte);
   - 3 folhas com marcação fraca a lápis;
   - 2 folhas com **alguma questão em branco**;
   - 2 folhas com **duas marcações na mesma questão**;
   - 1 folha levemente amassada ou com sombra.
5. Anote, numa planilha, a nota que cada folha deve ter (correção manual com o gabarito da versão do aluno).

## Execução

Repita para **dois aparelhos Android** e **um iPhone** (anote modelo, sistema e navegador):

1. Abra o sistema, entre em "Corrigir Provas" e escolha a avaliação.
2. Aponte a câmera para o QR de cada folha, confira a leitura na tela de conferência e confirme.
3. Cronometre o tempo por folha, do enquadramento até a nota confirmada.
4. Anote qualquer falha de leitura (QR não reconhecido, bolha lida errada, questão em branco ou dupla não sinalizada).

## Resultados

| Aparelho | Sistema / navegador | Folhas lidas sem erro (de 20) | Notas iguais à correção manual | Tempo médio por folha (s) | Observações |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |
| | | | | | |

### Folhas com divergência

| Folha | Aluno / versão | Nota manual | Nota do sistema | Causa provável (luz, foco, marcação fraca, QR) |
|---|---|---|---|---|
| | | | | |

## Conclusão

Registrar aqui se o leitor atendeu ao esperado (todas as notas iguais à correção manual, incluindo folhas em branco e com duas marcações) e, se não, o que foi ajustado antes de repetir o teste.
