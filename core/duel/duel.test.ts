import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { enAttente, pos, rep } from '../score/outils-tests.ts';
import { scoreCandidat } from '../score/resultats.ts';
import type { Position, Valeur } from '../score/types.ts';
import { THEMES_TEST } from '../tirage/outils-test.ts';
import type { PoidsTheme } from '../tirage/types.ts';
import { calculerAffinite, qualifierEcart } from './calcul.ts';
import { decrireDuel } from './journal.ts';
import { creerReservoirDuel, duelDisponible, propositionsParTheme, type QuestionActive } from './reservoir.ts';
import { tirerDuel } from './tirage.ts';
import { ErreurDuel, PROPOSITIONS_MIN_DUEL, TAILLES_DUEL, type ParametresDuel } from './types.ts';

const AXES = ['economie', 'securite', 'frontieres', 'europe', 'ecologie', 'institutions'];

/** Banque synthétique : `parTheme[t]` questions pour le thème t, sens alternés, axes tournants. */
function questions(parTheme: readonly number[], themes: readonly string[] = THEMES_TEST): QuestionActive[] {
  const out: QuestionActive[] = [];
  themes.forEach((theme, t) => {
    for (let k = 0; k < (parTheme[t] ?? 0); k++) {
      out.push({ id: `T${String(t).padStart(2, '0')}-${String(k + 1).padStart(3, '0')}`, theme, axe: AXES[(t + k) % 3]!, sens: k % 2 === 0 ? 1 : -1 });
    }
  });
  return out;
}

/** Positions : toutes les questions codées avec le code donné (ou une fonction de l'indice). */
const toutesCodees = (qs: readonly QuestionActive[], code: Valeur | ((i: number) => Valeur) = 1): Position[] =>
  qs.map((q, i) => pos(q.id, typeof code === 'function' ? code(i) : code));

const reservoirComplet = (parTheme: readonly number[], candidat = 'candidat-a') => {
  const qs = questions(parTheme);
  return creerReservoirDuel(candidat, qs, toutesCodees(qs));
};

const parametres = (o: Partial<ParametresDuel> = {}): ParametresDuel => ({ taille: 20, poids: {}, vues: [], graine: 7, ...o });

describe('réservoir', () => {
  it('ne garde que les questions où le candidat a une position publiée avec un code', () => {
    const qs = questions([4]);
    const positions: Position[] = [
      pos(qs[0]!.id, 2),
      pos(qs[1]!.id, 0), // le code 0 est un code
      pos(qs[2]!.id, null), // non connu
      enAttente(qs[3]!.id), // arbitrage en attente : traité comme non connu (D8)
    ];
    const r = creerReservoirDuel('x', qs, positions);
    expect(r.propositions.map((p) => p.id)).toEqual([qs[0]!.id, qs[1]!.id]);
  });

  it('une position imprécise compte comme une proposition', () => {
    const qs = questions([2]);
    const r = creerReservoirDuel('x', qs, [pos(qs[0]!.id, 1, 'imprecise'), pos(qs[1]!.id, -1, 'nuancee')]);
    expect(r.propositions).toHaveLength(2);
  });

  it("ne recopie que id, thème, axe et sens : aucun code, nature ni extrait n'entre", () => {
    const qs = questions([3]);
    const bruitees = qs.map((q) => ({ ...q, code: 2, nature: 'nette', extrait: 'texte' }));
    const r = creerReservoirDuel('x', bruitees, toutesCodees(qs));
    for (const p of r.propositions) expect(Object.keys(p).sort()).toEqual(['axe', 'id', 'sens', 'theme']);
  });

  it('est gelé et refuse une question en double', () => {
    const qs = questions([3]);
    const r = creerReservoirDuel('x', qs, toutesCodees(qs));
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.propositions)).toBe(true);
    expect(() => creerReservoirDuel('x', [...qs, qs[0]!], toutesCodees(qs))).toThrow(ErreurDuel);
  });

  it('le duel est proposé à partir de 8 propositions (P24)', () => {
    expect(PROPOSITIONS_MIN_DUEL).toBe(8);
    expect(duelDisponible(reservoirComplet([7]))).toBe(false);
    expect(duelDisponible(reservoirComplet([8]))).toBe(true);
    expect(duelDisponible(reservoirComplet([]))).toBe(false);
  });
});

describe('tirage du duel', () => {
  const stocks = [10, 8, 6, 12, 4, 9, 7, 5, 11, 3, 6]; // 81 propositions

  it('est déterministe : même graine, mêmes entrées, même tirage', () => {
    const r = reservoirComplet(stocks);
    expect(tirerDuel(r, parametres({ graine: 123 }))).toEqual(tirerDuel(r, parametres({ graine: 123 })));
    expect(tirerDuel(r, parametres({ graine: 123 })).questions).not.toEqual(tirerDuel(r, parametres({ graine: 124 })).questions);
  });

  it.each([20, 40, 60] as const)('tire exactement %i propositions, sans doublon', (taille) => {
    const t = tirerDuel(reservoirComplet(stocks), parametres({ taille }));
    expect(t.questions).toHaveLength(taille);
    expect(new Set(t.questions).size).toBe(taille);
    expect(t.journal.stock_insuffisant).toBe(false);
  });

  it('quotas exacts : la somme des quotas vaut le nombre de propositions tirées', () => {
    const t = tirerDuel(reservoirComplet(stocks), parametres({ taille: 40, graine: 99 }));
    expect(t.journal.quotas.reduce((s, q) => s + q.quota, 0)).toBe(40);
    for (const c of t.chapitres) {
      expect(c.questions).toHaveLength(t.journal.quotas.find((q) => q.theme === c.theme)!.quota);
    }
  });

  it('quotas proportionnels aux propositions du candidat (poids égaux)', () => {
    // 20 × 30 / 60 = 10 places pour le thème de 30 propositions ; 20 × 10 / 60 = 3,33 pour chacun des trois autres.
    const t = tirerDuel(reservoirComplet([30, 10, 10, 10]), parametres({ taille: 20 }));
    const quota = (i: number) => t.journal.quotas.find((q) => q.theme === THEMES_TEST[i]!)!.quota;
    expect(quota(0)).toBe(10);
    for (const i of [1, 2, 3]) {
      expect(quota(i)).toBeGreaterThanOrEqual(3);
      expect(quota(i)).toBeLessThanOrEqual(4);
    }
  });

  it('un thème écarté (poids 0) n\'est jamais tiré', () => {
    const poids = Object.fromEntries(THEMES_TEST.map((t, i) => [t, (i % 3 === 0 ? 0 : 1) as PoidsTheme]));
    const ecartes = new Set(THEMES_TEST.filter((_, i) => i % 3 === 0));
    for (const graine of [1, 2, 3, 4, 5]) {
      const t = tirerDuel(reservoirComplet(stocks), parametres({ taille: 40, poids, graine }));
      expect(t.chapitres.every((c) => !ecartes.has(c.theme))).toBe(true);
      expect(t.questions).toHaveLength(40);
    }
  });

  it('un poids plus fort donne plus de places au thème', () => {
    const r = reservoirComplet([20, 20, 20]);
    const poids = { [THEMES_TEST[0]!]: 3 as PoidsTheme, [THEMES_TEST[1]!]: 1 as PoidsTheme, [THEMES_TEST[2]!]: 1 as PoidsTheme };
    const t = tirerDuel(r, parametres({ taille: 20, poids }));
    const quota = (i: number) => t.journal.quotas.find((q) => q.theme === THEMES_TEST[i]!)!.quota;
    expect(quota(0)).toBeGreaterThan(quota(1));
    expect(quota(1)).toBe(quota(2));
  });

  it('« tout le programme » : toutes les propositions des thèmes non écartés, dans un ordre mélangé', () => {
    const r = reservoirComplet(stocks);
    const t = tirerDuel(r, parametres({ taille: 'tout' }));
    expect(t.questions).toHaveLength(r.propositions.length);
    expect(new Set(t.questions)).toEqual(new Set(r.propositions.map((p) => p.id)));
    const sans = tirerDuel(r, parametres({ taille: 'tout', poids: { [THEMES_TEST[3]!]: 0 } }));
    expect(sans.questions).toHaveLength(r.propositions.length - stocks[3]!);
  });

  it('un thème sans proposition n\'est pas tiré et son poids est sans effet', () => {
    const r = reservoirComplet([10, 0, 10]);
    const t = tirerDuel(r, parametres({ taille: 20, poids: { [THEMES_TEST[1]!]: 0 } }));
    expect(t.questions).toHaveLength(20);
    expect(t.chapitres.map((c) => c.theme).sort()).toEqual([THEMES_TEST[0]!, THEMES_TEST[2]!].sort());
  });

  it('plus court que prévu quand le stock ne suffit pas', () => {
    const t = tirerDuel(reservoirComplet([5, 4]), parametres({ taille: 40 }));
    expect(t.questions).toHaveLength(9);
    expect(t.journal.stock_insuffisant).toBe(true);
    expect(t.journal.N).toBe(40);
  });

  it('reprend d\'abord les propositions vues le plus anciennement quand toutes ont été vues', () => {
    const r = reservoirComplet([30]);
    const ids = r.propositions.map((p) => p.id);
    const vues = ids.map((id, i) => ({ id, date: i < 10 ? '2026-01-01' : '2026-09-01' }));
    const t = tirerDuel(r, parametres({ taille: 20, graine: 3, vues }));
    expect(t.questions).toHaveLength(20);
    // Les 10 plus anciennes sont reprises avant les autres.
    for (const id of ids.slice(0, 10)) expect(t.questions).toContain(id);
    expect(t.journal.questions.every((e) => e.origine === 'vue')).toBe(true);
  });

  it('évite les propositions déjà vues tant qu\'il en reste de non vues', () => {
    const r = reservoirComplet([20, 20]);
    const vues = r.propositions.filter((_, i) => i % 2 === 0).map((p) => ({ id: p.id, date: '2026-09-01' }));
    const dejaVues = new Set(vues.map((v) => v.id));
    for (const graine of [10, 11, 12, 13]) {
      const t = tirerDuel(r, parametres({ taille: 20, graine, vues }));
      expect(t.questions.filter((id) => dejaVues.has(id))).toEqual([]);
    }
  });

  it('équilibre des sens : écart d\'une proposition au plus par thème, quand le stock est équilibré', () => {
    const r = reservoirComplet([12, 12, 12, 12, 12]);
    for (const graine of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const t = tirerDuel(r, parametres({ taille: 40, graine }));
      const sens = new Map(r.propositions.map((p) => [p.id, p.sens]));
      for (const c of t.chapitres) {
        const ecart = c.questions.reduce((s, id) => s + sens.get(id)!, 0);
        expect(Math.abs(ecart)).toBeLessThanOrEqual(1);
      }
      const total = t.questions.reduce((s, id) => s + sens.get(id)!, 0);
      expect(Math.abs(total)).toBeLessThanOrEqual(Math.ceil(0.1 * 40));
    }
  });

  it("le tirage ne dépend d'aucune position : mêmes propositions, autres codes, même tirage", () => {
    const qs = questions(stocks);
    const a = creerReservoirDuel('x', qs, toutesCodees(qs, 2));
    const b = creerReservoirDuel('x', qs, toutesCodees(qs, (i) => ((i % 5) - 2) as Valeur));
    const c = creerReservoirDuel('x', qs, qs.map((q, i) => pos(q.id, 1, i % 2 === 0 ? 'imprecise' : 'nette')));
    const t = tirerDuel(a, parametres({ taille: 40, graine: 5 }));
    expect(tirerDuel(b, parametres({ taille: 40, graine: 5 }))).toEqual(t);
    expect(tirerDuel(c, parametres({ taille: 40, graine: 5 }))).toEqual(t);
  });

  it('rejette les paramètres invalides', () => {
    const r = reservoirComplet(stocks);
    expect(() => tirerDuel(r, parametres({ taille: 30 as never }))).toThrow(ErreurDuel);
    expect(() => tirerDuel(r, parametres({ graine: -1 }))).toThrow(ErreurDuel);
    expect(() => tirerDuel(r, parametres({ graine: 1.5 }))).toThrow(ErreurDuel);
    expect(() => tirerDuel(r, parametres({ poids: { [THEMES_TEST[0]!]: 4 as never } }))).toThrow(ErreurDuel);
    expect(() => tirerDuel(r, parametres({ vues: [{ id: 'x', date: 'hier' }] }))).toThrow(ErreurDuel);
    expect(() => tirerDuel(r, parametres({ poids: Object.fromEntries(THEMES_TEST.map((t) => [t, 0 as PoidsTheme])) }))).toThrow(ErreurDuel);
  });

  it('propriété : quel que soit le tirage, quotas respectés, sans doublon, thèmes écartés absents', () => {
    const r = reservoirComplet(stocks);
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        fc.constantFrom(...TAILLES_DUEL),
        fc.array(fc.constantFrom<PoidsTheme>(0, 1, 2, 3), { minLength: THEMES_TEST.length, maxLength: THEMES_TEST.length }).filter((w) => w.some((x) => x > 0)),
        (graine, taille, w) => {
          const poids = Object.fromEntries(THEMES_TEST.map((t, i) => [t, w[i]!]));
          const t = tirerDuel(r, { taille, poids, vues: [], graine });
          const ecartes = new Set(THEMES_TEST.filter((_, i) => w[i] === 0));
          const stockActif = THEMES_TEST.reduce((s, _th, i) => s + (w[i]! > 0 ? stocks[i]! : 0), 0);
          const attendu = taille === 'tout' ? stockActif : Math.min(taille, stockActif);
          expect(t.questions).toHaveLength(attendu);
          expect(new Set(t.questions).size).toBe(t.questions.length);
          expect(t.chapitres.every((c) => !ecartes.has(c.theme))).toBe(true);
          expect(t.chapitres.flatMap((c) => c.questions)).toEqual(t.questions);
          for (const q of t.journal.quotas) {
            expect(t.chapitres.find((c) => c.theme === q.theme)?.questions.length ?? 0).toBe(q.quota);
          }
        },
      ),
      { numRuns: 150 },
    );
  });

  it('le journal décrit le tirage', () => {
    const t = tirerDuel(reservoirComplet(stocks), parametres({ taille: 20, graine: 42 }));
    const lignes = decrireDuel(t.journal);
    expect(lignes[0]).toContain('Graine du tirage : 42');
    expect(lignes.filter((l) => l.startsWith('— ') && l.includes('du quota du thème')).length).toBe(20);
  });

  it('propositionsParTheme compte les propositions', () => {
    const m = propositionsParTheme(reservoirComplet([3, 0, 5]));
    expect(m.get(THEMES_TEST[0]!)).toBe(3);
    expect(m.get(THEMES_TEST[2]!)).toBe(5);
    expect(m.has(THEMES_TEST[1]!)).toBe(false);
  });
});

describe("affinité d'un duel", () => {
  const POIDS = { retraites: 1, fiscalite: 1 };
  const ids8 = Array.from({ length: 8 }, (_, i) => `Q${i + 1}`);

  it('accord total sur 8 propositions : 100', () => {
    const reps = ids8.map((id) => rep(id, 2));
    const a = calculerAffinite('x', reps, POIDS, ids8.map((id) => pos(id, 2)));
    expect(a.score.scoreArrondi).toBe(100);
    expect(a.affichable).toBe(true);
    expect(a.avantAffichage).toBe(0);
    expect(a.repondues).toBe(8);
  });

  it('opposition totale : 0', () => {
    const reps = ids8.map((id) => rep(id, 2));
    expect(calculerAffinite('x', reps, POIDS, ids8.map((id) => pos(id, -2))).score.scoreArrondi).toBe(0);
  });

  it("n'est pas affichable sous 8 propositions répondues, et dit combien il en manque", () => {
    const a = calculerAffinite('x', ids8.slice(0, 5).map((id) => rep(id, 1)), POIDS, ids8.map((id) => pos(id, 1)));
    expect(a.affichable).toBe(false);
    expect(a.avantAffichage).toBe(3);
  });

  it('« sans avis » est exclu du score et des seuils', () => {
    const reps = [...ids8.slice(0, 7).map((id) => rep(id, 2)), rep(ids8[7]!, 'sans_avis')];
    const a = calculerAffinite('x', reps, POIDS, ids8.map((id) => pos(id, 2)));
    expect(a.repondues).toBe(7);
    expect(a.affichable).toBe(false);
  });

  it('applique la même formule que le classement : position imprécise à 0,5, ramenage compris', () => {
    const reps = ids8.map((id) => rep(id, 2));
    const positions = ids8.map((id, i) => pos(id, 2, i < 4 ? 'imprecise' : 'nette'));
    const a = calculerAffinite('x', reps, POIDS, positions);
    const attendu = scoreCandidat('x', reps, POIDS, positions);
    expect(a.score).toEqual(attendu.score);
    // Σ poids = 4 × 0,5 + 4 × 1 = 6 ; Σ poids de base = 8 ; c = 0,75 ; score brut 100.
    expect(a.score.c).toBeCloseTo(0.75, 10);
    expect(a.score.score).toBeCloseTo(50 + 50 * 0.75, 10);
  });

  it('« très important » compte double, et les poids de thème pèsent', () => {
    const reps = [
      rep('Q1', 2, true, 'retraites'),
      rep('Q2', -2, false, 'fiscalite'),
      ...ids8.slice(2).map((id) => rep(id, 0, false, 'retraites')),
    ];
    const positions = ids8.map((id, i) => pos(id, i === 0 ? 2 : i === 1 ? 2 : 0));
    const poids = { retraites: 3, fiscalite: 1 };
    const a = calculerAffinite('x', reps, poids, positions);
    const q1 = a.lignes.find((l) => l.questionId === 'Q1')!;
    expect(q1.poidsBase).toBe(6); // poids 3 × importance 2
    expect(a.lignes.find((l) => l.questionId === 'Q2')!.points).toBe(0);
  });

  it('donne les accords et désaccords forts et le détail par thème', () => {
    const reps = ids8.map((id, i) => rep(id, i < 4 ? 2 : -2));
    const a = calculerAffinite('x', reps, POIDS, ids8.map((id) => pos(id, 2)));
    expect(a.accords).toHaveLength(4);
    expect(a.desaccords).toHaveLength(4);
    expect(a.themes[0]!.affichage).toBe('affiche');
  });

  it('refuse un poids de thème hors de 1 à 3 pour un thème répondu', () => {
    expect(() => calculerAffinite('x', [rep('Q1', 1, false, 'retraites')], { retraites: 0 }, [pos('Q1', 1)])).toThrow(ErreurDuel);
    expect(() => calculerAffinite('x', [rep('Q1', 1, false, 'retraites')], {}, [pos('Q1', 1)])).toThrow(ErreurDuel);
  });

  it('aucune réponse : pas de score, pas d\'erreur', () => {
    const a = calculerAffinite('x', [], POIDS, []);
    expect(a.score.scoreArrondi).toBeNull();
    expect(a.affichable).toBe(false);
    expect(a.avantAffichage).toBe(8);
  });

  it("qualifie l'écart sans jugement de valeur", () => {
    expect(qualifierEcart(4)).toBe('meme_avis');
    expect(qualifierEcart(3)).toBe('proche');
    expect(qualifierEcart(2)).toBe('different');
    expect(qualifierEcart(1)).toBe('oppose');
    expect(qualifierEcart(0)).toBe('oppose');
  });

  it("propriété : l'affinité ne dépend pas de l'ordre des réponses", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -2, max: 2 }), { minLength: 8, maxLength: 20 }), fc.integer({ min: 0, max: 1000 }), (valeurs, graine) => {
        const reps = valeurs.map((v, i) => rep(`Q${i}`, v as Valeur, i % 3 === 0));
        const positions = valeurs.map((_, i) => pos(`Q${i}`, ((i * 7 + graine) % 5) - 2 as Valeur, i % 4 === 0 ? 'imprecise' : 'nette'));
        const melange = [...reps].sort((a, b) => ((a.questionId.charCodeAt(1) * 31 + graine) % 7) - ((b.questionId.charCodeAt(1) * 31 + graine) % 7));
        expect(calculerAffinite('x', melange, POIDS, positions).score).toEqual(calculerAffinite('x', reps, POIDS, positions).score);
      }),
      { numRuns: 100 },
    );
  });
});

describe('rapport de neutralité du duel', () => {
  it('décrit le réservoir de chaque candidat', async () => {
    const { calculerRapportDuel } = await import('./rapport.ts');
    const qs = questions([6, 4, 2]);
    const a = [...qs.slice(0, 8).map((q, i) => pos(q.id, 1, i < 2 ? 'imprecise' : 'nette')), pos(qs[8]!.id, null), enAttente(qs[9]!.id)];
    const b = qs.slice(0, 3).map((q) => pos(q.id, -1));
    const r = calculerRapportDuel(qs, { b, a });
    expect(r.candidats.map((c) => c.candidat)).toEqual(['a', 'b']);
    const [ca, cb] = r.candidats as [typeof r.candidats[number], typeof r.candidats[number]];
    expect(ca.propositions).toBe(8);
    expect(ca.duel_disponible).toBe(true);
    expect(ca.positions_imprecises).toBe(2);
    expect(ca.part_imprecise).toBe(0.25);
    expect(ca.par_theme).toEqual({ [THEMES_TEST[0]!]: 6, [THEMES_TEST[1]!]: 2 });
    expect(ca.par_sens.plus + ca.par_sens.moins).toBe(8);
    expect(ca.couverture_banque).toBeCloseTo(8 / 12, 6);
    expect(cb.duel_disponible).toBe(false);
    expect(r.proposition_min).toBe(8);
  });
});
