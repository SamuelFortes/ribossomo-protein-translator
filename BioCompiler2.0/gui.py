# -*- coding: utf-8 -*-
"""Interface gráfica do BioCompiler: DNA Transcriber e RNA Processor."""

import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from biocompiler import BioCompiler, BioCompiler2
from biocompiler.cli import (
    export_results_file,
    export_rna_processor_results_file,
    format_screen_output,
    format_rna_processor_output,
    process_file,
    process_premrna_file,
)


DNA_MODE = "BioCompiler 1.0 - DNA Transcriber"
RNA_MODE = "BioCompiler 2.0 - RNA Processor"


class BioCompilerApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("BioCompiler")
        self.root.geometry("880x740")
        self.root.configure(padx=20, pady=15)

        title_label = ttk.Label(
            root,
            text="BioCompiler",
            font=("Helvetica", 18, "bold"),
        )
        title_label.pack(pady=(0, 5))

        subtitle = ttk.Label(
            root,
            text="DNA Transcriber e RNA Processor",
            font=("Helvetica", 10),
        )
        subtitle.pack(pady=(0, 15))

        mode_frame = ttk.LabelFrame(root, text="Modo de processamento", padding=10)
        mode_frame.pack(fill=tk.X, pady=(0, 10))

        self.mode_var = tk.StringVar(value=RNA_MODE)
        self.mode_combo = ttk.Combobox(
            mode_frame,
            textvariable=self.mode_var,
            state="readonly",
            values=[RNA_MODE, DNA_MODE],
        )
        self.mode_combo.pack(fill=tk.X)
        self.mode_combo.bind("<<ComboboxSelected>>", lambda _event: self.apply_mode_defaults())

        file_frame = ttk.LabelFrame(root, text="Processamento em lote (.txt)", padding=10)
        file_frame.pack(fill=tk.X, pady=(0, 10))

        load_btn = ttk.Button(
            file_frame,
            text="Carregar arquivo de entrada",
            command=self.load_file,
        )
        load_btn.pack(side=tk.LEFT, padx=(0, 10))

        demo_btn = ttk.Button(
            file_frame,
            text="Carregar casos de demonstração",
            command=self.load_demo,
        )
        demo_btn.pack(side=tk.LEFT)

        self.input_frame = ttk.LabelFrame(root, text="Entrada individual", padding=10)
        self.input_frame.pack(fill=tk.X, pady=(0, 10))

        self.seq_entry = ttk.Entry(self.input_frame, font=("Consolas", 11))
        self.seq_entry.pack(fill=tk.X, pady=(0, 8))

        button_frame = ttk.Frame(self.input_frame)
        button_frame.pack(anchor=tk.W)

        analyze_btn = ttk.Button(
            button_frame,
            text="Analisar sequência",
            command=self.analyze_single,
        )
        analyze_btn.pack(side=tk.LEFT, padx=(0, 10))

        clear_input_btn = ttk.Button(
            button_frame,
            text="Limpar entrada",
            command=self.clear_input,
        )
        clear_input_btn.pack(side=tk.LEFT, padx=(0, 10))

        clear_output_btn = ttk.Button(
            button_frame,
            text="Limpar saída",
            command=self.clear_output,
        )
        clear_output_btn.pack(side=tk.LEFT)

        result_frame = ttk.LabelFrame(root, text="Relatório da análise", padding=10)
        result_frame.pack(fill=tk.BOTH, expand=True)

        header_frame = ttk.Frame(result_frame)
        header_frame.pack(fill=tk.X, pady=(0, 8))

        self.status_var = tk.StringVar(value="Pronto para analisar.")
        self.status_label = ttk.Label(
            header_frame,
            textvariable=self.status_var,
            font=("Helvetica", 12, "bold"),
        )
        self.status_label.pack(side=tk.LEFT)

        text_container = ttk.Frame(result_frame)
        text_container.pack(fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(text_container)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.details_text = tk.Text(
            text_container,
            font=("Consolas", 12),
            bg="#f8f9fa",
            fg="#212529",
            yscrollcommand=scrollbar.set,
            padx=10,
            pady=10,
        )
        self.details_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.details_text.yview)

        self.apply_mode_defaults()

    def apply_mode_defaults(self) -> None:
        self.clear_output()
        self.seq_entry.delete(0, tk.END)
        if self.is_dna_mode:
            self.input_frame.configure(text="Entrada individual de DNA")
            self.seq_entry.insert(0, "ATGGCTAAACCGTAA")
        else:
            self.input_frame.configure(text="Entrada individual de pré-mRNA")
            self.seq_entry.insert(0, "CCUAUGGCUGUAACCUUUAACUAACAAGAUGGCCUAC")

    @property
    def is_dna_mode(self) -> bool:
        return self.mode_var.get() == DNA_MODE

    def analyze_single(self) -> None:
        sequence = self.seq_entry.get().strip()
        if not sequence:
            messagebox.showwarning("Aviso", "Digite ou cole uma sequência.")
            return

        if self.is_dna_mode:
            result = BioCompiler().analyze(sequence, entry_number=1)
            self._show_text(format_screen_output([result]))
            self._set_status(result.is_valid, result.status, "pré-mRNA gerado")
        else:
            result = BioCompiler2().analyze(sequence, entry_number=1)
            self._show_text(format_rna_processor_output([result]))
            self._set_status(result.is_valid, result.status, "mRNA maduro gerado")

    def load_demo(self) -> None:
        if self.is_dna_mode:
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
            export_results_file(results, "resultados.txt")
            self._show_text(format_screen_output(results))
        else:
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
            export_rna_processor_results_file(results, "resultados.txt")
            self._show_text(format_rna_processor_output(results))

        self.status_var.set("Casos de demonstração processados. Exportado em resultados.txt.")
        self.status_label.configure(foreground="#0d6efd")

    def load_file(self) -> None:
        filepath = filedialog.askopenfilename(
            title="Selecione o arquivo de entrada",
            filetypes=[("Arquivos de texto", "*.txt"), ("Todos os arquivos", "*.*")],
            initialdir=os.getcwd(),
        )
        if not filepath:
            return

        try:
            if self.is_dna_mode:
                results = process_file(filepath, output_filepath="resultados.txt")
                self._show_text(format_screen_output(results))
            else:
                results = process_premrna_file(filepath, output_filepath="resultados.txt")
                self._show_text(format_rna_processor_output(results))

            self.status_var.set(
                f"{len(results)} sequências processadas. Exportado em resultados.txt."
            )
            self.status_label.configure(foreground="#198754")
            messagebox.showinfo(
                "Sucesso",
                f"Processamento concluído.\n\nTotal de sequências: {len(results)}\n"
                "Resultados exportados em resultados.txt.",
            )
        except Exception as exc:
            messagebox.showerror("Erro", f"Erro ao processar arquivo:\n{exc}")

    def clear_input(self) -> None:
        self.seq_entry.delete(0, tk.END)

    def clear_output(self) -> None:
        self.details_text.delete("1.0", tk.END)
        self.status_var.set("Pronto para analisar.")
        self.status_label.configure(foreground="#212529")

    def _show_text(self, text: str) -> None:
        self.details_text.delete("1.0", tk.END)
        self.details_text.insert(tk.END, text)

    def _set_status(self, is_valid: bool, status: str, success_message: str) -> None:
        if is_valid:
            self.status_var.set(f"STATUS: CORRETO - {success_message}.")
            self.status_label.configure(foreground="#198754")
        else:
            self.status_var.set(f"STATUS: ERRO - {status}")
            self.status_label.configure(foreground="#dc3545")


if __name__ == "__main__":
    app_root = tk.Tk()
    BioCompilerApp(app_root)
    app_root.mainloop()
