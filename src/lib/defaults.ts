// Paramètres par défaut — VERSION PRO OPTIMISÉE
// Maillage réduit, fan auto/bas/aspiration, weatherConfig

import type { AllParameters, WeatherData, CustomWeatherPoint } from './types';
import { MATERIAUX_PREDEFINIS } from './types';

// =============================================================================
// POINTS MÉTÉO PERSONNALISÉE PAR DÉFAUT (journée type hiver)
// =============================================================================

export const DEFAULT_CUSTOM_WEATHER: CustomWeatherPoint[] = Array.from(
  { length: 25 },
  (_, h) => {
    // Variation sinusoïdale typique : min à 6h, max à 15h
    const tempMid = 8;
    const tempAmp = 4;
    const phase = ((h - 15) * Math.PI) / 12;
    const temperature = tempMid + tempAmp * Math.cos(phase);
    const windSpeed = Math.max(0.2, 2.0 + 0.8 * Math.sin(((h - 14) * Math.PI) / 12));
    return { heure: h, temperature: Math.round(temperature * 10) / 10, windSpeed: Math.round(windSpeed * 10) / 10 };
  }
);

// =============================================================================
// PARAMÈTRES PAR DÉFAUT
// =============================================================================

export const DEFAULT_PARAMS: AllParameters = {
  geometry: {
    hauteurTotale: 20.0, // m
    hauteurToit: 19.0, // m
    diametreInterieur: 0.15, // m
    epaisseurBoisseau: 0.22, // m
    rugositeRelative: 0.01, // Rugosité maçonnerie typique (ε/D ≈ 0.01-0.02)
    angleCoude: 45,
    positionCoude: 0.5, // m depuis le bas
    segmentsVerticaux: 20, // Résolution optimisée (était 50)
    noeudsRadiaux: 4, // Suffisant pour gradient radial (était 8)
  },

  material: MATERIAUX_PREDEFINIS.terre_cuite,

  fan: {
    position: 'bas',
    mode: 'aspiration',
    modeControle: 'auto',
    actifManuel: false,
    actif: false,
    pressionMax: 150,
    debitMax: 0.1, // ~360 m3/h
    puissance: 50,
    rendement: 0.7,
  },

  initial: {
    tempAirInit: 20.0, // °C
    tempBoisseauInit: 18.0, // °C (sera recalculé dynamiquement)
    tempAppartementInit: 22.0, // °C
    tempExtBase: 8.0, // °C (utilisé en mode fixe)
    vitesseVent: 2.0, // m/s (utilisé en mode fixe)
    humiditeRelative: 0.65, // 65%
    pressionAtm: 101325, // Pa
  },

  appartement: {
    volume: 60, // m³ (≈ 25 m² × 2.4 m)
    surfaceSol: 25, // m²
    hauteurSousPlafond: 2.4, // m
    renouvellementAirNaturel: 0.5, // vol/h (infiltrations)
    inertieThermique: 500, // Wh/K (capacité thermique meubles + structure légère)
    pertesEnveloppe: 50, // W/K (déperditions globales)
  },

  simulation: {
    dt: 2.0, // s — semi-implicite le permet (était 0.5)
    dtMin: 0.05, // s
    dtMax: 30.0, // s
    duree: 3600 * 6, // 6 heures par défaut
    adaptatif: true,
    mode: 'stable',
  },

  weatherConfig: {
    mode: 'fixe',
    moisIndex: 0, // Janvier
    heureDebut: '00:00',
    customPoints: DEFAULT_CUSTOM_WEATHER,
  },
};

// ============================================================================
// DONNÉES MÉTÉO PARIS 2025 — Le 15 de chaque mois
// Basées sur normales climatiques historiques + données Open-Meteo
// ============================================================================

export interface Paris2025MonthData {
  mois: string;
  moisIndex: number; // 0-11
  dateLabel: string; // ex: "15 janvier 2025"
  tempMoyenne: number; // °C température moyenne journalière
  tempMin: number; // °C
  tempMax: number; // °C
  ventMoyen: number; // m/s
  humidite: number; // fraction 0-1
  pression: number; // Pa
}

export const PARIS_2025_MONTHLY: Paris2025MonthData[] = [
  { mois: 'Janvier',   moisIndex: 0,  dateLabel: '15 janvier 2025',   tempMoyenne: 4.5,  tempMin: 1.5,  tempMax: 7.5,  ventMoyen: 4.2, humidite: 0.85, pression: 101500 },
  { mois: 'Février',   moisIndex: 1,  dateLabel: '15 février 2025',   tempMoyenne: 5.8,  tempMin: 2.5,  tempMax: 9.0,  ventMoyen: 4.0, humidite: 0.80, pression: 101800 },
  { mois: 'Mars',      moisIndex: 2,  dateLabel: '15 mars 2025',      tempMoyenne: 9.5,  tempMin: 5.0,  tempMax: 14.0, ventMoyen: 4.5, humidite: 0.70, pression: 101600 },
  { mois: 'Avril',     moisIndex: 3,  dateLabel: '15 avril 2025',     tempMoyenne: 12.5, tempMin: 7.5,  tempMax: 17.5, ventMoyen: 4.1, humidite: 0.65, pression: 101700 },
  { mois: 'Mai',       moisIndex: 4,  dateLabel: '15 mai 2025',       tempMoyenne: 16.5, tempMin: 11.0, tempMax: 22.0, ventMoyen: 3.8, humidite: 0.65, pression: 101600 },
  { mois: 'Juin',      moisIndex: 5,  dateLabel: '15 juin 2025',      tempMoyenne: 20.0, tempMin: 14.5, tempMax: 25.5, ventMoyen: 3.5, humidite: 0.60, pression: 101700 },
  { mois: 'Juillet',   moisIndex: 6,  dateLabel: '15 juillet 2025',   tempMoyenne: 22.5, tempMin: 16.5, tempMax: 28.5, ventMoyen: 3.3, humidite: 0.55, pression: 101700 },
  { mois: 'Août',      moisIndex: 7,  dateLabel: '15 août 2025',      tempMoyenne: 22.0, tempMin: 16.0, tempMax: 28.0, ventMoyen: 3.2, humidite: 0.58, pression: 101700 },
  { mois: 'Septembre', moisIndex: 8,  dateLabel: '15 septembre 2025', tempMoyenne: 18.0, tempMin: 13.0, tempMax: 23.0, ventMoyen: 3.5, humidite: 0.65, pression: 101700 },
  { mois: 'Octobre',   moisIndex: 9,  dateLabel: '15 octobre 2025',   tempMoyenne: 13.5, tempMin: 9.0,  tempMax: 18.0, ventMoyen: 3.8, humidite: 0.75, pression: 101700 },
  { mois: 'Novembre',  moisIndex: 10, dateLabel: '15 novembre 2025',  tempMoyenne: 8.0,  tempMin: 4.5,  tempMax: 11.5, ventMoyen: 4.0, humidite: 0.82, pression: 101600 },
  { mois: 'Décembre',  moisIndex: 11, dateLabel: '15 décembre 2025',  tempMoyenne: 5.2,  tempMin: 2.0,  tempMax: 8.5,  ventMoyen: 4.1, humidite: 0.85, pression: 101500 },
];

// ============================================================================
// SCÉNARIOS MÉTÉO PRÉDÉFINIS (pour mode fixe)
// ============================================================================

export const METEO_SCENARIOS = {
  nuit_froide: {
    nom: 'Nuit froide d\'hiver',
    tempBase: 2.0,
    vent: 0.5,
    humidite: 0.85,
    description: 'Nuit d\'hiver typique à Paris, tirage naturel important',
  },
  jour_hiver: {
    nom: 'Journée d\'hiver',
    tempBase: 6.0,
    vent: 1.5,
    humidite: 0.75,
    description: 'Journée d\'hiver grise, faible tirage naturel',
  },
  nuit_ete: {
    nom: 'Nuit d\'été',
    tempBase: 18.0,
    vent: 0.3,
    humidite: 0.65,
    description: 'Nuit d\'été chaude, tirage naturel inversé possible',
  },
  canicule: {
    nom: 'Canicule',
    tempBase: 35.0,
    vent: 0.2,
    humidite: 0.35,
    description: 'Journée de canicule, pas de tirage naturel',
  },
  venteux: {
    nom: 'Journée venteuse',
    tempBase: 12.0,
    vent: 5.0,
    humidite: 0.55,
    description: 'Fort vent, refroidissement externe important',
  },
};

// ============================================================================
// DONNÉES MÉTÉO PARIS (24h typiques) — fallback
// ============================================================================

export const SAMPLE_WEATHER_DATA: WeatherData[] = [
  { timestamp: 0, temperature: 15, windSpeed: 1.0, humidity: 0.65, pressure: 101300 },
  { timestamp: 3600, temperature: 14, windSpeed: 0.8, humidity: 0.70, pressure: 101320 },
  { timestamp: 7200, temperature: 13, windSpeed: 0.6, humidity: 0.75, pressure: 101340 },
  { timestamp: 10800, temperature: 12, windSpeed: 0.5, humidity: 0.80, pressure: 101350 },
  { timestamp: 14400, temperature: 11, windSpeed: 0.4, humidity: 0.80, pressure: 101350 },
  { timestamp: 18000, temperature: 11, windSpeed: 0.5, humidity: 0.78, pressure: 101340 },
  { timestamp: 21600, temperature: 12, windSpeed: 0.8, humidity: 0.75, pressure: 101320 },
  { timestamp: 25200, temperature: 14, windSpeed: 1.2, humidity: 0.70, pressure: 101300 },
  { timestamp: 28800, temperature: 16, windSpeed: 1.8, humidity: 0.65, pressure: 101280 },
  { timestamp: 32400, temperature: 18, windSpeed: 2.0, humidity: 0.60, pressure: 101260 },
  { timestamp: 36000, temperature: 20, windSpeed: 2.2, humidity: 0.55, pressure: 101250 },
  { timestamp: 39600, temperature: 21, windSpeed: 2.5, humidity: 0.50, pressure: 101240 },
  { timestamp: 43200, temperature: 22, windSpeed: 2.3, humidity: 0.50, pressure: 101240 },
  { timestamp: 46800, temperature: 22, windSpeed: 2.1, humidity: 0.55, pressure: 101250 },
  { timestamp: 50400, temperature: 21, windSpeed: 1.8, humidity: 0.60, pressure: 101270 },
  { timestamp: 54000, temperature: 19, windSpeed: 1.5, humidity: 0.65, pressure: 101290 },
  { timestamp: 57600, temperature: 17, windSpeed: 1.2, humidity: 0.70, pressure: 101310 },
  { timestamp: 61200, temperature: 15, windSpeed: 1.0, humidity: 0.72, pressure: 101320 },
  { timestamp: 64800, temperature: 14, windSpeed: 0.8, humidity: 0.75, pressure: 101330 },
  { timestamp: 68400, temperature: 13, windSpeed: 0.7, humidity: 0.78, pressure: 101340 },
  { timestamp: 72000, temperature: 12, windSpeed: 0.6, humidity: 0.80, pressure: 101350 },
  { timestamp: 75600, temperature: 11, windSpeed: 0.5, humidity: 0.82, pressure: 101360 },
  { timestamp: 79200, temperature: 11, windSpeed: 0.5, humidity: 0.80, pressure: 101360 },
  { timestamp: 82800, temperature: 12, windSpeed: 0.7, humidity: 0.78, pressure: 101350 },
];

// Coordonnées Paris
export const PARIS_COORDS = {
  lat: 48.8566,
  lon: 2.3522,
  timezone: 'Europe/Paris',
};
