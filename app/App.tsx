import { MotionConfig } from 'motion/react';
import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import type { Valeur } from '../core/score/types.ts';
import type { ModeJeu, Partie, Preparation as PreparationChoisie } from './jeu.ts';
import { estTerminee, marquerVues, nouvelleGraine, nouvellePartie, reculer, repondre, situation } from './jeu.ts';
import { apresPartie } from './badges.ts';
import { ecrireDuel, ecrirePartie, ecrireVues, lireDuel, lirePartie, lireVues, majBadges, toutEffacer } from './stockage.ts';
import type { TailleDuel } from '../core/duel/index.ts';
import type { PartieDuel, PreparationDuel as PreparationDuelChoisie } from './duel.ts';
import { enRevelation, modifierReponse, nouveauDuel, repondreDuel, suivante } from './duel.ts';
import { PreparationDuel } from './ecrans/PreparationDuel.tsx';
import { QuizDuel } from './ecrans/QuizDuel.tsx';
import { ResultatsDuel } from './ecrans/ResultatsDuel.tsx';
import { Accueil } from './ecrans/Accueil.tsx';
import { appliquerApparence } from './reglages.ts';
import { Vieprivee } from './ecrans/Vieprivee.tsx';
import { Defi } from './ecrans/Defi.tsx';
import { FinChapitre } from './ecrans/FinChapitre.tsx';
import { Chargement } from './ecrans/Chargement.tsx';
import { Preparation } from './ecrans/Preparation.tsx';
import { Quiz } from './ecrans/Quiz.tsx';
import { Resultats } from './ecrans/Resultats.tsx';

type Ecran = 'accueil' | 'preparation' | 'quiz' | 'resultats' | 'preparationDuel' | 'duel' | 'resultatsDuel' | 'defi' | 'vieprivee' | 'methode' | 'banque' | 'candidats' | 'fiche';

// Pages d'information : chargées à la demande, pour garder léger ce que télécharge le quiz.
const Methode = lazy(() => import('./pages/Methode.tsx').then((m) => ({ default: m.Methode })));
const Banque = lazy(() => import('./pages/Banque.tsx').then((m) => ({ default: m.Banque })));
const Candidats = lazy(() => import('./pages/Candidats.tsx').then((m) => ({ default: m.Candidats })));
const FicheCandidat = lazy(() => import('./pages/FicheCandidat.tsx').then((m) => ({ default: m.FicheCandidat })));

const aujourdhui = (): string => new Date().toISOString().slice(0, 10);

export function App() {
  const [partie, setPartie] = useState<Partie | null>(() => lirePartie());
  const [duel, setDuel] = useState<PartieDuel | null>(() => lireDuel());
  const [ecran, setEcran] = useState<Ecran>('accueil');
  // Change après « tout effacer » : l'accueil (et ses réglages) repart de zéro.
  const [generation, setGeneration] = useState(0);

  const changer = useCallback((p: Partie) => {
    setPartie(p);
    ecrirePartie(p);
  }, []);

  const changerDuel = useCallback((p: PartieDuel) => {
    setDuel(p);
    ecrireDuel(p);
  }, []);

  const [fiche, setFiche] = useState('');
  // Fiche ouverte depuis les résultats : retour aux résultats, à la même hauteur, sans rejouer la révélation.
  const [ficheDepuis, setFicheDepuis] = useState<'candidats' | 'resultats' | 'resultatsDuel'>('candidats');
  const [revelationVue, setRevelationVue] = useState(false);
  const defilement = useRef(0);
  const ouvrirFiche = (id: string, depuis: 'candidats' | 'resultats' | 'resultatsDuel') => {
    defilement.current = window.scrollY;
    setFiche(id);
    setFicheDepuis(depuis);
    setEcran('fiche');
    window.scrollTo(0, 0);
  };
  const retourDeFiche = () => {
    setEcran(ficheDepuis);
    requestAnimationFrame(() => window.scrollTo(0, defilement.current));
  };
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
    setRevelationVue(false);
    setEcran('quiz');
  };

  const lancerDuel = (candidat: string, taille: TailleDuel, preparation: PreparationDuelChoisie) => {
    changerDuel(nouveauDuel(candidat, taille, lireVues(), nouvelleGraine(), preparation));
    setEcran('duel');
  };

  const repondreDansDuel = (valeur: Valeur | 'sans_avis', tresImportant: boolean) => {
    if (!duel || enRevelation(duel)) return;
    changerDuel(repondreDuel(duel, { valeur, tresImportant }));
  };

  const suivanteDuel = () => {
    if (!duel || !enRevelation(duel)) return;
    const prochain = suivante(duel);
    changerDuel(prochain);
    if (estTerminee(prochain)) {
      ecrireVues(marquerVues(lireVues(), prochain, aujourdhui()));
      setEcran('resultatsDuel');
    }
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
    setDuel(null);
    setEcran('accueil');
  };

  return (
    <MotionConfig reducedMotion="user">
      {ecran === 'duel' && duel && !estTerminee(duel) ? (
        <QuizDuel
          partie={duel}
          onRepondre={repondreDansDuel}
          onSuivante={suivanteDuel}
          onModifier={() => changerDuel(modifierReponse(duel))}
          onQuitter={() => setEcran('accueil')}
        />
      ) : ecran === 'preparationDuel' ? (
        <PreparationDuel onLancer={lancerDuel} onRetour={() => setEcran('accueil')} />
      ) : ecran === 'resultatsDuel' && duel && estTerminee(duel) ? (
        <ResultatsDuel
          partie={duel}
          onFiche={(id) => ouvrirFiche(id, 'resultatsDuel')}
          onAutreDuel={() => setEcran('preparationDuel')}
          onAccueil={() => setEcran('accueil')}
          onVieprivee={() => setEcran('vieprivee')}
          onToutEffacer={effacer}
        />
      ) : ecran === 'quiz' && partie && !estTerminee(partie) && entracte ? (
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
          <Candidats onRetour={() => setEcran('accueil')} onFiche={(id) => ouvrirFiche(id, 'candidats')} />
        </Suspense>
      ) : ecran === 'fiche' ? (
        <Suspense fallback={<Chargement />}>
          <FicheCandidat id={fiche} onRetour={retourDeFiche} libelleRetour={ficheDepuis !== 'candidats' ? '← Retour aux résultats' : '← Retour'} />
        </Suspense>
      ) : ecran === 'vieprivee' ? (
        <Vieprivee onRetour={() => setEcran('accueil')} onToutEffacer={effacer} />
      ) : ecran === 'defi' ? (
        <Defi graine={graineDefi} onRejouer={() => setGraineDefi(nouvelleGraine())} onQuitter={() => setEcran('accueil')} />
      ) : ecran === 'resultats' && partie && estTerminee(partie) ? (
        <Resultats
          partie={partie}
          dejaRevele={revelationVue}
          onRevele={() => setRevelationVue(true)}
          onFiche={(id) => ouvrirFiche(id, 'resultats')}
          onNouvelle={() => setEcran('accueil')} onDefi={jouerDefi} onVieprivee={() => setEcran('vieprivee')} onToutEffacer={effacer} />
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
          duelEnCours={!!duel && !estTerminee(duel)}
          duelTermine={!!duel && estTerminee(duel)}
          onDuel={() => setEcran('preparationDuel')}
          onReprendreDuel={() => setEcran('duel')}
          onVoirResultatsDuel={() => setEcran('resultatsDuel')}
        />
      )}
    </MotionConfig>
  );
}
