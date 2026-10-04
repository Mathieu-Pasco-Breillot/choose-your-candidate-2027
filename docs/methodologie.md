# Méthodologie — version 1.3

Statut : **VALIDÉ le 4 octobre 2026** (v1 validée le 2 octobre 2026, v1.1 et v1.2 le 3 octobre 2026, v1.3 le 4 octobre 2026).

## Modifications de la version 1.3

Issue de la couverture réelle de la vague 1 (phase 4), validée par Mathieu le 4 octobre 2026 :

- § 6.3 : la condition « au moins 50 % des questions répondues » est supprimée ; un candidat figure au classement dès qu'il est codé sur au moins 8 des questions répondues (D13).
- § 10 : limite sur la couverture mise à jour avec les chiffres de la vague 1.

## Modifications de la version 1.2

Issues de l'implémentation du tirage (phase 5, lot 5d), validées par Mathieu le 3 octobre 2026 :

- § 7.3 : deux règles complémentaires du tirage, nécessaires pour tenir les garanties d'équilibre des sens (D12).

## Modifications de la version 1.1

Issues de la spécification de l'application (phase 5), validées par Mathieu le 3 octobre 2026 :

- § 5 : un code en désaccord non encore arbitré est traité comme « non connu » (D8).
- § 6.3 : une position `imprecise` compte pour une question codée dans les seuils (D9).
- § 7.1 : la variance est la variance de population (D10).
- § 7.2 : cinq questions d'ancrage en mode court au lieu de dix (D11).
- § 7.3 : renvoi à la spécification de l'application pour l'algorithme de tirage.

## 1. Principes

- **Neutralité** : les questions sont construites sans regarder la liste des candidats ; les positions sont codées à l'aveugle ; aucune étiquette idéologique n'est attachée à un candidat.
- **Transparence** : critère d'inclusion, grille de codage, extraits, sources, formules et code sont publics. Chaque résultat affiché peut être recalculé à la main.
- **Rien n'est supprimé** : questions, codes et statuts sont archivés et datés.
- **Aucune donnée collectée** : tout le calcul se fait dans le navigateur.

## 2. Qui est évalué

Voir `critere-inclusion.md` (v1). Les candidats non évalués (pressentis, primaire en cours, hors liste officielle) sont toujours listés à côté des résultats, avec le motif.

## 3. Banque de questions

- Origine : débats publics, programmes des partis représentés, textes votés — jamais un candidat.
- Un énoncé = une affirmation, une seule mesure, aucun nom de candidat ni de parti, aucun terme évaluatif.
- Chaque question porte : thème, axe, sens, pouvoir discriminant (calculé).
- Relecture de neutralité : toute formulation pouvant orienter est signalée dans `alertes_neutralite`, avec la décision prise.
- Une question n'est jamais supprimée : elle passe en `suspendue` ou `archivee`.

## 4. Axes et sens

Les axes servent **uniquement à équilibrer le tirage** et à vérifier l'alternance des formulations. Ils n'entrent pas dans le score et aucun candidat n'est placé dessus.

| Axe | Pôle A | Pôle B |
|---|---|---|
| `economie` | intervention publique, redistribution | marché, baisse des prélèvements et de la dépense |
| `securite` | priorité aux libertés individuelles | priorité à l'ordre et à la sanction (police, justice, peines) |
| `frontieres` | ouverture (immigration, accueil) | restriction |
| `europe` | intégration européenne | souveraineté nationale |
| `ecologie` | priorité à la contrainte environnementale | priorité au coût et à l'activité |
| `institutions` | pouvoir au Parlement et aux citoyens | pouvoir à l'exécutif |

Les lettres A et B sont arbitraires et n'expriment aucune préférence. `sens = +1` si être d'accord avec l'énoncé rapproche du pôle A, `−1` s'il rapproche du pôle B. Objectif par thème : 50 % de chaque sens, à ± 10 points.

## 5. Codage

Voir `grille-codage.md` : échelle de −2 à +2, « non connu », natures `nette` / `nuancee` / `imprecise`, double codage aveugle, arbitrage et contrôle humains.

Seuls les codes en accord ou arbitrés sont publiés. **Un code en désaccord non encore arbitré est traité comme « non connu »** et affiché « arbitrage en attente » (v1.1) : le publier reviendrait à choisir l'un des deux codeurs.

## 6. Calcul du score

La même formule s'applique à **tous les candidats, sans exception ni ajustement manuel**.

### 6.1 Formule

Pour un candidat, sur les questions auxquelles l'utilisateur a répondu (hors « sans avis ») **et** qui sont codées pour ce candidat :

```
points(q)      = 4 − |réponse − position|              (de 0 à 4)
poids_base(q)  = poids_thème × importance
poids(q)       = poids_base(q) × précision
score_brut     = 100 × Σ poids(q) × points(q) / (4 × Σ poids(q))
```

- `poids_thème` : 1 à 3, choisi par l'utilisateur (un thème à 0 n'est pas tiré).
- `importance` : 2 si « très important », 1 sinon.
- `précision` : 0,5 si la position est `imprecise`, 1 sinon.

### 6.2 Ramenage vers 50 %

```
c              = Σ poids(q) des questions codées / Σ poids_base(q) des questions répondues
score_affiché  = 50 + (score_brut − 50) × c
```

- Une question « non connu » compte pour 0 au numérateur ; une position `imprecise` y compte pour moitié : elle est traitée comme à moitié connue.
- Un candidat codé nettement sur toutes les questions répondues garde son score brut ; moins il est codé, ou plus il est imprécis, plus son score se rapproche de 50 %.
- Le point de ramenage est 50 % pour tous. Limite assumée : deux réponses au hasard donnent 60 % en moyenne, donc un candidat peu codé est tiré légèrement vers le bas.
- Le score brut et `c` restent consultables.

### 6.3 Seuils

- **Dans un résultat** : un candidat figure au classement s'il est codé sur **au moins 8 des questions répondues** (v1.3). Sinon il est affiché hors classement, avec le motif. Il n'y a pas de condition de proportion : un candidat peu couvert reste classé, son score est ramené vers 50 % (§ 6.2) et sa fiabilité est affichée (§ 6.4).
- Pourquoi (v1.3) : avec la couverture réelle de la vague 1 (de 20 à 48 % des questions selon le candidat), l'ancienne condition « au moins 50 % des questions répondues » écartait presque tous les candidats des modes longs. En mode 40 questions, le candidat le mieux couvert était classé dans 84 % des quiz, le moins couvert dans aucun. Or la couverture mesure surtout la quantité de déclarations trouvables, pas la position des candidats.
- **Dans la banque** : un candidat passe de `codage_en_attente` à `evalue` quand il est codé sur au moins 40 % des questions actives.
- Dans ces deux seuils, **une position `imprecise` compte pour une question codée** (v1.1). Elle ne pèse que 0,5 dans le score (§ 6.1).

### 6.4 Fiabilité

Affichée par candidat, d'après le nombre de questions répondues et codées : faible (moins de 15), moyenne (15 à 29), bonne (30 et plus). Le mode court ne peut donc pas dépasser « moyenne ».

### 6.5 Ce que le score ne dit pas

- Répondre 0 partout donne au moins 50 % avec tout le monde : les scores se resserrent dans le haut de l'échelle. Les écarts entre candidats comptent plus que les valeurs.
- Les affinités déclarées n'entrent pas dans le score ; elles sont seulement comparées au résultat.
- Les votes parlementaires n'entrent pas dans le score (§ 8).

## 7. Pouvoir discriminant et ancrage

### 7.1 Pouvoir discriminant

```
D(q) = variance des codes des candidats codés × (candidats codés / candidats évalués)
```

La variance est la **variance de population** (somme des carrés des écarts à la moyenne, divisée par le nombre de candidats codés) ; `D` va de 0 à 4 (v1.1). Calculé si au moins 4 candidats sont codés sur la question, sinon non défini. Recalculé à chaque ajout de candidat et à chaque recodage ; résultat dans `derive/discriminance.json`.

### 7.2 Questions d'ancrage

Dix questions, présentes dans chaque tirage en mode long et en mode campagne. Sélection par ordre décroissant de D, sous contraintes :
- couverture d'au moins 80 % des candidats évalués ;
- une question par thème au maximum ;
- trois par axe au maximum ;
- au moins quatre de chaque sens.

**En mode court, cinq ancres seulement** (v1.1) : les premières de la liste, en ajustant pour en avoir au moins deux de chaque sens. Avec dix ancres, la moitié d'un quiz court serait identique d'une partie à l'autre et il ne resterait que dix places pour onze thèmes.

Stabilité : une question d'ancrage n'est remplacée que si elle sort des 20 premières sous ces contraintes. Si l'utilisateur met un thème à 0, son ancre est remplacée par la question suivante du classement. Les ancres échappent à la règle « questions déjà vues évitées ».

### 7.3 Tirage

Quotas par thème proportionnels aux poids, équilibre des axes et des sens, priorité aux D élevés, ancres incluses, questions déjà vues évitées. L'algorithme exact est spécifié dans `phase-5/specification-application.md` (§ 7) et couvert par des tests.

Deux règles complètent l'équilibre des sens (v1.2) :
- quand un thème est à égalité de sens, la question suivante est prise, si possible, dans le sens en déficit sur l'ensemble du tirage ; sans cette règle, chaque thème pourrait pencher d'une question du même côté et l'écart global dépasser 10 % du nombre de questions ;
- quand la contrainte « une ancre par thème » doit être levée pour remplacer une ancre, une seconde ancre n'est posée dans un thème que si l'équilibre des sens de ce thème reste atteignable.

## 8. Cohérence avec les votes

Indicateur **séparé du score**. Chaque question est reliée aux scrutins pertinents (Assemblée nationale depuis 2022, puis Sénat et Parlement européen). On affiche le vote personnel du candidat s'il siégeait, sinon celui de son groupe avec la répartition. Sans rattachement parlementaire : « pas d'historique », jamais une pénalité.

**Les votes ne servent pas au codage des positions.** Cette règle est affichée explicitement dans l'application : à côté de l'indicateur de votes, sur chaque fiche candidat et sur la page de résultats, avec la mention « Les votes n'entrent ni dans le codage des positions ni dans le score ».

## 9. Mises à jour

- Ajout d'un candidat : procédure en 5 étapes (couverture de la banque, codage de tous sur les nouvelles questions, codage du candidat, recalcul de D et des ancres, journal).
- Changement de position d'un candidat : recodage sur la source la plus récente, ancien code archivé.
- Toute modification est consignée dans `journal.json`.

## 10. Limites

- Le codage repose sur des modèles de langage, contrôlés partiellement par un humain (voir grille, § 8).
- Un candidat sans programme publié est codé sur des déclarations : sa couverture et sa précision sont plus faibles, ce qui est affiché et non corrigé.
- Les votes étant exclus du codage, un parlementaire sans programme publié est moins couvert qu'il ne pourrait l'être.
- Une affirmation en cinq degrés ne restitue pas une position complexe ; les extraits sont là pour ça.
- La banque reflète les débats à une date donnée.
- Sur la vague 1, 34 % seulement des couples candidat × question ont un extrait (de 20 à 48 % selon le candidat). Un candidat peu couvert est classé sur moins de questions, avec un score plus proche de 50 % et une fiabilité plus faible. Le tirage n'est pas corrigé pour l'avantager.

## Décisions validées

| | Date | Décision |
|---|---|---|
| D1 | 2 oct. 2026 | Six axes (`economie`, `securite`, `frontieres`, `europe`, `ecologie`, `institutions`), limités à l'équilibrage du tirage |
| D2 | 2 oct. 2026 | « Très important » : × 2 |
| D3 | 2 oct. 2026 | Position `imprecise` : × 0,5, l'autre moitié traitée comme « non connu » |
| D4 | 2 oct. 2026 | Ramenage vers 50 %, même formule pour tous les candidats |
| D5 | 2 oct. 2026 | Classement : codé sur au moins 50 % des questions répondues et au moins 10 questions (remplacée par D13) |
| D6 | 2 oct. 2026 | Ancrage : 10 questions, une par thème au plus, trois par axe au plus, au moins quatre de chaque sens |
| D7 | 2 oct. 2026 | Votes exclus du codage, règle affichée explicitement dans l'application |
| D8 | 3 oct. 2026 | Désaccord non arbitré : traité comme « non connu » |
| D9 | 3 oct. 2026 | Position `imprecise` : compte pour une question codée dans les seuils |
| D10 | 3 oct. 2026 | Variance de population dans `D` |
| D11 | 3 oct. 2026 | Cinq ancres en mode court, dix en mode long et campagne |
| D12 | 3 oct. 2026 | Tirage : départage global des sens quand un thème est à égalité ; seconde ancre dans un thème seulement si l'équilibre des sens du thème reste atteignable |
| D13 | 4 oct. 2026 | Classement : codé sur au moins 8 des questions répondues, sans condition de proportion |
