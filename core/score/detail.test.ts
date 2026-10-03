import { describe, expect, it } from 'vitest';
import { pos, rep } from './outils-tests.ts';
import { scoreCandidat } from './resultats.ts';

const poids = { retraites: 1, fiscalite: 2, sante: 1 };

describe('détail par thème (spécification § 8)', () => {
  const c = scoreCandidat(
    'c',
    [
      rep('RET-1', 2, false, 'retraites'),
      rep('RET-2', 2, false, 'retraites'),
      rep('RET-3', -2, false, 'retraites'),
      rep('RET-4', 1, false, 'retraites'),
      rep('FIS-1', 2, false, 'fiscalite'),
      rep('FIS-2', 2, false, 'fiscalite'),
      rep('FIS-3', 2, false, 'fiscalite'),
      rep('SAN-1', 1, false, 'sante'),
    ],
    poids,
    [pos('RET-1', 2), pos('RET-2', 2), pos('RET-3', 2), pos('RET-4', null), pos('FIS-1', 2), pos('FIS-2', 1), pos('SAN-1', 1)],
  );

  it('même formule, ramenage compris, restreinte au thème', () => {
    const ret = c.themes.find((t) => t.theme === 'retraites')!;
    expect(ret.affichage).toBe('affiche');
    expect(ret.score.scoreBrut).toBeCloseTo((100 * 8) / 12, 10); // (4 + 4 + 0) / (4 × 3)
    expect(ret.score.c).toBe(0.75); // 3 codées sur 4 répondues
    expect(ret.score.score).toBeCloseTo(50 + (800 / 12 - 50) * 0.75, 10);
  });

  it('« trop peu de questions » sous 3 questions répondues et codées dans le thème', () => {
    expect(c.themes.find((t) => t.theme === 'fiscalite')!.affichage).toBe('trop_peu_de_questions'); // 2 codées sur 3
    expect(c.themes.find((t) => t.theme === 'sante')!.affichage).toBe('trop_peu_de_questions');
  });

  it('les thèmes sont triés par identifiant et ne contiennent que les thèmes répondus', () => {
    expect(c.themes.map((t) => t.theme)).toEqual(['fiscalite', 'retraites', 'sante']);
  });

  it('le score du thème est calculé même quand il n\'est pas affiché (consultable)', () => {
    expect(c.themes.find((t) => t.theme === 'fiscalite')!.score.score).not.toBeNull();
  });
});

describe('accords et désaccords forts (spécification § 8)', () => {
  it('accord fort : points = 4 ; désaccord fort : points ≤ 1 ; triés par poids décroissant', () => {
    const c = scoreCandidat(
      'c',
      [
        rep('A', 2, false, 'retraites'), // 4 points, poids 1
        rep('B', 2, true, 'fiscalite'), // 4 points, poids 4
        rep('C', 2, false, 'sante'), // 4 points, imprécise, poids 0,5
        rep('D', 2, false, 'retraites'), // 3 points : ni l'un ni l'autre
        rep('E', 2, false, 'retraites'), // 1 point, poids 1
        rep('F', -2, true, 'retraites'), // 0 point, poids 2
        rep('G', 0, false, 'retraites'), // non connu
      ],
      poids,
      [pos('A', 2), pos('B', 2), pos('C', 2, 'imprecise'), pos('D', 1), pos('E', -1, 'nuancee'), pos('F', 2), pos('G', null)],
    );
    expect(c.accords.map((x) => [x.questionId, x.poids])).toEqual([
      ['B', 4],
      ['A', 1],
      ['C', 0.5],
    ]);
    expect(c.desaccords.map((x) => [x.questionId, x.points, x.poids])).toEqual([
      ['F', 0, 2],
      ['E', 1, 1],
    ]);
    expect(c.desaccords[1]).toEqual({ questionId: 'E', theme: 'retraites', reponse: 2, code: -1, nature: 'nuancee', points: 1, poids: 1 });
  });

  it('cinq de chaque au plus ; à poids égal, ordre des identifiants', () => {
    const q = ['Q7', 'Q3', 'Q1', 'Q6', 'Q2', 'Q5', 'Q4'];
    const c = scoreCandidat('c', q.map((x) => rep(x, 2)), { retraites: 1 }, q.map((x) => pos(x, 2)));
    expect(c.accords.map((x) => x.questionId)).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5']);
    expect(c.desaccords).toEqual([]);
  });

  it('le code 0 peut donner un accord fort', () => {
    const c = scoreCandidat('c', [rep('Q', 0)], { retraites: 1 }, [pos('Q', 0)]);
    expect(c.accords).toHaveLength(1);
  });
});
