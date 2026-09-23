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
