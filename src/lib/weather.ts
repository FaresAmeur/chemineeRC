// Service météo — VERSION PRO
// 3 modes exclusifs : fixe / mensuelle / personnalisée
// Température par paliers horaires (pas d'interpolation continue)

import type { WeatherData, WeatherConfig, CustomWeatherPoint } from './types';
import { PARIS_COORDS, PARIS_2025_MONTHLY, SAMPLE_WEATHER_DATA } from './defaults';
import type { Paris2025MonthData } from './defaults';

// ============================================================================
// API PRINCIPALE — Génère les données météo selon le mode choisi
// ============================================================================

/**
 * Retourne les données météo pour la simulation selon le mode configuré.
 * - fixe : un seul point constant (T_ext et vent des conditions initiales)
 * - mensuelle : données Paris 2025 avec paliers horaires
 * - personnalisée : tableau 0h-24h éditable, paliers horaires
 */
export function getWeatherForConfig(
  config: WeatherConfig,
  duration: number,
  fixedTemp: number,
  fixedWind: number,
  humidity: number = 0.65,
  pressure: number = 101325
): WeatherData[] {
  switch (config.mode) {
    case 'fixe':
      return generateFixedWeather(fixedTemp, fixedWind, duration, humidity, pressure);
    case 'mensuelle':
      return generateMonthlyWeather(config.moisIndex, duration, config.heureDebut);
    case 'personnalisee':
      return generateCustomWeather(config.customPoints, duration, config.heureDebut, humidity, pressure);
    default:
      return generateFixedWeather(fixedTemp, fixedWind, duration, humidity, pressure);
  }
}

// ============================================================================
// MODE FIXE — Conditions constantes
// ============================================================================

function generateFixedWeather(
  temperature: number,
  windSpeed: number,
  duration: number,
  humidity: number,
  pressure: number
): WeatherData[] {
  // Un seul point constant — le solveur utilisera cette valeur pour toute la durée
  return [
    {
      timestamp: 0,
      temperature,
      windSpeed,
      humidity,
      pressure,
      description: `Conditions fixes: ${temperature.toFixed(1)}°C, ${windSpeed.toFixed(1)} m/s`,
    },
  ];
}

// ============================================================================
// MODE MENSUEL — Paris 2025, paliers horaires
// ============================================================================

function generateMonthlyWeather(
  monthIndex: number,
  duration: number,
  heureDebut: string
): WeatherData[] {
  const monthData = PARIS_2025_MONTHLY[monthIndex];
  if (!monthData) {
    return generateFixedWeather(15, 2.0, duration, 0.65, 101325);
  }
  return generateDiurnalSteps(monthData, duration, heureDebut);
}

/**
 * Génère des paliers horaires à partir des données mensuelles.
 * Chaque heure a une valeur constante (step function).
 */
function generateDiurnalSteps(
  data: Paris2025MonthData,
  duration: number,
  heureDebut: string
): WeatherData[] {
  const [hh, mm] = heureDebut.split(':').map(Number);
  const startHour = hh + mm / 60;
  const totalHours = Math.ceil(duration / 3600) + 1;
  const result: WeatherData[] = [];

  for (let h = 0; h < totalHours; h++) {
    const hourOfDay = (startHour + h) % 24;

    // Température: sinusoïde entre min et max, pic à 15h
    const tempAmplitude = (data.tempMax - data.tempMin) / 2;
    const tempMid = (data.tempMax + data.tempMin) / 2;
    const tempPhase = ((hourOfDay - 15) * Math.PI) / 12;
    const temperature = Math.round((tempMid + tempAmplitude * Math.cos(tempPhase)) * 10) / 10;

    // Vent: variation modérée, plus fort l'après-midi
    const windBase = data.ventMoyen;
    const windVariation = windBase * 0.3 * Math.sin(((hourOfDay - 14) * Math.PI) / 12);
    const windSpeed = Math.round(Math.max(0.1, windBase + windVariation) * 10) / 10;

    // Humidité: inverse de la température
    const humBase = data.humidite;
    const humVariation = 0.1 * Math.cos(((hourOfDay - 15) * Math.PI) / 12);
    const humidity = Math.max(0.2, Math.min(0.95, humBase + humVariation));

    result.push({
      timestamp: h * 3600,
      temperature,
      windSpeed,
      windDirection: 225,
      humidity,
      pressure: data.pression,
      description: `${data.dateLabel} - ${Math.floor(hourOfDay)}h`,
    });
  }

  return result;
}

// ============================================================================
// MODE PERSONNALISÉ — Tableau 0h-24h, paliers horaires
// ============================================================================

function generateCustomWeather(
  points: CustomWeatherPoint[],
  duration: number,
  heureDebut: string,
  humidity: number,
  pressure: number
): WeatherData[] {
  if (!points || points.length === 0) {
    return generateFixedWeather(15, 2.0, duration, humidity, pressure);
  }

  const [hh, mm] = heureDebut.split(':').map(Number);
  const startHour = hh + mm / 60;
  const totalHours = Math.ceil(duration / 3600) + 1;
  const result: WeatherData[] = [];

  // Trier par heure
  const sorted = [...points].sort((a, b) => a.heure - b.heure);

  for (let h = 0; h < totalHours; h++) {
    const hourOfDay = Math.floor((startHour + h) % 24);

    // Trouver le point correspondant à cette heure (palier = floor)
    let point = sorted[0];
    for (const p of sorted) {
      if (p.heure <= hourOfDay) {
        point = p;
      }
    }

    result.push({
      timestamp: h * 3600,
      temperature: point.temperature,
      windSpeed: point.windSpeed,
      humidity,
      pressure,
      description: `Personnalisé - ${hourOfDay}h`,
    });
  }

  return result;
}

// ============================================================================
// LECTURE MÉTÉO PAR PALIERS HORAIRES (step function)
// ============================================================================

/**
 * Retourne les conditions météo pour un temps de simulation donné.
 * Utilise des paliers horaires : la valeur est constante pendant toute l'heure.
 * Pas d'interpolation continue entre les points.
 */
export function stepWeather(
  data: WeatherData[],
  simTime: number
): { tempExt: number; windSpeed: number; humidity: number; pressure: number } {
  if (data.length === 0) {
    return { tempExt: 15, windSpeed: 2.0, humidity: 0.65, pressure: 101325 };
  }
  if (data.length === 1) {
    return {
      tempExt: data[0].temperature,
      windSpeed: data[0].windSpeed,
      humidity: data[0].humidity,
      pressure: data[0].pressure,
    };
  }

  // Trouver le palier horaire courant (le dernier point dont le timestamp ≤ simTime)
  let point = data[0];
  for (const d of data) {
    if (d.timestamp <= simTime) {
      point = d;
    } else {
      break;
    }
  }

  // Si on dépasse la fin des données, boucler sur 24h
  if (simTime > data[data.length - 1].timestamp && data.length > 1) {
    const totalDuration = data[data.length - 1].timestamp;
    if (totalDuration > 0) {
      const wrappedTime = simTime % totalDuration;
      point = data[0];
      for (const d of data) {
        if (d.timestamp <= wrappedTime) {
          point = d;
        } else {
          break;
        }
      }
    }
  }

  return {
    tempExt: point.temperature,
    windSpeed: point.windSpeed,
    humidity: point.humidity,
    pressure: point.pressure,
  };
}

// ============================================================================
// FONCTIONS LEGACY — conservées pour compatibilité
// ============================================================================

export function getWeatherForMonth(monthIndex: number, duration: number = 86400): WeatherData[] {
  return generateMonthlyWeather(monthIndex, duration, '00:00');
}

export function generateSyntheticWeather(
  baseTemp: number,
  duration: number,
  avgWind: number,
  humidite: number
): WeatherData[] {
  return generateFixedWeather(baseTemp, avgWind, duration, humidite, 101325);
}

export function loadSampleWeather(): WeatherData[] {
  return SAMPLE_WEATHER_DATA;
}

export function interpolateWeatherData(
  weatherData: WeatherData[],
  simTime: number,
  _heureDebut: string = '00:00'
): { tempExt: number; windSpeed: number; humidity: number; pressure: number } {
  return stepWeather(weatherData, simTime);
}

export async function fetchWeather2025Paris(): Promise<WeatherData[]> {
  // Fallback sur données synthétiques — l'API n'est plus nécessaire
  return PARIS_2025_MONTHLY.map((data, month) => ({
    timestamp: month * 30 * 24 * 3600,
    temperature: data.tempMoyenne,
    windSpeed: data.ventMoyen,
    windDirection: 225,
    humidity: data.humidite,
    pressure: data.pression,
    description: data.mois,
  }));
}

export async function fetchWeatherFromOpenMeteo(
  _startDate: string = '2025-01-15',
  _endDate: string = '2025-12-15',
  _lat: number = PARIS_COORDS.lat,
  _lon: number = PARIS_COORDS.lon
): Promise<WeatherData[]> {
  return fetchWeather2025Paris();
}
