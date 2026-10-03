# core/score — calcul du score

Code du calcul cité par la méthodologie (version 1.1, § 6) et la spécification de l'application (§ 8 et § 9).
Fonctions pures : aucune lecture de fichier, aucun appel réseau, aucun tirage interne. Tout résultat peut être recalculé à la main.

## Où lire quoi

| Fichier | Ce qu'il contient | Méthodologie |
|---|---|---|
| `parametres.ts` | tous les nombres fixés par la méthode (× 2, × 0,5, seuils 10 et 50 %, fiabilité 15 et 30…) | § 6, D2, D3, D5, D9 |
| `codee.ts` | ce qu'est une question « répondue » et une question « codée » (le code 0 est un code) | § 5, D8, D9 |
| `formule.ts` | points, poids, score brut, coefficient `c`, score affiché, arrondi, fiabilité | § 6.1, 6.2, 6.4 |
| `classement.ts` | seuils de classement, motif chiffré, rangs et ex aequo | § 6.3 |
| `detail.ts` | détail par thème, accords et désaccords les plus forts | spécification § 8 |
| `candidats.ts` | candidats évalués et non évalués, avec leur motif | spécification § 4 |
| `affinites.ts` | rang des candidats cochés à la préparation (n'entre dans aucun score) | § 6.5 |
| `resultats.ts` | assemblage de la page de résultats | spécification § 9 |
| `types.ts` | forme des entrées et des sorties | |

Le hasard (ordre entre ex aequo, ordre des hors classement) est fourni par l'appelant, tiré de la graine de la partie : il ne change jamais un score ni un rang.

## Tests

Un fichier `*.test.ts` à côté de chaque module : cas T1 à T6 de la spécification, seuils, bornes,
tests de propriétés (fast-check) et calcul sur les données réelles du dépôt. `npm test`.
