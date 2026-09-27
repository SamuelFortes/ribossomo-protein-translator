import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from './copyToClipboard';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

const BASE_CLASSES =
  'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200';

export default function CopyButton({ text, label = 'Copiar', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={label}
      className={`${BASE_CLASSES} ${className}`}
    >
      {copied ? <Check size={11} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={11} />}
      {copied ? 'Copiado' : label}
    </button>
  );
}
