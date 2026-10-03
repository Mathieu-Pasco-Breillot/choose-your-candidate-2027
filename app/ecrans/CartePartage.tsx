import { useEffect, useRef, useState } from 'react';
import type { Classe } from '../../core/score/index.ts';
import { dessinerCarte, donneesCarte, partagerCarte } from '../carte.ts';
import type { ModeJeu } from '../jeu.ts';

interface Props {
  mode: ModeJeu;
  graine: number;
  classement: readonly Classe[];
  nom: (id: string) => string;
}

export function CartePartage({ mode, graine, classement, nom }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (ref.current) dessinerCarte(ref.current, donneesCarte(mode, graine, classement, nom));
  }, [mode, graine, classement, nom]);

  if (classement.length === 0) return null;

  return (
    <section className="rounded-2xl bg-nuit-clair p-5" aria-labelledby="titre-carte">
      <h2 id="titre-carte" className="font-serif text-2xl font-semibold">
        Carte à partager
      </h2>
      <p className="mt-1 text-sm text-sourdine">
        L'image est dessinée sur votre téléphone ; rien n'est envoyé. Elle montre le podium et la fiabilité, jamais vos réponses.
      </p>
      <canvas ref={ref} className="mt-3 w-full rounded-xl" role="img" aria-label="Aperçu de la carte de résultat" />
      <button
        type="button"
        className="mt-3 min-h-11 w-full rounded-2xl bg-or px-5 py-3 font-serif text-lg font-semibold text-nuit"
        onClick={async () => {
          if (!ref.current) return;
          const r = await partagerCarte(ref.current);
          setMessage(r === 'telecharge' ? 'Image téléchargée sur votre appareil.' : r === 'partage' ? 'Partage ouvert.' : "Impossible de créer l'image.");
        }}
      >
        Partager ou télécharger l'image
      </button>
      <p className="mt-2 text-sm text-sourdine" role="status">
        {message}
      </p>
    </section>
  );
}
