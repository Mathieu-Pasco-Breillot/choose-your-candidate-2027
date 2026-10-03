/** Tirage stratifié des questions : API publique (spécification, § 7). */
export { construireBanqueTirage, creerBanque, ErreurBanque } from './banque.ts';
export type { BanqueTirage, EntreeBanque, QuestionTirable } from './banque.ts';
export { decrireTirage } from './journal.ts';
export { poidsDeTirage, tirer } from './tirage.ts';
export * from './types.ts';
