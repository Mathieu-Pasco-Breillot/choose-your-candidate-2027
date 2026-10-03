import { describe, expect, it } from 'vitest';
import { MANCHES_DEFI, nouveauDefi } from './defi.ts';
import { paquet } from './paquet.ts';

describe('défi « Qui a dit ça ? » dans l\'application', () => {
  it('donne des manches équilibrées et sourcées, sur 30 graines', () => {
    for (let graine = 0; graine < 30; graine++) {
      const d = nouveauDefi(graine);
      expect(d.manches.length).toBeLessThanOrEqual(MANCHES_DEFI);
      expect(d.manches.length).toBeGreaterThan(0);
      for (const m of d.manches) {
        expect(m.propositions).toContain(m.bonne_reponse);
        expect(new Set(m.propositions).size).toBe(m.propositions.length);
        expect(m.revelation.source.url).toMatch(/^https?:\/\//);
      }
    }
  });

  it('la devinette ne contient jamais le nom ni le prénom du candidat', () => {
    for (let graine = 0; graine < 30; graine++) {
      for (const m of nouveauDefi(graine).manches) {
        const c = paquet.candidats.find((x) => x.id === m.bonne_reponse)!;
        const texte = `${m.indice.reformulation} ${m.indice.citation ?? ''}`.toLowerCase();
        expect(texte).not.toContain(c.nom.toLowerCase());
      }
    }
  });

  it('même graine, même défi', () => {
    expect(nouveauDefi(7)).toEqual(nouveauDefi(7));
  });

  it("le paquet n'emporte la version anonymisée que des positions du défi", () => {
    for (const liste of Object.values(paquet.defi)) {
      for (const p of liste as { extraits: { reformulation_anonymisee?: string }[] }[]) {
        if (p.extraits.length === 0) continue;
        expect(p.extraits).toHaveLength(1);
        expect(p.extraits[0]!.reformulation_anonymisee).toBeTruthy();
      }
    }
  });
});
