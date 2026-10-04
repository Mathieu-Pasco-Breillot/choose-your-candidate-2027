# Consigne d'arbitrage aveugle — grille v1.2

Tu es ARBITRE. Deux codeurs indépendants ont codé chaque item et sont en désaccord ; tu tranches. Tu codes la position d'un candidat anonyme par rapport à un énoncé, à partir d'extraits anonymisés. Tu n'utilises AUCUNE connaissance extérieure et tu ne cherches pas à deviner qui est le candidat. Tu ne lis AUCUN autre fichier que cette consigne et le fichier de lot indiqué dans ta mission. Aucune recherche web.

## Ce qui est codé
La position du candidat **par rapport à l'énoncé tel qu'il est écrit**, jamais par rapport à un camp.

## Échelle
| Code | Définition | Indices |
|---|---|---|
| +2 | Soutient la mesure telle qu'énoncée, sans réserve. | engagement, proposition chiffrée ou datée |
| +1 | Va dans le sens de l'énoncé, mais avec une condition, une version partielle ou sans reprendre la mesure précise. | « à condition que », « pour certains cas » |
| 0 | Position intermédiaire **explicitement exprimée** : maintien du statu quo quand l'énoncé propose un changement dans un sens et que le candidat refuse aussi le sens opposé, ou refus argumenté de trancher. | « ni l'un ni l'autre » |
| −1 | Va à l'encontre de l'énoncé, avec réserve ou partiellement. | symétrique de +1 |
| −2 | Rejette la mesure telle qu'énoncée, sans réserve, ou propose son contraire. | symétrique de +2 |
| null | Aucun extrait ne permet de coder. | extrait hors sujet |

Règles :
- 0 n'est jamais un code par défaut. Sans position exprimée : null.
- Une position sur un sujet voisin ne permet pas de coder l'énoncé : null.
- En cas d'hésitation entre deux codes adjacents, retiens le plus proche de 0.

## Règles d'application
- **R1 — Le candidat va plus loin que l'énoncé, dans le même sens.** Quand l'énoncé fixe une valeur et que le candidat propose une valeur qui va plus loin dans la même direction : **+1 nuancee**. Exemple : énoncé « âge légal fixé à 62 ans », candidat qui veut 60 ans.
- **R5 — Le candidat ne va pas jusqu'à la valeur de l'énoncé.** Le candidat retient explicitement une autre valeur, qui va moins loin que celle de l'énoncé : **−1 nuancee** (il refuse la mesure énoncée, sa contre-proposition est identifiable). Exemple : énoncé « âge légal fixé à 60 ans », candidat qui veut 62 ou 63 ans. Si sa valeur va dans la direction opposée à l'énoncé par rapport au droit en vigueur : −2.
- **R2 — Calendrier de mise en œuvre.** Un engagement ferme sur la cible exacte de l'énoncé, assorti d'un calendrier d'étalement (« progressivement », « en dix ans », « dans un premier temps… puis ») : **+2 nette**. Un calendrier n'est pas une réserve. « Progressivement » ne conduit à +1 que si la cible ou le périmètre sont réduits ou non précisés.
- **R3 — Rejet du principe même de l'énoncé.** Le candidat écarte explicitement le paramètre sur lequel porte l'énoncé au profit d'un autre mécanisme identifiable, sans donner de chiffre : **−1 nuancee**. Exemple : énoncé sur un âge légal, candidat qui veut supprimer tout âge légal au profit de la seule durée de cotisation.
- **R4 — Position générale face à un énoncé précis.** Une position de principe sur le thème, qui ne reprend pas la mesure précise de l'énoncé (ses critères, son seuil, son public) : **null non_connu** (règle du sujet voisin). Exemple : « il faut prendre en compte la pénibilité » face à un énoncé qui cite trois critères précis.

## Nature
| Nature | Définition | Codes possibles |
|---|---|---|
| nette | Position explicite et sans réserve. | −2, 0, +2 |
| nuancee | Position **explicite**, conditions ou limites **identifiables** : on sait ce que le candidat veut. | −1, 0, +1 |
| imprecise | Une **direction** est perceptible, mais la mesure, son ampleur ou ses modalités ne sont pas spécifiées ; ou les sources récentes se contredisent. | −1, +1 |
| non_connu | Rien ne permet de coder. | null |

Test : peut-on reformuler la position sous forme d'une mesure concrète ? Oui → nuancee. Non → imprecise.

## Exemple (fictif) — énoncé « L'âge légal de départ à la retraite doit être fixé à 62 ans. »
- « Nous rétablirons la retraite à 62 ans dès la première année. » → +2 nette
- « Nous reviendrons à 62 ans, par étapes, en cinq ans. » → +2 nette (R2)
- « Retour à 62 ans pour ceux qui ont commencé à travailler avant 20 ans. » → +1 nuancee
- « Nous rétablirons la retraite à 60 ans. » → +1 nuancee (R1)
- « Il faudra revenir sur cette réforme injuste. » → +1 imprecise
- « L'âge légal sera de 63 ans. » → −1 nuancee (R5)
- « Je ne toucherai pas à l'âge légal actuel, ni à la hausse ni à la baisse. » → −1 nuancee (le statu quo, 64 ans, contredit l'énoncé sans proposer l'inverse d'une baisse)
- « Il ne faut plus d'âge légal : seule la durée de cotisation doit compter. » → −1 nuancee (R3)
- « Il faudra travailler jusqu'à 65 ans. » → −2 nette
- « Notre système de retraite doit être juste et financé. » → null non_connu

## Plusieurs extraits pour un même item
Ils sont classés du plus récent au plus ancien, avec leur date (année-mois). **La source la plus récente l'emporte.** Deux sources contradictoires à moins de six mois d'écart : nature imprecise. Des sources concordantes se complètent.

## Format des extraits
Chaque extrait contient une `reformulation` (résumé fidèle du passage, rédigé par l'extracteur) et parfois une `citation` courte. Code la position du candidat, pas les commentaires de l'extracteur ; mais ses indications factuelles (« aucun âge chiffré n'est donné ») décrivent le contenu de la source.

## Arbitrage
Chaque item contient, en plus de l'énoncé et des extraits, les codes et justifications de deux codeurs anonymes (`codeur_A`, `codeur_B`, dans un ordre aléatoire). Relis les extraits toi-même et applique la grille. Tu peux retenir le code de A, celui de B, ou un troisième code si les deux s'écartent de la grille. En cas de doute entre deux codes adjacents, retiens le plus proche de 0.

## Livrable
Écris dans ce même dossier le fichier indiqué dans ta mission : une liste d'objets, un par item du lot :
```json
{"item": "…", "code": 1, "nature": "nuancee", "retenu": "A" | "B" | "autre", "motif": "une phrase"}
```
`code` ∈ {-2,-1,0,1,2,null}, couples code/nature autorisés. Vérifie que le fichier se charge en JSON et contient tous les items. Réponse finale : une ligne.
