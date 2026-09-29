import type { PipelineAnalysis } from '../types';
import { analyzeDna } from './dnaEngine';
import { analyzeRna } from './rnaEngine';
import { analyzeMrna } from './translatorEngine';

/**
 * Encadeia as 3 fases: dnaEngine (DNA -> pré-mRNA) -> rnaEngine (pré-mRNA ->
 * mRNA maduro) -> translatorEngine (mRNA maduro -> proteína, lógica
 * existente, não modificada). Para no primeiro estágio que falhar, reportando
 * em qual fase parou e por quê.
 */
export function analyzePipeline(dnaLine: string, entryNumber: number = 1): PipelineAnalysis {
  const dna = analyzeDna(dnaLine, entryNumber);

  if (!dna.valid) {
    return {
      entryNumber,
      rawSequence: dnaLine,
      dna,
      rna: null,
      ribosome: null,
      success: false,
      stoppedAtPhase: 'dna',
      stopReason: `Fase I (BioCompiler 1.0) falhou: ${dna.detail}`,
    };
  }

  const rna = analyzeRna(dna.preMrna, entryNumber);

  if (!rna.valid) {
    return {
      entryNumber,
      rawSequence: dnaLine,
      dna,
      rna,
      ribosome: null,
      success: false,
      stoppedAtPhase: 'rna',
      stopReason: `Fase II (BioCompiler 2.0) falhou: ${rna.result}`,
    };
  }

  const ribosome = analyzeMrna(rna.matureMrna, entryNumber);

  if (ribosome.status !== 'OK') {
    return {
      entryNumber,
      rawSequence: dnaLine,
      dna,
      rna,
      ribosome,
      success: false,
      stoppedAtPhase: 'ribosome',
      stopReason: `Fase III (Ribossomo) falhou: ${ribosome.result}`,
    };
  }

  return {
    entryNumber,
    rawSequence: dnaLine,
    dna,
    rna,
    ribosome,
    success: true,
    stoppedAtPhase: null,
    stopReason: '',
  };
}

const PHASE_LABELS: Record<NonNullable<PipelineAnalysis['stoppedAtPhase']>, string> = {
  dna: 'DNA',
  rna: 'RNA',
  ribosome: 'RIBOSSOMO',
};

export function pipelineStatusLabel(a: PipelineAnalysis): string {
  return a.stoppedAtPhase ? `PAROU EM ${PHASE_LABELS[a.stoppedAtPhase]}` : 'SUCESSO';
}

export function generatePipelineExportContent(analyses: PipelineAnalysis[]): string {
  const lines: string[] = ['linha;status;fase_parada;proteina'];
  for (const a of analyses) {
    const status = a.success ? 'OK' : 'ERRO';
    const phase = a.stoppedAtPhase ?? '-';
    const protein = a.ribosome?.protein ?? 'NÃO GERADA';
    lines.push(`${a.entryNumber};${status};${phase};${protein}`);
  }
  return lines.join('\n');
}
