/**
 * Calcule derive/rapport-duel.json (npm run derive) ou vérifie qu'il est à jour (npm run derive:check).
 *
 * Rapport de neutralité du mode Duel (addendum à la spécification, § 8) : contenu du réservoir de chaque
 * candidat. Informatif : un déséquilibre entre candidats ne fait jamais échouer la construction. Seul un
 * fichier absent ou périmé fait échouer la vérification, comme pour les autres fichiers de derive/.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculerRapportDuel } from '../core/duel/index.ts';
import { etatDePosition } from '../core/score/codee.ts';
import type { Position, Valeur } from '../core/score/types.ts';
import { chargerDataset, ErreurLecture, type Dataset } from './lib/dataset.ts';
import { erreursDeSchema } from './lib/validate.ts';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const chemin = join(racine, 'derive', 'rapport-duel.json');
const verifier = process.argv.includes('--check');

/** Calcule le rapport, prêt à écrire (avec version et empreinte des données). */
export function construireRapportDuel(ds: Dataset) {
  const questions = Object.values(ds.questions)
    .flatMap((f) => f.questions)
    .filter((q) => q.statut === 'active')
    .map((q) => ({ id: q.id, theme: q.theme, axe: q.axe, sens: q.sens }));
  const positions: Record<string, Position[]> = {};
  for (const [id, f] of Object.entries(ds.positions)) {
    positions[id] = f.positions.map((p): Position => {
      const etat = etatDePosition(p.statut, p.code);
      return {
        questionId: p.question_id,
        etat,
        code: etat === 'publie' ? (p.code as Valeur) : null,
        nature: etat === 'publie' ? p.nature : etat === 'arbitrage_en_attente' ? null : 'non_connu',
      };
    });
  }
  return { version: 1 as const, empreinte_donnees: ds.empreinte, ...calculerRapportDuel(questions, positions) };
}

function principal() {
  try {
    const rapport = construireRapportDuel(chargerDataset(racine));
    const erreurs = erreursDeSchema('derive-rapport-duel', rapport);
    if (erreurs.length > 0) {
      for (const m of erreurs) console.error(`✗ [schema] derive/rapport-duel.json — ${m}`);
      process.exit(1);
    }
    const texte = `${JSON.stringify(rapport, null, 2)}\n`;
    if (verifier) {
      const actuel = existsSync(chemin) ? readFileSync(chemin, 'utf8') : null;
      if (actuel !== texte) {
        console.error("✗ derive/rapport-duel.json n'est pas à jour.\n\nLancer `npm run derive` et committer les fichiers de derive/.");
        process.exit(1);
      }
      console.log('✓ derive/rapport-duel.json');
    } else {
      writeFileSync(chemin, texte);
      console.log('✓ derive/rapport-duel.json écrit');
    }
    // Résumé lisible (informatif, jamais bloquant).
    const proposes = rapport.candidats.filter((c) => c.duel_disponible);
    console.log(`  duel proposé pour ${proposes.length} candidats sur ${rapport.candidats.length} (au moins ${rapport.proposition_min} propositions)`);
  } catch (e) {
    if (e instanceof ErreurLecture) {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    }
    throw e;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principal();
