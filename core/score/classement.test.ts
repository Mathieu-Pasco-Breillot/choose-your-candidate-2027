import { describe, expect, it } from 'vitest';
import { classer, melangerVerifie, motifHorsClassement, texteMotif } from './classement.ts';
import { ids, melangeur, pos, rep, sansMelange } from './outils-tests.ts';
import { scoreCandidat } from './resultats.ts';
import type { Melanger, NatureCodee, Valeur } from './types.ts';

/** Candidat codé sur `k` des `n` questions répondues (réponse +2, position `code`). */
const candidat = (id: string, n: number, k: number, code: Valeur = 2, nature: NatureCodee = 'nette') => {
  const q = ids(n);
  return scoreCandidat(id, q.map((x) => rep(x, 2)), { retraites: 1 }, q.slice(0, k).map((x) => pos(x, code, nature)));
};

describe('seuils de classement (méthodologie § 6.3, D13)', () => {
  it('T6 (v1.3) : 20 réponses, candidat codé sur 7 → hors classement (moins de 8 questions)', () => {
    const motif = motifHorsClassement(candidat('a', 20, 7).score);
    expect(motif).toEqual({ codees: 7, repondues: 20, sousLeSeuil: true, texte: 'codé sur 7 de vos 20 questions' });
  });

  it('8 sur 20 : classé (au moins 8)', () => {
    expect(motifHorsClassement(candidat('a', 20, 8).score)).toBeNull();
  });

  it('plus de condition de proportion : 8 sur 60 et 9 sur 20 sont classés (ancienne règle D5 : hors classement)', () => {
    expect(motifHorsClassement(candidat('a', 60, 8).score)).toBeNull();
    expect(motifHorsClassement(candidat('a', 20, 9).score)).toBeNull();
  });

  it('7 sur 7 : hors classement (moins de 8 questions)', () => {
    const motif = motifHorsClassement(candidat('a', 7, 7).score)!;
    expect(motif.sousLeSeuil).toBe(true);
    expect(motif.texte).toBe('codé sur 7 de vos 7 questions');
  });

  it('une position imprécise compte pour une question codée (D9)', () => {
    expect(motifHorsClassement(candidat('a', 20, 8, 2, 'imprecise').score)).toBeNull();
    expect(motifHorsClassement(candidat('a', 20, 7, 2, 'imprecise').score)).not.toBeNull();
  });

  it('le code 0 compte pour une question codée', () => {
    expect(motifHorsClassement(candidat('a', 20, 8, 0).score)).toBeNull();
  });

  it('textes du motif', () => {
    expect(texteMotif(7, 20)).toBe('codé sur 7 de vos 20 questions');
    expect(texteMotif(0, 1)).toBe('codé sur 0 de votre seule question');
    expect(texteMotif(0, 0)).toBe('aucune question répondue');
  });
});

/** Candidat classé (10 questions codées) dont le score affiché vaut `points × 25` sur chaque question. */
const classeAvec = (id: string, reponse: Valeur) => {
  const q = ids(10);
  return scoreCandidat(id, q.map((x) => rep(x, reponse)), { retraites: 1 }, q.map((x) => pos(x, 2)));
};

describe('rangs et ex aequo', () => {
  const a = classeAvec('a', 2); // 100
  const b = classeAvec('b', 1); // 75
  const c = classeAvec('c', 1); // 75
  const d = classeAvec('d', 0); // 50
  const hors1 = candidat('h1', 10, 3);
  const hors2 = candidat('h2', 10, 0);

  it('même rang pour les scores affichés égaux ; le rang suivant saute (1, 2, 2, 4)', () => {
    const { classement } = classer([d, c, b, a], sansMelange);
    expect(classement.map((x) => [x.candidatId, x.rang, x.exAequo])).toEqual([
      ['a', 1, false],
      ['b', 2, true],
      ['c', 2, true],
      ['d', 4, false],
    ]);
  });

  it('l\'égalité se juge sur le score affiché (arrondi) et non sur la valeur décimale', () => {
    // 10 questions codées + 1 non connue : 50 + 50 × 10/11 = 95,45 → 95 ; 10 codées sur 10 avec une à 3 points : 97,5 → 98.
    const q = ids(11);
    const x = scoreCandidat('x', q.map((i) => rep(i, 2)), { retraites: 1 }, q.slice(0, 10).map((i) => pos(i, 2)));
    const y = scoreCandidat('y', q.slice(0, 10).map((i, n) => rep(i, n === 0 ? 1 : 2)), { retraites: 1 }, q.map((i) => pos(i, 2)));
    expect(x.score.scoreArrondi).toBe(95);
    expect(y.score.scoreArrondi).toBe(98);
    const { classement } = classer([x, y], sansMelange);
    expect(classement.map((e) => e.rang)).toEqual([1, 2]);

    // Deux scores décimaux différents (95,45 et 95,0) mais un même score affiché : ex aequo.
    const z = scoreCandidat('z', q.slice(0, 10).map((i, n) => rep(i, n < 2 ? 1 : 2)), { retraites: 1 }, q.map((i) => pos(i, 2)));
    expect(z.score.score).toBe(95);
    const r = classer([x, z], sansMelange).classement;
    expect(r.every((e) => e.rang === 1 && e.exAequo)).toBe(true);
  });

  it('l\'ordre entre ex aequo et celui des hors classement viennent du mélange fourni', () => {
    const inverse: Melanger = <T>(l: readonly T[]) => [...l].reverse();
    const { classement, horsClassement } = classer([a, b, c, d, hors1, hors2], inverse);
    expect(classement.map((x) => x.candidatId)).toEqual(['a', 'c', 'b', 'd']);
    expect(horsClassement.map((x) => x.candidatId)).toEqual(['h2', 'h1']);
  });

  it('le résultat ne dépend pas de l\'ordre des candidats en entrée, à graine égale', () => {
    const r1 = classer([a, b, c, d, hors1, hors2], melangeur(42));
    const r2 = classer([hors2, d, c, hors1, b, a], melangeur(42));
    expect(r1.classement.map((x) => x.candidatId)).toEqual(r2.classement.map((x) => x.candidatId));
    expect(r1.horsClassement.map((x) => x.candidatId)).toEqual(r2.horsClassement.map((x) => x.candidatId));
  });

  it('les rangs ne dépendent pas de la graine', () => {
    for (let g = 0; g < 50; g++) {
      const { classement } = classer([a, b, c, d], melangeur(g));
      expect(classement.map((x) => x.rang)).toEqual([1, 2, 2, 4]);
    }
  });

  it('un candidat sans code est hors classement, sans score', () => {
    const { horsClassement } = classer([hors2], sansMelange);
    expect(horsClassement[0]!.score.score).toBeNull();
    expect(horsClassement[0]!.motif.texte).toBe('codé sur 0 de vos 10 questions');
  });

  it('un mélange qui ne renvoie pas une permutation est refusé', () => {
    const fautif: Melanger = <T>(l: readonly T[]) => l.slice(1);
    expect(() => melangerVerifie(fautif, [1, 2, 3])).toThrow(/permutation/);
    const doublon: Melanger = <T>(l: readonly T[]) => [l[0]!, l[0]!, l[2]!];
    expect(() => melangerVerifie(doublon, [1, 2, 3])).toThrow(/permutation/);
  });
});
