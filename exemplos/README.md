# Exemplos para Upload

Esta pasta reúne arquivos `.txt` prontos para testar o upload/processamento em lote de cada fase da aplicação, um por linha (mesmo formato aceito pelos painéis de lote do frontend). Todas as sequências foram extraídas diretamente das especificações oficiais em PDF (e, na Fase III, conferidas byte a byte contra `OFFICIAL_TEST_CASES` em `backend/app/ribosome_service.py`).

## Estrutura

```text
exemplos/
├── fase-1-dna/          # BioCompiler 1.0 — DNA -> pré-mRNA
├── fase-2-rna/           # BioCompiler 2.0 — pré-mRNA -> mRNA maduro
└── fase-3-ribossomo/     # Ribossomo 1.0 — mRNA maduro -> Proteína
```

### `fase-1-dna/`
- `caso_1_correto.txt` … `caso_6_bug_nonsense_stop_prematuro.txt` — os 6 casos individuais da especificação do BioCompiler 1.0 (um por diagnóstico: `CORRETO`, `BUG - base inválida`, `BUG - START ausente`, `BUG - STOP ausente`, `BUG - frameshift`, `BUG - nonsense / STOP prematuro`).
- `lote_oficial_spec.txt` — o exemplo de arquivo `entrada.txt` com 3 linhas citado na seção 2 da especificação.

### `fase-2-rna/`
- `caso_1_correto.txt` … `caso_4_bug_branch_point.txt` — um exemplo por diagnóstico oficial (`CORRETO`, `BUG - sítio 5' ausente`, `BUG - sítio 3' ausente`, `BUG - branch point`), extraídos do lote de 40 casos já validado do projeto.
- `lote_oficial_spec.txt` — o exemplo de arquivo `entrada.txt` com 3 linhas citado na seção 2 da especificação do BioCompiler 2.0.
- `lote_40_casos.txt` — lote completo de 40 casos (`BioCompiler2.0/BioCompiler2_entrada_40_casos_modelo_oficial.txt`), útil para testar processamento em lote com volume maior.

### `fase-3-ribossomo/`
- `caso_1_correto.txt` … `caso_6_bug_cauda_poliA.txt` — os 6 casos oficiais da seção 14 da especificação do Ribossomo 1.0 (`CORRETO`, `BUG - CAP 5'`, `BUG - START ausente`, `BUG - STOP ausente`, `BUG - quadro de leitura`, `BUG - cauda poli-A`).
- `lote_oficial_spec.txt` — os mesmos 6 casos reunidos em um único arquivo de 6 linhas, como descrito na seção 14 ("arquivo de entrada com SEIS linhas").

## Uso

Abra o painel de lote da fase correspondente na aplicação e importe o arquivo `.txt` desejado (ou cole o conteúdo diretamente na entrada manual).
