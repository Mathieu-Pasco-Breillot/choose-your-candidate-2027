# Grille de codage — version 1.3

Statut : **VALIDÉ le 3 octobre 2026** (v1 validée le 2 octobre 2026). Cette grille est publiée avant tout codage. Toute modification ultérieure incrémente la version et entraîne un recodage des codes concernés, consigné au journal.

## Modifications de la version 1.1

Issues du pilote retraites (phase 4), validées par Mathieu le 3 octobre 2026 :

- § 2 : quatre règles d'application ajoutées (R1 à R4).
- § 5 : format des extraits (reformulation fidèle et citation courte au lieu d'une citation de 300 caractères).
- § 8 : limite ajoutée sur la reformulation.
- Les 70 codes du pilote retraites, produits en v1, sont recodés en v1.1.

## Modifications de la version 1.2

- § 2 : règle R5 ajoutée (valeur qui ne va pas jusqu'à celle de l'énoncé), validée par Mathieu le 3 octobre 2026. Les codes concernés du pilote retraites ont été fixés par arbitrage selon cette règle.

## Modifications de la version 1.3

- § 2 : règle R6 ajoutée (proposition englobante), **proposée par l'assistant le 4 octobre 2026 et appliquée à titre provisoire, à valider par Mathieu**. Elle tranche une incohérence relevée entre les deux lots d'arbitrage de la vague 1 (bilan de la phase 4, § 3).
- § 6 : étape de vérification indépendante contre la page source ajoutée (point 7).

## 1. Ce qui est codé

On code la position d'un candidat **par rapport à l'énoncé tel qu'il est écrit**, jamais par rapport à un axe ou à un camp. Si l'énoncé est formulé à rebours (« Il ne faut pas… »), le code reste relatif à l'énoncé.

Le codeur ne dispose que de trois choses : l'énoncé, sa précision éventuelle, et le ou les extraits anonymisés. Il n'utilise aucune connaissance extérieure.

## 2. Échelle

| Code | Définition | Indices typiques |
|---|---|---|
| **+2** | Soutient la mesure telle qu'énoncée, sans réserve. | engagement, proposition chiffrée ou datée, « je ferai » |
| **+1** | Va dans le sens de l'énoncé, mais avec une condition, une version partielle ou sans reprendre la mesure précise. | « à condition que », « pour certains cas » |
| **0** | Position intermédiaire **explicitement exprimée** : maintien du statu quo quand l'énoncé propose un changement dans un sens et que le candidat refuse aussi le sens opposé, ou refus argumenté de trancher. | « ni l'un ni l'autre », « je ne toucherai pas à » |
| **−1** | Va à l'encontre de l'énoncé, avec réserve ou partiellement. | symétrique de +1 |
| **−2** | Rejette la mesure telle qu'énoncée, sans réserve, ou propose son contraire. | symétrique de +2 |
| **non connu** (`null`) | Aucun extrait ne permet de coder. | absence de source, extrait hors sujet |

Règles :
- **0 n'est jamais un code par défaut.** Sans position exprimée, le code est « non connu ».
- Une position sur un sujet voisin ne permet pas de coder l'énoncé : « non connu ».
- En cas d'hésitation entre deux codes adjacents, on retient le plus proche de 0.

Règles d'application (v1.1) :

- **R1 — Le candidat va plus loin que l'énoncé, dans le même sens.** Quand l'énoncé fixe une valeur et que le candidat propose une valeur qui va plus loin dans la même direction, le code est **+1 `nuancee`**. Exemple : énoncé « âge légal fixé à 62 ans », candidat qui veut 60 ans. L'écart est capté par la question qui porte sur l'autre valeur.
- **R5 — Le candidat ne va pas jusqu'à la valeur de l'énoncé (v1.2).** Quand le candidat retient explicitement une autre valeur, qui va moins loin que celle de l'énoncé, le code est **−1 `nuancee`** : il refuse la mesure énoncée et sa contre-proposition est identifiable. Exemple : énoncé « âge légal fixé à 60 ans », candidat qui veut 62 ou 63 ans. Celui qui veut aller plus loin accepterait l'énoncé comme étape (R1, +1) ; celui qui veut aller moins loin le refuse. Si sa valeur va dans la direction opposée à l'énoncé par rapport au droit en vigueur, le code est −2.
- **R2 — Calendrier de mise en œuvre.** Un engagement ferme sur la cible exacte de l'énoncé, assorti d'un calendrier d'étalement (« progressivement », « en dix ans », « dans un premier temps… puis »), est **+2 `nette`** : un calendrier n'est pas une réserve. « Progressivement » ne conduit à +1 que si la cible ou le périmètre sont réduits ou non précisés.
- **R3 — Rejet du principe même de l'énoncé.** Quand le candidat écarte explicitement le paramètre sur lequel porte l'énoncé au profit d'un autre mécanisme identifiable, sans donner de chiffre, le code est **−1 `nuancee`** : on sait ce qu'il veut. Exemple : énoncé sur un âge légal, candidat qui veut supprimer tout âge légal au profit de la seule durée de cotisation.
- **R6 — Proposition englobante (v1.3, provisoire).** Quand la mesure du candidat **contient entièrement** celle de l'énoncé, dans le même sens, par un **périmètre** plus large et non par une valeur sur une échelle, le code est **+2 `nette`** : appliquer sa mesure, c'est appliquer l'énoncé en entier. Exemple : énoncé « supprimer les aides aux nouvelles installations », candidat « supprimer toutes les aides ». Symétriquement, une suppression ou une interdiction plus large qui couvre entièrement l'objet d'un énoncé proposant de l'autoriser ou de le développer est **−2 `nette`**. R6 ne s'applique pas si la mesure du candidat ne couvre qu'une partie de l'énoncé, si l'écart porte sur une valeur chiffrée (R1), ou si l'englobement est une déduction et non ce que dit le candidat.
- **R4 — Position générale face à un énoncé précis.** Une position de principe sur le thème, qui ne reprend pas la mesure précise de l'énoncé (ses critères, son seuil, son public), est **« non connu »**, par application de la règle du sujet voisin. Exemple : « il faut prendre en compte la pénibilité » face à un énoncé qui cite trois critères précis.

## 3. Nature de la position

Chaque code porte une nature, distincte de sa valeur.

| Nature | Définition | Codes possibles | Poids dans le score |
|---|---|---|---|
| `nette` | La position est explicite et sans réserve. | −2, 0, +2 | 1 |
| `nuancee` | La position est **explicite**, et ses conditions ou limites sont **identifiables** : on sait ce que le candidat veut. | −1, 0, +1 | 1 |
| `imprecise` | Une **direction** est perceptible, mais la mesure, son ampleur ou ses modalités ne sont pas spécifiées ; ou bien les sources récentes se contredisent. | −1, +1 | 0,5 |
| `non_connu` | Rien ne permet de coder. | `null` | exclu |

Test pour distinguer : *peut-on reformuler la position du candidat sous forme d'une mesure concrète ?* Oui → `nuancee`. Non → `imprecise`.

Une position `imprecise` est traitée comme à moitié connue : elle compte pour moitié dans le score, et l'autre moitié alimente le ramenage vers 50 % comme un « non connu » (méthodologie, § 6.2). Un candidat qui reste vague n'est ni récompensé ni sanctionné : son score se rapproche de 50 %.

## 4. Exemple (fictif)

Énoncé : « L'âge légal de départ à la retraite doit être fixé à 62 ans. »

| Extrait | Code | Nature |
|---|---|---|
| « Nous rétablirons la retraite à 62 ans dès la première année. » | +2 | nette |
| « Nous reviendrons à 62 ans, par étapes, en cinq ans. » | +2 | nette (R2) |
| « Retour à 62 ans pour ceux qui ont commencé à travailler avant 20 ans. » | +1 | nuancee |
| « Nous rétablirons la retraite à 60 ans. » | +1 | nuancee (R1) |
| « Il faudra revenir sur cette réforme injuste. » | +1 | imprecise |
| « L'âge légal sera de 63 ans. » | −1 | nuancee (R5) |
| « Je ne toucherai pas à l'âge légal actuel, ni à la hausse ni à la baisse. » | −1 | nuancee |
| « Il ne faut plus d'âge légal : seule la durée de cotisation doit compter. » | −1 | nuancee (R3) |
| « Il faudra travailler jusqu'à 65 ans. » | −2 | nette |
| « Notre système de retraite doit être juste et financé. » | non connu | non_connu |

(La ligne « je ne toucherai pas » est codée −1 et non 0 : le statu quo, 64 ans, contredit l'énoncé sans proposer l'inverse d'une baisse.)

## 5. Sources admises

Par ordre de priorité :
1. programme officiel 2027 du candidat ;
2. texte signé par le candidat : livre, tribune, proposition de loi dont il est premier signataire ;
3. discours ou déclaration publique rapportée par un média national, entretien ;
4. programme du parti, **uniquement** si le candidat en est investi et pour un texte adopté après son investiture.

Règles :
- **Aucune inférence** depuis l'étiquette, le parti, les alliés ou les positions passées du parti.
- **Les votes parlementaires ne servent pas au codage** : ils alimentent un indicateur séparé (méthodologie, § 8). Cette règle est affichée explicitement dans l'application.
- Seules comptent les sources postérieures au **1er janvier 2022**. Entre deux sources de dates différentes, la plus récente l'emporte ; l'ancienne reste dans l'historique.
- Deux sources contradictoires à moins de six mois d'écart : nature `imprecise`.
- **Extrait (v1.1)** : une **reformulation fidèle** du passage en une à trois phrases, qui conserve les chiffres, les conditions, les réserves et le degré de fermeté, et une **citation courte de 14 mots au plus**, retrouvée mot à mot dans la page source ; avec url, titre, date de publication, date de consultation. Les textes sources ne sont pas recopiés au-delà de cette citation.

## 6. Procédure

1. **Extraction** (non aveugle) : pour chaque couple candidat × question, recherche du meilleur extrait selon l'ordre du § 5. Absence d'extrait = « non connu », sans passer par les codeurs.
2. **Anonymisation** : noms de personnes, de partis, de mouvements et slogans remplacés par `[CANDIDAT]`, `[PARTI]`, `[SLOGAN]`. Les extraits sont présentés dans un ordre aléatoire, tous candidats mélangés.
3. **Double codage indépendant** par deux modèles différents, sans accès au code de l'autre. Chacun rend : code, nature, justification d'une phrase.
4. **Accord** = même code **et** même nature. Tout désaccord est arbitré par un humain, qui voit l'extrait anonymisé et les deux justifications ; sa décision et son motif sont consignés.
5. **Contrôle humain** : tirage aléatoire de 10 % des codes en accord, stratifié par candidat, graine publiée. Si plus de 10 % des codes contrôlés d'un candidat sont corrigés, tous ses codes sont revus.
6. **Contestation** : issue GitHub avec source. Un code n'est modifié que sur présentation d'un extrait admissible au sens du § 5.
7. **Vérification indépendante (v1.3)** : chaque code publié est contrôlé contre la page source elle-même (et non la seule reformulation) par un modèle qui n'a participé ni à l'extraction ni au codage : passage retrouvé, attribution au candidat, date, type de source, fidélité de la reformulation, code. Un extrait irrecevable est retiré. Un code n'est changé que si un **second arbitre**, qui ne sait pas quelle option vient du vérificateur, retient le même code ; sinon le code est maintenu ou listé « à revoir » pour un humain. La trace est publiée dans le champ `verification` de chaque position.

## 7. Mesures publiées

- Taux d'accord brut et kappa pondéré (quadratique), par vague et par candidat.
- Par candidat : taux de couverture (part des questions codées) et indicateur de précision (parts de `nette`, `nuancee`, `imprecise`).
- Nombre d'arbitrages et de corrections issues du contrôle humain.

## 8. Limites connues

- L'extraction n'est pas aveugle : le choix de l'extrait peut introduire un biais que le double codage ne corrige pas.
- **La reformulation est rédigée par l'extracteur, qui connaît le candidat (v1.1)** : elle peut orienter les codeurs. La citation courte et le lien vers la source permettent de la contrôler.
- L'anonymisation est imparfaite : un style ou une mesure emblématique peuvent rester reconnaissables.
- Deux modèles de langage peuvent partager des biais ; l'arbitrage et le contrôle humains ne portent que sur une partie des codes.
