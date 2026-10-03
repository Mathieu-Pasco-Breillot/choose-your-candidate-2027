/* eslint-disable */
/**
 * FICHIER GÉNÉRÉ par `npm run types:generate` à partir de schemas/*.schema.json.
 * Ne pas modifier à la main : modifier le schéma, puis régénérer.
 */

// ── axes.schema.json
export namespace Axes {
  /**
   * data/axes.json — les six axes validés en phase 2 (décision D1). Ils servent uniquement à équilibrer le tirage ; ils n'entrent pas dans le score.
   */
  export interface FichierAxes {
    _version: number;
    _statut: string;
    _note: string;
    /**
     * @minItems 6
     * @maxItems 6
     */
    axes: {
      id: 'economie' | 'securite' | 'frontieres' | 'europe' | 'ecologie' | 'institutions';
      pole_a: string;
      pole_b: string;
    }[];
  }
}

// ── candidats.schema.json
export namespace Candidats {
  export type Candidat = Candidat1;
  export type Identifiant = string;
  export type IdentifiantPrimaire = string;

  /**
   * data/candidats.json — personnes, statuts de candidature et d'évaluation, primaires. Les champs prévus par le schéma de la phase 1 mais absents des fichiers (historique_statuts, programme, rattachements_parlementaires, remplace, remplace_par) seront ajoutés ici quand ils entreront dans les données.
   */
  export interface FichierCandidats {
    _critere_version: number;
    _date_etat_des_lieux: string;
    _note: string;
    /**
     * @minItems 1
     */
    candidats: Candidat[];
    primaires: Primaire[];
  }
  export interface Candidat1 {
    id: Identifiant;
    prenom: string;
    nom: string;
    parti: string;
    statut_candidature:
      | 'pressenti'
      | 'declare'
      | 'en_primaire'
      | 'investi'
      | 'parrainages_valides'
      | 'officiel'
      | 'retire'
      | 'remplace'
      | 'ineligible';
    /**
     * Année-mois, date complète, ou « à vérifier » tant que la source n'est pas confirmée.
     */
    date_declaration?: string;
    statut_evaluation: 'evalue' | 'codage_en_attente' | 'non_evalue';
    motif_non_evaluation?:
      'primaire_en_cours' | 'pressenti' | 'declaration_non_sourcee' | 'absent_liste_officielle';
    vague?: number;
    primaire?: IdentifiantPrimaire;
    a_verifier?: string;
    note?: string;
  }
  export interface Primaire {
    id: IdentifiantPrimaire;
    nom: string;
    calendrier: string;
    statut: string;
    vainqueur: Identifiant | null;
  }
}

// ── derive-accord-codeurs.schema.json
export namespace DeriveAccordCodeurs {
  /**
   * derive/accord-codeurs.json — accord entre les deux codeurs (grille v1.2, § 7) : taux d'accord brut (même code et même nature), accord sur le code seul, kappa pondéré quadratique calculé sur les couples où les deux codeurs ont rendu un code. Généré par `npm run derive`, jamais édité à la main.
   */
  export interface DeriveAccordCodeurs {
    version: 1;
    empreinte_donnees: string;
    provisoire: boolean;
    codeurs: {
      codeur_1: string[];
      codeur_2: string[];
    };
    global: BlocAccord;
    par_vague: {
      [k: string]: BlocAccord;
    };
    par_candidat: {
      [k: string]: BlocAccord;
    };
    arbitrages: {
      en_attente: number;
      rendus: number;
    };
    controle_humain: {
      tires_au_sort: number;
      effectues: number;
      corrections: number;
    };
  }
  export interface BlocAccord {
    couples_codes: number;
    accord_code_et_nature: number;
    taux_accord: number | null;
    accord_code_seul: number;
    taux_accord_code_seul: number | null;
    couples_pour_kappa: number;
    kappa_pondere_quadratique: number | null;
    arbitrages_en_attente: number;
  }
}

// ── derive-ancrage.schema.json
export namespace DeriveAncrage {
  /**
   * derive/ancrage.json — questions d'ancrage (méthodologie v1.1, § 7.2). `classement` donne toutes les questions éligibles par D décroissant : le tirage y prend la question suivante quand une ancre est écartée (spécification, § 7.2, étape 1). Généré par `npm run derive`, jamais édité à la main.
   */
  export interface DeriveAncrage {
    version: 1;
    empreinte_donnees: string;
    provisoire: boolean;
    parametres: {
      nombre_ancres: 10;
      nombre_express: 5;
      couverture_min: 0.8;
      par_theme_max: 1;
      par_axe_max: 3;
      min_par_sens: 4;
      min_par_sens_express: 2;
      rang_stabilite: 20;
    };
    classement: {
      rang: number;
      question_id: string;
      theme: string;
      axe: string;
      sens: 1 | -1;
      D: number;
      couverture: number;
      candidats_codes: number;
    }[];
    /**
     * @maxItems 10
     */
    ancres: string[];
    /**
     * @maxItems 5
     */
    ancres_express: string[];
    ancres_completes: boolean;
    express_complet: boolean;
  }
}

// ── derive-couverture.schema.json
export namespace DeriveCouverture {
  /**
   * derive/couverture.json — couverture et précision par candidat (grille v1.2, § 7 ; méthodologie v1.1, § 6.3). Un code est « publié » s'il est en accord ou arbitré et non nul ; un désaccord non arbitré compte comme « non connu » (D8). Généré par `npm run derive`, jamais édité à la main.
   */
  export interface DeriveCouverture {
    version: 1;
    empreinte_donnees: string;
    provisoire: boolean;
    questions_actives: number;
    seuil_evalue: 0.4;
    candidats: {
      [k: string]: {
        vague: number | null;
        statut_evaluation: 'evalue' | 'codage_en_attente';
        positions_disponibles: boolean;
        questions_avec_position: number;
        avec_extrait: number;
        codes_publies: number;
        arbitrages_en_attente: number;
        non_connu_apres_accord: number;
        taux_couverture: number;
        seuil_evalue_atteint: boolean;
        natures: {
          nette: number;
          nuancee: number;
          imprecise: number;
        };
        parts_natures: null | {
          nette: number;
          nuancee: number;
          imprecise: number;
        };
        par_theme: {
          [k: string]: {
            questions_actives: number;
            codes_publies: number;
            taux_couverture: number;
          };
        };
      };
    };
  }
}

// ── derive-discriminance.schema.json
export namespace DeriveDiscriminance {
  /**
   * derive/discriminance.json — pouvoir discriminant D(q) par question active (méthodologie v1.1, § 7.1). Généré par `npm run derive`, jamais édité à la main.
   */
  export interface DeriveDiscriminance {
    version: 1;
    empreinte_donnees: string;
    provisoire: boolean;
    population: string[];
    candidats_evalues: number;
    seuil_candidats_codes: 4;
    d_max: number | null;
    questions: {
      [k: string]: {
        theme: string;
        axe: string;
        sens: 1 | -1;
        candidats_codes: number;
        couverture: number | null;
        variance: number | null;
        D: number | null;
      };
    };
  }
}

// ── derive-rapport-neutralite.schema.json
export namespace DeriveRapportNeutralite {
  export type Identifiant = string;
  export type Part = number;

  /**
   * derive/rapport-neutralite.json — rapport de neutralité du tirage (spécification de l'application, § 7.4 et § 10). Sur `tirages_par_mode` tirages simulés par mode, avec des poids de thème aléatoires et un utilisateur qui répond à toutes les questions, part des tirages où chaque candidat atteint les seuils de classement et couverture moyenne. Rend visible un déséquilibre entre candidats sans le corriger ; non bloquant. Généré par `npm run derive`, jamais édité à la main.
   */
  export interface DeriveRapportNeutralite {
    version: 1;
    empreinte_donnees: string;
    provisoire: boolean;
    parametres: {
      tirages_par_mode: number;
      graine: number;
      seuil_questions_codees: 10;
      seuil_part_codee: 0.5;
      poids_themes: 'uniforme_0_a_3_au_moins_un_non_nul';
      reponses: 'toutes_les_questions_tirees';
      questions_deja_vues: 'aucune';
    };
    candidats: Identifiant[];
    couverture_banque: {
      [k: string]: Part;
    };
    modes: {
      express: Mode;
      debat: Mode;
      campagne: Mode;
    };
  }
  export interface Mode {
    N: 20 | 40 | 60;
    questions_tirees_moyenne: number;
    ecart_parts_atteint_seuils: Part;
    candidats: {
      [k: string]: {
        part_atteint_seuils: Part;
        couverture_moyenne: Part;
        questions_codees_moyenne: number;
        questions_codees_min: number;
        questions_codees_max: number;
      };
    };
  }
}

// ── journal.schema.json
export namespace Journal {
  /**
   * data/journal.json — journal des modifications (méthodologie, § 9). Le type `import_initial` s'ajoute aux types du schéma de la phase 1.
   */
  export interface FichierJournal {
    _note: string;
    entrees: {
      date: string;
      type:
        | 'import_initial'
        | 'ajout_candidat'
        | 'changement_statut'
        | 'ajout_question'
        | 'reformulation'
        | 'recodage'
        | 'arbitrage'
        | 'changement_critere'
        | 'recalcul';
      /**
       * @minItems 1
       */
      objets: string[];
      description: string;
      auteur: string;
      reference: string | null;
    }[];
  }
}

// ── positions.schema.json
export namespace Positions {
  export type Identifiant = string;
  export type DateIso = string;
  export type Position = Position1;
  export type Code = number | null;
  export type Nature = 'nette' | 'nuancee' | 'imprecise' | 'non_connu';

  /**
   * data/positions/<candidat>.json — codages d'un candidat, un enregistrement par question. Valeurs observées au 3 octobre 2026 : statut accord, sans_extrait, arbitrage_en_attente. Le statut `arbitre` et l'objet `arbitrage` suivent le schéma de la phase 1 et n'apparaissent encore dans aucun fichier.
   */
  export interface FichierPositions {
    candidat_id: Identifiant;
    _statut: string;
    grille_version: string;
    programme: {
      officiel_disponible: boolean;
      date_publication: DateIso | null;
      url: string | null;
      note: string;
    };
    positions: Position[];
  }
  export interface Position1 {
    question_id: string;
    code: Code;
    nature: Nature | null;
    statut: 'accord' | 'sans_extrait' | 'arbitrage_en_attente' | 'arbitre';
    item_aveugle?: string;
    extraits: Extrait[];
    codage: null | {
      codeur_1: Codeur;
      codeur_2: Codeur;
      accord: boolean;
    };
    arbitrage: null | {
      par: string;
      date: DateIso;
      code_retenu: Code;
      nature_retenue: Nature;
      motif: string;
    };
    controle_humain: {
      tire_au_sort: boolean;
      date?: DateIso | null;
      /**
       * Vide tant que le contrôle humain n'a pas eu lieu. Le script de dérivation compte comme correction la valeur « corrige ».
       */
      resultat?: string | null;
    };
    /**
     * Vide dans tous les fichiers ; forme à préciser à la première contestation (issue GitHub, état, issue).
     */
    contestations: {}[];
    version: number;
  }
  export interface Extrait {
    reformulation: string;
    citation_courte: string | null;
    reformulation_anonymisee: string;
    citation_anonymisee: string | null;
    source: {
      url: string;
      titre: string;
      date_publication: DateIso | null;
      type: 'programme_officiel' | 'texte_signe' | 'declaration_publique' | 'programme_parti';
    };
    date_consultation: DateIso;
    citation_verifiee_mot_a_mot: boolean | null;
  }
  export interface Codeur {
    modele: string;
    code: Code;
    nature: Nature;
    justification: string;
    date: DateIso;
    aveugle: boolean;
  }
}

// ── questions.schema.json
export namespace Questions {
  export type Identifiant = string;
  export type Axe = 'economie' | 'securite' | 'frontieres' | 'europe' | 'ecologie' | 'institutions';
  export type DateIso = string;

  /**
   * data/questions/<theme>.json — une banque de questions par thème. L'identifiant du thème est le nom du fichier (il n'existe pas de themes.json). `origine.source.date_publication` n'est pas encore renseigné dans les fichiers (bilan phase 3, § 4) : il est optionnel ici et signalé en avertissement par le script de validation.
   */
  export interface FichierQuestions {
    _theme: Identifiant;
    _lot: number;
    _statut: string;
    _note: string;
    _equilibre: {
      actives: number;
      suspendues: number;
      archivees?: number;
      sens_plus: number;
      sens_moins: number;
      axes: {
        [k: string]: number;
      };
    };
    /**
     * @minItems 1
     */
    questions: Question[];
  }
  export interface Question {
    id: string;
    theme: Identifiant;
    axe: Axe;
    sens: 1 | -1;
    enonce: string;
    precision: string | null;
    origine: {
      description: string;
      source: {
        url: string;
        titre: string;
        date_publication?: DateIso;
        date_consultation: DateIso;
        nature: 'primaire' | 'secondaire' | 'institutionnelle' | 'source syndicale';
      };
    };
    statut: 'active' | 'suspendue' | 'archivee';
    alertes_neutralite: {
      signalement: string;
      decision: string;
    }[];
    /**
     * Vide dans tous les fichiers (phase 6, indicateur de votes). Forme prévue par le schéma de la phase 1.
     */
    scrutins: {
      scrutin_id: string;
      sens_du_pour: 1 | -1;
    }[];
    historique: ({
      [k: string]: unknown;
    } & {
      date: DateIso;
      ancien_enonce?: string;
      note?: string;
    })[];
  }
}
