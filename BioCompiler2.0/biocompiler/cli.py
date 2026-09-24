# -*- coding: utf-8 -*-
"""CLI do BioCompiler: DNA Transcriber e RNA Processor."""

import os
import sys
from typing import List, Optional

from .core import BioCompiler, AnalysisResult
from .rna_processor import BioCompiler2, RnaMaturationResult, POLY_A_LENGTH


def _read_input_lines(filepath: str) -> List[str]:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Arquivo não encontrado: {filepath}")

    with open(filepath, "r", encoding="utf-8-sig") as file:
        return [
            line.strip()
            for line in file
            if line.strip() and not line.lstrip().startswith("#")
        ]


def format_screen_output(results: List[AnalysisResult]) -> str:
    """Formata a saída detalhada do BioCompiler 1.0 - DNA Transcriber."""
    lines = [
        "========================================",
        "BIOCOMPILER 1.0 - DNA TRANSCRIBER",
        "RELATÓRIO DE AVALIAÇÃO DE SEQUÊNCIA DE DNA",
        "========================================",
    ]

    for res in results:
        lines.append(f"ENTRADA: {res.entry_number}")
        lines.append(f"SEQUÊNCIA INSERIDA: {res.raw_sequence}")
        if res.is_valid:
            start_pos_human = res.start_pos + 1
            stop_pos_human = res.stop_pos + 1
            lines.append("STATUS: CORRETO")
            lines.append("Bases: OK")
            lines.append(f"START: ATG - OK (Posição {start_pos_human} a {start_pos_human + 2})")
            lines.append(f"Quadro de leitura: OK ({res.codon_count} códons)")
            lines.append(f"STOP: {res.stop_codon} - OK (Posição {stop_pos_human} a {stop_pos_human + 2})")
            lines.append("Transcrição: OK")
            lines.append(f"pré-mRNA: {res.pre_mrna}")
        else:
            lines.append("STATUS: ERRO")
            lines.append(f"TIPO: {res.status}")
            if res.error_location:
                lines.append(f"LOCALIZAÇÃO DO ERRO: {res.error_location}")
            if res.error_snippet:
                lines.append(f"TRECHO DO ERRO: {res.error_snippet}")
            if res.qa_diagnostic:
                lines.append(f"DIAGNÓSTICO: {res.qa_diagnostic}")
            lines.append("pré-mRNA: NÃO GERADO")
        lines.append("----------------------------------------")

    return "\n".join(lines)


def export_results_file(
    results: List[AnalysisResult],
    output_filepath: str = "resultados.txt",
) -> str:
    """Exporta resultados do DNA Transcriber no formato de correção automática."""
    lines = ["linha;status;resultado;pre_mRNA"]
    for res in results:
        status_field = "OK" if res.is_valid else "ERRO"
        pre_mrna_field = res.pre_mrna if res.is_valid else "NÃO GERADO"
        lines.append(f"{res.entry_number};{status_field};{res.status};{pre_mrna_field}")

    with open(output_filepath, "w", encoding="utf-8") as file:
        file.write("\n".join(lines) + "\n")

    return output_filepath


def process_file(
    filepath: str,
    output_filepath: Optional[str] = "resultados.txt",
    reference_seq: Optional[str] = None,
) -> List[AnalysisResult]:
    """Processa um arquivo com uma sequência de DNA por linha."""
    lines = _read_input_lines(filepath)
    compiler = BioCompiler(reference_dna=reference_seq)
    results = [
        compiler.analyze(sequence, entry_number=index)
        for index, sequence in enumerate(lines, start=1)
    ]

    if output_filepath:
        export_results_file(results, output_filepath)

    return results


def format_rna_processor_output(results: List[RnaMaturationResult]) -> str:
    """Formata a saída detalhada do BioCompiler 2.0 - RNA Processor."""
    lines = [
        "========================================",
        "BIOCOMPILER 2.0 - RNA PROCESSOR",
        "========================================",
    ]

    for res in results:
        lines.append(f"ENTRADA: {res.entry_number}")
        lines.append(f"SEQUÊNCIA INSERIDA: {res.raw_sequence}")
        if res.is_valid:
            lines.append("STATUS: CORRETO")
            lines.append("Sítio 5': OK")
            lines.append("Branch point: OK")
            lines.append("Sítio 3': OK")
            lines.append("Splicing: OK")
            lines.append("CAP 5': ADICIONADA")
            lines.append(f"Cauda poli-A: {POLY_A_LENGTH} A")
            lines.append(f"Íntrons removidos: {len(res.introns)}")
            lines.append(f"mRNA MADURO: {res.mature_mrna}")
        else:
            lines.append("STATUS: ERRO")
            lines.append(f"TIPO: {res.status}")
            if res.error_location:
                lines.append(f"LOCALIZAÇÃO DO ERRO: {res.error_location}")
            if res.error_snippet:
                lines.append(f"TRECHO DO ERRO: {res.error_snippet}")
            if res.qa_diagnostic:
                lines.append(f"DIAGNÓSTICO: {res.qa_diagnostic}")
            lines.append("mRNA MADURO: NÃO GERADO")
        lines.append("----------------------------------------")

    return "\n".join(lines)


def export_rna_processor_results_file(
    results: List[RnaMaturationResult],
    output_filepath: str = "resultados.txt",
) -> str:
    """Exporta resultados do RNA Processor no formato de correção automática."""
    lines = ["linha;status;resultado;mRNA_maduro"]
    for res in results:
        status_field = "OK" if res.is_valid else "ERRO"
        mature_field = res.mature_mrna if res.is_valid else "NÃO GERADO"
        lines.append(f"{res.entry_number};{status_field};{res.status};{mature_field}")

    with open(output_filepath, "w", encoding="utf-8") as file:
        file.write("\n".join(lines) + "\n")

    return output_filepath


def process_premrna_file(
    filepath: str,
    output_filepath: Optional[str] = "resultados.txt",
) -> List[RnaMaturationResult]:
    """Processa um arquivo com uma sequência de pré-mRNA por linha."""
    lines = _read_input_lines(filepath)
    processor = BioCompiler2()
    results = [
        processor.analyze(sequence, entry_number=index)
        for index, sequence in enumerate(lines, start=1)
    ]

    if output_filepath:
        export_rna_processor_results_file(results, output_filepath)

    return results


def _run_dna_demo() -> None:
    demo_cases = [
        "ATGGCTAAACCGTAA",
        "ATGGCTXAACCGTAA",
        "CCCGCTAAACCGTAA",
        "ATGGCTAAACCGGGC",
        "ATGGCTAAAACCGTAA",
        "ATGGCTTAACCGGGCTAA",
    ]
    compiler = BioCompiler()
    results = [
        compiler.analyze(sequence, entry_number=index)
        for index, sequence in enumerate(demo_cases, start=1)
    ]
    print(format_screen_output(results))
    export_results_file(results, "resultados.txt")
    print("\n[Arquivo exportado com sucesso: resultados.txt]")


def _run_rna_demo() -> None:
    demo_cases = [
        "CCUAUGGCUGUAACCUUUAACUAACAAGAUGGCCUAC",
        "CCCCCCCCACCCCCCCCCCAGCCC",
        "CCCGUCCCCACCCCCCCCCCCCCCC",
        "CCCGUCCCCCCCCCCCCCCCCAGCCC",
    ]
    processor = BioCompiler2()
    results = [
        processor.analyze(sequence, entry_number=index)
        for index, sequence in enumerate(demo_cases, start=1)
    ]
    print(format_rna_processor_output(results))
    export_rna_processor_results_file(results, "resultados.txt")
    print("\n[Arquivo exportado com sucesso: resultados.txt]")


def _print_usage() -> None:
    print("BioCompiler - DNA Transcriber / RNA Processor")
    print("Uso:")
    print("  python main.py --dna <arquivo_dna.txt> [arquivo_saida.txt]")
    print("  python main.py --rna <arquivo_premrna.txt> [arquivo_saida.txt]")
    print("  python main.py --biocompiler2 <arquivo_premrna.txt> [arquivo_saida.txt]")
    print("  python main.py --demo-dna")
    print("  python main.py --demo-rna")
    print("  python main.py --demo")


def run_cli() -> None:
    args = sys.argv[1:]

    if not args or args[0] in {"-h", "--help"}:
        _print_usage()
        return

    if args[0] == "--demo":
        _run_rna_demo()
        return

    if args[0] == "--demo-dna":
        _run_dna_demo()
        return

    if args[0] == "--demo-rna":
        _run_rna_demo()
        return

    if args[0] == "--dna":
        if len(args) < 2:
            raise ValueError("Uso: python main.py --dna <arquivo_dna.txt> [arquivo_saida.txt]")
        filepath = args[1]
        out_file = args[2] if len(args) > 2 else "resultados.txt"
        results = process_file(filepath, output_filepath=out_file)
        print(format_screen_output(results))
        print(f"\n[Arquivo exportado com sucesso: {out_file}]")
        return

    if args[0] in {"--rna", "--biocompiler2"}:
        if len(args) < 2:
            raise ValueError("Uso: python main.py --rna <arquivo_premrna.txt> [arquivo_saida.txt]")
        filepath = args[1]
        out_file = args[2] if len(args) > 2 else "resultados.txt"
        results = process_premrna_file(filepath, output_filepath=out_file)
        print(format_rna_processor_output(results))
        print(f"\n[Arquivo exportado com sucesso: {out_file}]")
        return

    filepath = args[0]
    out_file = args[1] if len(args) > 1 else "resultados.txt"
    results = process_premrna_file(filepath, output_filepath=out_file)
    print(format_rna_processor_output(results))
    print(f"\n[Arquivo exportado com sucesso: {out_file}]")
