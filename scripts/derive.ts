/**
 * Calcule les fichiers de derive/ (npm run derive) ou vérifie qu'ils sont à jour (npm run derive:check).
 * Les fichiers de derive/ sont générés : on ne les édite jamais à la main.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerDataset, ErreurLecture } from './lib/dataset.ts';
import { calculerAccordCodeurs, calculerAncrage, calculerCouverture, calculerDiscriminance } from './lib/derive.ts';
import { erreursDeSchema, validerDataset } from './lib/validate.ts';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const dossier = join(racine, 'derive');
const verifier = process.argv.includes('--check');

const serialiser = (o: unknown): string => `${JSON.stringify(o, null, 2)}\n`;

function lireAncresPrecedentes(): string[] | undefined {
  const chemin = join(dossier, 'ancrage.json');
  if (!existsSync(chemin)) return undefined;
  try {
    const precedent = JSON.parse(readFileSync(chemin, 'utf8'));
    return Array.isArray(precedent.ancres) ? precedent.ancres : undefined;
  } catch {
    return undefined;
  }
}

try {
  const ds = chargerDataset(racine);
  const rapport = validerDataset(ds);
  if (rapport.erreurs.length > 0) {
    for (const p of rapport.erreurs) console.error(`✗ [${p.regle}] ${p.fichier} — ${p.message}`);
    console.error('\nDonnées invalides : exécuter `npm run data:validate`. Aucun calcul effectué.');
    process.exit(1);
  }

  const sorties: [string, string, unknown][] = [
    ['discriminance.json', 'derive-discriminance', calculerDiscriminance(ds)],
    ['ancrage.json', 'derive-ancrage', calculerAncrage(ds, lireAncresPrecedentes())],
    ['couverture.json', 'derive-couverture', calculerCouverture(ds)],
    ['accord-codeurs.json', 'derive-accord-codeurs', calculerAccordCodeurs(ds)],
  ];

  let obsoletes = 0;
  for (const [nom, schema, valeur] of sorties) {
    const erreurs = erreursDeSchema(schema, valeur);
    if (erreurs.length > 0) {
      for (const m of erreurs) console.error(`✗ [schema] derive/${nom} — ${m}`);
      process.exit(1);
    }
    const texte = serialiser(valeur);
    const chemin = join(dossier, nom);
    if (verifier) {
      const actuel = existsSync(chemin) ? readFileSync(chemin, 'utf8') : null;
      if (actuel !== texte) {
        console.error(`✗ derive/${nom} n'est pas à jour.`);
        obsoletes++;
      } else {
        console.log(`✓ derive/${nom}`);
      }
    } else {
      mkdirSync(dossier, { recursive: true });
      writeFileSync(chemin, texte);
      console.log(`✓ derive/${nom} écrit`);
    }
  }
  if (obsoletes > 0) {
    console.error('\nLancer `npm run derive` et committer les fichiers de derive/.');
    process.exit(1);
  }
} catch (e) {
  if (e instanceof ErreurLecture) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
  throw e;
}
