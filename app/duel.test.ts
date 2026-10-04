import { describe, expect, it } from 'vitest';
import { PROPOSITIONS_MIN_DUEL } from '../core/duel/index.ts';
import { affiniteDePartie, candidatsDuel, enRevelation, modifierReponse, nouveauDuel, positionSur, repondreDuel, reservoirDe, suivante } from './duel.ts';
import type { PartieDuel } from './duel.ts';
import { estTerminee, marquerVues, questionsParId } from './jeu.ts';
import { ECHELLE } from './libelles.ts';

const disponibles = candidatsDuel().filter((c) => c.disponible);

/** Joue un duel en entier : répond, lit la révélation, passe à la suite. */
function jouerDuel(p: PartieDuel, choix: (i: number) => number | 'sans_avis'): PartieDuel {
  let partie = p;
  let i = 0;
  while (!estTerminee(partie)) {
    const c = choix(i++);
    partie = repondreDuel(partie, { valeur: c === 'sans_avis' ? 'sans_avis' : ECHELLE[c % 5]!.valeur, tresImportant: i % 7 === 0 });
    expect(enRevelation(partie)).toBe(true);
    partie = suivante(partie);
  }
  return partie;
}

describe('candidats du duel', () => {
  it('liste par ordre alphabétique ceux qui ont des positions, et ne propose le duel qu\'à partir de 8 propositions', () => {
    const tous = candidatsDuel();
    expect(tous.length).toBeGreaterThan(0);
    expect(tous.every((c) => c.propositions > 0)).toBe(true);
    for (const c of tous) expect(c.disponible).toBe(c.propositions >= PROPOSITIONS_MIN_DUEL);
    const noms = tous.map((c) => c.candidat.nom);
    expect(noms).toEqual([...noms].sort((a, b) => a.localeCompare(b, 'fr')));
    expect(disponibles.length).toBeGreaterThan(0);
  });

  it('le réservoir ne contient que des questions actives où le candidat a une position publiée', () => {
    for (const { candidat } of disponibles) {
      for (const p of reservoirDe(candidat.id).propositions) {
        expect(questionsParId.get(p.id)).toBeDefined();
        const pos = positionSur({ candidat: candidat.id } as PartieDuel, p.id);
        expect(pos?.etat).toBe('publie');
        expect(pos?.code).not.toBeNull();
      }
    }
  });
});

describe.each([20, 40, 60, 'tout'] as const)('duel (%s)', (taille) => {
  it('tire des propositions du candidat seulement, sans doublon, et se joue jusqu\'au résultat', () => {
    for (const { candidat, propositions } of disponibles) {
      const p = nouveauDuel(candidat.id, taille, [], 4242, { poids: {} });
      const attendu = taille === 'tout' ? propositions : Math.min(taille, propositions);
      expect(p.questions).toHaveLength(attendu);
      expect(new Set(p.questions).size).toBe(attendu);
      const ids = new Set(reservoirDe(candidat.id).propositions.map((x) => x.id));
      expect(p.questions.every((id) => ids.has(id))).toBe(true);
      expect(p.chapitres.flatMap((c) => c.questions)).toEqual(p.questions);
      const fin = jouerDuel(p, (i) => (i * 3 + 1) % 5);
      const a = affiniteDePartie(fin);
      expect(a.repondues).toBe(attendu);
      if (attendu >= 8) {
        expect(a.affichable).toBe(true);
        expect(a.score.scoreArrondi).toBeGreaterThanOrEqual(0);
        expect(a.score.scoreArrondi).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('déroulement', () => {
  const candidat = disponibles[0]!.candidat.id;

  it('même graine = même duel', () => {
    expect(nouveauDuel(candidat, 20, [], 99, { poids: {} })).toEqual(nouveauDuel(candidat, 20, [], 99, { poids: {} }));
  });

  it('répondre n\'avance pas : la position est révélée, puis « suivante » avance', () => {
    const p0 = nouveauDuel(candidat, 20, [], 5, { poids: {} });
    expect(enRevelation(p0)).toBe(false);
    const p1 = repondreDuel(p0, { valeur: 1, tresImportant: true });
    expect(p1.position).toBe(0);
    expect(enRevelation(p1)).toBe(true);
    expect(p1.reponses[p1.questions[0]!]).toEqual({ valeur: 1, tresImportant: true });
    const p2 = suivante(p1);
    expect(p2.position).toBe(1);
    expect(enRevelation(p2)).toBe(false);
  });

  it('« sans avis » ne garde jamais « très important »', () => {
    const p = repondreDuel(nouveauDuel(candidat, 20, [], 5, { poids: {} }), { valeur: 'sans_avis', tresImportant: true });
    expect(Object.values(p.reponses)[0]).toEqual({ valeur: 'sans_avis', tresImportant: false });
  });

  it('modifier la réponse l\'efface, pour pouvoir la donner à nouveau', () => {
    const p1 = repondreDuel(nouveauDuel(candidat, 20, [], 5, { poids: {} }), { valeur: 2, tresImportant: false });
    const p2 = modifierReponse(p1);
    expect(enRevelation(p2)).toBe(false);
    expect(Object.keys(p2.reponses)).toHaveLength(0);
    expect(modifierReponse(p2)).toBe(p2);
  });

  it('l\'affinité en direct n\'est affichable qu\'à partir de 8 réponses, et dit combien il en manque', () => {
    let p = nouveauDuel(candidat, 20, [], 5, { poids: {} });
    for (let i = 0; i < 7; i++) p = suivante(repondreDuel(p, { valeur: 2, tresImportant: false }));
    p = repondreDuel(p, { valeur: 2, tresImportant: false });
    const a8 = affiniteDePartie(p);
    expect(a8.repondues).toBe(8);
    expect(a8.affichable).toBe(true);
    const p7 = nouveauDuel(candidat, 20, [], 5, { poids: {} });
    const a1 = affiniteDePartie(repondreDuel(p7, { valeur: 2, tresImportant: false }));
    expect(a1.affichable).toBe(false);
    expect(a1.avantAffichage).toBe(7);
  });

  it('un chapitre écarté n\'est jamais posé', () => {
    const p = nouveauDuel(candidat, 20, [], 8, { poids: { retraites: 0 } });
    expect(p.chapitres.map((c) => c.theme)).not.toContain('retraites');
  });

  it('les propositions déjà vues passent après les autres', () => {
    const premiere = nouveauDuel(candidat, 20, [], 3, { poids: {} });
    const vues = marquerVues([], premiere, '2026-10-04');
    const seconde = nouveauDuel(candidat, 20, vues, 4, { poids: {} });
    const dejaVues = new Set(vues.map((v) => v.id));
    const total = reservoirDe(candidat).propositions.length;
    if (total >= 40) expect(seconde.questions.filter((id) => dejaVues.has(id))).toHaveLength(0);
  });
});
