import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pourcentage, SEUIL_EVALUE } from './libelles.ts';
import { paquet } from './paquet.ts';

const couverture = JSON.parse(readFileSync('derive/couverture.json', 'utf8')) as {
  seuil_evalue: number;
  candidats: Record<string, { taux_couverture: number; statut_evaluation: string }>;
};

describe('statut « évalué » (méthodologie § 6.3, lot 5g)', () => {
  it('le seuil des textes est celui des données dérivées', () => {
    expect(SEUIL_EVALUE).toBe(couverture.seuil_evalue);
  });

  it('chaque candidat codé est « evalue » si et seulement s’il atteint le seuil', () => {
    for (const c of paquet.candidats) {
      if (c.statutEvaluation === 'non_evalue') continue;
      const publiees = (paquet.positions[c.id] ?? []).filter((p) => p.etat === 'publie').length;
      const part = publiees / paquet.questions.length;
      expect(c.statutEvaluation === 'evalue', c.id).toBe(part >= SEUIL_EVALUE);
      expect(part, c.id).toBeCloseTo(couverture.candidats[c.id]!.taux_couverture, 5);
    }
  });

  it('affiche les pourcentages à une décimale, sans arrondir au-dessus du seuil', () => {
    expect(pourcentage(98 / 206)).toMatch(/^47,6\s%$/);
    const n = paquet.questions.length;
    for (let k = 0; k / n < SEUIL_EVALUE; k++) expect(pourcentage(k / n)).not.toMatch(/^40,0/);
    expect(pourcentage(SEUIL_EVALUE)).toMatch(/^40,0\s%$/);
  });
});
