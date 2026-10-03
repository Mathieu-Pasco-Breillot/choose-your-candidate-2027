/** Textes affichés : thèmes, motifs, échelle de réponse. Aucun humour ici : le contenu reste factuel. */
import type { Valeur } from '../core/score/types.ts';

export const THEMES: Record<string, string> = {
  retraites: 'Retraites',
  fiscalite: 'Fiscalité',
  'economie-dette': 'Économie et dette',
  sante: 'Santé',
  education: 'Éducation',
  immigration: 'Immigration',
  securite: 'Sécurité',
  defense: 'Défense',
  'ecologie-energie': 'Écologie et énergie',
  'union-europeenne': 'Union européenne',
  institutions: 'Institutions',
};
export const libelleTheme = (id: string): string => THEMES[id] ?? id;

/** Échelle de réponse, de « tout à fait d'accord » (+2) à « pas du tout d'accord » (−2). */
export const ECHELLE: readonly { valeur: Valeur; libelle: string }[] = [
  { valeur: 2, libelle: "Tout à fait d'accord" },
  { valeur: 1, libelle: "Plutôt d'accord" },
  { valeur: 0, libelle: "Ni d'accord, ni pas d'accord" },
  { valeur: -1, libelle: "Plutôt pas d'accord" },
  { valeur: -2, libelle: "Pas du tout d'accord" },
];

export const libelleValeur = (v: Valeur): string => ECHELLE.find((e) => e.valeur === v)?.libelle ?? String(v);

export const NATURES: Record<string, string> = {
  nette: 'position nette',
  nuancee: 'position nuancée',
  imprecise: 'position imprécise',
  non_connu: 'position non connue',
};

export const FIABILITE: Record<string, string> = { faible: 'faible', moyenne: 'moyenne', bonne: 'bonne' };

export const MOTIFS_NON_EVALUATION: Record<string, string> = {
  primaire_en_cours: 'Primaire en cours',
  pressenti: 'Pressentis, pas encore déclarés',
  declaration_non_sourcee: 'Déclaration de candidature non sourcée',
  absent_liste_officielle: 'Absents de la liste officielle',
  codage_en_attente: 'Codage en attente',
  motif_non_renseigne: 'Motif non renseigné',
};

export const MODES = {
  express: { nom: 'Express', questions: 20, duree: 'environ 5 minutes' },
  debat: { nom: 'Débat', questions: 40, duree: 'environ 10 minutes' },
  campagne: { nom: 'Campagne', questions: 60, duree: 'environ 15 minutes' },
} as const;
