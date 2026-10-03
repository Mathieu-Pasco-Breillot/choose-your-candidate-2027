import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { creerGenerateur } from '../aleatoire/prng.ts';
import { chargerDataset } from '../../scripts/lib/dataset.ts';
import type { DeriveAncrage, DeriveDiscriminance } from '../types.generated.ts';
import {
  construireBanqueTirage,
  creerBanque,
  decrireTirage,
  ErreurBanque,
  ErreurTirage,
  MODES,
  poidsDeTirage,
  tirer,
  type BanqueTirage,
  type Mode,
  type ParametresTirage,
  type PoidsTheme,
  type QuestionVue,
} from './index.ts';
import { banqueSynthetique, ecartMinimal, THEMES_TEST, violations } from './outils-test.ts';
import { calculerQuotas } from './quotas.ts';

// Tests de propriétés sur des milliers de tirages : délai large pour les machines d'intégration continue.
vi.setConfig({ testTimeout: 120_000 });

const TIRAGES = 10_000;

const arbPoids = (themes: readonly string[]) =>
  fc
    .array(fc.constantFrom<PoidsTheme>(0, 1, 2, 3), { minLength: themes.length, maxLength: themes.length })
    .filter((w) => w.some((x) => x > 0))
    .map((w) => Object.fromEntries(themes.map((t, i) => [t, w[i]!])) as Record<string, PoidsTheme>);
const arbGraine = fc.integer({ min: 0, max: 0xffffffff });
const arbMode = fc.constantFrom<Mode>(...MODES);

const banque = banqueSynthetique();

describe('quotas (étape 2)', () => {
  it('cas T8 : N = 20, un thème à 3, dix thèmes à 1 → 5 pour le thème à 3, cinq thèmes à 2 et cinq à 1, départagés par la graine', () => {
    const themes = THEMES_TEST;
    const entrees = themes.map((t, i) => ({ theme: t, poids: (i === 0 ? 3 : 1) as PoidsTheme, stock: 15 }));
    const attribues = new Set<string>();
    for (let graine = 0; graine < 200; graine++) {
      const { quotas, places } = calculerQuotas(20, entrees, creerGenerateur(graine));
      expect(places).toBe(20);
      expect(quotas.get(themes[0]!)).toBe(5);
      const autres = themes.slice(1).map((t) => quotas.get(t)!);
      expect(autres.filter((q) => q === 2)).toHaveLength(5);
      expect(autres.filter((q) => q === 1)).toHaveLength(5);
      for (const t of themes.slice(1)) if (quotas.get(t) === 2) attribues.add(t);
    }
    // Le départage varie avec la graine : chacun des dix thèmes à 1 obtient parfois la place.
    expect(attribues.size).toBe(10);
  });

  it('cas T8 dans un vrai tirage (mode Express)', () => {
    const poids = Object.fromEntries(THEMES_TEST.map((t, i) => [t, (i === 0 ? 3 : 1) as PoidsTheme]));
    const r = tirer(banqueSynthetique({ questionsParTheme: 12 }), { mode: 'express', poids, vues: [], graine: 2027 });
    const q = new Map(r.journal.quotas.map((l) => [l.theme, l.quota]));
    expect(q.get(THEMES_TEST[0]!)).toBe(5);
    expect([...q.values()].sort()).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 5]);
  });

  it('plafond : l\'excédent d\'un thème trop petit est redistribué', () => {
    const { quotas } = calculerQuotas(
      20,
      [
        { theme: 'a', poids: 3, stock: 2 },
        { theme: 'b', poids: 1, stock: 30 },
        { theme: 'c', poids: 1, stock: 30 },
      ],
      creerGenerateur(1),
    );
    expect(quotas.get('a')).toBe(2);
    expect(quotas.get('b')! + quotas.get('c')!).toBe(18);
    expect(quotas.get('b')).toBe(9);
  });

  it('minimum d\'une question par thème quand N le permet', () => {
    const entrees = [{ theme: 'gros', poids: 3 as PoidsTheme, stock: 50 }, ...'abcdefghijk'.split('').map((t) => ({ theme: t, poids: 1 as PoidsTheme, stock: 10 }))];
    // 12 thèmes, N = 20 : part d'un thème à 1 = 20/14 ≈ 1,43 ; avec N = 12 elle vaudrait 0,86 → relevée à 1.
    const { quotas } = calculerQuotas(12, entrees, creerGenerateur(3));
    for (const t of 'abcdefghijk') expect(quotas.get(t)).toBe(1);
    expect(quotas.get('gros')).toBe(1);
  });

  it('propriétés : somme exacte, plafond, minimum, thème à 0 vide, poids plus fort ⇒ quota au moins égal', () => {
    fc.assert(
      fc.property(
        arbGraine,
        fc.constantFrom(20, 40, 60, 5, 100),
        fc.array(fc.record({ poids: fc.constantFrom<PoidsTheme>(0, 1, 2, 3), stock: fc.integer({ min: 0, max: 25 }) }), { minLength: 1, maxLength: 11 }),
        (graine, N, liste) => {
          const entrees = liste.map((e, i) => ({ theme: `t${String(i).padStart(2, '0')}`, ...e }));
          const { quotas, places, minimumApplicable } = calculerQuotas(N, entrees, creerGenerateur(graine));
          const actifs = entrees.filter((e) => e.poids > 0 && e.stock > 0);
          const stock = actifs.reduce((s, e) => s + e.stock, 0);
          expect(places).toBe(Math.min(N, stock));
          expect([...quotas.values()].reduce((s, q) => s + q, 0)).toBe(places);
          for (const e of entrees) {
            const q = quotas.get(e.theme)!;
            expect(q).toBeLessThanOrEqual(e.stock);
            if (e.poids === 0) expect(q).toBe(0);
            if (minimumApplicable && e.poids > 0 && e.stock > 0) expect(q).toBeGreaterThanOrEqual(1);
          }
          for (const a of actifs) {
            for (const b of actifs) {
              const qa = quotas.get(a.theme)!;
              const qb = quotas.get(b.theme)!;
              if (a.poids > b.poids && qa < a.stock) expect(qa).toBeGreaterThanOrEqual(qb);
            }
          }
        },
      ),
      { numRuns: 2000 },
    );
  });
});

describe('garanties du tirage (§ 7.3), sur 10 000 graines et des poids aléatoires', () => {
  it('quotas exacts, thème à 0 jamais tiré, aucun doublon, ancres présentes, sens équilibrés par thème et au total', () => {
    fc.assert(
      fc.property(arbGraine, arbMode, arbPoids(banque.themes), (graine, mode, poids) => {
        const p: ParametresTirage = { mode, poids, vues: [], graine };
        const r = tirer(banque, p);
        expect(violations(banque, p, r, { equilibreGlobal: true })).toEqual([]);
      }),
      { numRuns: TIRAGES },
    );
  });

  it('même graine et mêmes entrées = même tirage', () => {
    fc.assert(
      fc.property(arbGraine, arbMode, arbPoids(banque.themes), (graine, mode, poids) => {
        const p: ParametresTirage = { mode, poids, vues: [], graine };
        expect(tirer(banque, p)).toEqual(tirer(banque, { ...p, poids: { ...poids } }));
      }),
      { numRuns: TIRAGES },
    );
  });

  it('aucune question vue tant qu\'il reste des non-vues dans le thème', () => {
    const ids = banque.questions.map((q) => q.id);
    const arbVues = fc.subarray(ids).chain((sel) =>
      fc.tuple(...sel.map(() => fc.integer({ min: 1, max: 28 }))).map((jours) =>
        sel.map((id, i): QuestionVue => ({ id, date: `2026-09-${String(jours[i]).padStart(2, '0')}` })),
      ),
    );
    fc.assert(
      fc.property(arbGraine, arbMode, arbPoids(banque.themes), arbVues, (graine, mode, poids, vues) => {
        const p: ParametresTirage = { mode, poids, vues, graine };
        const r = tirer(banque, p);
        expect(violations(banque, p, r)).toEqual([]);
        // Quand des vues sont reprises, ce sont les plus anciennes du thème parmi celles admises par les filtres.
        for (const e of r.journal.questions) if (e.motif === 'quota' && e.origine === 'vue') expect(e.vue_le).not.toBeNull();
      }),
      { numRuns: TIRAGES },
    );
  });

  it('les poids de tirage favorisent les D élevés (1 + 3 × D / D_max)', () => {
    expect(poidsDeTirage(null, 2)).toBe(1);
    expect(poidsDeTirage(2, 2)).toBe(4);
    expect(poidsDeTirage(1, 2)).toBe(2.5);
    expect(poidsDeTirage(0, 0)).toBe(1);
    let fortSeul = 0;
    const b2 = creerBanque({
      questions: [
        { id: 'AAA-001', theme: 'a', axe: 'economie', sens: 1, D: 4 },
        { id: 'AAA-002', theme: 'a', axe: 'economie', sens: 1, D: 0 },
        { id: 'AAA-003', theme: 'a', axe: 'economie', sens: -1, D: 0 },
        ...Array.from({ length: 40 }, (_, i) => ({ id: `BBB-${String(i + 1).padStart(3, '0')}`, theme: 'b', axe: 'europe', sens: (i % 2 ? 1 : -1) as 1 | -1, D: null })),
      ],
      classementAncrage: [],
      ancres: [],
      ancresExpress: [],
    });
    // Thème a : trois questions de même axe, D = 4, 0, 0. On observe la première place du thème, quand aucun
    // filtre de sens ne s'applique : poids de tirage 4, 1, 1.
    let total = 0;
    for (let graine = 0; graine < 4000; graine++) {
      const r = tirer(b2, { mode: 'express', poids: { a: 1, b: 3 }, vues: [], graine });
      const e = r.journal.questions.find((x) => x.theme === 'a' && x.motif === 'quota' && x.place === 1)!;
      if (e.motif !== 'quota' || e.filtre_sens !== 'aucun') continue;
      expect(e.candidates).toBe(3);
      total++;
      if (e.question_id === 'AAA-001') fortSeul++;
    }
    // Poids 4, 1, 1 : la question de D maximal sort dans 4/6 des cas.
    expect(total).toBeGreaterThan(500);
    expect(fortSeul / total).toBeGreaterThan(0.6);
    expect(fortSeul / total).toBeLessThan(0.73);
  });

  it('ordre de passage : un chapitre par thème, ordre des thèmes mélangé par la graine', () => {
    const p = (graine: number): ParametresTirage => ({ mode: 'campagne', poids: {}, vues: [], graine });
    const ordres = new Set<string>();
    for (let g = 0; g < 50; g++) ordres.add(tirer(banque, p(g)).chapitres.map((c) => c.theme).join());
    expect(ordres.size).toBeGreaterThan(40);
    expect(tirer(banque, p(1)).chapitres).toHaveLength(11);
  });
});

describe('neutralité du tirage vis-à-vis des candidats (§ 7.3)', () => {
  it('les données par candidat fournies à la banque sont ignorées : la banque ne recopie que les champs autorisés', () => {
    const propre = banqueSynthetique({ questionsParTheme: 6 });
    const pollue = creerBanque({
      questions: propre.questions.map((q) => ({ ...q, codes: { 'candidat-a': 2, 'candidat-b': -2 }, positions: ['x'] })),
      classementAncrage: propre.classementAncrage,
      ancres: propre.ancres,
      ancresExpress: propre.ancresExpress,
      // @ts-expect-error — une banque n'a pas de champ pour les candidats
      candidats: ['candidat-a'],
    });
    expect(Object.keys(pollue.questions[0]!).sort()).toEqual(['D', 'axe', 'id', 'sens', 'theme']);
    expect(Object.keys(pollue)).not.toContain('candidats');
    for (let graine = 0; graine < 200; graine++) {
      const p: ParametresTirage = { mode: 'debat', poids: {}, vues: [], graine };
      expect(tirer(pollue, p)).toEqual(tirer(propre, p));
    }
  });

  it('les affinités déclarées n\'ont pas de place dans les paramètres et ne changent rien', () => {
    const p: ParametresTirage = { mode: 'express', poids: {}, vues: [], graine: 9 };
    // @ts-expect-error — ParametresTirage n'a pas de champ « affinites »
    const avecAffinites: ParametresTirage = { ...p, affinites: ['candidat-a'] };
    expect(tirer(banque, avecAffinites)).toEqual(tirer(banque, p));
  });

  it('une banque ne se fabrique pas à la main', () => {
    const faux = { themes: [], questions: [], classementAncrage: [], ancres: [], ancresExpress: [], provisoire: false };
    // @ts-expect-error — BanqueTirage est un type marqué : seul creerBanque ou construireBanqueTirage en produit
    expect(() => tirer(faux, { mode: 'express', poids: {}, vues: [], graine: 1 })).toThrow();
    expect(Object.isFrozen(banque)).toBe(true);
    expect(Object.isFrozen(banque.questions)).toBe(true);
  });
});

describe('cas aux bornes', () => {
  const ids = banque.questions.map((q) => q.id);

  it('un seul thème non nul', () => {
    for (const mode of MODES) {
      const poids = Object.fromEntries(banque.themes.map((t) => [t, (t === 'immigration' ? 2 : 0) as PoidsTheme]));
      const p: ParametresTirage = { mode, poids, vues: [], graine: 5 };
      const r = tirer(banque, p);
      expect(violations(banque, p, r)).toEqual([]);
      expect(r.chapitres.map((c) => c.theme)).toEqual(['immigration']);
    }
  });

  it('N supérieur au stock : toutes les questions des thèmes choisis, sans erreur, signalé au journal', () => {
    const petite = banqueSynthetique({ questionsParTheme: 2 });
    const p: ParametresTirage = { mode: 'campagne', poids: {}, vues: [], graine: 8 };
    const r = tirer(petite, p);
    expect(r.questions).toHaveLength(22);
    expect(r.journal.stock_insuffisant).toBe(true);
    expect(violations(petite, p, r)).toEqual([]);
    expect(decrireTirage(r.journal).join('\n')).toContain('pas assez de questions');
  });

  it('aucune question vue, puis toutes vues', () => {
    const p: ParametresTirage = { mode: 'debat', poids: {}, vues: [], graine: 77 };
    expect(violations(banque, p, tirer(banque, p))).toEqual([]);
    const toutes: ParametresTirage = { ...p, vues: ids.map((id, i) => ({ id, date: `2026-0${1 + (i % 9)}-15` })) };
    const r = tirer(banque, toutes);
    expect(violations(banque, toutes, r, { equilibreGlobal: true })).toEqual([]);
    for (const e of r.journal.questions) if (e.motif === 'quota') expect(e.origine).toBe('vue');
  });

  it('toutes vues : les plus anciennement vues passent d\'abord', () => {
    // Thème unique de 10 questions, quota 2 en Express ? Non : N = 20 > 10, on prend tout.
    // On utilise un thème plus grand que son quota : 11 thèmes de 8, N = 20 → quotas de 1 à 2.
    const vues = ids.map((id, i) => ({ id, date: i % 2 === 0 ? '2026-01-01' : '2026-06-01' }));
    for (let graine = 0; graine < 300; graine++) {
      const r = tirer(banque, { mode: 'express', poids: {}, vues, graine });
      for (const e of r.journal.questions) {
        if (e.motif !== 'quota') continue;
        // Une question vue récemment n'est prise que si les filtres de sens ou d'axe écartent les anciennes.
        if (e.vue_le === '2026-06-01') expect(e.filtre_sens !== 'aucun' || e.axe_ecarte !== null).toBe(true);
      }
    }
  });

  it('D non défini partout (ancrage vide) : tirage uniforme, aucune ancre, sans erreur', () => {
    const b = banqueSynthetique({ D: () => null });
    expect(b.ancres).toEqual([]);
    fc.assert(
      fc.property(arbGraine, arbMode, arbPoids(b.themes), (graine, mode, poids) => {
        const p: ParametresTirage = { mode, poids, vues: [], graine };
        const r = tirer(b, p);
        expect(violations(b, p, r, { equilibreGlobal: true })).toEqual([]);
        expect(r.journal.ancres.retenues).toEqual([]);
        expect(r.journal.d_max).toBeNull();
        for (const e of r.journal.questions) if (e.motif === 'quota') expect(e.poids_tirage).toBe(1);
      }),
      { numRuns: 1000 },
    );
  });

  it('ancrage partiel (§ 7.5) : une seule ancre éligible, places libres rendues au tirage ordinaire', () => {
    const b = banqueSynthetique({ D: (t, k) => (t === 0 && k === 0 ? 2.5 : null) });
    expect(b.ancres).toEqual(['RET-001']);
    expect(b.ancresExpress).toEqual(['RET-001']);
    for (const mode of MODES) {
      const r = tirer(b, { mode, poids: {}, vues: [], graine: 4 });
      expect(r.questions).toContain('RET-001');
      expect(r.journal.ancres.retenues).toEqual(['RET-001']);
      expect(r.journal.ancres.places_non_pourvues).toBe(0);
      // Thème à 0 : l'ancre est écartée et rien ne la remplace.
      const sansRet = tirer(b, { mode, poids: { retraites: 0 }, vues: [], graine: 4 });
      expect(sansRet.journal.ancres.ecartees).toEqual([{ question_id: 'RET-001', motif: 'theme_a_zero' }]);
      expect(sansRet.journal.ancres.places_non_pourvues).toBe(1);
      expect(sansRet.questions.some((id) => id.startsWith('RET'))).toBe(false);
    }
  });

  it('ancre écartée remplacée par la suivante du classement qui respecte les contraintes', () => {
    const b = banqueSynthetique();
    const ancre = b.questions.find((q) => q.id === b.ancres[0])!;
    const r = tirer(b, { mode: 'debat', poids: { [ancre.theme]: 0 }, vues: [], graine: 1 });
    expect(r.journal.ancres.ecartees.map((e) => e.question_id)).toEqual([ancre.id]);
    expect(r.journal.ancres.remplacements).toHaveLength(1);
    const remplacante = b.questions.find((q) => q.id === r.journal.ancres.remplacements[0])!;
    // Une par thème : le thème de la remplaçante n'avait pas d'ancre.
    const themesAncres = r.journal.ancres.retenues.map((id) => b.questions.find((q) => q.id === id)!.theme);
    expect(new Set(themesAncres).size).toBe(themesAncres.length);
    expect(remplacante.theme).not.toBe(ancre.theme);
    // Sens : au moins quatre de chaque.
    const sens = r.journal.ancres.retenues.map((id) => b.questions.find((q) => q.id === id)!.sens);
    expect(sens.filter((s) => s === 1).length).toBeGreaterThanOrEqual(4);
    expect(sens.filter((s) => s === -1).length).toBeGreaterThanOrEqual(4);
    // C'est la première du classement, hors ancres prévues, dont le thème est tiré et sans ancre, et dont
    // l'axe compte moins de trois ancres : aucune question mieux classée ne remplissait ces conditions avec
    // le sens requis.
    const autres = r.journal.ancres.retenues.filter((id) => id !== remplacante.id).map((id) => b.questions.find((q) => q.id === id)!);
    const axeLibre = (axe: string) => autres.filter((q) => q.axe === axe).length < 3;
    const sensLibre = (s: 1 | -1) => s === remplacante.sens || autres.filter((q) => q.sens === s).length >= 4;
    for (const id of b.classementAncrage.slice(0, b.classementAncrage.indexOf(remplacante.id))) {
      if (b.ancres.includes(id)) continue;
      const q = b.questions.find((x) => x.id === id)!;
      const eligible = q.theme !== ancre.theme && !autres.some((x) => x.theme === q.theme) && axeLibre(q.axe) && sensLibre(q.sens);
      expect(eligible).toBe(false);
    }
  });

  it('contrainte « une ancre par thème » levée quand les thèmes restants ne suffisent plus', () => {
    // Deux thèmes seulement, ancres prévues dans six thèmes : on met quatre thèmes d'ancres à 0.
    const b = banqueSynthetique({ questionsParTheme: 12 });
    const themesAncres = b.ancres.map((id) => b.questions.find((q) => q.id === id)!.theme);
    const gardes = new Set(themesAncres.slice(0, 2));
    const poids = Object.fromEntries(b.themes.map((t) => [t, (gardes.has(t) ? 3 : 0) as PoidsTheme]));
    const p: ParametresTirage = { mode: 'campagne', poids, vues: [], graine: 3 };
    const r = tirer(b, p);
    expect(r.journal.ancres.contrainte_un_par_theme_levee).toBe(true);
    expect(violations(b, p, r)).toEqual([]);
    // Jamais plus d'ancres dans un thème que son quota.
    for (const l of r.journal.quotas) {
      const n = r.journal.ancres.retenues.filter((id) => b.questions.find((q) => q.id === id)!.theme === l.theme).length;
      expect(n).toBeLessThanOrEqual(l.quota);
    }
  });

  it('paramètres invalides : erreurs explicites', () => {
    const p: ParametresTirage = { mode: 'express', poids: {}, vues: [], graine: 1 };
    expect(() => tirer(banque, { ...p, graine: -1 })).toThrow(ErreurTirage);
    expect(() => tirer(banque, { ...p, poids: Object.fromEntries(banque.themes.map((t) => [t, 0 as PoidsTheme])) })).toThrow(ErreurTirage);
    expect(() => tirer(banque, { ...p, poids: { inconnu: 1 } })).toThrow(ErreurTirage);
    expect(() => tirer(banque, { ...p, poids: { retraites: 4 as PoidsTheme } })).toThrow(ErreurTirage);
    expect(() => tirer(banque, { ...p, vues: [{ id: 'RET-001', date: 'hier' }] })).toThrow(ErreurTirage);
    // Une heure sans fuseau dépendrait du fuseau du téléphone : refusée.
    expect(() => tirer(banque, { ...p, vues: [{ id: 'RET-001', date: '2026-10-03T10:00' }] })).toThrow(ErreurTirage);
    expect(() => tirer(banque, { ...p, vues: [{ id: 'RET-001', date: '2026-10-03T10:00:00Z' }] })).not.toThrow();
    // Une question vue qui n'existe plus est simplement ignorée.
    expect(() => tirer(banque, { ...p, vues: [{ id: 'XXX-999', date: '2026-10-03' }] })).not.toThrow();
  });

  it('banque incohérente : erreurs explicites', () => {
    const q = { id: 'AAA-001', theme: 'a', axe: 'economie', sens: 1 as const, D: 1 };
    expect(() => creerBanque({ questions: [q, q], classementAncrage: [], ancres: [], ancresExpress: [] })).toThrow(ErreurBanque);
    expect(() => creerBanque({ questions: [{ ...q, D: 5 }], classementAncrage: [], ancres: [], ancresExpress: [] })).toThrow(ErreurBanque);
    expect(() => creerBanque({ questions: [q], classementAncrage: [], ancres: ['AAA-001'], ancresExpress: [] })).toThrow(ErreurBanque);
    expect(() => creerBanque({ questions: [q], classementAncrage: ['ZZZ-001'], ancres: [], ancresExpress: [] })).toThrow(ErreurBanque);
  });

  it('écart minimal atteignable (outil de test)', () => {
    expect(ecartMinimal(5, 3, 3)).toBe(1);
    expect(ecartMinimal(4, 1, 5)).toBe(2);
    expect(ecartMinimal(0, 0, 0)).toBe(0);
  });
});

describe('journal de tirage', () => {
  it('explique chaque question tirée, dans l\'ordre de passage', () => {
    const r = tirer(banque, { mode: 'debat', poids: { defense: 0, sante: 3 }, vues: [], graine: 31 });
    expect(r.journal.questions.map((e) => e.question_id)).toEqual(r.questions);
    const texte = decrireTirage(r.journal);
    expect(texte[0]).toContain('Graine du tirage : 31');
    expect(texte.join('\n')).toContain('defense : poids 0, thème non tiré');
    for (const id of r.questions) expect(texte.some((l) => l.includes(`— ${id} (`))).toBe(true);
    expect(r.journal.questions.filter((e) => e.motif !== 'quota').length).toBe(r.journal.ancres.retenues.length);
  });
});

describe('sur les données réelles (data/ et derive/)', () => {
  const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const ds = chargerDataset(racine);
  const lire = <T>(nom: string): T => JSON.parse(readFileSync(join(racine, 'derive', nom), 'utf8')) as T;
  const reelle: BanqueTirage = construireBanqueTirage(
    Object.values(ds.questions).flatMap((f) => f.questions),
    lire<DeriveDiscriminance.DeriveDiscriminance>('discriminance.json'),
    lire<DeriveAncrage.DeriveAncrage>('ancrage.json'),
  );

  it('la banque contient les 206 questions actives et l\'ancrage publié', () => {
    expect(reelle.questions).toHaveLength(206);
    expect(reelle.themes).toHaveLength(11);
    expect(reelle.ancres).toEqual(lire<DeriveAncrage.DeriveAncrage>('ancrage.json').ancres);
  });

  for (const mode of MODES) {
    it(`tirages valides en mode ${mode} (2 000 graines, poids aléatoires)`, () => {
      fc.assert(
        fc.property(arbGraine, arbPoids(reelle.themes), (graine, poids) => {
          const p: ParametresTirage = { mode, poids, vues: [], graine };
          const r = tirer(reelle, p);
          expect(violations(reelle, p, r, { equilibreGlobal: true })).toEqual([]);
        }),
        { numRuns: 2000 },
      );
    });
  }

  it('refuse des fichiers dérivés provenant d\'états différents des données', () => {
    const d = lire<DeriveDiscriminance.DeriveDiscriminance>('discriminance.json');
    const a = lire<DeriveAncrage.DeriveAncrage>('ancrage.json');
    expect(() => construireBanqueTirage([], d, { ...a, empreinte_donnees: '0'.repeat(64) })).toThrow(ErreurBanque);
  });
});

describe('quotas : cas limite plafond puis minimum', () => {
  it('N = 5, poids 1, 1, 1, 3 (stock 2), 1 : la somme des quotas vaut 5, chaque thème en reçoit au moins 1', () => {
    const entrees = [1, 1, 1, 3, 1].map((poids, i) => ({ theme: `t${i}`, poids: poids as PoidsTheme, stock: poids === 3 ? 2 : 1 }));
    for (const graine of [0, 1, 2, 3]) {
      const { quotas, places } = calculerQuotas(5, entrees, creerGenerateur(graine));
      expect(places).toBe(5);
      expect([...quotas.values()].reduce((s, q) => s + q, 0)).toBe(5);
      for (const e of entrees) expect(quotas.get(e.theme)!).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('quotas : cas limite minimum puis plafond', () => {
  it('N = 20, poids 2 (stock 1), 2 (stock 1), 1 (stock 2) : tout le stock est tiré (4 places)', () => {
    const entrees = [
      { theme: 't0', poids: 2 as PoidsTheme, stock: 1 },
      { theme: 't1', poids: 2 as PoidsTheme, stock: 1 },
      { theme: 't2', poids: 1 as PoidsTheme, stock: 2 },
    ];
    const { quotas, places } = calculerQuotas(20, entrees, creerGenerateur(0));
    expect(places).toBe(4);
    expect(Object.fromEntries(quotas)).toEqual({ t0: 1, t1: 1, t2: 2 });
  });
});
