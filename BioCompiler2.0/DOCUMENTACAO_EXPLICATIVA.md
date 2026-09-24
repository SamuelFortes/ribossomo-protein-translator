# Documentação Explicativa - BioCompiler

## Objetivo

O BioCompiler possui dois modos de processamento. O **DNA Transcriber** valida uma sequência de DNA e gera pré-mRNA. O **RNA Processor** simula, de forma didática, a maturação de uma sequência de pré-mRNA até mRNA maduro.

Na interface gráfica, o usuário escolhe o modo em **Modo de processamento**. No terminal, use `--dna` para DNA Transcriber e `--rna` ou `--biocompiler2` para RNA Processor.

O projeto fica restrito ao DNA Transcriber e ao RNA Processor.

## DNA Transcriber

O modo DNA Transcriber recebe sequências com bases `A`, `T`, `C` e `G`, valida START/STOP e realiza a transcrição substituindo `T` por `U`. O arquivo exportado usa:

```text
linha;status;resultado;pre_mRNA
```

## RNA Processor

O modo RNA Processor recebe uma linha de RNA bruto, valida sinais didáticos de splicing e gera mRNA maduro quando a sequência respeita a gramática definida na atividade.

## Gramática Didática

Um íntron válido é reconhecido pelo padrão:

```text
GU ... A ... AG
```

O `GU` marca o início do íntron, o `A` representa o branch point e o `AG` marca o fim do íntron. Para ser aceito, o branch point precisa estar entre 10 e 30 nucleotídeos antes do `AG` terminal.

## Processamento

1. O programa limpa espaços e quebras de linha.
2. Verifica se a sequência contém apenas `A`, `U`, `C` e `G`.
3. Localiza um par `GU` e `AG` compatível.
4. Procura um branch point `A` dentro da janela válida.
5. Remove o trecho do `GU` inicial até o `AG` terminal.
6. Une os éxons adjacentes.
7. Adiciona `m7Gppp` no início.
8. Adiciona exatamente 100 adeninas ao final.

## Diagnósticos

| Diagnóstico | Significado |
| :--- | :--- |
| `CORRETO` | A sequência tem íntron válido e gera mRNA maduro. |
| `BUG - base inválida` | Há caractere fora do alfabeto `A`, `U`, `C`, `G`. |
| `BUG - sítio 5' ausente` | Foi encontrado `AG`, mas não há `GU` anterior compatível. |
| `BUG - sítio 3' ausente` | Foi encontrado `GU`, mas não há `AG` posterior compatível. |
| `BUG - branch point` | Há `GU` e `AG`, mas não há `A` válido entre 10 e 30 nt antes do `AG`. |

## Arquivos Principais

- `biocompiler/core.py`: contém a validação e transcrição do DNA.
- `biocompiler/transcriber.py`: contém funções auxiliares de transcrição.
- `biocompiler/rna_processor.py`: contém a regra de maturação do RNA.
- `biocompiler/cli.py`: lê arquivos `.txt`, imprime o relatório e exporta `resultados.txt`.
- `main.py`: ponto de entrada para terminal.
- `gui.py`: interface gráfica com seleção entre DNA Transcriber e RNA Processor.
- `test_biocompiler2.py`: testes automatizados.

## Entrada Oficial

O arquivo `BioCompiler2_entrada_40_casos_modelo_oficial.txt` contém 40 sequências. Os testes automatizados verificam que ele produz 10 ocorrências de cada caso principal: correto, sítio 5' ausente, sítio 3' ausente e branch point.

## Saída

Na tela, o programa mostra um relatório detalhado por entrada. No arquivo exportado, o formato é:

```text
linha;status;resultado;mRNA_maduro
```

Quando a entrada é inválida, o campo `mRNA_maduro` recebe `NÃO GERADO`.
