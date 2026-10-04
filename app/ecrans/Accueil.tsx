import { MODES } from '../libelles.ts';
import type { ModeJeu } from '../jeu.ts';
import { Reglages } from './Reglages.tsx';

interface Props {
  enCours: boolean;
  terminee: boolean;
  onCommencer: (mode: ModeJeu) => void;
  onDefi: () => void;
  onVieprivee: () => void;
  onNaviguer: (ecran: 'methode' | 'banque' | 'candidats') => void;
  onReprendre: () => void;
  onVoirResultats: () => void;
  onToutEffacer: () => void;
}

function Carte({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border-l-4 border-or bg-nuit-clair p-5">
      <h2 className="font-serif text-xl font-semibold">{titre}</h2>
      <div className="mt-2 leading-relaxed text-creme/90">{children}</div>
    </section>
  );
}

export function Accueil({ enCours, terminee, onCommencer, onDefi, onVieprivee, onNaviguer, onReprendre, onVoirResultats, onToutEffacer }: Props) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-10">
      <header className="mb-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-or uppercase">Présidentielle 2027</p>
        <h1 className="mt-2 font-serif text-5xl font-semibold">Mon Isoloir</h1>
        <p className="mt-3 text-lg text-sourdine">Comparez les candidats, à l'abri des regards.</p>
      </header>

      {enCours && (
        <button
          type="button"
          onClick={onReprendre}
          className="rounded-2xl border border-or/60 bg-nuit-clair p-5 text-left"
        >
          <span className="block font-serif text-xl font-semibold">Reprendre la partie en cours</span>
          <span className="text-sourdine">Vous retrouvez vos réponses là où vous les avez laissées.</span>
        </button>
      )}
      {terminee && (
        <button
          type="button"
          onClick={onVoirResultats}
          className="rounded-2xl border border-or/60 bg-nuit-clair p-5 text-left"
        >
          <span className="block font-serif text-xl font-semibold">Revoir mon dernier résultat</span>
        </button>
      )}

      <Carte titre="Le principe">
        Vous réagissez à des propositions, une par une. À la fin, l'outil compare vos réponses aux positions publiques
        des candidats, chacune appuyée sur une source que vous pouvez ouvrir.
      </Carte>
      <Carte titre="Ce que l'outil ne fait pas">
        Il ne vous dit pas pour qui voter. Il ne tient compte ni des personnalités, ni des sondages, ni des votes au
        Parlement. Un candidat dont les positions sont encore trop peu codées n'est pas classé : l'outil l'indique.
      </Carte>
      <Carte titre="Vos réponses restent sur votre téléphone">
        Tout le calcul se fait dans votre navigateur. Aucune réponse n'est envoyée, aucun suivi n'est installé.
      </Carte>

      <div className="mt-2 flex flex-col gap-3">
        {(Object.keys(MODES) as ModeJeu[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onCommencer(mode)}
            className="rounded-2xl bg-or px-5 py-4 text-left text-nuit transition-transform active:scale-[0.99]"
          >
            <span className="block font-serif text-2xl font-semibold">
              {MODES[mode].nom} · {MODES[mode].questions} questions
            </span>
            <span className="text-nuit">{MODES[mode].duree}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onDefi}
        className="min-h-11 rounded-2xl border border-or/60 px-5 py-3 text-left"
      >
        <span className="block font-serif text-xl font-semibold">Défi « Qui a dit ça ? »</span>
        <span className="text-sourdine">Cinq positions sourcées, sans les noms. Un jeu à part, sans lien avec votre résultat.</span>
      </button>

      <Reglages />

      <footer className="mt-6 flex flex-col gap-2 text-sm text-sourdine">
        <p>
          Version de démonstration : les positions des candidats sont codées au fil de l'eau, thème par thème. Pour
          l'instant, le codage est partiel : les résultats sont à lire avec prudence.
        </p>
        <nav aria-label="Informations" className="flex flex-wrap gap-x-5">
          <button type="button" onClick={() => onNaviguer('methode')} className="min-h-11 underline">
            Méthode
          </button>
          <button type="button" onClick={() => onNaviguer('candidats')} className="min-h-11 underline">
            Candidats
          </button>
          <button type="button" onClick={() => onNaviguer('banque')} className="min-h-11 underline">
            Questions
          </button>
          <button type="button" onClick={onVieprivee} className="min-h-11 underline">
            Vie privée
          </button>
        </nav>
        <p>
          <a className="underline" href="https://github.com/Mathieu-Pasco-Breillot/choose-your-candidate-2027" rel="noopener noreferrer">
            Méthode, données et code source
          </a>
        </p>
        <button type="button" onClick={onToutEffacer} className="w-fit underline">
          Tout effacer sur cet appareil
        </button>
      </footer>
    </main>
  );
}
