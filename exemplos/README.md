# Exemplos para Upload

Esta pasta reúne arquivos `.txt` prontos para testar o upload/processamento em lote de cada fase da aplicação, um por linha (mesmo formato aceito pelos painéis de lote do frontend). Todas as sequências foram extraídas diretamente das especificações oficiais em PDF (e, na Fase III, conferidas byte a byte contra `OFFICIAL_TEST_CASES` em `backend/app/ribosome_service.py`).

## Estrutura

```text
exemplos/
├── fase-1-dna/          # BioCompiler 1.0 — DNA -> pré-mRNA
├── fase-2-rna/           # BioCompiler 2.0 — pré-mRNA -> mRNA maduro
├── fase-3-ribossomo/     # Ribossomo 1.0 — mRNA maduro -> Proteína
└── pipeline/             # Modo Pipeline — DNA bruto -> Proteína, encadeando as 3 fases
```

### `fase-1-dna/`
- `caso_1_correto.txt` … `caso_6_bug_nonsense_stop_prematuro.txt` — os 6 casos individuais da especificação do BioCompiler 1.0 (um por diagnóstico: `CORRETO`, `BUG - base inválida`, `BUG - START ausente`, `BUG - STOP ausente`, `BUG - frameshift`, `BUG - nonsense / STOP prematuro`).
- `lote_oficial_spec.txt` — o exemplo de arquivo `entrada.txt` com 3 linhas citado na seção 2 da especificação.

### `fase-2-rna/`
- `caso_1_correto.txt` … `caso_4_bug_branch_point.txt` — um exemplo por diagnóstico oficial (`CORRETO`, `BUG - sítio 5' ausente`, `BUG - sítio 3' ausente`, `BUG - branch point`), extraídos do lote de 40 casos já validado do projeto.
- `lote_oficial_spec.txt` — o exemplo de arquivo `entrada.txt` com 3 linhas citado na seção 2 da especificação do BioCompiler 2.0.
- `lote_40_casos.txt` — lote completo de 40 casos, útil para testar processamento em lote com volume maior.

### `fase-3-ribossomo/`
- `caso_1_correto.txt` … `caso_6_bug_cauda_poliA.txt` — os 6 casos oficiais da seção 14 da especificação do Ribossomo 1.0 (`CORRETO`, `BUG - CAP 5'`, `BUG - START ausente`, `BUG - STOP ausente`, `BUG - quadro de leitura`, `BUG - cauda poli-A`).
- `lote_oficial_spec.txt` — os mesmos 6 casos reunidos em um único arquivo de 6 linhas, como descrito na seção 14 ("arquivo de entrada com SEIS linhas").

### `pipeline/`
Entradas de **DNA bruto** (mesmo formato da Fase I) para testar o modo "Pipeline", que encadeia DNA → pré-mRNA → mRNA maduro → Proteína e para na primeira fase que falhar ("Parada Inteligente"). Todas as sequências foram construídas e conferidas rodando `analyzePipeline` (`frontend/src/utils/pipelineEngine.ts`) diretamente no motor da aplicação:
- `caso_1_sucesso_completo.txt` — passa pelas 3 fases sem erros, gerando a proteína `Met-Ala-Lys-Pro`.
- `caso_2_falha_fase_1_dna.txt` — já falha na Fase I (`BUG - START ausente`); o pipeline para imediatamente, sem tentar as fases seguintes.
- `caso_3_falha_fase_2_rna.txt` — passa na Fase I, mas o pré-mRNA resultante não contém um íntron válido, falhando na Fase II (`BUG - sítio 3' ausente`).
- `caso_4_falha_fase_3_ribossomo.txt` — passa nas Fases I e II (o DNA tem START/STOP válidos e um íntron `GU...A...AG` reconhecível), mas o íntron removido pelo splicing consome parte do quadro de leitura original, corrompendo o mRNA maduro e falhando só na Fase III (`BUG - quadro de leitura`). Mostra por que um DNA "válido" isoladamente na Fase I não garante sucesso depois do splicing.
- `lote_4_casos.txt` — os 4 casos acima reunidos em um único arquivo, um por linha, para testar o processamento em lote do modo Pipeline.

## Uso

Abra o painel de lote da fase correspondente na aplicação e importe o arquivo `.txt` desejado (ou cole o conteúdo diretamente na entrada manual).
