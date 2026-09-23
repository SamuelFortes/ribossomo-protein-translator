import { useState } from 'react';
import Header from './components/Header';
import SequenceInput from './components/SequenceInput';
import AnalysisReport from './components/AnalysisReport';
import RibosomePanel from './components/RibosomePanel';
import CodonTable from './components/CodonTable';
import BatchPanel from './components/BatchPanel';
import ApiContractModal from './components/ApiContractModal';
import { analyzeSequences } from './utils/apiClient';
import type { ProcessingMode, RibosomeAnalysis } from './types';

function App() {
  const [sequence, setSequence] = useState('');
  const [mode, setMode] = useState<ProcessingMode>('client');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RibosomeAnalysis[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [backendWarning, setBackendWarning] = useState<string | null>(null);
  const [contractOpen, setContractOpen] = useState(false);

  const runAnalysis = async (lines: string[]) => {
    setLoading(true);
    setBackendWarning(null);
    const { results: analyzed, error } = await analyzeSequences(lines, mode);
    setResults(analyzed);
    setSelectedIndex(0);
    if (error) setBackendWarning(error);
    setLoading(false);
  };

  const handleAnalyze = () => {
    const lines = sequence.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    void runAnalysis(lines);
  };

  const handleBatch = (lines: string[]) => {
    if (lines.length === 0) return;
    void runAnalysis(lines);
  };

  const selected = selectedIndex !== null ? results[selectedIndex] : null;

  return (
    <div className="min-h-screen bg-slate-950">
      <Header
        mode={mode}
        onModeChange={setMode}
        onOpenContract={() => setContractOpen(true)}
        backendWarning={backendWarning}
      />

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-5 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-4">
          <SequenceInput
            value={sequence}
            onChange={setSequence}
            onAnalyze={handleAnalyze}
            onBatchAnalyze={handleBatch}
            loading={loading}
          />
          <BatchPanel results={results} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="h-[420px]">
            <RibosomePanel analysis={selected} />
          </div>
          <CodonTable activeCodon={selected?.codons?.[0]?.codon} />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          {selected ? (
            <AnalysisReport analysis={selected} />
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
              Cole ou carregue uma sequência de mRNA e clique em "Traduzir" para ver o relatório detalhado da
              tradução.
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-800 px-4 py-4 text-center text-[11px] text-slate-600">
        Ribossomo - Protein Translator · Frontend educacional · Modo atual:{' '}
        <span className="text-slate-400">{mode === 'client' ? 'Simulação Local (Client Engine)' : 'Python API'}</span>
      </footer>

      <ApiContractModal open={contractOpen} onClose={() => setContractOpen(false)} />
    </div>
  );
}

export default App;
