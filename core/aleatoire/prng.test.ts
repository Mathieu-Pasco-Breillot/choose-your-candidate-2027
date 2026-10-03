import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { choisir, creerGenerateur, deriverGraine, ErreurGraine, GRAINE_MAX, melanger, tiragePondere } from './prng.ts';

// Tests de propriétés sur des milliers de tirages : délai large pour les machines d'intégration continue.
vi.setConfig({ testTimeout: 120_000 });

describe('générateur à graine', () => {
  it('donne des valeurs de référence figées (vérifiées par une implémentation indépendante en Python)', () => {
    // Si ce test échoue, les tirages publiés ne sont plus reproductibles : ne pas « corriger » les valeurs.
    const suite = (graine: number) => {
      const g = creerGenerateur(graine);
      return [0, 1, 2, 3, 4].map(() => g.suivant32());
    };
    expect(suite(0)).toEqual([591558436, 2737234123, 107644106, 1338548054, 2499804003]);
    expect(suite(42)).toEqual([2476999517, 2284424721, 914527439, 3398404915, 1005869237]);
    expect(suite(GRAINE_MAX)).toEqual([401775837, 815230463, 1635982147, 2773186149, 285779518]);
  });

  it('même graine = même suite', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: GRAINE_MAX }), (graine) => {
        const a = creerGenerateur(graine);
        const b = creerGenerateur(graine);
        for (let i = 0; i < 50; i++) expect(a.suivant32()).toBe(b.suivant32());
      }),
    );
  });

  it('refuse une graine qui n\'est pas un entier de 0 à 2³² − 1', () => {
    for (const g of [-1, 1.5, GRAINE_MAX + 1, Number.NaN, Infinity]) expect(() => creerGenerateur(g)).toThrow(ErreurGraine);
  });

  it('reel() reste dans [0, 1[ et entier(n) dans [0, n[', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: GRAINE_MAX }), fc.integer({ min: 1, max: 1000 }), (graine, n) => {
        const g = creerGenerateur(graine);
        for (let i = 0; i < 20; i++) {
          const r = g.reel();
          expect(r >= 0 && r < 1).toBe(true);
          const k = g.entier(n);
          expect(Number.isInteger(k) && k >= 0 && k < n).toBe(true);
        }
      }),
    );
  });

  it('entier(n) est à peu près uniforme (test du khi² sur 60 000 tirages)', () => {
    const g = creerGenerateur(7);
    const n = 6;
    const comptes = new Array(n).fill(0);
    const total = 60_000;
    for (let i = 0; i < total; i++) comptes[g.entier(n)]++;
    const attendu = total / n;
    const khi2 = comptes.reduce((s, c) => s + (c - attendu) ** 2 / attendu, 0);
    expect(khi2).toBeLessThan(20.5); // seuil à 0,1 % pour 5 degrés de liberté
  });
});

describe('melanger', () => {
  it('renvoie une permutation et ne modifie pas la liste', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: GRAINE_MAX }), fc.array(fc.integer(), { maxLength: 40 }), (graine, liste) => {
        const avant = [...liste];
        const m = melanger(creerGenerateur(graine), liste);
        expect(liste).toEqual(avant);
        expect([...m].sort((a, b) => a - b)).toEqual([...liste].sort((a, b) => a - b));
      }),
    );
  });

  it('est reproductible', () => {
    const l = Array.from({ length: 30 }, (_, i) => i);
    expect(melanger(creerGenerateur(5), l)).toEqual(melanger(creerGenerateur(5), l));
    expect(melanger(creerGenerateur(5), l)).not.toEqual(melanger(creerGenerateur(6), l));
  });
});

describe('tiragePondere', () => {
  it('ne choisit jamais un poids nul', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: GRAINE_MAX }),
        fc.array(fc.constantFrom(0, 0, 1, 2.5, 4), { minLength: 1, maxLength: 20 }).filter((p) => p.some((x) => x > 0)),
        (graine, poids) => {
          const g = creerGenerateur(graine);
          for (let i = 0; i < 20; i++) expect(poids[tiragePondere(g, poids)]).toBeGreaterThan(0);
        },
      ),
    );
  });

  it('respecte les proportions (poids 1 et 3 : environ 25 % / 75 %)', () => {
    const g = creerGenerateur(11);
    let trois = 0;
    for (let i = 0; i < 40_000; i++) if (tiragePondere(g, [1, 3]) === 1) trois++;
    expect(trois / 40_000).toBeGreaterThan(0.74);
    expect(trois / 40_000).toBeLessThan(0.76);
  });

  it('refuse des poids invalides', () => {
    const g = creerGenerateur(1);
    expect(() => tiragePondere(g, [])).toThrow();
    expect(() => tiragePondere(g, [0, 0])).toThrow();
    expect(() => tiragePondere(g, [1, -1])).toThrow();
  });
});

describe('choisir et deriverGraine', () => {
  it('choisir refuse une liste vide', () => {
    expect(() => choisir(creerGenerateur(1), [])).toThrow();
  });

  it('deriverGraine est déterministe, reste une graine valide et sépare les étiquettes', () => {
    expect(deriverGraine(42, 'a')).toBe(deriverGraine(42, 'a'));
    expect(deriverGraine(42, 'a')).not.toBe(deriverGraine(42, 'b'));
    const vues = new Set<number>();
    for (let i = 0; i < 10_000; i++) {
      const s = deriverGraine(123, i);
      expect(Number.isInteger(s) && s >= 0 && s <= GRAINE_MAX).toBe(true);
      vues.add(s);
    }
    expect(vues.size).toBeGreaterThan(9_990);
  });
});
