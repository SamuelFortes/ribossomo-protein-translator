import { Dna, Server, Cpu, Code2 } from 'lucide-react';
import type { ProcessingMode } from '../types';

interface HeaderProps {
  mode: ProcessingMode;
  onModeChange: (mode: ProcessingMode) => void;
  onOpenContract: () => void;
  backendWarning?: string | null;
}

export default function Header({ mode, onModeChange, onOpenContract, backendWarning }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="glow-cyan flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600">
            <Dna size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-100 sm:text-base">
              RIBOSSOMO <span className="text-cyan-400">·</span> Protein Translator
            </h1>
            <p className="text-[10px] text-slate-500">Tradutor didático de mRNA para proteínas · Especificação 1.0</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/60 p-0.5 text-[11px]">
            <button
              onClick={() => onModeChange('client')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                mode === 'client' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu size={13} />
              Simulação Local
            </button>
            <button
              onClick={() => onModeChange('python_backend')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                mode === 'python_backend' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server size={13} />
              Python API
            </button>
          </div>

          <button
            onClick={onOpenContract}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            <Code2 size={13} />
            Contrato API
          </button>
        </div>
      </div>
      {backendWarning && (
        <div className="border-t border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-center text-[11px] text-amber-300">
          {backendWarning}
        </div>
      )}
    </header>
  );
}
