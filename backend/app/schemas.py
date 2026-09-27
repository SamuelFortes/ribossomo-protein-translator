# -*- coding: utf-8 -*-
"""Pydantic schemas for the Ribossomo FastAPI endpoints."""

from typing import Dict, List, Literal

from pydantic import BaseModel

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


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str


class GeneticCodeResponse(BaseModel):
    geneticCode: Dict[str, str]
    aminoAcids: Dict[str, Dict[str, str]]
    stopCodons: List[str]
