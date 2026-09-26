export type TranslationStatus = 'OK' | 'ERRO';

export type TranslationResult =
  | 'CORRETO'
  | "BUG - CAP 5'"
  | 'BUG - START ausente'
  | 'BUG - STOP ausente'
  | 'BUG - quadro de leitura'
  | 'BUG - cauda poli -A';

export interface CodonDetail {
  codon: string;
  aminoAcid: string;
  name: string;
  fullSeqPos: number;
  inFrame: boolean;
  type: 'start' | 'sense' | 'stop';
  color: string;
}

export interface RibosomeAnalysis {
  entryNumber: number;
  rawSequence: string;
  status: TranslationStatus;
  result: TranslationResult;
  protein: string; // e.g. "Met-Ala-Lys-Pro" or "NÃO GERADA"
  aminoAcids: string[]; // ["Met", "Ala", "Lys", "Pro"]

  // Specific check statuses
  cap5Valid: boolean;
  cap5Found: string;

  startValid: boolean;
  startCodon: string;
  startIndex: number; // in sequence after cap

  readingFrameValid: boolean;

  stopValid: boolean;
  stopCodon: string;
  stopIndex: number;

  polyAValid: boolean;
  polyALength: number;

  translationValid: boolean;

  // Sequence parts for didactic breakdown
  utr5: string;
  codingRna: string;
  utr3: string;
  polyATail: string;

  codons: CodonDetail[];

  // Diagnostic and educational explanation
  diagnosticSummary: string;
  didacticExplanation: string;
  biologicalContext: string;
}

export interface AminoAcidInfo {
  code3: string;
  code1: string;
  namePt: string;
  nameEn: string;
  property: 'hydrophobic' | 'polar' | 'positive' | 'negative' | 'special' | 'stop';
  color: string;
}

export type ProcessingMode = 'client' | 'python_backend';

/**
 * Fases do pipeline biológico simulado pelo produto.
 * 'dna' = BioCompiler 1.0, 'rna' = BioCompiler 2.0, 'ribosome' = já existente,
 * 'pipeline' = execução encadeada das três fases.
 */
export type Phase = 'dna' | 'rna' | 'ribosome' | 'pipeline';

// ---------------------------------------------------------------------------
// Fase I — BioCompiler 1.0 (DNA -> validação -> transcrição -> pré-mRNA)
// ---------------------------------------------------------------------------

/**
 * Status binário da seção 9 ("Saída padrão para a tela") do PDF oficial mais
 * novo (Especificações do BioCompiler 1.0 e slides.pdf): STATUS: CORRETO ou
 * STATUS: ERRO. Substitui o antigo par APROVADO/ALERTA (ver dnaEngine.ts).
 */
export type DnaStatus = 'CORRETO' | 'ERRO';

/**
 * Texto literal da coluna "Resposta esperada" da seção 8 do PDF oficial mais
 * novo, reproduzido exatamente como definido na especificação (usado também
 * na saída em tela como TIPO e na exportação como "resultado").
 */
export type DnaResultLabel =
  | 'CORRETO'
  | 'BUG - base inválida'
  | 'BUG - START ausente'
  | 'BUG - STOP ausente'
  | 'BUG - frameshift'
  | 'BUG - nonsense / STOP prematuro';

/**
 * Rótulo interno do caso de classificação (nomes das seções "CASO N" do PDF,
 * usado para dispatch/estilização na UI). Não é uma string oficial exigida
 * literalmente pelo PDF — apenas o par (DnaStatus, detail) o é.
 */
export type DnaCase =
  | 'CORRETO'
  | 'BASE_INVALIDA'
  | 'START_AUSENTE'
  | 'STOP_AUSENTE'
  | 'FRAMESHIFT'
  | 'NONSENSE';

export interface DnaAnalysis {
  entryNumber: number;
  rawSequence: string;
  cleanSequence: string;

  status: DnaStatus;
  dnaCase: DnaCase;
  /** Texto literal da coluna "Resposta esperada" (seção 8) / TIPO (seção 14). */
  resultLabel: DnaResultLabel;
  /** Mantido por compatibilidade; sempre igual a resultLabel. */
  detail: string;
  valid: boolean; // true somente quando status === 'CORRETO'

  invalidBase: string; // base inválida encontrada, ou '' se nao aplicavel
  invalidBasePosition: number; // 1-indexed, -1 se nao aplicavel

  startValid: boolean;
  startIndex: number; // 0-indexed, -1 se ausente
  stopValid: boolean;
  stopCodon: string;
  stopIndex: number; // 0-indexed, -1 se ausente
  codonCount: number;

  cdsDna: string; // trecho START..STOP (inclusive) quando válido
  preMrna: string; // sequência inteira transcrita (T->U), ou 'NÃO GERADO'

  diagnosticSummary: string;
  didacticExplanation: string;
  biologicalContext: string;
}

// ---------------------------------------------------------------------------
// Fase II — BioCompiler 2.0 (pré-mRNA -> splicing -> CAP 5' -> poli-A -> mRNA maduro)
// ---------------------------------------------------------------------------

/** As 4 saídas oficiais listadas na seção 8 do PDF BioCompiler 2.0. */
export type RnaOfficialResult =
  | 'CORRETO'
  | "BUG - sítio 5' ausente"
  | "BUG - sítio 3' ausente"
  | 'BUG - branch point';

/**
 * Inclui, além das 4 saídas oficiais, uma guarda defensiva para entradas com
 * caracteres fora do alfabeto {A,U,C,G}. O PDF não lista esse 5º caso — ele é
 * mantido apenas como validação de entrada, nunca como diagnóstico oficial
 * (ver divergência registrada em rnaEngine.ts).
 */
export type RnaResult = RnaOfficialResult | 'ENTRADA INVÁLIDA (guarda defensiva)';

export interface RnaIntronDetail {
  start: number; // posição do 'G' de GU
  end: number; // posição logo após o 'G' final de AG
  branchPos: number;
  branchDistance: number; // agPos - branchPos
  sequence: string; // trecho GU...AG removido
}

export interface RnaAnalysis {
  entryNumber: number;
  rawSequence: string;
  cleanSequence: string;

  status: TranslationStatus; // 'OK' | 'ERRO', mesma convenção da Fase III
  result: RnaResult;
  /** false somente para a guarda defensiva de base inválida (não é um diagnóstico oficial do PDF). */
  isOfficialDiagnostic: boolean;
  valid: boolean;

  site5Valid: boolean;
  site3Valid: boolean;
  branchPointValid: boolean;
  splicingValid: boolean;

  introns: RnaIntronDetail[];
  splicedSequence: string;

  cap5Added: boolean;
  polyATailLength: number;
  matureMrna: string; // m7Gppp + éxons unidos + 100 A's, ou 'NÃO GERADO'

  errorLocation: string;
  errorSnippet: string;

  diagnosticSummary: string;
  didacticExplanation: string;
  biologicalContext: string;
}

// ---------------------------------------------------------------------------
// Pipeline — encadeia dna -> rna -> ribosome
// ---------------------------------------------------------------------------

export interface PipelineAnalysis {
  entryNumber: number;
  rawSequence: string; // DNA de entrada original

  dna: DnaAnalysis;
  rna: RnaAnalysis | null; // null se a Fase I falhou
  ribosome: RibosomeAnalysis | null; // null se a Fase I ou II falhou

  success: boolean; // true somente se as 3 fases concluíram com sucesso
  stoppedAtPhase: Exclude<Phase, 'pipeline'> | null; // fase em que a pipeline parou, ou null se completou
  stopReason: string; // explicação legível de por que parou, ou '' se success
}
