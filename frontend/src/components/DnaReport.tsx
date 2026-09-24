import { CheckCircle2, XCircle, AlertTriangle, BookOpen } from 'lucide-react';
import type { DnaAnalysis } from '../types';

interface DnaReportProps {
  analysis: DnaAnalysis;
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/60 py-1.5 text-xs last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className={`flex items-center gap-1.5 font-mono font-semibold ${ok ? 'text-emerald-400' : 'text-rose-400'}`}>
        {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
        {detail ?? (ok ? 'OK' : 'ERRO')}
      </span>
    </div>
  );
}

const STATUS_STYLES: Record<DnaAnalysis['status'], { border: string; bg: string; text: string; badge: string }> = {
  APROVADO: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5 glow-emerald', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
  ERRO: { border: 'border-rose-500/30', bg: 'bg-rose-500/5 glow-rose', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300' },
  ALERTA: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300' },
};

function renderSequenceStrip(analysis: DnaAnalysis) {
  const { rawSequence, invalidBase, invalidBasePosition, startIndex, stopIndex, valid } = analysis;

  if (invalidBase && invalidBasePosition >= 0) {
    const idx = invalidBasePosition - 1;
    return (
      <div className="break-all font-mono text-[11px] leading-relaxed">
        <span className="text-slate-400">{rawSequence.slice(0, idx)}</span>
        <span className="rounded bg-rose-500/30 px-0.5 font-bold text-rose-300" title="Base inválida">
          {rawSequence[idx]}
        </span>
        <span className="text-slate-400">{rawSequence.slice(idx + 1)}</span>
      </div>
    );
  }

  if (startIndex < 0) {
    return (
      <div className="break-all font-mono text-[11px] leading-relaxed text-rose-400">
        {rawSequence}
        <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">START ausente</span>
      </div>
    );
  }

  const beforeStart = rawSequence.slice(0, startIndex);
  const stopEnd = stopIndex >= 0 ? stopIndex + 3 : rawSequence.length;
  const cds = rawSequence.slice(startIndex, valid ? stopEnd : rawSequence.length);
  const afterStop = stopIndex >= 0 ? rawSequence.slice(stopEnd) : '';

  return (
    <div className="break-all font-mono text-[11px] leading-relaxed">
      <span className="text-slate-500" title="Antes do START">{beforeStart}</span>
      <span
        className={`rounded px-0.5 ${valid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}
        title="Região codificadora (START..STOP)"
      >
        {cds}
      </span>
      {stopIndex < 0 && (
        <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">STOP ausente</span>
      )}
      <span className="text-slate-500" title="Após o STOP">{afterStop}</span>
    </div>
  );
}

export default function DnaReport({ analysis }: DnaReportProps) {
  const style = STATUS_STYLES[analysis.status];

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-2xl border p-4 ${style.border} ${style.bg}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-slate-400">
            BIOCOMPILER 1.0 · DNA TRANSCRIBER — Entrada {analysis.entryNumber}
          </h2>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
            {analysis.status}
          </span>
        </div>

        <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">{renderSequenceStrip(analysis)}</div>

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

        <div className="mt-3 rounded-lg bg-slate-950/60 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Detalhe</div>
          <div className={`mt-1 text-sm font-semibold ${style.text}`}>{analysis.detail}</div>
        </div>

        <div className="mt-3 rounded-lg bg-slate-950/60 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">pré-mRNA</div>
          <div className={`mt-1 break-all font-mono text-sm font-bold ${analysis.valid ? 'text-emerald-300' : 'text-rose-400'}`}>
            {analysis.preMrna}
          </div>
        </div>
      </div>

      {!analysis.valid && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-300">
            <AlertTriangle size={16} />
            <h3 className="text-sm font-semibold">Diagnóstico</h3>
          </div>
          <p className="mb-2 text-xs leading-relaxed text-slate-300">{analysis.diagnosticSummary}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-2 flex items-center gap-2 text-slate-200">
          <BookOpen size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold">Explicação Didática</h3>
        </div>
        <p className="mb-2 text-xs leading-relaxed text-slate-300">{analysis.didacticExplanation}</p>
        <p className="text-xs italic leading-relaxed text-slate-500">{analysis.biologicalContext}</p>
      </div>
    </div>
  );
}
