# BioCompiler - DNA Transcriber e RNA Processor

Este projeto reúne dois modos de processamento:

- **BioCompiler 1.0 - DNA Transcriber**: valida sequências de DNA e gera pré-mRNA.
- **BioCompiler 2.0 - RNA Processor**: recebe pré-mRNA, valida sinais didáticos de splicing e gera mRNA maduro com CAP 5' e cauda poli-A.

O projeto fica restrito aos dois modos acima e não possui modo adicional de tradução final.

## Fluxo

```text
BioCompiler 1.0
DNA -> validação -> transcrição -> pré-mRNA

BioCompiler 2.0
pré-mRNA -> splicing -> CAP 5' -> cauda poli-A -> mRNA maduro
```

## Estrutura

```text
biocompiler/
├── __init__.py         # API pública dos dois modos
├── core.py             # BioCompiler 1.0: validação de DNA e transcrição
├── transcriber.py      # Transcrição DNA -> RNA e tabela genética auxiliar
├── rna_processor.py    # BioCompiler 2.0: splicing, CAP 5' e poli-A
└── cli.py              # CLI para DNA Transcriber e RNA Processor
main.py                 # Entrada de linha de comando
gui.py                  # Interface gráfica com seleção de modo
test_biocompiler2.py    # Testes automatizados dos dois modos
entrada.txt             # Cópia prática das 40 entradas oficiais de RNA
BioCompiler2_entrada_40_casos_modelo_oficial.txt
```

## Interface Gráfica

Execute:

```bash
python gui.py
```

Na tela, use o campo **Modo de processamento** para escolher:

- `BioCompiler 2.0 - RNA Processor`
- `BioCompiler 1.0 - DNA Transcriber`

A entrada individual, o carregamento de arquivo e os casos de demonstração respeitam o modo selecionado.

## Linha de Comando

DNA Transcriber:

```bash
python main.py --dna arquivo_dna.txt resultados_dna.txt
python main.py --demo-dna
```

RNA Processor:

```bash
python main.py --rna BioCompiler2_entrada_40_casos_modelo_oficial.txt resultados_rna.txt
python main.py --biocompiler2 entrada.txt resultados.txt
python main.py --demo-rna
```

Sem flag, o arquivo é tratado como entrada de RNA Processor para preservar o fluxo do BioCompiler 2.0:

```bash
python main.py BioCompiler2_entrada_40_casos_modelo_oficial.txt resultados.txt
```

## Casos do RNA Processor

| Caso | Condição | Saída |
| :--- | :--- | :--- |
| 1 | Existe `GU ... A ... AG`, com branch point válido | `CORRETO` |
| 2 | Existe `AG`, mas não existe `GU` anterior compatível | `BUG - sítio 5' ausente` |
| 3 | Existe `GU`, mas não existe `AG` posterior compatível | `BUG - sítio 3' ausente` |
| 4 | Existem `GU` e `AG`, mas não há `A` válido entre 10 e 30 nt antes do `AG` | `BUG - branch point` |

## Arquivos Exportados

DNA:

```text
linha;status;resultado;pre_mRNA
1;OK;CORRETO;AUGGCUAAACCGUAA
```

RNA:

```text
linha;status;resultado;mRNA_maduro
1;OK;CORRETO;m7Gppp...AAAAAAAA...
```

## Testes

```bash
python -m unittest test_biocompiler2.py -v
```

A suíte cobre o DNA Transcriber, os quatro casos oficiais do RNA Processor, exportação em lote e as 40 entradas do modelo oficial.
