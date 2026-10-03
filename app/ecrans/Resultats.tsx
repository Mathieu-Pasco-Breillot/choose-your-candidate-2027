import { useMemo, useState } from 'react';
import type { AccordDesaccord, HorsClassement, Classe, ScoreCandidat } from '../../core/score/index.ts';
import type { Valeur } from '../../core/score/types.ts';
import type { Partie } from '../jeu.ts';
import { questionsParId, resultatsDePartie } from '../jeu.ts';
import { FIABILITE, libelleTheme, libelleValeur, MODES, MOTIFS_NON_EVALUATION, NATURES } from '../libelles.ts';
import { paquet } from '../paquet.ts';

interface Props {
  partie: Partie;
  onNouvelle: () => void;
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
            <a className="underline" href={extrait.source.url} target="_blank" rel="noopener noreferrer">
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

function CarteCandidat({ s, rang, exAequo }: { s: ScoreCandidat; rang?: number; exAequo?: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const classe = rang !== undefined;
  const motif = (s as HorsClassement).motif;
  return (
    <li className="rounded-2xl border border-sourdine/20 bg-nuit-clair p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-semibold">
            {classe && <span className="mr-2 text-or">{exAequo ? `${rang} ex æquo` : rang}</span>}
            {nomComplet(s.candidatId)}
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
            <div className="h-full bg-or" style={{ width: `${s.score.scoreArrondi ?? 0}%` }} />
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
      <button type="button" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)} className="mt-3 text-sm underline">
        {ouvert ? 'Masquer le détail' : 'Voir le détail et les sources'} {ouvert ? '▴' : '▾'}
      </button>
      {ouvert && <Detail s={s} />}
    </li>
  );
}

export function Resultats({ partie, onNouvelle, onToutEffacer }: Props) {
  const r = useMemo(() => resultatsDePartie(partie), [partie]);
  const total = partie.questions.length;
  const classement: Classe[] = r.classement;
  const horsClassement: HorsClassement[] = r.horsClassement;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-5 py-8">
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-or uppercase">Vos résultats</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold">Mon Isoloir</h1>
        <p className="mt-2 text-sourdine">
          Mode {MODES[partie.mode].nom} · {r.repondues} réponses sur {total} questions · graine du tirage {partie.graine}
        </p>
      </header>

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
          <ol className="mt-3 flex flex-col gap-3">
            {classement.map((c) => (
              <CarteCandidat key={c.candidatId} s={c} rang={c.rang} exAequo={c.exAequo} />
            ))}
          </ol>
        </section>
      )}

      {horsClassement.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl font-semibold">Hors classement</h2>
          <p className="mt-1 text-sm text-sourdine">Ordre tiré au sort à chaque partie.</p>
          <ul className="mt-3 flex flex-col gap-3">
            {horsClassement.map((c) => (
              <CarteCandidat key={c.candidatId} s={c} />
            ))}
          </ul>
        </section>
      )}

      {r.nonEvalues.length > 0 && (
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
        <button type="button" onClick={onToutEffacer} className="text-sm text-sourdine underline">
          Tout effacer sur cet appareil
        </button>
      </div>
    </main>
  );
}
