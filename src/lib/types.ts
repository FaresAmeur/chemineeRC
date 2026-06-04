// Types et interfaces pour le simulateur de cheminée — VERSION PRO OPTIMISÉE

// =============================================================================
// GÉOMÉTRIE
// =============================================================================

export interface GeometryParams {
  hauteurTotale: number; // m (20 m par défaut)
  hauteurToit: number; // m (hauteur jusqu'au toit, 19m)
  diametreInterieur: number; // m (0.15 m par défaut)
  epaisseurBoisseau: number; // m (0.22 m par défaut)
  rugositeRelative: number; // ε/D sans unité
  angleCoude: number; // degrés (45° par défaut)
  positionCoude: number; // m depuis le bas (0.5 m par défaut)
  segmentsVerticaux: number; // nombre de segments de discrétisation (20)
  noeudsRadiaux: number; // noeuds dans l'épaisseur du boisseau (4)
}

// =============================================================================
// MATÉRIAUX
// =============================================================================

export interface MaterialParams {
  nom: string;
  densite: number; // kg/m³
  cp: number; // J/kg·K
  conductivite: number; // W/m·K
  emissivite: number; // pour rayonnement (0-1)
}

export const MATERIAUX_PREDEFINIS: Record<string, MaterialParams> = {
  terre_cuite: {
    nom: 'Terre cuite',
    densite: 1800,
    cp: 840,
    conductivite: 0.72,
    emissivite: 0.9,
  },
  beton: {
    nom: 'Béton',
    densite: 2200,
    cp: 880,
    conductivite: 1.4,
    emissivite: 0.85,
  },
  inox: {
    nom: 'Inox',
    densite: 7900,
    cp: 500,
    conductivite: 15,
    emissivite: 0.2,
  },
  brique: {
    nom: 'Brique réfractaire',
    densite: 2000,
    cp: 900,
    conductivite: 1.0,
    emissivite: 0.85,
  },
};

// =============================================================================
// VENTILATEUR
// =============================================================================

export interface FanParams {
  position: 'haut' | 'bas'; // position physique du ventilateur
  mode: 'aspiration' | 'poussee'; // action locale du ventilateur
  modeControle: 'auto' | 'manuel'; // logique de contrôle
  actifManuel: boolean; // état forcé en mode manuel
  actif: boolean; // état réel actuel calculé par le solveur
  pressionMax: number; // Pa (pression max à débit nul)
  debitMax: number; // m³/s (débit max à pression nulle)
  puissance: number; // W (puissance électrique)
  rendement: number; // rendement du ventilateur (0-1)
}

// =============================================================================
// CONDITIONS INITIALES
// =============================================================================

export interface InitialConditions {
  tempAirInit: number; // °C
  tempBoisseauInit: number; // °C
  tempAppartementInit: number; // °C
  tempExtBase: number; // °C (utilisé en mode fixe comme T_ext permanente)
  vitesseVent: number; // m/s (utilisé en mode fixe comme vent permanent)
  humiditeRelative: number; // fraction 0-1
  pressionAtm: number; // Pa
}

// =============================================================================
// PARAMÈTRES APPARTEMENT
// =============================================================================

export interface AppartementParams {
  volume: number; // m³
  surfaceSol: number; // m²
  hauteurSousPlafond: number; // m
  renouvellementAirNaturel: number; // vol/h (infiltrations)
  inertieThermique: number; // Wh/K (capacité thermique meubles + structure)
  pertesEnveloppe: number; // W/K (déperditions vers extérieur)
}

// =============================================================================
// MÉTÉO — 3 MODES EXCLUSIFS
// =============================================================================

export type WeatherMode = 'fixe' | 'mensuelle' | 'personnalisee';

/** Point météo personnalisable pour une heure donnée */
export interface CustomWeatherPoint {
  heure: number; // 0–24
  temperature: number; // °C
  windSpeed: number; // m/s
}

/** Configuration météo — détermine la source de T_ext et vent */
export interface WeatherConfig {
  mode: WeatherMode;
  moisIndex: number; // 0-11 pour mode mensuelle (Paris 2025)
  heureDebut: string; // "HH:mm" — heure de début de la simulation dans la journée
  customPoints: CustomWeatherPoint[]; // tableau 0h-24h pour mode personnalisée
}

// =============================================================================
// SIMULATION
// =============================================================================

export type SimulationMode = 'stable' | 'rapide' | 'precis';

export interface SimulationParams {
  dt: number; // s (pas de temps initial, 2.0s pour semi-implicite)
  dtMin: number; // s (pas de temps minimal pour stabilité)
  dtMax: number; // s (pas de temps maximal)
  duree: number; // s (durée totale)
  adaptatif: boolean; // activer timestep adaptatif
  mode: SimulationMode; // mode de simulation (stable/rapide/precis)
}

// =============================================================================
// DONNÉES MÉTÉO INTERNES
// =============================================================================

export interface WeatherData {
  timestamp: number; // s depuis début simulation
  temperature: number; // °C
  windSpeed: number; // m/s
  windDirection?: number; // degrés
  humidity: number; // fraction 0-1
  pressure: number; // Pa
  description?: string; // description météo
}

// =============================================================================
// PROPRIÉTÉS AIR CACHÉES (calculées 1 fois par pas)
// =============================================================================

export interface AirProps {
  rho: number; // kg/m³
  mu: number; // Pa·s
  cp: number; // J/kg·K
  k: number; // W/m·K
}

// =============================================================================
// ÉTAT DE SIMULATION — DISTRIBUTED MODEL
// =============================================================================

export interface SimulationState {
  temps: number; // s

  // Températures distribuées le long du conduit
  tempAir: number[]; // °C par segment
  tempBoisseauInterne: number[]; // °C par segment (face interne)
  tempBoisseauExterne: number[]; // °C par segment (face externe)
  tempBoisseau: number[][]; // °C [segment][noeud radial]

  // Appartement
  tempAppartement: number; // °C

  // Hydraulique
  vitesse: number; // m/s
  debitVolmique: number; // m³/s
  debitMassique: number; // kg/s
  reynolds: number;
  regimeEcoulement: 'laminaire' | 'transition' | 'turbulent';

  // Thermique
  nusselt: number;
  hi: number; // W/m²K (convection interne)
  he: number; // W/m²K (convection externe)

  // Pressions
  pressionTirage: number; // Pa
  pressionVentilateur: number; // Pa
  pertesChargeTotal: number; // Pa
  pertesChargeReparties: number; // Pa
  pertesChargeSingulieres: number; // Pa
  residuPression: number; // Pa
  pressionProfil: PressionZ[]; // Profil de pression vertical

  // Bilan énergétique
  puissanceThermique: number; // W
  energieEchangee: number; // J (énergie échangée cumulée)
  energieVersAppartement: number; // J
  erreurEnergiePas: number; // J
  erreurEnergiePct: number; // %

  // Indicateurs
  tempAirSortie: number; // °C
  tempMoyenneBoisseau: number; // °C
  tempExt: number; // °C
  windSpeed: number; // m/s

  // Validation
  cflStable: boolean;
  conserveEnergie: boolean;
  warnings: string[];

  // Numérique
  dtEffectif: number; // s (pas de temps réellement utilisé)
  cflCourant: number; // CFL du dernier sous-pas
  sousIterations: number; // nombre de sous-pas effectués
}

// =============================================================================
// PARAMÈTRES COMPLETS
// =============================================================================

export interface AllParameters {
  geometry: GeometryParams;
  material: MaterialParams;
  fan: FanParams;
  initial: InitialConditions;
  appartement: AppartementParams;
  simulation: SimulationParams;
  weatherConfig: WeatherConfig;
}

// =============================================================================
// CONSTANTES PHYSIQUES
// =============================================================================

export const CONSTANTS = {
  g: 9.81, // m/s²
  R_air: 287, // J/kg·K (constante gaz parfait air)
  P_atm: 101325, // Pa
  cp_air: 1005, // J/kg·K
  cv_air: 718, // J/kg·K
  Pr_air: 0.71, // Prandtl
  Stefan_Boltzmann: 5.67e-8, // W/m²K⁴
};

// =============================================================================
// COEFFICIENTS DE PERTES SINGULIÈRES
// =============================================================================

export const COEFFICIENTS_K = {
  entree: 0.5, // entrée conduite
  sortie: 1.0, // sortie libre
  coude45: 0.3, // coude 45°
  coude90: 0.75, // coude 90°
  sortieToit: 0.5, // traversée toiture
};

// =============================================================================
// VALIDATION RESULTS
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  regimeEcoulement: 'laminaire' | 'transition' | 'turbulent';
  cflValue: number;
  energieConserved: boolean;
}

// =============================================================================
// PROFIL DE PRESSION
// =============================================================================

export interface PressionZ {
  z: number; // Hauteur depuis le bas (m)
  pressionStatique: number; // Pression statique relative à P_atm (Pa)
  perteCumulee: number; // Pertes de charge cumulées depuis l'entrée (Pa)
  tirageCumule: number; // Tirage thermique cumulé (Pa)
  ventilateur: number; // Différence due au ventilateur (Pa)
  venturi: number; // Effet venturi (Pa) en sortie
}
