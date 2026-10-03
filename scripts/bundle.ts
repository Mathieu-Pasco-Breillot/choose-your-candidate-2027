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
import { etatDePosition } from '../core/score/codee.ts';
import { chargerDataset } from './lib/dataset.ts';
import { validerDataset } from './lib/validate.ts';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const cible = join(racine, 'app', 'donnees', 'paquet.json');

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

  return {
    empreinte: ds.empreinte,
    questions,
    candidats,
    positions,
    discriminance,
    ancrage,
  };
}

const texte = `${JSON.stringify(construirePaquet())}\n`;
if (process.argv.includes('--check')) {
  const actuel = existsSync(cible) ? readFileSync(cible, 'utf8') : '';
  if (actuel !== texte) {
    console.error('app/donnees/paquet.json n\'est pas à jour : lancer `npm run bundle`.');
    process.exit(1);
  }
  console.log('app/donnees/paquet.json à jour.');
} else {
  mkdirSync(dirname(cible), { recursive: true });
  writeFileSync(cible, texte);
  console.log(`app/donnees/paquet.json écrit (${(texte.length / 1024).toFixed(0)} Ko).`);
}
