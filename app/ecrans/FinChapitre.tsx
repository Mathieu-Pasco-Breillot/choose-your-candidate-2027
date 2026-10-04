import { useEffect, useRef } from 'react';
import type { Partie } from '../jeu.ts';
import { situation } from '../jeu.ts';
import { titreFinChapitre, transition } from '../habillage.ts';
import { libelleTheme } from '../libelles.ts';
import { jouer } from '../son.ts';
import { Mascotte } from './Mascotte.tsx';

interface Props {
  /** La partie, positionnée sur la première question du chapitre suivant. */
  partie: Partie;
  onContinuer: () => void;
}

/**
 * Fin de chapitre (spécification § 5.2, J1 et J3) : un court écran entre deux chapitres. Il ne parle que de la
 * progression : aucun retour sur les réponses, aucun score partiel, aucun nom de candidat ni de parti.
 */
export function FinChapitre({ partie, onContinuer }: Props) {
  const s = situation(partie);
  const fini = s.chapitre; // chapitres bouclés = indice du chapitre qui commence
  const total = partie.chapitres.length;
  const suivant = libelleTheme(s.theme);
  const bouton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    jouer('chapitre');
    bouton.current?.focus();
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-5 px-5 py-10 text-center">
      <Mascotte attitude="chapitre" taille={132} />
      <p className="text-xs font-semibold tracking-[0.2em] text-or uppercase">
        {fini} chapitre{fini > 1 ? 's' : ''} sur {total}
      </p>
      <h1 className="font-serif text-4xl font-semibold" aria-live="polite">
        {titreFinChapitre(total - fini)}
      </h1>
      <p className="text-lg leading-relaxed text-sourdine">{transition(fini - 1, partie.graine, suivant)}</p>
      <ol className="flex flex-wrap justify-center gap-1.5" aria-label="Chapitres bouclés">
        {partie.chapitres.map((c, i) => (
          <li
            key={c.theme}
            className={`size-3 rounded-full ${i < fini ? 'bg-or' : 'border border-sourdine/50'}`}
          >
            <span className="sr-only">{`${libelleTheme(c.theme)} : ${i < fini ? 'bouclé' : 'à venir'}`}</span>
          </li>
        ))}
      </ol>
      <button
        ref={bouton}
        type="button"
        onClick={onContinuer}
        className="mt-2 w-full rounded-2xl bg-or px-5 py-4 font-serif text-xl font-semibold text-nuit"
      >
        Continuer : {suivant}
      </button>
    </main>
  );
}
