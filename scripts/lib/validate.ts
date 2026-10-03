import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { ValidateFunction } from 'ajv/dist/2020.js';
import type { Dataset } from './dataset.ts';

export type Niveau = 'erreur' | 'avertissement';

export interface Probleme {
  niveau: Niveau;
  /** Code stable de la règle, utilisé par les tests. */
  regle: string;
  fichier: string;
  message: string;
}

export interface Rapport {
  problemes: Probleme[];
  erreurs: Probleme[];
  avertissements: Probleme[];
  statistiques: Record<string, number>;
}

const DOSSIER_SCHEMAS = new URL('../../schemas/', import.meta.url);

/** Nombre maximal de mots d'une citation courte (grille de codage v1.2, § 5). */
export const MOTS_CITATION_MAX = 14;

let validateursEnCache: Record<string, ValidateFunction> | undefined;

/** Compile une fois les schémas de données. Les schémas derive-* sont chargés par charger le script derive. */
export function validateurs(): Record<string, ValidateFunction> {
  if (validateursEnCache) return validateursEnCache;
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, strictTypes: false });
  addFormats(ajv);
  const noms = [
    'axes',
    'candidats',
    'questions',
    'positions',
    'journal',
    'derive-discriminance',
    'derive-ancrage',
    'derive-couverture',
    'derive-accord-codeurs',
  ];
  const out: Record<string, ValidateFunction> = {};
  for (const nom of noms) {
    const schema = JSON.parse(readFileSync(fileURLToPath(new URL(`${nom}.schema.json`, DOSSIER_SCHEMAS)), 'utf8'));
    out[nom] = ajv.compile(schema);
  }
  validateursEnCache = out;
  return out;
}

/** Valide un objet contre un schéma nommé ; renvoie les messages d'erreur lisibles. */
export function erreursDeSchema(nom: string, valeur: unknown): string[] {
  const v = validateurs()[nom];
  if (!v) throw new Error(`schéma inconnu : ${nom}`);
  if (v(valeur)) return [];
  return (v.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'invalide'}${
    e.params && 'allowedValues' in e.params ? ` (${JSON.stringify(e.params.allowedValues)})` : ''
  }`);
}

const compterMots = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

const CODES_PUBLIES = new Set(['accord', 'arbitre']);

/**
 * Valide l'ensemble des données : JSON Schema de chaque fichier, puis règles transversales.
 *
 * Erreurs (la construction est refusée) :
 *  - une question active sans source ;
 *  - un code sans extrait ;
 *  - un identifiant réutilisé (question, candidat, enregistrement de position, item aveugle) ;
 *  - toute violation d'un schéma, tout renvoi vers un objet inexistant, toute incohérence entre un code et ses codeurs.
 * Avertissements (affichés, non bloquants) : dettes connues des données, par exemple les dates de publication
 * des sources de questions, encore absentes.
 */
export function validerDataset(ds: Dataset): Rapport {
  const problemes: Probleme[] = [];
  const erreur = (regle: string, fichier: string, message: string) =>
    problemes.push({ niveau: 'erreur', regle, fichier, message });
  const avert = (regle: string, fichier: string, message: string) =>
    problemes.push({ niveau: 'avertissement', regle, fichier, message });

  // 1. JSON Schema, fichier par fichier
  const schemas = (nom: string, valeur: unknown, fichier: string) => {
    for (const m of erreursDeSchema(nom, valeur)) erreur('schema', fichier, m);
  };
  schemas('axes', ds.axes, 'data/axes.json');
  schemas('candidats', ds.candidats, 'data/candidats.json');
  schemas('journal', ds.journal, 'data/journal.json');
  for (const [theme, f] of Object.entries(ds.questions)) schemas('questions', f, `data/questions/${theme}.json`);
  for (const [cand, f] of Object.entries(ds.positions)) schemas('positions', f, `data/positions/${cand}.json`);

  // 2. Axes et candidats
  const axesConnus = new Set((ds.axes?.axes ?? []).map((a) => a.id));
  const vusAxes = new Set<string>();
  for (const a of ds.axes?.axes ?? []) {
    if (vusAxes.has(a.id)) erreur('id-axe-reutilise', 'data/axes.json', `axe « ${a.id} » défini deux fois`);
    vusAxes.add(a.id);
  }

  const candidats = new Map<string, NonNullable<Dataset['candidats']['candidats']>[number]>();
  for (const c of ds.candidats?.candidats ?? []) {
    if (candidats.has(c.id)) {
      erreur('id-candidat-reutilise', 'data/candidats.json', `identifiant de candidat réutilisé : ${c.id}`);
    }
    candidats.set(c.id, c);
  }
  const primaires = new Set<string>();
  for (const p of ds.candidats?.primaires ?? []) {
    if (primaires.has(p.id)) erreur('id-primaire-reutilise', 'data/candidats.json', `identifiant de primaire réutilisé : ${p.id}`);
    primaires.add(p.id);
  }
  for (const c of candidats.values()) {
    if (c.primaire && !primaires.has(c.primaire)) {
      erreur('primaire-inconnue', 'data/candidats.json', `${c.id} : primaire « ${c.primaire} » absente de primaires[]`);
    }
  }

  // 3. Questions
  const questions = new Map<string, { theme: string; statut: string; fichier: string }>();
  const prefixes = new Map<string, string>();
  let sansDatePublication = 0;
  let nbQuestions = 0;
  let nbActives = 0;
  for (const [theme, f] of Object.entries(ds.questions)) {
    const fichier = `data/questions/${theme}.json`;
    if (f._theme !== theme) {
      erreur('theme-incoherent', fichier, `_theme vaut « ${f._theme} » mais le fichier est celui du thème « ${theme} »`);
    }
    const liste = f.questions ?? [];
    for (const q of liste) {
      nbQuestions++;
      if (q.theme !== theme) {
        erreur('theme-incoherent', fichier, `${q.id} : theme vaut « ${q.theme} », attendu « ${theme} »`);
      }
      const precedent = questions.get(q.id);
      if (precedent) {
        erreur(
          'id-question-reutilise',
          fichier,
          `identifiant de question réutilisé : ${q.id} (déjà dans ${precedent.fichier}) — un identifiant n'est jamais réutilisé, une question remplacée est archivée`,
        );
      } else {
        questions.set(q.id, { theme, statut: q.statut, fichier });
      }
      const prefixe = typeof q.id === 'string' ? q.id.split('-')[0]! : '';
      const themePrefixe = prefixes.get(prefixe);
      if (themePrefixe !== undefined && themePrefixe !== theme) {
        erreur('id-prefixe-theme', fichier, `${q.id} : le préfixe ${prefixe}- est déjà utilisé par le thème « ${themePrefixe} »`);
      }
      prefixes.set(prefixe, themePrefixe ?? theme);
      if (!axesConnus.has(q.axe)) erreur('axe-inconnu', fichier, `${q.id} : axe « ${q.axe} » absent de data/axes.json`);

      const s = q.origine?.source;
      if (q.statut === 'active') {
        nbActives++;
        if (!s || !s.url || !s.titre || !s.nature || !s.date_consultation) {
          erreur(
            'question-active-sans-source',
            fichier,
            `${q.id} : question active sans source complète (url, titre, nature et date de consultation exigés)`,
          );
        }
      }
      if (s && !s.date_publication) sansDatePublication++;
    }

    // L'équilibre annoncé en tête de fichier doit rester exact (avertissement : c'est une annotation).
    const actives = liste.filter((q) => q.statut === 'active');
    const reel = {
      actives: actives.length,
      suspendues: liste.filter((q) => q.statut === 'suspendue').length,
      archivees: liste.filter((q) => q.statut === 'archivee').length,
      sens_plus: actives.filter((q) => q.sens === 1).length,
      sens_moins: actives.filter((q) => q.sens === -1).length,
    };
    const eq = f._equilibre;
    if (eq) {
      for (const k of ['actives', 'suspendues', 'sens_plus', 'sens_moins'] as const) {
        if (eq[k] !== reel[k]) avert('equilibre-obsolete', fichier, `_equilibre.${k} vaut ${eq[k]}, il y a ${reel[k]}`);
      }
      if ((eq.archivees ?? 0) !== reel.archivees) {
        avert('equilibre-obsolete', fichier, `_equilibre.archivees vaut ${eq.archivees ?? 0}, il y a ${reel.archivees}`);
      }
      const parAxe: Record<string, number> = {};
      for (const q of actives) parAxe[q.axe] = (parAxe[q.axe] ?? 0) + 1;
      const annonce = eq.axes ?? {};
      for (const axe of new Set([...Object.keys(parAxe), ...Object.keys(annonce)])) {
        if ((annonce[axe] ?? 0) !== (parAxe[axe] ?? 0)) {
          avert('equilibre-obsolete', fichier, `_equilibre.axes.${axe} vaut ${annonce[axe] ?? 0}, il y a ${parAxe[axe] ?? 0}`);
        }
      }
    }
  }
  if (sansDatePublication > 0) {
    avert(
      'source-question-sans-date-publication',
      'data/questions',
      `${sansDatePublication} question(s) sur ${nbQuestions} ont une source sans date de publication (écart connu, bilan phase 3 § 4)`,
    );
  }

  // 4. Positions
  let nbPositions = 0;
  let nbCodesPublies = 0;
  const itemsVus = new Map<string, string>();
  for (const [cand, f] of Object.entries(ds.positions)) {
    const fichier = `data/positions/${cand}.json`;
    if (f.candidat_id !== cand) {
      erreur('candidat-incoherent', fichier, `candidat_id vaut « ${f.candidat_id} » mais le fichier est celui de « ${cand} »`);
    }
    const fiche = candidats.get(cand);
    if (!fiche) {
      erreur('candidat-inconnu', fichier, `candidat « ${cand} » absent de data/candidats.json`);
    } else if (fiche.statut_evaluation === 'non_evalue') {
      avert('positions-candidat-non-evalue', fichier, `${cand} est « non_evalue » mais possède un fichier de positions`);
    }

    const vues = new Set<string>();
    for (const p of f.positions ?? []) {
      nbPositions++;
      const id = `${cand} × ${p.question_id}`;
      if (vues.has(p.question_id)) {
        erreur('id-position-reutilise', fichier, `${id} : question codée deux fois pour ce candidat`);
      }
      vues.add(p.question_id);

      const q = questions.get(p.question_id);
      if (!q) erreur('position-question-inconnue', fichier, `${id} : question absente de la banque`);
      else if (q.statut !== 'active') {
        avert('position-question-non-active', fichier, `${id} : la question est « ${q.statut} » (le code est conservé, non utilisé)`);
      }

      if (p.item_aveugle) {
        const deja = itemsVus.get(p.item_aveugle);
        if (deja) erreur('item-aveugle-reutilise', fichier, `${id} : item aveugle ${p.item_aveugle} déjà attribué à ${deja}`);
        itemsVus.set(p.item_aveugle, id);
      }

      // Un code sans extrait est interdit : pas de position sans source.
      if (p.code !== null && p.code !== undefined && (p.extraits ?? []).length === 0) {
        erreur('code-sans-extrait', fichier, `${id} : code ${p.code} sans extrait — un code exige au moins un extrait sourcé`);
      }
      if (CODES_PUBLIES.has(p.statut) && p.code !== null) nbCodesPublies++;

      // Cohérence entre le code publié, les deux codeurs et l'arbitrage.
      const c1 = p.codage?.codeur_1;
      const c2 = p.codage?.codeur_2;
      if (p.statut === 'accord' && c1 && c2) {
        const memeCode = c1.code === c2.code;
        const memeNature = c1.nature === c2.nature;
        if (!memeCode || !memeNature) {
          erreur('position-incoherente', fichier, `${id} : statut « accord » mais les codeurs diffèrent (${c1.code}/${c1.nature} contre ${c2.code}/${c2.nature})`);
        } else if (p.code !== c1.code || p.nature !== c1.nature) {
          erreur('position-incoherente', fichier, `${id} : le code publié (${p.code}/${p.nature}) diffère de celui des codeurs (${c1.code}/${c1.nature})`);
        }
      }
      if (p.statut === 'arbitrage_en_attente' && c1 && c2 && c1.code === c2.code && c1.nature === c2.nature) {
        erreur('position-incoherente', fichier, `${id} : arbitrage en attente alors que les deux codeurs sont d'accord`);
      }
      if (p.statut === 'arbitre' && p.arbitrage) {
        if (p.code !== p.arbitrage.code_retenu || p.nature !== p.arbitrage.nature_retenue) {
          erreur('position-incoherente', fichier, `${id} : le code publié ne correspond pas au code retenu par l'arbitrage`);
        }
      }

      // Citations courtes : 14 mots au plus (grille v1.2, § 5).
      for (const [i, e] of (p.extraits ?? []).entries()) {
        for (const champ of ['citation_courte', 'citation_anonymisee'] as const) {
          const t = e[champ];
          if (t && compterMots(t) > MOTS_CITATION_MAX) {
            erreur('citation-trop-longue', fichier, `${id} : extrait ${i + 1}, ${champ} de ${compterMots(t)} mots (maximum ${MOTS_CITATION_MAX})`);
          }
        }
        if (e.citation_verifiee_mot_a_mot === false) {
          avert('citation-non-retrouvee', fichier, `${id} : extrait ${i + 1}, la citation courte n'a pas été retrouvée mot à mot dans la source`);
        }
      }
    }
  }

  // 5. Cohérence entre candidats et fichiers de positions
  for (const c of candidats.values()) {
    if (c.statut_evaluation === 'evalue' && !ds.positions[c.id]) {
      avert('candidat-evalue-sans-positions', 'data/candidats.json', `${c.id} est « evalue » sans fichier de positions`);
    }
  }

  const erreurs = problemes.filter((p) => p.niveau === 'erreur');
  const avertissements = problemes.filter((p) => p.niveau === 'avertissement');
  return {
    problemes,
    erreurs,
    avertissements,
    statistiques: {
      candidats: candidats.size,
      themes: Object.keys(ds.questions).length,
      questions: nbQuestions,
      questions_actives: nbActives,
      fichiers_positions: Object.keys(ds.positions).length,
      positions: nbPositions,
      codes_publies: nbCodesPublies,
    },
  };
}
