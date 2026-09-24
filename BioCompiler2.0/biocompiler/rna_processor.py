# -*- coding: utf-8 -*-
"""
BioCompiler 2.0 - RNA Processor.

Recebe pre-mRNA, valida a gramatica didatica de splicing
GU ... A ... AG, remove introns validos e gera mRNA maduro com CAP 5'
e cauda poli-A de 100 adeninas.
"""

import unicodedata
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

RESULT_RNA_CORRECT = "CORRETO"
RESULT_RNA_INVALID_BASE = "BUG - base inválida"
RESULT_MISSING_5_SITE = "BUG - sítio 5' ausente"
RESULT_MISSING_3_SITE = "BUG - sítio 3' ausente"
RESULT_BRANCH_POINT = "BUG - branch point"

VALID_RNA_BASES = {"A", "U", "C", "G"}
INTRON_5_SITE = "GU"
INTRON_3_SITE = "AG"
CAP_5_MARKER = "m7Gppp"
POLY_A_LENGTH = 100
POLY_A_TAIL = "A" * POLY_A_LENGTH
MIN_BRANCH_DISTANCE = 10
MAX_BRANCH_DISTANCE = 30


def clean_rna_sequence(sequence: str) -> str:
    """Normaliza uma sequencia de RNA removendo espacos e controles."""
    if not sequence:
        return ""
    s = unicodedata.normalize("NFC", str(sequence))
    s = s.replace("\ufeff", "").replace("\u200b", "")
    s = s.replace("\r", "").replace("\n", "").replace("\t", " ")
    return "".join(s.split()).upper()


def validate_rna(sequence: str) -> Tuple[bool, Optional[str]]:
    """Verifica se a sequencia contem somente A, U, C e G."""
    s = clean_rna_sequence(sequence)
    if not s:
        return False, "Sequência vazia"
    for char in s:
        if char not in VALID_RNA_BASES:
            return False, char
    return True, None


@dataclass(frozen=True)
class Intron:
    """Representa um intron reconhecido pela gramatica simplificada."""

    start: int
    end: int
    branch_pos: int
    branch_distance: int
    sequence: str

    @property
    def terminal_ag_pos(self) -> int:
        return self.end - len(INTRON_3_SITE)


@dataclass
class RnaMaturationResult:
    """Resultado detalhado da maturacao do pre-mRNA."""

    raw_sequence: str
    clean_sequence: str
    status: str
    is_valid: bool
    entry_number: int = 1
    introns: List[Intron] = field(default_factory=list)
    spliced_mrna: str = ""
    mature_mrna: str = "NÃO GERADO"
    detail: str = ""
    error_location: str = ""
    error_snippet: str = ""
    qa_diagnostic: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entry_number": self.entry_number,
            "raw_sequence": self.raw_sequence,
            "sequence": self.clean_sequence,
            "status": self.status,
            "is_valid": self.is_valid,
            "introns": [
                {
                    "start": intron.start,
                    "end": intron.end,
                    "branch_pos": intron.branch_pos,
                    "branch_distance": intron.branch_distance,
                    "sequence": intron.sequence,
                }
                for intron in self.introns
            ],
            "spliced_mrna": self.spliced_mrna,
            "mature_mrna": self.mature_mrna,
            "detail": self.detail,
            "error_location": self.error_location,
            "error_snippet": self.error_snippet,
            "qa_diagnostic": self.qa_diagnostic,
        }


def _site_positions(sequence: str, site: str) -> List[int]:
    positions: List[int] = []
    start = 0
    while True:
        pos = sequence.find(site, start)
        if pos == -1:
            return positions
        positions.append(pos)
        start = pos + 1


def _valid_branch_positions(sequence: str, gu_pos: int, ag_pos: int) -> List[int]:
    left = max(gu_pos + len(INTRON_5_SITE), ag_pos - MAX_BRANCH_DISTANCE)
    right = ag_pos - MIN_BRANCH_DISTANCE
    if right < left:
        return []
    return [pos for pos in range(left, right + 1) if sequence[pos] == "A"]


def find_first_valid_intron(sequence: str) -> Optional[Intron]:
    """
    Localiza o primeiro intron que satisfaz GU ... A ... AG.

    O branch point A deve estar entre 10 e 30 nucleotideos antes do AG
    terminal, usando a posicao inicial do AG como referencia objetiva.
    """
    s = clean_rna_sequence(sequence)
    gu_positions = _site_positions(s, INTRON_5_SITE)
    ag_positions = _site_positions(s, INTRON_3_SITE)

    for gu_pos in gu_positions:
        for ag_pos in ag_positions:
            if ag_pos <= gu_pos + len(INTRON_5_SITE):
                continue
            branch_positions = _valid_branch_positions(s, gu_pos, ag_pos)
            if branch_positions:
                branch_pos = branch_positions[-1]
                end = ag_pos + len(INTRON_3_SITE)
                return Intron(
                    start=gu_pos,
                    end=end,
                    branch_pos=branch_pos,
                    branch_distance=ag_pos - branch_pos,
                    sequence=s[gu_pos:end],
                )
    return None


def _classify_splicing_error(sequence: str) -> Tuple[str, str, str, str]:
    gu_positions = _site_positions(sequence, INTRON_5_SITE)
    ag_positions = _site_positions(sequence, INTRON_3_SITE)

    if not gu_positions:
        if ag_positions:
            first_ag = ag_positions[0]
            loc = f"Sítio 3' AG encontrado nas posições {first_ag + 1} a {first_ag + 2}, sem GU anterior compatível"
            snippet = sequence[:first_ag] + "[" + sequence[first_ag:first_ag + 2] + "]" + sequence[first_ag + 2:]
        else:
            loc = "Nenhum sítio 5' GU foi encontrado na sequência"
            snippet = f"[{sequence}]"
        diag = "Existe sinal de término de intron sem um sítio 5' GU anterior capaz de iniciar o intron."
        return RESULT_MISSING_5_SITE, loc, snippet, diag

    if not ag_positions:
        first_gu = gu_positions[0]
        loc = f"Sítio 5' GU encontrado nas posições {first_gu + 1} a {first_gu + 2}, sem AG posterior compatível"
        snippet = sequence[:first_gu] + "[" + sequence[first_gu:first_gu + 2] + "]" + sequence[first_gu + 2:]
        diag = "O intron foi iniciado por GU, mas não há sítio 3' AG posterior para encerrá-lo."
        return RESULT_MISSING_3_SITE, loc, snippet, diag

    compatible_pairs = [
        (gu_pos, ag_pos)
        for gu_pos in gu_positions
        for ag_pos in ag_positions
        if ag_pos > gu_pos + len(INTRON_5_SITE)
    ]
    if not compatible_pairs:
        first_gu = gu_positions[0]
        first_ag = ag_positions[0]
        if first_ag < first_gu:
            loc = f"Sítio 3' AG encontrado nas posições {first_ag + 1} a {first_ag + 2}, sem GU anterior compatível"
            snippet = sequence[:first_ag] + "[" + sequence[first_ag:first_ag + 2] + "]" + sequence[first_ag + 2:]
            diag = "Existe sinal de término de intron antes de qualquer sítio 5' GU compatível."
            return RESULT_MISSING_5_SITE, loc, snippet, diag

        loc = f"Sítio 5' GU encontrado nas posições {first_gu + 1} a {first_gu + 2}, sem AG posterior compatível"
        snippet = sequence[:first_gu] + "[" + sequence[first_gu:first_gu + 2] + "]" + sequence[first_gu + 2:]
        diag = "O intron foi iniciado por GU, mas não há sítio 3' AG posterior para encerrá-lo."
        return RESULT_MISSING_3_SITE, loc, snippet, diag

    if compatible_pairs:
        gu_pos, ag_pos = compatible_pairs[0]
        loc = f"Entre GU nas posições {gu_pos + 1} a {gu_pos + 2} e AG nas posições {ag_pos + 1} a {ag_pos + 2}"
        snippet = (
            sequence[:gu_pos]
            + "["
            + sequence[gu_pos:ag_pos + len(INTRON_3_SITE)]
            + "]"
            + sequence[ag_pos + len(INTRON_3_SITE):]
        )
    else:
        loc = "Sítios GU e AG encontrados, mas sem par ordenado compatível"
        snippet = f"[{sequence}]"
    diag = "Não há adenina branch point entre 10 e 30 nucleotídeos antes do AG terminal do intron."
    return RESULT_BRANCH_POINT, loc, snippet, diag


def splice_introns(sequence: str) -> Tuple[str, List[Intron]]:
    """Remove todos os introns validos encontrados de forma iterativa."""
    current = clean_rna_sequence(sequence)
    removed: List[Intron] = []

    while True:
        intron = find_first_valid_intron(current)
        if intron is None:
            return current, removed
        removed.append(intron)
        current = current[:intron.start] + current[intron.end:]


def mature_pre_mrna(sequence: str, entry_number: int = 1) -> RnaMaturationResult:
    """Analisa e amadurece uma entrada de pre-mRNA."""
    raw_seq = sequence
    clean_seq = clean_rna_sequence(sequence)

    invalid_positions = [(idx + 1, char) for idx, char in enumerate(clean_seq) if char not in VALID_RNA_BASES]
    if invalid_positions:
        loc_list = [f"Posição {pos} (base '{char}')" for pos, char in invalid_positions]
        error_snip = "".join(f"[{char}]" if char not in VALID_RNA_BASES else char for char in clean_seq)
        first_invalid = invalid_positions[0][1]
        return RnaMaturationResult(
            raw_sequence=raw_seq,
            clean_sequence=clean_seq,
            status=RESULT_RNA_INVALID_BASE,
            is_valid=False,
            entry_number=entry_number,
            detail=f"Caractere inválido encontrado: '{first_invalid}'.",
            error_location=", ".join(loc_list),
            error_snippet=error_snip,
            qa_diagnostic="O pré-mRNA deve conter somente as bases A, U, C e G.",
        )

    first_intron = find_first_valid_intron(clean_seq)
    if first_intron is None:
        status, loc, snippet, diag = _classify_splicing_error(clean_seq)
        return RnaMaturationResult(
            raw_sequence=raw_seq,
            clean_sequence=clean_seq,
            status=status,
            is_valid=False,
            entry_number=entry_number,
            detail="A sequência não possui um intron válido no padrão GU ... A ... AG.",
            error_location=loc,
            error_snippet=snippet,
            qa_diagnostic=diag,
        )

    spliced, introns = splice_introns(clean_seq)
    mature = CAP_5_MARKER + spliced + POLY_A_TAIL
    intron_count = len(introns)
    plural = "s" if intron_count != 1 else ""

    return RnaMaturationResult(
        raw_sequence=raw_seq,
        clean_sequence=clean_seq,
        status=RESULT_RNA_CORRECT,
        is_valid=True,
        entry_number=entry_number,
        introns=introns,
        spliced_mrna=spliced,
        mature_mrna=mature,
        detail=f"{intron_count} intron{plural} removido{plural}; CAP 5' e cauda poli-A adicionadas.",
        error_location="Nenhum erro detectado",
        error_snippet="Sequência processada com splicing bem-sucedido",
        qa_diagnostic="A sequência atende à gramática GU ... A ... AG com branch point válido.",
    )


def classify_premrna(sequence: str) -> str:
    """Classificacao rapida para o BioCompiler 2.0."""
    return mature_pre_mrna(sequence).status


class BioCompiler2:
    """Processador de pre-mRNA do BioCompiler 2.0."""

    def analyze(self, sequence: str, entry_number: int = 1) -> RnaMaturationResult:
        return mature_pre_mrna(sequence, entry_number=entry_number)
