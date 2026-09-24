import { Download, ListChecks } from 'lucide-react';
import type { PipelineAnalysis } from '../types';
import { generatePipelineExportContent } from '../utils/pipelineEngine';

interface PipelineBatchPanelProps {
  results: PipelineAnalysis[];
  onSelect: (index: number) => void;
  selectedIndex: number | null;
}

export default function PipelineBatchPanel({ results, onSelect, selectedIndex }: PipelineBatchPanelProps) {
  if (results.length === 0) return null;

  const total = results.length;
  const successful = results.filter((r) => r.success).length;
  const failed = total - successful;

  const handleDownload = () => {
    const content = generatePipelineExportContent(results);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resultados_pipeline.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <ListChecks size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold">Processamento em Lote</h3>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 transition hover:bg-cyan-500/10"
        >
          <Download size={13} />
          resultados.txt
        </button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-950/60 p-2">
          <div className="text-lg font-bold text-slate-100">{total}</div>
          <div className="text-[10px] uppercase text-slate-500">Total</div>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-2">
          <div className="text-lg font-bold text-emerald-400">{successful}</div>
          <div className="text-[10px] uppercase text-slate-500">Sucesso</div>
        </div>
        <div className="rounded-lg bg-rose-500/10 p-2">
          <div className="text-lg font-bold text-rose-400">{failed}</div>
          <div className="text-[10px] uppercase text-slate-500">Falha</div>
        </div>
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-left text-[11px] transition ${
              selectedIndex === i ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
            }`}
          >
            <span className="font-mono text-slate-400">#{r.entryNumber}</span>
            <span className={`truncate px-2 ${r.success ? 'text-emerald-400' : 'text-rose-400'}`}>
              {r.success ? 'SUCESSO' : `PAROU EM ${r.stoppedAtPhase?.toUpperCase()}`}
            </span>
            <span className="truncate font-mono text-slate-500">{r.ribosome?.protein ?? ''}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
