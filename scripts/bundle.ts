/**
 * Produit le paquet de données allégé lu par l'application : app/donnees/paquet.json.
 *
 *   npm run bundle          écrit le fichier
 *   npm run bundle:check    échoue si le fichier committé n'est pas à jour
 *
 * Le paquet ne contient que ce que le quiz et les résultats affichent : questions actives, candidats,
 * positions publiées avec leur premier extrait et leur source, et les fichiers de derive/ nécessaires
 * au tirage. Les justifications des codeurs et les textes anonymisés restent consultables dans le dépôt.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { estAdmiseDansDefi } from '../core/defi/index.ts';
import { etatDePosition } from '../core/score/codee.ts';
import { chargerDataset } from './lib/dataset.ts';
import { validerDataset } from './lib/validate.ts';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const cible = join(racine, 'app', 'donnees', 'paquet.json');
const ciblePages = join(racine, 'app', 'donnees', 'pages.json');

export function construirePaquet() {
  const ds = chargerDataset(racine);
  const rapport = validerDataset(ds);
  if (rapport.erreurs.length > 0) throw new Error('Données invalides : lancer npm run data:validate');

  const lire = (nom: string) => JSON.parse(readFileSync(join(racine, 'derive', nom), 'utf8'));
  const discriminance = lire('discriminance.json');
  const ancrage = lire('ancrage.json');
  if (discriminance.empreinte_donnees !== ds.empreinte || ancrage.empreinte_donnees !== ds.empreinte) {
    throw new Error('derive/ n\'est pas à jour : lancer npm run derive');
  }

  const questions = Object.values(ds.questions)
    .flatMap((f) => f.questions)
    .filter((q) => q.statut === 'active')
    .map((q) => ({
      id: q.id,
      theme: q.theme,
      axe: q.axe,
      sens: q.sens,
      statut: q.statut,
      enonce: q.enonce,
      precision: q.precision ?? null,
    }));

  const candidats = ds.candidats.candidats.map((c) => ({
    id: c.id,
    prenom: c.prenom,
    nom: c.nom,
    parti: c.parti,
    statutEvaluation: c.statut_evaluation,
    ...(c.motif_non_evaluation ? { motifNonEvaluation: c.motif_non_evaluation } : {}),
  }));

  const positions: Record<string, unknown[]> = {};
  for (const [id, f] of Object.entries(ds.positions)) {
    positions[id] = f.positions.map((p) => {
      const etat = etatDePosition(p.statut, p.code);
      const extrait = p.extraits[0];
      return {
        questionId: p.question_id,
        etat,
        code: etat === 'publie' ? p.code : null,
        nature: etat === 'publie' ? p.nature : etat === 'arbitrage_en_attente' ? null : 'non_connu',
        ...(etat === 'publie' && extrait
          ? {
              extrait: {
                reformulation: extrait.reformulation,
                citation: extrait.citation_verifiee_mot_a_mot === false ? null : extrait.citation_courte,
                source: {
                  titre: extrait.source.titre,
                  url: extrait.source.url,
                  datePublication: extrait.source.date_publication ?? null,
                },
              },
            }
          : {}),
      };
    });
  }

  // Défi « Qui a dit ça ? » : seules les positions admises (estAdmiseDansDefi) emportent leur version
  // anonymisée ; les autres positions publiées gardent uniquement ce que tirerDefi lit pour écarter les
  // propositions ambiguës (statut, code, question). Aucune justification de codeur.
  const actives = new Set(questions.map((q) => q.id));
  const defi: Record<string, unknown[]> = {};
  for (const [id, f] of Object.entries(ds.positions)) {
    defi[id] = f.positions
      .filter((p) => (p.statut === 'accord' || p.statut === 'arbitre') && p.code !== null && actives.has(p.question_id))
      .map((p) => {
        const x = p.extraits[0];
        const admise = estAdmiseDansDefi(p, actives) && x;
        return {
          question_id: p.question_id,
          statut: p.statut,
          code: p.code,
          nature: p.nature,
          extraits: admise
            ? [
                {
                  reformulation: x.reformulation,
                  reformulation_anonymisee: x.reformulation_anonymisee,
                  citation_courte: x.citation_courte,
                  citation_anonymisee: x.citation_anonymisee,
                  citation_verifiee_mot_a_mot: x.citation_verifiee_mot_a_mot,
                  source: { titre: x.source.titre, url: x.source.url, date_publication: x.source.date_publication ?? null },
                },
              ]
            : [],
        };
      });
  }

  return {
    empreinte: ds.empreinte,
    questions,
    candidats,
    positions,
    defi,
    discriminance,
    ancrage,
  };
}

/**
 * Contenu des pages d'information (méthode, banque de questions, journal, rapport de neutralité) :
 * fichier séparé, chargé à la demande, pour garder léger ce que le quiz télécharge.
 */
export function construirePages() {
  const ds = chargerDataset(racine);
  const lireTexte = (...chemin: string[]) => readFileSync(join(racine, ...chemin), 'utf8');
  const rapportNeutralite = JSON.parse(lireTexte('derive', 'rapport-neutralite.json'));
  if (rapportNeutralite.empreinte_donnees !== ds.empreinte) throw new Error("derive/ n'est pas à jour : lancer npm run derive");
  const journal = JSON.parse(lireTexte('data', 'journal.json'));
  const horsJeu = Object.values(ds.questions)
    .flatMap((f) => f.questions)
    .filter((q) => q.statut !== 'active')
    .map((q) => ({ id: q.id, theme: q.theme, statut: q.statut, enonce: q.enonce }));
  return {
    empreinte: ds.empreinte,
    docs: {
      methodologie: lireTexte('docs', 'methodologie.md'),
      grille: lireTexte('docs', 'grille-codage.md'),
      critere: lireTexte('docs', 'critere-inclusion.md'),
    },
    journal: journal.entrees,
    horsJeu,
    neutralite: rapportNeutralite,
  };
}

const texte = `${JSON.stringify(construirePaquet())}\n`;
const textePages = `${JSON.stringify(construirePages())}\n`;
if (process.argv.includes('--check')) {
  const verifier = (chemin: string, attendu: string, nom: string): boolean => {
    const actuel = existsSync(chemin) ? readFileSync(chemin, 'utf8') : '';
    if (actuel !== attendu) {
      console.error(`app/donnees/${nom} n'est pas à jour : lancer \`npm run bundle\`.`);
      return false;
    }
    console.log(`app/donnees/${nom} à jour.`);
    return true;
  };
  const ok = [verifier(cible, texte, 'paquet.json'), verifier(ciblePages, textePages, 'pages.json')];
  if (ok.includes(false)) process.exit(1);
} else {
  mkdirSync(dirname(cible), { recursive: true });
  writeFileSync(cible, texte);
  writeFileSync(ciblePages, textePages);
  console.log(`app/donnees/paquet.json écrit (${(texte.length / 1024).toFixed(0)} Ko), pages.json (${(textePages.length / 1024).toFixed(0)} Ko).`);
}
