# Especificação Consolidada — BioCompiler 1.0 e BioCompiler 2.0

Fonte primária de verdade: código Python em `BioCompiler2.0/biocompiler/*.py`, `BioCompiler2.0/gui.py`, `BioCompiler2.0/main.py`.
Fonte secundária: PDFs `4.2 Especificacao_BioCompiler_2_0 2026.2_VERSION 2.pdf` (texto extraído em `pdf_text_biocompiler2.txt`) e `BioCompiler 1.0.pdf` (PDF baseado em imagens/slides; transcrição visual salva em `pdf_text_biocompiler1.txt`).

Todo número e toda string de status abaixo foram conferidos linha a linha contra o código-fonte. Onde PDF e código divergem, isso está marcado explicitamente na seção 3.

---

## 1. BioCompiler 1.0 — DNA Transcriber

### 1.1 Objetivo e papel na pipeline

Fase I da pipeline biológica simulada: `DNA -> pré-mRNA`. Recebe uma sequência de DNA, valida seu alfabeto, localiza a região codificante (START→STOP) no quadro de leitura, classifica a sequência em um dos 6 casos de aceite, e — quando válida — transcreve para pré-mRNA (substituindo `T` por `U`). O pré-mRNA gerado é a entrada esperada pelo BioCompiler 2.0. BioCompiler 1.0 **não** traduz proteína (tradução existe no módulo `transcriber.py` como utilidade, mas não é usada no fluxo principal de DNA→pré-mRNA nem exposta no relatório padrão).

Implementação: `biocompiler/core.py` (classe `BioCompiler`, função `classify`), auxiliares em `biocompiler/transcriber.py`.

### 1.2 Formato de entrada

- Arquivo texto `.txt`, uma sequência de DNA por linha; o programa processa as linhas na ordem em que aparecem (`biocompiler/cli.py::_read_input_lines`).
- Leitura com encoding `utf-8-sig` (remove BOM automaticamente).
- Linhas vazias e linhas iniciadas por `#` (após `lstrip`) são ignoradas.
- Cada linha é normalizada por `clean_sequence()`: normalização Unicode NFC, remoção de BOM (`﻿`), zero-width space (`​`), `\r`, `\n`; `\t` vira espaço; todos os espaços internos são removidos (`"".join(s.split())`); conversão para maiúsculas.
- Alfabeto permitido após limpeza: exatamente `{A, T, C, G}` (constante `VALID_BASES`). Qualquer outro caractere (inclusive acentuados, dígitos, minúsculas não mapeadas, etc.) é tratado como base inválida.
- Não há separadores internos (espaços, hifens) esperados na sequência em si — a especificação do PDF pede isso explicitamente; o código tolera espaços apenas porque os remove na limpeza.

### 1.3 Algoritmo passo a passo (fiel ao código)

Dado uma linha de entrada `raw_sequence`:

1. `clean_seq = clean_sequence(raw_sequence)`.
2. **Validação de bases**: percorre `clean_seq`; se existir qualquer caractere fora de `{A,T,C,G}`, retorna imediatamente `BUG - base inválida` (ver 1.4, caso 2). É a primeira verificação, tem precedência sobre todas as demais.
3. **Localização do START**: `start_pos = clean_seq.find("ATG")` (primeira ocorrência, não alinhada a frame nenhum antes de ser encontrada — é uma busca livre de substring). Se `start_pos == -1`, retorna `BUG - START ausente` (caso 3).
4. **Varredura do quadro de leitura a partir de `start_pos`**: a função `find_all_in_frame_stops` lê a sequência em trincas começando exatamente em `start_pos`, avançando de 3 em 3 (`range(start_pos, len(s), 3)`), e coleta **todas** as trincas iguais a `TAA`, `TAG` ou `TGA` (constante `STOP_CODONS`) nesse quadro. Se uma trinca tiver menos de 3 bases (fim da sequência), a varredura para ali (trinca incompleta é ignorada, não conta como STOP).
5. **Classificação** (modo padrão, sem sequência de referência — é o modo usado por toda a CLI/GUI atual, pois nenhuma referência é passada):
   - Se `len(in_frame_stops) > 1` → **nonsense / STOP prematuro** (caso 6): existe um STOP no frame antes do fim da leitura e ainda resta sequência codificante depois dele.
   - Senão, se `len(in_frame_stops) == 1` → **CORRETO** (caso 1): transcreve.
   - Senão (`len(in_frame_stops) == 0`): calcula `rem_bases = (len(clean_seq) - start_pos) % 3`.
     - Se `rem_bases != 0` → **frameshift** (caso 5): o quadro de leitura não fecha em trincas completas até o fim da sequência.
     - Se `rem_bases == 0` → **STOP ausente** (caso 4): a leitura termina em trincas completas, mas nenhuma delas é STOP.
6. **Transcrição** (só no caso CORRETO): `pre_mrna = transcribe(clean_seq)` = `clean_seq.replace("T","U").replace("t","u")` aplicado à sequência inteira (não apenas ao CDS). `cds_dna = clean_seq[start_pos : stop_pos+3]`.

Importante para portar: **não existe verificação separada por "comprimento múltiplo de 3 da sequência inteira"** — o frameshift é detectado pelo resto da divisão do trecho **a partir do START até o fim da string** por 3, e só quando nenhum STOP no frame foi encontrado. Se existir mais de um STOP no frame, o caso é classificado como nonsense mesmo que o comprimento seja "estranho" — a ordem de precedência das condições dentro do bloco de análise de frame é: (a) >1 stop no frame → nonsense; (b) exatamente 1 stop → correto; (c) 0 stops e resto ≠ 0 → frameshift; (d) 0 stops e resto == 0 → stop ausente.

Existe também um modo alternativo com `reference_dna` (parâmetro opcional do construtor `BioCompiler(reference_dna=...)`) que compara comprimento e posição do STOP contra uma referência para decidir frameshift/nonsense por delta; esse modo **não é usado** pela CLI (`cli.py`) nem pela GUI (`gui.py`) em nenhum ponto — ambas sempre instanciam `BioCompiler()` sem referência. Pode ser ignorado na portagem inicial, mas documentado aqui para não ser perdido caso seja necessário no futuro.

### 1.4 Lista completa de status (ordem de precedência exata)

Todas as strings abaixo são literais, definidas em `biocompiler/core.py`:

| Ordem | Constante | String exata | Condição precisa |
|---|---|---|---|
| 1 | `RESULT_INVALID_BASE` | `BUG - base inválida` | Existe ≥1 caractere em `clean_seq` fora de `{A,T,C,G}`. Verificada antes de tudo. |
| 2 | `RESULT_MISSING_START` | `BUG - START ausente` | Nenhuma ocorrência de `"ATG"` em `clean_seq` (checada somente se passou na validação de base). |
| 3 | `RESULT_NONSENSE` | `BUG - nonsense / STOP prematuro` | A partir do primeiro `ATG`, há **mais de um** STOP (`TAA`/`TAG`/`TGA`) no mesmo quadro de leitura (a análise reporta o primeiro STOP encontrado como o ponto do erro). |
| 4 | `RESULT_CORRECT` | `CORRETO` | A partir do primeiro `ATG`, há **exatamente um** STOP no quadro de leitura. |
| 5 | `RESULT_FRAMESHIFT` | `BUG - frameshift` | Zero STOPs no quadro a partir do ATG **e** `(len(clean_seq) - start_pos) % 3 != 0`. |
| 6 | `RESULT_MISSING_STOP` | `BUG - STOP ausente` | Zero STOPs no quadro a partir do ATG **e** `(len(clean_seq) - start_pos) % 3 == 0` (trincas completas até o fim, nenhuma é STOP). |

Observação de nomenclatura: o PDF de slides (BioCompiler 1.0) rotula os casos com nomes ligeiramente diferentes na tabela de "Formato da saída" (`APROVADO`/`ERRO`/`ALERTA` com textos como "Base inválida: X", "START (ATG) não encontrado" etc.) — ver seção 3 "Divergências". O código é a fonte de verdade e usa sempre `STATUS: CORRETO` ou `STATUS: ERRO` com o campo `TIPO:` contendo as 6 strings da tabela acima.

### 1.5 Saída em tela (formato exato)

Função `format_screen_output` em `biocompiler/cli.py`. Cabeçalho fixo, depois um bloco por entrada, terminado por uma linha de 40 traços:

```
========================================
BIOCOMPILER 1.0 - DNA TRANSCRIBER
RELATÓRIO DE AVALIAÇÃO DE SEQUÊNCIA DE DNA
========================================
ENTRADA: <n>
SEQUÊNCIA INSERIDA: <raw_sequence>
```

Se válida (`CORRETO`):
```
STATUS: CORRETO
Bases: OK
START: ATG - OK (Posição <start_pos+1> a <start_pos+3>)
Quadro de leitura: OK (<codon_count> códons)
STOP: <stop_codon> - OK (Posição <stop_pos+1> a <stop_pos+3>)
Transcrição: OK
pré-mRNA: <pre_mrna>
----------------------------------------
```

Se inválida:
```
STATUS: ERRO
TIPO: <status exato da tabela 1.4>
LOCALIZAÇÃO DO ERRO: <error_location>      (omitido se vazio)
TRECHO DO ERRO: <error_snippet>            (omitido se vazio)
DIAGNÓSTICO: <qa_diagnostic>               (omitido se vazio)
pré-mRNA: NÃO GERADO
----------------------------------------
```

Posições são reportadas em base 1 (1-indexed) — o código soma 1 aos índices internos (0-indexed) em `start_pos_human`/`stop_pos_human`.

### 1.6 Saída em arquivo exportado (formato exato)

Função `export_results_file`. Separador **ponto e vírgula (`;`)**, encoding UTF-8, uma linha de cabeçalho + uma linha por entrada, terminando com `\n` final:

```
linha;status;resultado;pre_mRNA
```

Onde `status` é `OK` (se `is_valid`) ou `ERRO`; `resultado` é a string exata da tabela 1.4; `pre_mRNA` é a sequência transcrita completa (não só o CDS) se válida, ou o literal `NÃO GERADO` se inválida.

Exemplo real (confirmado por `test_biocompiler2.py::test_exportacao_dna_em_lote`):
```
linha;status;resultado;pre_mRNA
1;OK;CORRETO;AUGGCUAAACCGUAA
2;ERRO;BUG - base inválida;NÃO GERADO
```

### 1.7 Exemplos entrada→saída reais (extraídos do código-fonte oficial)

Não existe um arquivo `.txt` de casos oficiais de DNA (não foi entregue no repositório); os exemplos abaixo são literais dos casos de demonstração embutidos em `biocompiler/cli.py::_run_dna_demo` e de `test_biocompiler2.py`, executados contra o código real:

| # | Entrada (DNA) | Status | pré-mRNA |
|---|---|---|---|
| 1 | `ATGGCTAAACCGTAA` | `CORRETO` | `AUGGCUAAACCGUAA` |
| 2 | `ATGGCTXAACCGTAA` | `BUG - base inválida` | `NÃO GERADO` |
| 3 | `CCCGCTAAACCGTAA` | `BUG - START ausente` | `NÃO GERADO` |
| 4 | `ATGGCTAAACCGGGC` | `BUG - STOP ausente` | `NÃO GERADO` |
| 5 | `ATGGCTAAAACCGTAA` | `BUG - frameshift` | `NÃO GERADO` |
| 6 | `ATGGCTTAACCGGGCTAA` | `BUG - nonsense / STOP prematuro` | `NÃO GERADO` |

(Todos os 6 casos vêm literalmente de `_run_dna_demo` em `cli.py`; os status foram confirmados executando `BioCompiler().analyze(...)` em cada sequência.)

---

## 2. BioCompiler 2.0 — RNA Processor

### 2.1 Objetivo e papel na pipeline

Fase II da pipeline: `pré-mRNA -> mRNA maduro`. Recebe o pré-mRNA bruto produzido pelo BioCompiler 1.0 (ou qualquer sequência de RNA fornecida diretamente), reconhece e valida um íntron segundo uma gramática didática simplificada (`GU ... A ... AG`), remove o(s) íntron(ns) válido(s) (splicing), une os éxons, adiciona a CAP 5' (`m7Gppp`) e a cauda poli-A (100 adeninas), gerando o mRNA maduro. Se a entrada não for válida, retorna um diagnóstico.

Implementação: `biocompiler/rna_processor.py` (classe `BioCompiler2`, função `mature_pre_mrna`).

### 2.2 Formato de entrada

- Arquivo texto `.txt`, uma sequência de pré-mRNA por linha, processada na ordem do arquivo (mesmo leitor `_read_input_lines` do módulo 1.0: `utf-8-sig`, ignora linhas vazias e comentadas com `#`).
- Normalização por `clean_rna_sequence()`: NFC, remove BOM/zero-width space, `\r`/`\n`, `\t`→espaço, remove todos os espaços internos, maiúsculas.
- Alfabeto permitido: exatamente `{A, U, C, G}` (constante `VALID_RNA_BASES`). Qualquer outro caractere é base inválida.
- Sem separadores internos na sequência.

### 2.3 Convenção de splicing — parâmetros exatos (confirmados no código)

- Sítio 5' do íntron: substring literal `"GU"` (constante `INTRON_5_SITE`).
- Sítio 3' do íntron: substring literal `"AG"` (constante `INTRON_3_SITE`).
- Branch point: uma base `"A"` localizada em uma posição `p` tal que, sendo `ag_pos` o índice (0-based) do primeiro caractere de um `AG` compatível, a distância `ag_pos - p` esteja **entre 10 e 30, inclusive** (`MIN_BRANCH_DISTANCE = 10`, `MAX_BRANCH_DISTANCE = 30`). Isso confirma exatamente o PDF ("10 e 30 nucleotídeos antes do AG terminal").
- Cauda poli-A: **exatamente 100 adeninas** (`POLY_A_LENGTH = 100`, `POLY_A_TAIL = "A"*100`). Confirma o PDF.
- Marcador de CAP 5': string literal `"m7Gppp"` (`CAP_5_MARKER`), prefixada à sequência processada (sem espaço).

### 2.4 Algoritmo passo a passo (fiel ao código)

1. `clean_seq = clean_rna_sequence(raw_sequence)`.
2. **Validação de bases**: se existir caractere fora de `{A,U,C,G}`, retorna `BUG - base inválida` imediatamente (esta checagem **não está no PDF de 4 casos**, é exclusiva do código — ver seção 3).
3. **Busca do primeiro íntron válido** (`find_first_valid_intron`):
   a. Lista todas as posições de `"GU"` (`gu_positions`, ordem crescente) e todas as posições de `"AG"` (`ag_positions`, ordem crescente) na sequência limpa (substrings podem se sobrepor: a busca avança 1 caractere por vez, não 2).
   b. Para cada `gu_pos` em ordem crescente, para cada `ag_pos` em ordem crescente:
      - Ignora o par se `ag_pos <= gu_pos + 2` (ou seja, o AG precisa começar estritamente depois do fim do GU, `gu_pos+2` sendo o índice logo após "GU").
      - Caso contrário, calcula a janela de branch points válidos: `left = max(gu_pos + 2, ag_pos - 30)`, `right = ag_pos - 10`. Se `right < left`, não há posições válidas para este par. Senão, coleta todas as posições `p` em `[left, right]` onde `clean_seq[p] == "A"`.
      - Se essa lista não for vazia, **usa este par (gu_pos, ag_pos) e para a busca**: o branch point escolhido é o **último elemento da lista** (`branch_positions[-1]`), ou seja, a adenina válida **mais próxima do AG** (distância mínima possível dentro da janela 10–30).
   c. Se nenhum par `(gu_pos, ag_pos)` produzir branch points válidos, `find_first_valid_intron` retorna `None`.
   d. **Efeito prático**: o algoritmo prioriza o `GU` mais à esquerda da sequência; para esse `GU`, tenta os `AG`s em ordem crescente até achar um com branch point válido (não necessariamente o primeiro `AG` da sequência).
4. **Se não houver íntron válido** (`None`), classifica o erro (`_classify_splicing_error`), na seguinte ordem:
   - Se não existe nenhum `GU` na sequência → `BUG - sítio 5' ausente` (independentemente de haver ou não `AG`).
   - Senão, se não existe nenhum `AG` → `BUG - sítio 3' ausente`.
   - Senão (existem `GU`s e `AG`s, mas nenhum par compatível `ag_pos > gu_pos+2`): olha o primeiro `GU` e o primeiro `AG` da sequência; se `primeiro_AG < primeiro_GU` → `BUG - sítio 5' ausente`; caso contrário → `BUG - sítio 3' ausente`.
   - Senão (existe ao menos um par compatível `ag_pos > gu_pos+2`, mas nenhum tem branch point válido na janela 10–30) → `BUG - branch point`.
5. **Se houver íntron válido**: `splice_introns` remove **iterativamente** todos os íntrons válidos encontrados (chama `find_first_valid_intron` repetidamente sobre a sequência já cortada, até não achar mais nenhum), concatenando os éxons remanescentes (`current[:start] + current[end:]`, onde `end` inclui o `AG` terminal).
6. **Maturação**: `mature = "m7Gppp" + spliced + ("A" * 100)`.
7. Retorna `CORRETO` com `mature_mrna = mature`, e contagem de íntrons removidos.

Observação relevante para portagem: a remoção é **iterativa** — se, após remover o primeiro íntron, surgir (ou permanecer) outro par `GU...A...AG` válido na sequência resultante, ele também é removido, e assim por diante, até esgotar íntrons válidos.

### 2.5 Lista completa de status (ordem de precedência exata)

Strings literais de `biocompiler/rna_processor.py`:

| Ordem | Constante | String exata | Condição precisa |
|---|---|---|---|
| 1 | `RESULT_RNA_INVALID_BASE` | `BUG - base inválida` | Existe caractere fora de `{A,U,C,G}` em `clean_seq`. Verificada antes de qualquer análise de splicing. **Não documentada no PDF de especificação (seção 8), apenas no código e nos docs Markdown.** |
| 2 | `RESULT_MISSING_5_SITE` | `BUG - sítio 5' ausente` | Nenhum `GU` na sequência (havendo ou não `AG`); OU existem `GU`s e `AG`s mas nenhum par compatível, e o primeiro `AG` da sequência ocorre antes do primeiro `GU`. |
| 3 | `RESULT_MISSING_3_SITE` | `BUG - sítio 3' ausente` | Existe ao menos um `GU`, mas nenhum `AG`; OU existem `GU`s e `AG`s mas nenhum par compatível, e o primeiro `GU` ocorre antes (ou no mesmo ponto relativo) do primeiro `AG`. |
| 4 | `RESULT_BRANCH_POINT` | `BUG - branch point` | Existe ao menos um par `(GU, AG)` compatível (`ag_pos > gu_pos+2`) mas nenhum tem uma adenina válida na janela 10–30 nt antes do início do `AG`. |
| 5 | `RESULT_RNA_CORRECT` | `CORRETO` | Encontrado ao menos um íntron `GU...A...AG` com branch point válido; splicing, CAP 5' e poli-A aplicados com sucesso. |

O PDF (seção 8, "Casos que o programa deverá reconhecer") lista apenas 4 casos (CORRETO, sítio 5' ausente, sítio 3' ausente, branch point) — o 5º caso, base inválida, existe apenas no código/documentação Markdown (ver seção 3).

### 2.6 Saída em tela (formato exato)

Função `format_rna_processor_output` em `biocompiler/cli.py`:

```
========================================
BIOCOMPILER 2.0 - RNA PROCESSOR
========================================
ENTRADA: <n>
SEQUÊNCIA INSERIDA: <raw_sequence>
```

Se válida:
```
STATUS: CORRETO
Sítio 5': OK
Branch point: OK
Sítio 3': OK
Splicing: OK
CAP 5': ADICIONADA
Cauda poli-A: 100 A
Íntrons removidos: <len(introns)>
mRNA MADURO: <mature_mrna>
----------------------------------------
```

Se inválida:
```
STATUS: ERRO
TIPO: <status exato da tabela 2.5>
LOCALIZAÇÃO DO ERRO: <error_location>   (omitido se vazio)
TRECHO DO ERRO: <error_snippet>         (omitido se vazio)
DIAGNÓSTICO: <qa_diagnostic>            (omitido se vazio)
mRNA MADURO: NÃO GERADO
----------------------------------------
```

Nota: a linha "Íntrons removidos: N" e o cabeçalho sem a linha extra "RELATÓRIO DE AVALIAÇÃO..." (presente no DNA Transcriber, ausente aqui) são exclusivos deste módulo — não aparecem no exemplo de saída do PDF (seção 9), que é mais simples. Ver seção 3.

### 2.7 Saída em arquivo exportado (formato exato)

Função `export_rna_processor_results_file`. Separador `;`, UTF-8, cabeçalho + uma linha por entrada, `\n` final:

```
linha;status;resultado;mRNA_maduro
```

`status` = `OK`/`ERRO`; `resultado` = string exata da tabela 2.5; `mRNA_maduro` = sequência madura completa (`m7Gppp` + éxons unidos + 100×`A`) se válida, ou `NÃO GERADO` se inválida.

### 2.8 Exemplos entrada→saída reais (copiados de `BioCompiler2_entrada_40_casos_modelo_oficial.txt` / `resultados_40_casos_modelo_oficial.txt`, idênticos a `entrada.txt`/`resultados.txt`)

| Linha | Entrada | Status | mRNA maduro |
|---|---|---|---|
| 1 | `CUCCUCGUCCCCACCCCCCCCCCCCCCCCCUUCCC` | `BUG - sítio 3' ausente` | `NÃO GERADO` |
| 2 | `CUCCUCCCCCACCCCCCCCCCCCCCCCAGCUUCCC` | `BUG - sítio 5' ausente` | `NÃO GERADO` |
| 5 | `UCUCCCGUCCCCCACCCCCCCCCCCCCCAGUCUCCC` | `CORRETO` | `m7GpppUCUCCCUCUCCCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` (100 A's após "UCUCCCUCUCCC") |
| 11 | `UCUCCCGUCCCCCCCCCCCCCCCCCCCCAGUCUCCC` | `BUG - branch point` | `NÃO GERADO` |

O arquivo oficial de 40 casos tem exatamente 10 ocorrências de cada um dos 4 status principais (`CORRETO`, `BUG - sítio 5' ausente`, `BUG - sítio 3' ausente`, `BUG - branch point`), confirmado por `test_biocompiler2.py::TestOfficialInput40Cases`.

---

## 3. Divergências PDF vs Código

1. **BioCompiler 2.0 — caso "base inválida" não existe no PDF.** O PDF (seção 8, "Casos que o programa deverá reconhecer") lista somente 4 casos (CORRETO, sítio 5' ausente, sítio 3' ausente, branch point). O código (`rna_processor.py`) implementa um 5º caso, `BUG - base inválida`, verificado **antes** de qualquer análise de splicing, coberto por teste automatizado (`test_base_invalida`) e documentado nos arquivos `DOCUMENTACAO_EXPLICATIVA.md`/`DOCUMENTACAO_SLIDES.md`. **Ação recomendada para a portagem em TypeScript: implementar os 5 casos, priorizando `base inválida` no topo, como faz o código.**

2. **BioCompiler 2.0 — saída em tela tem uma linha extra ("Íntrons removidos: N") não prevista no exemplo do PDF (seção 9).** O exemplo do PDF não lista quantos íntrons foram removidos; o código sempre inclui essa linha no caso `CORRETO`. Não é uma divergência de valor, apenas de formato de exibição — não afeta o arquivo exportado (`resultados.txt`), que segue exatamente o formato do PDF (`linha;status;resultado;mRNA_maduro`).

3. **BioCompiler 1.0 — nomenclatura de status diverge entre o PDF de slides e o código.** O PDF de slides usa uma tabela ilustrativa com `Status` = `APROVADO`/`ERRO`/`ALERTA` e `Detalhe` como texto livre (`"Base inválida: X"`, `"START (ATG) não encontrado"`, `"STOP não encontrado"`, `"Frameshift detectado"`, `"STOP prematuro (nonsense)"`). O código real usa sempre `STATUS: CORRETO` ou `STATUS: ERRO`, com um campo separado `TIPO:` contendo uma das 6 strings fixas da tabela 1.4 (`BUG - base inválida`, `BUG - START ausente`, `BUG - STOP ausente`, `BUG - frameshift`, `BUG - nonsense / STOP prematuro`, ou nada quando `CORRETO`). O arquivo exportado usa a coluna `status` = `OK`/`ERRO` e `resultado` = a string `TIPO` exata. **O código/`resultados.txt` é a fonte de verdade — não usar os rótulos `APROVADO`/`ALERTA` do PDF de slides na implementação.**

4. **BioCompiler 1.0 — ordem de precedência entre "nonsense" e "frameshift" não é explicitada literalmente no PDF (que é apenas um slide com 6 casos ilustrativos, sem pseudocódigo formal), mas o código define uma ordem determinística e não ambígua**, documentada na seção 1.3/1.4 acima: base inválida → START ausente → (>1 stop no frame ⇒ nonsense) → (==1 stop ⇒ correto) → (0 stops, resto≠0 ⇒ frameshift) → (0 stops, resto==0 ⇒ stop ausente). Isso deve ser seguido exatamente na portagem, pois pequenas mudanças de ordem alteram a classificação de sequências como `ATGGCTTAACCGGGCTAA` (que tem 2 stops no frame e deve dar `nonsense`, não `correto` com o primeiro stop).

5. **BioCompiler 1.0 — não há arquivo `.txt` de casos oficiais de DNA no repositório** (diferente do BioCompiler 2.0, que tem `BioCompiler2_entrada_40_casos_modelo_oficial.txt`). Os exemplos usados na seção 1.7 vêm dos casos de demonstração embutidos em `cli.py::_run_dna_demo`, que são os únicos exemplos "oficiais" disponíveis no código-fonte.

6. **Números confirmados sem divergência**: janela do branch point 10–30 nt (código: `MIN_BRANCH_DISTANCE=10`, `MAX_BRANCH_DISTANCE=30`, ambos inclusivos) confere exatamente com o PDF; cauda poli-A de exatamente 100 adeninas (`POLY_A_LENGTH=100`) confere exatamente; prefixo `m7Gppp` confere exatamente (sem espaço, sem variação de maiúsculas); marcadores de íntron `GU`/`AG` conferem exatamente; alfabetos `{A,T,C,G}` (DNA) e `{A,U,C,G}` (RNA) conferem exatamente; separador de arquivo exportado `;` confere exatamente; nomes de coluna do CSV (`linha;status;resultado;pre_mRNA` para DNA e `linha;status;resultado;mRNA_maduro` para RNA) conferem exatamente.

---

## 4. Notas adicionais para a portagem em TypeScript

- A limpeza de sequência (`clean_sequence`/`clean_rna_sequence`) deve ser replicada fielmente: normalizar Unicode (NFC), remover BOM/zero-width space/`\r`/`\n`, trocar `\t` por espaço, remover **todos** os espaços/whitespaces internos (não só trim), e converter para maiúsculas — nessa ordem.
- A busca de `GU`/`AG` no RNA processor permite substrings sobrepostas (avança posição+1 a cada `find`, não posição+2) — importante para replicar `_site_positions`.
- O branch point escolhido, quando há múltiplos válidos na janela, é sempre o mais próximo do `AG` (distância mínima, ≥10), não o mais próximo do `GU`.
- O splicing é iterativo (múltiplos íntrons na mesma sequência são todos removidos, um de cada vez, recomeçando a busca do zero na sequência já cortada a cada iteração).
- Ambos os módulos preservam a ordem das linhas de entrada e geram exatamente uma linha de resultado por linha de entrada (1:1), com numeração de entrada começando em 1.
