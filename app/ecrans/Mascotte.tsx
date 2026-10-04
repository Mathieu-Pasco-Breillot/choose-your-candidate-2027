import { motion } from 'motion/react';

/**
 * La mascotte (spécification J3) : une urne, dessin original, non humain. Elle accompagne l'accueil, les fins de
 * chapitre et les écrans vides. Elle ne réagit qu'à la progression : jamais à une réponse ni à un candidat.
 * Couleurs par classes du thème (elle suit le thème clair et le thème sombre) ; décorative pour les lecteurs d'écran.
 * Animations coupées si le téléphone demande des animations réduites (MotionConfig dans App.tsx).
 *
 * Attitudes :
 * - « accueil » : l'enveloppe flotte au-dessus de la fente ;
 * - « chapitre » : l'enveloppe tombe dans l'urne, qui fait un petit bond (un chapitre est bouclé) ;
 * - « attente » : écran vide ou chargement ; l'enveloppe attend, l'urne cligne des yeux.
 */
export type Attitude = 'accueil' | 'chapitre' | 'attente';

export function Mascotte({ attitude = 'accueil', taille = 96, className = '' }: { attitude?: Attitude; taille?: number; className?: string }) {
  const tombe = attitude === 'chapitre';
  return (
    <svg
      viewBox="0 0 120 120"
      width={taille}
      height={taille}
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 overflow-visible ${className}`}
      data-mascotte={attitude}
    >
      {/* ombre */}
      <ellipse cx="60" cy="112" rx="34" ry="5" className="fill-sourdine/25" />
      <motion.g
        initial={false}
        animate={tombe ? { y: [0, 0, -7, 0] } : { y: 0 }}
        transition={tombe ? { duration: 0.9, times: [0, 0.55, 0.75, 1] } : { duration: 0 }}
      >
        {/* enveloppe (le bulletin), derrière le couvercle pour « entrer » dans la fente */}
        <motion.g
          initial={false}
          animate={tombe ? { y: [-6, 26], opacity: [1, 1, 0] } : attitude === 'accueil' ? { y: [0, -4, 0] } : { y: 0 }}
          transition={
            tombe
              ? { duration: 0.6, ease: 'easeIn', opacity: { duration: 0.6, times: [0, 0.8, 1] } }
              : attitude === 'accueil'
                ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0 }
          }
        >
          <rect x="45" y="12" width="30" height="21" rx="2.5" className="fill-papier stroke-or" strokeWidth="2.5" />
          <path d="M46.5 14 L60 24.5 L73.5 14" fill="none" className="stroke-or" strokeWidth="2.5" strokeLinejoin="round" />
        </motion.g>
        {/* pieds */}
        <rect x="30" y="100" width="14" height="8" rx="3" className="fill-or" />
        <rect x="76" y="100" width="14" height="8" rx="3" className="fill-or" />
        {/* corps */}
        <rect x="20" y="44" width="80" height="60" rx="11" className="fill-nuit-clair stroke-or" strokeWidth="3.5" />
        {/* couvercle et fente */}
        <rect x="13" y="34" width="94" height="14" rx="6" className="fill-or" />
        <rect x="42" y="38.5" width="36" height="5" rx="2.5" className="fill-nuit" />
        {/* reflet de la paroi transparente */}
        <path d="M30 56 L30 90" className="stroke-creme/25" strokeWidth="4" strokeLinecap="round" />
        {/* yeux : un clignement lent en attente */}
        <motion.g
          initial={false}
          style={{ originY: '72px' }}
          animate={attitude === 'attente' ? { scaleY: [1, 1, 0.1, 1] } : { scaleY: 1 }}
          transition={attitude === 'attente' ? { duration: 3.2, repeat: Infinity, times: [0, 0.9, 0.95, 1] } : { duration: 0 }}
        >
          <ellipse cx="48" cy="72" rx="4.5" ry="5.5" className="fill-creme" />
          <ellipse cx="72" cy="72" rx="4.5" ry="5.5" className="fill-creme" />
          <circle cx="49.5" cy="70" r="1.5" className="fill-nuit-clair" />
          <circle cx="73.5" cy="70" r="1.5" className="fill-nuit-clair" />
        </motion.g>
        {/* bouche : petit sourire, un peu plus grand à la fin d'un chapitre */}
        <path
          d={tombe ? 'M50 86 Q60 95 70 86' : 'M52 87 Q60 92 68 87'}
          fill="none"
          className="stroke-creme"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </motion.g>
    </svg>
  );
}
