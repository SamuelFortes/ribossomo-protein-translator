import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, MinusCircle, Circle, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import type { PipelineAnalysis, Phase } from '../types';
import CopyButton from './CopyButton';
import { useMediaQuery } from './useMediaQuery';

interface PipelineViewProps {
  analysis: PipelineAnalysis;
}

type StepState = 'success' | 'failed' | 'skipped';
type CardVisualState = StepState | 'waiting' | 'processing';

interface Step {
  phase: Exclude<Phase, 'pipeline'>;
  title: string;
  artifactLabel: string;
  artifact: string;
  state: StepState;
}

const PROCESS_MS = 750;
const CONNECTOR_MS = 550;
const REVEAL_MS = 500;

const PROCESSING_LABEL: Record<Step['phase'], string> = {
  dna: 'Transcrevendo…',
  rna: 'Processando splicing…',
  ribosome: 'Traduzindo…',
};

const TRANSFORM_BADGE: Record<Step['phase'], string> = {
  dna: 'T → U',
  rna: "íntron removido · +CAP 5' · +poli-A",
  ribosome: 'AUG → proteína',
};

function buildSteps(analysis: PipelineAnalysis): Step[] {
  const { dna, rna, ribosome, stoppedAtPhase } = analysis;

  const stateFor = (phase: Step['phase'], ok: boolean): StepState => {
    if (stoppedAtPhase === phase) return 'failed';
    if (stoppedAtPhase !== null) {
      const order: Step['phase'][] = ['dna', 'rna', 'ribosome'];
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

const STATE_STYLES: Record<Exclude<CardVisualState, 'processing'>, { border: string; bg: string; icon: ReactElement; badge: string }> = {
  waiting: {
    border: 'border-slate-200 dark:border-slate-800',
    bg: 'bg-slate-100/40 dark:bg-slate-950/30',
    icon: <Circle size={16} className="text-slate-400 dark:text-slate-700" />,
    badge: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-600',
  },
  success: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    icon: <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />,
    badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  },
  failed: {
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5 glow-rose',
    icon: <XCircle size={16} className="text-rose-600 dark:text-rose-400" />,
    badge: 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
  },
  skipped: {
    border: 'border-slate-200 dark:border-slate-800',
    bg: 'bg-slate-100/50 dark:bg-slate-950/40',
    icon: <MinusCircle size={16} className="text-slate-400 dark:text-slate-600" />,
    badge: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
  },
};

const STATE_LABEL: Record<Exclude<CardVisualState, 'processing'>, string> = {
  waiting: 'AGUARDANDO',
  success: 'CONCLUÍDO',
  failed: 'FALHOU',
  skipped: 'NÃO EXECUTADO',
};

function RevealedArtifact({ text, colorClass, badge, instant }: { text: string; colorClass: string; badge?: string; instant: boolean }) {
  const [open, setOpen] = useState(instant);

  useEffect(() => {
    if (instant) return;
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, [instant]);

  return (
    <div
      className="mt-0.5 overflow-hidden transition-[clip-path,opacity] ease-out"
      style={{
        clipPath: open ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
        opacity: open ? 1 : 0,
        transitionDuration: `${instant ? 0 : REVEAL_MS}ms`,
      }}
    >
      <div className={`break-all font-mono text-xs font-semibold ${colorClass}`}>{text}</div>
      {badge && (
        <div className="mt-1 w-fit rounded border border-slate-300/60 bg-slate-100/60 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/60">
          {badge}
        </div>
      )}
    </div>
  );
}

function PipelineConnector({ filled, dotVisible, durationMs }: { filled: boolean; dotVisible: boolean; durationMs: number }) {
  return (
    <div className="flex items-center justify-center py-1 sm:flex-1 sm:px-2 sm:py-0" aria-hidden="true">
      <div className="relative h-8 w-1 shrink-0 overflow-hidden rounded-full bg-slate-200 sm:h-1 sm:w-full dark:bg-slate-800">
        <div
          data-filled={filled}
          className="absolute inset-0 origin-top scale-y-0 rounded-full bg-gradient-to-b from-cyan-500 to-emerald-400 transition-transform ease-linear data-[filled=true]:scale-y-100 sm:origin-left sm:scale-y-100 sm:scale-x-0 sm:bg-gradient-to-r sm:data-[filled=true]:scale-x-100"
          style={{ transitionDuration: `${durationMs}ms` }}
        />
        {dotVisible && <span className="pipeline-connector-dot" style={{ animationDuration: `${durationMs}ms` }} />}
      </div>
    </div>
  );
}

interface PipelineCardProps {
  step: Step;
  visualState: CardVisualState;
  isFinalSuccessCard: boolean;
  instant: boolean;
}

function PipelineCard({ step, visualState, isFinalSuccessCard, instant }: PipelineCardProps) {
  const isProcessing = visualState === 'processing';
  const style = isProcessing
    ? {
        border: 'border-cyan-500/40',
        bg: 'bg-cyan-500/5 animate-pulse',
        icon: <Loader2 size={16} className="animate-spin text-cyan-600 dark:text-cyan-300" />,
        badge: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
      }
    : STATE_STYLES[visualState];
  const label = isProcessing ? PROCESSING_LABEL[step.phase] : STATE_LABEL[visualState];
  const revealed = visualState === 'success' || visualState === 'failed';
  const dim = visualState === 'waiting' || visualState === 'skipped';

  return (
    <div
      className={`flex flex-1 flex-col gap-2 rounded-2xl border p-3 transition-[opacity,transform] duration-300 ${style.border} ${style.bg} ${
        dim ? 'opacity-50' : 'opacity-100'
      } ${visualState === 'failed' ? 'animate-pipeline-shake' : ''} ${isFinalSuccessCard ? 'animate-pipeline-pop glow-emerald' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          {style.icon}
          {step.title}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}>{label}</span>
      </div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">{step.artifactLabel}</div>
          {visualState === 'success' && <CopyButton text={step.artifact} label={`Copiar ${step.artifactLabel}`} />}
        </div>
        {revealed ? (
          <RevealedArtifact
            text={step.artifact}
            colorClass={visualState === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}
            badge={visualState === 'success' ? TRANSFORM_BADGE[step.phase] : undefined}
            instant={instant}
          />
        ) : (
          <div className="mt-0.5 font-mono text-xs text-slate-400 dark:text-slate-700">···</div>
        )}
      </div>
    </div>
  );
}

interface PipelineTimelineProps {
  analysis: PipelineAnalysis;
}

function PipelineTimeline({ analysis }: PipelineTimelineProps) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const steps = buildSteps(analysis);

  const [revealedCount, setRevealedCount] = useState(() => (prefersReducedMotion ? steps.length : 0));
  const [processingIndex, setProcessingIndex] = useState(-1);
  const confettiFired = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const timers: number[] = [];
    let t = 0;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.state === 'skipped') break;
      timers.push(window.setTimeout(() => setProcessingIndex(i), t));
      t += PROCESS_MS;
      timers.push(
        window.setTimeout(() => {
          setProcessingIndex(-1);
          setRevealedCount(i + 1);
        }, t),
      );
      if (step.state !== 'success') break;
      t += CONNECTOR_MS;
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (confettiFired.current || prefersReducedMotion) return;
    if (revealedCount === steps.length && analysis.success) {
      confettiFired.current = true;
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 }, colors: ['#10b981', '#22d3ee', '#a855f7'] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedCount]);

  return (
    <div className="flex flex-col gap-0 sm:flex-row sm:items-stretch">
      {steps.map((step, i) => {
        const visualState: CardVisualState = step.state === 'skipped' ? 'skipped' : i < revealedCount ? step.state : i === processingIndex ? 'processing' : 'waiting';
        const dotVisible = step.state === 'success' && i < revealedCount && revealedCount <= i + 1;
        return (
          <Fragment key={step.phase}>
            <PipelineCard
              step={step}
              visualState={visualState}
              isFinalSuccessCard={i === steps.length - 1 && visualState === 'success' && analysis.success}
              instant={prefersReducedMotion}
            />
            {i < steps.length - 1 && (
              <PipelineConnector filled={step.state === 'success' && i < revealedCount} dotVisible={dotVisible} durationMs={prefersReducedMotion ? 0 : CONNECTOR_MS} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export default function PipelineView({ analysis }: PipelineViewProps) {
  const [replayNonce, setReplayNonce] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-2xl border p-4 ${
          analysis.success ? 'border-emerald-500/30 bg-emerald-500/5 glow-emerald' : 'border-rose-500/30 bg-rose-500/5 glow-rose'
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
            PIPELINE COMPLETO — Entrada {analysis.entryNumber}
          </h2>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                analysis.success ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
              }`}
            >
              {analysis.success ? 'SUCESSO' : `PAROU EM ${analysis.stoppedAtPhase?.toUpperCase()}`}
            </span>
            <button
              onClick={() => setReplayNonce((n) => n + 1)}
              aria-label="Repetir animação"
              title="Repetir animação"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
        <div className="break-all rounded-lg border border-slate-200 bg-slate-100/60 p-2.5 font-mono text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
          DNA: {analysis.rawSequence}
        </div>
      </div>

      <PipelineTimeline key={`${analysis.entryNumber}::${analysis.rawSequence}::${replayNonce}`} analysis={analysis} />

      {!analysis.success && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-100/50 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
          <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle size={16} />
            <h3 className="text-sm font-semibold">Motivo da parada</h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{analysis.stopReason}</p>
        </div>
      )}
    </div>
  );
}
