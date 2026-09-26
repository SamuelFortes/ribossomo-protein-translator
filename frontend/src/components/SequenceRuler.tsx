type Region = 'invalid' | 'nostart' | 'before' | 'cds' | 'cds-invalid' | 'after';

interface SequenceRulerProps {
  /** Sequência já normalizada (cleanSequence): sem espaços, maiúscula — mesma base usada pelos índices abaixo. */
  sequence: string;
  /** 1-based; -1 se não aplicável. */
  invalidBasePosition: number;
  /** 0-based; -1 se ausente. */
  startIndex: number;
  /** 0-based; -1 se ausente. */
  stopIndex: number;
  /** true somente quando a sequência inteira é válida (status CORRETO). */
  valid: boolean;
}

const REGION_LETTER: Record<Region, string> = {
  invalid: 'bg-rose-500/30 text-rose-300 font-bold ring-1 ring-rose-500/50',
  nostart: 'text-rose-400',
  before: 'text-slate-500',
  cds: 'bg-emerald-500/20 text-emerald-300 font-semibold',
  'cds-invalid': 'bg-amber-500/20 text-amber-300 font-semibold',
  after: 'text-slate-500',
};

const REGION_CHIP: Record<Region, string> = {
  invalid: 'border-rose-500/50 bg-rose-500/20 text-rose-300',
  nostart: 'border-rose-500/20 bg-rose-500/10 text-rose-400/80',
  before: 'border-slate-700/40 bg-slate-800/60 text-slate-600',
  cds: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  'cds-invalid': 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  after: 'border-slate-700/40 bg-slate-800/60 text-slate-600',
};

export default function SequenceRuler({
  sequence,
  invalidBasePosition,
  startIndex,
  stopIndex,
  valid,
}: SequenceRulerProps) {
  const invalidIdx = invalidBasePosition > 0 ? invalidBasePosition - 1 : -1;
  const stopEnd = stopIndex >= 0 ? stopIndex + 3 : sequence.length;

  return (
    <div
      className="flex flex-wrap items-end gap-y-2"
      role="group"
      aria-label="Sequência de DNA com posições numeradas"
    >
      {Array.from(sequence).map((base, i) => {
        let region: Region;
        if (invalidIdx >= 0) {
          // Base inválida: destaca só a célula do caractere ofensor; o resto fica neutro.
          region = i === invalidIdx ? 'invalid' : 'before';
        } else if (startIndex < 0) {
          region = 'nostart';
        } else if (i < startIndex) {
          region = 'before';
        } else if (valid) {
          region = i < stopEnd ? 'cds' : 'after';
        } else {
          region = 'cds-invalid';
        }

        const inCodonZone = startIndex >= 0 && i >= startIndex && region !== 'invalid';
        const codonPos = inCodonZone ? (i - startIndex) % 3 : -1;
        const isCodonEnd = inCodonZone && codonPos === 2;
        const isCodonStart = inCodonZone && codonPos === 0;
        const codonNumber = isCodonStart ? Math.floor((i - startIndex) / 3) + 1 : null;

        return (
          <div
            key={i}
            className="flex w-7 flex-none flex-col items-center"
            style={{ marginRight: isCodonEnd ? '6px' : '2px' }}
          >
            <span className="mb-0.5 h-3 font-mono text-[9px] leading-none text-slate-600">
              {codonNumber ?? ''}
            </span>
            <span
              title={`Posição ${i + 1}: ${base}`}
              aria-label={`Posição ${i + 1}: ${base}`}
              className={`flex h-6 w-6 items-center justify-center rounded font-mono text-sm leading-none ${REGION_LETTER[region]}`}
            >
              {base}
            </span>
            <span
              className={`mt-0.5 flex w-full items-center justify-center overflow-hidden rounded-full border font-mono text-[10px] leading-tight tabular-nums ${REGION_CHIP[region]}`}
            >
              {i + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}
