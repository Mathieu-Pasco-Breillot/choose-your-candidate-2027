import { apresSource } from '../badges.ts';
import { majBadges } from '../stockage.ts';
import { useMemo, useState } from 'react';
import { nouveauDefi } from '../defi.ts';
import { libelleTheme } from '../libelles.ts';
import { paquet } from '../paquet.ts';

interface Props {
  graine: number;
  onRejouer: () => void;
  onQuitter: () => void;
}

const nom = (id: string): string => {
  const c = paquet.candidats.find((x) => x.id === id);
  return c ? `${c.prenom} ${c.nom}` : id;
};
const themeDeQuestion = (id: string): string => libelleTheme(paquet.questions.find((q) => q.id === id)?.theme ?? '');

export function Defi({ graine, onRejouer, onQuitter }: Props) {
  const defi = useMemo(() => nouveauDefi(graine), [graine]);
  const [numero, setNumero] = useState(0);
  const [choix, setChoix] = useState<Record<number, string>>({});
  const manche = defi.manches[numero];
  const total = defi.manches.length;
  const bonnes = defi.manches.filter((m, i) => choix[i] === m.bonne_reponse).length;

  if (total === 0) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-8">
        <h1 className="font-serif text-4xl font-semibold">Qui a dit ça ?</h1>
        <p className="leading-relaxed">
          Le défi n'est pas disponible pour l'instant : trop peu de positions nettes et sourcées sont publiées pour proposer des
          manches équilibrées entre candidats.
        </p>
        <button type="button" onClick={onQuitter} className="min-h-11 rounded-2xl bg-or px-5 py-3 font-serif text-lg font-semibold text-nuit">
          Retour
        </button>
      </main>
    );
  }

  if (!manche) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-or uppercase">Qui a dit ça ?</p>
        <h1 className="font-serif text-4xl font-semibold" role="status">
          {bonnes} bonne{bonnes > 1 ? 's' : ''} réponse{bonnes > 1 ? 's' : ''} sur {total}
        </h1>
        <p className="leading-relaxed text-sourdine">
          Ce jeu ne compare pas les candidats entre eux et n'a aucun lien avec votre résultat. Chaque position vient d'une source
          publique que vous pouvez ouvrir.
        </p>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={onRejouer} className="min-h-11 rounded-2xl bg-or px-5 py-4 font-serif text-xl font-semibold text-nuit">
            Rejouer
          </button>
          <button type="button" onClick={onQuitter} className="min-h-11 rounded-2xl border border-or/60 px-5 py-3 font-serif text-lg">
            Retour
          </button>
        </div>
      </main>
    );
  }

  const repondu = choix[numero];
  const juste = repondu === manche.bonne_reponse;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-8">
      <header>
        <button type="button" onClick={onQuitter} className="min-h-11 text-sm text-sourdine underline">
          ← Quitter le défi
        </button>
        <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-or uppercase">
          Qui a dit ça ? · manche {numero + 1} sur {total}
        </p>
      </header>

      <section className="rounded-2xl border-l-4 border-or bg-nuit-clair p-5 leading-relaxed" aria-labelledby="titre-position">
        <p className="text-sm text-sourdine">{themeDeQuestion(manche.question_id)}</p>
        <p className="mt-1 font-semibold">{manche.enonce}</p>
        <h2 id="titre-position" className="mt-4 font-serif text-xl font-semibold">
          Un candidat a pris cette position :
        </h2>
        <p className="mt-2">{repondu ? manche.revelation.reformulation : manche.indice.reformulation}</p>
        {(repondu ? manche.revelation.citation : manche.indice.citation) && (
          <p className="mt-2 italic">« {repondu ? manche.revelation.citation : manche.indice.citation} »</p>
        )}
      </section>

      {!repondu ? (
        <ul className="flex flex-col gap-2" aria-label="Candidats proposés">
          {manche.propositions.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setChoix((c) => ({ ...c, [numero]: id }))}
                className="min-h-11 w-full rounded-xl bg-nuit-clair px-4 py-3 text-left font-semibold"
              >
                {nom(id)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <section className="flex flex-col gap-3" aria-live="polite">
          <p className="font-serif text-xl font-semibold">
            {juste ? 'Bonne réponse : ' : `Ce n'était pas ${nom(repondu)}, c'était `}
            {nom(manche.bonne_reponse)}.
          </p>
          <p className="text-sm">
            Source :{' '}
            <a className="underline" href={manche.revelation.source.url} target="_blank" rel="noopener noreferrer" onClick={() => majBadges((b) => apresSource(b, manche.revelation.source.url))}>
              {manche.revelation.source.titre}
            </a>
            {manche.revelation.source.date_publication ? ` (${manche.revelation.source.date_publication})` : ''}
          </p>
          <button
            type="button"
            onClick={() => setNumero(numero + 1)}
            className="min-h-11 rounded-2xl bg-or px-5 py-3 font-serif text-lg font-semibold text-nuit"
          >
            {numero + 1 < total ? 'Manche suivante' : 'Voir le total'}
          </button>
        </section>
      )}
    </main>
  );
}
