import { MotionConfig } from 'motion/react';
import { lazy, Suspense, useCallback, useState } from 'react';
import type { Valeur } from '../core/score/types.ts';
import type { ModeJeu, Partie, Preparation as PreparationChoisie } from './jeu.ts';
import { estTerminee, marquerVues, nouvelleGraine, nouvellePartie, reculer, repondre, situation } from './jeu.ts';
import { apresPartie } from './badges.ts';
import { ecrirePartie, ecrireVues, lirePartie, lireVues, majBadges, toutEffacer } from './stockage.ts';
import { Accueil } from './ecrans/Accueil.tsx';
import { appliquerApparence } from './reglages.ts';
import { Vieprivee } from './ecrans/Vieprivee.tsx';
import { Defi } from './ecrans/Defi.tsx';
import { FinChapitre } from './ecrans/FinChapitre.tsx';
import { Chargement } from './ecrans/Chargement.tsx';
import { Preparation } from './ecrans/Preparation.tsx';
import { Quiz } from './ecrans/Quiz.tsx';
import { Resultats } from './ecrans/Resultats.tsx';

type Ecran = 'accueil' | 'preparation' | 'quiz' | 'resultats' | 'defi' | 'vieprivee' | 'methode' | 'banque' | 'candidats' | 'fiche';

// Pages d'information : chargées à la demande, pour garder léger ce que télécharge le quiz.
const Methode = lazy(() => import('./pages/Methode.tsx').then((m) => ({ default: m.Methode })));
const Banque = lazy(() => import('./pages/Banque.tsx').then((m) => ({ default: m.Banque })));
const Candidats = lazy(() => import('./pages/Candidats.tsx').then((m) => ({ default: m.Candidats })));
const FicheCandidat = lazy(() => import('./pages/FicheCandidat.tsx').then((m) => ({ default: m.FicheCandidat })));

const aujourdhui = (): string => new Date().toISOString().slice(0, 10);

export function App() {
  const [partie, setPartie] = useState<Partie | null>(() => lirePartie());
  const [ecran, setEcran] = useState<Ecran>('accueil');
  // Change après « tout effacer » : l'accueil (et ses réglages) repart de zéro.
  const [generation, setGeneration] = useState(0);

  const changer = useCallback((p: Partie) => {
    setPartie(p);
    ecrirePartie(p);
  }, []);

  const [fiche, setFiche] = useState('');
  const [mode, setMode] = useState<ModeJeu>('express');
  // Fin de chapitre (J1) : affichée juste après la dernière réponse d'un chapitre, jamais à la reprise d'une partie.
  const [entracte, setEntracte] = useState(false);
  const [graineDefi, setGraineDefi] = useState<number>(() => nouvelleGraine());

  const choisirMode = (m: ModeJeu) => {
    setMode(m);
    setEcran('preparation');
  };

  const lancer = (preparation: PreparationChoisie) => {
    changer(nouvellePartie(mode, lireVues(), nouvelleGraine(), preparation));
    setEntracte(false);
    setEcran('quiz');
  };

  const jouerDefi = () => {
    setGraineDefi(partie ? partie.graine : nouvelleGraine());
    setEcran('defi');
  };

  const repondreEtAvancer = (valeur: Valeur | 'sans_avis', tresImportant: boolean) => {
    if (!partie) return;
    const suivante = repondre(partie, { valeur, tresImportant });
    changer(suivante);
    if (!estTerminee(suivante) && situation(suivante).dansChapitre === 0 && situation(suivante).chapitre > situation(partie).chapitre) {
      setEntracte(true);
    }
    if (estTerminee(suivante)) {
      ecrireVues(marquerVues(lireVues(), suivante, aujourdhui()));
      majBadges((b) => apresPartie(b, suivante));
      setEcran('resultats');
    }
  };

  const effacer = () => {
    toutEffacer();
    appliquerApparence('auto');
    setGeneration((g) => g + 1);
    setPartie(null);
    setEcran('accueil');
  };

  return (
    <MotionConfig reducedMotion="user">
      {ecran === 'quiz' && partie && !estTerminee(partie) && entracte ? (
        <FinChapitre partie={partie} onContinuer={() => setEntracte(false)} />
      ) : ecran === 'quiz' && partie && !estTerminee(partie) ? (
        <Quiz
          partie={partie}
          onRepondre={repondreEtAvancer}
          onReculer={() => changer(reculer(partie))}
          onQuitter={() => setEcran('accueil')}
        />
      ) : ecran === 'preparation' ? (
        <Preparation mode={mode} onLancer={lancer} onRetour={() => setEcran('accueil')} />
      ) : ecran === 'methode' ? (
        <Suspense fallback={<Chargement />}>
          <Methode onRetour={() => setEcran('accueil')} graine={partie?.graine ?? null} journal={partie?.journal ?? null} />
        </Suspense>
      ) : ecran === 'banque' ? (
        <Suspense fallback={<Chargement />}>
          <Banque onRetour={() => setEcran('accueil')} />
        </Suspense>
      ) : ecran === 'candidats' ? (
        <Suspense fallback={<Chargement />}>
          <Candidats onRetour={() => setEcran('accueil')} onFiche={(id) => { setFiche(id); setEcran('fiche'); }} />
        </Suspense>
      ) : ecran === 'fiche' ? (
        <Suspense fallback={<Chargement />}>
          <FicheCandidat id={fiche} onRetour={() => setEcran('candidats')} />
        </Suspense>
      ) : ecran === 'vieprivee' ? (
        <Vieprivee onRetour={() => setEcran('accueil')} onToutEffacer={effacer} />
      ) : ecran === 'defi' ? (
        <Defi graine={graineDefi} onRejouer={() => setGraineDefi(nouvelleGraine())} onQuitter={() => setEcran('accueil')} />
      ) : ecran === 'resultats' && partie && estTerminee(partie) ? (
        <Resultats partie={partie} onNouvelle={() => setEcran('accueil')} onDefi={jouerDefi} onVieprivee={() => setEcran('vieprivee')} onToutEffacer={effacer} />
      ) : (
        <Accueil
          key={generation}
          enCours={!!partie && !estTerminee(partie)}
          terminee={!!partie && estTerminee(partie)}
          onCommencer={choisirMode}
          onDefi={jouerDefi}
          onVieprivee={() => setEcran('vieprivee')}
          onNaviguer={(e) => setEcran(e)}
          onReprendre={() => {
            setEntracte(false);
            setEcran('quiz');
          }}
          onVoirResultats={() => setEcran('resultats')}
          onToutEffacer={effacer}
        />
      )}
    </MotionConfig>
  );
}
