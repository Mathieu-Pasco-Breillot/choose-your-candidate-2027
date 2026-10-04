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

/** Explication courte de chaque situation, reprise du critère d'inclusion v1 (docs/critere-inclusion.md). */
export const EXPLICATIONS_MOTIFS: Record<string, string> = {
  evalue: 'Candidature déclarée (règle R1) et positions codées sur au moins 40 % des questions actives : évalué, comparé dans vos résultats.',
  compares: 'Candidature déclarée (règle R1) et positions déjà codées : comparés dans vos résultats. Le statut « évalué » vient à 40 % des questions actives codées ; la part de chacun figure sur sa fiche.',
  compare: 'Candidature déclarée (règle R1) et positions déjà codées : comparé dans vos résultats. Le statut « évalué » vient à 40 % des questions actives codées.',
  codage_en_attente: 'Candidature déclarée (règle R1), mais positions pas encore codées : codage en attente, par vagues publiées.',
  pressenti: 'Candidature évoquée, mais pas encore déclarée publiquement, personnellement et sans condition (règle R1).',
  primaire_en_cours: "Participants à une primaire non achevée : le vainqueur sera évalué dès sa désignation (règle R2).",
  declaration_non_sourcee: "Déclaration de candidature sans article d'un média national pour l'attester (règle R1).",
  absent_liste_officielle: 'Absents de la liste officielle publiée par le Conseil constitutionnel (règle R3).',
  motif_non_renseigne: 'Motif non renseigné dans les données.',
};

/**
 * Méthodologie § 6.3 (« Dans la banque ») : un candidat passe de « codage en attente » à « évalué » quand il est
 * codé sur au moins 40 % des questions actives. Le statut est porté par data/candidats.json ; cette constante sert
 * aux textes de la fiche. Un test vérifie qu'elle reste égale au `seuil_evalue` de derive/couverture.json.
 */
export const SEUIL_EVALUE = 0.4;

/** Pourcentage à une décimale, à la française (« 47,6 % ») : évite qu'un arrondi affiche 40 % sous le seuil. */
export const pourcentage = (part: number): string =>
  `${(100 * part).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
