/**
 * Générateur pseudo-aléatoire à graine (spécification, § 7.1).
 *
 * Même graine = même suite de nombres, sur tout navigateur et sur Node : l'algorithme n'utilise que des
 * opérations entières sur 32 bits (Math.imul, décalages, `>>> 0`), définies exactement par le standard
 * JavaScript. Aucune dépendance à Math.random, à l'horloge ou à l'environnement.
 *
 * Algorithme : sfc32 (Chris Doty-Humphrey, « Small Fast Counting », domaine public), initialisé par
 * splitmix32 à partir d'une graine entière de 0 à 2³² − 1, puis 12 tours à vide pour mélanger l'état.
 *
 * Ce générateur sert au tirage des questions, au défi « Qui a dit ça ? », au départage des égalités et au
 * rapport de neutralité. Il ne convient pas à un usage cryptographique, et ce n'est pas son rôle.
 */

/** Plus grande graine acceptée (2³² − 1). */
export const GRAINE_MAX = 0xffffffff;

export class ErreurGraine extends Error {}

/** Vérifie qu'une graine est un entier de 0 à 2³² − 1 ; lève ErreurGraine sinon. */
export function verifierGraine(graine: number): number {
  if (!Number.isInteger(graine) || graine < 0 || graine > GRAINE_MAX) {
    throw new ErreurGraine(`graine invalide : ${graine} (entier de 0 à ${GRAINE_MAX} attendu)`);
  }
  return graine;
}

/** Suite de nombres pseudo-aléatoires déterminée par une graine. */
export interface Generateur {
  /** Entier non signé sur 32 bits, de 0 à 2³² − 1. */
  suivant32(): number;
  /** Réel de [0, 1[, avec 32 bits de précision. */
  reel(): number;
  /** Entier uniforme de 0 à n − 1 (sans biais : tirage par rejet). n entier, 1 ≤ n ≤ 2³². */
  entier(n: number): number;
}

/** splitmix32 : étale une graine sur 32 bits pour initialiser les quatre mots d'état de sfc32. */
function splitmix32(etat: number): () => number {
  let s = etat >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
}

/** Crée un générateur à partir d'une graine entière de 0 à 2³² − 1. */
export function creerGenerateur(graine: number): Generateur {
  verifierGraine(graine);
  const init = splitmix32(graine);
  let a = init();
  let b = init();
  let c = init();
  let d = 1; // compteur de sfc32

  const suivant32 = (): number => {
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    c = (c + t) >>> 0;
    return t;
  };
  for (let i = 0; i < 12; i++) suivant32();

  const entier = (n: number): number => {
    if (!Number.isInteger(n) || n < 1 || n > 0x100000000) throw new RangeError(`entier(${n}) : n doit être un entier de 1 à 2³²`);
    if (n === 1) return 0;
    // Rejet : on écarte la queue de l'intervalle qui n'est pas un multiple de n, pour que chaque valeur ait
    // exactement la même probabilité.
    const limite = 0x100000000 - (0x100000000 % n);
    for (;;) {
      const x = suivant32();
      if (x < limite) return x % n;
    }
  };

  return {
    suivant32,
    reel: () => suivant32() / 0x100000000,
    entier,
  };
}

/** Renvoie une copie mélangée de la liste (mélange de Fisher-Yates). La liste d'origine n'est pas modifiée. */
export function melanger<T>(g: Generateur, liste: readonly T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = g.entier(i + 1);
    [copie[i], copie[j]] = [copie[j]!, copie[i]!];
  }
  return copie;
}

/**
 * Tirage pondéré : renvoie l'indice i avec une probabilité proportionnelle à poids[i].
 * Les poids doivent être finis, positifs ou nuls, et leur somme strictement positive.
 */
export function tiragePondere(g: Generateur, poids: readonly number[]): number {
  let total = 0;
  for (const p of poids) {
    if (!Number.isFinite(p) || p < 0) throw new RangeError(`tiragePondere : poids invalide (${p})`);
    total += p;
  }
  if (poids.length === 0 || total <= 0) throw new RangeError('tiragePondere : aucun poids strictement positif');
  const cible = g.reel() * total;
  let cumul = 0;
  let dernierPositif = -1;
  for (let i = 0; i < poids.length; i++) {
    if (poids[i]! <= 0) continue;
    dernierPositif = i;
    cumul += poids[i]!;
    if (cible < cumul) return i;
  }
  // Arrondi flottant : la cible peut égaler le total à un ulp près.
  return dernierPositif;
}

/** Choisit un élément au hasard (uniforme). La liste ne doit pas être vide. */
export function choisir<T>(g: Generateur, liste: readonly T[]): T {
  if (liste.length === 0) throw new RangeError('choisir : liste vide');
  return liste[g.entier(liste.length)]!;
}

/**
 * Dérive une graine secondaire, déterministe, à partir d'une graine et d'une étiquette (par exemple le
 * numéro d'un tirage du rapport de neutralité). Deux étiquettes différentes donnent des suites indépendantes
 * en pratique.
 */
export function deriverGraine(graine: number, etiquette: string | number): number {
  verifierGraine(graine);
  // FNV-1a sur 32 bits de l'étiquette, combiné à la graine, puis passé dans splitmix32.
  let h = 0x811c9dc5;
  const texte = String(etiquette);
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return splitmix32((graine ^ h) >>> 0)();
}
