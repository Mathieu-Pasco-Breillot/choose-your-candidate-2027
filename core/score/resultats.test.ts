import { describe, expect, it } from 'vitest';
import { ids, melangeur, pos, rep, sansMelange } from './outils-tests.ts';
import { calculerResultats } from './resultats.ts';
import type { Candidat, EntreeResultats, Position, Valeur } from './types.ts';
import { ErreurEntree } from './validation.ts';

const q = ids(20);
const reponses = q.map((id, i) => rep(id, ([2, 1, 0, -1, -2] as const)[i % 5]!));
const tous = (code: Valeur): Position[] => q.map((id) => pos(id, code));

const candidats: Candidat[] = [
  { id: 'accord', statutEvaluation: 'evalue' },
  { id: 'oppose', statutEvaluation: 'evalue' },
  { id: 'peu', statutEvaluation: 'evalue' },
  { id: 'vide', statutEvaluation: 'evalue' },
  { id: 'pressenti', statutEvaluation: 'non_evalue', motifNonEvaluation: 'pressenti' },
];

const entree: EntreeResultats = {
  reponses,
  poidsThemes: { retraites: 1 },
  candidats,
  positions: {
    accord: q.map((id, i) => pos(id, ([2, 1, 0, -1, -2] as const)[i % 5]!)),
    oppose: q.map((id, i) => pos(id, ([-2, -1, 0, 1, 2] as const)[i % 5]!)),
    peu: q.slice(0, 7).map((id) => pos(id, 2)),
    // « vide » n'a aucun fichier de positions
  },
  affinites: ['peu', 'oppose', 'pressenti', 'inconnu'],
};

describe('résultats d\'une partie', () => {
  const r = calculerResultats(entree, sansMelange);

  it('classement, hors classement avec motif chiffré, non évalués', () => {
    expect(r.repondues).toBe(20);
    expect(r.classement.map((c) => [c.candidatId, c.rang, c.score.scoreArrondi])).toEqual([
      ['accord', 1, 100],
      ['oppose', 2, 40], // points 0, 2, 4, 2, 0 → 8/20 = 40
    ]);
    expect(r.horsClassement.map((c) => [c.candidatId, c.motif.texte])).toEqual([
      ['peu', 'codé sur 7 de vos 20 questions'],
      ['vide', 'codé sur 0 de vos 20 questions'],
    ]);
    expect(r.nonEvalues).toEqual([{ candidatId: 'pressenti', motif: 'pressenti' }]);
  });

  it('écart avec les affinités déclarées : rang ou situation de chaque candidat coché', () => {
    expect(r.affinites).toEqual([
      { candidatId: 'peu', situation: 'hors_classement', motif: r.horsClassement[0]!.motif },
      { candidatId: 'oppose', situation: 'classe', rang: 2, exAequo: false, score: 40 },
      { candidatId: 'pressenti', situation: 'non_evalue', motif: 'pressenti' },
      { candidatId: 'inconnu', situation: 'inconnu' },
    ]);
  });

  it('score brut et c consultables, une ligne par question répondue', () => {
    const accord = r.classement[0]!;
    expect(accord.score.scoreBrut).toBe(100);
    expect(accord.score.c).toBe(1);
    expect(accord.lignes).toHaveLength(20);
    expect(accord.fiabilite).toBe('moyenne');
  });

  it('« sans avis » partout : aucun classement, aucune erreur', () => {
    const r2 = calculerResultats({ ...entree, reponses: q.map((id) => rep(id, 'sans_avis')) }, melangeur(1));
    expect(r2.repondues).toBe(0);
    expect(r2.classement).toEqual([]);
    expect(r2.horsClassement).toHaveLength(4);
    expect(r2.horsClassement.every((h) => h.score.score === null && h.motif.texte === 'aucune question répondue')).toBe(true);
  });

  it('aucune réponse, aucun candidat : aucune erreur', () => {
    expect(calculerResultats({ reponses: [], poidsThemes: {}, candidats: [], positions: {} }, sansMelange)).toEqual({
      repondues: 0,
      classement: [],
      horsClassement: [],
      nonEvalues: [],
      affinites: [],
    });
  });

  it('les positions en arbitrage sont comptées pour l\'affichage « arbitrage en attente »', () => {
    const r3 = calculerResultats(
      { ...entree, positions: { ...entree.positions, accord: [...tous(2).slice(0, 18), { questionId: q[18]!, etat: 'arbitrage_en_attente', code: null, nature: null }] } },
      sansMelange,
    );
    const accord = [...r3.classement, ...r3.horsClassement].find((c) => c.candidatId === 'accord')!;
    expect(accord.arbitragesEnAttente).toBe(1);
    expect(accord.score.codees).toBe(18);
  });
});

describe('entrées incohérentes', () => {
  it('réponse hors échelle, question en double, poids de thème absent ou hors 1 à 3', () => {
    expect(() => calculerResultats({ ...entree, reponses: [rep('Q', 3 as Valeur)] }, sansMelange)).toThrow(ErreurEntree);
    expect(() => calculerResultats({ ...entree, reponses: [rep('Q', 1), rep('Q', 2)] }, sansMelange)).toThrow(ErreurEntree);
    expect(() => calculerResultats({ ...entree, poidsThemes: {} }, sansMelange)).toThrow(ErreurEntree);
    expect(() => calculerResultats({ ...entree, poidsThemes: { retraites: 0 } }, sansMelange)).toThrow(ErreurEntree);
    expect(() => calculerResultats({ ...entree, poidsThemes: { retraites: 4 } }, sansMelange)).toThrow(ErreurEntree);
  });

  it('un thème sans poids n\'est pas une erreur si toutes ses réponses sont « sans avis »', () => {
    expect(() => calculerResultats({ ...entree, reponses: [rep('X', 'sans_avis', false, 'autre')] }, sansMelange)).not.toThrow();
  });

  it('candidat en double, position en double, code hors échelle', () => {
    expect(() => calculerResultats({ ...entree, candidats: [...candidats, candidats[0]!] }, sansMelange)).toThrow(ErreurEntree);
    expect(() => calculerResultats({ ...entree, positions: { accord: [pos('Q001', 1), pos('Q001', 2)] } }, sansMelange)).toThrow(ErreurEntree);
    expect(() => calculerResultats({ ...entree, positions: { accord: [pos('Q001', 5 as Valeur)] } }, sansMelange)).toThrow(ErreurEntree);
  });
});
