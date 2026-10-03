/**
 * Calcule derive/rapport-neutralite.json (npm run derive) ou vérifie qu'il est à jour (npm run derive:check).
 *
 * Le rapport est informatif : un déséquilibre entre candidats ne fait jamais échouer la construction
 * (spécification, § 10 : « non bloquant »). Seul un fichier absent ou périmé fait échouer la vérification,
 * comme pour les autres fichiers de derive/.
 *
 * Il lit derive/discriminance.json et derive/ancrage.json (la banque de tirage telle que l'application la
 * charge) : il doit donc être lancé après scripts/derive.ts.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculerRapportNeutralite, GRAINE_RAPPORT, TIRAGES_PAR_MODE } from '../core/neutralite/index.ts';
import { construireBanqueTirage } from '../core/tirage/index.ts';
import type { DeriveAncrage, DeriveDiscriminance } from '../core/types.generated.ts';
import { chargerDataset, ErreurLecture, type Dataset } from './lib/dataset.ts';
import { construireContexte } from './lib/derive.ts';
import { erreursDeSchema } from './lib/validate.ts';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const chemin = join(racine, 'derive', 'rapport-neutralite.json');
const verifier = process.argv.includes('--check');

class ErreurRapport extends Error {}

function lireDerive<T extends { empreinte_donnees: string }>(nom: string, ds: Dataset): T {
  const p = join(racine, 'derive', nom);
  if (!existsSync(p)) throw new ErreurRapport(`derive/${nom} absent : lancer \`npm run derive\``);
  const valeur = JSON.parse(readFileSync(p, 'utf8')) as T;
  if (valeur.empreinte_donnees !== ds.empreinte) throw new ErreurRapport(`derive/${nom} n'est pas à jour : lancer \`npm run derive\``);
  return valeur;
}

/** Calcule le rapport, prêt à écrire (avec version, empreinte et statut provisoire). */
export function construireRapport(ds: Dataset) {
  const discriminance = lireDerive<DeriveDiscriminance.DeriveDiscriminance>('discriminance.json', ds);
  const ancrage = lireDerive<DeriveAncrage.DeriveAncrage>('ancrage.json', ds);
  const banque = construireBanqueTirage(
    Object.values(ds.questions).flatMap((f) => f.questions),
    discriminance,
    ancrage,
  );
  // Questions codées par candidat de la population de référence : codes publiés (D8), toutes natures (D9).
  const ctx = construireContexte(ds);
  const codees: Record<string, string[]> = Object.fromEntries(ctx.population.map((c) => [c, [] as string[]]));
  for (const [question, parCandidat] of [...ctx.codes.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    for (const c of parCandidat.keys()) codees[c]!.push(question);
  }
  const rapport = calculerRapportNeutralite({ banque, codees }, { graine: GRAINE_RAPPORT, tirages: TIRAGES_PAR_MODE });
  return { version: 1 as const, empreinte_donnees: ds.empreinte, provisoire: banque.provisoire, ...rapport };
}

function principal() {
  try {
    const rapport = construireRapport(chargerDataset(racine));
    const erreurs = erreursDeSchema('derive-rapport-neutralite', rapport);
    if (erreurs.length > 0) {
      for (const m of erreurs) console.error(`✗ [schema] derive/rapport-neutralite.json — ${m}`);
      process.exit(1);
    }
    const texte = `${JSON.stringify(rapport, null, 2)}\n`;
    if (verifier) {
      const actuel = existsSync(chemin) ? readFileSync(chemin, 'utf8') : null;
      if (actuel !== texte) {
        console.error('✗ derive/rapport-neutralite.json n\'est pas à jour.\n\nLancer `npm run derive` et committer les fichiers de derive/.');
        process.exit(1);
      }
      console.log('✓ derive/rapport-neutralite.json');
    } else {
      writeFileSync(chemin, texte);
      console.log('✓ derive/rapport-neutralite.json écrit');
    }
    // Résumé lisible (informatif, jamais bloquant).
    for (const [mode, l] of Object.entries(rapport.modes)) {
      const parts = Object.entries(l.candidats).map(([c, x]) => `${c} ${Math.round(x.part_atteint_seuils * 100)} %`);
      console.log(`  ${mode} (N = ${l.N}) — part des tirages atteignant les seuils : ${parts.join(', ')}`);
    }
  } catch (e) {
    if (e instanceof ErreurLecture || e instanceof ErreurRapport) {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    }
    throw e;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principal();
