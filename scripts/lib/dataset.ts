import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import type { Axes, Candidats, Journal, Positions, Questions } from '../../core/types.generated.ts';

type FichierAxes = Axes.FichierAxes;
type FichierCandidats = Candidats.FichierCandidats;
type FichierJournal = Journal.FichierJournal;
type FichierPositions = Positions.FichierPositions;
type FichierQuestions = Questions.FichierQuestions;

/** Ensemble des fichiers de données, chargés en mémoire. */
export interface Dataset {
  axes: FichierAxes;
  candidats: FichierCandidats;
  /** Clé : identifiant du thème = nom du fichier sans extension. */
  questions: Record<string, FichierQuestions>;
  /** Clé : identifiant du candidat = nom du fichier sans extension. */
  positions: Record<string, FichierPositions>;
  journal: FichierJournal;
  /**
   * Empreinte SHA-256 des fichiers qui alimentent les calculs (candidats, axes, questions, positions).
   * Le journal n'en fait pas partie : y ajouter une ligne ne doit pas invalider derive/.
   */
  empreinte: string;
}

export class ErreurLecture extends Error {}

function lireJson<T>(chemin: string, racine: string): { valeur: T; octets: Buffer } {
  const nom = relative(racine, chemin);
  if (!existsSync(chemin)) throw new ErreurLecture(`${nom} : fichier introuvable`);
  const octets = readFileSync(chemin);
  try {
    return { valeur: JSON.parse(octets.toString('utf8')) as T, octets };
  } catch (e) {
    throw new ErreurLecture(`${nom} : JSON invalide — ${(e as Error).message}`);
  }
}

function listerJson(dossier: string): string[] {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

/** Charge data/ depuis la racine du dépôt. Lève ErreurLecture si un fichier est absent ou illisible. */
export function chargerDataset(racine: string): Dataset {
  const data = join(racine, 'data');
  const hash = createHash('sha256');
  const calcul = <T>(chemin: string): T => {
    const { valeur, octets } = lireJson<T>(chemin, racine);
    // Le chemin entre dans l'empreinte : renommer un fichier la change.
    hash.update(`${relative(racine, chemin).split('\\').join('/')}\n`);
    hash.update(octets);
    hash.update('\n');
    return valeur;
  };

  const axes = calcul<FichierAxes>(join(data, 'axes.json'));
  const candidats = calcul<FichierCandidats>(join(data, 'candidats.json'));
  const questions: Record<string, FichierQuestions> = {};
  for (const f of listerJson(join(data, 'questions'))) {
    questions[basename(f, '.json')] = calcul<FichierQuestions>(join(data, 'questions', f));
  }
  const positions: Record<string, FichierPositions> = {};
  for (const f of listerJson(join(data, 'positions'))) {
    positions[basename(f, '.json')] = calcul<FichierPositions>(join(data, 'positions', f));
  }
  const { valeur: journal } = lireJson<FichierJournal>(join(data, 'journal.json'), racine);

  return { axes, candidats, questions, positions, journal, empreinte: hash.digest('hex') };
}
