import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { chargerDataset } from '../../scripts/lib/dataset.ts';
import type { Positions, Questions } from '../types.generated.ts';
import { ErreurDefi, estAdmiseDansDefi, tirerDefi, type EntreeDefi, type ResultatDefi } from './index.ts';

// Tests de propriétés sur des milliers de tirages : délai large pour les machines d'intégration continue.
vi.setConfig({ testTimeout: 120_000 });

type Statut = Positions.Position['statut'];
type Nature = Positions.Nature;

function position(question_id: string, code: number | null, nature: Nature | null, statut: Statut, verifiee: boolean | null = true): Positions.Position {
  return {
    question_id,
    code,
    nature,
    statut,
    item_aveugle: '00000000',
    extraits:
      statut === 'sans_extrait'
        ? []
        : [
            {
              reformulation: `Nom du candidat, position ${question_id}`,
              citation_courte: `citation ${question_id}`,
              reformulation_anonymisee: `[CANDIDAT], position ${question_id}`,
              citation_anonymisee: `citation anonymisée ${question_id}`,
              source: { url: `https://exemple.fr/${question_id}`, titre: `Source ${question_id}`, date_publication: '2026-09-01', type: 'declaration_publique' },
              date_consultation: '2026-10-03',
              citation_verifiee_mot_a_mot: verifiee,
            },
          ],
    codage: null,
    arbitrage: null,
    controle_humain: { tire_au_sort: false },
    contestations: [],
    version: 1,
  };
}

const questions: Pick<Questions.Question, 'id' | 'enonce' | 'statut'>[] = Array.from({ length: 30 }, (_, i) => ({
  id: `QQQ-${String(i + 1).padStart(3, '0')}`,
  enonce: `Énoncé ${i + 1}`,
  statut: i === 29 ? 'suspendue' : 'active',
}));

const NATURES: (Nature | null)[] = ['nette', 'nuancee', 'imprecise', 'non_connu', null];
const STATUTS: Statut[] = ['accord', 'arbitre', 'arbitrage_en_attente', 'sans_extrait'];

/** Jeu aléatoire : chaque candidat a une position (de tout statut et toute nature) sur une partie des questions. */
const arbEntree = fc
  .array(
    fc.array(
      fc.record({
        q: fc.integer({ min: 0, max: 29 }),
        code: fc.constantFrom(-2, -1, 0, 1, 2, null),
        nature: fc.constantFrom(...NATURES),
        statut: fc.constantFrom(...STATUTS),
      }),
      { maxLength: 20 },
    ),
    { minLength: 1, maxLength: 9 },
  )
  .map((parCandidat): EntreeDefi => {
    const positions: Record<string, Positions.Position[]> = {};
    parCandidat.forEach((liste, i) => {
      const vues = new Set<number>();
      positions[`candidat-${'abcdefghi'[i]}`] = liste
        .filter((x) => !vues.has(x.q) && (vues.add(x.q), true))
        .map((x) => position(questions[x.q]!.id, x.code, x.nature, x.statut));
    });
    return { questions, positions, candidats: Object.keys(positions) };
  });

function verifier(entree: EntreeDefi, r: ResultatDefi, propositions = 4) {
  const actives = new Set(entree.questions.filter((q) => q.statut === 'active').map((q) => q.id));
  // Équilibre : même nombre d'apparitions comme bonne réponse, à une unité près, entre candidats présents.
  const comptes = r.candidats_presents.map((c) => r.manches.filter((m) => m.bonne_reponse === c).length);
  if (r.manches.length > 0) expect(Math.max(...comptes) - Math.min(...comptes)).toBeLessThanOrEqual(1);
  for (const m of r.manches) {
    const p = entree.positions[m.bonne_reponse]!.find((x) => x.question_id === m.question_id)!;
    // Aucune position exclue : imprecise, non arbitrée, non connue, question non active.
    expect(estAdmiseDansDefi(p, actives)).toBe(true);
    expect(['nette', 'nuancee']).toContain(p.nature);
    expect(['accord', 'arbitre']).toContain(p.statut);
    // Propositions : distinctes, avec la bonne réponse, entre 2 et le nombre demandé, toutes présentes.
    expect(new Set(m.propositions).size).toBe(m.propositions.length);
    expect(m.propositions).toContain(m.bonne_reponse);
    expect(m.propositions.length).toBeGreaterThanOrEqual(2);
    expect(m.propositions.length).toBeLessThanOrEqual(propositions);
    for (const c of m.propositions) expect(r.candidats_presents).toContain(c);
    // Aucune autre proposition ne porte une position publiée de même signe sur la question.
    for (const c of m.propositions) {
      if (c === m.bonne_reponse) continue;
      const autre = entree.positions[c]?.find((x) => x.question_id === m.question_id);
      if (autre && (autre.statut === 'accord' || autre.statut === 'arbitre') && autre.code !== null) {
        expect(Math.sign(autre.code)).not.toBe(Math.sign(p.code!));
      }
    }
    // L'indice ne contient que les textes anonymisés ; la révélation, les textes complets et la source.
    const x = p.extraits[0]!;
    expect(m.indice.reformulation).toBe(x.reformulation_anonymisee);
    expect(m.indice.citation).toBe(x.citation_verifiee_mot_a_mot === false ? null : x.citation_anonymisee);
    expect(m.revelation.reformulation).toBe(x.reformulation);
    expect(m.revelation.source.url).toBe(x.source.url);
  }
  // Une même position n'est jamais posée deux fois.
  const cles = r.manches.map((m) => `${m.bonne_reponse}|${m.question_id}`);
  expect(new Set(cles).size).toBe(cles.length);
  expect(r.stock_insuffisant).toBe(r.manches.length < r.manches_demandees);
}

describe('défi « Qui a dit ça ? »', () => {
  it('sur 10 000 parties : apparitions égales entre candidats à une unité près, aucune position exclue', () => {
    fc.assert(
      fc.property(arbEntree, fc.integer({ min: 0, max: 0xffffffff }), fc.integer({ min: 0, max: 40 }), (entree, graine, manches) => {
        verifier(entree, tirerDefi(entree, { graine, manches }));
      }),
      { numRuns: 10_000 },
    );
  });

  it('même graine = même partie', () => {
    fc.assert(
      fc.property(arbEntree, fc.integer({ min: 0, max: 0xffffffff }), (entree, graine) => {
        expect(tirerDefi(entree, { graine, manches: 12 })).toEqual(tirerDefi(entree, { graine, manches: 12 }));
      }),
      { numRuns: 500 },
    );
  });

  it('stock insuffisant : moins de manches, sans erreur, et signalé', () => {
    const entree: EntreeDefi = {
      questions,
      positions: {
        a: [position('QQQ-001', 2, 'nette', 'accord'), position('QQQ-002', 2, 'nette', 'accord'), position('QQQ-003', -1, 'nuancee', 'arbitre')],
        b: [position('QQQ-004', -2, 'nette', 'accord')],
        c: [position('QQQ-005', 1, 'nuancee', 'accord'), position('QQQ-006', 1, 'nuancee', 'accord')],
      },
      candidats: ['a', 'b', 'c'],
    };
    const r = tirerDefi(entree, { graine: 1, manches: 10 });
    // b n'a qu'une position : chaque candidat au plus deux fois, b une fois → 3 + 2 = 5 manches.
    expect(r.manches).toHaveLength(5);
    expect(r.stock_insuffisant).toBe(true);
    expect(r.manches.filter((m) => m.bonne_reponse === 'b')).toHaveLength(1);
    verifier(entree, r);
  });

  it('candidat sans position admise : absent de la partie ; moins de deux candidats : aucune manche', () => {
    const entree: EntreeDefi = {
      questions,
      positions: {
        a: [position('QQQ-001', 2, 'nette', 'accord')],
        b: [position('QQQ-002', 1, 'imprecise', 'accord'), position('QQQ-003', null, null, 'arbitrage_en_attente'), position('QQQ-030', 2, 'nette', 'accord')],
      },
      candidats: ['a', 'b', 'z'],
    };
    const r = tirerDefi(entree, { graine: 1, manches: 5 });
    // b : imprécise, non arbitrée, question suspendue ; z : aucun fichier ; a : seul, personne à opposer.
    expect(r.candidats_presents).toEqual([]);
    expect(r.candidats_absents).toEqual(['a', 'b', 'z']);
    expect(r.manches).toEqual([]);
    expect(r.stock_insuffisant).toBe(true);
  });

  it('une citation non retrouvée mot à mot n\'est pas affichée', () => {
    const entree: EntreeDefi = {
      questions,
      positions: { a: [position('QQQ-001', 2, 'nette', 'accord', false)], b: [position('QQQ-002', -2, 'nette', 'accord')] },
      candidats: ['a', 'b'],
    };
    const r = tirerDefi(entree, { graine: 3, manches: 2 });
    const ma = r.manches.find((m) => m.bonne_reponse === 'a')!;
    expect(ma.indice.citation).toBeNull();
    expect(ma.revelation.citation).toBeNull();
    expect(ma.revelation.citation_verifiee).toBe(false);
    expect(ma.revelation.source).toEqual({ titre: 'Source QQQ-001', url: 'https://exemple.fr/QQQ-001', date_publication: '2026-09-01' });
  });

  it('paramètres invalides', () => {
    const entree: EntreeDefi = { questions, positions: {}, candidats: [] };
    expect(() => tirerDefi(entree, { graine: -1, manches: 1 })).toThrow(ErreurDefi);
    expect(() => tirerDefi(entree, { graine: 1, manches: -1 })).toThrow(ErreurDefi);
    expect(() => tirerDefi(entree, { graine: 1, manches: 1, propositions: 1 })).toThrow(ErreurDefi);
  });

  it('sur les données réelles : parties valides', () => {
    const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
    const ds = chargerDataset(racine);
    const entree: EntreeDefi = {
      questions: Object.values(ds.questions).flatMap((f) => f.questions),
      positions: Object.fromEntries(Object.entries(ds.positions).map(([c, f]) => [c, f.positions])),
      candidats: Object.keys(ds.positions),
    };
    for (let graine = 0; graine < 500; graine++) {
      const r = tirerDefi(entree, { graine, manches: 10 });
      expect(r.manches).toHaveLength(10);
      verifier(entree, r);
    }
    const max = tirerDefi(entree, { graine: 1, manches: 1000 });
    verifier(entree, max);
    expect(max.candidats_absents).toEqual([]);
  });
});
