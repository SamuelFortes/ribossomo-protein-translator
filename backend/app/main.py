# -*- coding: utf-8 -*-
"""FastAPI app exposing the Ribossomo backend contract."""

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from .ribosome_service import (
    AMINO_ACID_MAP,
    GENETIC_CODE,
    OFFICIAL_TEST_CASES,
    STOP_CODONS,
    analyze_batch,
    generate_export_content,
)
from .schemas import AnalyzeRequest, AnalyzeResponse, GeneticCodeResponse, HealthResponse

app = FastAPI(
    title="Ribossomo Protein Translator API",
    version="1.0.0",
    description="Backend FastAPI para tradução didática de mRNA maduro em proteína.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="ribossomo-protein-translator", version="1.0.0")


@app.get("/api/translate/examples")
def get_official_examples() -> dict:
    return {"examples": OFFICIAL_TEST_CASES}


@app.get("/api/translate/genetic-code", response_model=GeneticCodeResponse)
def get_genetic_code() -> GeneticCodeResponse:
    return GeneticCodeResponse(
        geneticCode=GENETIC_CODE,
        aminoAcids=AMINO_ACID_MAP,
        stopCodons=sorted(STOP_CODONS),
    )


@app.post("/api/translate", response_model=AnalyzeResponse)
def translate(payload: AnalyzeRequest) -> AnalyzeResponse:
    return AnalyzeResponse(**analyze_batch(payload.sequences))


@app.post("/api/translate/export")
def export_translate_results(payload: AnalyzeRequest) -> Response:
    analyses = analyze_batch(payload.sequences)["results"]
    content = generate_export_content(analyses) + "\n"
    return Response(content=content, media_type="text/csv; charset=utf-8")
