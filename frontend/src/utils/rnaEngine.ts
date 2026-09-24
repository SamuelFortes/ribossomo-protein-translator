import type { RnaAnalysis, RnaIntronDetail, RnaResult } from '../types';

/**
 * BioCompiler 2.0 - RNA Processor (Fase II).
 * Fonte primaria: BioCompiler2.0/4.2 Especificacao_BioCompiler_2_0 2026.2_VERSION 2.pdf
 * (texto extraido em BioCompiler2.0/pdf_text_biocompiler2.txt). O codigo Python
 * legado (BioCompiler2.0/biocompiler/rna_processor.py) serve de desempate
 * apenas onde o PDF e silencioso (ver comentarios pontuais abaixo).
 */

export const RNA_ALPHABET = new Set(['A', 'U', 'C', 'G']);
export const INTRON_5_SITE = 'GU'; // secao 3 do PDF: "Sitio 5' GU"
export const INTRON_3_SITE = 'AG'; // secao 3 do PDF: "Sitio 3' AG"
export const CAP_5_MARKER = 'm7Gppp'; // secao 6 do PDF
export const POLY_A_LENGTH = 100; // secao 7 do PDF: "exatamente 100 adeninas"
export const MIN_BRANCH_DISTANCE = 10; // secao 4 do PDF: "entre 10 e 30 nucleotideos"
export const MAX_BRANCH_DISTANCE = 30;

function cleanRnaSequence(sequence: string): string {
  if (!sequence) return '';
  let s = sequence.normalize('NFC');
  s = s.replace(/﻿/g, '').replace(/​/g, '');
  s = s.replace(/\r/g, '').replace(/\n/g, '').replace(/\t/g, ' ');
  return s.replace(/\s+/g, '').toUpperCase();
}

function sitePositions(sequence: string, site: string): number[] {
  const positions: number[] = [];
  let start = 0;
  // Busca com sobreposicao (avanca 1 caractere por vez, nao pelo tamanho do
  // site) - nao especificado explicitamente pelo PDF; seguindo o
  // comportamento do codigo legado (_site_positions), documentado em
  // SPEC_CONSOLIDADA.md secao 4 como relevante para a portagem.
  for (;;) {
    const pos = sequence.indexOf(site, start);
    if (pos === -1) return positions;
    positions.push(pos);
    start = pos + 1;
  }
}

function validBranchPositions(sequence: string, guPos: number, agPos: number): number[] {
  // Secao 4 do PDF: branch point A valido entre 10 e 30 nt antes do AG terminal.
  const left = Math.max(guPos + INTRON_5_SITE.length, agPos - MAX_BRANCH_DISTANCE);
  const right = agPos - MIN_BRANCH_DISTANCE;
  if (right < left) return [];
  const positions: number[] = [];
  for (let pos = left; pos <= right; pos++) {
    if (sequence[pos] === 'A') positions.push(pos);
  }
  return positions;
}

function findFirstValidIntron(sequence: string): RnaIntronDetail | null {
  const guPositions = sitePositions(sequence, INTRON_5_SITE);
  const agPositions = sitePositions(sequence, INTRON_3_SITE);

  for (const guPos of guPositions) {
    for (const agPos of agPositions) {
      if (agPos <= guPos + INTRON_5_SITE.length) continue;
      const branchPositions = validBranchPositions(sequence, guPos, agPos);
      if (branchPositions.length > 0) {
        // Branch point mais proximo do AG (distancia minima >= 10), nao do GU
        // - convencao do codigo legado, mantida por nao ser contradita pelo PDF.
        const branchPos = branchPositions[branchPositions.length - 1];
        const end = agPos + INTRON_3_SITE.length;
        return {
          start: guPos,
          end,
          branchPos,
          branchDistance: agPos - branchPos,
          sequence: sequence.slice(guPos, end),
        };
      }
    }
  }
  return null;
}

interface SplicingErrorClassification {
  result: RnaResult;
  site5Valid: boolean;
  site3Valid: boolean;
  errorLocation: string;
  errorSnippet: string;
  diagnosticSummary: string;
}

/**
 * Classifica o motivo pelo qual nenhum intron valido foi encontrado, seguindo
 * a secao 8 do PDF (tabela dos 4 casos oficiais):
 * - Sitio 5' ausente: existe AG mas nao GU anterior compativel.
 * - Sitio 3' ausente: existe GU mas nao AG posterior compativel.
 * - Branch point: existem GU e AG compativeis, mas nenhum branch point valido.
 */
function classifySplicingError(sequence: string): SplicingErrorClassification {
  const guPositions = sitePositions(sequence, INTRON_5_SITE);
  const agPositions = sitePositions(sequence, INTRON_3_SITE);

  if (guPositions.length === 0) {
    const loc = agPositions.length > 0
      ? `Sítio 3' AG encontrado na posição ${agPositions[0] + 1}, sem GU anterior compatível`
      : "Nenhum sítio 5' GU foi encontrado na sequência";
    return {
      result: "BUG - sítio 5' ausente",
      site5Valid: false,
      site3Valid: agPositions.length > 0,
      errorLocation: loc,
      errorSnippet: `[${sequence}]`,
      diagnosticSummary: "Existe sinal de término de íntron (AG) sem um sítio 5' (GU) anterior capaz de iniciá-lo.",
    };
  }

  if (agPositions.length === 0) {
    const firstGu = guPositions[0];
    return {
      result: "BUG - sítio 3' ausente",
      site5Valid: true,
      site3Valid: false,
      errorLocation: `Sítio 5' GU encontrado na posição ${firstGu + 1}, sem AG posterior compatível`,
      errorSnippet: `[${sequence}]`,
      diagnosticSummary: "O íntron foi iniciado por GU, mas não há sítio 3' (AG) posterior para encerrá-lo.",
    };
  }

  const compatiblePairs = guPositions.flatMap((guPos) =>
    agPositions.filter((agPos) => agPos > guPos + INTRON_5_SITE.length).map((agPos) => [guPos, agPos] as const),
  );

  if (compatiblePairs.length === 0) {
    const firstGu = guPositions[0];
    const firstAg = agPositions[0];
    if (firstAg < firstGu) {
      return {
        result: "BUG - sítio 5' ausente",
        site5Valid: false,
        site3Valid: true,
        errorLocation: `Sítio 3' AG encontrado na posição ${firstAg + 1}, sem GU anterior compatível`,
        errorSnippet: `[${sequence}]`,
        diagnosticSummary: "Existe sinal de término de íntron antes de qualquer sítio 5' (GU) compatível.",
      };
    }
    return {
      result: "BUG - sítio 3' ausente",
      site5Valid: true,
      site3Valid: false,
      errorLocation: `Sítio 5' GU encontrado na posição ${firstGu + 1}, sem AG posterior compatível`,
      errorSnippet: `[${sequence}]`,
      diagnosticSummary: "O íntron foi iniciado por GU, mas não há sítio 3' (AG) posterior para encerrá-lo.",
    };
  }

  const [guPos, agPos] = compatiblePairs[0];
  return {
    result: 'BUG - branch point',
    site5Valid: true,
    site3Valid: true,
    errorLocation: `Entre GU na posição ${guPos + 1} e AG na posição ${agPos + 1}`,
    errorSnippet: `${sequence.slice(0, guPos)}[${sequence.slice(guPos, agPos + INTRON_3_SITE.length)}]${sequence.slice(agPos + INTRON_3_SITE.length)}`,
    diagnosticSummary: 'Não há adenina (branch point) entre 10 e 30 nucleotídeos antes do AG terminal do íntron.',
  };
}

function spliceIntrons(sequence: string): { spliced: string; introns: RnaIntronDetail[] } {
  let current = sequence;
  const removed: RnaIntronDetail[] = [];

  // Remocao iterativa: reinicia a busca do zero na sequencia ja cortada ate
  // nao existirem mais introns validos (secao 5 do PDF descreve uma unica
  // remocao; iterar ate esgotar introns e desempate herdado do codigo legado,
  // documentado em SPEC_CONSOLIDADA.md secao 2.4, nao contradito pelo PDF).
  for (;;) {
    const intron = findFirstValidIntron(current);
    if (!intron) return { spliced: current, introns: removed };
    removed.push(intron);
    current = current.slice(0, intron.start) + current.slice(intron.end);
  }
}

function buildResult(entryNumber: number, rawSequence: string, cleanSeq: string, overrides: Partial<RnaAnalysis>): RnaAnalysis {
  return {
    entryNumber,
    rawSequence,
    cleanSequence: cleanSeq,
    status: 'ERRO',
    result: 'BUG - branch point',
    isOfficialDiagnostic: true,
    valid: false,
    site5Valid: false,
    site3Valid: false,
    branchPointValid: false,
    splicingValid: false,
    introns: [],
    splicedSequence: '',
    cap5Added: false,
    polyATailLength: 0,
    matureMrna: 'NÃO GERADO',
    errorLocation: '',
    errorSnippet: '',
    diagnosticSummary: '',
    didacticExplanation: '',
    biologicalContext: '',
    ...overrides,
  };
}

export function analyzeRna(line: string, entryNumber: number = 1): RnaAnalysis {
  const raw = line.trim();
  const cleanSeq = cleanRnaSequence(raw);

  // Guarda defensiva de alfabeto: o PDF (secao 8) lista apenas 4 casos
  // oficiais e nao prevê "base invalida". Por instrucao explicita da tarefa,
  // esse caso e mantido apenas como validacao de entrada (nao e um
  // diagnostico oficial), visualmente distinto via isOfficialDiagnostic=false
  // e um `result` que nao reutiliza nenhuma das 4 strings oficiais.
  for (let i = 0; i < cleanSeq.length; i++) {
    const char = cleanSeq[i];
    if (!RNA_ALPHABET.has(char)) {
      return buildResult(entryNumber, raw, cleanSeq, {
        result: 'ENTRADA INVÁLIDA (guarda defensiva)',
        isOfficialDiagnostic: false,
        errorLocation: `Posição ${i + 1} (base '${char}')`,
        errorSnippet: `${cleanSeq.slice(0, i)}[${char}]${cleanSeq.slice(i + 1)}`,
        diagnosticSummary: `Caractere inválido encontrado: '${char}'. O pré-mRNA deve conter somente as bases A, U, C e G.`,
        didacticExplanation:
          'Esta verificação é uma guarda defensiva de entrada, não um dos 4 diagnósticos oficiais da especificação do BioCompiler 2.0.',
        biologicalContext: 'Um caractere fora do alfabeto {A,U,C,G} não corresponde a nenhuma base de RNA conhecida.',
      });
    }
  }

  const firstIntron = findFirstValidIntron(cleanSeq);
  if (!firstIntron) {
    const classification = classifySplicingError(cleanSeq);
    return buildResult(entryNumber, raw, cleanSeq, {
      result: classification.result,
      site5Valid: classification.site5Valid,
      site3Valid: classification.site3Valid,
      errorLocation: classification.errorLocation,
      errorSnippet: classification.errorSnippet,
      diagnosticSummary: classification.diagnosticSummary,
      didacticExplanation:
        'A convenção didática do BioCompiler 2.0 exige um íntron completo no padrão GU ... A ... AG, com o branch point A entre 10 e 30 nt antes do AG terminal, para que o splicing seja realizado.',
      biologicalContext: 'Sem os sinais de splicing corretos, o spliceossomo não consegue reconhecer e remover o íntron, impedindo a maturação do mRNA.',
    });
  }

  const { spliced, introns } = spliceIntrons(cleanSeq);
  const matureMrna = CAP_5_MARKER + spliced + 'A'.repeat(POLY_A_LENGTH);

  return buildResult(entryNumber, raw, cleanSeq, {
    status: 'OK',
    result: 'CORRETO',
    isOfficialDiagnostic: true,
    valid: true,
    site5Valid: true,
    site3Valid: true,
    branchPointValid: true,
    splicingValid: true,
    introns,
    splicedSequence: spliced,
    cap5Added: true,
    polyATailLength: POLY_A_LENGTH,
    matureMrna,
    errorLocation: 'Nenhum erro detectado',
    errorSnippet: 'Sequência processada com splicing bem-sucedido',
    diagnosticSummary: `Splicing concluído: ${introns.length} íntron(s) removido(s). CAP 5' e cauda poli-A adicionadas.`,
    didacticExplanation:
      "O(s) íntron(s) no padrão GU ... A ... AG foram removidos e os éxons unidos; em seguida a CAP 5' (m7Gppp) e a cauda poli-A (100 adeninas) foram adicionadas, gerando o mRNA maduro.",
    biologicalContext: 'O splicing, a CAP 5\' e a cauda poli-A são etapas essenciais do processamento do pré-mRNA em eucariotos, garantindo estabilidade e reconhecimento pelo ribossomo.',
  });
}

/**
 * Formato exato do arquivo exportado (secao 11 do PDF):
 * "linha;status;resultado;mRNA_maduro"
 * status = OK/ERRO; resultado = string exata do diagnostico oficial;
 * mRNA_maduro = sequencia madura completa ou 'NÃO GERADO'.
 */
export function generateRnaExportContent(analyses: RnaAnalysis[]): string {
  const lines: string[] = ['linha;status;resultado;mRNA_maduro'];
  for (const a of analyses) {
    lines.push(`${a.entryNumber};${a.status};${a.result};${a.matureMrna}`);
  }
  return lines.join('\n');
}

/**
 * Formato exato da saida em tela (secao 9 do PDF). A linha "Introns
 * removidos: N" do codigo legado NAO faz parte deste relatorio oficial
 * (divergencia registrada na tarefa: pode existir como info auxiliar de UI,
 * nunca no formato oficial) - por isso omitida aqui.
 */
export function generateRnaScreenReport(analysis: RnaAnalysis): string {
  const header = [
    '========================================',
    'BIOCOMPILER 2.0 - RNA PROCESSOR',
    '========================================',
    `ENTRADA: ${analysis.entryNumber}`,
  ];

  if (analysis.valid) {
    return [
      ...header,
      `STATUS: ${analysis.result}`,
      "Sítio 5': OK",
      'Branch point: OK',
      "Sítio 3': OK",
      'Splicing: OK',
      "CAP 5': ADICIONADA",
      `Cauda poli-A: ${analysis.polyATailLength} A`,
      `mRNA MADURO: ${analysis.matureMrna}`,
      '----------------------------------------',
    ].join('\n');
  }

  return [
    ...header,
    'STATUS: ERRO',
    `TIPO: ${analysis.result}`,
    `LOCALIZAÇÃO DO ERRO: ${analysis.errorLocation}`,
    `TRECHO DO ERRO: ${analysis.errorSnippet}`,
    `DIAGNÓSTICO: ${analysis.diagnosticSummary}`,
    'mRNA MADURO: NÃO GERADO',
    '----------------------------------------',
  ].join('\n');
}
