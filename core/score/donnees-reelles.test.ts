/**
 * Calcul sur les données réelles du dépôt (data/). La lecture des fichiers se fait ici, dans le test
 * uniquement : core/score ne lit jamais de fichier. L'adaptateur ci-dessous est volontairement minimal ;
 * celui de l'application viendra avec le paquet de données (lot 5e).
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { chargerDataset } from '../../scripts/lib/dataset.ts';
import { etatDePosition } from './codee.ts';
import { generateur, melangeur } from './outils-tests.ts';
import { calculerResultats } from './resultats.ts';
import type { Candidat, EntreeResultats, NatureCodee, Position, Reponse, Valeur } from './types.ts';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ds = chargerDataset(racine);

const questions = Object.values(ds.questions)
  .flatMap((f) => f.questions)
  .filter((q) => q.statut === 'active');
const themes = [...new Set(questions.map((q) => q.theme))];

const candidats: Candidat[] = ds.candidats.candidats.map((c) => ({
  id: c.id,
  statutEvaluation: c.statut_evaluation,
  ...(c.motif_non_evaluation ? { motifNonEvaluation: c.motif_non_evaluation } : {}),
}));

const positions: Record<string, Position[]> = Object.fromEntries(
  Object.entries(ds.positions).map(([id, f]) => [
    id,
    f.positions.map((p) => {
      const etat = etatDePosition(p.statut, p.code);
      return {
        questionId: p.question_id,
        etat,
        code: etat === 'publie' ? (p.code as Valeur) : null,
        nature: etat === 'publie' ? (p.nature as NatureCodee | 'non_connu') : etat === 'arbitrage_en_attente' ? null : 'non_connu',
      };
    }),
  ]),
);

function partie(graine: number, taille: number, sansAvisPartout = false): EntreeResultats {
  const alea = generateur(graine);
  const tirees = melangeur(graine)(questions).slice(0, taille);
  const reponses: Reponse[] = tirees.map((q) => ({
    questionId: q.id,
    theme: q.theme,
    valeur: sansAvisPartout ? 'sans_avis' : alea() < 0.1 ? 'sans_avis' : ((Math.floor(alea() * 5) - 2) as Valeur),
    tresImportant: alea() < 0.2,
  }));
  return {
    reponses,
    poidsThemes: Object.fromEntries(themes.map((t) => [t, 1 + Math.floor(alea() * 3)])),
    candidats,
    positions,
    affinites: candidats.filter(() => alea() < 0.1).map((c) => c.id),
    // Aucun candidat n'est « evalue » au 3 octobre 2026 : on calcule aussi ceux en codage en attente.
    options: { inclureCodageEnAttente: true },
  };
}

describe('données réelles', () => {
  it('les données se chargent et contiennent des codes publiés', () => {
    expect(questions.length).toBeGreaterThan(100);
    const publies = Object.values(positions).flat().filter((p) => p.etat === 'publie');
    expect(publies.length).toBeGreaterThan(0);
  });

  it.each([20, 40, 60, 206])('réponses aléatoires, %i questions : aucun plantage, scores bornés', (taille) => {
    for (let graine = 0; graine < 200; graine++) {
      const r = calculerResultats(partie(graine, taille), melangeur(graine));
      expect(r.classement.length + r.horsClassement.length + r.nonEvalues.length).toBe(candidats.length);
      for (const c of [...r.classement, ...r.horsClassement]) {
        expect(c.score.c).toBeGreaterThanOrEqual(0);
        expect(c.score.c).toBeLessThanOrEqual(1);
        if (c.score.score !== null) {
          expect(c.score.score).toBeGreaterThanOrEqual(0);
          expect(c.score.score).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('« sans avis » partout : aucun classement, aucune erreur', () => {
    const r = calculerResultats(partie(1, 60, true), melangeur(1));
    expect(r.repondues).toBe(0);
    expect(r.classement).toEqual([]);
    expect(r.horsClassement.every((c) => c.score.score === null)).toBe(true);
  });

  it('sans l\'option, aucun candidat n\'est calculé tant qu\'aucun n\'est « evalue »', () => {
    const e = partie(2, 40);
    const r = calculerResultats({ ...e, options: {} }, melangeur(2));
    const evalues = candidats.filter((c) => c.statutEvaluation === 'evalue').length;
    expect(r.classement.length + r.horsClassement.length).toBe(evalues);
  });
});
