/**
 * Paramètres fixés par la méthodologie (version 1.1). Les modifier change la méthode publiée.
 */

/** § 6.1 et D2 : importance d'une question marquée « très important » (1 sinon). */
export const IMPORTANCE_TRES_IMPORTANT = 2;

/** § 6.1 et D3 : précision d'une position `imprecise` (1 pour `nette` et `nuancee`). */
export const PRECISION_IMPRECISE = 0.5;

/** § 6.1 : poids de thème admis. */
export const POIDS_THEME_MIN = 1;
export const POIDS_THEME_MAX = 3;

/** § 6.1 : nombre maximal de points par question. */
export const POINTS_MAX = 4;

/** § 6.2 : point de ramenage, le même pour tous les candidats. */
export const POINT_DE_RAMENAGE = 50;

/** § 6.3 et D5 : seuils de classement (une position `imprecise` compte pour une question codée, D9). */
export const SEUIL_CLASSEMENT_QUESTIONS = 10;
export const SEUIL_CLASSEMENT_PART = 0.5;

/** § 6.4 : fiabilité d'après les questions répondues et codées. */
export const FIABILITE_MOYENNE_A_PARTIR_DE = 15;
export const FIABILITE_BONNE_A_PARTIR_DE = 30;

/** Spécification § 8 : détail par thème affiché à partir de 3 questions répondues et codées. */
export const DETAIL_THEME_MIN_QUESTIONS = 3;

/** Spécification § 8 : accords et désaccords forts. */
export const POINTS_ACCORD_FORT = 4;
export const POINTS_DESACCORD_FORT_MAX = 1;
export const ACCORDS_MAX = 5;
