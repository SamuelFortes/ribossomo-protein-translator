# -*- coding: utf-8 -*-
"""Domain logic for Ribossomo 1.0 - Protein Translator."""

from __future__ import annotations

from typing import Any, Dict, List

CAP_5_MARKER = "m7Gppp"
POLY_A_LENGTH = 100
POLY_A_TAIL = "A" * POLY_A_LENGTH
START_CODON = "AUG"
STOP_CODONS = {"UAA", "UAG", "UGA"}

RESULT_CORRECT = "CORRETO"
RESULT_CAP_5 = "BUG - CAP 5'"
RESULT_START_MISSING = "BUG - START ausente"
RESULT_STOP_MISSING = "BUG - STOP ausente"
RESULT_READING_FRAME = "BUG - quadro de leitura"
RESULT_POLY_A = "BUG - cauda poli -A"
PROTEIN_NOT_GENERATED = "NÃO GERADA"

AMINO_ACID_MAP: Dict[str, Dict[str, str]] = {
    "Met": {"code3": "Met", "code1": "M", "namePt": "Metionina", "nameEn": "Methionine", "property": "special", "color": "#10b981"},
    "Ala": {"code3": "Ala", "code1": "A", "namePt": "Alanina", "nameEn": "Alanine", "property": "hydrophobic", "color": "#3b82f6"},
    "Arg": {"code3": "Arg", "code1": "R", "namePt": "Arginina", "nameEn": "Arginine", "property": "positive", "color": "#8b5cf6"},
    "Asn": {"code3": "Asn", "code1": "N", "namePt": "Asparagina", "nameEn": "Asparagine", "property": "polar", "color": "#06b6d4"},
    "Asp": {"code3": "Asp", "code1": "D", "namePt": "Aspartato", "nameEn": "Aspartate", "property": "negative", "color": "#ef4444"},
    "Cys": {"code3": "Cys", "code1": "C", "namePt": "Cisteína", "nameEn": "Cysteine", "property": "special", "color": "#eab308"},
    "Gln": {"code3": "Gln", "code1": "Q", "namePt": "Glutamina", "nameEn": "Glutamine", "property": "polar", "color": "#06b6d4"},
    "Glu": {"code3": "Glu", "code1": "E", "namePt": "Glutamato", "nameEn": "Glutamate", "property": "negative", "color": "#ef4444"},
    "Gly": {"code3": "Gly", "code1": "G", "namePt": "Glicina", "nameEn": "Glycine", "property": "special", "color": "#64748b"},
    "His": {"code3": "His", "code1": "H", "namePt": "Histidina", "nameEn": "Histidine", "property": "positive", "color": "#8b5cf6"},
    "Ile": {"code3": "Ile", "code1": "I", "namePt": "Isoleucina", "nameEn": "Isoleucine", "property": "hydrophobic", "color": "#3b82f6"},
    "Leu": {"code3": "Leu", "code1": "L", "namePt": "Leucina", "nameEn": "Leucine", "property": "hydrophobic", "color": "#3b82f6"},
    "Lys": {"code3": "Lys", "code1": "K", "namePt": "Lisina", "nameEn": "Lysine", "property": "positive", "color": "#8b5cf6"},
    "Phe": {"code3": "Phe", "code1": "F", "namePt": "Fenilalanina", "nameEn": "Phenylalanine", "property": "hydrophobic", "color": "#3b82f6"},
    "Pro": {"code3": "Pro", "code1": "P", "namePt": "Prolina", "nameEn": "Proline", "property": "special", "color": "#f97316"},
    "Ser": {"code3": "Ser", "code1": "S", "namePt": "Serina", "nameEn": "Serine", "property": "polar", "color": "#14b8a6"},
    "Thr": {"code3": "Thr", "code1": "T", "namePt": "Treonina", "nameEn": "Threonine", "property": "polar", "color": "#14b8a6"},
    "Trp": {"code3": "Trp", "code1": "W", "namePt": "Triptofano", "nameEn": "Tryptophan", "property": "hydrophobic", "color": "#6366f1"},
    "Tyr": {"code3": "Tyr", "code1": "Y", "namePt": "Tirosina", "nameEn": "Tyrosine", "property": "polar", "color": "#ec4899"},
    "Val": {"code3": "Val", "code1": "V", "namePt": "Valina", "nameEn": "Valine", "property": "hydrophobic", "color": "#3b82f6"},
    "STOP": {"code3": "STOP", "code1": "*", "namePt": "Códon de Término", "nameEn": "Stop Codon", "property": "stop", "color": "#f43f5e"},
}

GENETIC_CODE: Dict[str, str] = {
    "UUU": "Phe", "UUC": "Phe", "UUA": "Leu", "UUG": "Leu",
    "CUU": "Leu", "CUC": "Leu", "CUA": "Leu", "CUG": "Leu",
    "AUU": "Ile", "AUC": "Ile", "AUA": "Ile", "AUG": "Met",
    "GUU": "Val", "GUC": "Val", "GUA": "Val", "GUG": "Val",
    "UCU": "Ser", "UCC": "Ser", "UCA": "Ser", "UCG": "Ser",
    "CCU": "Pro", "CCC": "Pro", "CCA": "Pro", "CCG": "Pro",
    "ACU": "Thr", "ACC": "Thr", "ACA": "Thr", "ACG": "Thr",
    "GCU": "Ala", "GCC": "Ala", "GCA": "Ala", "GCG": "Ala",
    "UAU": "Tyr", "UAC": "Tyr", "UAA": "STOP", "UAG": "STOP",
    "CAU": "His", "CAC": "His", "CAA": "Gln", "CAG": "Gln",
    "AAU": "Asn", "AAC": "Asn", "AAA": "Lys", "AAG": "Lys",
    "GAU": "Asp", "GAC": "Asp", "GAA": "Glu", "GAG": "Glu",
    "UGU": "Cys", "UGC": "Cys", "UGA": "STOP", "UGG": "Trp",
    "CGU": "Arg", "CGC": "Arg", "CGA": "Arg", "CGG": "Arg",
    "AGU": "Ser", "AGC": "Ser", "AGA": "Arg", "AGG": "Arg",
    "GGU": "Gly", "GGC": "Gly", "GGA": "Gly", "GGG": "Gly",
}

OFFICIAL_TEST_CASES: List[Dict[str, Any]] = [
    {
        "id": 1,
        "name": "14.1 CORRETO",
        "expectedResult": RESULT_CORRECT,
        "expectedProtein": "Met-Ala-Lys-Pro",
        "sequence": CAP_5_MARKER + "CCAUGGCUAAACCGUAAGG" + POLY_A_TAIL,
    },
    {
        "id": 2,
        "name": "14.2 BUG - CAP 5'",
        "expectedResult": RESULT_CAP_5,
        "expectedProtein": PROTEIN_NOT_GENERATED,
        "sequence": "CCAUGGCUAAACCGUAAGG" + POLY_A_TAIL,
    },
    {
        "id": 3,
        "name": "14.3 BUG - START ausente",
        "expectedResult": RESULT_START_MISSING,
        "expectedProtein": PROTEIN_NOT_GENERATED,
        "sequence": CAP_5_MARKER + "CCGCCGCUAAACCGUAAGG" + POLY_A_TAIL,
    },
    {
        "id": 4,
        "name": "14.4 BUG - STOP ausente",
        "expectedResult": RESULT_STOP_MISSING,
        "expectedProtein": PROTEIN_NOT_GENERATED,
        "sequence": CAP_5_MARKER + "CCAUGGCUAAACCGGGCGG" + POLY_A_TAIL,
    },
    {
        "id": 5,
        "name": "14.5 BUG - quadro de leitura",
        "expectedResult": RESULT_READING_FRAME,
        "expectedProtein": PROTEIN_NOT_GENERATED,
        "sequence": CAP_5_MARKER + "CCAUGGCUAAAACCGUAAGG" + POLY_A_TAIL,
    },
    {
        "id": 6,
        "name": "14.6 BUG - cauda poli -A",
        "expectedResult": RESULT_POLY_A,
        "expectedProtein": PROTEIN_NOT_GENERATED,
        "sequence": CAP_5_MARKER + "CCAUGGCUAAACCGUAAGG" + ("A" * 80),
    },
]


def _base_result(entry_number: int, raw: str) -> Dict[str, Any]:
    return {
        "entryNumber": entry_number,
        "rawSequence": raw,
        "status": "OK",
        "result": RESULT_CORRECT,
        "protein": PROTEIN_NOT_GENERATED,
        "aminoAcids": [],
        "cap5Valid": False,
        "cap5Found": "",
        "startValid": False,
        "startCodon": "",
        "startIndex": -1,
        "readingFrameValid": False,
        "stopValid": False,
        "stopCodon": "",
        "stopIndex": -1,
        "polyAValid": False,
        "polyALength": 0,
        "translationValid": False,
        "utr5": "",
        "codingRna": "",
        "utr3": "",
        "polyATail": "",
        "codons": [],
        "diagnosticSummary": "",
        "didacticExplanation": "",
        "biologicalContext": "",
    }


def _cap5_found(raw: str) -> str:
    prefix = []
    for char in raw:
        if char.isalnum() or char == "_":
            prefix.append(char)
        else:
            break
    return "".join(prefix)[:10] or "Ausente"


def _count_trailing_as(sequence: str) -> int:
    count = 0
    for char in reversed(sequence):
        if char != "A":
            return count
        count += 1
    return count


def _normalize_poly_a_count(after_cap: str, trailing_a_count: int) -> int:
    """Avoid counting terminal A bases that belong to UAA/UGA STOP codons."""
    if trailing_a_count not in {101, 102}:
        return trailing_a_count

    assumed_core = after_cap[:-POLY_A_LENGTH]
    last_codon = assumed_core[-3:]
    excess = trailing_a_count - POLY_A_LENGTH
    expected_excess = 2 if last_codon == "UAA" else 1 if last_codon == "UGA" else 0
    if expected_excess != excess:
        return trailing_a_count

    aug_pos = assumed_core.find(START_CODON)
    if aug_pos == -1 or (len(assumed_core) - 3 - aug_pos) % 3 != 0:
        return trailing_a_count

    first_stop_pos = -1
    for pos in range(aug_pos, len(assumed_core) - 2, 3):
        if assumed_core[pos:pos + 3] in STOP_CODONS:
            first_stop_pos = pos
            break

    if first_stop_pos == len(assumed_core) - 3:
        return POLY_A_LENGTH
    return trailing_a_count


def _codon_detail(codon: str, full_seq_pos: int, in_frame: bool, codon_type: str) -> Dict[str, Any]:
    amino_acid = GENETIC_CODE.get(codon, "???")
    amino_info = AMINO_ACID_MAP.get(amino_acid, {})
    return {
        "codon": codon,
        "aminoAcid": amino_acid,
        "name": amino_info.get("namePt", amino_acid),
        "fullSeqPos": full_seq_pos,
        "inFrame": in_frame,
        "type": codon_type,
        "color": amino_info.get("color", "#94a3b8"),
    }


def analyze_mrna(sequence: str, entry_number: int = 1) -> Dict[str, Any]:
    """Analyze one mature mRNA and return the JSON shape consumed by the frontend."""
    raw = str(sequence).strip()
    result = _base_result(entry_number, raw)

    if not raw.startswith(CAP_5_MARKER):
        result.update(
            {
                "status": "ERRO",
                "result": RESULT_CAP_5,
                "cap5Found": _cap5_found(raw),
                "diagnosticSummary": "A extremidade 5' não possui a representação obrigatória m7Gppp.",
                "didacticExplanation": "Nos eucariotos, o CAP 5' (7-metilguanosina trifosfato) é adicionado durante a transcrição. Ele é indispensável para que o ribossomo (subunidade 40S/eIFs) reconheça o início do RNA mensageiro e protege contra a degradação rápida por exonucleases.",
                "biologicalContext": "Sem o CAP 5', o complexo de pré-iniciação ribossômico não consegue ancorar na fita de mRNA.",
            }
        )
        return result

    result.update({"cap5Valid": True, "cap5Found": CAP_5_MARKER})
    after_cap = raw[len(CAP_5_MARKER):]

    trailing_a_count = _normalize_poly_a_count(after_cap, _count_trailing_as(after_cap))
    result["polyALength"] = trailing_a_count

    if trailing_a_count != POLY_A_LENGTH:
        result.update(
            {
                "status": "ERRO",
                "result": RESULT_POLY_A,
                "polyATail": "A" * _count_trailing_as(after_cap),
                "diagnosticSummary": f"Cauda poli-A inválida: encontrada extremidade com {trailing_a_count} adeninas (A), quando são exigidas exatamente 100 A.",
                "didacticExplanation": "A cauda poli-A é adicionada pela poli-A polimerase na extremidade 3'. Ela confere estabilidade ao transcrito e atua como um 'relógio biológico' da molécula de mRNA, além de facilitar a exportação do núcleo e o término da tradução.",
                "biologicalContext": "Sem a cauda poli-A canônica (100 A), o mRNA pode ser instável, suscetível a ataque de nucleases 3'->5' ou mal processado.",
            }
        )
        return result

    result.update({"polyAValid": True, "polyATail": POLY_A_TAIL})
    core_rna = after_cap[:-POLY_A_LENGTH]

    aug_pos = core_rna.find(START_CODON)
    if aug_pos == -1:
        result.update(
            {
                "status": "ERRO",
                "result": RESULT_START_MISSING,
                "startCodon": START_CODON,
                "utr5": core_rna,
                "diagnosticSummary": "Nenhum códon de iniciação 'AUG' foi encontrado na região intermediária do mRNA maduro.",
                "didacticExplanation": "O ribossomo necessita de um sinal inequívoco para iniciar a síntese proteica. Esse sinal universal é o códon AUG, decodificado por um tRNA especial carregando Metionina (Met). Na ausência de AUG, o ribossomo percorre a sequência sem iniciar a cadeia.",
                "biologicalContext": "Mutação no códon iniciador impede a montagem do sítio P e o início do alongamento polipeptídico.",
            }
        )
        return result

    result.update({"startValid": True, "startCodon": START_CODON, "startIndex": aug_pos, "utr5": core_rna[:aug_pos]})
    rna_from_aug = core_rna[aug_pos:]
    found_codons: List[str] = []
    stop_codon = ""
    stop_index = -1

    for offset in range(0, len(rna_from_aug), 3):
        triplet = rna_from_aug[offset:offset + 3]
        if len(triplet) != 3:
            continue
        found_codons.append(triplet)
        if triplet in STOP_CODONS:
            stop_codon = triplet
            stop_index = aug_pos + offset
            break

    if stop_codon:
        translated_amino_acids: List[str] = []
        codons: List[Dict[str, Any]] = []
        for index, codon in enumerate(found_codons):
            is_stop = codon in STOP_CODONS
            is_start = index == 0 and codon == START_CODON
            codon_type = "start" if is_start else "stop" if is_stop else "sense"
            codons.append(_codon_detail(codon, aug_pos + index * 3, True, codon_type))
            if not is_stop:
                translated_amino_acids.append(GENETIC_CODE.get(codon, "???"))

        protein = "-".join(translated_amino_acids)
        coding_rna = core_rna[aug_pos:stop_index + 3]
        utr3 = core_rna[stop_index + 3:]
        result.update(
            {
                "status": "OK",
                "result": RESULT_CORRECT,
                "protein": protein,
                "aminoAcids": translated_amino_acids,
                "readingFrameValid": True,
                "stopValid": True,
                "stopCodon": stop_codon,
                "stopIndex": stop_index,
                "translationValid": True,
                "codingRna": coding_rna,
                "utr3": utr3,
                "codons": codons,
                "diagnosticSummary": f"Tradução concluída com sucesso! Proteína gerada com {len(translated_amino_acids)} aminoácidos ({protein}).",
                "didacticExplanation": f"O ribossomo identificou a 5' UTR ({len(result['utr5'])} nt), iniciou no códon AUG ({START_CODON}), leu {len(found_codons) - 1} trincas em fase, encontrou o sinal de parada {stop_codon} e finalizou na 3' UTR antes da cauda poli-A.",
                "biologicalContext": "Expressão gênica perfeita: a proteína funcional foi sintetizada sem anomalias conformacionais ou mutações deletérias.",
            }
        )
        return result

    total_from_aug_to_end = len(after_cap) - aug_pos
    frame_completes = total_from_aug_to_end % 3 == 0
    any_out_of_frame_stop = False
    out_of_frame_stop = ""
    for stop in ("UAA", "UAG", "UGA"):
        if stop in rna_from_aug:
            any_out_of_frame_stop = True
            out_of_frame_stop = stop
            break

    codons = [
        _codon_detail(codon, aug_pos + index * 3, False, "start" if index == 0 else "sense")
        for index, codon in enumerate(found_codons)
    ]

    if frame_completes:
        error_result = RESULT_STOP_MISSING
        diagnostic_summary = "Nenhum códon de parada (UAA, UAG ou UGA) foi encontrado na sequência após o AUG."
        didactic_explanation = "A terminação requer o reconhecimento de um códon de parada pelos fatores de liberação (eRF1/eRF3). Sem STOP, o ribossomo continua traduzindo indefinidamente até 'emperrar' na cauda poli-A, disparando o mecanismo de Non-Stop Decay."
        biological_context = "A ausência de sinal de parada impede o término regulado e a liberação da cadeia polipeptídica no citoplasma."
    else:
        error_result = RESULT_READING_FRAME
        diagnostic_summary = (
            f"Erro de matriz de leitura: o códon de parada ({out_of_frame_stop}) existe na sequência, mas está fora da fase de leitura em trincas (frameshift)."
            if any_out_of_frame_stop
            else "Erro de matriz de leitura: a região após o AUG, incluindo a cauda poli-A, não fecha em trincas completas (frameshift)."
        )
        didactic_explanation = "A leitura do ribossomo é estritamente não sobreposta e ocorre em trincas (quadro de leitura). Se houver inserção ou deleção de bases em número não múltiplo de 3, toda a fase é deslocada, fazendo com que o STOP não seja lido corretamente."
        biological_context = "Mutações frameshift costumam ser catastróficas, gerando proteínas aberrantes ou degradação pelo mecanismo de vigilância do mRNA (NMD)."

    result.update(
        {
            "status": "ERRO",
            "result": error_result,
            "codingRna": core_rna[aug_pos:],
            "codons": codons,
            "diagnosticSummary": diagnostic_summary,
            "didacticExplanation": didactic_explanation,
            "biologicalContext": biological_context,
        }
    )
    return result


def analyze_batch(sequences: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    return {"results": [analyze_mrna(sequence, index) for index, sequence in enumerate(sequences, start=1)]}


def generate_export_content(analyses: List[Dict[str, Any]]) -> str:
    lines = ["linha;status;resultado;proteina"]
    for analysis in analyses:
        lines.append(
            f"{analysis['entryNumber']};{analysis['status']};{analysis['result']};{analysis['protein']}"
        )
    return "\n".join(lines)


def format_screen_report(analysis: Dict[str, Any]) -> str:
    if analysis["status"] == "OK":
        lines = [
            "========================================",
            "RIBOSSOMO - PROTEIN TRANSLATOR",
            "========================================",
            f"ENTRADA: {analysis['entryNumber']}",
            "STATUS: CORRETO",
            "CAP 5': OK",
            f"START: {analysis['startCodon']} - OK",
            "Quadro de leitura: OK",
            f"STOP: {analysis['stopCodon']} - OK",
            f"Cauda poli -A: {analysis['polyALength']} A - OK",
            "Tradução: OK",
            f"PROTEÍNA: {analysis['protein']}",
            "----------------------------------------",
        ]
    else:
        lines = [
            "========================================",
            "RIBOSSOMO - PROTEIN TRANSLATOR",
            "========================================",
            f"ENTRADA: {analysis['entryNumber']}",
            "STATUS: ERRO",
            f"TIPO: {analysis['result']}",
            f"PROTEÍNA: {PROTEIN_NOT_GENERATED}",
            "----------------------------------------",
        ]
    return "\n".join(lines)
