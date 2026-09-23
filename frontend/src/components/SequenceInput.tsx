import { Dna, FlaskConical, Upload, Play } from 'lucide-react';
import { useRef } from 'react';
import { OFFICIAL_TEST_CASES } from '../utils/translatorEngine';

interface SequenceInputProps {
  value: string;
  onChange: (v: string) => void;
  onAnalyze: () => void;
  onBatchAnalyze: (lines: string[]) => void;
  loading: boolean;
}

export default function SequenceInput({ value, onChange, onAnalyze, onBatchAnalyze, loading }: SequenceInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      onBatchAnalyze(lines);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center gap-2 text-slate-200">
        <Dna size={18} className="text-cyan-400" />
        <h2 className="text-sm font-semibold">Entrada de Sequência mRNA</h2>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="m7GpppCCAUGGCUAAACCGUAAGG...AAAA (cole 1 sequência ou várias, uma por linha, para lote)"
        rows={6}
        spellCheck={false}
        className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/70 p-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onAnalyze}
          disabled={loading || !value.trim()}
          className="glow-cyan flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play size={14} />
          Traduzir
        </button>

        <button
          onClick={() => {
            const lines = value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
            if (lines.length > 1) onBatchAnalyze(lines);
          }}
          disabled={loading}
          className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-40"
        >
          Processar em Lote
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          <Upload size={14} />
          Upload .txt
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
          <FlaskConical size={14} className="text-emerald-400" />
          Casos de teste oficiais (Seção 14)
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {OFFICIAL_TEST_CASES.map((tc) => (
            <button
              key={tc.id}
              onClick={() => onChange(tc.sequence)}
              title={tc.description}
              className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-left text-[11px] text-slate-300 transition hover:border-cyan-500/50 hover:bg-slate-900"
            >
              <span className="font-mono font-semibold text-cyan-400">#{tc.id}</span> {tc.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
