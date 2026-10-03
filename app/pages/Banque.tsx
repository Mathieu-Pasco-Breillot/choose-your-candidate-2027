import { useEffect, useState } from 'react';
import { libelleTheme, THEMES } from '../libelles.ts';
import { paquet } from '../paquet.ts';
import { chargerPages } from './donnees.ts';
import type { Pages } from './donnees.ts';

export function Banque({ onRetour }: { onRetour: () => void }) {
  const [pages, setPages] = useState<Pages | null>(null);
  useEffect(() => {
    void chargerPages().then(setPages);
  }, []);
  const horsJeu = pages?.horsJeu ?? [];

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-8 leading-relaxed">
      <header>
        <button type="button" onClick={onRetour} className="min-h-11 text-sm text-sourdine underline">
          ← Retour
        </button>
        <h1 className="mt-2 font-serif text-4xl font-semibold">Banque de questions</h1>
        <p className="mt-2 text-sourdine">
          {paquet.questions.length} questions actives, posées dans le quiz. Les questions suspendues ou archivées sont listées
          avec leur statut mais ne sont jamais posées.
        </p>
      </header>

      {Object.keys(THEMES).map((t) => {
        const actives = paquet.questions.filter((q) => q.theme === t);
        const autres = horsJeu.filter((q) => q.theme === t);
        return (
          <details key={t} className="rounded-xl bg-nuit-clair p-3">
            <summary className="min-h-11 cursor-pointer font-serif text-xl font-semibold">
              {libelleTheme(t)} <span className="text-sm font-normal text-sourdine">· {actives.length} actives{autres.length ? `, ${autres.length} hors jeu` : ''}</span>
            </summary>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {actives.map((q) => (
                <li key={q.id}>
                  <span className="text-sourdine">{q.id}</span> · {q.enonce}
                </li>
              ))}
              {autres.map((q) => (
                <li key={q.id} className="text-sourdine">
                  {q.id} · <strong>{q.statut === 'suspendue' ? 'Suspendue' : 'Archivée'}</strong> · {q.enonce}
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </main>
  );
}
