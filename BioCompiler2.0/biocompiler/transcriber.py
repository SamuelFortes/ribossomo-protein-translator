# -*- coding: utf-8 -*-
"""
Módulo de Transcrição e Tradução do BioCompiler
- Transcrição: DNA -> pré-mRNA (substituindo Timina 'T' por Uracila 'U')
- Tradução: mRNA -> Proteína (tabela universal do código genético)
"""

from typing import List

GENETIC_CODE = {
    # Fenilalanina / Leucina
    "UUU": "Phe", "UUC": "Phe", "UUA": "Leu", "UUG": "Leu",
    "CUU": "Leu", "CUC": "Leu", "CUA": "Leu", "CUG": "Leu",
    # Isoleucina / Metionina (START)
    "AUU": "Ile", "AUC": "Ile", "AUA": "Ile", "AUG": "Met",
    # Valina
    "GUU": "Val", "GUC": "Val", "GUA": "Val", "GUG": "Val",
    # Serina
    "UCU": "Ser", "UCC": "Ser", "UCA": "Ser", "UCG": "Ser",
    "AGU": "Ser", "AGC": "Ser",
    # Prolina
    "CCU": "Pro", "CCC": "Pro", "CCA": "Pro", "CCG": "Pro",
    # Treonina
    "ACU": "Thr", "ACC": "Thr", "ACA": "Thr", "ACG": "Thr",
    # Alanina
    "GCU": "Ala", "GCC": "Ala", "GCA": "Ala", "GCG": "Ala",
    # Tirosina / STOP
    "UAU": "Tyr", "UAC": "Tyr", "UAA": "STOP", "UAG": "STOP",
    # Histidina / Glutamina
    "CAU": "His", "CAC": "His", "CAA": "Gln", "CAG": "Gln",
    # Asparagina / Lisina
    "AAU": "Asn", "AAC": "Asn", "AAA": "Lys", "AAG": "Lys",
    # Ácido Aspártico / Ácido Glutâmico
    "GAU": "Asp", "GAC": "Asp", "GAA": "Glu", "GAG": "Glu",
    # Cisteína / STOP / Triptofano
    "UGU": "Cys", "UGC": "Cys", "UGA": "STOP", "UGG": "Trp",
    # Arginina
    "CGU": "Arg", "CGC": "Arg", "CGA": "Arg", "CGG": "Arg",
    "AGA": "Arg", "AGG": "Arg",
    # Glicina
    "GGU": "Gly", "GGC": "Gly", "GGA": "Gly", "GGG": "Gly",
}


def transcribe(dna_sequence: str) -> str:
    """
    Transcreve uma sequência de DNA para pré-mRNA, substituindo T por U (e t por u).
    Preserva espaços se fornecidos na formatação.
    """
    if not dna_sequence:
        return ""
    return dna_sequence.replace("T", "U").replace("t", "u")


def translate_codons(mrna_or_dna: str) -> List[str]:
    """
    Converte uma sequência de mRNA ou DNA em lista de aminoácidos correspondentes.
    """
    rna = transcribe("".join(mrna_or_dna.split()).upper())
    amino_acids = []
    for i in range(0, len(rna), 3):
        codon = rna[i:i + 3]
        if len(codon) == 3:
            aa = GENETIC_CODE.get(codon, "?")
            amino_acids.append(aa)
            if aa == "STOP":
                break
    return amino_acids


def translate(mrna_or_dna: str, separator: str = " - ") -> str:
    """
    Traduz uma sequência de mRNA ou DNA para a representação textual da proteína.
    Exemplo: 'AUG GAA CCG UAA' -> 'Met - Glu - Pro - STOP'
    """
    aa_list = translate_codons(mrna_or_dna)
    return separator.join(aa_list)
