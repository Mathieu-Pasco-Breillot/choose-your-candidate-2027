import { CHARGEMENT } from '../habillage.ts';
import { Mascotte } from './Mascotte.tsx';

/** Écran d'attente des pages chargées à la demande (J1, J3). */
export function Chargement() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center gap-3 px-5 text-center">
      <Mascotte attitude="attente" taille={88} />
      <p role="status" className="text-sourdine">
        {CHARGEMENT}
      </p>
    </main>
  );
}
