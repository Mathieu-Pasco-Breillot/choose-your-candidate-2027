import { MOTIFS_NON_EVALUATION } from '../libelles.ts';
import { paquet } from '../paquet.ts';

const alphabetique = [...paquet.candidats].sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'));
const aDesPositions = (id: string): boolean => (paquet.positions[id] ?? []).some((p) => p.etat === 'publie');

export function Candidats({ onRetour, onFiche }: { onRetour: () => void; onFiche: (id: string) => void }) {
  const calcules = alphabetique.filter((c) => c.statutEvaluation !== 'non_evalue' && aDesPositions(c.id));
  const autres = alphabetique.filter((c) => !calcules.includes(c));
  const Ligne = ({ id, detail }: { id: string; detail: string }) => {
    const c = paquet.candidats.find((x) => x.id === id)!;
    return (
      <li>
        <button type="button" onClick={() => onFiche(id)} className="min-h-11 w-full rounded-xl bg-nuit-clair px-4 py-2 text-left">
          <span className="font-semibold">{c.prenom} {c.nom}</span>
          <span className="block text-xs text-sourdine">{c.parti} · {detail}</span>
        </button>
      </li>
    );
  };
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-8">
      <header>
        <button type="button" onClick={onRetour} className="min-h-11 text-sm text-sourdine underline">
          ← Retour
        </button>
        <h1 className="mt-2 font-serif text-4xl font-semibold">Candidats</h1>
        <p className="mt-2 text-sourdine">Ordre alphabétique. Le critère d'inclusion est public (page Méthode).</p>
      </header>
      <section>
        <h2 className="font-serif text-2xl font-semibold">Positions codées</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {calcules.map((c) => <Ligne key={c.id} id={c.id} detail="calculé dans les résultats" />)}
        </ul>
      </section>
      <section>
        <h2 className="font-serif text-2xl font-semibold">Pas encore calculés</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {autres.map((c) => (
            <Ligne key={c.id} id={c.id} detail={c.motifNonEvaluation ? (MOTIFS_NON_EVALUATION[c.motifNonEvaluation] ?? c.motifNonEvaluation) : 'codage en attente'} />
          ))}
        </ul>
      </section>
    </main>
  );
}
