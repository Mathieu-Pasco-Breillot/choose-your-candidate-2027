/** Contenu des pages d'information (produit par `npm run bundle`, chargé à la demande). */
export interface EntreeJournal {
  date: string;
  type: string;
  objets: string[];
  description: string;
  auteur?: string;
}

export interface ProfilNeutralite {
  part_atteint_seuils: number;
  couverture_moyenne: number;
  questions_codees_moyenne: number;
}

export interface Pages {
  empreinte: string;
  docs: { methodologie: string; grille: string; critere: string };
  journal: EntreeJournal[];
  horsJeu: { id: string; theme: string; statut: 'suspendue' | 'archivee'; enonce: string }[];
  neutralite: {
    provisoire: boolean;
    parametres: { tirages_par_mode: number; seuil_questions_codees: number };
    modes: Record<string, { N: number; candidats: Record<string, ProfilNeutralite>; ecart_parts_atteint_seuils: number }>;
  };
}

export const chargerPages = async (): Promise<Pages> => (await import('../donnees/pages.json')).default as unknown as Pages;
