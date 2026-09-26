import type { DnaAnalysis, DnaCase, DnaResultLabel, DnaStatus } from '../types';

/**
 * BioCompiler 1.0 - DNA Transcriber (Fase I).
 * Fonte primaria e oficial: BioCompiler2.0/biocompiler/"Especificações do
 * BioCompiler 1.0 e slides.pdf" (seções 8, 9, 11 e 14) e
 * BioCompiler2.0/biocompiler/"Respostas Esperadas Bio1.0.txt". Esse PDF
 * substitui o "BioCompiler 1.0.pdf" antigo onde os dois divergirem.
 */

export const DNA_ALPHABET = new Set(['A', 'T', 'C', 'G']);
export const START_CODON = 'ATG';
export const STOP_CODONS = new Set(['TAA', 'TAG', 'TGA']);

// Seção 9 do PDF oficial: STATUS: CORRETO apenas para o caso 1; STATUS: ERRO
// para os demais 5 casos (seção 8).
function statusForCase(dnaCase: DnaCase): DnaStatus {
  return dnaCase === 'CORRETO' ? 'CORRETO' : 'ERRO';
}

// Seção 8 do PDF oficial ("Resposta esperada") / Respostas Esperadas Bio1.0.txt.
// Strings literais, reproduzidas exatamente como definidas na especificação.
function resultLabelForCase(dnaCase: DnaCase): DnaResultLabel {
  switch (dnaCase) {
    case 'CORRETO':
      return 'CORRETO';
    case 'BASE_INVALIDA':
      return 'BUG - base inválida';
    case 'START_AUSENTE':
      return 'BUG - START ausente';
    case 'STOP_AUSENTE':
      return 'BUG - STOP ausente';
    case 'FRAMESHIFT':
      return 'BUG - frameshift';
    case 'NONSENSE':
      return 'BUG - nonsense / STOP prematuro';
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
  const resultLabel = resultLabelForCase(dnaCase);
  const invalidBase = overrides.invalidBase ?? '';
  const valid = dnaCase === 'CORRETO';

  return {
    entryNumber,
    rawSequence,
    cleanSequence: cleanSeq,
    status,
    dnaCase,
    resultLabel,
    detail: resultLabel,
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
 * Formato de exportação (arquivo) — seção 11 do PDF oficial:
 * `linha;status;resultado;pre_mRNA`, status machine-readable OK/ERRO
 * (`a.valid`), "resultado" = resultLabel literal, pré-mRNA ou "NÃO GERADO".
 */
export function generateDnaExportContent(analyses: DnaAnalysis[]): string {
  const lines: string[] = ['linha;status;resultado;pre_mRNA'];
  for (const a of analyses) {
    const machineStatus = a.valid ? 'OK' : 'ERRO';
    lines.push(`${a.entryNumber};${machineStatus};${a.resultLabel};${a.preMrna}`);
  }
  return lines.join('\n');
}

/**
 * Saída padrão para a tela (seções 9 e 14 do PDF oficial) para um lote de
 * entradas: o banner aparece uma única vez no topo, seguido de um bloco por
 * entrada. Bloco CORRETO segue o formato do exemplo 14.1 (inclui o códon no
 * STOP); bloco de erro (14.2-14.6) só traz ENTRADA/STATUS/TIPO/pré-mRNA.
 */
export function generateDnaTerminalOutput(analyses: DnaAnalysis[]): string {
  const lines: string[] = [
    '========================================',
    'BIOCOMPILER 1.0 - DNA TRANSCRIBER',
    '========================================',
  ];

  for (const a of analyses) {
    lines.push(`ENTRADA: ${a.entryNumber}`);
    lines.push(`STATUS: ${a.status}`);

    if (a.valid) {
      lines.push('Bases: OK');
      lines.push(`START: ${START_CODON} - OK`);
      lines.push('Quadro de leitura: OK');
      lines.push(`STOP: ${a.stopCodon} - OK`);
      lines.push('Transcrição: OK');
      lines.push(`pré-mRNA: ${a.preMrna}`);
    } else {
      lines.push(`TIPO: ${a.resultLabel}`);
      lines.push('pré-mRNA: NÃO GERADO');
    }

    lines.push('----------------------------------------');
  }

  return lines.join('\n');
}

/** Wrapper de compatibilidade para uma única entrada. */
export function generateDnaScreenReport(analysis: DnaAnalysis): string {
  return generateDnaTerminalOutput([analysis]);
}
