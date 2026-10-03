/**
 * Étape 1 du tirage : ancres (spécification, § 7.2 ; méthodologie § 7.2 et D11).
 *
 *  - Point de départ : les ancres prévues pour le mode (derive/ancrage.json : dix ancres en Débat et
 *    Campagne, cinq en Express). La liste peut être plus courte si le codage est partiel (§ 7.5).
 *  - Une ancre est conservée si son thème a un poids non nul et si le quota de ce thème n'est pas atteint
 *    (les ancres comptent dans le quota, étape 2).
 *  - Chaque ancre écartée est remplacée par la question suivante du classement d'ancrage qui respecte les
 *    contraintes de la méthodologie : thème de poids non nul, une ancre par thème au plus, trois par axe au
 *    plus, et le minimum d'ancres de chaque sens (quatre, ou deux en mode Express) encore atteignable.
 *  - Si les thèmes restants ne permettent plus « une ancre par thème », cette contrainte est levée (second
 *    passage sur le classement), sans jamais dépasser le quota du thème.
 *  - Une place qu'aucune question éligible ne peut occuper reste libre : elle revient au tirage ordinaire.
 *
 * Aucun hasard ici : les ancres ne dépendent que des poids et des quotas.
 */
import type { QuestionTirable } from './banque.ts';
import { ANCRES_MIN_PAR_SENS_MODE, ANCRES_MODE, ANCRES_PAR_AXE_MAX, ANCRES_PAR_THEME_MAX, type JournalAncres, type MotifEcartAncre, type Mode } from './types.ts';

export interface EntreeAncres {
  readonly mode: Mode;
  readonly prevues: readonly string[];
  readonly classement: readonly string[];
  readonly questionParId: ReadonlyMap<string, QuestionTirable>;
  readonly poids: ReadonlyMap<string, number>;
  readonly quotas: ReadonlyMap<string, number>;
}

export interface ResultatAncres {
  /** Ancres retenues, avec leur motif. */
  readonly ancres: readonly { readonly id: string; readonly remplacement: boolean }[];
  readonly journal: JournalAncres;
}

export function choisirAncres(e: EntreeAncres): ResultatAncres {
  const nominal = ANCRES_MODE[e.mode];
  const minParSens = ANCRES_MIN_PAR_SENS_MODE[e.mode];
  const parTheme = new Map<string, number>();
  const parAxe = new Map<string, number>();
  const sens = { plus: 0, moins: 0 };
  /** Écart de sens (plus − moins) des ancres de chaque thème. */
  const ecartTheme = new Map<string, number>();
  const retenues: { id: string; remplacement: boolean }[] = [];
  const ecartees: { question_id: string; motif: MotifEcartAncre }[] = [];
  const pris = new Set<string>();

  const poser = (q: QuestionTirable, remplacement: boolean) => {
    retenues.push({ id: q.id, remplacement });
    pris.add(q.id);
    parTheme.set(q.theme, (parTheme.get(q.theme) ?? 0) + 1);
    parAxe.set(q.axe, (parAxe.get(q.axe) ?? 0) + 1);
    if (q.sens === 1) sens.plus++;
    else sens.moins++;
    ecartTheme.set(q.theme, (ecartTheme.get(q.theme) ?? 0) + q.sens);
  };
  const sousQuota = (q: QuestionTirable) => (parTheme.get(q.theme) ?? 0) < (e.quotas.get(q.theme) ?? 0);
  /** Après ajout de q, l'écart des ancres du thème peut-il encore être ramené à 1 par les places restantes ? */
  const equilibreThemePossible = (q: QuestionTirable) => {
    const ecart = Math.abs((ecartTheme.get(q.theme) ?? 0) + q.sens);
    const placesRestantes = (e.quotas.get(q.theme) ?? 0) - ((parTheme.get(q.theme) ?? 0) + 1);
    return ecart <= placesRestantes + 1;
  };

  // 1. Ancres prévues : conservées si leur thème est tiré et que son quota le permet.
  for (const id of e.prevues) {
    const q = e.questionParId.get(id)!;
    if ((e.poids.get(q.theme) ?? 0) === 0) ecartees.push({ question_id: id, motif: 'theme_a_zero' });
    else if (!sousQuota(q)) ecartees.push({ question_id: id, motif: 'quota_du_theme_atteint' });
    else poser(q, false);
  }

  // 2. Remplacements, dans l'ordre du classement d'ancrage.
  const cible = e.prevues.length;
  const remplacements: string[] = [];
  let contrainteLevee = false;
  const passage = (unParTheme: boolean) => {
    for (const id of e.classement) {
      if (retenues.length >= cible) return;
      if (pris.has(id)) continue;
      const q = e.questionParId.get(id)!;
      if ((e.poids.get(q.theme) ?? 0) === 0) continue;
      if (!sousQuota(q)) continue;
      if (unParTheme && (parTheme.get(q.theme) ?? 0) >= ANCRES_PAR_THEME_MAX) continue;
      if ((parAxe.get(q.axe) ?? 0) >= ANCRES_PAR_AXE_MAX) continue;
      // Le minimum de chaque sens doit rester atteignable avec les places restantes de la liste nominale
      // (même règle que la constitution de la liste d'ancrage, scripts/lib/derive.ts, `selectionner`).
      const plus = sens.plus + (q.sens === 1 ? 1 : 0);
      const moins = sens.moins + (q.sens === -1 ? 1 : 0);
      const besoin = Math.max(0, minParSens - plus) + Math.max(0, minParSens - moins);
      if (nominal - (retenues.length + 1) < besoin) continue;
      // Contrainte levée : une seconde ancre dans un thème ne doit pas rendre impossible l'équilibre des
      // sens de ce thème (§ 7.3 : écart d'une question au plus) avec les places qui restent dans son quota.
      if (!unParTheme && !equilibreThemePossible(q)) continue;
      if ((parTheme.get(q.theme) ?? 0) >= ANCRES_PAR_THEME_MAX) contrainteLevee = true;
      poser(q, true);
      remplacements.push(id);
    }
  };
  if (retenues.length < cible) passage(true);
  if (retenues.length < cible) passage(false);

  return {
    ancres: retenues,
    journal: {
      prevues: [...e.prevues],
      ecartees,
      remplacements,
      retenues: retenues.map((r) => r.id),
      contrainte_un_par_theme_levee: contrainteLevee,
      places_non_pourvues: cible - retenues.length,
    },
  };
}
