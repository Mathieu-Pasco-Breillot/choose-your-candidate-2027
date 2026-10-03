/**
 * Outils partagés par les tests de core/score (non utilisés par l'application).
 * Le générateur ci-dessous est local aux tests : le générateur de l'application est dans core/aleatoire/ (lot 5d).
 */
import type { Melanger, NatureCodee, Position, Reponse, Valeur } from './types.ts';

/** Petit générateur à graine (mulberry32), suffisant pour des tests reproductibles. */
export function generateur(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mélange de Fisher-Yates à partir d'un générateur. */
export function melangeur(graine: number): Melanger {
  const alea = generateur(graine);
  return <T>(liste: readonly T[]): T[] => {
    const copie = [...liste];
    for (let i = copie.length - 1; i > 0; i--) {
      const j = Math.floor(alea() * (i + 1));
      [copie[i], copie[j]] = [copie[j]!, copie[i]!];
    }
    return copie;
  };
}

/** Mélange qui ne change rien : pour les tests où l'ordre tiré n'importe pas. */
export const sansMelange: Melanger = <T>(liste: readonly T[]): T[] => [...liste];

export const rep = (questionId: string, valeur: Valeur | 'sans_avis', tresImportant = false, theme = 'retraites'): Reponse => ({
  questionId,
  theme,
  valeur,
  tresImportant,
});

export const pos = (questionId: string, code: Valeur | null, nature: NatureCodee | 'non_connu' = 'nette'): Position =>
  code === null ? { questionId, etat: 'non_connu', code: null, nature: 'non_connu' } : { questionId, etat: 'publie', code, nature };

export const enAttente = (questionId: string): Position => ({ questionId, etat: 'arbitrage_en_attente', code: null, nature: null });

/** `n` questions Q01…Qn du thème donné. */
export const ids = (n: number, prefixe = 'Q'): string[] => Array.from({ length: n }, (_, i) => `${prefixe}${String(i + 1).padStart(3, '0')}`);
