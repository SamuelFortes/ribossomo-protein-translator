import type { ReactElement } from 'react';
import { CheckCircle2, XCircle, MinusCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import type { PipelineAnalysis, Phase } from '../types';

interface PipelineViewProps {
  analysis: PipelineAnalysis;
}

type StepState = 'success' | 'failed' | 'skipped';

interface Step {
  phase: Exclude<Phase, 'pipeline'>;
  title: string;
  artifactLabel: string;
  artifact: string;
  state: StepState;
}

function buildSteps(analysis: PipelineAnalysis): Step[] {
  const { dna, rna, ribosome, stoppedAtPhase } = analysis;

  const stateFor = (phase: Exclude<Phase, 'pipeline'>, ok: boolean): StepState => {
    if (stoppedAtPhase === phase) return 'failed';
    if (stoppedAtPhase !== null) {
      const order: Exclude<Phase, 'pipeline'>[] = ['dna', 'rna', 'ribosome'];
      if (order.indexOf(phase) > order.indexOf(stoppedAtPhase)) return 'skipped';
    }
    return ok ? 'success' : 'failed';
  };

  return [
    {
      phase: 'dna',
      title: 'BioCompiler 1.0 · DNA → pré-mRNA',
      artifactLabel: 'pré-mRNA',
      artifact: dna.preMrna,
      state: stateFor('dna', dna.valid),
    },
    {
      phase: 'rna',
      title: 'BioCompiler 2.0 · pré-mRNA → mRNA maduro',
      artifactLabel: 'mRNA maduro',
      artifact: rna?.matureMrna ?? 'NÃO GERADO',
      state: stateFor('rna', rna?.valid ?? false),
    },
    {
      phase: 'ribosome',
      title: 'Sr. Ribossomo · mRNA → proteína',
      artifactLabel: 'proteína',
      artifact: ribosome?.protein ?? 'NÃO GERADA',
      state: stateFor('ribosome', ribosome?.status === 'OK'),
    },
  ];
}

const STATE_STYLES: Record<StepState, { border: string; bg: string; icon: ReactElement; badge: string }> = {
  success: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    icon: <CheckCircle2 size={16} className="text-emerald-400" />,
    badge: 'bg-emerald-500/20 text-emerald-300',
  },
  failed: {
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5 glow-rose',
    icon: <XCircle size={16} className="text-rose-400" />,
    badge: 'bg-rose-500/20 text-rose-300',
  },
  skipped: {
    border: 'border-slate-800',
    bg: 'bg-slate-950/40',
    icon: <MinusCircle size={16} className="text-slate-600" />,
    badge: 'bg-slate-800 text-slate-500',
  },
};

const STATE_LABEL: Record<StepState, string> = {
  success: 'CONCLUÍDO',
  failed: 'FALHOU',
  skipped: 'NÃO EXECUTADO',
};

export default function PipelineView({ analysis }: PipelineViewProps) {
  const steps = buildSteps(analysis);

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-2xl border p-4 ${
          analysis.success ? 'border-emerald-500/30 bg-emerald-500/5 glow-emerald' : 'border-rose-500/30 bg-rose-500/5 glow-rose'
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-slate-400">
            PIPELINE COMPLETO — Entrada {analysis.entryNumber}
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              analysis.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            {analysis.success ? 'SUCESSO' : `PAROU EM ${analysis.stoppedAtPhase?.toUpperCase()}`}
          </span>
        </div>
        <div className="break-all rounded-lg border border-slate-800 bg-slate-950/50 p-2.5 font-mono text-[11px] text-slate-400">
          DNA: {analysis.rawSequence}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {steps.map((step, i) => {
          const style = STATE_STYLES[step.state];
          return (
            <div key={step.phase} className="flex flex-1 items-center gap-3">
              <div className={`flex flex-1 flex-col gap-2 rounded-2xl border p-3 ${style.border} ${style.bg}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                    {style.icon}
                    {step.title}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}>
                    {STATE_LABEL[step.state]}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{step.artifactLabel}</div>
                  <div
                    className={`mt-0.5 break-all font-mono text-xs font-semibold ${
                      step.state === 'success' ? 'text-emerald-300' : step.state === 'failed' ? 'text-rose-400' : 'text-slate-600'
                    }`}
                  >
                    {step.artifact}
                  </div>
                </div>
              </div>
              {i < steps.length - 1 && <ArrowRight size={16} className="hidden shrink-0 text-slate-700 sm:block" />}
            </div>
          );
        })}
      </div>

      {!analysis.success && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-300">
            <AlertTriangle size={16} />
            <h3 className="text-sm font-semibold">Motivo da parada</h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">{analysis.stopReason}</p>
        </div>
      )}
    </div>
  );
}
