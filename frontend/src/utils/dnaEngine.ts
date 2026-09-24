import type { DnaAnalysis, DnaCase, DnaStatus } from '../types';

/**
 * BioCompiler 1.0 - DNA Transcriber (Fase I).
 * Fonte primaria: BioCompiler2.0/BioCompiler 1.0.pdf (transcricao em
 * BioCompiler2.0/pdf_text_biocompiler1.txt). O codigo Python legado em
 * BioCompiler2.0/biocompiler/core.py serve apenas como desempate onde o PDF
 * e silencioso ou ambiguo (ver comentarios pontuais abaixo).
 */

export const DNA_ALPHABET = new Set(['A', 'T', 'C', 'G']);
export const START_CODON = 'ATG';
export const STOP_CODONS = new Set(['TAA', 'TAG', 'TGA']);

// DIVERGENCIA (PDF vs codigo): o PDF de slides usa Status = APROVADO/ERRO/ALERTA
// mais uma coluna "Detalhe" (pagina 3, "FORMATO DA SAIDA"), enquanto o codigo
// Python usa sempre STATUS: CORRETO/ERRO + um campo TIPO com 6 strings fixas.
// Regra da tarefa: PDF vence. Os rotulos abaixo seguem literalmente a tabela do PDF.
function statusForCase(dnaCase: DnaCase): DnaStatus {
  switch (dnaCase) {
    case 'CORRETO':
      return 'APROVADO';
    case 'BASE_INVALIDA':
    case 'START_AUSENTE':
    case 'STOP_AUSENTE':
      return 'ERRO';
    case 'FRAMESHIFT':
    case 'NONSENSE':
      return 'ALERTA';
  }
}

// AMBIGUIDADE DO PDF: pdf_text_biocompiler1.txt é uma transcrição manual (OCR
// visual) de um PDF baseado em imagens e foi digitada sem acentuação (ex.:
// "nao encontrado", "invalida"). Já pdf_text_biocompiler2.txt (extração de
// texto real do PDF da Fase II) preserva acentos normalmente ("não", "sítio").
// Isso indica que a ausência de acento na Fase I é um artefato da transcrição,
// não do slide original. Decisão de desempate: restaurar a acentuação padrão
// do portugues nas strings de "Detalhe", mantendo o resto do texto literal.
function detailForCase(dnaCase: DnaCase, invalidBase: string): string {
  switch (dnaCase) {
    case 'CORRETO':
      return 'Transcrição realizada';
    case 'BASE_INVALIDA':
      return `Base inválida: ${invalidBase}`;
    case 'START_AUSENTE':
      return 'START (ATG) não encontrado';
    case 'STOP_AUSENTE':
      return 'STOP não encontrado';
    case 'FRAMESHIFT':
      return 'Frameshift detectado';
    case 'NONSENSE':
      return 'STOP prematuro (nonsense)';
  }
}

/**
 * Limpeza de sequencia identica em espirito a clean_sequence() do codigo
 * legado (nao especificada em detalhe pelo PDF, que so pede "sem espacos,
 * quebras de linha ou separadores" na nota final da pagina 2): remove BOM,
 * zero-width space, \r, \n, colapsa todo whitespace interno e converte para
 * maiusculas.
 */
function cleanSequence(sequence: string): string {
  if (!sequence) return '';
  let s = sequence.normalize('NFC');
  s = s.replace(/﻿/g, '').replace(/​/g, '');
  s = s.replace(/\r/g, '').replace(/\n/g, '').replace(/\t/g, ' ');
  return s.replace(/\s+/g, '').toUpperCase();
}

function transcribeToPreMrna(dna: string): string {
  return dna.replace(/T/g, 'U');
}

function buildResult(
  entryNumber: number,
  rawSequence: string,
  cleanSeq: string,
  dnaCase: DnaCase,
  overrides: Partial<DnaAnalysis>,
): DnaAnalysis {
  const status = statusForCase(dnaCase);
  const invalidBase = overrides.invalidBase ?? '';
  const detail = detailForCase(dnaCase, invalidBase);
  const valid = dnaCase === 'CORRETO';

  return {
    entryNumber,
    rawSequence,
    cleanSequence: cleanSeq,
    status,
    dnaCase,
    detail,
    valid,
    invalidBase,
    invalidBasePosition: -1,
    startValid: false,
    startIndex: -1,
    stopValid: false,
    stopCodon: '',
    stopIndex: -1,
    codonCount: 0,
    cdsDna: '',
    preMrna: 'NÃO GERADO',
    diagnosticSummary: '',
    didacticExplanation: '',
    biologicalContext: '',
    ...overrides,
  };
}

export function analyzeDna(line: string, entryNumber: number = 1): DnaAnalysis {
  const raw = line.trim();
  const cleanSeq = cleanSequence(raw);

  // Ordem de precedencia (PDF nao formaliza a ordem entre os 6 casos alem de
  // numera-los ilustrativamente 1-6; codigo legado core.py define uma ordem
  // deterministica e a documenta em SPEC_CONSOLIDADA.md secao 1.3/1.4 -
  // usada aqui como desempate, ja que a ordem altera a classificacao de
  // sequencias com mais de um STOP em fase):
  // 1) base invalida -> 2) START ausente -> 3) >1 STOP em fase => nonsense ->
  // 4) exatamente 1 STOP => correto -> 5) 0 STOP e resto%3!=0 => frameshift ->
  // 6) 0 STOP e resto%3==0 => STOP ausente.

  // Caso 2 (PDF pagina 2/3): base invalida.
  for (let i = 0; i < cleanSeq.length; i++) {
    const char = cleanSeq[i];
    if (!DNA_ALPHABET.has(char)) {
      return buildResult(entryNumber, raw, cleanSeq, 'BASE_INVALIDA', {
        invalidBase: char,
        invalidBasePosition: i + 1,
        diagnosticSummary: `Caractere inválido encontrado na posição ${i + 1}: '${char}'.`,
        didacticExplanation:
          'O DNA é composto exclusivamente pelas bases nitrogenadas Adenina (A), Timina (T), Citosina (C) e Guanina (G). Qualquer outro caractere invalida a sequência como material genético.',
        biologicalContext: 'Uma base fora do alfabeto canônico impede qualquer leitura biológica confiável da fita.',
      });
    }
  }

  // Caso 3 (PDF): START ausente.
  const startIndex = cleanSeq.indexOf(START_CODON);
  if (startIndex === -1) {
    return buildResult(entryNumber, raw, cleanSeq, 'START_AUSENTE', {
      diagnosticSummary: "Nenhum códon START (ATG) foi encontrado na sequência.",
      didacticExplanation:
        'A RNA polimerase e a maquinaria de transcrição dependem de um sinal reconhecível para iniciar a região codificadora. Sem ATG, não há como delimitar o início do quadro de leitura.',
      biologicalContext: 'A ausência de um START impede a definição de um quadro de leitura válido para a transcrição.',
    });
  }

  // Varredura em trincas a partir do START, coletando todos os STOP em fase
  // (PDF pagina 2, legenda: "seta = quadro de leitura"; "buscar o STOP no
  // mesmo quadro de leitura").
  const inFrameStops: Array<{ codonIndex: number; pos: number; codon: string }> = [];
  for (let pos = startIndex, codonIndex = 0; pos < cleanSeq.length; pos += 3, codonIndex++) {
    const triplet = cleanSeq.slice(pos, pos + 3);
    if (triplet.length < 3) break;
    if (STOP_CODONS.has(triplet)) {
      inFrameStops.push({ codonIndex, pos, codon: triplet });
    }
  }

  // Caso 6 (PDF): NONSENSE - STOP prematuro (mais de um STOP em fase; o
  // primeiro e reportado como o ponto do erro).
  if (inFrameStops.length > 1) {
    const first = inFrameStops[0];
    return buildResult(entryNumber, raw, cleanSeq, 'NONSENSE', {
      startValid: true,
      startIndex,
      stopValid: false,
      stopCodon: first.codon,
      stopIndex: first.pos,
      codonCount: first.codonIndex + 1,
      diagnosticSummary: `Códon de parada (${first.codon}) surgiu prematuramente no códon ${first.codonIndex + 1}, antes do fim esperado da região codificante.`,
      didacticExplanation:
        'Uma mutação nonsense insere um códon STOP antes do previsto, truncando a leitura e resultando em uma proteína incompleta e geralmente não funcional.',
      biologicalContext: 'STOP prematuro costuma disparar mecanismos de vigilância como o Nonsense-Mediated Decay (NMD), degradando o transcrito aberrante.',
    });
  }

  // Caso 1 (PDF): CORRETO - exatamente um STOP em fase.
  if (inFrameStops.length === 1) {
    const stop = inFrameStops[0];
    const preMrna = transcribeToPreMrna(cleanSeq);
    const cdsDna = cleanSeq.slice(startIndex, stop.pos + 3);
    return buildResult(entryNumber, raw, cleanSeq, 'CORRETO', {
      startValid: true,
      startIndex,
      stopValid: true,
      stopCodon: stop.codon,
      stopIndex: stop.pos,
      codonCount: stop.codonIndex + 1,
      cdsDna,
      preMrna,
      diagnosticSummary: `Sequência válida: START (ATG) e STOP (${stop.codon}) encontrados no mesmo quadro de leitura, com ${stop.codonIndex + 1} códons.`,
      didacticExplanation:
        'A região codificadora foi delimitada corretamente entre o START e o STOP no mesmo quadro de leitura, permitindo a transcrição integral do gene em pré-mRNA (T substituído por U).',
      biologicalContext: 'Um gene íntegro, sem indels nem mutações nonsense, garante que a RNA polimerase produza um pré-mRNA fiel ao molde de DNA.',
    });
  }

  // Nenhum STOP em fase encontrado: distingue FRAMESHIFT de STOP AUSENTE pelo
  // resto da divisao por 3 do trecho START..fim da sequencia.
  const remBases = (cleanSeq.length - startIndex) % 3;

  // Caso 5 (PDF): FRAMESHIFT (indel) - quadro de leitura nao fecha em trincas completas.
  if (remBases !== 0) {
    return buildResult(entryNumber, raw, cleanSeq, 'FRAMESHIFT', {
      startValid: true,
      startIndex,
      diagnosticSummary: `Quadro de leitura quebrado: restam ${remBases} base(s) fora de trincas completas ao final da sequência.`,
      didacticExplanation:
        'Inserções ou deleções de bases em número não múltiplo de 3 deslocam o quadro de leitura (frameshift), fazendo com que os códons subsequentes — inclusive o STOP esperado — sejam lidos de forma incorreta ou deixem de existir na fase original.',
      biologicalContext: 'Frameshifts costumam gerar proteínas truncadas ou completamente diferentes da original, frequentemente não funcionais.',
    });
  }

  // Caso 4 (PDF): STOP AUSENTE - trincas completas ate o fim, nenhuma e STOP.
  return buildResult(entryNumber, raw, cleanSeq, 'STOP_AUSENTE', {
    startValid: true,
    startIndex,
    diagnosticSummary: 'A leitura em trincas chegou ao fim da sequência sem encontrar um códon STOP (TAA, TAG ou TGA) no quadro de leitura.',
    didacticExplanation:
      'Sem um códon de parada em fase, a informação genética não delimita o fim da região codificadora, impedindo o término correto da transcrição/tradução.',
    biologicalContext: 'A ausência de STOP no quadro de leitura é característica de genes truncados ou de erros na determinação do frame.',
  });
}

/**
 * Formato de exportacao (arquivo). O PDF (pagina 3) define apenas o formato
 * em tela (tabela "Sequencia | Status | Detalhe") e nao especifica um layout
 * de arquivo exportado para a Fase I (diferente da Fase II, cujo CSV e
 * literal na especificacao). AMBIGUIDADE: por ausencia de definicao no PDF,
 * o layout abaixo espelha o padrao ja usado pela Fase II
 * (`linha;status;resultado;<saida>`), substituindo a coluna "Detalhe" pelo
 * literal da tabela do PDF, e mantendo status OK/ERRO (Fase III/pipeline)
 * em vez de APROVADO/ALERTA para uniformizar a coluna machine-readable.
 */
export function generateDnaExportContent(analyses: DnaAnalysis[]): string {
  const lines: string[] = ['linha;status;detalhe;pre_mRNA'];
  for (const a of analyses) {
    const machineStatus = a.valid ? 'OK' : 'ERRO';
    lines.push(`${a.entryNumber};${machineStatus};${a.detail};${a.preMrna}`);
  }
  return lines.join('\n');
}

export function generateDnaScreenReport(analysis: DnaAnalysis): string {
  const header = [
    '========================================',
    'BIOCOMPILER 1.0 - DNA TRANSCRIBER',
    '========================================',
    `ENTRADA: ${analysis.entryNumber}`,
  ];

  if (analysis.valid) {
    return [
      ...header,
      `Status: ${analysis.status}`,
      `Detalhe: ${analysis.detail}`,
      `START: ${START_CODON} - OK (posição ${analysis.startIndex + 1})`,
      `STOP: ${analysis.stopCodon} - OK (posição ${analysis.stopIndex + 1})`,
      `pré-mRNA: ${analysis.preMrna}`,
      '----------------------------------------',
    ].join('\n');
  }

  return [
    ...header,
    `Status: ${analysis.status}`,
    `Detalhe: ${analysis.detail}`,
    `pré-mRNA: NÃO GERADO`,
    '----------------------------------------',
  ].join('\n');
}
