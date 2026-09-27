import { Download } from 'lucide-react';
import { downloadText } from './downloadText';
import CopyButton from './CopyButton';

interface TerminalWindowProps {
  title: string;
  command: string;
  output: string;
  /** Quando informado, exibe o botão "Baixar .txt" que baixa `output` com este nome de arquivo. */
  downloadFileName?: string;
}

export default function TerminalWindow({ title, command, output, downloadFileName }: TerminalWindowProps) {
  const handleDownload = () => {
    if (!downloadFileName) return;
    downloadText(`${output}\n`, downloadFileName);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-black shadow-inner dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2">
        <span className="truncate font-mono text-[11px] text-slate-300">{title}</span>
        <div className="flex items-center gap-3">
          <CopyButton text={output} label="Copiar saída" />
          {downloadFileName && (
            <button
              onClick={handleDownload}
              aria-label="Baixar saída do terminal como .txt"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            >
              <Download size={11} />
              Baixar .txt
            </button>
          )}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-sm border border-slate-600 bg-slate-700" />
            <span className="h-3 w-3 rounded-sm border border-slate-600 bg-slate-700" />
            <span className="h-3 w-3 rounded-sm border border-rose-500/60 bg-rose-500/40" />
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto overflow-x-auto bg-black p-3">
        <pre className="whitespace-pre font-mono text-[12px] leading-relaxed text-slate-300">
          <span className="text-slate-500">{command}</span>
          {'\n\n'}
          {output}
          {'\n'}
          <span className="text-slate-500">C:\BioCompiler&gt;</span>
          <span className="ml-0.5 inline-block h-[13px] w-[7px] translate-y-[2px] animate-terminal-blink bg-slate-300" aria-hidden="true" />
        </pre>
      </div>
    </div>
  );
}
