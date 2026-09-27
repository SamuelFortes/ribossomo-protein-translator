import { Download, ListChecks } from 'lucide-react';
import type { RibosomeAnalysis } from '../types';
import { generateExportContent } from '../utils/translatorEngine';

interface BatchPanelProps {
  results: RibosomeAnalysis[];
  onSelect: (index: number) => void;
  selectedIndex: number | null;
}

export default function BatchPanel({ results, onSelect, selectedIndex }: BatchPanelProps) {
  if (results.length === 0) return null;

  const total = results.length;
  const successful = results.filter((r) => r.status === 'OK').length;
  const errors = total - successful;

  const errorsByType = results
    .filter((r) => r.status === 'ERRO')
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.result] = (acc[r.result] ?? 0) + 1;
      return acc;
    }, {});

  const handleDownload = () => {
    const content = generateExportContent(results);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resultados.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <ListChecks size={16} className="text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-sm font-semibold">Processamento em Lote</h3>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 px-3 py-1.5 text-[11px] font-semibold text-cyan-700 transition hover:bg-cyan-500/10 dark:text-cyan-300"
        >
          <Download size={13} />
          resultados.txt
        </button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-200/60 p-2 dark:bg-slate-950/60">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{total}</div>
          <div className="text-[10px] uppercase text-slate-500">Total</div>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-2">
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{successful}</div>
          <div className="text-[10px] uppercase text-slate-500">Sucesso</div>
        </div>
        <div className="rounded-lg bg-rose-500/10 p-2">
          <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{errors}</div>
          <div className="text-[10px] uppercase text-slate-500">Erros</div>
        </div>
      </div>

      {Object.keys(errorsByType).length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {Object.entries(errorsByType).map(([type, count]) => (
            <span key={type} className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-700 dark:text-rose-300">
              {type}: {count}
            </span>
          ))}
        </div>
      )}

      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-left text-[11px] transition ${
              selectedIndex === i
                ? 'border-cyan-500/50 bg-cyan-500/10'
                : 'border-slate-200 bg-slate-100/40 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700'
            }`}
          >
            <span className="font-mono text-slate-500 dark:text-slate-400">#{r.entryNumber}</span>
            <span className={`truncate px-2 ${r.status === 'OK' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {r.result}
            </span>
            <span className="truncate font-mono text-slate-500">{r.protein}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
