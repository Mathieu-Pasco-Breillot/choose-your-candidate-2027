/**
 * Effets sonores (spécification J9), générés dans le navigateur avec Web Audio : aucun fichier, aucun appel réseau,
 * aucun changement de la CSP. Coupés par défaut ; ne jouent que si le réglage est activé.
 * Deux sons seulement, identiques pour tous : fin de chapitre et révélation des résultats. Aucun son ne dépend
 * d'une réponse ni d'un candidat.
 */
import { lireSon } from './reglages.ts';

export type Effet = 'chapitre' | 'revelation';

/** Notes (fréquence en Hz, départ et durée en secondes) : deux notes montantes, puis un petit arpège. */
const PARTITIONS: Record<Effet, readonly [number, number, number][]> = {
  chapitre: [
    [659.25, 0, 0.18], // mi
    [880, 0.12, 0.3], // la
  ],
  revelation: [
    [523.25, 0, 0.5], // do
    [659.25, 0.1, 0.5], // mi
    [783.99, 0.2, 0.5], // sol
    [1046.5, 0.3, 0.7], // do
  ],
};

let contexte: AudioContext | null = null;

export function jouer(effet: Effet): void {
  if (!lireSon()) return;
  try {
    const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    contexte ??= new Ctor();
    const ctx = contexte;
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + 0.02;
    const sortie = ctx.createGain();
    sortie.gain.value = 0.12; // discret
    sortie.connect(ctx.destination);
    for (const [frequence, depart, duree] of PARTITIONS[effet]) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequence;
      // Attaque courte, extinction douce : un tintement, pas un bip.
      env.gain.setValueAtTime(0.0001, t0 + depart);
      env.gain.exponentialRampToValueAtTime(1, t0 + depart + 0.015);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + depart + duree);
      osc.connect(env).connect(sortie);
      osc.start(t0 + depart);
      osc.stop(t0 + depart + duree + 0.05);
    }
  } catch {
    /* audio indisponible : le site continue en silence */
  }
}
