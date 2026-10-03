import { describe, expect, it } from 'vitest';
import { ECHELLE } from './libelles.ts';
import { estTerminee, marquerVues, nouvellePartie, questionCourante, questionsParId, reculer, repondre, resultatsDePartie, situation } from './jeu.ts';
import type { Partie } from './jeu.ts';

function jouer(p: Partie, choix: (i: number) => number | 'sans_avis'): Partie {
  let partie = p;
  let i = 0;
  while (!estTerminee(partie)) {
    const c = choix(i++);
    partie = repondre(partie, { valeur: c === 'sans_avis' ? 'sans_avis' : ECHELLE[c % 5]!.valeur, tresImportant: i % 7 === 0 });
  }
  return partie;
}

describe.each([
  ['express', 20],
  ['debat', 40],
] as const)('partie %s', (mode, taille) => {
  it(`tire ${taille} questions actives, sans doublon, regroupées par chapitre`, () => {
    for (let graine = 1; graine <= 50; graine++) {
      const p = nouvellePartie(mode, [], graine);
      expect(p.questions).toHaveLength(taille);
      expect(new Set(p.questions).size).toBe(taille);
      expect(p.chapitres.flatMap((c) => c.questions)).toEqual(p.questions);
      for (const id of p.questions) expect(questionsParId.get(id)?.statut).toBe('active');
    }
  });

  it('même graine = même partie', () => {
    expect(nouvellePartie(mode, [], 12345)).toEqual(nouvellePartie(mode, [], 12345));
  });

  it('une partie terminée donne des résultats complets, quelles que soient les réponses', () => {
    for (let graine = 1; graine <= 20; graine++) {
      const p = jouer(nouvellePartie(mode, [], graine), (i) => (i + graine) % 6 === 0 ? 'sans_avis' : (i * graine) % 5);
      const r = resultatsDePartie(p);
      expect(r.classement.length + r.horsClassement.length).toBe(9);
      expect(r.nonEvalues.length).toBeGreaterThan(0);
      for (const c of [...r.classement, ...r.horsClassement]) {
        expect(c.score.c).toBeGreaterThanOrEqual(0);
        expect(c.score.c).toBeLessThanOrEqual(1);
      }
    }
  });

  it('« sans avis » partout : aucun classement, aucune erreur', () => {
    const r = resultatsDePartie(jouer(nouvellePartie(mode, [], 7), () => 'sans_avis'));
    expect(r.classement).toHaveLength(0);
    expect(r.repondues).toBe(0);
  });
});

describe('déroulement', () => {
  it('reculer revient à la question précédente et garde la réponse', () => {
    let p = nouvellePartie('express', [], 3);
    const premiere = questionCourante(p).id;
    p = repondre(p, { valeur: 1, tresImportant: true });
    expect(p.position).toBe(1);
    p = reculer(p);
    expect(questionCourante(p).id).toBe(premiere);
    expect(p.reponses[premiere]).toEqual({ valeur: 1, tresImportant: true });
    expect(reculer(p)).toBe(p);
  });

  it('« sans avis » ne garde jamais « très important »', () => {
    const p = repondre(nouvellePartie('express', [], 3), { valeur: 'sans_avis', tresImportant: true });
    expect(Object.values(p.reponses)[0]).toEqual({ valeur: 'sans_avis', tresImportant: false });
  });

  it('la situation suit les chapitres', () => {
    const p = nouvellePartie('debat', [], 9);
    const s = situation(p);
    expect(s.chapitre).toBe(0);
    expect(s.dansChapitre).toBe(0);
    expect(s.taille).toBe(p.chapitres[0]!.questions.length);
  });

  it('l’échelle est inversée une partie sur deux', () => {
    expect(nouvellePartie('express', [], 2).echelleInversee).toBe(false);
    expect(nouvellePartie('express', [], 3).echelleInversee).toBe(true);
  });

  it('une nouvelle partie évite les questions déjà vues quand il reste des questions non vues', () => {
    const premiere = nouvellePartie('express', [], 5);
    const vues = marquerVues([], premiere, '2026-10-03');
    const seconde = nouvellePartie('express', vues, 6);
    const vuesIds = new Set(vues.map((v) => v.id));
    const communes = seconde.questions.filter((id) => vuesIds.has(id));
    // Les ancres peuvent revenir (elles sont fixes) ; hors ancres, aucune question vue.
    expect(communes.length).toBeLessThanOrEqual(5);
  });
});
