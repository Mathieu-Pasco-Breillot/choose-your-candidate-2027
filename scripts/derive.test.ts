import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { chargerDataset } from './lib/dataset.ts';
import {
  calculerAccordCodeurs,
  calculerAncrage,
  calculerCouverture,
  calculerDiscriminance,
  estPublie,
  kappaQuadratique,
  pouvoirDiscriminant,
  selectionner,
  variancePopulation,
} from './lib/derive.ts';
import { jeuSynthetique, position } from './lib/jeu-synthetique.ts';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const reel = chargerDataset(racine);
const arrondi3 = (x: number | null) => (x === null ? null : Math.round(x * 1000) / 1000);

describe('pouvoir discriminant (méthodologie § 7.1)', () => {
  it('cas T7 de la spécification : codes +2, +2, −2, −2 sur 9 candidats évalués → D = 1,78', () => {
    const r = pouvoirDiscriminant([2, 2, -2, -2], 9)!;
    expect(r.variance).toBe(4);
    expect(arrondi3(r.D)).toBe(1.778);
  });

  it('la variance est celle de la population (division par n, pas n − 1)', () => {
    expect(variancePopulation([0, 4])).toBe(4);
    expect(variancePopulation([1, 1, 1, 1])).toBe(0);
  });

  it('n\'est pas défini sous 4 candidats codés', () => {
    expect(pouvoirDiscriminant([2, -2, 2], 9)).toBeNull();
    expect(pouvoirDiscriminant([2, -2, 2, -2], 9)).not.toBeNull();
  });

  it('D reste entre 0 et 4', () => {
    expect(pouvoirDiscriminant([2, 2, -2, -2], 4)!.D).toBe(4);
    expect(pouvoirDiscriminant([0, 0, 0, 0], 4)!.D).toBe(0);
  });

  it('un code 0 est un code : il compte dans les candidats codés', () => {
    const ds = jeuSynthetique({ 'RET-001': [0, 0, 0, 0, null, null] });
    const d = calculerDiscriminance(ds);
    expect(d.questions['RET-001']!.candidats_codes).toBe(4);
    expect(d.questions['RET-001']!.D).toBe(0);
  });
});

describe('désaccord non arbitré = « non connu » (D8)', () => {
  it('une position en arbitrage_en_attente n\'est jamais publiée, même si un code y figure', () => {
    expect(estPublie(position('candidat-a', 'RET-001', 1, 'nette', 'arbitrage_en_attente') as never)).toBe(false);
    expect(estPublie({ ...(position('candidat-a', 'RET-001', 1) as object), code: 1 } as never)).toBe(true);
  });

  it('sur les données réelles (phase 4, vagues 1 et 2) : 648 codes publiés, aucun arbitrage en attente', () => {
    const couverture = calculerCouverture(reel) as { candidats: Record<string, { codes_publies: number; arbitrages_en_attente: number }> };
    const total = Object.values(couverture.candidats).reduce((s, c) => s + c.codes_publies, 0);
    const attente = Object.values(couverture.candidats).reduce((s, c) => s + c.arbitrages_en_attente, 0);
    expect(total).toBe(648);
    expect(attente).toBe(0);
  });
});

describe('kappa pondéré quadratique', () => {
  it('vaut 1 pour un accord parfait avec des codes variés', () => {
    expect(kappaQuadratique([[2, 2], [-2, -2], [0, 0], [1, 1]])).toBe(1);
  });

  it('n\'est pas défini quand tous les codes sont identiques, ou sans couple', () => {
    expect(kappaQuadratique([[1, 1], [1, 1]])).toBeNull();
    expect(kappaQuadratique([])).toBeNull();
  });

  it('est négatif pour un désaccord systématique', () => {
    expect(kappaQuadratique([[2, -2], [-2, 2], [2, -2], [-2, 2]])!).toBeLessThan(0);
  });

  it('pénalise plus un écart de deux crans qu\'un écart d\'un cran', () => {
    const base = [[2, 2], [-2, -2], [0, 0], [1, 1], [-1, -1]] as [number, number][];
    const unCran = kappaQuadratique([...base, [2, 1]])!;
    const deuxCrans = kappaQuadratique([...base, [2, 0]])!;
    expect(unCran).toBeGreaterThan(deuxCrans);
  });
});

describe('reproduit les chiffres publiés de la phase 4 (vagues 1 et 2, 11 thèmes, 4 octobre 2026)', () => {
  const accord = calculerAccordCodeurs(reel);

  it('accord global : 697 couples, 546 accords (78,3 %), code seul 83,5 %, kappa 0,943', () => {
    expect(accord.global.couples_codes).toBe(697);
    expect(accord.global.accord_code_et_nature).toBe(546);
    expect(arrondi3(accord.global.taux_accord)).toBe(0.783);
    expect(arrondi3(accord.global.taux_accord_code_seul)).toBe(0.835);
    expect(arrondi3(accord.global.kappa_pondere_quadratique)).toBe(0.943);
    // 12 arbitrages du pilote + 121 (vague 1) + 18 (vague 2) arbitrages provisoires par un troisième modèle, validation humaine en attente.
    expect(accord.arbitrages.en_attente).toBe(0);
    expect(accord.arbitrages.rendus).toBe(151);
    expect(accord.controle_humain.tires_au_sort).toBe(64);
    expect(accord.controle_humain.effectues).toBe(9);
  });

  it.each([
    ['arthaud-nathalie', 65, 48, 0.889, 0],
    ['attal-gabriel', 68, 51, 0.952, 0],
    ['dupont-aignan-nicolas', 84, 68, 0.938, 0],
    ['le-pen-marine', 83, 67, 0.947, 0],
    ['lisnard-david', 84, 68, 0.899, 0],
    ['melenchon-jean-luc', 105, 80, 0.959, 0],
    ['philippe-edouard', 55, 41, 0.982, 0],
    ['retailleau-bruno', 82, 66, 0.94, 0],
    ['roussel-fabien', 71, 57, 0.968, 0],
  ])('%s : %i couples, %i accords, kappa %f, %i arbitrage(s) en attente', (id, couples, accords, kappa, attente) => {
    const b = accord.par_candidat[id]!;
    expect(b.couples_codes).toBe(couples);
    expect(b.accord_code_et_nature).toBe(accords);
    expect(arrondi3(b.kappa_pondere_quadratique)).toBe(kappa);
    expect(b.arbitrages_en_attente).toBe(attente);
  });

  it.each([
    // candidat, avec extrait, codes publiés, nette, nuancée, imprécise, « non connu » malgré un extrait (règle R4)
    ['arthaud-nathalie', 65, 58, 14, 21, 23, 5],
    ['attal-gabriel', 68, 64, 18, 30, 16, 1],
    ['dupont-aignan-nicolas', 84, 84, 36, 35, 13, 0],
    ['le-pen-marine', 83, 79, 34, 36, 9, 2],
    ['lisnard-david', 84, 78, 26, 35, 17, 5],
    ['melenchon-jean-luc', 105, 98, 45, 28, 25, 5],
    ['philippe-edouard', 55, 46, 12, 19, 15, 3],
    ['retailleau-bruno', 82, 75, 31, 31, 13, 5],
    ['roussel-fabien', 71, 66, 26, 29, 11, 2],
  ])('couverture de %s : %i extraits, %i codes, natures %i/%i/%i, %i R4', (id, extraits, codes, nette, nuancee, imprecise, r4) => {
    const c = (calculerCouverture(reel).candidats as Record<string, never>)[id] as {
      avec_extrait: number;
      codes_publies: number;
      natures: { nette: number; nuancee: number; imprecise: number };
      non_connu_apres_accord: number;
    };
    expect(c.avec_extrait).toBe(extraits);
    expect(c.codes_publies).toBe(codes);
    expect(c.natures).toEqual({ nette, nuancee, imprecise });
    expect(c.non_connu_apres_accord).toBe(r4);
  });

  it('la couverture se juge sur l\'ensemble des 206 questions actives', () => {
    const c = calculerCouverture(reel);
    expect(c.questions_actives).toBe(206);
    const arthaud = (c.candidats as Record<string, { taux_couverture: number; seuil_evalue_atteint: boolean }>)['arthaud-nathalie']!;
    expect(arrondi3(arthaud.taux_couverture)).toBe(0.282);
    expect(arthaud.seuil_evalue_atteint).toBe(false);
  });
});

describe('sélection des ancres', () => {
  const q = (theme: string, axe: string, sens: 1 | -1) => ({ theme, axe, sens });

  it('une seule question par thème', () => {
    const r = selectionner([q('t1', 'a', 1), q('t1', 'b', -1), q('t2', 'a', 1)], { n: 10, parTheme: 1, parAxe: null, minParSens: 0 });
    expect(r.map((x) => x.theme)).toEqual(['t1', 't2']);
  });

  it('au plus trois questions par axe', () => {
    const ordre = ['t1', 't2', 't3', 't4', 't5'].map((t) => q(t, 'economie', 1));
    expect(selectionner(ordre, { n: 10, parTheme: 1, parAxe: 3, minParSens: 0 })).toHaveLength(3);
  });

  it('réserve des places pour atteindre le minimum de chaque sens', () => {
    // 6 questions de sens + en tête, puis des sens − : avec n = 6 et minimum 2, au plus 4 de sens +.
    const ordre = [
      ...['t1', 't2', 't3', 't4', 't5', 't6'].map((t) => q(t, t, 1)),
      ...['t7', 't8'].map((t) => q(t, t, -1)),
    ];
    const r = selectionner(ordre, { n: 6, parTheme: 1, parAxe: null, minParSens: 2 });
    expect(r).toHaveLength(6);
    expect(r.filter((x) => x.sens === -1)).toHaveLength(2);
    expect(r.filter((x) => x.sens === 1)).toHaveLength(4);
  });

  it('renvoie une liste plus courte quand les contraintes ne permettent pas d\'en retenir n', () => {
    const r = selectionner([q('t1', 'a', 1), q('t2', 'b', 1)], { n: 10, parTheme: 1, parAxe: 3, minParSens: 4 });
    expect(r).toHaveLength(2);
  });
});

describe('ancrage', () => {
  it('sur les données réelles (codage partiel) : la liste est plus courte et marquée provisoire', () => {
    const a = calculerAncrage(reel);
    expect(a.provisoire).toBe(true);
    expect(a.ancres_completes).toBe(false);
    expect(a.ancres.length).toBeLessThan(10);
    // Phase 4 : peu de questions sont codées pour au moins 80 % des candidats évalués, d'où 6 ancres seulement.
    expect(a.ancres).toEqual(['RET-002', 'IMM-001', 'FIS-001', 'INS-009', 'EDU-007', 'ENV-002']);
    // Règle de stabilité : RET-003, ancre du pilote, reste dans les 20 premières et est donc conservée
    // à la place de RET-002 (c'est la liste publiée dans derive/ancrage.json).
    expect(calculerAncrage(reel, ['RET-003']).ancres).toEqual(['RET-003', 'IMM-001', 'FIS-001', 'INS-009', 'EDU-007', 'ENV-002']);
  });

  it('avec un codage complet : 10 ancres, une par thème, ≤ 3 par axe, ≥ 4 de chaque sens, par D décroissant', () => {
    const ds = jeuSynthetique();
    const a = calculerAncrage(ds);
    expect(a.ancres).toHaveLength(10);
    expect(a.ancres_completes).toBe(true);
    const lignes = a.ancres.map((id) => a.classement.find((e) => e.question_id === id)!);
    expect(new Set(lignes.map((l) => l.theme)).size).toBe(10);
    for (const axe of new Set(lignes.map((l) => l.axe))) expect(lignes.filter((l) => l.axe === axe).length).toBeLessThanOrEqual(3);
    expect(lignes.filter((l) => l.sens === 1).length).toBeGreaterThanOrEqual(4);
    expect(lignes.filter((l) => l.sens === -1).length).toBeGreaterThanOrEqual(4);
    const d = lignes.map((l) => l.D);
    expect([...d].sort((x, y) => y - x)).toEqual(d);
  });

  it('mode Express : 5 ancres prises en tête de liste, avec au moins 2 questions de chaque sens', () => {
    const a = calculerAncrage(jeuSynthetique());
    expect(a.ancres_express).toHaveLength(5);
    expect(a.express_complet).toBe(true);
    const lignes = a.ancres_express.map((id) => a.classement.find((e) => e.question_id === id)!);
    expect(lignes.filter((l) => l.sens === 1).length).toBeGreaterThanOrEqual(2);
    expect(lignes.filter((l) => l.sens === -1).length).toBeGreaterThanOrEqual(2);
    for (const id of a.ancres_express) expect(a.ancres).toContain(id);
  });

  it('est stable : relancé sur les mêmes données avec le résultat précédent, il ne change pas', () => {
    const ds = jeuSynthetique();
    const premier = calculerAncrage(ds);
    const second = calculerAncrage(ds, premier.ancres);
    expect(second.ancres).toEqual(premier.ancres);
    expect(second).toEqual(premier);
  });

  it('une ancre qui sort des 20 premières est remplacée ; une qui y reste est conservée', () => {
    const ds = jeuSynthetique();
    const premier = calculerAncrage(ds);
    // On suppose qu'une ancre de la liste précédente n'existe plus dans le classement : elle est ignorée.
    const second = calculerAncrage(ds, ['XXX-999', ...premier.ancres.slice(1)]);
    expect(second.ancres).not.toContain('XXX-999');
    expect(second.ancres).toHaveLength(10);
  });

  it('exclut les questions couvertes pour moins de 80 % des candidats évalués', () => {
    // 5 candidats codés sur 6 = 83 % : éligible ; 4 sur 6 = 67 % : écartée.
    const ds = jeuSynthetique({
      'RET-001': [2, 2, -2, -2, 0, null],
      'RET-002': [2, 2, -2, -2, null, null],
    });
    const ids = calculerAncrage(ds).classement.map((e) => e.question_id);
    expect(ids).toContain('RET-001');
    expect(ids).not.toContain('RET-002');
  });
});

describe('discriminance sur données réelles', () => {
  it('liste les 206 questions actives ; D n\'est défini que pour celles codées par au moins 4 candidats', () => {
    const d = calculerDiscriminance(reel);
    expect(Object.keys(d.questions)).toHaveLength(206);
    expect(d.candidats_evalues).toBe(9);
    expect(d.provisoire).toBe(true);
    for (const [id, l] of Object.entries(d.questions)) {
      expect(l.D === null).toBe(l.candidats_codes < 4);
      if (l.D !== null) expect(l.D, id).toBeLessThanOrEqual(4);
    }
    expect(d.questions['RET-003']!.candidats_codes).toBe(9);
  });
});
