import { X, Server, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { FASTAPI_CONTRACT } from '../utils/apiClient';

interface ApiContractModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ApiContractModal({ open, onClose }: ApiContractModalProps) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(FASTAPI_CONTRACT);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm dark:bg-slate-950/80">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Server size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-semibold">Contrato da API — Backend Python (FastAPI)</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        <p className="border-b border-slate-200 px-5 py-3 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Endpoint esperado: <span className="font-mono text-cyan-700 dark:text-cyan-400">POST http://localhost:8000/api/translate</span>.
          O schema abaixo espelha exatamente os tipos usados pelo frontend (<code>src/types/index.ts</code>), garantindo
          compatibilidade direta ao trocar o modo de processamento para "Python API".
        </p>

        <div className="relative flex-1 overflow-auto">
          <button
            onClick={handleCopy}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white/80 px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-300 dark:hover:border-slate-500"
          >
            {copied ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={13} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <pre className="overflow-x-auto p-5 font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
            <code>{FASTAPI_CONTRACT}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
