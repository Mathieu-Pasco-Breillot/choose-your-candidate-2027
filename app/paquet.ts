/**
 * Le paquet de données allégé (produit par `npm run bundle` à partir de data/ et derive/).
 * L'application ne lit que ce fichier : aucun appel réseau pour obtenir des données.
 */
import type { DeriveAncrage, DeriveDiscriminance, Questions } from '../core/types.generated.ts';
import type { EtatPosition, Valeur } from '../core/score/types.ts';
import brut from './donnees/paquet.json';

export interface QuestionPaquet {
  id: string;
  theme: string;
  axe: Questions.Axe;
  sens: 1 | -1;
  statut: 'active';
  enonce: string;
  precision: string | null;
}

export interface ExtraitPaquet {
  reformulation: string;
  citation: string | null;
  source: { titre: string; url: string; datePublication: string | null };
}

export interface PositionPaquet {
  questionId: string;
  etat: EtatPosition;
  code: Valeur | null;
  nature: 'nette' | 'nuancee' | 'imprecise' | 'non_connu' | null;
  extrait?: ExtraitPaquet;
}

export interface CandidatPaquet {
  id: string;
  prenom: string;
  nom: string;
  parti: string;
  statutEvaluation: 'evalue' | 'codage_en_attente' | 'non_evalue';
  motifNonEvaluation?: 'primaire_en_cours' | 'pressenti' | 'declaration_non_sourcee' | 'absent_liste_officielle';
}

export interface Paquet {
  empreinte: string;
  questions: QuestionPaquet[];
  candidats: CandidatPaquet[];
  positions: Record<string, PositionPaquet[]>;
  discriminance: DeriveDiscriminance.DeriveDiscriminance;
  ancrage: DeriveAncrage.DeriveAncrage;
}

export const paquet = brut as unknown as Paquet;
