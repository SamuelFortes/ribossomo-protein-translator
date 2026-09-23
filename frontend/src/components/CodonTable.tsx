import { GENETIC_CODE, AMINO_ACID_MAP } from '../utils/geneticCode';

interface CodonTableProps {
  activeCodon?: string;
}

const BASES = ['U', 'C', 'A', 'G'];

export default function CodonTable({ activeCodon }: CodonTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">Tabela do Código Genético (64 códons)</h3>
      <table className="w-full min-w-[560px] border-separate border-spacing-1 text-center text-xs">
        <tbody>
          {BASES.map((first) => (
            <tr key={first}>
              {BASES.map((second) =>
                BASES.map((third) => {
                  const codon = `${first}${second}${third}`;
                  const aa = GENETIC_CODE[codon];
                  const info = aa ? AMINO_ACID_MAP[aa] : undefined;
                  const isActive = activeCodon === codon;
                  return (
                    <td key={codon} className="p-0">
                      <div
                        className={`flex flex-col items-center justify-center rounded-md px-1.5 py-1 transition ${
                          isActive
                            ? 'scale-110 ring-2 ring-cyan-400'
                            : ''
                        }`}
                        style={{
                          backgroundColor: info ? `${info.color}22` : '#1e293b55',
                          color: info?.color ?? '#94a3b8',
                        }}
                        title={info ? `${info.namePt} (${info.nameEn})` : 'STOP'}
                      >
                        <span className="font-mono font-bold">{codon}</span>
                        <span className="text-[9px] opacity-80">{aa}</span>
                      </div>
                    </td>
                  );
                }),
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-400">
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
