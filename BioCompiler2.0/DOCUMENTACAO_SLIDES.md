# Roteiro de Apresentação - BioCompiler

## Slide 1 - Título

**BioCompiler - DNA Transcriber e RNA Processor**

O projeto permite escolher entre validação/transcrição de DNA e maturação de RNA.

## Slide 2 - Modos de Processamento

- **BioCompiler 1.0 - DNA Transcriber:** DNA -> pré-mRNA.
- **BioCompiler 2.0 - RNA Processor:** pré-mRNA -> mRNA maduro.

O escopo desta versão fica restrito a esses dois modos.

## Slide 3 - Problema do RNA Processor

O pré-mRNA ainda contém íntrons. Antes de se tornar uma molécula madura, ele precisa passar por splicing, receber CAP 5' e receber cauda poli-A.

## Slide 4 - Entrada

O programa recebe um arquivo `.txt`, com uma sequência por linha. O tipo esperado depende do modo selecionado: DNA no DNA Transcriber, pré-mRNA no RNA Processor.

## Slide 5 - Gramática do Íntron

```text
GU ... A ... AG
```

`GU` abre o íntron, `A` é o branch point e `AG` fecha o íntron.

## Slide 6 - Regra do Branch Point

Para a atividade, o branch point é válido quando aparece entre 10 e 30 nucleotídeos antes do `AG` terminal.

## Slide 7 - Splicing

Quando o íntron é válido, todo o trecho entre `GU` e `AG` é removido. Os éxons antes e depois do íntron são unidos diretamente.

## Slide 8 - Maturação

Após o splicing, o programa adiciona:

- `m7Gppp` na extremidade 5';
- 100 adeninas na extremidade 3'.

## Slide 9 - Casos de Erro

O sistema reconhece:

- sítio 5' ausente;
- sítio 3' ausente;
- branch point inválido;
- base inválida.

## Slide 10 - Saída

A tela mostra um relatório detalhado. O arquivo `resultados.txt` usa campos separados por ponto e vírgula.

DNA:

```text
linha;status;resultado;pre_mRNA
```

RNA:

```text
linha;status;resultado;mRNA_maduro
```

## Slide 11 - Validação

A suíte de testes cobre DNA Transcriber, RNA Processor e as 40 entradas do modelo oficial, com 10 sequências em cada classe principal de RNA.
