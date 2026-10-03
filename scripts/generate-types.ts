/**
 * Génère core/types.generated.ts à partir des JSON Schema de schemas/.
 * Les types TypeScript et les schémas ne peuvent donc pas diverger.
 *
 *   npm run types:generate   écrit le fichier
 *   npm run types:check      échoue si le fichier committé n'est pas à jour
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'json-schema-to-typescript';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const dossierSchemas = join(racine, 'schemas');
const cible = join(racine, 'core', 'types.generated.ts');

const BANNIERE = `/* eslint-disable */
/**
 * FICHIER GÉNÉRÉ par \`npm run types:generate\` à partir de schemas/*.schema.json.
 * Ne pas modifier à la main : modifier le schéma, puis régénérer.
 */
`;

export async function genererTypes(): Promise<string> {
  const fichiers = readdirSync(dossierSchemas)
    .filter((f) => f.endsWith('.schema.json'))
    .sort();
  const blocs: string[] = [];
  for (const fichier of fichiers) {
    const schema = JSON.parse(readFileSync(join(dossierSchemas, fichier), 'utf8'));
    const ts = await compile(schema, schema.title ?? fichier, {
      bannerComment: '',
      additionalProperties: false,
      unreachableDefinitions: false,
      format: true,
      ignoreMinAndMaxItems: true,
      style: { singleQuote: true, semi: true, printWidth: 100 },
    });
    // Un espace de noms par schéma : les définitions communes (Identifiant, DateIso…) ne se télescopent pas.
    const nom = fichier
      .replace('.schema.json', '')
      .split('-')
      .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
      .join('');
    const interieur = ts
      .trim()
      .split('\n')
      .map((l) => (l ? `  ${l}` : l))
      .join('\n');
    blocs.push(`// ── ${fichier}\nexport namespace ${nom} {\n${interieur}\n}\n`);
  }
  return `${BANNIERE}\n${blocs.join('\n')}`;
}

async function main() {
  const attendu = await genererTypes();
  if (process.argv.includes('--check')) {
    const actuel = existsSync(cible) ? readFileSync(cible, 'utf8') : '';
    if (actuel !== attendu) {
      console.error('core/types.generated.ts n\'est pas à jour : lancer `npm run types:generate`.');
      process.exit(1);
    }
    console.log('core/types.generated.ts à jour.');
    return;
  }
  writeFileSync(cible, attendu);
  console.log(`core/types.generated.ts écrit (${attendu.split('\n').length} lignes).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
