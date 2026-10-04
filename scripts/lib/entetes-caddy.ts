/**
 * En-têtes de sécurité du site, lus dans le `Caddyfile` (seule source qui fasse foi) pour que `vite preview`, sur
 * lequel tournent les tests de bout en bout, serve exactement la même politique que le site en ligne (lot 5g).
 *
 * Lit le premier bloc `header { … }` du site : une ligne `Nom "valeur"` par en-tête. Les commentaires (`#`) et les
 * suppressions (`-Server`) sont ignorés ; tout autre contenu fait échouer la lecture, pour qu'une évolution du
 * Caddyfile ne passe pas inaperçue.
 */
import { readFileSync } from 'node:fs';

export function entetesDuCaddyfile(texte: string): Record<string, string> {
  const lignes = texte.split('\n');
  const debut = lignes.findIndex((l) => /^\s*header\s*\{\s*$/.test(l));
  if (debut < 0) throw new Error('Caddyfile : bloc « header { … } » introuvable.');
  const entetes: Record<string, string> = {};
  for (const brute of lignes.slice(debut + 1)) {
    const l = brute.trim();
    if (l === '}') {
      if (!entetes['Content-Security-Policy']) throw new Error('Caddyfile : aucune Content-Security-Policy dans le bloc header.');
      return entetes;
    }
    if (l === '' || l.startsWith('#') || l.startsWith('-')) continue;
    const m = /^([A-Za-z][A-Za-z0-9-]*)\s+"([^"]*)"$/.exec(l);
    if (!m) throw new Error(`Caddyfile : ligne d'en-tête non reconnue : ${l}`);
    entetes[m[1]!] = m[2]!;
  }
  throw new Error('Caddyfile : bloc « header » non fermé.');
}

export function lireEntetesCaddy(chemin = 'Caddyfile'): Record<string, string> {
  return entetesDuCaddyfile(readFileSync(chemin, 'utf8'));
}
