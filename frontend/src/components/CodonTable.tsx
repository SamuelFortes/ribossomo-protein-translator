import { GENETIC_CODE, AMINO_ACID_MAP } from '../utils/geneticCode';
import { useTheme } from './useTheme';

interface CodonTableProps {
  activeCodon?: string;
}

const BASES = ['U', 'C', 'A', 'G'];

export default function CodonTable({ activeCodon }: CodonTableProps) {
  const { theme } = useTheme();

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Tabela do Código Genético (64 códons)</h3>

      {/* Layout clássico de tabela do código genético: 1ª base = bloco (linha x coluna), 3ª base = empilhada dentro do bloco.
          Evita a antiga tabela de 16 colunas, que estourava horizontalmente em cards estreitos. */}
      <div className="grid grid-cols-4 gap-1.5">
        {BASES.map((first) =>
          BASES.map((second) => (
            <div
              key={`${first}${second}`}
              className="flex flex-col gap-0.5 rounded-lg border border-slate-200/70 bg-white/40 p-1 dark:border-slate-800/70 dark:bg-slate-950/30"
            >
              {BASES.map((third) => {
                const codon = `${first}${second}${third}`;
                const aa = GENETIC_CODE[codon];
                const info = aa ? AMINO_ACID_MAP[aa] : undefined;
                const isActive = activeCodon === codon;
                const textColor = info
                  ? theme === 'light'
                    ? `color-mix(in srgb, ${info.color} 60%, black)`
                    : info.color
                  : 'inherit';

                return (
                  <div
                    key={codon}
                    className={`flex items-center justify-between gap-1 rounded px-1.5 py-0.5 transition ${
                      isActive ? 'scale-105 ring-2 ring-cyan-400' : ''
                    }`}
                    style={{
                      backgroundColor: info ? `${info.color}22` : 'color-mix(in srgb, currentColor 15%, transparent)',
                      color: textColor,
                      opacity: info ? 1 : 0.55,
                    }}
                    title={info ? `${info.namePt} (${info.nameEn})` : 'STOP'}
                  >
                    <span className="font-mono text-[11px] font-bold">{codon}</span>
                    <span className="text-[9px] opacity-80">{aa}</span>
                  </div>
                );
              })}
            </div>
          )),
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-500 dark:text-slate-400">
        <LegendDot color="#3b82f6" label="Hidrofóbico" />
        <LegendDot color="#06b6d4" label="Polar" />
        <LegendDot color="#8b5cf6" label="Positivo" />
        <LegendDot color="#ef4444" label="Negativo" />
        <LegendDot color="#f97316" label="Especial" />
        <LegendDot color="#f43f5e" label="STOP" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}
