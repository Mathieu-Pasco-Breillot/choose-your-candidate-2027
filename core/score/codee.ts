/**
 * Ce que veulent dire « question répondue » et « question codée » (spécification § 8).
 */
import type { EtatPosition, NatureCodee, Position, Reponse, Valeur } from './types.ts';

const NATURES_CODEES: readonly string[] = ['nette', 'nuancee', 'imprecise'];

/** Une question est répondue si la réponse va de −2 à +2. « Sans avis » est exclu partout. */
export function estRepondue(r: Reponse): r is Reponse & { valeur: Valeur } {
  return r.valeur !== 'sans_avis';
}

/**
 * Une question est codée pour un candidat si sa position est publiée (accord ou arbitrage)
 * et porte un code. **Le code 0 est un code** : seul `null` signifie « pas de code ».
 * Une position `imprecise` est codée (D9) ; elle ne pèse que 0,5 dans le score.
 * Une position en attente d'arbitrage est traitée comme « non connu » (D8).
 */
export function estCodee(p: Position | undefined): p is Position & { code: Valeur; nature: NatureCodee } {
  return p !== undefined && p.etat === 'publie' && p.code !== null && p.nature !== null && NATURES_CODEES.includes(p.nature);
}

/**
 * Convertit le statut d'une position tel qu'il figure dans `data/positions/` vers l'état utilisé ici.
 * Même règle que `estPublie` dans `scripts/lib/derive.ts` : publié = statut `accord` ou `arbitre`
 * avec un code différent de `null`.
 */
export function etatDePosition(statut: 'accord' | 'arbitre' | 'sans_extrait' | 'arbitrage_en_attente', code: number | null): EtatPosition {
  if (statut === 'arbitrage_en_attente') return 'arbitrage_en_attente';
  if ((statut === 'accord' || statut === 'arbitre') && code !== null) return 'publie';
  return 'non_connu';
}
