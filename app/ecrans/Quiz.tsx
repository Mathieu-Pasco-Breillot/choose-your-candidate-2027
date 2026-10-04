import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Valeur } from '../../core/score/types.ts';
import type { Partie } from '../jeu.ts';
import { questionCourante, situation } from '../jeu.ts';
import { ECHELLE, libelleTheme } from '../libelles.ts';

interface Props {
  partie: Partie;
  onRepondre: (valeur: Valeur | 'sans_avis', tresImportant: boolean) => void;
  onReculer: () => void;
  onQuitter: () => void;
}

/** Une seule teinte (l'or), d'intensité croissante de part et d'autre du centre : ni bien ni mal. */
const INTENSITE: Record<number, string> = {
  2: 'bg-or/45 border-or',
  1: 'bg-or/25 border-or/70',
  0: 'bg-or/8 border-or/40',
  [-1]: 'bg-or/25 border-or/70',
  [-2]: 'bg-or/45 border-or',
};

export function Quiz({ partie, onRepondre, onReculer, onQuitter }: Props) {
  const question = questionCourante(partie);
  const s = situation(partie);
  const deja = partie.reponses[question.id];
  const [important, setImportant] = useState(deja?.tresImportant ?? false);
  const [precisionOuverte, setPrecisionOuverte] = useState(false);
  useEffect(() => {
    setImportant(deja?.tresImportant ?? false);
    setPrecisionOuverte(false);
  }, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // L'ancienne carte reste un instant à l'écran pendant sa sortie : ses boutons ne doivent plus rien enregistrer.
  const courante = useRef(question.id);
  courante.current = question.id;
  const repondre = (valeur: Valeur | 'sans_avis', tresImportant: boolean) => {
    if (courante.current === question.id) onRepondre(valeur, tresImportant);
  };
  const reculer = () => {
    if (courante.current === question.id) onReculer();
  };
  const total = partie.questions.length;
  const echelle = partie.echelleInversee ? [...ECHELLE].reverse() : ECHELLE;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-6">
      <div className="flex items-center justify-between text-sm text-sourdine">
        <button type="button" onClick={onQuitter} className="underline">
          Quitter
        </button>
        <span aria-live="polite">
          {partie.position + 1} / {total}
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-nuit-clair"
        role="progressbar"
        aria-label="Progression"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={partie.position}
      >
        <div className="h-full bg-or transition-[width]" style={{ width: `${(partie.position / total) * 100}%` }} />
      </div>

      <ol className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Chapitres" tabIndex={0}>
        {partie.chapitres.map((c, i) => (
          <li
            key={c.theme}
            aria-current={i === s.chapitre ? 'step' : undefined}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
              i === s.chapitre ? 'border-or bg-or/20 text-creme' : 'border-sourdine/30 text-sourdine'
            }`}
          >
            {i < s.chapitre ? '✓ ' : ''}
            {libelleTheme(c.theme)}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="mt-6 flex flex-1 flex-col"
        >
          <p className="text-xs font-semibold tracking-[0.18em] text-or uppercase">
            Chapitre {s.chapitre + 1} sur {partie.chapitres.length} · {libelleTheme(s.theme)} · Question{' '}
            {s.dansChapitre + 1} sur {s.taille}
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-snug font-semibold">{question.enonce}</h1>

          {question.precision && (
            <div className="mt-3">
              <button
                type="button"
                aria-expanded={precisionOuverte}
                onClick={() => setPrecisionOuverte((o) => !o)}
                className="text-sm text-sourdine underline"
              >
                Précision {precisionOuverte ? '▴' : '▾'}
              </button>
              {precisionOuverte && <p className="mt-2 rounded-xl bg-nuit-clair p-3 text-sm leading-relaxed">{question.precision}</p>}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            {echelle.map((e) => (
              <button
                key={e.valeur}
                type="button"
                aria-pressed={deja?.valeur === e.valeur}
                onClick={() => repondre(e.valeur, important)}
                className={`rounded-xl border px-4 py-3 text-left text-lg ${INTENSITE[e.valeur]} ${
                  deja?.valeur === e.valeur ? 'ring-2 ring-creme' : ''
                }`}
              >
                {e.libelle}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-pressed={important}
            onClick={() => setImportant((v) => !v)}
            className={`mt-4 rounded-xl border px-4 py-3 text-left ${
              important ? 'border-or bg-or/20' : 'border-sourdine/30 text-sourdine'
            }`}
          >
            {important ? '★' : '☆'} Très important pour moi
          </button>

          <button
            type="button"
            onClick={() => repondre('sans_avis', false)}
            className="mt-2 rounded-xl px-4 py-2 text-left text-sm text-sourdine underline"
          >
            Sans avis
          </button>

          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={reculer}
              disabled={partie.position === 0}
              className="text-sm text-sourdine underline disabled:opacity-30"
            >
              ← Question précédente
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
