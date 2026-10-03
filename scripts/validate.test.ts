import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { chargerDataset, type Dataset } from './lib/dataset.ts';
import { validerDataset } from './lib/validate.ts';
import { jeuSynthetique } from './lib/jeu-synthetique.ts';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const reel = chargerDataset(racine);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Libre = any;
const copie = (ds: Dataset): Libre => structuredClone(ds);
const regles = (ds: Dataset) => validerDataset(ds).erreurs.map((e) => e.regle);

describe('données réelles', () => {
  it('sont valides (aucune erreur)', () => {
    expect(validerDataset(reel).erreurs).toEqual([]);
  });
});

describe('jeu synthétique', () => {
  it('est valide : la base de tous les tests de mutation ci-dessous', () => {
    expect(validerDataset(jeuSynthetique()).erreurs).toEqual([]);
  });
});

describe('règle : une question active doit avoir une source', () => {
  it('échoue si la source est absente', () => {
    const ds = copie(jeuSynthetique());
    delete ds.questions['retraites'].questions[0].origine.source;
    expect(regles(ds)).toContain('question-active-sans-source');
  });
  it('échoue si l’URL de la source est vide', () => {
    const ds = copie(jeuSynthetique());
    ds.questions['retraites'].questions[0].origine.source.url = '';
    expect(regles(ds).length).toBeGreaterThan(0);
  });
  it('échoue aussi sur les données réelles modifiées', () => {
    const ds = copie(reel);
    const q = Object.values<Libre>(ds.questions)[0].questions.find((x: Libre) => x.statut === 'active');
    delete q.origine.source;
    expect(regles(ds)).toContain('question-active-sans-source');
  });
});

describe('règle : un code doit avoir un extrait', () => {
  it('échoue si une position avec code n’a aucun extrait', () => {
    const ds = copie(jeuSynthetique());
    ds.positions['candidat-a'].positions[0].extraits = [];
    expect(regles(ds)).toContain('code-sans-extrait');
  });
  it('échoue aussi sur les données réelles modifiées', () => {
    const ds = copie(reel);
    const p = Object.values<Libre>(ds.positions)[0].positions.find((x: Libre) => x.code !== null);
    p.extraits = [];
    expect(regles(ds)).toContain('code-sans-extrait');
  });
});

describe('règle : un identifiant ne peut pas être réutilisé', () => {
  it('question : même id dans deux thèmes', () => {
    const ds = copie(jeuSynthetique());
    ds.questions['sante'].questions[0].id = ds.questions['retraites'].questions[0].id;
    expect(regles(ds)).toContain('id-question-reutilise');
  });
  it('question : même id deux fois dans un thème', () => {
    const ds = copie(jeuSynthetique());
    const l = ds.questions['retraites'].questions;
    l[1].id = l[0].id;
    expect(regles(ds)).toContain('id-question-reutilise');
  });
  it('candidat : même id deux fois', () => {
    const ds = copie(jeuSynthetique());
    ds.candidats.candidats[1].id = ds.candidats.candidats[0].id;
    expect(regles(ds)).toContain('id-candidat-reutilise');
  });
  it('axe : même id deux fois', () => {
    const ds = copie(jeuSynthetique());
    ds.axes.axes[1].id = ds.axes.axes[0].id;
    expect(regles(ds)).toContain('id-axe-reutilise');
  });
  it('position : même question codée deux fois pour un candidat', () => {
    const ds = copie(jeuSynthetique());
    const l = ds.positions['candidat-a'].positions;
    l[1].question_id = l[0].question_id;
    expect(regles(ds)).toContain('id-position-reutilise');
  });
  it('item aveugle : même identifiant sur deux positions du même candidat', () => {
    const ds = copie(jeuSynthetique());
    const l = ds.positions['candidat-a'].positions;
    l[1].item_aveugle = l[0].item_aveugle;
    expect(regles(ds)).toContain('item-aveugle-reutilise');
  });
});

describe('autres règles', () => {
  it('citation de plus de 14 mots', () => {
    const ds = copie(jeuSynthetique());
    ds.positions['candidat-a'].positions[0].extraits[0].citation_courte = Array.from({ length: 15 }, () => 'mot').join(' ');
    expect(regles(ds)).toContain('citation-trop-longue');
  });
  it('position sur une question inconnue', () => {
    const ds = copie(jeuSynthetique());
    ds.positions['candidat-a'].positions[0].question_id = 'RET-999';
    expect(regles(ds)).toContain('position-question-inconnue');
  });
  it('question rattachée à un axe inconnu', () => {
    const ds = copie(jeuSynthetique());
    ds.questions['retraites'].questions[0].axe = 'axe-fantome';
    expect(regles(ds)).toContain('axe-inconnu');
  });
  it('fichier de positions pour un candidat inconnu', () => {
    const ds = copie(jeuSynthetique());
    ds.positions['candidat-a'].candidat_id = 'candidat-zzz';
    ds.positions['candidat-zzz'] = ds.positions['candidat-a'];
    delete ds.positions['candidat-a'];
    expect(regles(ds)).toContain('candidat-inconnu');
  });
  it('schéma : champ obligatoire manquant', () => {
    const ds = copie(jeuSynthetique());
    delete ds.questions['retraites'].questions[0].enonce;
    expect(regles(ds)).toContain('schema');
  });
});
