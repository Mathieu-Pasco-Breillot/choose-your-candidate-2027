# Critère d'inclusion — version 1

Statut : **VALIDÉ le 2 octobre 2026**.

## Principe

Aucun candidat n'est écarté sur son poids électoral : **il n'y a pas de seuil de sondages** ni de condition de participation à une élection passée.

## Règles

**R1 — Candidature formellement déclarée.** Est évaluée toute personne ayant déclaré publiquement, personnellement et sans condition, sa candidature à l'élection présidentielle de 2027, ou ayant été investie par son parti.
- Preuve exigée : au moins un article d'un média national rapportant la déclaration, avec lien et date.
- Une intention ou une annonce à venir (« je le serai », « j'annoncerai avant décembre ») ne suffit pas : statut `pressenti`, affiché comme tel.

**R2 — Primaire en cours.** Les participants à une primaire non achevée ne sont pas évalués. Le vainqueur est évalué dès sa désignation, s'il remplit R1.

**R3 — Liste officielle.** À la publication de la liste des candidats par le Conseil constitutionnel (mars 2027), le critère devient : tous les candidats officiels, et eux seuls. Les autres passent en `non_evalue`, leurs codages restant consultables.

## Application

- Réévaluation le 1er de chaque mois et à chaque événement de statut (déclaration, retrait, désignation, remplacement).
- Chaque évaluation est consignée dans le journal, avec la source utilisée.
- Retrait ou remplacement : le codage existant est conservé et archivé, jamais transféré à un autre candidat.
- Un candidat évalué mais dont trop peu de questions sont codées est affiché, sans figurer au classement (seuil défini en phase 2).

## Ordre de codage

L'ordre des vagues n'est pas une exclusion. Il est publié :
1. **vague 1** — la liste de départ du projet (10 noms fixés avant l'adoption du critère), pour ceux qui remplissent R1. C'est un choix éditorial d'ordre, affiché comme tel ;
2. **vagues suivantes** — les autres déclarés : d'abord ceux testés par les instituts, par ordre décroissant de moyenne des sondages, puis les autres par ordre alphabétique du nom.

Tant qu'un candidat n'est pas codé, il apparaît avec la mention « codage en attente ».

## État au 2 octobre 2026

- **Évalués, vague 1 (9)** : Philippe, Attal, Retailleau, Lisnard, Le Pen, Mélenchon, Roussel, Arthaud, Dupont-Aignan. Zemmour, dixième nom de la liste de départ, rejoint cette vague dès sa déclaration.
- **Évalués, vague 2** : Tondelier, Ruffin, puis Asselineau, Batho, Becht, Bouamrane, Egger, Lalanne, Mikolajczak, Philippot, et tout autre déclaré satisfaisant R1.
- **Pressentis (R1 non remplie)** : Zemmour, Bertrand, Villepin, Wauquiez.
- **Primaire en cours (R2)** : Faure, Glucksmann, Guedj, Maurel, Royal.

## À vérifier avant publication

- Source de la déclaration de chaque candidat de la vague 2 (R1 : média national).
- Statut exact de François Ruffin (candidat déclaré, initialement en vue d'une primaire unitaire qui n'a pas lieu).
- Décision d'appel du 7 juillet 2026 concernant Marine Le Pen.
- Calendrier officiel de la primaire PS–Place publique.

## Historique

| Version | Date | Changement |
|---|---|---|
| 1 | 2026-10-02 | Création. Seuil de sondages fixé à 0 %, condition « présent en 2022 » abandonnée, déclaration formelle exigée, bascule sur la liste officielle. |
