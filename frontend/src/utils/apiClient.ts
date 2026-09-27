import type { RibosomeAnalysis, ProcessingMode, DnaAnalysis, RnaAnalysis, PipelineAnalysis } from '../types';
import { analyzeMrna } from './translatorEngine';
import { analyzeDna } from './dnaEngine';
import { analyzeRna } from './rnaEngine';
import { analyzePipeline } from './pipelineEngine';

const API_BASE_URL = 'http://localhost:8000/api';

export interface BackendAnalyzeRequest {
  sequences: string[];
}

export interface BackendAnalyzeResponse {
  results: RibosomeAnalysis[];
}

export async function analyzeSequences(
  sequences: string[],
  mode: ProcessingMode,
): Promise<{ results: RibosomeAnalysis[]; error?: string }> {
  if (mode === 'client') {
    const results = sequences.map((seq, i) => analyzeMrna(seq, i + 1));
    return { results };
  }

  try {
    const body: BackendAnalyzeRequest = { sequences };
    const res = await fetch(`${API_BASE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Backend respondeu com status ${res.status}`);
    }

    const data = (await res.json()) as BackendAnalyzeResponse;
    return { results: data.results };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido ao contatar o backend';
    const fallback = sequences.map((seq, i) => analyzeMrna(seq, i + 1));
    return {
      results: fallback,
      error: `Falha ao conectar em ${API_BASE_URL}/translate (${message}). Exibindo resultado da simulação local como contingência.`,
    };
  }
}

/**
 * Fases I, II e Pipeline não têm endpoint remoto implementado no backend
 * Python atual (que só expõe /api/translate para a Fase III — ver
 * backend/app/main.py). Por isso, ao contrário de analyzeSequences acima,
 * estas três funções rodam sempre o engine local, independente do
 * ProcessingMode, e nunca populam `error`: não existe contingência a
 * relatar porque nenhuma tentativa de rede é feita.
 */

export interface BackendDnaAnalyzeResponse {
  results: DnaAnalysis[];
}

export async function analyzeDnaSequences(
  sequences: string[],
  _mode: ProcessingMode,
): Promise<{ results: DnaAnalysis[]; error?: string }> {
  const results = sequences.map((seq, i) => analyzeDna(seq, i + 1));
  return { results };
}

export interface BackendRnaAnalyzeResponse {
  results: RnaAnalysis[];
}

export async function analyzeRnaSequences(
  sequences: string[],
  _mode: ProcessingMode,
): Promise<{ results: RnaAnalysis[]; error?: string }> {
  const results = sequences.map((seq, i) => analyzeRna(seq, i + 1));
  return { results };
}

export interface BackendPipelineAnalyzeResponse {
  results: PipelineAnalysis[];
}

export async function analyzePipelineSequences(
  sequences: string[],
  _mode: ProcessingMode,
): Promise<{ results: PipelineAnalysis[]; error?: string }> {
  const results = sequences.map((seq, i) => analyzePipeline(seq, i + 1));
  return { results };
}

/**
 * Verifica se o backend Python está de pé, para a UI exibir um indicador
 * online/offline. Nunca rejeita: qualquer falha (rede, timeout, status
 * não-OK) resolve para `false`.
 */
export async function checkBackendHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    if (!res.ok) return false;
    const data = (await res.json()) as { status?: string };
    return data.status === 'ok';
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const FASTAPI_CONTRACT = `"""
Ribossomo - Protein Translator | Contrato da API Backend (FastAPI)
Base URL esperada pelo frontend: http://localhost:8000/api
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal

app = FastAPI(title="Ribossomo Protein Translator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

TranslationStatus = Literal["OK", "ERRO"]
TranslationResult = Literal[
    "CORRETO",
    "BUG - CAP 5'",
    "BUG - START ausente",
    "BUG - STOP ausente",
    "BUG - quadro de leitura",
    "BUG - cauda poli -A",
]


class CodonDetail(BaseModel):
    codon: str
    aminoAcid: str
    name: str
    fullSeqPos: int
    inFrame: bool
    type: Literal["start", "sense", "stop"]
    color: str


class RibosomeAnalysis(BaseModel):
    entryNumber: int
    rawSequence: str
    status: TranslationStatus
    result: TranslationResult
    protein: str
    aminoAcids: List[str]

    cap5Valid: bool
    cap5Found: str

    startValid: bool
    startCodon: str
    startIndex: int

    readingFrameValid: bool

    stopValid: bool
    stopCodon: str
    stopIndex: int

    polyAValid: bool
    polyALength: int

    translationValid: bool

    utr5: str
    codingRna: str
    utr3: str
    polyATail: str

    codons: List[CodonDetail]

    diagnosticSummary: str
    didacticExplanation: str
    biologicalContext: str


class AnalyzeRequest(BaseModel):
    sequences: List[str]


class AnalyzeResponse(BaseModel):
    results: List[RibosomeAnalysis]


@app.post("/api/translate", response_model=AnalyzeResponse)
def translate(payload: AnalyzeRequest) -> AnalyzeResponse:
    """
    Recebe uma lista de sequências de mRNA maduro (com CAP 5', regiao
    codificante e cauda poli-A) e retorna a analise completa de cada uma,
    seguindo exatamente as regras da Especificacao Ribossomo 1.0.
    """
    results = [analyze_single(seq, i + 1) for i, seq in enumerate(payload.sequences)]
    return AnalyzeResponse(results=results)


def analyze_single(sequence: str, entry_number: int) -> RibosomeAnalysis:
    # Implementar aqui a logica de negocio em Python, espelhando
    # src/utils/translatorEngine.ts (mesmas 6 classificacoes de bug).
    raise NotImplementedError
`;
