/**
 * Carte de résultat à partager (spécification J7) : image dessinée sur le téléphone, dans un canvas.
 * Rien n'est envoyé au serveur ; la fiabilité figure toujours ; une seule couleur neutre, aucune couleur de parti.
 *
 * Couleurs : la carte reste toujours dans le thème sombre, quel que soit le thème de l'écran. Elle est vue par
 * d'autres personnes que l'expéditeur, hors de l'application : une seule apparence, identique pour tous, évite que
 * deux cartes d'un même résultat diffèrent selon le réglage du téléphone, et garde l'identité visuelle de référence
 * (spécification § 5.1). Le fond sombre plein se lit aussi bien sur une messagerie en mode clair qu'en mode sombre.
 */
import type { Classe } from '../core/score/index.ts';
import { FIABILITE, MODES } from './libelles.ts';
import type { ModeJeu } from './jeu.ts';

export const LARGEUR_CARTE = 1080;
export const HAUTEUR_CARTE = 1350;
const ADRESSE = 'mon-isoloir.up.railway.app';

export interface DonneesCarte {
  mode: ModeJeu;
  graine: number;
  /** Les trois premiers du classement au plus, avec leur nom complet. */
  podium: { rang: number; exAequo: boolean; nom: string; score: number; fiabilite: string }[];
}

export function donneesCarte(mode: ModeJeu, graine: number, classement: readonly Classe[], nom: (id: string) => string): DonneesCarte {
  return {
    mode,
    graine,
    podium: classement.slice(0, 3).map((c) => ({
      rang: c.rang,
      exAequo: c.exAequo,
      nom: nom(c.candidatId),
      score: c.score.scoreArrondi ?? 0,
      fiabilite: FIABILITE[c.fiabilite] ?? c.fiabilite,
    })),
  };
}

function lignes(ctx: CanvasRenderingContext2D, texte: string, largeur: number): string[] {
  const mots = texte.split(' ');
  const sortie: string[] = [];
  let courante = '';
  for (const m of mots) {
    const essai = courante ? `${courante} ${m}` : m;
    if (ctx.measureText(essai).width > largeur && courante) {
      sortie.push(courante);
      courante = m;
    } else courante = essai;
  }
  if (courante) sortie.push(courante);
  return sortie;
}

export function dessinerCarte(canvas: HTMLCanvasElement, d: DonneesCarte): void {
  canvas.width = LARGEUR_CARTE;
  canvas.height = HAUTEUR_CARTE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const serif = "'Source Serif 4 Variable', Georgia, serif";
  const sans = "'Source Sans 3 Variable', system-ui, sans-serif";
  ctx.fillStyle = '#0e1a33';
  ctx.fillRect(0, 0, LARGEUR_CARTE, HAUTEUR_CARTE);
  ctx.fillStyle = '#e2b85c';
  ctx.fillRect(0, 0, 18, HAUTEUR_CARTE);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e2b85c';
  ctx.font = `600 34px ${sans}`;
  ctx.fillText('PRÉSIDENTIELLE 2027', 80, 120);
  ctx.fillStyle = '#f4ecd8';
  ctx.font = `600 96px ${serif}`;
  ctx.fillText('Mon Isoloir', 80, 230);
  ctx.fillStyle = '#aab4c8';
  ctx.font = `400 38px ${sans}`;
  ctx.fillText(`Mode ${MODES[d.mode].nom} · ${MODES[d.mode].questions} questions`, 80, 295);

  let y = 400;
  for (const l of d.podium) {
    ctx.fillStyle = '#17284a';
    ctx.fillRect(80, y - 70, LARGEUR_CARTE - 160, 170);
    ctx.fillStyle = '#e2b85c';
    ctx.font = `600 80px ${serif}`;
    ctx.fillText(String(l.rang), 115, y + 35);
    ctx.fillStyle = '#f4ecd8';
    ctx.font = `600 50px ${serif}`;
    ctx.fillText(l.nom, 200, y + 15);
    ctx.fillStyle = '#aab4c8';
    ctx.font = `400 34px ${sans}`;
    ctx.fillText(`${l.exAequo ? 'ex aequo · ' : ''}fiabilité ${l.fiabilite.toLowerCase()}`, 200, y + 65);
    ctx.fillStyle = '#e2b85c';
    ctx.font = `600 70px ${serif}`;
    ctx.textAlign = 'right';
    ctx.fillText(String(d.podium.length ? l.score : ''), LARGEUR_CARTE - 115, y + 35);
    ctx.textAlign = 'left';
    y += 210;
  }

  ctx.fillStyle = '#aab4c8';
  ctx.font = `400 32px ${sans}`;
  const pied = 'Comparateur indépendant, méthode publique. Un score est un rapprochement avec des positions publiques sourcées, pas une consigne de vote. Les candidats peu codés ne sont pas classés.';
  let yy = 1090;
  for (const l of lignes(ctx, pied, LARGEUR_CARTE - 160)) {
    ctx.fillText(l, 80, yy);
    yy += 44;
  }
  ctx.fillStyle = '#f4ecd8';
  ctx.font = `600 40px ${sans}`;
  ctx.fillText(ADRESSE, 80, 1290);
}

/** Partage par la fonction native si elle accepte les fichiers, sinon téléchargement. Renvoie ce qui a été fait. */
export async function partagerCarte(canvas: HTMLCanvasElement): Promise<'partage' | 'telecharge' | 'echec'> {
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
  if (!blob) return 'echec';
  const fichier = new File([blob], 'mon-isoloir.png', { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [fichier] })) {
      await navigator.share({ files: [fichier], title: 'Mon Isoloir' });
      return 'partage';
    }
  } catch {
    /* partage annulé ou refusé : on propose le téléchargement */
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mon-isoloir.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'telecharge';
}
