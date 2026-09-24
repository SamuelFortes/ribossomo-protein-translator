import { useState } from 'react';
import Header from './components/Header';
import SequenceInput from './components/SequenceInput';
import AnalysisReport from './components/AnalysisReport';
import RibosomePanel from './components/RibosomePanel';
import CodonTable from './components/CodonTable';
import BatchPanel from './components/BatchPanel';
import DnaReport from './components/DnaReport';
import DnaBatchPanel from './components/DnaBatchPanel';
import RnaReport from './components/RnaReport';
import RnaBatchPanel from './components/RnaBatchPanel';
import PipelineView from './components/PipelineView';
import PipelineBatchPanel from './components/PipelineBatchPanel';
import ApiContractModal from './components/ApiContractModal';
import { analyzeSequences, analyzeDnaSequences, analyzeRnaSequences, analyzePipelineSequences } from './utils/apiClient';
import type { ProcessingMode, RibosomeAnalysis, Phase, DnaAnalysis, RnaAnalysis, PipelineAnalysis } from './types';

function App() {
  const [phase, setPhase] = useState<Phase>('ribosome');
  const [mode, setMode] = useState<ProcessingMode>('client');
  const [loading, setLoading] = useState(false);
  const [backendWarning, setBackendWarning] = useState<string | null>(null);
  const [contractOpen, setContractOpen] = useState(false);

  // Fase III — Ribossomo (existente, intocado)
  const [sequence, setSequence] = useState('');
  const [results, setResults] = useState<RibosomeAnalysis[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Fase I — DNA
  const [dnaSequence, setDnaSequence] = useState('');
  const [dnaResults, setDnaResults] = useState<DnaAnalysis[]>([]);
  const [dnaSelectedIndex, setDnaSelectedIndex] = useState<number | null>(null);

  // Fase II — RNA
  const [rnaSequence, setRnaSequence] = useState('');
  const [rnaResults, setRnaResults] = useState<RnaAnalysis[]>([]);
  const [rnaSelectedIndex, setRnaSelectedIndex] = useState<number | null>(null);

  // Pipeline
  const [pipelineSequence, setPipelineSequence] = useState('');
  const [pipelineResults, setPipelineResults] = useState<PipelineAnalysis[]>([]);
  const [pipelineSelectedIndex, setPipelineSelectedIndex] = useState<number | null>(null);

  const runAnalysis = async (lines: string[]) => {
    setLoading(true);
    setBackendWarning(null);
    const { results: analyzed, error } = await analyzeSequences(lines, mode);
    setResults(analyzed);
    setSelectedIndex(0);
    if (error) setBackendWarning(error);
    setLoading(false);
  };

  const runDnaAnalysis = async (lines: string[]) => {
    setLoading(true);
    setBackendWarning(null);
    const { results: analyzed, error } = await analyzeDnaSequences(lines, mode);
    setDnaResults(analyzed);
    setDnaSelectedIndex(0);
    if (error) setBackendWarning(error);
    setLoading(false);
  };

  const runRnaAnalysis = async (lines: string[]) => {
    setLoading(true);
    setBackendWarning(null);
    const { results: analyzed, error } = await analyzeRnaSequences(lines, mode);
    setRnaResults(analyzed);
    setRnaSelectedIndex(0);
    if (error) setBackendWarning(error);
    setLoading(false);
  };

  const runPipelineAnalysis = async (lines: string[]) => {
    setLoading(true);
    setBackendWarning(null);
    const { results: analyzed, error } = await analyzePipelineSequences(lines, mode);
    setPipelineResults(analyzed);
    setPipelineSelectedIndex(0);
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

  const handleDnaAnalyze = () => {
    const lines = dnaSequence.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    void runDnaAnalysis(lines);
  };

  const handleDnaBatch = (lines: string[]) => {
    if (lines.length === 0) return;
    void runDnaAnalysis(lines);
  };

  const handleRnaAnalyze = () => {
    const lines = rnaSequence.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    void runRnaAnalysis(lines);
  };

  const handleRnaBatch = (lines: string[]) => {
    if (lines.length === 0) return;
    void runRnaAnalysis(lines);
  };

  const handlePipelineAnalyze = () => {
    const lines = pipelineSequence.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    void runPipelineAnalysis(lines);
  };

  const handlePipelineBatch = (lines: string[]) => {
    if (lines.length === 0) return;
    void runPipelineAnalysis(lines);
  };

  const selected = selectedIndex !== null ? results[selectedIndex] : null;
  const dnaSelected = dnaSelectedIndex !== null ? dnaResults[dnaSelectedIndex] : null;
  const rnaSelected = rnaSelectedIndex !== null ? rnaResults[rnaSelectedIndex] : null;
  const pipelineSelected = pipelineSelectedIndex !== null ? pipelineResults[pipelineSelectedIndex] : null;

  return (
    <div className="min-h-screen bg-slate-950">
      <Header
        mode={mode}
        onModeChange={setMode}
        phase={phase}
        onPhaseChange={setPhase}
        onOpenContract={() => setContractOpen(true)}
        backendWarning={backendWarning}
      />

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-5 lg:grid-cols-12">
        {phase === 'ribosome' && (
          <>
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
          </>
        )}

        {phase === 'dna' && (
          <>
            <div className="flex flex-col gap-4 lg:col-span-4">
              <SequenceInput
                value={dnaSequence}
                onChange={setDnaSequence}
                onAnalyze={handleDnaAnalyze}
                onBatchAnalyze={handleDnaBatch}
                loading={loading}
                title="Entrada de Sequência DNA"
                placeholder="GCGTAC ATG GCTAACGTTG GCTGAACTTC GGCTAC TGA (cole 1 sequência ou várias, uma por linha, para lote)"
                analyzeLabel="Transcrever"
                testCases={[]}
              />
              <DnaBatchPanel results={dnaResults} selectedIndex={dnaSelectedIndex} onSelect={setDnaSelectedIndex} />
            </div>

            <div className="flex flex-col gap-4 lg:col-span-8">
              {dnaSelected ? (
                <DnaReport analysis={dnaSelected} />
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
                  Cole ou carregue uma sequência de DNA e clique em "Transcrever" para ver o relatório da Fase I
                  (BioCompiler 1.0).
                </div>
              )}
            </div>
          </>
        )}

        {phase === 'rna' && (
          <>
            <div className="flex flex-col gap-4 lg:col-span-4">
              <SequenceInput
                value={rnaSequence}
                onChange={setRnaSequence}
                onAnalyze={handleRnaAnalyze}
                onBatchAnalyze={handleRnaBatch}
                loading={loading}
                title="Entrada de Sequência pré-mRNA"
                placeholder="CCUAUGGCUGUAACCUUUAACUAACAAGAUGGCCUAC (cole 1 sequência ou várias, uma por linha, para lote)"
                analyzeLabel="Processar"
                testCases={[]}
              />
              <RnaBatchPanel results={rnaResults} selectedIndex={rnaSelectedIndex} onSelect={setRnaSelectedIndex} />
            </div>

            <div className="flex flex-col gap-4 lg:col-span-8">
              {rnaSelected ? (
                <RnaReport analysis={rnaSelected} />
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
                  Cole ou carregue uma sequência de pré-mRNA e clique em "Processar" para ver o relatório da Fase
                  II (BioCompiler 2.0).
                </div>
              )}
            </div>
          </>
        )}

        {phase === 'pipeline' && (
          <>
            <div className="flex flex-col gap-4 lg:col-span-4">
              <SequenceInput
                value={pipelineSequence}
                onChange={setPipelineSequence}
                onAnalyze={handlePipelineAnalyze}
                onBatchAnalyze={handlePipelineBatch}
                loading={loading}
                title="Entrada de Sequência DNA (Pipeline)"
                placeholder="GCGTAC ATG GCTAACGTTG GCTGAACTTC GGCTAC TGA (cole 1 sequência ou várias, uma por linha, para lote)"
                analyzeLabel="Executar Pipeline"
                testCases={[]}
              />
              <PipelineBatchPanel results={pipelineResults} selectedIndex={pipelineSelectedIndex} onSelect={setPipelineSelectedIndex} />
            </div>

            <div className="flex flex-col gap-4 lg:col-span-8">
              {pipelineSelected ? (
                <PipelineView analysis={pipelineSelected} />
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
                  Cole ou carregue uma sequência de DNA e clique em "Executar Pipeline" para encadear as três
                  fases (DNA → pré-mRNA → mRNA maduro → proteína) numa única execução.
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 px-4 py-4 text-center text-[11px] text-slate-600">
        BioCompiler - Protein Translator · Frontend educacional · Modo atual:{' '}
        <span className="text-slate-400">{mode === 'client' ? 'Simulação Local (Client Engine)' : 'Python API'}</span>
      </footer>

      <ApiContractModal open={contractOpen} onClose={() => setContractOpen(false)} />
    </div>
  );
}

export default App;
