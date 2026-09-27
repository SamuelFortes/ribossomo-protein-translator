import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import RibosomeScene from './RibosomeScene';
import type { RibosomeAnalysis } from '../types';

interface RibosomePanelProps {
  analysis: RibosomeAnalysis | null;
}

const STEP_EXPLANATIONS: Record<string, string> = {
  start: 'O tRNA iniciador carregando Metionina reconhece o códon AUG no Sítio P, ancorado pelo complexo de pré-iniciação (eIFs).',
  sense: 'O tRNA correspondente entra no Sítio A, o ribossomo confere o pareamento com o mRNA, e a peptidil transferase forma a ligação peptídica. O tRNA então se move do Sítio A para o Sítio P (translocação), liberando o Sítio E.',
  stop: 'Um fator de liberação (eRF1/eRF3) reconhece o códon de parada no Sítio A, hidrolisando a ligação entre o tRNA e o polipeptídeo, liberando a proteína completa.',
};

export default function RibosomePanel({ analysis }: RibosomePanelProps) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<number | null>(null);

  const codons = analysis?.codons ?? [];
  const maxStep = Math.max(0, codons.length - 1);

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [analysis]);

  useEffect(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (playing && codons.length > 0) {
      intervalRef.current = window.setInterval(() => {
        setStep((s) => {
          if (s >= maxStep) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, 1100 / speed);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [playing, speed, codons.length, maxStep]);

  const currentCodon = codons[step];

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-950/60">
        {codons.length > 0 ? (
          <RibosomeScene codons={codons} currentStep={step} />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
            Nenhuma tradução em andamento. Carregue uma sequência com START válido para visualizar o
            ribossomo em ação.
          </div>
        )}

        {currentCodon && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-cyan-500/30 bg-white/80 px-3 py-2 backdrop-blur dark:bg-slate-950/80">
            <div className="text-[10px] uppercase tracking-widest text-cyan-700 dark:text-cyan-400">Códon atual</div>
            <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">{currentCodon.codon}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{currentCodon.name}</div>
          </div>
        )}
      </div>

      {codons.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/60 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <button
              onClick={() => setStep(0)}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              title="Reiniciar"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              title="Passo anterior"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="rounded-lg bg-cyan-500/90 p-2 text-slate-950 transition hover:bg-cyan-400"
              title={playing ? 'Pausar' : 'Reproduzir'}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => setStep((s) => Math.min(maxStep, s + 1))}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              title="Próximo passo"
            >
              <SkipForward size={16} />
            </button>

            <input
              type="range"
              min={0}
              max={maxStep}
              value={step}
              onChange={(e) => setStep(Number(e.target.value))}
              className="mx-2 min-w-[80px] flex-1 accent-cyan-500"
            />

            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`rounded-md px-2 py-1 font-mono transition ${
                    speed === s ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300' : 'hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {currentCodon && (
            <div className="rounded-xl border border-slate-200 bg-slate-100/60 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              <span className="mr-1 font-semibold text-emerald-600 dark:text-emerald-400">Passo {step + 1}/{codons.length}:</span>
              {STEP_EXPLANATIONS[currentCodon.type]}
            </div>
          )}
        </>
      )}
    </div>
  );
}
