import { describe, expect, it } from 'vitest';
import { apresDesaccordsLus, apresPartie, apresSource, badgesDe, BADGES_VIDES, SOURCES_POUR_ENQUETEUR } from './badges.ts';
import { THEMES } from './libelles.ts';

const partie = (mode: 'express' | 'debat' | 'campagne', themes: string[]) => ({ mode, chapitres: themes.map((theme) => ({ theme, questions: [] })) });
const obtenu = (b: ReturnType<typeof badgesDe>, id: string) => b.find((x) => x.id === id)!.obtenu;

describe('badges', () => {
  it("aucun badge au départ", () => {
    expect(badgesDe(BADGES_VIDES).every((b) => !b.obtenu)).toBe(true);
  });

  it('« Tous les chapitres explorés » se cumule sur plusieurs parties', () => {
    const themes = Object.keys(THEMES);
    let b = apresPartie(BADGES_VIDES, partie('express', themes.slice(0, 6)));
    expect(obtenu(badgesDe(b), 'chapitres')).toBe(false);
    b = apresPartie(b, partie('express', themes.slice(5)));
    expect(obtenu(badgesDe(b), 'chapitres')).toBe(true);
  });

  it('« Partie Campagne terminée » seulement en mode Campagne', () => {
    expect(obtenu(badgesDe(apresPartie(BADGES_VIDES, partie('debat', []))), 'campagne')).toBe(false);
    expect(obtenu(badgesDe(apresPartie(BADGES_VIDES, partie('campagne', []))), 'campagne')).toBe(true);
  });

  it('« Enquêteur » compte des sources distinctes, sans garder les adresses', () => {
    let b = BADGES_VIDES;
    for (let i = 0; i < SOURCES_POUR_ENQUETEUR - 1; i++) b = apresSource(b, `https://exemple.fr/${i}`);
    b = apresSource(b, 'https://exemple.fr/0'); // doublon
    expect(obtenu(badgesDe(b), 'enqueteur')).toBe(false);
    b = apresSource(b, 'https://exemple.fr/dernier');
    expect(obtenu(badgesDe(b), 'enqueteur')).toBe(true);
    expect(JSON.stringify(b)).not.toContain('exemple.fr');
  });

  it('« Contradicteur » une fois le détail lu', () => {
    expect(obtenu(badgesDe(apresDesaccordsLus(BADGES_VIDES)), 'contradicteur')).toBe(true);
  });

  it("l'état ne contient ni candidat ni réponse", () => {
    const b = apresDesaccordsLus(apresSource(apresPartie(BADGES_VIDES, partie('campagne', ['retraites'])), 'https://exemple.fr/a'));
    expect(Object.keys(b).sort()).toEqual(['campagneTerminee', 'chapitres', 'desaccordsLus', 'sources', 'version']);
  });
});
