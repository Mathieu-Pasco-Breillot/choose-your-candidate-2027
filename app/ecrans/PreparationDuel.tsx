import { useMemo, useState } from 'react';
import type { TailleDuel } from '../../core/duel/index.ts';
import { PROPOSITIONS_MIN_DUEL } from '../../core/duel/index.ts';
import type { PoidsTheme } from '../../core/tirage/index.ts';
import { candidatsDuel, ordreAleatoire, propositionsParChapitre } from '../duel.ts';
import type { PreparationDuel as PreparationChoisie } from '../duel.ts';
import { nouvelleGraine } from '../jeu.ts';
import { libelleTheme, TAILLES_DUEL_INFO } from '../libelles.ts';
import { lireVues } from '../stockage.ts';

interface Props {
  onLancer: (candidat: string, taille: TailleDuel, preparation: PreparationChoisie) => void;
  onRetour: () => void;
}

const NIVEAUX: readonly { poids: PoidsTheme; libelle: string }[] = [
  { poids: 0, libelle: 'Écarter' },
  { poids: 1, libelle: 'Normal' },
  { poids: 2, libelle: 'Important' },
  { poids: 3, libelle: 'Prioritaire' },
];

const tous = candidatsDuel();

export function PreparationDuel({ onLancer, onRetour }: Props) {
  const [choix, setChoix] = useState<string | null>(null);
  const [taille, setTaille] = useState<TailleDuel>(40);
  const [poids, setPoids] = useState<Record<string, PoidsTheme>>({});
  // Ordre d'affichage tiré au sort à chaque ouverture : ni classement, ni ordre qui avantage un nom.
  const graineOrdre = useMemo(() => nouvelleGraine(), []);
  const disponibles = useMemo(() => ordreAleatoire(tous.filter((c) => c.disponible), graineOrdre), [graineOrdre]);
  const indisponibles = tous.filter((c) => !c.disponible);

  if (choix === null) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-5 py-8">
        <header>
          <button type="button" onClick={onRetour} className="min-h-11 text-sm text-sourdine underline">
            ← Retour
          </button>
          <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-or uppercase">Mode Duel</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Duel avec un candidat</h1>
          <p className="mt-3 leading-relaxed text-sourdine">
            Choisissez un candidat. On vous propose ses positions une par une ; après chacune de vos réponses, vous
            découvrez ce qu'il ou elle porte, avec la source, et votre affinité se met à jour.
          </p>
          <p className="mt-3 rounded-xl bg-nuit-clair p-3 text-sm leading-relaxed">
            Ce mode ne dit pas pour qui voter. Les propositions posées dépendent du candidat : <strong>le score d'un duel n'est
            comparable ni à celui d'un autre candidat, ni au classement des autres modes.</strong>
          </p>
        </header>

        <section aria-labelledby="titre-candidats">
          <h2 id="titre-candidats" className="font-serif text-2xl font-semibold">
            Avec quel candidat ?
          </h2>
          <p className="mt-1 text-sm text-sourdine">Ordre tiré au sort à chaque ouverture de cet écran.</p>
          <ul className="mt-4 flex flex-col gap-2">
            {disponibles.map(({ candidat, propositions }) => (
              <li key={candidat.id}>
                <button
                  type="button"
                  onClick={() => setChoix(candidat.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-nuit-clair px-4 py-3 text-left"
                >
                  <span>
                    <span className="block font-semibold">
                      {candidat.prenom} {candidat.nom}
                    </span>
                    <span className="block text-xs text-sourdine">{candidat.parti}</span>
                  </span>
                  <span className="shrink-0 text-sm text-sourdine">{propositions} propositions</span>
                </button>
              </li>
            ))}
          </ul>
          {indisponibles.length > 0 && (
            <div className="mt-5">
              <h3 className="font-semibold">Pas encore assez de propositions</h3>
              <p className="mt-1 text-sm text-sourdine">
                Il en faut au moins {PROPOSITIONS_MIN_DUEL} pour un duel. Le codage se poursuit, candidat par candidat.
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-sourdine">
                {indisponibles.map(({ candidat, propositions }) => (
                  <li key={candidat.id} className="flex justify-between border-b border-sourdine/20 py-1">
                    <span>
                      {candidat.prenom} {candidat.nom}
                    </span>
                    <span>{propositions} sur {PROPOSITIONS_MIN_DUEL} requises</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    );
  }

  const fiche = tous.find((c) => c.candidat.id === choix)!;
  const parChapitre = propositionsParChapitre(choix);
  const chapitres = [...parChapitre.keys()].sort();
  const poidsDe = (t: string): PoidsTheme => poids[t] ?? 1;
  const actifs = chapitres.filter((t) => poidsDe(t) !== 0);
  const disponiblesApresReglage = actifs.reduce((n, t) => n + (parChapitre.get(t) ?? 0), 0);
  const vues = new Set(lireVues().map((v) => v.id));
  const prevues = taille === 'tout' ? disponiblesApresReglage : Math.min(taille, disponiblesApresReglage);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-5 py-8">
      <header>
        <button type="button" onClick={() => setChoix(null)} className="min-h-11 text-sm text-sourdine underline">
          ← Choisir un autre candidat
        </button>
        <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-or uppercase">Mode Duel</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold">
          {fiche.candidat.prenom} {fiche.candidat.nom}
        </h1>
        <p className="mt-1 text-sourdine">{fiche.candidat.parti} · {fiche.propositions} propositions disponibles</p>
        <p className="mt-3 rounded-xl bg-nuit-clair p-3 text-sm leading-relaxed" role="status" data-propositions-prevues={prevues}>
          Avec ces réglages : <strong>{disponiblesApresReglage} propositions disponibles</strong>
          {vues.size > 0 ? ' (celles déjà vues sur cet appareil passent en dernier)' : ''}. Le duel comptera <strong>{prevues}</strong> propositions.
        </p>
      </header>

      <section aria-labelledby="titre-taille">
        <h2 id="titre-taille" className="font-serif text-2xl font-semibold">
          Combien de propositions ?
        </h2>
        <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label="Nombre de propositions">
          {TAILLES_DUEL_INFO.map((t) => (
            <label
              key={String(t.taille)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-or ${
                taille === t.taille ? 'bg-or font-semibold text-nuit' : 'bg-nuit-clair'
              }`}
            >
              <input type="radio" className="sr-only" name="taille-duel" checked={taille === t.taille} onChange={() => setTaille(t.taille)} />
              <span>{t.nom}</span>
              <span className={`text-sm ${taille === t.taille ? 'text-nuit' : 'text-sourdine'}`}>{t.duree}</span>
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="titre-poids">
        <h2 id="titre-poids" className="font-serif text-2xl font-semibold">
          Ce qui compte pour vous
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-sourdine">
          Un chapitre « important » reçoit plus de propositions et pèse plus dans l'affinité ; « écarter » le retire du duel et
          du calcul.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {chapitres.map((t) => (
            <li key={t} className="rounded-xl bg-nuit-clair p-3">
              <fieldset>
                <legend className="font-semibold">
                  {libelleTheme(t)} <span className="text-sm font-normal text-sourdine">({parChapitre.get(t)} propositions)</span>
                </legend>
                <div className="mt-2 grid grid-cols-4 gap-1" role="radiogroup" aria-label={`Importance du chapitre ${libelleTheme(t)}`}>
                  {NIVEAUX.map((n) => (
                    <label
                      key={n.poids}
                      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-or ${
                        poidsDe(t) === n.poids ? 'bg-or font-semibold text-nuit' : 'bg-nuit text-creme'
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`poids-duel-${t}`}
                        checked={poidsDe(t) === n.poids}
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

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={actifs.length === 0}
          onClick={() => onLancer(choix, taille, { poids: Object.fromEntries(chapitres.map((t) => [t, poidsDe(t)])) })}
          className="rounded-2xl bg-or px-5 py-4 font-serif text-xl font-semibold text-nuit disabled:opacity-50"
        >
          Lancer le duel{actifs.length > 0 ? ` (${prevues} propositions)` : ''}
        </button>
        {actifs.length === 0 && <p className="text-sm text-sourdine">Gardez au moins un chapitre pour lancer le duel.</p>}
      </div>
    </main>
  );
}
