import { CheckCircle2, XCircle, AlertTriangle, BookOpen } from 'lucide-react';
import type { RibosomeAnalysis } from '../types';
import { NUCLEOTIDE_COLORS } from '../utils/geneticCode';
import CopyButton from './CopyButton';

interface AnalysisReportProps {
  analysis: RibosomeAnalysis;
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

function renderSequenceStrip(analysis: RibosomeAnalysis) {
  const { rawSequence, cap5Valid, utr5, codingRna, utr3, polyATail } = analysis;
  if (!cap5Valid) {
    return (
      <div className="break-all font-mono text-[11px] leading-relaxed text-rose-400">
        {rawSequence.slice(0, 60)}
        {rawSequence.length > 60 ? '…' : ''}
        <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">CAP 5' ausente/incorreta</span>
      </div>
    );
  }

  return (
    <div className="break-all font-mono text-[11px] leading-relaxed">
      <span className="rounded bg-purple-500/20 px-0.5 text-purple-300" title="CAP 5'">m7Gppp</span>
      <span className="text-slate-500" title="5' UTR">{utr5}</span>
      {codingRna ? (
        <span className="rounded bg-emerald-500/20 px-0.5 text-emerald-300" title="Região codificante (ORF)">
          {codingRna}
        </span>
      ) : (
        <span className="rounded bg-rose-500/20 px-0.5 text-rose-300" title="Sem AUG detectado">
          {'(sem ORF)'}
        </span>
      )}
      <span className="text-slate-500" title="3' UTR">{utr3}</span>
      {polyATail ? (
        <span
          className={`rounded px-0.5 ${
            analysis.polyAValid ? 'bg-cyan-500/20 text-cyan-300' : 'bg-rose-500/20 text-rose-300'
          }`}
          title="Cauda Poli-A"
        >
          {polyATail.length > 24 ? `${polyATail.slice(0, 24)}…(${polyATail.length}A)` : polyATail}
        </span>
      ) : null}
    </div>
  );
}

export default function AnalysisReport({ analysis }: AnalysisReportProps) {
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
            RIBOSSOMO · PROTEIN TRANSLATOR — Entrada {analysis.entryNumber}
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isOk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            {isOk ? 'CORRETO' : analysis.result}
          </span>
        </div>

        <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
          {renderSequenceStrip(analysis)}
        </div>

        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <div>
            <StatusRow label="CAP 5'" ok={analysis.cap5Valid} />
            <StatusRow label="START" ok={analysis.startValid} detail={analysis.startValid ? `${analysis.startCodon} - OK` : 'ERRO'} />
            <StatusRow label="Quadro de leitura" ok={analysis.readingFrameValid} />
          </div>
          <div>
            <StatusRow label="STOP" ok={analysis.stopValid} detail={analysis.stopValid ? `${analysis.stopCodon} - OK` : 'ERRO'} />
            <StatusRow label="Cauda poli -A" ok={analysis.polyAValid} detail={`${analysis.polyALength} A ${analysis.polyAValid ? '- OK' : '- ERRO'}`} />
            <StatusRow label="Tradução" ok={isOk} />
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-slate-950/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Proteína</div>
            {isOk && <CopyButton text={analysis.protein} label="Copiar proteína" />}
          </div>
          <div className={`mt-1 break-all font-mono text-sm font-bold ${isOk ? 'text-emerald-300' : 'text-rose-400'}`}>
            {analysis.protein}
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

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Legenda de nucleotídeos</h3>
        <div className="flex flex-wrap gap-2 text-[11px]">
          {Object.entries(NUCLEOTIDE_COLORS).map(([nt, info]) => (
            <span key={nt} className={`rounded border px-2 py-1 font-mono ${info.bg}`}>
              {nt} — {info.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
