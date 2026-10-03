/**
 * Défi « Qui a dit ça ? » (spécification, § 5.2, J6).
 *
 * Après la partie, mini-jeu facultatif : une position sourcée s'affiche (version anonymisée), le joueur
 * devine quel candidat la porte, puis la position complète et sa source s'affichent.
 *
 * Garde-fous de neutralité, appliqués ici :
 *  - Positions admises : publiées (statut `accord` ou `arbitre`), avec un code, de nature `nette` ou
 *    `nuancee`, sur une question active, avec au moins un extrait. Jamais `imprecise`, jamais un désaccord
 *    non arbitré, jamais « non connu ».
 *  - Équilibre : chaque candidat de la partie est la bonne réponse le même nombre de fois, à une unité
 *    près. Si le stock d'un candidat ne le permet pas, la partie compte moins de manches (sans erreur).
 *  - Un candidat sans aucune position admise ne peut pas être la bonne réponse : il est écarté de la partie
 *    (ni réponse ni proposition) et listé dans `candidats_absents`, pour que l'interface l'explique.
 *    Il faut au moins deux candidats présents pour jouer.
 *  - Les autres propositions sont choisies parmi les candidats les moins proposés jusque-là (départage par
 *    la graine), en écartant ceux dont la position publiée sur la même question a le même signe : sinon
 *    deux réponses seraient justes.
 *  - Aucun score de « connaissance » par candidat : ce module ne compte rien de tel et n'expose aucune
 *    fonction pour le faire.
 */
import { creerGenerateur, deriverGraine, melanger, verifierGraine, type Generateur } from '../aleatoire/prng.ts';
import type { Positions, Questions } from '../types.generated.ts';

export const NATURES_DEFI = ['nette', 'nuancee'] as const;
export const PROPOSITIONS_PAR_DEFAUT = 4;

export class ErreurDefi extends Error {}

export interface EntreeDefi {
  /** Questions de la banque (seules les actives sont utilisées). */
  readonly questions: readonly Pick<Questions.Question, 'id' | 'enonce' | 'statut'>[];
  /** Positions par identifiant de candidat (data/positions/<candidat>.json, champ `positions`). */
  readonly positions: Readonly<Record<string, readonly Positions.Position[]>>;
  /** Candidats pouvant figurer dans le défi (en pratique : les candidats évalués). */
  readonly candidats: readonly string[];
}

export interface ParametresDefi {
  readonly graine: number;
  /** Nombre de manches demandé. */
  readonly manches: number;
  /** Nombre de candidats proposés par manche, bonne réponse comprise (4 par défaut, 2 au moins). */
  readonly propositions?: number;
}

export interface SourceDefi {
  readonly titre: string;
  readonly url: string;
  readonly date_publication: string | null;
}

export interface Manche {
  readonly numero: number;
  readonly question_id: string;
  /** Énoncé de la question, pour situer la position. */
  readonly enonce: string;
  /** À afficher pendant que le joueur devine : version sans nom du candidat. */
  readonly indice: {
    readonly reformulation: string;
    readonly citation: string | null;
  };
  /** À afficher après la réponse. */
  readonly revelation: {
    readonly reformulation: string;
    readonly citation: string | null;
    /** La citation a été retrouvée mot à mot dans la source (null : pas encore vérifié). */
    readonly citation_verifiee: boolean | null;
    readonly source: SourceDefi;
  };
  /** Identifiants des candidats proposés, dans un ordre tiré au sort. */
  readonly propositions: readonly string[];
  readonly bonne_reponse: string;
}

export interface ResultatDefi {
  readonly graine: number;
  readonly manches: readonly Manche[];
  readonly manches_demandees: number;
  /** Vrai si le stock de positions admises ne permettait pas toutes les manches demandées. */
  readonly stock_insuffisant: boolean;
  /** Candidats de la partie (au moins une position admise), par ordre alphabétique. */
  readonly candidats_presents: readonly string[];
  /** Candidats demandés mais sans aucune position admise (et jouable). */
  readonly candidats_absents: readonly string[];
  /** Nombre de positions admises par candidat présent. */
  readonly stock_par_candidat: Readonly<Record<string, number>>;
}

interface PositionAdmise {
  readonly candidat: string;
  readonly question_id: string;
  readonly code: number;
  readonly extrait: Positions.Extrait;
}

/** Vrai si la position peut être proposée dans le défi. */
export function estAdmiseDansDefi(p: Positions.Position, questionsActives: ReadonlySet<string>): boolean {
  return (
    (p.statut === 'accord' || p.statut === 'arbitre') &&
    p.code !== null &&
    p.nature !== null &&
    (NATURES_DEFI as readonly string[]).includes(p.nature) &&
    questionsActives.has(p.question_id) &&
    p.extraits.length > 0
  );
}

const signe = (x: number) => Math.sign(x);

/** Prend un élément au hasard parmi ceux de plus petite clé. */
function prendreMoinsUtilise<T>(g: Generateur, liste: readonly T[], cle: (x: T) => number): T {
  const min = Math.min(...liste.map(cle));
  const ex = liste.filter((x) => cle(x) === min);
  return ex[g.entier(ex.length)]!;
}

export function tirerDefi(entree: EntreeDefi, parametres: ParametresDefi): ResultatDefi {
  const { graine, manches: demandees } = parametres;
  try {
    verifierGraine(graine);
  } catch (e) {
    throw new ErreurDefi((e as Error).message);
  }
  if (!Number.isInteger(demandees) || demandees < 0) throw new ErreurDefi(`nombre de manches invalide : ${demandees}`);
  const nbPropositions = parametres.propositions ?? PROPOSITIONS_PAR_DEFAUT;
  if (!Number.isInteger(nbPropositions) || nbPropositions < 2) throw new ErreurDefi(`nombre de propositions invalide : ${nbPropositions}`);

  const actives = new Set(entree.questions.filter((q) => q.statut === 'active').map((q) => q.id));
  const enonce = new Map(entree.questions.map((q) => [q.id, q.enonce]));

  // Positions admises, par candidat ; codes publiés (toutes natures) par question, pour écarter les
  // propositions ambiguës.
  const candidatsDemandes = [...new Set(entree.candidats)].sort();
  const admises = new Map<string, PositionAdmise[]>();
  const codesPublies = new Map<string, Map<string, number>>();
  for (const c of candidatsDemandes) {
    const liste: PositionAdmise[] = [];
    for (const p of entree.positions[c] ?? []) {
      if ((p.statut === 'accord' || p.statut === 'arbitre') && p.code !== null && actives.has(p.question_id)) {
        const m = codesPublies.get(p.question_id) ?? new Map<string, number>();
        m.set(c, p.code);
        codesPublies.set(p.question_id, m);
      }
      if (estAdmiseDansDefi(p, actives)) liste.push({ candidat: c, question_id: p.question_id, code: p.code!, extrait: p.extraits[0]! });
    }
    liste.sort((a, b) => (a.question_id < b.question_id ? -1 : 1));
    if (liste.length > 0) admises.set(c, liste);
  }
  // Une position n'est jouable que s'il existe au moins une autre proposition non ambiguë (un autre candidat
  // présent dont la position publiée sur la question est inconnue ou de signe différent). On l'établit avant
  // de compter les stocks, pour que l'équilibre ne puisse pas être rompu en cours de partie.
  const autresPossibles = (p: PositionAdmise, parmi: readonly string[]) =>
    parmi.filter((c) => {
      if (c === p.candidat) return false;
      const code = codesPublies.get(p.question_id)?.get(c);
      return code === undefined || signe(code) !== signe(p.code);
    });
  let presents = candidatsDemandes.filter((c) => admises.has(c));
  for (;;) {
    let change = false;
    for (const c of presents) {
      const jouables = admises.get(c)!.filter((p) => autresPossibles(p, presents).length > 0);
      if (jouables.length !== admises.get(c)!.length) change = true;
      if (jouables.length > 0) admises.set(c, jouables);
      else admises.delete(c);
    }
    const suivants = presents.filter((c) => admises.has(c));
    if (!change && suivants.length === presents.length) break;
    presents = suivants;
  }
  const absents = candidatsDemandes.filter((c) => !presents.includes(c));
  const stock = Object.fromEntries(presents.map((c) => [c, admises.get(c)!.length]));

  // Nombre de manches possible avec un équilibre à une unité près : chaque candidat au plus min + 1 fois,
  // où min est le plus petit stock, et seuls ceux qui ont plus que min peuvent faire ce tour supplémentaire.
  const K = presents.length;
  let possibles = 0;
  if (K >= 2) {
    const min = Math.min(...presents.map((c) => stock[c]!));
    possibles = K * min + presents.filter((c) => stock[c]! > min).length;
  }
  const nbManches = Math.min(demandees, possibles);

  // Bonnes réponses : tours complets (chaque candidat une fois), puis un tour partiel tiré au sort parmi les
  // candidats qui ont encore du stock. L'ordre des manches est ensuite mélangé.
  const g = creerGenerateur(deriverGraine(graine, 'defi'));
  const tours = Math.floor(nbManches / Math.max(K, 1));
  const reponses: string[] = [];
  for (let t = 0; t < tours; t++) reponses.push(...presents);
  const partiel = nbManches - tours * K;
  if (partiel > 0) reponses.push(...melanger(g, presents.filter((c) => stock[c]! > tours)).slice(0, partiel));
  const ordre = melanger(g, reponses);

  // Positions de chaque candidat, mélangées une fois : on les prend dans cet ordre en préférant les
  // questions pas encore utilisées dans la partie.
  const reserves = new Map(presents.map((c) => [c, melanger(g, admises.get(c)!)]));
  const questionsUtilisees = new Map<string, number>();
  const foisPropose = new Map(presents.map((c) => [c, 0]));

  const manches: Manche[] = [];
  for (const candidat of ordre) {
    const reserve = reserves.get(candidat)!;
    const position = prendreMoinsUtilise(g, reserve, (p) => questionsUtilisees.get(p.question_id) ?? 0);
    reserve.splice(reserve.indexOf(position), 1);
    questionsUtilisees.set(position.question_id, (questionsUtilisees.get(position.question_id) ?? 0) + 1);

    const choisis: string[] = [];
    let pool = autresPossibles(position, presents);
    while (choisis.length < nbPropositions - 1 && pool.length > 0) {
      const c = prendreMoinsUtilise(g, pool, (x) => foisPropose.get(x)!);
      choisis.push(c);
      pool = pool.filter((x) => x !== c);
    }
    for (const c of [candidat, ...choisis]) foisPropose.set(c, foisPropose.get(c)! + 1);

    const x = position.extrait;
    manches.push({
      numero: manches.length + 1,
      question_id: position.question_id,
      enonce: enonce.get(position.question_id) ?? '',
      indice: { reformulation: x.reformulation_anonymisee, citation: x.citation_verifiee_mot_a_mot === false ? null : x.citation_anonymisee },
      revelation: {
        reformulation: x.reformulation,
        citation: x.citation_verifiee_mot_a_mot === false ? null : x.citation_courte,
        citation_verifiee: x.citation_verifiee_mot_a_mot,
        source: { titre: x.source.titre, url: x.source.url, date_publication: x.source.date_publication },
      },
      propositions: melanger(g, [candidat, ...choisis]),
      bonne_reponse: candidat,
    });
  }

  return {
    graine,
    manches,
    manches_demandees: demandees,
    stock_insuffisant: manches.length < demandees,
    candidats_presents: presents,
    candidats_absents: absents,
    stock_par_candidat: stock,
  };
}
