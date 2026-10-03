# Mon Isoloir

*Comparez les candidats à la présidentielle 2027, à l'abri des regards : vos réponses ne quittent jamais votre téléphone.*

Comparateur des positions des candidats à l'élection présidentielle de 2027. L'utilisateur répond à une série de
questions ; le site classe les candidats selon la proximité de leurs positions publiques avec ses réponses.
Chaque position est adossée à au moins une source vérifiable. Le calcul se fait entièrement dans le navigateur.

**État :** socle technique (lot 5b). Le site affiche une page « en construction » ; le calcul (lot 5c), le tirage
des questions (lot 5d) et l'interface (lot 5e) suivent.

## Structure

| Dossier | Rôle |
|---|---|
| `data/` | Source de vérité : candidats, axes, questions, positions codées, journal. Données uniquement, aucun code. |
| `schemas/` | JSON Schema de chaque entité, alignés sur les fichiers réels. |
| `derive/` | Fichiers **générés** (discriminance, ancrage, couverture, accord entre codeurs). Ne jamais les éditer à la main. |
| `docs/` | Méthodologie, grille de codage, critère d'inclusion des candidats. |
| `scripts/` | Validation des données et calculs de `derive/`, avec leurs tests. |
| `core/` | Fonctions pures du comparateur (lots 5c et 5d) et types générés depuis les schémas. |
| `app/` | Interface (Vite, React, TypeScript, Tailwind, Motion, PWA). |

Chaîne de construction : validation des données (JSON Schema, sources, identifiants) → calculs `derive/` → application.

## Commandes

Node 22 ou plus.

```
npm ci
npm run data:validate   # valide les données
npm run derive          # recalcule derive/ (puis committer le résultat)
npm run derive:check    # échoue si derive/ n'est pas à jour
npm run types:generate  # régénère core/types.generated.ts depuis schemas/
npm test
npm run dev
npm run build           # valide, vérifie les types, compile
```

## Contribuer

Les données sont publiques et contestables. **Toute contribution touchant une position, un code ou une question
doit citer une source** (URL, de préférence primaire : programme, déclaration, vote) et, pour une position,
le passage qui la fonde (reformulation, ou citation de 14 mots maximum). Une contribution sans source est refusée.

- Contester une position : ouvrir une issue avec le modèle « Contester ou corriger une position ».
- Les règles de codage sont dans `docs/grille-codage.md`, le calcul dans `docs/methodologie.md`.
- Avant toute proposition : `npm run data:validate` et `npm test` doivent passer. La CI les exécute.
- Chaque modification de `data/` est tracée dans `data/journal.json`.

## Vie privée

Le site ne collecte pas les réponses des utilisateurs : tout est calculé dans le navigateur. Le serveur est un
simple serveur de fichiers statiques, configuré sans journal d'accès (`Caddyfile`) avec une politique de
sécurité de contenu stricte. L'hébergeur (Railway) conserve ses propres journaux : voir la page « vie privée »
à venir.

## Licences

- **Code** (`app/`, `core/`, `scripts/`, `schemas/`, configuration) : [GNU AGPL-3.0](LICENSE). Quiconque propose une version modifiée du comparateur en ligne doit en publier le code source.
- **Données et documentation** (`data/`, `docs/`, `derive/`) : [CC BY 4.0](LICENSE-DONNEES), avec mention du projet. Les citations de tiers restent la propriété de leurs auteurs.
