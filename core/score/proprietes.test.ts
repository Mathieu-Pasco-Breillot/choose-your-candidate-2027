/**
 * Tests de propriétés (spécification § 10) : sur des parties tirées au hasard par fast-check,
 * des transformations qui ne devraient rien changer ne changent effectivement rien.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { melangeur } from './outils-tests.ts';
import { calculerResultats } from './resultats.ts';
import type { Candidat, EntreeResultats, Position, Reponse, Resultats, Score, Valeur } from './types.ts';

const THEMES = ['retraites', 'fiscalite', 'sante'];
const valeur = fc.constantFrom<Valeur>(-2, -1, 0, 1, 2);

const positionArb = (questionId: string): fc.Arbitrary<Position | null> =>
  fc.oneof(
    fc.constant(null), // aucun enregistrement
    fc.constant<Position>({ questionId, etat: 'non_connu', code: null, nature: 'non_connu' }),
    fc.constant<Position>({ questionId, etat: 'arbitrage_en_attente', code: null, nature: null }),
    fc.record({ code: valeur, nature: fc.constantFrom('nette' as const, 'nuancee' as const, 'imprecise' as const) }).map(
      ({ code, nature }): Position => ({ questionId, etat: 'publie', code, nature }),
    ),
    // Deux fois plus de positions publiées que d'autres, pour que des candidats passent les seuils.
    fc.record({ code: valeur, nature: fc.constantFrom('nette' as const, 'nuancee' as const) }).map(
      ({ code, nature }): Position => ({ questionId, etat: 'publie', code, nature }),
    ),
  );

/** Une partie aléatoire : 0 à 40 questions, 1 à 6 candidats évalués. */
const partieArb: fc.Arbitrary<EntreeResultats> = fc
  .record({
    n: fc.integer({ min: 0, max: 40 }),
    nbCandidats: fc.integer({ min: 1, max: 6 }),
    poids: fc.tuple(fc.integer({ min: 1, max: 3 }), fc.integer({ min: 1, max: 3 }), fc.integer({ min: 1, max: 3 })),
  })
  .chain(({ n, nbCandidats, poids }) => {
    const questions = Array.from({ length: n }, (_, i) => `Q${String(i).padStart(3, '0')}`);
    const reponses = fc.tuple(
      ...questions.map((questionId, i) =>
        fc.record({
          valeur: fc.oneof({ weight: 6, arbitrary: valeur }, { weight: 1, arbitrary: fc.constant('sans_avis' as const) }),
          tresImportant: fc.boolean(),
        }).map((r): Reponse => ({ questionId, theme: THEMES[i % THEMES.length]!, ...r })),
      ),
    );
    const candidats = Array.from({ length: nbCandidats }, (_, i) => `cand-${i}`);
    const positions = fc.tuple(...candidats.map(() => fc.tuple(...questions.map(positionArb))));
    return fc.record({ reponses, positions }).map(
      (p): EntreeResultats => ({
        reponses: p.reponses,
        poidsThemes: { retraites: poids[0], fiscalite: poids[1], sante: poids[2] },
        candidats: candidats.map((id): Candidat => ({ id, statutEvaluation: 'evalue' })),
        positions: Object.fromEntries(candidats.map((id, i) => [id, p.positions[i]!.filter((x): x is Position => x !== null)])),
      }),
    );
  });

const scores = (r: Resultats): Map<string, Score> => new Map([...r.classement, ...r.horsClassement].map((c) => [c.candidatId, c.score]));
const rangs = (r: Resultats): Map<string, number> => new Map(r.classement.map((c) => [c.candidatId, c.rang]));
const OPTIONS = { numRuns: 300 };

describe('propriétés du score', () => {
  it('scores toujours entre 0 et 100, c entre 0 et 1', () => {
    fc.assert(
      fc.property(partieArb, (e) => {
        for (const s of scores(calculerResultats(e, melangeur(1))).values()) {
          expect(s.c).toBeGreaterThanOrEqual(0);
          expect(s.c).toBeLessThanOrEqual(1);
          if (s.score !== null) {
            expect(s.score).toBeGreaterThanOrEqual(0);
            expect(s.score).toBeLessThanOrEqual(100);
            expect(s.scoreBrut!).toBeGreaterThanOrEqual(0);
            expect(s.scoreBrut!).toBeLessThanOrEqual(100);
          }
        }
      }),
      OPTIONS,
    );
  });

  it('renommer ou réordonner les candidats ne change aucun score ni aucun rang', () => {
    fc.assert(
      fc.property(partieArb, fc.integer(), (e, graine) => {
        const nom = (id: string) => `autre-${id.split('').reverse().join('')}`;
        const renomme: EntreeResultats = {
          ...e,
          candidats: melangeur(graine)(e.candidats).map((c) => ({ ...c, id: nom(c.id) })),
          positions: Object.fromEntries(melangeur(graine + 1)(Object.entries(e.positions)).map(([id, p]) => [nom(id), p])),
        };
        const a = calculerResultats(e, melangeur(5));
        const b = calculerResultats(renomme, melangeur(9));
        const sb = scores(b);
        const rb = rangs(b);
        for (const [id, s] of scores(a)) expect(sb.get(nom(id))).toEqual(s);
        for (const [id, r] of rangs(a)) expect(rb.get(nom(id))).toBe(r);
      }),
      OPTIONS,
    );
  });

  it('inverser l\'énoncé (réponse et position changées de signe) ne change aucun score', () => {
    const oppose = (v: Valeur): Valeur => (v === 0 ? 0 : (-v as Valeur)); // évite −0
    fc.assert(
      fc.property(partieArb, (e) => {
        const inverse: EntreeResultats = {
          ...e,
          reponses: e.reponses.map((r) => (r.valeur === 'sans_avis' ? r : { ...r, valeur: oppose(r.valeur) })),
          positions: Object.fromEntries(
            Object.entries(e.positions).map(([id, ps]) => [id, ps.map((p) => (p.code === null ? p : { ...p, code: oppose(p.code) }))]),
          ),
        };
        expect(scores(calculerResultats(inverse, melangeur(1)))).toEqual(scores(calculerResultats(e, melangeur(1))));
      }),
      OPTIONS,
    );
  });

  it('ajouter une question « non connu » rapproche le score de 50 sans changer son côté', () => {
    fc.assert(
      fc.property(
        partieArb,
        valeur,
        fc.boolean(),
        fc.constantFrom(...THEMES),
        fc.constantFrom('absent', 'non_connu', 'arbitrage_en_attente'),
        (e, v, tres, theme, forme) => {
          const nouvelle: Reponse = { questionId: 'ZZZ-nouvelle', theme, valeur: v, tresImportant: tres };
          const positions = Object.fromEntries(
            Object.entries(e.positions).map(([id, ps]): [string, Position[]] => [
              id,
              forme === 'absent'
                ? [...ps]
                : [...ps, { questionId: nouvelle.questionId, etat: forme as 'non_connu' | 'arbitrage_en_attente', code: null, nature: forme === 'non_connu' ? 'non_connu' : null }],
            ]),
          );
          const avant = scores(calculerResultats(e, melangeur(1)));
          const apres = scores(calculerResultats({ ...e, reponses: [...e.reponses, nouvelle], positions }, melangeur(1)));
          for (const [id, s] of avant) {
            const t = apres.get(id)!;
            if (s.score === null) {
              expect(t.score).toBeNull();
              continue;
            }
            const ecartAvant = s.score - 50;
            const ecartApres = t.score! - 50;
            expect(t.scoreBrut).toBe(s.scoreBrut); // le score brut ne bouge pas
            expect(t.c).toBeLessThan(s.c); // le coefficient baisse
            if (Math.abs(ecartAvant) < 1e-9) expect(Math.abs(ecartApres)).toBeLessThan(1e-9);
            else {
              expect(Math.abs(ecartApres)).toBeLessThan(Math.abs(ecartAvant));
              expect(Math.sign(ecartApres)).toBe(Math.sign(ecartAvant));
            }
          }
        },
      ),
      OPTIONS,
    );
  });

  it('les affinités déclarées ne changent aucun score ni aucun rang', () => {
    fc.assert(
      fc.property(partieArb, fc.array(fc.integer({ min: 0, max: 7 }), { maxLength: 8 }), (e, cochés) => {
        const affinites = cochés.map((i) => `cand-${i}`);
        const sans = calculerResultats(e, melangeur(3));
        const avec = calculerResultats({ ...e, affinites }, melangeur(3));
        expect({ ...avec, affinites: [] }).toEqual({ ...sans, affinites: [] });
      }),
      OPTIONS,
    );
  });

  it('l\'ordre des réponses ne change rien', () => {
    fc.assert(
      fc.property(partieArb, fc.integer(), (e, graine) => {
        const melangees = { ...e, reponses: melangeur(graine)(e.reponses) };
        expect(calculerResultats(melangees, melangeur(4))).toEqual(calculerResultats(e, melangeur(4)));
      }),
      OPTIONS,
    );
  });

  it('même graine et mêmes entrées : même résultat, ordre d\'affichage compris', () => {
    fc.assert(
      fc.property(partieArb, fc.integer(), (e, graine) => {
        expect(calculerResultats(e, melangeur(graine))).toEqual(calculerResultats(e, melangeur(graine)));
      }),
      { numRuns: 100 },
    );
  });
});
