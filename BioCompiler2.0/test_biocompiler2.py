# -*- coding: utf-8 -*-
"""Testes do BioCompiler: DNA Transcriber e RNA Processor."""

import os
import tempfile
import unittest
from collections import Counter

from biocompiler import (
    BioCompiler,
    BioCompiler2,
    CAP_5_MARKER,
    POLY_A_LENGTH,
    POLY_A_TAIL,
    RESULT_CORRECT,
    RESULT_INVALID_BASE,
    RESULT_MISSING_START,
    RESULT_BRANCH_POINT,
    RESULT_MISSING_3_SITE,
    RESULT_MISSING_5_SITE,
    RESULT_RNA_CORRECT,
    RESULT_RNA_INVALID_BASE,
)
from biocompiler.cli import (
    export_results_file,
    export_rna_processor_results_file,
    format_screen_output,
    format_rna_processor_output,
    process_file,
    process_premrna_file,
)


ROOT_DIR = os.path.dirname(__file__)
OFFICIAL_INPUT = os.path.join(ROOT_DIR, "BioCompiler2_entrada_40_casos_modelo_oficial.txt")


class TestBioCompilerDNAProcessor(unittest.TestCase):
    def test_dna_correto_gera_premrna(self):
        result = BioCompiler().analyze("ATGGCTAAACCGTAA")

        self.assertEqual(result.status, RESULT_CORRECT)
        self.assertTrue(result.is_valid)
        self.assertEqual(result.pre_mrna, "AUGGCUAAACCGUAA")

        output = format_screen_output([result])
        self.assertIn("BIOCOMPILER 1.0 - DNA TRANSCRIBER", output)
        self.assertIn("pré-mRNA: AUGGCUAAACCGUAA", output)

    def test_dna_base_invalida(self):
        result = BioCompiler().analyze("ATGGCTXAACCGTAA")

        self.assertEqual(result.status, RESULT_INVALID_BASE)
        self.assertFalse(result.is_valid)
        self.assertIn("[X]", result.error_snippet)

    def test_dna_start_ausente(self):
        result = BioCompiler().analyze("CCCGCTAAACCGTAA")

        self.assertEqual(result.status, RESULT_MISSING_START)
        self.assertFalse(result.is_valid)

    def test_exportacao_dna_em_lote(self):
        entries = [
            "ATGGCTAAACCGTAA",
            "ATGGCTXAACCGTAA",
        ]
        with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8") as input_file:
            input_file.write("\n".join(entries) + "\n")
            input_path = input_file.name

        with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8") as output_file:
            output_path = output_file.name

        try:
            results = process_file(input_path, output_filepath=output_path)
            self.assertEqual(len(results), 2)
            self.assertEqual(results[0].status, RESULT_CORRECT)
            self.assertEqual(results[1].status, RESULT_INVALID_BASE)

            with open(output_path, "r", encoding="utf-8") as file:
                lines = [line.strip() for line in file if line.strip()]
            self.assertEqual(lines[0], "linha;status;resultado;pre_mRNA")
            self.assertEqual(lines[1], "1;OK;CORRETO;AUGGCUAAACCGUAA")
            self.assertEqual(lines[2], "2;ERRO;BUG - base inválida;NÃO GERADO")

            export_results_file(results, output_path)
        finally:
            for path in (input_path, output_path):
                if os.path.exists(path):
                    os.remove(path)


class TestBioCompiler2RNAProcessor(unittest.TestCase):
    def test_caso_1_correto_matura_premrna(self):
        sequence = "CCUAUGGCUGUAACCUUUAACUAACAAGAUGGCCUAC"
        result = BioCompiler2().analyze(sequence)

        self.assertEqual(result.status, RESULT_RNA_CORRECT)
        self.assertTrue(result.is_valid)
        self.assertEqual(len(result.introns), 1)
        self.assertTrue(result.mature_mrna.startswith(CAP_5_MARKER))
        self.assertTrue(result.mature_mrna.endswith(POLY_A_TAIL))
        self.assertEqual(
            len(result.mature_mrna),
            len(CAP_5_MARKER) + len(result.spliced_mrna) + POLY_A_LENGTH,
        )

        output = format_rna_processor_output([result])
        self.assertIn("BIOCOMPILER 2.0 - RNA PROCESSOR", output)
        self.assertIn("CAP 5': ADICIONADA", output)
        self.assertIn("Cauda poli-A: 100 A", output)
        self.assertIn("mRNA MADURO:", output)

    def test_caso_2_sitio_5_ausente(self):
        result = BioCompiler2().analyze("CCCCCCCCACCCCCCCCCCAGCCC")
        self.assertEqual(result.status, RESULT_MISSING_5_SITE)
        self.assertFalse(result.is_valid)
        self.assertEqual(result.mature_mrna, "NÃO GERADO")

    def test_caso_2_sitio_5_ausente_com_ag_antes_de_gu_sobreposto(self):
        result = BioCompiler2().analyze("UCUCCCCCCCCACCCCCCCCCCCCCCAGUCUCCC")
        self.assertEqual(result.status, RESULT_MISSING_5_SITE)
        self.assertFalse(result.is_valid)

    def test_caso_3_sitio_3_ausente(self):
        result = BioCompiler2().analyze("CCCGUCCCCACCCCCCCCCCCCCCC")
        self.assertEqual(result.status, RESULT_MISSING_3_SITE)
        self.assertFalse(result.is_valid)
        self.assertEqual(result.mature_mrna, "NÃO GERADO")

    def test_caso_4_branch_point_invalido(self):
        result = BioCompiler2().analyze("CCCGUCCCCCCCCCCCCCCCCAGCCC")
        self.assertEqual(result.status, RESULT_BRANCH_POINT)
        self.assertFalse(result.is_valid)
        self.assertEqual(result.mature_mrna, "NÃO GERADO")

    def test_base_invalida(self):
        result = BioCompiler2().analyze("CCCGUCCCCXCCCCAGCCC")
        self.assertEqual(result.status, RESULT_RNA_INVALID_BASE)
        self.assertFalse(result.is_valid)
        self.assertIn("[X]", result.error_snippet)

    def test_exportacao_e_processamento_em_lote(self):
        entries = [
            "CCUAUGGCUGUAACCUUUAACUAACAAGAUGGCCUAC",
            "CCCCCCCCACCCCCCCCCCAGCCC",
        ]
        with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8") as input_file:
            input_file.write("\n".join(entries) + "\n")
            input_path = input_file.name

        with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8") as output_file:
            output_path = output_file.name

        try:
            results = process_premrna_file(input_path, output_filepath=output_path)
            self.assertEqual(len(results), 2)
            self.assertEqual(results[0].status, RESULT_RNA_CORRECT)
            self.assertEqual(results[1].status, RESULT_MISSING_5_SITE)

            with open(output_path, "r", encoding="utf-8") as file:
                lines = [line.strip() for line in file if line.strip()]
            self.assertEqual(lines[0], "linha;status;resultado;mRNA_maduro")
            self.assertTrue(lines[1].startswith("1;OK;CORRETO;m7Gppp"))
            self.assertEqual(lines[2], "2;ERRO;BUG - sítio 5' ausente;NÃO GERADO")

            export_rna_processor_results_file(results, output_path)
        finally:
            for path in (input_path, output_path):
                if os.path.exists(path):
                    os.remove(path)


class TestOfficialInput40Cases(unittest.TestCase):
    def test_arquivo_oficial_tem_40_casos_balanceados(self):
        self.assertTrue(os.path.exists(OFFICIAL_INPUT))
        results = process_premrna_file(OFFICIAL_INPUT, output_filepath=None)
        self.assertEqual(len(results), 40)

        counts = Counter(result.status for result in results)
        self.assertEqual(counts[RESULT_RNA_CORRECT], 10)
        self.assertEqual(counts[RESULT_MISSING_5_SITE], 10)
        self.assertEqual(counts[RESULT_MISSING_3_SITE], 10)
        self.assertEqual(counts[RESULT_BRANCH_POINT], 10)


if __name__ == "__main__":
    unittest.main()
