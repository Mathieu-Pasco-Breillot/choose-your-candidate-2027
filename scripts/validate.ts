/**
 * Validation des données (npm run data:validate).
 * Échoue (code 1) si une règle bloquante est violée ; la construction du site est alors refusée.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerDataset, ErreurLecture } from './lib/dataset.ts';
import { validerDataset } from './lib/validate.ts';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

let rapport;
try {
  rapport = validerDataset(chargerDataset(racine));
} catch (e) {
  if (e instanceof ErreurLecture) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
  throw e;
}

const { erreurs, avertissements, statistiques } = rapport;

for (const p of erreurs) console.error(`✗ [${p.regle}] ${p.fichier} — ${p.message}`);
for (const p of avertissements) console.warn(`! [${p.regle}] ${p.fichier} — ${p.message}`);

const s = statistiques;
console.log(
  `\n${s.candidats} candidats · ${s.themes} thèmes · ${s.questions} questions (${s.questions_actives} actives) · ` +
    `${s.fichiers_positions} fichiers de positions · ${s.positions} positions · ${s.codes_publies} codes publiés`,
);

if (erreurs.length > 0) {
  console.error(`\nÉCHEC : ${erreurs.length} erreur(s), ${avertissements.length} avertissement(s).`);
  process.exit(1);
}
console.log(`OK : données valides (${avertissements.length} avertissement(s)).`);
