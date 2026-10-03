# core/

Fonctions pures du comparateur (aucune dépendance à l'interface, au DOM ou au réseau).

| Dossier | Lot | Contenu |
|---|---|---|
| `core/score/` | 5c | calcul du score, fiabilité, détails, accords et désaccords |
| `core/aleatoire/` | 5d | générateur pseudo-aléatoire à graine (sfc32), mélange, tirage pondéré |
| `core/tirage/` | 5d | tirage stratifié |
| `core/defi/` | 5d | défi « Qui a dit ça ? » |
| `core/neutralite/` | 5d | rapport de neutralité du tirage |

`types.generated.ts` est généré depuis `schemas/` (`npm run types:generate`) : ne pas l'éditer.
Les tests (`*.test.ts`) sont à côté du code.
