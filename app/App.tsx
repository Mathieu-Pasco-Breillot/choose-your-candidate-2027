import { MotionConfig } from 'motion/react';
import { useCallback, useState } from 'react';
import type { Valeur } from '../core/score/types.ts';
import type { ModeJeu, Partie, Preparation as PreparationChoisie } from './jeu.ts';
import { estTerminee, marquerVues, nouvelleGraine, nouvellePartie, reculer, repondre } from './jeu.ts';
import { ecrirePartie, ecrireVues, lirePartie, lireVues, toutEffacer } from './stockage.ts';
import { Accueil } from './ecrans/Accueil.tsx';
import { Defi } from './ecrans/Defi.tsx';
import { Preparation } from './ecrans/Preparation.tsx';
import { Quiz } from './ecrans/Quiz.tsx';
import { Resultats } from './ecrans/Resultats.tsx';

type Ecran = 'accueil' | 'preparation' | 'quiz' | 'resultats' | 'defi';

const aujourdhui = (): string => new Date().toISOString().slice(0, 10);

export function App() {
  const [partie, setPartie] = useState<Partie | null>(() => lirePartie());
  const [ecran, setEcran] = useState<Ecran>('accueil');

  const changer = useCallback((p: Partie) => {
    setPartie(p);
    ecrirePartie(p);
  }, []);

  const [mode, setMode] = useState<ModeJeu>('express');
  const [graineDefi, setGraineDefi] = useState<number>(() => nouvelleGraine());

  const choisirMode = (m: ModeJeu) => {
    setMode(m);
    setEcran('preparation');
  };

  const lancer = (preparation: PreparationChoisie) => {
    changer(nouvellePartie(mode, lireVues(), nouvelleGraine(), preparation));
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
    if (estTerminee(suivante)) {
      ecrireVues(marquerVues(lireVues(), suivante, aujourdhui()));
      setEcran('resultats');
    }
  };

  const effacer = () => {
    toutEffacer();
    setPartie(null);
    setEcran('accueil');
  };

  return (
    <MotionConfig reducedMotion="user">
      {ecran === 'quiz' && partie && !estTerminee(partie) ? (
        <Quiz
          partie={partie}
          onRepondre={repondreEtAvancer}
          onReculer={() => changer(reculer(partie))}
          onQuitter={() => setEcran('accueil')}
        />
      ) : ecran === 'preparation' ? (
        <Preparation mode={mode} onLancer={lancer} onRetour={() => setEcran('accueil')} />
      ) : ecran === 'defi' ? (
        <Defi graine={graineDefi} onRejouer={() => setGraineDefi(nouvelleGraine())} onQuitter={() => setEcran('accueil')} />
      ) : ecran === 'resultats' && partie && estTerminee(partie) ? (
        <Resultats partie={partie} onNouvelle={() => setEcran('accueil')} onDefi={jouerDefi} onToutEffacer={effacer} />
      ) : (
        <Accueil
          enCours={!!partie && !estTerminee(partie)}
          terminee={!!partie && estTerminee(partie)}
          onCommencer={choisirMode}
          onDefi={jouerDefi}
          onReprendre={() => setEcran('quiz')}
          onVoirResultats={() => setEcran('resultats')}
          onToutEffacer={effacer}
        />
      )}
    </MotionConfig>
  );
}
