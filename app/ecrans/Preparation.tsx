import { useState } from 'react';
import type { PoidsTheme } from '../../core/tirage/index.ts';
import { THEMES, MODES } from '../libelles.ts';
import type { ModeJeu, Preparation as PreparationChoisie } from '../jeu.ts';
import { paquet } from '../paquet.ts';
import { lireVues } from '../stockage.ts';

const stock: Record<string, number> = {};
for (const q of paquet.questions) stock[q.theme] = (stock[q.theme] ?? 0) + 1;

interface Props {
  mode: ModeJeu;
  onLancer: (p: PreparationChoisie) => void;
  onRetour: () => void;
}

const NIVEAUX: readonly { poids: PoidsTheme; libelle: string }[] = [
  { poids: 0, libelle: 'Écarter' },
  { poids: 1, libelle: 'Normal' },
  { poids: 2, libelle: 'Important' },
  { poids: 3, libelle: 'Prioritaire' },
];

const candidatsParNom = [...paquet.candidats].sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'));

export function Preparation({ mode, onLancer, onRetour }: Props) {
  const themes = Object.keys(THEMES);
  const [poids, setPoids] = useState<Record<string, PoidsTheme>>(() => Object.fromEntries(themes.map((t) => [t, 1 as PoidsTheme])));
  const [affinites, setAffinites] = useState<string[]>([]);
  const actifs = themes.filter((t) => poids[t] !== 0);
  // Questions disponibles selon les poids (spécification § 6, ligne « Mode ») : un chapitre écarté retire ses questions.
  const [vues] = useState(() => new Set(lireVues().map((v) => v.id)));
  const disponibles = actifs.reduce((n, t) => n + (stock[t] ?? 0), 0);
  const nonVues = paquet.questions.filter((q) => actifs.includes(q.theme) && !vues.has(q.id)).length;
  const prevues = Math.min(MODES[mode].questions, disponibles);

  const basculer = (id: string) =>
    setAffinites((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-5 py-8">
      <header>
        <button type="button" onClick={onRetour} className="min-h-11 text-sm text-sourdine underline">
          ← Retour
        </button>
        <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-or uppercase">
          Mode {MODES[mode].nom} · {MODES[mode].questions} questions
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold">Préparation</h1>
        <p className="mt-2 text-sourdine">Deux réglages facultatifs. Vous pouvez lancer la partie tel quel.</p>
        <p className="mt-3 rounded-xl bg-nuit-clair p-3 text-sm leading-relaxed" role="status" data-questions-disponibles={disponibles}>
          Avec ces réglages : <strong>{disponibles} questions disponibles</strong>
          {vues.size > 0 ? ` (dont ${nonVues} jamais vues sur cet appareil)` : ''}.{' '}
          {prevues < MODES[mode].questions
            ? `La partie comptera ${prevues} questions au lieu de ${MODES[mode].questions} : gardez plus de chapitres pour en avoir davantage.`
            : `La partie comptera ${prevues} questions.`}
        </p>
      </header>

      <section aria-labelledby="titre-poids">
        <h2 id="titre-poids" className="font-serif text-2xl font-semibold">
          Ce qui compte pour vous
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-sourdine">
          Un chapitre « important » reçoit plus de questions et pèse plus dans le score ; « écarter » le retire de la partie
          et du calcul. Les candidats ne sont pas nommés pendant le quiz.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {themes.map((t) => (
            <li key={t} className="rounded-xl bg-nuit-clair p-3">
              <fieldset>
                <legend className="font-semibold">{THEMES[t]}</legend>
                <div className="mt-2 grid grid-cols-4 gap-1" role="radiogroup" aria-label={`Importance du chapitre ${THEMES[t]}`}>
                  {NIVEAUX.map((n) => (
                    <label
                      key={n.poids}
                      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-or ${
                        poids[t] === n.poids ? 'bg-or font-semibold text-nuit' : 'bg-nuit text-creme'
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`poids-${t}`}
                        checked={poids[t] === n.poids}
                        onChange={() => setPoids((p) => ({ ...p, [t]: n.poids }))}
                      />
                      {n.libelle}
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titre-affinites">
        <h2 id="titre-affinites" className="font-serif text-2xl font-semibold">
          Vos affinités (facultatif)
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-sourdine">
          Cochez les candidats dont vous vous sentez proche. <strong>Les affinités n'entrent pas dans le score</strong> et
          n'influencent pas le choix des questions : elles servent seulement, à la fin, à situer ces candidats dans vos résultats.
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-2">
          {candidatsParNom.map((c) => (
            <li key={c.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-nuit-clair px-3 py-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-or">
                <input type="checkbox" className="size-5 accent-or" checked={affinites.includes(c.id)} onChange={() => basculer(c.id)} />
                <span>
                  {c.prenom} {c.nom}
                  <span className="block text-xs text-sourdine">{c.parti}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={actifs.length === 0}
          onClick={() => onLancer({ poids: Object.fromEntries(themes.map((t) => [t, poids[t]!])), affinites })}
          className="rounded-2xl bg-or px-5 py-4 font-serif text-xl font-semibold text-nuit disabled:opacity-50"
        >
          Lancer la partie{actifs.length > 0 ? ` (${prevues} questions)` : ''}
        </button>
        {actifs.length === 0 && <p className="text-sm text-sourdine">Gardez au moins un chapitre pour lancer la partie.</p>}
      </div>
    </main>
  );
}
