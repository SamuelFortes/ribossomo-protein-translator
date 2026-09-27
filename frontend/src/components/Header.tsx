import { Dna, Server, Cpu, Code2, Workflow, Sun, Moon } from 'lucide-react';
import type { ProcessingMode, Phase } from '../types';
import { useTheme } from './useTheme';
import { useBackendHealth } from './useBackendHealth';

interface HeaderProps {
  mode: ProcessingMode;
  onModeChange: (mode: ProcessingMode) => void;
  phase: Phase;
  onPhaseChange: (phase: Phase) => void;
  onOpenContract: () => void;
  backendWarning?: string | null;
}

const PHASES: { id: Phase; label: string }[] = [
  { id: 'dna', label: 'Fase I: DNA' },
  { id: 'rna', label: 'Fase II: RNA' },
  { id: 'ribosome', label: 'Fase III: Ribossomo' },
  { id: 'pipeline', label: 'Pipeline' },
];

const HEALTH_STYLES: Record<string, string> = {
  checking: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  online: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  offline: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
};

const HEALTH_LABEL: Record<string, string> = {
  checking: 'Backend: verificando…',
  online: 'Backend: online',
  offline: 'Backend: offline',
};

export default function Header({ mode, onModeChange, phase, onPhaseChange, onOpenContract, backendWarning }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const backendHealth = useBackendHealth();

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="glow-cyan flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600">
            {phase === 'pipeline' ? <Workflow size={20} className="text-white" /> : <Dna size={20} className="text-white" />}
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-slate-100">
              BIOCOMPILER <span className="text-cyan-500 dark:text-cyan-400">·</span> Protein Translator
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-500">
              DNA → pré-mRNA → mRNA maduro → proteína · Fluxo educacional completo
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Selecionar fase do pipeline"
            className="flex flex-wrap items-center rounded-lg border border-slate-200 bg-slate-100/60 p-0.5 text-[11px] dark:border-slate-800 dark:bg-slate-900/60"
          >
            {PHASES.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={phase === p.id}
                aria-label={p.label}
                onClick={() => onPhaseChange(p.id)}
                className={`rounded-md px-2.5 py-1.5 font-semibold transition ${
                  phase === p.id
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100/60 p-0.5 text-[11px] dark:border-slate-800 dark:bg-slate-900/60">
            <button
              onClick={() => onModeChange('client')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                mode === 'client'
                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Cpu size={13} />
              Simulação Local
            </button>
            <button
              onClick={() => onModeChange('python_backend')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                mode === 'python_backend'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Server size={13} />
              Python API
            </button>
            {mode === 'python_backend' && (
              <span
                className={`mr-0.5 flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${HEALTH_STYLES[backendHealth]}`}
                title="Status do backend Python — vale apenas para a Fase III (Ribossomo), único endpoint real hoje"
                aria-label={HEALTH_LABEL[backendHealth]}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    backendHealth === 'online' ? 'bg-emerald-500' : backendHealth === 'offline' ? 'bg-rose-500' : 'bg-slate-400'
                  }`}
                  aria-hidden="true"
                />
                {HEALTH_LABEL[backendHealth]}
              </span>
            )}
          </div>

          <button
            onClick={onOpenContract}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
          >
            <Code2 size={13} />
            Contrato API
          </button>

          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="flex items-center justify-center rounded-lg border border-slate-300 p-2 text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
      {backendWarning && (
        <div className="border-t border-amber-300/60 bg-amber-100/70 px-4 py-1.5 text-center text-[11px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {backendWarning}
        </div>
      )}
    </header>
  );
}
