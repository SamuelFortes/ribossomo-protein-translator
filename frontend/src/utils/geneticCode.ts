import type { AminoAcidInfo } from '../types';

export const AMINO_ACID_MAP: Record<string, AminoAcidInfo> = {
  Met: { code3: 'Met', code1: 'M', namePt: 'Metionina', nameEn: 'Methionine', property: 'special', color: '#10b981' },
  Ala: { code3: 'Ala', code1: 'A', namePt: 'Alanina', nameEn: 'Alanine', property: 'hydrophobic', color: '#3b82f6' },
  Arg: { code3: 'Arg', code1: 'R', namePt: 'Arginina', nameEn: 'Arginine', property: 'positive', color: '#8b5cf6' },
  Asn: { code3: 'Asn', code1: 'N', namePt: 'Asparagina', nameEn: 'Asparagine', property: 'polar', color: '#06b6d4' },
  Asp: { code3: 'Asp', code1: 'D', namePt: 'Aspartato', nameEn: 'Aspartate', property: 'negative', color: '#ef4444' },
  Cys: { code3: 'Cys', code1: 'C', namePt: 'Cisteína', nameEn: 'Cysteine', property: 'special', color: '#eab308' },
  Gln: { code3: 'Gln', code1: 'Q', namePt: 'Glutamina', nameEn: 'Glutamine', property: 'polar', color: '#06b6d4' },
  Glu: { code3: 'Glu', code1: 'E', namePt: 'Glutamato', nameEn: 'Glutamate', property: 'negative', color: '#ef4444' },
  Gly: { code3: 'Gly', code1: 'G', namePt: 'Glicina', nameEn: 'Glycine', property: 'special', color: '#64748b' },
  His: { code3: 'His', code1: 'H', namePt: 'Histidina', nameEn: 'Histidine', property: 'positive', color: '#8b5cf6' },
  Ile: { code3: 'Ile', code1: 'I', namePt: 'Isoleucina', nameEn: 'Isoleucine', property: 'hydrophobic', color: '#3b82f6' },
  Leu: { code3: 'Leu', code1: 'L', namePt: 'Leucina', nameEn: 'Leucine', property: 'hydrophobic', color: '#3b82f6' },
  Lys: { code3: 'Lys', code1: 'K', namePt: 'Lisina', nameEn: 'Lysine', property: 'positive', color: '#8b5cf6' },
  Phe: { code3: 'Phe', code1: 'F', namePt: 'Fenilalanina', nameEn: 'Phenylalanine', property: 'hydrophobic', color: '#3b82f6' },
  Pro: { code3: 'Pro', code1: 'P', namePt: 'Prolina', nameEn: 'Proline', property: 'special', color: '#f97316' },
  Ser: { code3: 'Ser', code1: 'S', namePt: 'Serina', nameEn: 'Serine', property: 'polar', color: '#14b8a6' },
  Thr: { code3: 'Thr', code1: 'T', namePt: 'Treonina', nameEn: 'Threonine', property: 'polar', color: '#14b8a6' },
  Trp: { code3: 'Trp', code1: 'W', namePt: 'Triptofano', nameEn: 'Tryptophan', property: 'hydrophobic', color: '#6366f1' },
  Tyr: { code3: 'Tyr', code1: 'Y', namePt: 'Tirosina', nameEn: 'Tyrosine', property: 'polar', color: '#ec4899' },
  Val: { code3: 'Val', code1: 'V', namePt: 'Valina', nameEn: 'Valine', property: 'hydrophobic', color: '#3b82f6' },
  STOP: { code3: 'STOP', code1: '*', namePt: 'Códon de Término', nameEn: 'Stop Codon', property: 'stop', color: '#f43f5e' },
};

export const GENETIC_CODE: Record<string, string> = {
  // Fenilalanina / Leucina
  UUU: 'Phe', UUC: 'Phe', UUA: 'Leu', UUG: 'Leu',
  CUU: 'Leu', CUC: 'Leu', CUA: 'Leu', CUG: 'Leu',
  AUU: 'Ile', AUC: 'Ile', AUA: 'Ile', AUG: 'Met', // START
  GUU: 'Val', GUC: 'Val', GUA: 'Val', GUG: 'Val',

  // Serina / Prolina / Treonina / Alanina
  UCU: 'Ser', UCC: 'Ser', UCA: 'Ser', UCG: 'Ser',
  CCU: 'Pro', CCC: 'Pro', CCA: 'Pro', CCG: 'Pro',
  ACU: 'Thr', ACC: 'Thr', ACA: 'Thr', ACG: 'Thr',
  GCU: 'Ala', GCC: 'Ala', GCA: 'Ala', GCG: 'Ala',

  // Tirosina / STOP / Histidina / Glutamina
  UAU: 'Tyr', UAC: 'Tyr', UAA: 'STOP', UAG: 'STOP',
  CAU: 'His', CAC: 'His', CAA: 'Gln', CAG: 'Gln',
  AAU: 'Asn', AAC: 'Asn', AAA: 'Lys', AAG: 'Lys',
  GAU: 'Asp', GAC: 'Asp', GAA: 'Glu', GAG: 'Glu',

  // Cisteína / STOP / Triptofano / Arginina / Glicina
  UGU: 'Cys', UGC: 'Cys', UGA: 'STOP', UGG: 'Trp',
  CGU: 'Arg', CGC: 'Arg', CGA: 'Arg', CGG: 'Arg',
  AGU: 'Ser', AGC: 'Ser', AGA: 'Arg', AGG: 'Arg',
  GGU: 'Gly', GGC: 'Gly', GGA: 'Gly', GGG: 'Gly',
};

export const STOP_CODONS = new Set(['UAA', 'UAG', 'UGA']);

export const NUCLEOTIDE_COLORS: Record<string, { bg: string; text: string; name: string }> = {
  A: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', text: 'text-emerald-400', name: 'Adenina' },
  U: { bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40', text: 'text-rose-400', name: 'Uracila' },
  G: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', text: 'text-amber-400', name: 'Guanina' },
  C: { bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', text: 'text-cyan-400', name: 'Citosina' },
};
