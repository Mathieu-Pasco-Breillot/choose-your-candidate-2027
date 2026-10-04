import { apresSource } from '../badges.ts';
import { majBadges } from '../stockage.ts';
import { EXPLICATIONS_MOTIFS, libelleTheme, libelleValeur, MOTIFS_NON_EVALUATION, NATURES, THEMES } from '../libelles.ts';
import { questionsParId } from '../jeu.ts';
import { paquet } from '../paquet.ts';

const STATUTS: Record<string, string> = {
  evalue: 'Évalué',
  codage_en_attente: 'Codage en attente',
  non_evalue: 'Non évalué',
};

export function FicheCandidat({ id, onRetour, libelleRetour = '← Retour' }: { id: string; onRetour: () => void; libelleRetour?: string }) {
  const c = paquet.candidats.find((x) => x.id === id);
  if (!c) return null;
  const positions = paquet.positions[id] ?? [];
  const publiees = positions.filter((p) => p.etat === 'publie');
  const enAttente = positions.filter((p) => p.etat === 'arbitrage_en_attente').length;
  const actives = paquet.questions.length;
  const parNature = (n: string) => publiees.filter((p) => p.nature === n).length;
  const q = (qid: string) => questionsParId.get(qid);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-8 leading-relaxed">
      <header>
        <button type="button" onClick={onRetour} className="min-h-11 text-sm text-sourdine underline">
          {libelleRetour}
        </button>
        <h1 className="mt-2 font-serif text-4xl font-semibold">{c.prenom} {c.nom}</h1>
        <p className="text-sourdine">{c.parti}</p>
      </header>

      <section className="rounded-xl bg-nuit-clair p-4 text-sm">
        <h2 className="font-serif text-xl font-semibold">Statut et couverture</h2>
        <ul className="mt-2 flex flex-col gap-1">
          <li>
            Statut :{' '}
            <strong>
              {c.statutEvaluation !== 'non_evalue' && publiees.length > 0
                ? // Même règle que le calcul (jeu.ts) : un candidat avec des positions publiées est comparé, même si son
                  // statut dans les données est encore « codage en attente » (aucun n'est « évalué » au 4 octobre 2026).
                  'Comparé dans les résultats, codage en cours'
                : STATUTS[c.statutEvaluation]}
            </strong>
            {c.motifNonEvaluation ? ` (${MOTIFS_NON_EVALUATION[c.motifNonEvaluation] ?? c.motifNonEvaluation})` : ''}
          </li>
          <li className="text-sourdine">
            {c.statutEvaluation === 'non_evalue'
              ? EXPLICATIONS_MOTIFS[c.motifNonEvaluation ?? 'motif_non_renseigne']
              : publiees.length > 0
                ? EXPLICATIONS_MOTIFS.compares
                : EXPLICATIONS_MOTIFS.codage_en_attente}
          </li>
          <li>
            Positions publiées : <strong>{publiees.length}</strong> sur {actives} questions actives ({Math.round((100 * publiees.length) / actives)} %)
          </li>
          {publiees.length > 0 && (
            <li>
              Précision : {parNature('nette')} nettes, {parNature('nuancee')} nuancées, {parNature('imprecise')} imprécises, {parNature('non_connu')} non connues
            </li>
          )}
          {enAttente > 0 && <li>{enAttente} positions en attente d'arbitrage (traitées comme « non connu »).</li>}
          <li>Programme : pas de document de programme rattaché à la fiche pour l'instant.</li>
          <li>Indicateur de votes : pas encore disponible.</li>
        </ul>
      </section>

      {publiees.length === 0 ? (
        <p className="text-sourdine">Aucune position n'est encore publiée pour ce candidat.</p>
      ) : (
        Object.keys(THEMES).map((t) => {
          const liste = publiees.filter((p) => q(p.questionId)?.theme === t && p.code !== null);
          if (liste.length === 0) return null;
          return (
            <details key={t} className="rounded-xl bg-nuit-clair p-3">
              <summary className="min-h-11 cursor-pointer font-serif text-xl font-semibold">
                {libelleTheme(t)} <span className="text-sm font-normal text-sourdine">· {liste.length} positions</span>
              </summary>
              <ul className="mt-2 flex flex-col gap-3 text-sm">
                {liste.map((p) => (
                  <li key={p.questionId} className="rounded-lg bg-nuit p-3">
                    <p className="font-semibold">{q(p.questionId)?.enonce}</p>
                    <p className="mt-1">Position : <strong>{libelleValeur(p.code!)}</strong> ({NATURES[p.nature ?? ''] ?? p.nature})</p>
                    {p.extrait && (
                      <div className="mt-2 border-l-2 border-or/60 pl-3 [overflow-wrap:anywhere]">
                        <p>{p.extrait.reformulation}</p>
                        {p.extrait.citation && <p className="mt-1 italic">« {p.extrait.citation} »</p>}
                        <p className="mt-1">
                          <a className="underline" href={p.extrait.source.url} target="_blank" rel="noopener noreferrer" onClick={() => majBadges((b) => apresSource(b, p.extrait!.source.url))}>{p.extrait.source.titre}</a>
                          {p.extrait.source.datePublication ? ` (${p.extrait.source.datePublication})` : ''}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          );
        })
      )}
    </main>
  );
}
