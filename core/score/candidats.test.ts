import { describe, expect, it } from 'vitest';
import { separerCandidats } from './candidats.ts';
import { melangeur, sansMelange } from './outils-tests.ts';
import type { Candidat, Melanger } from './types.ts';

const candidats: Candidat[] = [
  { id: 'e2', statutEvaluation: 'evalue' },
  { id: 'e1', statutEvaluation: 'evalue' },
  { id: 'att', statutEvaluation: 'codage_en_attente' },
  { id: 'pres2', statutEvaluation: 'non_evalue', motifNonEvaluation: 'pressenti' },
  { id: 'pres1', statutEvaluation: 'non_evalue', motifNonEvaluation: 'pressenti' },
  { id: 'prim', statutEvaluation: 'non_evalue', motifNonEvaluation: 'primaire_en_cours' },
  { id: 'sourc', statutEvaluation: 'non_evalue', motifNonEvaluation: 'declaration_non_sourcee' },
  { id: 'liste', statutEvaluation: 'non_evalue', motifNonEvaluation: 'absent_liste_officielle' },
  { id: 'rien', statutEvaluation: 'non_evalue' },
];

describe('séparation évalués / non évalués (spécification § 4 et § 9)', () => {
  it('seuls les « evalue » sont calculés par défaut ; les autres sont listés avec leur motif, regroupés', () => {
    const r = separerCandidats(candidats, sansMelange);
    expect(r.aCalculer).toEqual(['e1', 'e2']);
    expect(r.nonEvalues).toEqual([
      { candidatId: 'prim', motif: 'primaire_en_cours' },
      { candidatId: 'pres1', motif: 'pressenti' },
      { candidatId: 'pres2', motif: 'pressenti' },
      { candidatId: 'sourc', motif: 'declaration_non_sourcee' },
      { candidatId: 'liste', motif: 'absent_liste_officielle' },
      { candidatId: 'att', motif: 'codage_en_attente' },
      { candidatId: 'rien', motif: 'motif_non_renseigne' },
    ]);
  });

  it('option : les candidats en codage en attente peuvent être calculés', () => {
    const r = separerCandidats(candidats, sansMelange, { inclureCodageEnAttente: true });
    expect(r.aCalculer).toEqual(['att', 'e1', 'e2']);
    expect(r.nonEvalues.some((n) => n.motif === 'codage_en_attente')).toBe(false);
  });

  it('l\'ordre à l\'intérieur d\'un motif vient du mélange, pas de l\'ordre des données', () => {
    const inverse: Melanger = <T>(l: readonly T[]) => [...l].reverse();
    const pres = separerCandidats(candidats, inverse).nonEvalues.filter((n) => n.motif === 'pressenti');
    expect(pres.map((n) => n.candidatId)).toEqual(['pres2', 'pres1']);
    const a = separerCandidats(candidats, melangeur(7)).nonEvalues;
    const b = separerCandidats([...candidats].reverse(), melangeur(7)).nonEvalues;
    expect(a).toEqual(b);
  });

  it('liste vide : aucune erreur', () => {
    expect(separerCandidats([], sansMelange)).toEqual({ aCalculer: [], nonEvalues: [] });
  });
});
