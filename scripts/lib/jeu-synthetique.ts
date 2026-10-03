/**
 * Petit jeu de données fictif pour tester les calculs de derive/ sans dépendre des données réelles.
 * 11 thèmes × 4 questions, 6 candidats. Les codes sont fabriqués pour que D varie d'une question à l'autre.
 */
import { createHash } from 'node:crypto';
import type { Dataset } from './dataset.ts';

const AXES = ['economie', 'securite', 'frontieres', 'europe', 'ecologie', 'institutions'] as const;
export const THEMES = ['retraites', 'fiscalite', 'economie-dette', 'sante', 'education', 'immigration', 'securite', 'defense', 'ecologie-energie', 'union-europeenne', 'institutions'];
export const CANDIDATS = ['a', 'b', 'c', 'd', 'e', 'f'].map((l) => `cand-${l}`.replace('cand-', 'candidat-'));

const PREFIXES = ['RET', 'FIS', 'ECO', 'SAN', 'EDU', 'IMM', 'SEC', 'DEF', 'ENV', 'EUR', 'INS'];

const extrait = {
  reformulation: 'x',
  citation_courte: null,
  reformulation_anonymisee: 'x',
  citation_anonymisee: null,
  source: { url: 'https://exemple.fr', titre: 't', date_publication: '2026-01-01', type: 'declaration_publique' },
  date_consultation: '2026-10-03',
  citation_verifiee_mot_a_mot: null,
};

const coder = (code: number | null, nature: string) => ({
  modele: 'm',
  code,
  nature: code === null ? 'non_connu' : nature,
  justification: 'j',
  date: '2026-10-03',
  aveugle: true,
});

const itemAveugle = (questionId: string, candidatId = ''): string =>
  createHash('sha256').update(`${candidatId}|${questionId}`).digest('hex').slice(0, 8);

export function position(candidatId: string, questionId: string, code: number | null, nature = 'nette', statut = 'accord') {
  return {
    question_id: questionId,
    code: statut === 'accord' && code !== null ? code : null,
    nature: statut === 'arbitrage_en_attente' ? null : code === null ? 'non_connu' : nature,
    statut,
    item_aveugle: itemAveugle(questionId, candidatId),
    extraits: [extrait],
    codage: { codeur_1: coder(code, nature), codeur_2: coder(code, nature), accord: statut === 'accord' },
    arbitrage: null,
    controle_humain: { tire_au_sort: false },
    contestations: [],
    version: 1,
  };
}

/**
 * `codesParQuestion[id]` donne les codes des 6 candidats (null = non codé).
 * Par défaut : variance croissante avec le numéro de question.
 */
export function jeuSynthetique(codesParQuestion?: Record<string, (number | null)[]>): Dataset {
  const questions: Record<string, unknown> = {};
  const ids: string[] = [];
  THEMES.forEach((theme, t) => {
    const prefixe = PREFIXES[t]!;
    const liste = [0, 1, 2, 3].map((k) => {
      const id = `${prefixe}-${String(k + 1).padStart(3, '0')}`;
      ids.push(id);
      return {
        id,
        theme,
        axe: AXES[(t + k) % AXES.length],
        sens: (t + k) % 2 === 0 ? 1 : -1,
        enonce: 'e',
        precision: null,
        origine: { description: 'd', source: { url: 'https://exemple.fr', titre: 't', date_consultation: '2026-10-03', nature: 'primaire' } },
        statut: 'active',
        alertes_neutralite: [],
        scrutins: [],
        historique: [],
      };
    });
    questions[theme] = { _theme: theme, _lot: t + 1, _statut: 's', _equilibre: { actives: 4, suspendues: 0, sens_plus: 2, sens_moins: 2, axes: {} }, _note: '', questions: liste };
  });

  const defaut = (rang: number): (number | null)[] => {
    // Plus le rang est élevé, plus les codes sont dispersés.
    const dispersion = [[0, 0, 0, 0, 0, 0], [1, 1, 0, 0, -1, -1], [2, 1, 0, 0, -1, -2], [2, 2, 2, -2, -2, -2]];
    return dispersion[rang % 4]!;
  };

  const positions: Record<string, unknown> = {};
  CANDIDATS.forEach((cand, i) => {
    positions[cand] = {
      candidat_id: cand,
      _statut: 's',
      grille_version: '1.2',
      programme: { officiel_disponible: false, date_publication: null, url: null, note: 'n' },
      positions: ids.map((id, n) => {
        const codes = codesParQuestion?.[id] ?? defaut(n);
        return position(cand, id, codes[i] ?? null);
      }),
    };
  });

  return {
    axes: { _version: 1, _statut: 's', _note: 'n', axes: AXES.map((id) => ({ id, pole_a: 'a', pole_b: 'b' })) },
    candidats: {
      _critere_version: 1,
      _date_etat_des_lieux: '2026-10-03',
      _note: 'n',
      candidats: CANDIDATS.map((id) => ({ id, prenom: 'P', nom: 'N', parti: 'X', statut_candidature: 'declare', statut_evaluation: 'evalue', vague: 1 })),
      primaires: [],
    },
    questions,
    positions,
    journal: { _note: '', entrees: [] },
    empreinte: '0'.repeat(64),
  } as unknown as Dataset;
}
