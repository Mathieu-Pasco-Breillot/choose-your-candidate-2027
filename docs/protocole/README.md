# Protocole de codage des positions

Ce dossier décrit comment les positions des candidats (`data/positions/*.json`) sont recherchées, codées et vérifiées. La grille est dans `docs/grille-codage.md` (v1.3), la méthodologie dans `docs/methodologie.md`. Les vagues passées sont décrites dans le journal (`data/journal.json`).

| Fichier | Rôle |
|---|---|
| `consigne-extraction-complementaire.md` | Consigne des extracteurs (modèle à compléter : date, contexte, chemin du dépôt). |
| `consigne-codage-aveugle.md` | Consigne des deux codeurs, identique à la lettre pour les deux. |
| `consigne-arbitrage-provisoire.md` | Consigne de l'arbitre des désaccords. |
| `consigne-verification-independante.md` | Consigne du vérificateur, qui contrôle chaque code publié contre la page source. |
| `consigne-second-arbitrage.md` | Consigne du second arbitre, qui tranche quand le vérificateur propose un autre code. |
| `outils/gnews.py` | Recherche dans Google Actualités avec des liens d'articles directs (`--rss "<mots clés>"`). |

## Principes
- Seuls comptent les propos du **candidat lui-même** : programme officiel, texte qu'il signe en premier, déclaration publique rapportée par un média national. Ne comptent pas le parti (sauf texte adopté après investiture), le porte-parole, « l'entourage », une déduction de journaliste, les votes ni les agrégateurs de programmes.
- Sources publiées depuis le 1er janvier 2022 ; la plus récente l'emporte.
- Codage **à l'aveugle** : les codeurs ne voient que des extraits anonymisés, tous candidats mélangés. Aucun code n'est modifié hors du protocole (codeurs, arbitre, contrôle humain).
- Un désaccord non arbitré n'est jamais publié (D8).

## Déroulé d'une vague
1. **Périmètre.** Pour chaque candidat × thème, lister les questions actives visées : en général celles sans code publié (`code` null). Écrire un fichier de mesures `{"<id>": {"enonce", "precision", "deja_trouve"?: [{url, date, resume}], "note"?}}`. `deja_trouve` sert quand un extrait existe déjà mais a été codé null (R4) : l'extracteur ne doit pas le renvoyer.
2. **Extraction.** Un agent par candidat × thème (Sonnet), avec la consigne complétée. Au plus 20 agents à la fois. Chaque agent écrit un JSON dans son propre dossier.
3. **Contrôle mécanique**, par script, sans faire confiance aux extracteurs :
   - JSON valide, ids conformes au fichier de mesures, `type` de source autorisé ;
   - date ≥ 2022-01-01, aucune source déjà dans `deja_trouve`, aucun agrégateur (elyseescope, votons-2027, monvote, lafacture, Wikipédia…) ;
   - citation courte ≤ 14 mots, **retrouvée mot à mot** sur la page téléchargée (normaliser apostrophes, espaces, entités ; `pdftotext` pour un PDF) ;
   - **règle d'attribution** : chercher dans les reformulations « entourage », « porte-parole », « législatives », « propositions du parti », « conditionnel », « ne cite aucun », et écarter l'extrait si les propos ne sont pas ceux du candidat ;
   - écarter les sites qui ne sont pas des médias.
4. **Lot aveugle.** Un item par couple candidat × question ayant au moins un nouvel extrait. Il contient l'énoncé, la précision et **tous** ses extraits (anciens et nouveaux), du plus récent au plus ancien : `{date: "AAAA-MM", type_source, reformulation: <anonymisée>, citation: <anonymisée>}`. Identifiants aléatoires, ordre mélangé (graine notée), clé de correspondance hors du dossier des codeurs. Avant envoi, chercher les noms, partis, villes et fonctions dans les textes anonymisés.
5. **Double codage.** Codeur 1 Opus, codeur 2 Sonnet, chacun dans un dossier qui ne contient que la consigne et le lot. Vérifier ensuite les couples code/nature autorisés et l'exhaustivité.
6. **Arbitrage provisoire** des désaccords (code ou nature différents) par un troisième modèle (Fable), à l'aveugle. Les deux codes sont présentés en `codeur_A` / `codeur_B` dans un ordre aléatoire noté à part.
7. **Fusion** dans `data/positions/<candidat>.json` :
   - `extraits` = nouveaux + anciens, avec `citation_verifiee_mot_a_mot` issu du contrôle mécanique (null sans citation) ;
   - `codage` (codeur_1, codeur_2, `aveugle: true`, `accord`) et `statut` accord ou arbitre ;
   - pour un arbitrage : `par` = « arbitrage provisoire par un troisième modèle (claude-fable-…), aveugle, non validé par un humain (mode POC) » ;
   - nouvel `item_aveugle` ; `version` + 1 si la question avait déjà été codée ;
   - **contrôle humain** : tirer au sort 10 % des nouveaux codes publiés, stratifiés par candidat (au moins un par candidat), `{"tire_au_sort": true, "date": null, "resultat": null}`.
8. **Vérification indépendante** (depuis le 4 octobre 2026, sur **tous** les codes publiés) :
   - télécharger chaque page source par script (`curl`, puis `trafilatura` + texte brut complet ; `pdftotext` pour un PDF) et refaire le contrôle mécanique de la citation ;
   - lots mélangés d'environ 16 items, un vérificateur Opus par lot (`consigne-verification-independante.md`) : il lit la **page** et non la seule reformulation, contrôle passage, attribution, date, type, fidélité et code, et rend `confirme`, `modifier_code`, `ecarter_extrait` ou `source_inaccessible` ;
   - chaque proposition de changement, et chaque cas où il signale R6 sans l'appliquer, passe devant un **second arbitre** Fable (`consigne-second-arbitrage.md`), qui voit le code publié et la proposition sous les lettres A et B dans un ordre aléatoire noté à part, et tranche sur la page source ;
   - un code n'est changé que si le vérificateur et le second arbitre retiennent **le même** code et la même nature (`verification.verdict = "corrige"`, ancien code dans `code_avant`, `version` + 1) ; le second arbitre garde le code publié → `maintenu` ; ils divergent tous deux → `a_revoir`, code inchangé, listé pour un humain ;
   - extrait retiré si le vérificateur le juge irrecevable et que le second arbitre le confirme, ou, sans second arbitrage, s'il s'agit d'un agrégateur ou d'une analyse tierce (Votons, Selexium, Oxfam, upday…) ou d'un commentaire de journaliste ; s'il ne reste aucun extrait, la question passe en `sans_extrait` ;
   - reformulation remplacée par la version corrigée du vérificateur quand elle était partielle ou infidèle (la version anonymisée est refaite) ; type de source corrigé.
9. **Dépôt.**
   - Ajouter une entrée au journal (`type: "recodage"`, chiffres de la vague).
   - Lancer `npm run data:validate`, `npm run derive`, `npm run bundle`.
   - Mettre à jour les chiffres figés dans `scripts/derive.test.ts` (« reproduit les chiffres publiés… », ancrage).
   - Lancer `npm ci` si besoin, puis `npm run check`.
   - Commit en français, `git pull --rebase`, `git -c http.postBuffer=524288000 push`, puis vérifier la CI (`gh run list`). D'autres sessions poussent en parallèle : si `app/donnees/pages.json` est périmé après le rebase, relancer `npm run bundle` et committer.
10. **Bilan.** Rédiger le bilan de la vague : périmètre, rendement, accord, extraits écartés, couverture et rapport de neutralité avant/après, liste « à revoir par un humain » (contrôles tirés, arbitrages, codes discutables).

## Difficultés connues (vague 2, octobre 2026)
- Bloqués ou payants : pcf.fr (Cloudflare), Europe 1, Le Monde, Libération, Le Point, Les Echos. Ouverts en général : reprises AFP (LCP, Public Sénat, Le Figaro, La Dépêche…), franceinfo, BFM, TF1 Info, JDD, L'Opinion (chapeau), sites de campagne.
- Le quota de recherche web est partagé entre tous les agents : 6 recherches au plus chacun, le reste par `gnews.py`.
- Rendement de la vague 2 : environ 6 % des questions cherchées. L'essentiel du gain viendra des programmes officiels.
