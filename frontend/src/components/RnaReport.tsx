import { CheckCircle2, XCircle, AlertTriangle, BookOpen } from 'lucide-react';
import type { RnaAnalysis } from '../types';
import CopyButton from './CopyButton';

interface RnaReportProps {
  analysis: RnaAnalysis;
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

function renderSequenceStrip(analysis: RnaAnalysis) {
  const { rawSequence, introns } = analysis;

  if (introns.length === 0) {
    return <div className="break-all font-mono text-[11px] leading-relaxed text-slate-400">{rawSequence}</div>;
  }

  const parts: { text: string; isIntron: boolean }[] = [];
  let cursor = 0;
  for (const intron of introns) {
    if (intron.start > cursor) parts.push({ text: rawSequence.slice(cursor, intron.start), isIntron: false });
    parts.push({ text: rawSequence.slice(intron.start, intron.end), isIntron: true });
    cursor = intron.end;
  }
  if (cursor < rawSequence.length) parts.push({ text: rawSequence.slice(cursor), isIntron: false });

  return (
    <div className="break-all font-mono text-[11px] leading-relaxed">
      {parts.map((p, i) =>
        p.isIntron ? (
          <span key={i} className="rounded bg-rose-500/20 px-0.5 text-rose-300" title="Íntron (GU...A...AG) — removido">
            {p.text}
          </span>
        ) : (
          <span key={i} className="text-emerald-300" title="Éxon">
            {p.text}
          </span>
        ),
      )}
    </div>
  );
}

export default function RnaReport({ analysis }: RnaReportProps) {
  const isOk = analysis.status === 'OK';

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-2xl border p-4 ${
          isOk ? 'border-emerald-500/30 bg-emerald-500/5 glow-emerald' : 'border-rose-500/30 bg-rose-500/5 glow-rose'
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-slate-400">
            BIOCOMPILER 2.0 · RNA PROCESSOR — Entrada {analysis.entryNumber}
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isOk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            {analysis.result}
          </span>
        </div>

        <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">{renderSequenceStrip(analysis)}</div>

        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <div>
            <StatusRow label="Sítio 5'" ok={analysis.site5Valid} />
            <StatusRow label="Branch point" ok={analysis.branchPointValid} />
          </div>
          <div>
            <StatusRow label="Sítio 3'" ok={analysis.site3Valid} />
            <StatusRow label="Splicing" ok={analysis.splicingValid} />
          </div>
        </div>
        <StatusRow label="CAP 5'" ok={analysis.cap5Added} detail={analysis.cap5Added ? 'ADICIONADA' : 'NÃO ADICIONADA'} />
        <StatusRow label="Cauda poli-A" ok={analysis.polyATailLength > 0} detail={`${analysis.polyATailLength} A`} />

        <div className="mt-3 rounded-lg bg-slate-950/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">mRNA maduro</div>
            {isOk && <CopyButton text={analysis.matureMrna} label="Copiar mRNA maduro" />}
          </div>
          <div className={`mt-1 break-all font-mono text-sm font-bold ${isOk ? 'text-emerald-300' : 'text-rose-400'}`}>
            {analysis.matureMrna}
          </div>
        </div>
      </div>

      {!isOk && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-300">
            <AlertTriangle size={16} />
            <h3 className="text-sm font-semibold">Diagnóstico do Bug</h3>
          </div>
          <p className="mb-2 text-xs leading-relaxed text-slate-300">{analysis.diagnosticSummary}</p>
          {analysis.errorSnippet && (
            <p className="break-all font-mono text-[11px] text-rose-300">{analysis.errorSnippet}</p>
          )}
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
