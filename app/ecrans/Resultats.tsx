import { apresDesaccordsLus, apresSource, badgesDe } from '../badges.ts';
import { EVENEMENT_BADGES, lireBadges, majBadges } from '../stockage.ts';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AccordDesaccord, HorsClassement, Classe, ScoreCandidat } from '../../core/score/index.ts';
import type { Valeur } from '../../core/score/types.ts';
import type { Partie } from '../jeu.ts';
import { questionsParId, resultatsDePartie } from '../jeu.ts';
import { FIABILITE, libelleTheme, libelleValeur, MODES, MOTIFS_NON_EVALUATION, NATURES } from '../libelles.ts';
import { paquet } from '../paquet.ts';
import { CartePartage } from './CartePartage.tsx';
import { jouer } from '../son.ts';

interface Props {
  partie: Partie;
  /** La révélation a déjà été vue pour cette partie (retour depuis une fiche) : pas de nouvelle animation. */
  dejaRevele: boolean;
  onRevele: () => void;
  onFiche: (id: string) => void;
  onNouvelle: () => void;
  onDefi: () => void;
  onVieprivee: () => void;
  onToutEffacer: () => void;
}

const candidatParId = new Map(paquet.candidats.map((c) => [c.id, c]));
const nomComplet = (id: string): string => {
  const c = candidatParId.get(id);
  return c ? `${c.prenom} ${c.nom}` : id;
};
const partiDe = (id: string): string => candidatParId.get(id)?.parti ?? '';

function groupesParMotif(liste: readonly { candidatId: string; motif: string }[]): [string, { candidatId: string; motif: string }[]][] {
  const groupes = new Map<string, { candidatId: string; motif: string }[]>();
  for (const n of liste) groupes.set(n.motif, [...(groupes.get(n.motif) ?? []), n]);
  return [...groupes.entries()];
}

function LigneAccord({ candidatId, a }: { candidatId: string; a: AccordDesaccord }) {
  const q = questionsParId.get(a.questionId);
  const position = paquet.positions[candidatId]?.find((p) => p.questionId === a.questionId);
  const extrait = position?.extrait;
  return (
    <li className="rounded-xl bg-nuit p-3 text-sm leading-relaxed">
      <p className="font-semibold">{q?.enonce}</p>
      <p className="mt-1 text-sourdine">{libelleTheme(a.theme)}</p>
      <p className="mt-2">
        Votre réponse : <strong>{libelleValeur(a.reponse as Valeur)}</strong>
      </p>
      <p>
        Sa position : <strong>{libelleValeur(a.code)}</strong> ({NATURES[a.nature] ?? a.nature})
      </p>
      {extrait && (
        <div className="mt-2 border-l-2 border-or/60 pl-3">
          <p>{extrait.reformulation}</p>
          {extrait.citation && <p className="mt-1 italic">« {extrait.citation} »</p>}
          <p className="mt-1">
            <a className="underline" href={extrait.source.url} target="_blank" rel="noopener noreferrer" onClick={() => majBadges((b) => apresSource(b, extrait.source.url))}>
              {extrait.source.titre}
            </a>
            {extrait.source.datePublication ? ` (${extrait.source.datePublication})` : ''}
          </p>
        </div>
      )}
    </li>
  );
}

function Detail({ s }: { s: ScoreCandidat }) {
  return (
    <div className="mt-3 flex flex-col gap-4">
      {s.score.scoreBrut !== null && (
        <p className="text-sm text-sourdine">
          Score brut : {Math.round(s.score.scoreBrut)} sur 100 · coefficient de couverture c = {s.score.c.toFixed(2)} (plus
          il est bas, plus le score est ramené vers 50).
        </p>
      )}
      {s.arbitragesEnAttente > 0 && (
        <p className="text-sm text-sourdine">
          {s.arbitragesEnAttente} position(s) en attente d'arbitrage : traitée(s) comme « non connu ».
        </p>
      )}
      <section>
        <h4 className="font-semibold">Accords les plus forts</h4>
        {s.accords.length === 0 ? (
          <p className="text-sm text-sourdine">Aucun accord fort sur les questions codées.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {s.accords.map((a) => (
              <LigneAccord key={a.questionId} candidatId={s.candidatId} a={a} />
            ))}
          </ul>
        )}
      </section>
      <section>
        <h4 className="font-semibold">Désaccords les plus forts</h4>
        {s.desaccords.length === 0 ? (
          <p className="text-sm text-sourdine">Aucun désaccord fort sur les questions codées.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {s.desaccords.map((a) => (
              <LigneAccord key={a.questionId} candidatId={s.candidatId} a={a} />
            ))}
          </ul>
        )}
      </section>
      <section>
        <h4 className="font-semibold">Par chapitre</h4>
        <ul className="mt-2 text-sm">
          {s.themes.map((t) => (
            <li key={t.theme} className="flex justify-between border-b border-sourdine/20 py-1">
              <span>{libelleTheme(t.theme)}</span>
              <span className="text-sourdine">
                {t.affichage === 'affiche' && t.score.scoreArrondi !== null ? `${t.score.scoreArrondi} / 100` : 'trop peu de questions'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CarteCandidat({ s, rang, exAequo, visible = true, onFiche }: { s: ScoreCandidat; rang?: number; exAequo?: boolean; visible?: boolean; onFiche: (id: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const classe = rang !== undefined;
  const motif = (s as HorsClassement).motif;
  return (
    <motion.li
      className="rounded-2xl border border-sourdine/20 bg-nuit-clair p-4"
      initial={false}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.35 }}
      aria-hidden={!visible}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-semibold">
            {classe && <span className="mr-2 text-or">{exAequo ? `${rang} ex æquo` : rang}</span>}
            <button
              type="button"
              onClick={() => onFiche(s.candidatId)}
              tabIndex={visible ? undefined : -1}
              className="text-left underline decoration-or/60 decoration-2 underline-offset-4"
            >
              {nomComplet(s.candidatId)}
              <span className="sr-only"> : ouvrir la fiche</span>
            </button>
          </h3>
          <p className="text-sm text-sourdine">{partiDe(s.candidatId)}</p>
        </div>
        {classe && s.score.scoreArrondi !== null && (
          <p className="font-serif text-3xl font-semibold" aria-label={`Score ${s.score.scoreArrondi} sur 100`}>
            {s.score.scoreArrondi}
          </p>
        )}
      </div>
      {classe ? (
        <>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-nuit">
            <div data-barre-score className="h-full bg-or" style={{ width: `${s.score.scoreArrondi ?? 0}%` }} />
          </div>
          <p className="mt-2 text-sm text-sourdine">
            Fiabilité {FIABILITE[s.fiabilite]} · codé sur {s.score.codees} de vos {s.score.repondues} questions
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm">
          Hors classement : {motif?.texte ?? 'trop peu de questions codées'}.
        </p>
      )}
      <button
        type="button"
        aria-expanded={ouvert}
        onClick={() => {
          if (!ouvert) {
            // Badge « Contradicteur » : le détail montre les extraits de ses trois désaccords les plus forts.
            const avecExtrait = s.desaccords.filter((a) => paquet.positions[s.candidatId]?.find((p) => p.questionId === a.questionId)?.extrait);
            if (avecExtrait.length >= 3) majBadges(apresDesaccordsLus);
          }
          setOuvert((o) => !o);
        }}
        className="mt-3 text-sm underline"
      >
        {ouvert ? 'Masquer le détail' : 'Voir le détail et les sources'} {ouvert ? '▴' : '▾'}
      </button>
      {ouvert && <Detail s={s} />}
    </motion.li>
  );
}

function SectionBadges() {
  const [etat, setEtat] = useState(lireBadges);
  useEffect(() => {
    const maj = () => setEtat(lireBadges());
    window.addEventListener(EVENEMENT_BADGES, maj);
    return () => window.removeEventListener(EVENEMENT_BADGES, maj);
  }, []);
  const badges = badgesDe(etat);
  return (
    <section className="rounded-2xl bg-nuit-clair p-5" aria-labelledby="titre-badges">
      <h2 id="titre-badges" className="font-serif text-2xl font-semibold">
        Vos badges
      </h2>
      <p className="mt-1 text-sm text-sourdine">Ils récompensent l'usage de l'outil, jamais le sens de vos réponses. Ils restent sur votre téléphone.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {badges.map((b) => (
          <li key={b.id} className={`rounded-xl border p-3 text-sm ${b.obtenu ? 'border-or bg-or/15' : 'border-sourdine/30'}`}>
            <p className="font-semibold">
              <span aria-hidden="true">{b.obtenu ? '★ ' : '☆ '}</span>
              {b.nom}
              <span className="sr-only">{b.obtenu ? ' (obtenu)' : ' (pas encore obtenu)'}</span>
            </p>
            <p className="text-sourdine">
              {b.description}
              {!b.obtenu && b.avancement ? ` Avancement : ${b.avancement}.` : ''}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Resultats({ partie, dejaRevele, onRevele, onFiche, onNouvelle, onDefi, onVieprivee, onToutEffacer }: Props) {
  const r = useMemo(() => resultatsDePartie(partie), [partie]);
  const total = partie.questions.length;
  const classement: Classe[] = r.classement;
  const horsClassement: HorsClassement[] = r.horsClassement;

  // Révélation (J4) : un court suspense, puis les cartes du classement une à une, de la dernière à la première.
  // Même animation pour tous. Le reste de la page (hors classement, non évalués) s'affiche ensuite, sans animation.
  // Animations réduites ou aucun classé : tout est visible tout de suite.
  const reduit = useReducedMotion();
  const n = classement.length;
  const [revelees, setRevelees] = useState(() => (reduit || dejaRevele || n === 0 ? n : -1));
  useEffect(() => {
    if (revelees >= n) return;
    const delai = revelees < 0 ? 1200 : 450;
    const t = setTimeout(() => setRevelees(revelees + 1 < 0 ? 0 : revelees + 1), delai);
    return () => clearTimeout(t);
  }, [revelees, n]);
  const fini = revelees >= n;
  // Son de révélation (J9, coupé par défaut) : le même pour tous, quand le classement commence à s'afficher.
  const sonJoue = useRef(dejaRevele);
  useEffect(() => {
    if (fini) onRevele();
  }, [fini]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (sonJoue.current || revelees < 0) return;
    sonJoue.current = true;
    jouer('revelation');
  }, [revelees]);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-5 py-8">
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-or uppercase">Vos résultats</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold">Mon Isoloir</h1>
        <p className="mt-2 text-sourdine">
          Mode {MODES[partie.mode].nom} · {r.repondues} réponses sur {total} questions · graine du tirage {partie.graine}
        </p>
      </header>

      {fini && r.affinites.length > 0 && (
        <section className="rounded-2xl bg-nuit-clair p-5 leading-relaxed">
          <h2 className="font-serif text-xl font-semibold">Vos affinités</h2>
          <p className="mt-1 text-sm text-sourdine">Les affinités n'entrent pas dans le score : elles servent seulement à situer ces candidats.</p>
          <ul className="mt-3 flex flex-col gap-1">
            {r.affinites.map((a) => (
              <li key={a.candidatId}>
                <strong>{nomComplet(a.candidatId)}</strong> :{' '}
                {a.situation === 'classe'
                  ? `${a.exAequo ? 'ex aequo, ' : ''}${a.rang}${a.rang === 1 ? 'er' : 'e'} du classement, score ${a.score}`
                  : a.situation === 'hors_classement'
                    ? `hors classement (${a.motif.texte})`
                    : a.situation === 'non_evalue'
                      ? `non évalué (${MOTIFS_NON_EVALUATION[a.motif] ?? a.motif})`
                      : 'candidat inconnu'}
              </li>
            ))}
          </ul>
        </section>
      )}

      {classement.length === 0 && (
        <section className="rounded-2xl border-l-4 border-or bg-nuit-clair p-5 leading-relaxed">
          <h2 className="font-serif text-xl font-semibold">Aucun candidat n'est classé pour l'instant</h2>
          <p className="mt-2">
            Pour classer un candidat, il faut qu'il soit codé sur au moins 10 de vos questions et sur la moitié de vos
            réponses. Le codage des positions n'est pas terminé : aujourd'hui, les candidats ne sont codés que sur un petit
            nombre de questions. Ce n'est ni une victoire, ni un échec pour personne.
          </p>
          <p className="mt-2">
            Vous pouvez tout de même consulter, candidat par candidat, vos accords et désaccords sur les questions déjà
            codées, avec les sources.
          </p>
        </section>
      )}

      {classement.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl font-semibold">Classement</h2>
          {!fini && (
            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-sourdine">
              <p role="status">{revelees < 0 ? 'Calcul de votre rapprochement…' : 'Voici le classement…'}</p>
              <button type="button" className="min-h-11 underline" onClick={() => setRevelees(n)}>
                Passer l'animation
              </button>
            </div>
          )}
          <ol className="mt-3 flex flex-col gap-3">
            {classement.map((c, i) => (
              <CarteCandidat key={c.candidatId} s={c} rang={c.rang} exAequo={c.exAequo} visible={i >= n - Math.max(revelees, 0)} onFiche={onFiche} />
            ))}
          </ol>
        </section>
      )}

      {fini && <SectionBadges />}

      {fini && <CartePartage mode={partie.mode} graine={partie.graine} classement={classement} nom={nomComplet} />}

      {fini && horsClassement.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl font-semibold">Hors classement</h2>
          <p className="mt-1 text-sm text-sourdine">Ordre tiré au sort à chaque partie.</p>
          <ul className="mt-3 flex flex-col gap-3">
            {horsClassement.map((c) => (
              <CarteCandidat key={c.candidatId} s={c} onFiche={onFiche} />
            ))}
          </ul>
        </section>
      )}

      {fini && r.nonEvalues.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl font-semibold">Non évalués</h2>
          <p className="mt-1 text-sm text-sourdine">
            Ces personnes ne remplissent pas encore le critère d'inclusion. Le critère est public dans le dépôt du projet.
          </p>
          {groupesParMotif(r.nonEvalues).map(([motif, liste]) => (
            <div key={motif} className="mt-3">
              <h3 className="font-semibold">{MOTIFS_NON_EVALUATION[motif] ?? motif}</h3>
              <p className="text-sm text-sourdine">{liste.map((n) => nomComplet(n.candidatId)).join(', ')}</p>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-2xl bg-nuit-clair p-5 text-sm leading-relaxed text-sourdine">
        <p>Les écarts entre candidats comptent plus que les valeurs : répondre « ni d'accord, ni pas d'accord » partout donne au moins 50 avec tout le monde.</p>
        <p className="mt-2">Les votes au Parlement n'entrent ni dans le codage des positions ni dans le score. Indicateur de votes : pas encore disponible.</p>
        <p className="mt-2">
          Même graine et mêmes réponses redonnent les mêmes résultats. Méthode complète et données :{' '}
          <a className="underline" href="https://github.com/Mathieu-Pasco-Breillot/choose-your-candidate-2027" rel="noopener noreferrer">
            dépôt du projet
          </a>
          .
        </p>
      </section>

      <div className="flex flex-col gap-3">
        <button type="button" onClick={onNouvelle} className="rounded-2xl bg-or px-5 py-4 font-serif text-xl font-semibold text-nuit">
          Nouvelle partie, nouvelles questions
        </button>
        <button type="button" onClick={onDefi} className="min-h-11 rounded-2xl border border-or/60 px-5 py-3 font-serif text-lg">
          Jouer au défi « Qui a dit ça ? »
        </button>
        <button type="button" onClick={onVieprivee} className="min-h-11 text-sm text-sourdine underline">
          Vie privée
        </button>
        <button type="button" onClick={onToutEffacer} className="text-sm text-sourdine underline">
          Tout effacer sur cet appareil
        </button>
      </div>
    </main>
  );
}
