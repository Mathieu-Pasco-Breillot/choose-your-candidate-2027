import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { qualifierEcart } from '../../core/duel/index.ts';
import type { Valeur } from '../../core/score/types.ts';
import type { PartieDuel } from '../duel.ts';
import { affiniteDePartie, enRevelation, positionSur } from '../duel.ts';
import { questionCourante, situation } from '../jeu.ts';
import { ECARTS, ECHELLE, libelleTheme, libelleValeur, NATURES } from '../libelles.ts';
import { paquet } from '../paquet.ts';
import { apresSource } from '../badges.ts';
import { majBadges } from '../stockage.ts';
import { INTENSITE } from './Quiz.tsx';

interface Props {
  partie: PartieDuel;
  onRepondre: (valeur: Valeur | 'sans_avis', tresImportant: boolean) => void;
  onSuivante: () => void;
  onModifier: () => void;
  onQuitter: () => void;
}

const candidat = (id: string) => paquet.candidats.find((c) => c.id === id)!;

/**
 * Quiz du duel. Deux temps par proposition : la réponse, puis la révélation de la position du candidat
 * (reformulation, citation courte, source) avec l'affinité en direct. Le candidat est nommé ; aucun autre ne l'est.
 */
export function QuizDuel({ partie, onRepondre, onSuivante, onModifier, onQuitter }: Props) {
  const question = questionCourante(partie);
  const s = situation(partie);
  const c = candidat(partie.candidat);
  const nom = `${c.prenom} ${c.nom}`;
  const saisie = partie.reponses[question.id];
  const revelation = enRevelation(partie);
  const [important, setImportant] = useState(saisie?.tresImportant ?? false);
  const [precisionOuverte, setPrecisionOuverte] = useState(false);
  useEffect(() => {
    setImportant(saisie?.tresImportant ?? false);
    setPrecisionOuverte(false);
  }, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // L'ancienne carte reste un instant à l'écran pendant sa sortie : ses boutons ne doivent plus rien enregistrer.
  const courante = useRef(question.id);
  courante.current = question.id;
  const repondre = (valeur: Valeur | 'sans_avis', tresImportant: boolean) => {
    if (courante.current === question.id) onRepondre(valeur, tresImportant);
  };
  const total = partie.questions.length;
  const echelle = partie.echelleInversee ? [...ECHELLE].reverse() : ECHELLE;
  const repondues = Object.keys(partie.reponses).length;

  const position = revelation ? positionSur(partie, question.id) : undefined;
  const affinite = revelation ? affiniteDePartie(partie) : null;
  const derniere = partie.position === total - 1;

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
        aria-valuenow={repondues}
      >
        <div className="h-full bg-or transition-[width]" style={{ width: `${(repondues / total) * 100}%` }} />
      </div>
      <p className="mt-3 text-sm text-sourdine">
        Duel avec <strong className="text-creme">{nom}</strong> · {c.parti}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${question.id}-${revelation ? 'r' : 'q'}`}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="mt-5 flex flex-1 flex-col"
        >
          <p className="text-xs font-semibold tracking-[0.18em] text-or uppercase">
            Chapitre {s.chapitre + 1} sur {partie.chapitres.length} · {libelleTheme(s.theme)} · Proposition {s.dansChapitre + 1} sur {s.taille}
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-snug font-semibold">{question.enonce}</h1>

          {question.precision && (
            <div className="mt-3">
              <button type="button" aria-expanded={precisionOuverte} onClick={() => setPrecisionOuverte((o) => !o)} className="text-sm text-sourdine underline">
                Précision {precisionOuverte ? '▴' : '▾'}
              </button>
              {precisionOuverte && <p className="mt-2 rounded-xl bg-nuit-clair p-3 text-sm leading-relaxed">{question.precision}</p>}
            </div>
          )}

          {!revelation ? (
            <>
              <div className="mt-6 flex flex-col gap-2">
                {echelle.map((e) => (
                  <button
                    key={e.valeur}
                    type="button"
                    onClick={() => repondre(e.valeur, important)}
                    className={`rounded-xl border px-4 py-3 text-left text-lg ${INTENSITE[e.valeur]}`}
                  >
                    {e.libelle}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-pressed={important}
                onClick={() => setImportant((v) => !v)}
                className={`mt-4 rounded-xl border px-4 py-3 text-left ${important ? 'border-or bg-or/20' : 'border-sourdine/30 text-sourdine'}`}
              >
                {important ? '★' : '☆'} Très important pour moi
              </button>
              <button type="button" onClick={() => repondre('sans_avis', false)} className="mt-2 rounded-xl px-4 py-2 text-left text-sm text-sourdine underline">
                Sans avis
              </button>
            </>
          ) : (
            <section className="mt-6 flex flex-col gap-4" aria-label={`Position de ${nom}`} data-revelation>
              <div className="rounded-2xl border-l-4 border-or bg-nuit-clair p-4 leading-relaxed">
                <p className="text-xs font-semibold tracking-[0.18em] text-or uppercase">Ce que porte {nom}</p>
                <p className="mt-2">
                  Votre réponse : <strong>{saisie!.valeur === 'sans_avis' ? 'sans avis' : libelleValeur(saisie!.valeur)}</strong>
                  {saisie!.tresImportant ? ' (très important)' : ''}
                </p>
                {position && position.code !== null && (
                  <p>
                    Sa position : <strong>{libelleValeur(position.code)}</strong>{' '}
                    <span className="text-sourdine">({position.nature ? (NATURES[position.nature] ?? position.nature) : ''})</span>
                  </p>
                )}
                {position && position.code !== null && saisie!.valeur !== 'sans_avis' && (
                  <p className="mt-1 text-sm text-sourdine">
                    {ECARTS[qualifierEcart(4 - Math.abs(saisie!.valeur - position.code))]}
                  </p>
                )}
                {position?.extrait && (
                  <div className="mt-3 border-l-2 border-or/60 pl-3 [overflow-wrap:anywhere]">
                    <p>{position.extrait.reformulation}</p>
                    {position.extrait.citation && <p className="mt-1 italic">« {position.extrait.citation} »</p>}
                    <p className="mt-1 text-sm">
                      <a
                        className="underline"
                        href={position.extrait.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => majBadges((b) => apresSource(b, position.extrait!.source.url))}
                      >
                        {position.extrait.source.titre}
                      </a>
                      {position.extrait.source.datePublication ? ` (${position.extrait.source.datePublication})` : ''}
                    </p>
                  </div>
                )}
              </div>

              {affinite && (
                <div className="rounded-2xl bg-nuit-clair p-4" role="status" data-affinite>
                  {affinite.affichable && affinite.score.scoreArrondi !== null ? (
                    <>
                      <p className="text-sm text-sourdine">Affinité en direct avec {nom}</p>
                      <p className="font-serif text-4xl font-semibold" aria-label={`Affinité ${affinite.score.scoreArrondi} sur 100`}>
                        {affinite.score.scoreArrondi} <span className="text-lg text-sourdine">/ 100</span>
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-nuit">
                        <div className="h-full bg-or" style={{ width: `${affinite.score.scoreArrondi}%` }} />
                      </div>
                      <p className="mt-2 text-sm text-sourdine">
                        Fiabilité {affinite.fiabilite} · {affinite.score.codees} propositions comptées. Ce score n'est comparable ni à celui d'un autre candidat, ni au
                        classement des autres modes.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-sourdine">
                      Affinité en cours de calcul : encore {affinite.avantAffichage} réponse{affinite.avantAffichage > 1 ? 's' : ''} avant de
                      l'afficher (sous 8 propositions, un score ne voudrait rien dire).
                    </p>
                  )}
                </div>
              )}

              <button type="button" onClick={onSuivante} className="rounded-2xl bg-or px-5 py-4 font-serif text-xl font-semibold text-nuit">
                {derniere ? 'Voir mon résultat' : 'Proposition suivante →'}
              </button>
              <button type="button" onClick={onModifier} className="min-h-11 text-left text-sm text-sourdine underline">
                Modifier ma réponse (vous avez déjà vu sa position)
              </button>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
