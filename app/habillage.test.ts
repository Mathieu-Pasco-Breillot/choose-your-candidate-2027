import { describe, expect, it } from 'vitest';
import { CHARGEMENT, NOM_MASCOTTE, titreFinChapitre, transition, TRANSITIONS } from './habillage.ts';
import { paquet } from './paquet.ts';

const themes = [...new Set(paquet.questions.map((q) => q.theme))];

describe('textes d’habillage (lot 5g)', () => {
  it('a une phrase de transition par chapitre possible, toutes différentes et avec le chapitre suivant', () => {
    expect(TRANSITIONS.length).toBeGreaterThanOrEqual(themes.length);
    expect(new Set(TRANSITIONS).size).toBe(TRANSITIONS.length);
    for (const t of TRANSITIONS) expect(t).toContain('{suivant}');
  });

  it('ne répète aucune phrase dans une même partie, quelle que soit la graine', () => {
    for (let graine = 0; graine < 200; graine++) {
      const vues = Array.from({ length: themes.length - 1 }, (_, i) => transition(i, graine, 'X'));
      expect(new Set(vues).size).toBe(vues.length);
    }
  });

  it('ne nomme aucun candidat, aucun parti ni aucun thème', () => {
    const textes = [...TRANSITIONS, CHARGEMENT, titreFinChapitre(1), titreFinChapitre(4), titreFinChapitre(0)].join(' ').toLowerCase();
    for (const c of paquet.candidats) {
      expect(textes).not.toContain(c.nom.toLowerCase());
      expect(textes).not.toContain(c.parti.toLowerCase());
    }
    for (const t of ['retraite', 'immigration', 'fiscalit', 'défense', 'santé', 'sécurité', 'europe', 'écologie', 'dette', 'éducation', 'institution'])
      expect(textes).not.toContain(t);
  });

  it('donne à la mascotte un nom non humain, repris par l’écran de chargement', () => {
    expect(NOM_MASCOTTE).toBe('Urnie');
    expect(CHARGEMENT).toContain(NOM_MASCOTTE);
  });
});
