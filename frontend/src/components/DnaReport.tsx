import { CheckCircle2, XCircle, AlertTriangle, BookOpen } from 'lucide-react';
import type { DnaAnalysis } from '../types';
import SequenceRuler from './SequenceRuler';
import CopyButton from './CopyButton';

interface DnaReportProps {
  analysis: DnaAnalysis;
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200/60 py-1.5 text-xs last:border-0 dark:border-slate-800/60">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`flex items-center gap-1.5 font-mono font-semibold ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
        {detail ?? (ok ? 'OK' : 'ERRO')}
      </span>
    </div>
  );
}

const STATUS_STYLES: Record<DnaAnalysis['status'], { border: string; bg: string; text: string; badge: string }> = {
  CORRETO: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5 glow-emerald',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  },
  ERRO: {
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5 glow-rose',
    text: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
  },
};

function renderSequenceStrip(analysis: DnaAnalysis) {
  const { cleanSequence, invalidBasePosition, startIndex, stopIndex, valid } = analysis;

  return (
    <div className="flex flex-col gap-2">
      <SequenceRuler
        sequence={cleanSequence}
        invalidBasePosition={invalidBasePosition}
        startIndex={startIndex}
        stopIndex={stopIndex}
        valid={valid}
      />
      {startIndex < 0 && (
        <span className="w-fit rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-700 dark:text-rose-300">START ausente</span>
      )}
      {startIndex >= 0 && stopIndex < 0 && (
        <span className="w-fit rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-700 dark:text-rose-300">STOP ausente</span>
      )}
    </div>
  );
}

export default function DnaReport({ analysis }: DnaReportProps) {
  const style = STATUS_STYLES[analysis.status];

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-2xl border p-4 ${style.border} ${style.bg}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
            BIOCOMPILER 1.0 · DNA TRANSCRIBER — Entrada {analysis.entryNumber}
          </h2>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
            {analysis.status}
          </span>
        </div>

        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-100/60 p-2.5 dark:border-slate-800 dark:bg-slate-950/50">{renderSequenceStrip(analysis)}</div>

        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <div>
            <StatusRow label="Sequência válida" ok={!analysis.invalidBase} />
            <StatusRow label="START" ok={analysis.startValid} detail={analysis.startValid ? 'ATG - OK' : 'ERRO'} />
          </div>
          <div>
            <StatusRow label="STOP" ok={analysis.stopValid} detail={analysis.stopValid ? `${analysis.stopCodon} - OK` : 'ERRO'} />
            <StatusRow label="Transcrição" ok={analysis.valid} />
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-slate-100/70 p-3 dark:bg-slate-950/60">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Tipo</div>
          <div className={`mt-1 text-sm font-semibold ${style.text}`}>{analysis.resultLabel}</div>
        </div>

        <div className="mt-3 rounded-lg bg-slate-100/70 p-3 dark:bg-slate-950/60">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">pré-mRNA</div>
            {analysis.valid && <CopyButton text={analysis.preMrna} label="Copiar pré-mRNA" />}
          </div>
          <div className={`mt-1 break-all font-mono text-sm font-bold ${analysis.valid ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>
            {analysis.preMrna}
          </div>
        </div>
      </div>

      {!analysis.valid && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-100/50 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
          <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle size={16} />
            <h3 className="text-sm font-semibold">Diagnóstico</h3>
          </div>
          <p className="mb-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{analysis.diagnosticSummary}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-100/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mb-2 flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <BookOpen size={16} className="text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-sm font-semibold">Explicação Didática</h3>
        </div>
        <p className="mb-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{analysis.didacticExplanation}</p>
        <p className="text-xs italic leading-relaxed text-slate-500">{analysis.biologicalContext}</p>
      </div>
    </div>
  );
}
