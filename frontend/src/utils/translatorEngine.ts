import type { RibosomeAnalysis, CodonDetail, TranslationResult } from '../types';
import { GENETIC_CODE, STOP_CODONS, AMINO_ACID_MAP } from './geneticCode';

export const OFFICIAL_TEST_CASES = [
  {
    id: 1,
    name: '14.1 CORRETO',
    description: 'Sequência perfeita: CAP 5\', AUG, 4 trincas, UAA em fase e cauda de 100 As.',
    expectedResult: 'CORRETO',
    expectedProtein: 'Met-Ala-Lys-Pro',
    sequence: 'm7GpppCCAUGGCUAAACCGUAAGG' + 'A'.repeat(100),
  },
  {
    id: 2,
    name: '14.2 BUG - CAP 5\'',
    description: 'A sequência não inicia com m7Gppp (falta a CAP 5\').',
    expectedResult: "BUG - CAP 5'",
    expectedProtein: 'NÃO GERADA',
    sequence: 'CCAUGGCUAAACCGUAAGG' + 'A'.repeat(100),
  },
  {
    id: 3,
    name: '14.3 BUG - START ausente',
    description: 'Apresenta CAP 5\', mas não possui o códon AUG para iniciar a tradução.',
    expectedResult: 'BUG - START ausente',
    expectedProtein: 'NÃO GERADA',
    sequence: 'm7GpppCCGCCGCUAAACCGUAAGG' + 'A'.repeat(100),
  },
  {
    id: 4,
    name: '14.4 BUG - STOP ausente',
    description: 'Existe AUG, mas não há códon STOP (UAA, UAG, UGA) para encerrar a tradução.',
    expectedResult: 'BUG - STOP ausente',
    expectedProtein: 'NÃO GERADA',
    sequence: 'm7GpppCCAUGGCUAAACCGGGCGG' + 'A'.repeat(100),
  },
  {
    id: 5,
    name: '14.5 BUG - quadro de leitura',
    description: 'Inserção de nucleotídeo (frameshift); o STOP ficou fora da fase de leitura em trincas.',
    expectedResult: 'BUG - quadro de leitura',
    expectedProtein: 'NÃO GERADA',
    sequence: 'm7GpppCCAUGGCUAAAACCGUAAGG' + 'A'.repeat(100),
  },
  {
    id: 6,
    name: '14.6 BUG - cauda poli -A',
    description: 'A cauda poli-A possui 80 adeninas ao invés das 100 exigidas pela especificação.',
    expectedResult: 'BUG - cauda poli -A',
    expectedProtein: 'NÃO GERADA',
    sequence: 'm7GpppCCAUGGCUAAACCGUAAGG' + 'A'.repeat(80),
  },
];

export function analyzeMrna(line: string, entryNumber: number = 1): RibosomeAnalysis {
  const raw = line.trim();

  // Initial placeholders
  let status: 'OK' | 'ERRO' = 'OK';
  let result: TranslationResult = 'CORRETO';
  let protein = 'NÃO GERADA';
  const aminoAcids: string[] = [];
  const codons: CodonDetail[] = [];

  let cap5Valid = false;
  let cap5Found = '';
  let startValid = false;
  const startCodon = 'AUG';
  let startIndex = -1;
  let readingFrameValid = false;
  let stopValid = false;
  let stopCodon = '';
  let stopIndex = -1;
  let polyAValid = false;
  let polyALength = 0;
  let translationValid = false;

  let utr5 = '';
  let codingRna = '';
  let utr3 = '';
  let polyATail = '';
  let diagnosticSummary = '';
  let didacticExplanation = '';
  let biologicalContext = '';

  // 1. Validar CAP 5' (exatamente m7Gppp no início)
  if (raw.startsWith('m7Gppp')) {
    cap5Valid = true;
    cap5Found = 'm7Gppp';
  } else {
    // Check if there is another prefix
    const match = raw.match(/^[a-zA-Z0-9_]+/);
    cap5Found = match ? match[0].slice(0, 10) : 'Ausente';
    status = 'ERRO';
    result = "BUG - CAP 5'";
    diagnosticSummary = "A extremidade 5' não possui a representação obrigatória m7Gppp.";
    didacticExplanation = "Nos eucariotos, o CAP 5' (7-metilguanosina trifosfato) é adicionado durante a transcrição. Ele é indispensável para que o ribossomo (subunidade 40S/eIFs) reconheça o início do RNA mensageiro e protege contra a degradação rápida por exonucleases.";
    biologicalContext = "Sem o CAP 5', o complexo de pré-iniciação ribossômico não consegue ancorar na fita de mRNA.";
    return {
      entryNumber,
      rawSequence: raw,
      status,
      result,
      protein,
      aminoAcids,
      cap5Valid,
      cap5Found,
      startValid,
      startCodon: '',
      startIndex,
      readingFrameValid,
      stopValid,
      stopCodon: '',
      stopIndex,
      polyAValid,
      polyALength,
      translationValid,
      utr5: '',
      codingRna: '',
      utr3: '',
      polyATail: '',
      codons,
      diagnosticSummary,
      didacticExplanation,
      biologicalContext,
    };
  }

  // Strip CAP 5'
  const afterCap = raw.slice(6); // remove 'm7Gppp'

  // 2. Validar cauda poli-A (exatamente 100 adeninas na extremidade 3')
  // We identify consecutive trailing 'A's
  const polyAMatch = afterCap.match(/A+$/);
  const trailingACount = polyAMatch ? polyAMatch[0].length : 0;
  polyALength = trailingACount;

  if (trailingACount === 100) {
    polyAValid = true;
    polyATail = afterCap.slice(-100);
  } else {
    status = 'ERRO';
    result = 'BUG - cauda poli -A';
    diagnosticSummary = `Cauda poli-A inválida: encontrada extremidade com ${trailingACount} adeninas (A), quando são exigidas exatamente 100 A.`;
    didacticExplanation = "A cauda poli-A é adicionada pela poli-A polimerase na extremidade 3'. Ela confere estabilidade ao transcrito e atua como um 'relógio biológico' da molécula de mRNA, além de facilitar a exportação do núcleo e o término da tradução.";
    biologicalContext = "Sem a cauda poli-A canônica (100 A), o mRNA pode ser instável, suscetível a ataque de nucleases 3'->5' ou mal processado.";
    return {
      entryNumber,
      rawSequence: raw,
      status,
      result,
      protein,
      aminoAcids,
      cap5Valid,
      cap5Found,
      startValid,
      startCodon: '',
      startIndex,
      readingFrameValid,
      stopValid,
      stopCodon: '',
      stopIndex,
      polyAValid,
      polyALength,
      translationValid,
      utr5: '',
      codingRna: '',
      utr3: '',
      polyATail: polyAMatch ? polyAMatch[0] : '',
      codons,
      diagnosticSummary,
      didacticExplanation,
      biologicalContext,
    };
  }

  // Core sequence between CAP and Poly-A (100 As)
  const coreRna = afterCap.slice(0, -100);

  // 3. Localizar START códon (AUG)
  const augPos = coreRna.indexOf('AUG');
  if (augPos === -1) {
    status = 'ERRO';
    result = 'BUG - START ausente';
    diagnosticSummary = "Nenhum códon de iniciação 'AUG' foi encontrado na região intermediária do mRNA maduro.";
    didacticExplanation = "O ribossomo necessita de um sinal inequívoco para iniciar a síntese proteica. Esse sinal universal é o códon AUG, decodificado por um tRNA especial carregando Metionina (Met). Na ausência de AUG, o ribossomo percorre a sequência sem iniciar a cadeia.";
    biologicalContext = "Mutação no códon iniciador impede a montagem do sítio P e o início do alongamento polipeptídico.";
    return {
      entryNumber,
      rawSequence: raw,
      status,
      result,
      protein,
      aminoAcids,
      cap5Valid,
      cap5Found,
      startValid: false,
      startCodon: 'AUG',
      startIndex: -1,
      readingFrameValid,
      stopValid,
      stopCodon: '',
      stopIndex,
      polyAValid,
      polyALength,
      translationValid,
      utr5: coreRna,
      codingRna: '',
      utr3: '',
      polyATail,
      codons,
      diagnosticSummary,
      didacticExplanation,
      biologicalContext,
    };
  }

  startValid = true;
  startIndex = augPos;
  utr5 = coreRna.slice(0, augPos);

  // 4. Ler códons em trincas a partir de AUG
  const rnaFromAug = coreRna.slice(augPos);
  const foundCodons: string[] = [];
  let inFrameStopCodon = '';
  let inFrameStopPos = -1;

  for (let i = 0; i < rnaFromAug.length; i += 3) {
    const triplet = rnaFromAug.slice(i, i + 3);
    if (triplet.length === 3) {
      foundCodons.push(triplet);
      if (STOP_CODONS.has(triplet)) {
        inFrameStopCodon = triplet;
        inFrameStopPos = augPos + i;
        break;
      }
    }
  }

  // Verificamos se foi encontrado um STOP em fase
  if (inFrameStopCodon) {
    stopValid = true;
    stopCodon = inFrameStopCodon;
    stopIndex = inFrameStopPos;
    readingFrameValid = true;
    translationValid = true;

    // Traduzir os códons até o STOP (AUG inclusive, STOP exclusivo)
    const translatedAAs: string[] = [];
    for (let i = 0; i < foundCodons.length; i++) {
      const c = foundCodons[i];
      const aa = GENETIC_CODE[c] || '???';
      const isStop = STOP_CODONS.has(c);
      const isStart = i === 0 && c === 'AUG';

      codons.push({
        codon: c,
        aminoAcid: aa,
        name: AMINO_ACID_MAP[aa]?.namePt || aa,
        fullSeqPos: augPos + i * 3,
        inFrame: true,
        type: isStart ? 'start' : isStop ? 'stop' : 'sense',
        color: AMINO_ACID_MAP[aa]?.color || '#94a3b8',
      });

      if (!isStop) {
        translatedAAs.push(aa);
      }
    }

    aminoAcids.push(...translatedAAs);
    protein = translatedAAs.join('-');
    codingRna = coreRna.slice(augPos, inFrameStopPos + 3);
    utr3 = coreRna.slice(inFrameStopPos + 3);

    status = 'OK';
    result = 'CORRETO';
    diagnosticSummary = `Tradução concluída com sucesso! Proteína gerada com ${translatedAAs.length} aminoácidos (${protein}).`;
    didacticExplanation = `O ribossomo identificou a 5' UTR (${utr5.length} nt), iniciou no códon AUG (${startCodon}), leu ${foundCodons.length - 1} trincas em fase, encontrou o sinal de parada ${stopCodon} e finalizou na 3' UTR antes da cauda poli-A.`;
    biologicalContext = "Expressão gênica perfeita: a proteína funcional foi sintetizada sem anomalias conformacionais ou mutações deletérias.";
  } else {
    // STOP NÃO encontrado em fase!
    // Verificar se existe algum STOP codon (UAA, UAG, UGA) fora de fase após o AUG
    // ou se a sequência sofreu frameshift (inserção/deleção)
    let anyOutOfFrameStop = false;
    let outOfFrameStopCodon = '';

    for (const stop of ['UAA', 'UAG', 'UGA']) {
      const idx = rnaFromAug.indexOf(stop);
      if (idx !== -1) {
        anyOutOfFrameStop = true;
        outOfFrameStopCodon = stop;
        break;
      }
    }

    status = 'ERRO';
    stopValid = false;

    if (anyOutOfFrameStop) {
      // Caso 14.5: BUG - quadro de leitura
      result = 'BUG - quadro de leitura';
      readingFrameValid = false;
      diagnosticSummary = `Erro de matriz de leitura: o códon de parada (${outOfFrameStopCodon}) existe na sequência, mas está fora da fase de leitura em trincas (frameshift).`;
      didacticExplanation = "A leitura do ribossomo é estritamente não sobreposta e ocorre em trincas (quadro de leitura). Se houver inserção ou deleção de bases em número não múltiplo de 3, toda a fase é deslocada, fazendo com que o STOP não seja lido corretamente.";
      biologicalContext = "Mutações frameshift costumam ser catastróficas, gerando proteínas aberrantes ou degradação pelo mecanismo de vigilância do mRNA (NMD).";
    } else {
      // Caso 14.4: BUG - STOP ausente
      result = 'BUG - STOP ausente';
      readingFrameValid = false;
      diagnosticSummary = "Nenhum códon de parada (UAA, UAG ou UGA) foi encontrado na sequência após o AUG.";
      didacticExplanation = "A terminação requer o reconhecimento de um códon de parada pelos fatores de liberação (eRF1/eRF3). Sem STOP, o ribossomo continua traduzindo indefinidamente até 'emperrar' na cauda poli-A, disparando o mecanismo de Non-Stop Decay.";
      biologicalContext = "A ausência de sinal de parada impede o término regulado e a liberação da cadeia polipeptídica no citoplasma.";
    }

    // Registra códons que foram lidos até onde deu
    for (let i = 0; i < foundCodons.length; i++) {
      const c = foundCodons[i];
      const aa = GENETIC_CODE[c] || '???';
      codons.push({
        codon: c,
        aminoAcid: aa,
        name: AMINO_ACID_MAP[aa]?.namePt || aa,
        fullSeqPos: augPos + i * 3,
        inFrame: false,
        type: i === 0 ? 'start' : 'sense',
        color: AMINO_ACID_MAP[aa]?.color || '#94a3b8',
      });
    }

    codingRna = coreRna.slice(augPos);
  }

  return {
    entryNumber,
    rawSequence: raw,
    status,
    result,
    protein,
    aminoAcids,
    cap5Valid,
    cap5Found,
    startValid,
    startCodon: startValid ? 'AUG' : '',
    startIndex,
    readingFrameValid,
    stopValid,
    stopCodon,
    stopIndex,
    polyAValid,
    polyALength,
    translationValid,
    utr5,
    codingRna,
    utr3,
    polyATail,
    codons,
    diagnosticSummary,
    didacticExplanation,
    biologicalContext,
  };
}

export function generateExportContent(analyses: RibosomeAnalysis[]): string {
  const lines: string[] = ['linha;status;resultado;proteina'];
  for (const a of analyses) {
    lines.push(`${a.entryNumber};${a.status};${a.result};${a.protein}`);
  }
  return lines.join('\n');
}

export function generateScreenReport(analysis: RibosomeAnalysis): string {
  if (analysis.status === 'OK') {
    return [
      '========================================',
      'RIBOSSOMO - PROTEIN TRANSLATOR',
      '========================================',
      `ENTRADA: ${analysis.entryNumber}`,
      `STATUS: ${analysis.status === 'OK' ? 'CORRETO' : 'ERRO'}`,
      `CAP 5': ${analysis.cap5Valid ? 'OK' : 'ERRO'}`,
      `START: ${analysis.startValid ? `${analysis.startCodon} - OK` : 'ERRO'}`,
      `Quadro de leitura: ${analysis.readingFrameValid ? 'OK' : 'ERRO'}`,
      `STOP: ${analysis.stopValid ? `${analysis.stopCodon} - OK` : 'ERRO'}`,
      `Cauda poli -A: ${analysis.polyALength} A - OK`,
      `Tradução: OK`,
      `PROTEÍNA: ${analysis.protein}`,
      '----------------------------------------',
    ].join('\n');
  } else {
    return [
      '========================================',
      'RIBOSSOMO - PROTEIN TRANSLATOR',
      '========================================',
      `ENTRADA: ${analysis.entryNumber}`,
      `STATUS: ERRO`,
      `TIPO: ${analysis.result}`,
      `PROTEÍNA: NÃO GERADA`,
      '----------------------------------------',
    ].join('\n');
  }
}
