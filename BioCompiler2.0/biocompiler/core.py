# -*- coding: utf-8 -*-
"""
Módulo Core do BioCompiler 1.0
Implementa validação de bases, identificação de START/STOP,
análise do quadro de leitura (frame) e diagnóstico para os 6 casos de aceite.
"""

import unicodedata
from dataclasses import dataclass
from typing import Optional, Tuple, List, Dict, Any
from .transcriber import transcribe, translate

# Padronização rigorosa das respostas esperadas
RESULT_CORRECT = "CORRETO"
RESULT_INVALID_BASE = "BUG - base inválida"
RESULT_MISSING_START = "BUG - START ausente"
RESULT_MISSING_STOP = "BUG - STOP ausente"
RESULT_FRAMESHIFT = "BUG - frameshift"
RESULT_NONSENSE = "BUG - nonsense / STOP prematuro"

VALID_BASES = {"A", "T", "C", "G"}
START_CODON = "ATG"
STOP_CODONS = {"TAA", "TAG", "TGA"}


def clean_sequence(sequence: str) -> str:
    """
    Remove espaços, quebras de linha, BOM e caracteres de controle,
    normalizando para Unicode NFC e letras maiúsculas.
    """
    if not sequence:
        return ""
    s = unicodedata.normalize("NFC", str(sequence))
    s = s.replace("\ufeff", "").replace("\u200b", "").replace("\r", "").replace("\n", "").replace("\t", " ")
    return "".join(s.split()).upper()


def validate_dna(sequence: str) -> Tuple[bool, Optional[str]]:
    """
    Verifica se a sequência contém apenas as bases canônicas A, T, C e G.
    Caracteres com til, acentos, cedilha, letras degeneradas ou números
    são classificados como base inválida.
    Retorna (True, None) se válida, ou (False, primeiro_caractere_invalido) se inválida.
    """
    s = clean_sequence(sequence)
    if not s:
        return False, "Sequência vazia"
    for char in s:
        if char not in VALID_BASES:
            return False, char
    return True, None


def find_start_codon(sequence: str, start_codon: str = START_CODON) -> int:
    """
    Localiza o primeiro códon START (ATG) na sequência.
    Retorna o índice da primeira base do ATG, ou -1 se ausente.
    """
    s = clean_sequence(sequence)
    return s.find(start_codon.upper())


def find_stop_codon(
    sequence: str,
    start_pos: int,
    stop_codons: set = None
) -> Tuple[int, int, str]:
    """
    Varre a sequência a partir de start_pos em trincas (quadro de leitura).
    Retorna (indice_do_codon, indice_na_string, codon_encontrado).
    Caso não encontre nenhum STOP no quadro, retorna (-1, -1, "").
    """
    if stop_codons is None:
        stop_codons = STOP_CODONS
    s = clean_sequence(sequence)
    if start_pos < 0 or start_pos >= len(s):
        return -1, -1, ""

    codon_idx = 0
    for pos in range(start_pos, len(s), 3):
        triplet = s[pos:pos + 3]
        if len(triplet) < 3:
            break
        if triplet in stop_codons:
            return codon_idx, pos, triplet
        codon_idx += 1

    return -1, -1, ""


def find_all_in_frame_stops(
    sequence: str,
    start_pos: int,
    stop_codons: set = None
) -> List[Tuple[int, int, str]]:
    """
    Localiza todos os códons STOP no mesmo quadro de leitura a partir de start_pos.
    Retorna lista de tuplas: (indice_do_codon, indice_na_string, codon_encontrado).
    """
    if stop_codons is None:
        stop_codons = STOP_CODONS
    s = clean_sequence(sequence)
    if start_pos < 0 or start_pos >= len(s):
        return []

    stops = []
    codon_idx = 0
    for pos in range(start_pos, len(s), 3):
        triplet = s[pos:pos + 3]
        if len(triplet) < 3:
            break
        if triplet in stop_codons:
            stops.append((codon_idx, pos, triplet))
        codon_idx += 1

    return stops


@dataclass
class AnalysisResult:
    """Estrutura com os resultados detalhados da análise do BioCompiler 1.0."""
    raw_sequence: str
    clean_sequence: str
    status: str          # "CORRETO", "BUG - base inválida", etc.
    is_valid: bool       # True se CORRETO, False se ERRO
    entry_number: int = 1
    start_pos: int = -1
    stop_pos: int = -1
    stop_codon: str = ""
    codon_count: int = 0
    cds_dna: str = ""
    pre_mrna: str = "NÃO GERADO"
    cds_mrna: str = ""
    protein: str = ""
    detail: str = ""
    error_location: str = ""   # Local exato onde está a falha (posições/códons)
    error_snippet: str = ""    # Trecho com a falha destacada entre colchetes
    qa_diagnostic: str = ""    # Diagnóstico técnico de QA

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entry_number": self.entry_number,
            "raw_sequence": self.raw_sequence,
            "sequence": self.clean_sequence,
            "status": self.status,
            "is_valid": self.is_valid,
            "start_pos": self.start_pos,
            "stop_pos": self.stop_pos,
            "stop_codon": self.stop_codon,
            "codon_count": self.codon_count,
            "cds_dna": self.cds_dna,
            "pre_mrna": self.pre_mrna,
            "cds_mrna": self.cds_mrna,
            "protein": self.protein,
            "detail": self.detail,
            "error_location": self.error_location,
            "error_snippet": self.error_snippet,
            "qa_diagnostic": self.qa_diagnostic,
        }


def classify(sequence: str, reference: Optional[str] = None) -> str:
    """
    Função de classificação rápida.
    Retorna exatamente uma das strings padronizadas:
    - CORRETO
    - BUG - base inválida
    - BUG - START ausente
    - BUG - STOP ausente
    - BUG - frameshift
    - BUG - nonsense / STOP prematuro
    """
    compiler = BioCompiler(reference_dna=reference)
    result = compiler.analyze(sequence)
    return result.status


class BioCompiler:
    """
    BioCompiler 1.0 - DNA Transcriber.
    Validação de sequências, identificação da região codificante,
    diagnóstico detalhado de QA com apontamento exato de erros e transcrição em pré-mRNA.
    """

    def __init__(self, reference_dna: Optional[str] = None):
        self.reference_dna = clean_sequence(reference_dna) if reference_dna else None
        self._ref_start = -1
        self._ref_stop_codon_idx = -1
        self._ref_stop_pos = -1
        self._ref_stop_codon = ""
        self._ref_codons: List[str] = []

        if self.reference_dna:
            self._parse_reference()

    def _parse_reference(self) -> None:
        """Analisa a sequência de referência para comparações opcionais de mutação."""
        is_val, invalid_c = validate_dna(self.reference_dna)
        if not is_val:
            raise ValueError(f"Sequência de referência contém base inválida: '{invalid_c}'.")
        self._ref_start = find_start_codon(self.reference_dna)
        if self._ref_start == -1:
            raise ValueError("Sequência de referência não contém códon START (ATG).")
        (
            self._ref_stop_codon_idx,
            self._ref_stop_pos,
            self._ref_stop_codon,
        ) = find_stop_codon(self.reference_dna, self._ref_start)
        if self._ref_stop_codon_idx == -1:
            raise ValueError("Sequência de referência não contém códon STOP no quadro.")

        self._ref_codons = [
            self.reference_dna[self._ref_start + i * 3 : self._ref_start + (i + 1) * 3]
            for i in range(self._ref_stop_codon_idx + 1)
        ]

    def analyze(self, sequence: str, entry_number: int = 1) -> AnalysisResult:
        """
        Analisa uma sequência de DNA completa, atuando como avaliador de QA,
        indicando a entrada e localizando o trecho exato de eventuais erros.
        """
        raw_seq = sequence
        clean_seq = clean_sequence(sequence)

        # ---------------------------------------------------------
        # Caso 2: Presença de caractere diferente de A, T, C ou G
        # ---------------------------------------------------------
        invalid_positions = [(idx + 1, char) for idx, char in enumerate(clean_seq) if char not in VALID_BASES]
        if invalid_positions:
            loc_list = [f"Posição {pos} (base '{char}')" for pos, char in invalid_positions]
            error_loc = ", ".join(loc_list)
            error_snip = "".join(f"[{char}]" if char not in VALID_BASES else char for char in clean_seq)
            first_invalid = invalid_positions[0][1]
            qa_diag = f"A base '{first_invalid}' não pertence ao alfabeto canônico do DNA (A, T, C, G)."

            return AnalysisResult(
                raw_sequence=raw_seq,
                clean_sequence=clean_seq,
                status=RESULT_INVALID_BASE,
                is_valid=False,
                entry_number=entry_number,
                pre_mrna="NÃO GERADO",
                detail=f"Caractere inválido encontrado: '{first_invalid}'.",
                error_location=error_loc,
                error_snippet=error_snip,
                qa_diagnostic=qa_diag,
            )

        # ---------------------------------------------------------
        # Caso 3: ATG de início ausente
        # ---------------------------------------------------------
        start_pos = find_start_codon(clean_seq)
        if start_pos == -1:
            seq_len = len(clean_seq)
            error_loc = f"Toda a extensão da fita (posições 1 a {seq_len})"
            error_snip = f"[{clean_seq}]"
            qa_diag = "Nenhum códon de início 'ATG' foi localizado na sequência para iniciar o quadro de leitura."

            return AnalysisResult(
                raw_sequence=raw_seq,
                clean_sequence=clean_seq,
                status=RESULT_MISSING_START,
                is_valid=False,
                entry_number=entry_number,
                pre_mrna="NÃO GERADO",
                detail="A sequência não apresenta o códon ATG necessário para iniciar a região codificante.",
                error_location=error_loc,
                error_snippet=error_snip,
                qa_diagnostic=qa_diag,
            )

        # ---------------------------------------------------------
        # Análise do Quadro de Leitura a partir do ATG
        # ---------------------------------------------------------
        in_frame_stops = find_all_in_frame_stops(clean_seq, start_pos)

        # Modo com Sequência de Referência Externa (se fornecida)
        if self.reference_dna:
            delta_len = len(clean_seq) - len(self.reference_dna)
            if delta_len % 3 != 0:
                error_loc = f"Comprimento da sequência (delta = {delta_len} bases em relação à referência)"
                error_snip = f"Comprimento testado: {len(clean_seq)} bases | Referência: {len(self.reference_dna)} bases"
                qa_diag = f"Frameshift identificado por variação no comprimento (delta = {delta_len}, não múltiplo de 3)."
                return AnalysisResult(
                    raw_sequence=raw_seq,
                    clean_sequence=clean_seq,
                    status=RESULT_FRAMESHIFT,
                    is_valid=False,
                    entry_number=entry_number,
                    start_pos=start_pos,
                    pre_mrna="NÃO GERADO",
                    detail=f"Frameshift detectado: alteração no comprimento em relação à referência (delta = {delta_len} bases).",
                    error_location=error_loc,
                    error_snippet=error_snip,
                    qa_diagnostic=qa_diag,
                )
            if in_frame_stops:
                codon_idx, stop_pos, stop_codon = in_frame_stops[0]
                if codon_idx < self._ref_stop_codon_idx:
                    error_loc = f"Códon {codon_idx + 1} (posições {stop_pos + 1} a {stop_pos + 3}: '{stop_codon}')"
                    codons = [clean_seq[p:p+3] if p != stop_pos else f"[{clean_seq[p:p+3]}]" for p in range(start_pos, len(clean_seq), 3)]
                    error_snip = "-".join(codons)
                    qa_diag = f"STOP prematuro encontrado no códon {codon_idx + 1}, antes do STOP esperado (códon {self._ref_stop_codon_idx + 1})."
                    return AnalysisResult(
                        raw_sequence=raw_seq,
                        clean_sequence=clean_seq,
                        status=RESULT_NONSENSE,
                        is_valid=False,
                        entry_number=entry_number,
                        start_pos=start_pos,
                        stop_pos=stop_pos,
                        stop_codon=stop_codon,
                        codon_count=codon_idx + 1,
                        pre_mrna="NÃO GERADO",
                        detail=f"STOP prematuro encontrado no códon {codon_idx + 1} ({stop_codon}), antes do término esperado.",
                        error_location=error_loc,
                        error_snippet=error_snip,
                        qa_diagnostic=qa_diag,
                    )
                else:
                    pre_mrna = transcribe(clean_seq)
                    cds_dna = clean_seq[start_pos : stop_pos + 3]
                    cds_mrna = transcribe(cds_dna)
                    protein = translate(cds_mrna)
                    return AnalysisResult(
                        raw_sequence=raw_seq,
                        clean_sequence=clean_seq,
                        status=RESULT_CORRECT,
                        is_valid=True,
                        entry_number=entry_number,
                        start_pos=start_pos,
                        stop_pos=stop_pos,
                        stop_codon=stop_codon,
                        codon_count=codon_idx + 1,
                        cds_dna=cds_dna,
                        pre_mrna=pre_mrna,
                        cds_mrna=cds_mrna,
                        protein=protein,
                        detail="Sequência válida. Transcrição para pré-mRNA realizada.",
                    )
            else:
                last_codon = clean_seq[-3:]
                error_loc = f"Posições {len(clean_seq)-2} a {len(clean_seq)} (último códon lido: '{last_codon}')"
                codons = [clean_seq[p:p+3] for p in range(start_pos, len(clean_seq), 3)]
                error_snip = "-".join(codons[:-1] + [f"[{codons[-1]}]"]) if codons else clean_seq
                qa_diag = "O quadro de leitura encerrou sem encontrar códon STOP válido."
                return AnalysisResult(
                    raw_sequence=raw_seq,
                    clean_sequence=clean_seq,
                    status=RESULT_MISSING_STOP,
                    is_valid=False,
                    entry_number=entry_number,
                    start_pos=start_pos,
                    pre_mrna="NÃO GERADO",
                    detail="Após o START, não é encontrado TAA, TAG ou TGA válido no quadro de leitura.",
                    error_location=error_loc,
                    error_snippet=error_snip,
                    qa_diagnostic=qa_diag,
                )

        # ---------------------------------------------------------
        # Modo Padrão / Convenções Didáticas da Atividade
        # ---------------------------------------------------------

        # Caso 6: STOP em fase antes do término esperado (Nonsense / STOP prematuro)
        if len(in_frame_stops) > 1:
            codon_idx, stop_pos, stop_codon = in_frame_stops[0]
            codon_num = codon_idx + 1
            error_loc = f"Códon {codon_num} (posições {stop_pos + 1} a {stop_pos + 3}: '{stop_codon}')"

            codons = []
            for p in range(start_pos, len(clean_seq), 3):
                triplet = clean_seq[p : p + 3]
                if p == stop_pos:
                    codons.append(f"[{triplet}]")
                else:
                    codons.append(triplet)

            prefix = clean_seq[:start_pos]
            error_snip = (f"({prefix})-" if prefix else "") + "-".join(codons)
            qa_diag = f"O códon de parada '{stop_codon}' surgiu precocemente no códon {codon_num}, restando sequência codificante após ele."

            return AnalysisResult(
                raw_sequence=raw_seq,
                clean_sequence=clean_seq,
                status=RESULT_NONSENSE,
                is_valid=False,
                entry_number=entry_number,
                start_pos=start_pos,
                stop_pos=stop_pos,
                stop_codon=stop_codon,
                codon_count=codon_idx + 1,
                pre_mrna="NÃO GERADO",
                detail=f"STOP prematuro em fase ({stop_codon}) encontrado no códon {codon_num}, restando sequência após ele.",
                error_location=error_loc,
                error_snippet=error_snip,
                qa_diagnostic=qa_diag,
            )

        # Caso 1: Entrada Correta
        if len(in_frame_stops) == 1:
            codon_idx, stop_pos, stop_codon = in_frame_stops[0]
            pre_mrna = transcribe(clean_seq)
            cds_dna = clean_seq[start_pos : stop_pos + 3]
            cds_mrna = transcribe(cds_dna)
            protein = translate(cds_mrna)

            return AnalysisResult(
                raw_sequence=raw_seq,
                clean_sequence=clean_seq,
                status=RESULT_CORRECT,
                is_valid=True,
                entry_number=entry_number,
                start_pos=start_pos,
                stop_pos=stop_pos,
                stop_codon=stop_codon,
                codon_count=codon_idx + 1,
                cds_dna=cds_dna,
                pre_mrna=pre_mrna,
                cds_mrna=cds_mrna,
                protein=protein,
                detail="Sequência válida. Transcrição para pré-mRNA realizada.",
                error_location="Nenhum erro detectado",
                error_snippet="Sequência íntegra e funcional",
                qa_diagnostic="A sequência atende a todos os critérios de aceite: bases canônicas, START e STOP no quadro de leitura.",
            )

        # Se nenhum STOP foi encontrado no quadro de leitura:
        # Caso 5: Região após o START perde a organização esperada em trincas (Frameshift)
        rem_bases = (len(clean_seq) - start_pos) % 3
        if rem_bases != 0:
            leftover = clean_seq[len(clean_seq) - rem_bases :]
            plural_s = "s" if rem_bases > 1 else ""
            error_loc = f"Posição {len(clean_seq) - rem_bases + 1} a {len(clean_seq)} ({rem_bases} base{plural_s} restante{plural_s}: '{leftover}')"

            codons = [clean_seq[p : p + 3] for p in range(start_pos, len(clean_seq) - rem_bases, 3)]
            prefix = clean_seq[:start_pos]
            error_snip = (f"({prefix})-" if prefix else "") + "-".join(codons) + f"-TRINCA_INCOMPLETA:[{leftover}]"
            qa_diag = f"O quadro de leitura foi quebrado. A sequência após o START não é divisível por 3 (restam {rem_bases} base{plural_s} excedente{plural_s} ao final)."

            return AnalysisResult(
                raw_sequence=raw_seq,
                clean_sequence=clean_seq,
                status=RESULT_FRAMESHIFT,
                is_valid=False,
                entry_number=entry_number,
                start_pos=start_pos,
                pre_mrna="NÃO GERADO",
                detail="A região após o START perde a organização esperada em trincas até o término.",
                error_location=error_loc,
                error_snippet=error_snip,
                qa_diagnostic=qa_diag,
            )

        # Caso 4: Trincas completas mantidas, mas nenhum STOP válido encontrado no quadro
        seq_len = len(clean_seq)
        last_codon = clean_seq[-3:]
        error_loc = f"Posições {seq_len - 2} a {seq_len} (último códon lido: '{last_codon}')"

        codons = [clean_seq[p : p + 3] for p in range(start_pos, seq_len, 3)]
        prefix = clean_seq[:start_pos]
        error_snip = (f"({prefix})-" if prefix else "") + "-".join(codons[:-1] + [f"[{codons[-1]}]"])
        qa_diag = "A fita foi lida em trincas até o final sem que nenhum códon STOP válido (TAA, TAG ou TGA) fosse encontrado."

        return AnalysisResult(
            raw_sequence=raw_seq,
            clean_sequence=clean_seq,
            status=RESULT_MISSING_STOP,
            is_valid=False,
            entry_number=entry_number,
            start_pos=start_pos,
            pre_mrna="NÃO GERADO",
            detail="Após o START, não é encontrado TAA, TAG ou TGA válido no quadro de leitura.",
            error_location=error_loc,
            error_snippet=error_snip,
            qa_diagnostic=qa_diag,
        )
