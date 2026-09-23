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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <div className="flex items-center gap-2 text-slate-200">
            <Server size={18} className="text-emerald-400" />
            <h2 className="text-sm font-semibold">Contrato da API — Backend Python (FastAPI)</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <p className="border-b border-slate-800 px-5 py-3 text-xs leading-relaxed text-slate-400">
          Endpoint esperado: <span className="font-mono text-cyan-400">POST http://localhost:8000/api/translate</span>.
          O schema abaixo espelha exatamente os tipos usados pelo frontend (<code>src/types/index.ts</code>), garantindo
          compatibilidade direta ao trocar o modo de processamento para "Python API".
        </p>

        <div className="relative flex-1 overflow-auto">
          <button
            onClick={handleCopy}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-slate-500"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <pre className="overflow-x-auto p-5 font-mono text-[11px] leading-relaxed text-slate-300">
            <code>{FASTAPI_CONTRACT}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
