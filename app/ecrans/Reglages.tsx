import { useState } from 'react';
import type { Apparence } from '../reglages.ts';
import { ecrireApparence, ecrireSon, lireApparence, lireSon } from '../reglages.ts';
import { jouer } from '../son.ts';

const APPARENCES: readonly { valeur: Apparence; libelle: string }[] = [
  { valeur: 'auto', libelle: 'Automatique' },
  { valeur: 'clair', libelle: 'Clair' },
  { valeur: 'sombre', libelle: 'Sombre' },
];

/** Réglages de l'accueil : apparence (clair, sombre, automatique) et effets sonores (coupés par défaut). */
export function Reglages() {
  const [apparence, setApparence] = useState<Apparence>(lireApparence);
  const [son, setSon] = useState(lireSon);

  return (
    <section aria-labelledby="titre-reglages" className="rounded-2xl bg-nuit-clair p-5">
      <h2 id="titre-reglages" className="font-serif text-xl font-semibold">
        Réglages
      </h2>
      <fieldset className="mt-3">
        <legend className="text-sm font-semibold">Apparence</legend>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {APPARENCES.map((a) => (
            <label
              key={a.valeur}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-or ${
                apparence === a.valeur ? 'bg-or font-semibold text-nuit' : 'bg-nuit text-creme'
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                name="apparence"
                checked={apparence === a.valeur}
                onChange={() => {
                  setApparence(a.valeur);
                  ecrireApparence(a.valeur);
                }}
              />
              {a.libelle}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-sourdine">« Automatique » suit le réglage de votre téléphone.</p>
      </fieldset>
      <div className="mt-4">
        <button
          type="button"
          aria-pressed={son}
          onClick={() => {
            const suivant = !son;
            setSon(suivant);
            ecrireSon(suivant);
            if (suivant) jouer('chapitre');
          }}
          className={`min-h-11 w-full rounded-lg border px-4 text-left text-sm ${son ? 'border-or bg-or/20' : 'border-sourdine/30'}`}
        >
          <span aria-hidden="true">{son ? '♪ ' : '· '}</span>
          Effets sonores : <strong>{son ? 'activés' : 'coupés'}</strong>
        </button>
        <p className="mt-1 text-xs text-sourdine">Un petit son à la fin d'un chapitre et à l'affichage des résultats. Coupés par défaut.</p>
      </div>
    </section>
  );
}
