import { describe, expect, it } from 'vitest';
import { arrondirScore, calculerScore, fiabilite, points, poidsBase, precision } from './formule.ts';
import { ids, pos, rep, enAttente } from './outils-tests.ts';
import { scoreCandidat } from './resultats.ts';
import type { Position, Reponse } from './types.ts';

const scorer = (reponses: Reponse[], positions: Position[], poidsThemes: Record<string, number> = { retraites: 1 }) =>
  scoreCandidat('c', reponses, poidsThemes, positions).score;

describe('cas de référence de la spécification (§ 8), repris tels quels', () => {
  it('T1 : réponse +2, position +2 nette → brut 100, c 1, affiché 100', () => {
    const s = scorer([rep('Q1', 2)], [pos('Q1', 2)]);
    expect(s.scoreBrut).toBe(100);
    expect(s.c).toBe(1);
    expect(s.scoreArrondi).toBe(100);
  });

  it('T2 : réponse +2, position −2 nette → brut 0, c 1, affiché 0', () => {
    const s = scorer([rep('Q1', 2)], [pos('Q1', -2)]);
    expect(s.scoreBrut).toBe(0);
    expect(s.c).toBe(1);
    expect(s.scoreArrondi).toBe(0);
  });

  it('T3 : réponse 0 partout, positions +2 ou −2 → brut 50, c 1, affiché 50', () => {
    const q = ids(6);
    const s = scorer(
      q.map((id) => rep(id, 0)),
      q.map((id, i) => pos(id, i % 2 === 0 ? 2 : -2)),
    );
    expect(s.scoreBrut).toBe(50);
    expect(s.c).toBe(1);
    expect(s.scoreArrondi).toBe(50);
  });

  it('T4 : nette, nuancée, imprécise, non connu → brut 75, c 0,625, affiché 65,6 → 66', () => {
    const s = scorer(
      [rep('Q1', 2), rep('Q2', 1), rep('Q3', 2), rep('Q4', 2)],
      [pos('Q1', 2, 'nette'), pos('Q2', -1, 'nuancee'), pos('Q3', 1, 'imprecise'), pos('Q4', null)],
    );
    expect(s.scoreBrut).toBe(75); // 100 × (4 + 2 + 1,5) / (4 × 2,5)
    expect(s.c).toBe(0.625); // 2,5 / 4
    expect(s.score).toBe(65.625); // 50 + 25 × 0,625
    expect(s.scoreArrondi).toBe(66);
    expect(s.codees).toBe(3); // l'imprécise compte pour une question codée (D9)
    expect(s.repondues).toBe(4);
  });

  it('T5 : (+2 ; −2 nette, très important), (+1 ; +1 nuancée) → brut 33,3, c 1, affiché 33', () => {
    const s = scorer([rep('Q1', 2, true), rep('Q2', 1)], [pos('Q1', -2), pos('Q2', 1, 'nuancee')]);
    expect(s.scoreBrut).toBeCloseTo(100 / 3, 10); // 100 × (0 + 4) / (4 × 3)
    expect(s.c).toBe(1);
    expect(s.scoreArrondi).toBe(33);
  });
});

describe('« codée » veut dire « code différent de null » : le code 0 est un code', () => {
  it('une position 0 nette est codée et compte dans le score', () => {
    const s = scorer([rep('Q1', 2)], [pos('Q1', 0)]);
    expect(s.codees).toBe(1);
    expect(s.c).toBe(1);
    expect(s.scoreBrut).toBe(50); // points = 4 − |2 − 0| = 2
  });

  it('réponse 0 et position 0 : accord parfait', () => {
    expect(scorer([rep('Q1', 0)], [pos('Q1', 0)]).scoreBrut).toBe(100);
  });
});

describe('questions non codées', () => {
  it('« non connu » et « arbitrage en attente » comptent pour 0 dans c (D8)', () => {
    const a = scorer([rep('Q1', 2), rep('Q2', 2)], [pos('Q1', 2), pos('Q2', null)]);
    const b = scorer([rep('Q1', 2), rep('Q2', 2)], [pos('Q1', 2), enAttente('Q2')]);
    const c = scorer([rep('Q1', 2), rep('Q2', 2)], [pos('Q1', 2)]); // aucun enregistrement pour Q2
    for (const s of [a, b, c]) {
      expect(s.codees).toBe(1);
      expect(s.c).toBe(0.5);
      expect(s.score).toBe(75);
    }
  });

  it('candidat sans aucun code : pas de score, aucune erreur', () => {
    const s = scorer([rep('Q1', 2), rep('Q2', -1)], []);
    expect(s).toMatchObject({ scoreBrut: null, score: null, scoreArrondi: null, c: 0, codees: 0, repondues: 2 });
  });

  it('« sans avis » partout : aucune question répondue, aucun score, aucune erreur', () => {
    const s = scorer([rep('Q1', 'sans_avis'), rep('Q2', 'sans_avis')], [pos('Q1', 2), pos('Q2', 2)]);
    expect(s).toMatchObject({ repondues: 0, codees: 0, score: null, c: 0 });
  });

  it('« sans avis » est exclu même si la question est codée', () => {
    const avec = scorer([rep('Q1', 2), rep('Q2', 'sans_avis')], [pos('Q1', 2), pos('Q2', -2)]);
    expect(avec).toMatchObject({ repondues: 1, codees: 1, score: 100 });
  });

  it('un ensemble vide de lignes ne provoque pas d\'erreur', () => {
    expect(calculerScore([])).toMatchObject({ repondues: 0, score: null, c: 0 });
  });
});

describe('poids', () => {
  it('poids_base = poids_thème × importance ; précision 0,5 pour imprécise', () => {
    expect(poidsBase(3, true)).toBe(6);
    expect(poidsBase(2, false)).toBe(2);
    expect(precision('imprecise')).toBe(0.5);
    expect(precision('nette')).toBe(1);
    expect(precision('nuancee')).toBe(1);
  });

  it('le poids de thème pèse dans le score', () => {
    const s = scorer(
      [rep('A1', 2, false, 'retraites'), rep('B1', 2, false, 'fiscalite')],
      [pos('A1', 2), pos('B1', -2)],
      { retraites: 3, fiscalite: 1 },
    );
    expect(s.scoreBrut).toBe(75); // 100 × (3 × 4 + 1 × 0) / (4 × 4)
  });

  it('points = 4 − |réponse − position|', () => {
    expect(points(2, -2)).toBe(0);
    expect(points(-1, 1)).toBe(2);
    expect(points(0, 0)).toBe(4);
  });
});

describe('bornes', () => {
  it('score brut et score affiché entre 0 et 100, c entre 0 et 1, sur toutes les combinaisons à une question', () => {
    const valeurs = [-2, -1, 0, 1, 2] as const;
    for (const r of valeurs)
      for (const p of valeurs)
        for (const nature of ['nette', 'nuancee', 'imprecise'] as const)
          for (const tres of [false, true]) {
            const s = scorer([rep('Q1', r, tres), rep('Q2', r)], [pos('Q1', p, nature), pos('Q2', null)]);
            expect(s.scoreBrut!).toBeGreaterThanOrEqual(0);
            expect(s.scoreBrut!).toBeLessThanOrEqual(100);
            expect(s.score!).toBeGreaterThanOrEqual(0);
            expect(s.score!).toBeLessThanOrEqual(100);
            expect(s.c).toBeGreaterThan(0);
            expect(s.c).toBeLessThanOrEqual(1);
          }
  });
});

describe('arrondi et fiabilité', () => {
  it('arrondi à l\'entier, demis vers le haut, sans résidu flottant', () => {
    expect(arrondirScore(65.625)).toBe(66);
    expect(arrondirScore(65.5)).toBe(66);
    expect(arrondirScore(65.49)).toBe(65);
    expect(arrondirScore(62.49999999999999)).toBe(63); // résidu flottant de 62,5
    expect(arrondirScore(100 / 3)).toBe(33);
  });

  it('faible sous 15, moyenne de 15 à 29, bonne à partir de 30', () => {
    expect(fiabilite(0)).toBe('faible');
    expect(fiabilite(14)).toBe('faible');
    expect(fiabilite(15)).toBe('moyenne');
    expect(fiabilite(29)).toBe('moyenne');
    expect(fiabilite(30)).toBe('bonne');
  });

  it('la fiabilité compte les questions répondues et codées, imprécises comprises', () => {
    const q = ids(15);
    const c = scoreCandidat('c', q.map((id) => rep(id, 1)), { retraites: 1 }, q.map((id) => pos(id, 1, 'imprecise')));
    expect(c.fiabilite).toBe('moyenne');
  });
});
