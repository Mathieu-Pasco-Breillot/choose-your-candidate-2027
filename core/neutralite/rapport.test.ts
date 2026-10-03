import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { banqueSynthetique } from '../tirage/outils-test.ts';
import { calculerRapportNeutralite, poidsAleatoires } from './index.ts';

const banque = banqueSynthetique();
const ids = banque.questions.map((q) => q.id);

describe('rapport de neutralité du tirage', () => {
  it('candidat codé partout : atteint toujours les seuils ; codé nulle part : jamais', () => {
    const r = calculerRapportNeutralite({ banque, codees: { partout: ids, nulle: [] } }, { graine: 1, tirages: 300 });
    for (const l of Object.values(r.modes)) {
      expect(l.candidats.partout!.part_atteint_seuils).toBe(1);
      expect(l.candidats.partout!.couverture_moyenne).toBe(1);
      expect(l.candidats.nulle!.part_atteint_seuils).toBe(0);
      expect(l.candidats.nulle!.questions_codees_max).toBe(0);
      expect(l.ecart_parts_atteint_seuils).toBe(1);
    }
    expect(r.couverture_banque).toEqual({ nulle: 0, partout: 1 });
  });

  it('applique les deux seuils : au moins 10 questions et au moins la moitié des questions répondues', () => {
    // Un seul thème tiré n'est pas garanti : on code un thème entier (10 questions) et rien d'autre.
    const theme = banque.questions.filter((q) => q.theme === 'fiscalite').map((q) => q.id);
    const r = calculerRapportNeutralite({ banque, codees: { un_theme: theme } }, { graine: 3, tirages: 500 });
    // En mode Express (20 questions), il faudrait 10 questions codées : jamais plus que le quota du thème.
    for (const l of Object.values(r.modes)) {
      const c = l.candidats.un_theme!;
      if (c.questions_codees_max < 10) expect(c.part_atteint_seuils).toBe(0);
    }
  });

  it('candidats de même couverture répartie de même façon : parts voisines (le tirage ne favorise personne)', () => {
    // Deux candidats codés sur une question sur deux, l'un les impaires, l'autre les paires, dans chaque thème.
    const pairs = ids.filter((_, i) => i % 2 === 0);
    const impairs = ids.filter((_, i) => i % 2 === 1);
    const r = calculerRapportNeutralite({ banque, codees: { a: pairs, b: impairs } }, { graine: 5, tirages: 2000 });
    for (const l of Object.values(r.modes)) {
      expect(Math.abs(l.candidats.a!.couverture_moyenne - l.candidats.b!.couverture_moyenne)).toBeLessThan(0.03);
    }
  });

  it('est déterministe et ignore les questions inconnues ou non actives', () => {
    const e = { banque, codees: { a: [...ids.slice(0, 40), 'ZZZ-999'] } };
    expect(calculerRapportNeutralite(e, { graine: 9, tirages: 100 })).toEqual(calculerRapportNeutralite(e, { graine: 9, tirages: 100 }));
    expect(calculerRapportNeutralite(e, { graine: 9, tirages: 100 }).couverture_banque.a).toBeCloseTo(40 / ids.length, 5);
  });

  it('poids aléatoires : de 0 à 3, jamais tous nuls', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), (graine) => {
        const p = poidsAleatoires(banque.themes, graine);
        expect(Object.keys(p).sort()).toEqual([...banque.themes]);
        expect(Object.values(p).every((w) => [0, 1, 2, 3].includes(w))).toBe(true);
        expect(Object.values(p).some((w) => w > 0)).toBe(true);
      }),
    );
  });

  it('refuse des paramètres invalides', () => {
    expect(() => calculerRapportNeutralite({ banque, codees: {} }, { graine: -1, tirages: 10 })).toThrow();
    expect(() => calculerRapportNeutralite({ banque, codees: {} }, { graine: 1, tirages: 0 })).toThrow();
  });
});
