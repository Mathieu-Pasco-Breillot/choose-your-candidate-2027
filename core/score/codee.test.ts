import { describe, expect, it } from 'vitest';
import type { Positions } from '../types.generated.ts';
import { estPublie } from '../../scripts/lib/derive.ts';
import { estCodee, estRepondue, etatDePosition } from './codee.ts';
import { enAttente, pos, rep } from './outils-tests.ts';

describe('question répondue', () => {
  it('−2 à +2 sont répondues, « sans avis » ne l\'est pas', () => {
    for (const v of [-2, -1, 0, 1, 2] as const) expect(estRepondue(rep('Q', v))).toBe(true);
    expect(estRepondue(rep('Q', 'sans_avis'))).toBe(false);
  });
});

describe('question codée', () => {
  it('le code 0 est un code', () => {
    expect(estCodee(pos('Q', 0))).toBe(true);
  });

  it('une position imprécise est codée (D9)', () => {
    expect(estCodee(pos('Q', 1, 'imprecise'))).toBe(true);
  });

  it('non connu, arbitrage en attente et absence d\'enregistrement ne sont pas codés', () => {
    expect(estCodee(pos('Q', null))).toBe(false);
    expect(estCodee(enAttente('Q'))).toBe(false);
    expect(estCodee(undefined)).toBe(false);
  });

  it('une position publiée sans code n\'est pas codée', () => {
    expect(estCodee({ questionId: 'Q', etat: 'publie', code: null, nature: 'non_connu' })).toBe(false);
  });
});

describe('etatDePosition suit la définition de estPublie (scripts/lib/derive.ts)', () => {
  const statuts = ['accord', 'arbitre', 'sans_extrait', 'arbitrage_en_attente'] as const;
  const codes = [null, -2, -1, 0, 1, 2];
  it.each(statuts.flatMap((s) => codes.map((c) => [s, c] as const)))('statut %s, code %s', (statut, code) => {
    const brute = { statut, code } as unknown as Positions.Position;
    expect(etatDePosition(statut, code) === 'publie').toBe(estPublie(brute));
  });

  it('un désaccord non arbitré est « arbitrage en attente » (D8)', () => {
    expect(etatDePosition('arbitrage_en_attente', null)).toBe('arbitrage_en_attente');
    expect(etatDePosition('sans_extrait', null)).toBe('non_connu');
    expect(etatDePosition('accord', null)).toBe('non_connu');
  });
});
