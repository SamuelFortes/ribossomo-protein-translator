# -*- coding: utf-8 -*-
"""Unit tests for the Ribossomo domain service."""

import unittest

from backend.app.ribosome_service import (
    CAP_5_MARKER,
    OFFICIAL_TEST_CASES,
    POLY_A_TAIL,
    RESULT_CORRECT,
    analyze_batch,
    analyze_mrna,
    generate_export_content,
)


class TestRibosomeOfficialCases(unittest.TestCase):
    def test_official_examples_match_expected_results(self):
        for case in OFFICIAL_TEST_CASES:
            with self.subTest(case=case["name"]):
                analysis = analyze_mrna(case["sequence"], case["id"])
                self.assertEqual(analysis["result"], case["expectedResult"])
                self.assertEqual(analysis["protein"], case["expectedProtein"])

    def test_success_case_exposes_frontend_fields(self):
        analysis = analyze_mrna(OFFICIAL_TEST_CASES[0]["sequence"], 1)

        self.assertEqual(analysis["status"], "OK")
        self.assertEqual(analysis["result"], RESULT_CORRECT)
        self.assertEqual(analysis["protein"], "Met-Ala-Lys-Pro")
        self.assertEqual(analysis["aminoAcids"], ["Met", "Ala", "Lys", "Pro"])
        self.assertEqual(analysis["utr5"], "CC")
        self.assertEqual(analysis["codingRna"], "AUGGCUAAACCGUAA")
        self.assertEqual(analysis["utr3"], "GG")
        self.assertEqual(analysis["polyALength"], 100)
        self.assertEqual([codon["codon"] for codon in analysis["codons"]], ["AUG", "GCU", "AAA", "CCG", "UAA"])

    def test_batch_preserves_order_and_entry_numbers(self):
        payload = [case["sequence"] for case in OFFICIAL_TEST_CASES]
        response = analyze_batch(payload)

        self.assertEqual(len(response["results"]), 6)
        self.assertEqual([item["entryNumber"] for item in response["results"]], [1, 2, 3, 4, 5, 6])
        self.assertEqual([item["result"] for item in response["results"]], [case["expectedResult"] for case in OFFICIAL_TEST_CASES])

    def test_export_content_uses_official_csv_contract(self):
        analyses = analyze_batch([OFFICIAL_TEST_CASES[0]["sequence"], OFFICIAL_TEST_CASES[1]["sequence"]])["results"]
        content = generate_export_content(analyses)

        self.assertEqual(
            content.splitlines(),
            [
                "linha;status;resultado;proteina",
                "1;OK;CORRETO;Met-Ala-Lys-Pro",
                "2;ERRO;BUG - CAP 5';NÃO GERADA",
            ],
        )

    def test_stop_codon_terminal_as_are_not_counted_as_poly_a(self):
        sequence = CAP_5_MARKER + "CCAUGGCUUAA" + POLY_A_TAIL
        analysis = analyze_mrna(sequence, 1)

        self.assertEqual(analysis["status"], "OK")
        self.assertEqual(analysis["polyALength"], 100)
        self.assertEqual(analysis["stopCodon"], "UAA")
        self.assertEqual(analysis["protein"], "Met-Ala")


if __name__ == "__main__":
    unittest.main()
