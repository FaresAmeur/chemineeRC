import type { AllParameters, SimulationState, WeatherData } from './types';
import { initSimulation, pasSimulation, resetSolverCache } from './solver';
import { stepWeather } from './weather';

export type TestCategory = 'numerical' | 'physical' | 'ui' | 'performance';
export type TestStatus = 'pending' | 'running' | 'pass' | 'fail';

export interface ValidationMetrics {
  cflMax: number;
  dtMin: number;
  dtMax: number;
  energyError: number;
  tempMin: number;
  tempMax: number;
  pressureResidual: number;
  reynoldsMax: number;
  oscillationScore: number;
  runtimeMs: number;
  flowMin: number;
  flowMax: number;
  subIterationsMax: number;
}

export interface ValidationTestResult {
  id: string;
  name: string;
  category: TestCategory;
  pass: boolean;
  errors: string[];
  warnings: string[];
  metrics: ValidationMetrics;
  alerts: string[];
}

export interface ValidationTestCase {
  id: string;
  name: string;
  category: TestCategory;
  params: AllParameters;
  monthIndex: number;
  maxRuntimeMs: number;
  checks: Array<(ctx: ScenarioContext) => string | null>;
}

export interface ScenarioContext {
  test: ValidationTestCase;
  states: SimulationState[];
  metrics: ValidationMetrics;
  params: AllParameters;
}

export interface ValidationProgress {
  total: number;
  completed: number;
  current?: string;
  results: ValidationTestResult[];
}

export interface ValidationReportSummary {
  total: number;
  passed: number;
  failed: number;
  reliabilityScore: number;
  averageRuntimeMs: number;
  worstCfl: ValidationTestResult | null;
  worstEnergy: ValidationTestResult | null;
  mostUnstable: ValidationTestResult | null;
  bestScenario: ValidationTestResult | null;
  worstScenario: ValidationTestResult | null;
  mostRealistic: ValidationTestResult | null;
  recommendations: string[];
}

const START_HOURS = ['00:00', '03:00', '06:00', '12:00', '18:00', '21:00'];
const DURATIONS = [
  { label: '15 min', seconds: 15 * 60 },
  { label: '1 h', seconds: 3600 },
  { label: '2 h', seconds: 2 * 3600 },
  { label: '6 h', seconds: 6 * 3600 },
  { label: '12 h', seconds: 12 * 3600 },
  { label: '24 h', seconds: 24 * 3600 },
];

function runtimeBudget(category: TestCategory, durationSeconds: number): number {
  if (category === 'performance') return 60000;
  if (durationSeconds <= 15 * 60) return 7000;
  if (durationSeconds <= 2 * 3600) return 12000;
  return 20000;
}

const emptyMetrics = (): ValidationMetrics => ({
  cflMax: 0,
  dtMin: Number.POSITIVE_INFINITY,
  dtMax: 0,
  energyError: 0,
  tempMin: Number.POSITIVE_INFINITY,
  tempMax: Number.NEGATIVE_INFINITY,
  pressureResidual: 0,
  reynoldsMax: 0,
  oscillationScore: 0,
  runtimeMs: 0,
  flowMin: Number.POSITIVE_INFINITY,
  flowMax: Number.NEGATIVE_INFINITY,
  subIterationsMax: 0,
});

const cloneParams = (params: AllParameters): AllParameters => ({
  geometry: { ...params.geometry },
  material: { ...params.material },
  fan: { ...params.fan },
  initial: { ...params.initial },
  appartement: { ...params.appartement },
  simulation: { ...params.simulation },
  weatherConfig: { ...params.weatherConfig },
});

function withScenario(
  base: AllParameters,
  patch: (params: AllParameters) => void
): AllParameters {
  const next = cloneParams(base);
  applyValidationProfile(next);
  patch(next);
  return next;
}

function applyValidationProfile(params: AllParameters) {
  params.geometry.segmentsVerticaux = Math.min(params.geometry.segmentsVerticaux, 10);
  params.geometry.noeudsRadiaux = Math.min(params.geometry.noeudsRadiaux, 4);
  params.simulation.mode = 'rapide';
  params.simulation.adaptatif = true;
  params.simulation.dt = Math.max(params.simulation.dt, 2);
}

function collectMetrics(states: SimulationState[], runtimeMs: number): ValidationMetrics {
  const metrics = emptyMetrics();
  let previousOutlet: number | null = null;
  let directionChanges = 0;
  let previousDelta = 0;
  const energyErrors: number[] = [];

  for (const state of states) {
    metrics.cflMax = Math.max(metrics.cflMax, Math.abs(state.cflCourant));
    metrics.dtMin = Math.min(metrics.dtMin, state.dtEffectif);
    metrics.dtMax = Math.max(metrics.dtMax, state.dtEffectif);
    if (Math.abs(state.puissanceThermique) > 5 || Math.abs(state.debitMassique) > 1e-4) {
      energyErrors.push(Math.abs(state.erreurEnergiePct));
    }
    metrics.tempMin = Math.min(metrics.tempMin, ...state.tempAir, ...state.tempBoisseauInterne, state.tempAppartement);
    metrics.tempMax = Math.max(metrics.tempMax, ...state.tempAir, ...state.tempBoisseauInterne, state.tempAppartement);
    metrics.pressureResidual = Math.max(metrics.pressureResidual, Math.abs(state.residuPression));
    metrics.reynoldsMax = Math.max(metrics.reynoldsMax, state.reynolds);
    metrics.flowMin = Math.min(metrics.flowMin, state.debitVolmique);
    metrics.flowMax = Math.max(metrics.flowMax, state.debitVolmique);
    metrics.subIterationsMax = Math.max(metrics.subIterationsMax, state.sousIterations);

    if (previousOutlet !== null) {
      const delta = state.tempAirSortie - previousOutlet;
      if (previousDelta !== 0 && Math.sign(delta) !== Math.sign(previousDelta) && Math.abs(delta) > 0.05) {
        directionChanges += 1;
      }
      previousDelta = delta;
    }
    previousOutlet = state.tempAirSortie;
  }

  const usableEnergyErrors = energyErrors.length > 0
    ? energyErrors
    : states.map(state => Math.abs(state.erreurEnergiePct));

  if (usableEnergyErrors.length > 0) {
    const sortedEnergy = [...usableEnergyErrors].sort((a, b) => a - b);
    const p95Index = Math.min(sortedEnergy.length - 1, Math.floor(sortedEnergy.length * 0.95));
    metrics.energyError = sortedEnergy[p95Index];
  }

  metrics.oscillationScore = states.length > 1 ? directionChanges / (states.length - 1) : 0;
  metrics.runtimeMs = runtimeMs;
  if (!Number.isFinite(metrics.dtMin)) metrics.dtMin = 0;
  if (!Number.isFinite(metrics.flowMin)) metrics.flowMin = 0;
  if (!Number.isFinite(metrics.flowMax)) metrics.flowMax = 0;
  return metrics;
}

const finiteStateCheck = (ctx: ScenarioContext): string | null => {
  const hasInvalid = ctx.states.some(state => [
    state.temps,
    state.vitesse,
    state.debitVolmique,
    state.erreurEnergiePct,
    state.residuPression,
    ...state.tempAir,
    ...state.tempBoisseauInterne,
    ...state.tempBoisseauExterne,
  ].some(value => !Number.isFinite(value)));
  return hasInvalid ? 'Valeur NaN ou infinie detectee dans le solveur.' : null;
};

const cflCheck = (ctx: ScenarioContext): string | null =>
  ctx.metrics.cflMax > 1 ? `CFL max ${ctx.metrics.cflMax.toFixed(2)} > 1.` : null;

const energyCheck = (ctx: ScenarioContext): string | null =>
  ctx.metrics.energyError > 5 ? `Erreur energetique max ${ctx.metrics.energyError.toFixed(1)}% > 5%.` : null;

const physicalTemperatureCheck = (ctx: ScenarioContext): string | null => {
  const tolerance = 0.35;
  for (const state of ctx.states) {
    const wallMin = Math.min(...state.tempBoisseauInterne, ...state.tempBoisseauExterne);
    const lowerBound = Math.min(
      state.tempExt,
      wallMin,
      ctx.params.initial.tempAirInit,
      ctx.params.initial.tempAppartementInit
    ) - tolerance;
    if (Math.min(...state.tempAir) < lowerBound) {
      return `Air sous la borne physique: ${Math.min(...state.tempAir).toFixed(2)} C < ${lowerBound.toFixed(2)} C.`;
    }
  }
  return null;
};

const fanFlowCheck = (ctx: ScenarioContext): string | null => {
  const fanShouldRun = ctx.params.fan.actif || ctx.params.fan.actifManuel || ctx.params.fan.modeControle === 'auto';
  if (fanShouldRun && Math.max(Math.abs(ctx.metrics.flowMin), Math.abs(ctx.metrics.flowMax)) < 1e-5) {
    return 'Ventilateur attendu actif mais debit quasi nul sur tout le scenario.';
  }
  return null;
};

const uiRuntimeCheck = (): string | null => {
  if (typeof document === 'undefined') return null;
  const root = document.documentElement;
  if (root.scrollWidth > root.clientWidth + 2) {
    return `Overflow horizontal UI: ${root.scrollWidth}px > ${root.clientWidth}px.`;
  }
  const labels = ['Lancer', 'CSV', 'Validation'];
  const text = document.body.textContent ?? '';
  const missing = labels.filter(label => !text.includes(label));
  return missing.length > 0 ? `Controles UI introuvables: ${missing.join(', ')}.` : null;
};

const visualRuntimeCheck = (): string | null => {
  if (typeof document === 'undefined') return null;
  const clipped = Array.from(document.querySelectorAll('button, canvas, svg, [class*="plot"]')).some(element => {
    const rect = element.getBoundingClientRect();
    return rect.width < 0 || rect.height < 0;
  });
  return clipped ? 'Element visuel avec dimensions invalides detecte.' : null;
};

const resumeCheck = (ctx: ScenarioContext): string | null => {
  const mid = Math.floor(ctx.states.length / 2);
  const before = ctx.states[mid]?.temps ?? 0;
  const after = ctx.states[mid + 1]?.temps ?? before;
  return after < before ? `Temps apres reprise ${after.toFixed(2)} < temps en pause ${before.toFixed(2)}.` : null;
};

const flowDirectionCheck = (expected: 'up' | 'down') => (ctx: ScenarioContext): string | null => {
  const final = ctx.states[ctx.states.length - 1];
  if (!final || Math.abs(final.vitesse) < 0.005) return 'Debit trop faible pour valider le sens du flux.';
  if (expected === 'up' && final.vitesse < 0) return `Flux descendant observe (${final.vitesse.toFixed(3)} m/s), flux montant attendu.`;
  if (expected === 'down' && final.vitesse > 0) return `Flux montant observe (${final.vitesse.toFixed(3)} m/s), flux descendant attendu.`;
  return null;
};

const commonChecks = [finiteStateCheck, cflCheck, energyCheck, physicalTemperatureCheck];

export function createValidationMatrix(baseParams: AllParameters): ValidationTestCase[] {
  const tests: ValidationTestCase[] = [];

  START_HOURS.forEach(hour => {
    DURATIONS.forEach(duration => {
      tests.push({
        id: `temporal-${hour}-${duration.seconds}`,
        name: `Temps ${hour} / ${duration.label}`,
        category: 'numerical',
        monthIndex: 0,
        maxRuntimeMs: runtimeBudget('numerical', duration.seconds),
        params: withScenario(baseParams, p => {
          p.weatherConfig.heureDebut = hour;
          p.simulation.duree = duration.seconds;
          p.simulation.adaptatif = true;
          p.simulation.mode = 'rapide';
        }),
        checks: [...commonChecks, resumeCheck],
      });
    });
  });

  const fanScenarios: Array<[string, string, AllParameters['fan']['position'], AllParameters['fan']['mode']]> = [
    ['fan-bottom-suction', 'Ventilateur bas aspiration', 'bas', 'aspiration'],
    ['fan-bottom-push', 'Ventilateur bas poussee', 'bas', 'poussee'],
    ['fan-top-suction', 'Ventilateur haut aspiration', 'haut', 'aspiration'],
    ['fan-top-push', 'Ventilateur haut poussee', 'haut', 'poussee'],
  ];

  fanScenarios.forEach(([id, name, position, mode]) => {
    tests.push({
      id,
      name,
      category: 'physical',
      monthIndex: 0,
      params: withScenario(baseParams, p => {
        p.fan.position = position;
        p.fan.mode = mode;
        p.fan.modeControle = 'manuel';
        p.fan.actifManuel = true;
        p.fan.actif = true;
        p.simulation.duree = 1800;
      }),
      maxRuntimeMs: runtimeBudget('physical', 1800),
      checks: [...commonChecks, fanFlowCheck],
    });
  });

  tests.push(
    {
      id: 'natural-draft',
      name: 'Ventilateur OFF, tirage naturel',
      category: 'physical',
      monthIndex: 0,
      maxRuntimeMs: runtimeBudget('physical', 1800),
      params: withScenario(baseParams, p => {
        p.fan.actif = false;
        p.fan.actifManuel = false;
        p.fan.modeControle = 'manuel';
        p.initial.tempAppartementInit = 22;
        p.initial.tempExtBase = 2;
        p.simulation.duree = 1800;
      }),
      checks: [...commonChecks, flowDirectionCheck('up')],
    },
    {
      id: 'cold-weather',
      name: 'Meteo froide',
      category: 'physical',
      monthIndex: 0,
      maxRuntimeMs: runtimeBudget('physical', 3600),
      params: withScenario(baseParams, p => {
        p.initial.tempExtBase = 2;
        p.initial.vitesseVent = 4.2;
        p.simulation.duree = 3600;
      }),
      checks: commonChecks,
    },
    {
      id: 'temperate-weather',
      name: 'Meteo temperee',
      category: 'physical',
      monthIndex: 4,
      maxRuntimeMs: runtimeBudget('physical', 3600),
      params: withScenario(baseParams, p => {
        p.initial.tempExtBase = 16;
        p.initial.vitesseVent = 3.8;
        p.simulation.duree = 3600;
      }),
      checks: commonChecks,
    },
    {
      id: 'hot-weather',
      name: 'Meteo chaude',
      category: 'physical',
      monthIndex: 6,
      maxRuntimeMs: runtimeBudget('physical', 3600),
      params: withScenario(baseParams, p => {
        p.initial.tempExtBase = 30;
        p.initial.tempAirInit = 22;
        p.initial.tempAppartementInit = 22;
        p.initial.vitesseVent = 0;
        p.fan.actif = false;
        p.fan.actifManuel = false;
        p.fan.modeControle = 'manuel';
        p.weatherConfig.heureDebut = '12:00';
        p.simulation.duree = 3600;
      }),
      checks: commonChecks,
    },
    {
      id: 'cfl-extreme',
      name: 'CFL extreme avec sous-iterations',
      category: 'numerical',
      monthIndex: 0,
      maxRuntimeMs: runtimeBudget('numerical', 900),
      params: withScenario(baseParams, p => {
        p.fan.actif = true;
        p.fan.actifManuel = true;
        p.fan.pressionMax = 600;
        p.geometry.segmentsVerticaux = 40;
        p.simulation.dt = 30;
        p.simulation.duree = 900;
        p.simulation.adaptatif = true;
      }),
      checks: commonChecks,
    },
    {
      id: 'auto-fan-hysteresis',
      name: 'Mode automatique ventilateur',
      category: 'physical',
      monthIndex: 0,
      maxRuntimeMs: runtimeBudget('physical', 1800),
      params: withScenario(baseParams, p => {
        p.fan.modeControle = 'auto';
        p.fan.actifManuel = false;
        p.initial.tempAppartementInit = 22;
        p.simulation.duree = 1800;
      }),
      checks: [...commonChecks, fanFlowCheck],
    },
    {
      id: 'ui-controls',
      name: 'Fonctions UI et navigation',
      category: 'ui',
      monthIndex: 0,
      maxRuntimeMs: runtimeBudget('ui', 900),
      params: withScenario(baseParams, p => {
        p.weatherConfig.heureDebut = '21:00';
        p.simulation.duree = 900;
        p.simulation.dt = 1;
      }),
      checks: [...commonChecks, uiRuntimeCheck],
    },
    {
      id: 'visual-responsive',
      name: 'Visuels et responsive',
      category: 'ui',
      monthIndex: 0,
      maxRuntimeMs: runtimeBudget('ui', 900),
      params: withScenario(baseParams, p => {
        p.simulation.duree = 900;
      }),
      checks: [...commonChecks, uiRuntimeCheck, visualRuntimeCheck],
    },
    {
      id: 'performance-long',
      name: 'Performance longue duree 48h',
      category: 'performance',
      monthIndex: 0,
      maxRuntimeMs: runtimeBudget('performance', 48 * 3600),
      params: withScenario(baseParams, p => {
        p.simulation.duree = 48 * 3600;
        p.simulation.adaptatif = true;
        p.geometry.segmentsVerticaux = 8;
        p.geometry.noeudsRadiaux = 3;
      }),
      checks: commonChecks,
    }
  );

  return tests;
}

async function yieldToBrowser() {
  await new Promise<void>(resolve => window.setTimeout(resolve, 0));
}

export async function runValidationTest(
  test: ValidationTestCase,
  weatherData: WeatherData[],
  signal?: AbortSignal
): Promise<ValidationTestResult> {
  const started = performance.now();
  const states: SimulationState[] = [];

  resetSolverCache();

  const initialWeather = stepWeather(weatherData, 0);
  const runParams = cloneParams(test.params);
  runParams.initial.tempExtBase = initialWeather.tempExt;
  runParams.initial.vitesseVent = initialWeather.windSpeed ?? runParams.initial.vitesseVent;
  runParams.initial.humiditeRelative = initialWeather.humidity ?? runParams.initial.humiditeRelative;
  runParams.initial.pressionAtm = initialWeather.pressure ?? runParams.initial.pressionAtm;

  let state = initSimulation(runParams);
  states.push(state);
  let steps = 0;
  let budgetExceeded = false;
  let safetyStop = false;

  while (state.temps < test.params.simulation.duree) {
    if (signal?.aborted) {
      throw new DOMException('Validation cancelled', 'AbortError');
    }
    if (performance.now() - started > test.maxRuntimeMs) {
      budgetExceeded = true;
      break;
    }

    const weather = stepWeather(weatherData, state.temps);
    state = pasSimulation(state, runParams, weather.tempExt, weather.windSpeed ?? runParams.initial.vitesseVent);

    const shouldStore = steps % 20 === 0 || state.temps >= test.params.simulation.duree;
    if (shouldStore) states.push(state);

    steps += 1;
    if (steps % 100 === 0) await yieldToBrowser();
    if (steps > 500000) {
      state.warnings.push('Arret de securite: trop grand nombre de pas internes pour ce test.');
      safetyStop = true;
      break;
    }
  }

  const metrics = collectMetrics(states, performance.now() - started);
  const ctx: ScenarioContext = { test, states, metrics, params: runParams };
  const errors = test.checks.map(check => check(ctx)).filter((message): message is string => Boolean(message));
  const warnings = states.flatMap(s => s.warnings).filter((warning, index, all) => all.indexOf(warning) === index);

  if (budgetExceeded && test.category === 'performance') {
    errors.push(
      `Budget de calcul depasse: ${metrics.runtimeMs.toFixed(0)} ms pour ${state.temps.toFixed(1)} s simules sur ${test.params.simulation.duree} s.`
    );
  } else if (budgetExceeded) {
    warnings.push(
      `Budget de calcul depasse: ${metrics.runtimeMs.toFixed(0)} ms pour ${state.temps.toFixed(1)} s simules sur ${test.params.simulation.duree} s.`
    );
  }
  if (safetyStop || state.temps < test.params.simulation.duree) {
    warnings.push(`Scenario incomplet: ${state.temps.toFixed(1)} s simules sur ${test.params.simulation.duree} s.`);
  }

  if (metrics.energyError > 2 && metrics.energyError <= 5) {
    warnings.push(`Erreur energetique au-dessus du seuil warning: ${metrics.energyError.toFixed(1)}%.`);
  }
  if (metrics.oscillationScore > 0.2) {
    warnings.push(`Oscillation thermique elevee: score ${metrics.oscillationScore.toFixed(2)}.`);
  }

  return {
    id: test.id,
    name: test.name,
    category: test.category,
    pass: errors.length === 0,
    errors,
    warnings,
    metrics,
    alerts: warnings,
  };
}

export async function runValidationSuite(
  baseParams: AllParameters,
  weatherProvider: (monthIndex: number, duration: number) => WeatherData[],
  onProgress: (progress: ValidationProgress) => void,
  signal?: AbortSignal
): Promise<ValidationTestResult[]> {
  const tests = createValidationMatrix(baseParams);
  const results: ValidationTestResult[] = [];

  onProgress({ total: tests.length, completed: 0, results, current: tests[0]?.name });

  for (const test of tests) {
    if (signal?.aborted) throw new DOMException('Validation cancelled', 'AbortError');
    onProgress({ total: tests.length, completed: results.length, results: [...results], current: test.name });
    const result = await runValidationTest(test, weatherProvider(test.monthIndex, test.params.simulation.duree), signal);
    results.push(result);
    onProgress({ total: tests.length, completed: results.length, results: [...results], current: test.name });
  }

  return results;
}

export function summarizeValidation(results: ValidationTestResult[]): ValidationReportSummary {
  const passed = results.filter(result => result.pass).length;
  const failed = results.length - passed;
  const averageRuntimeMs = results.length
    ? results.reduce((sum, result) => sum + result.metrics.runtimeMs, 0) / results.length
    : 0;

  const byCfl = [...results].sort((a, b) => b.metrics.cflMax - a.metrics.cflMax);
  const byEnergy = [...results].sort((a, b) => b.metrics.energyError - a.metrics.energyError);
  const byOscillation = [...results].sort((a, b) => b.metrics.oscillationScore - a.metrics.oscillationScore);
  const bestScenario = [...results].sort((a, b) => scoreScenario(b) - scoreScenario(a))[0] ?? null;
  const worstScenario = [...results].sort((a, b) => scoreScenario(a) - scoreScenario(b))[0] ?? null;

  const reliabilityScore = results.length
    ? Math.max(0, Math.round((passed / results.length) * 100 - Math.min(20, failed * 2)))
    : 0;

  const recommendations: string[] = [];
  if (byCfl[0]?.metrics.cflMax > 1) recommendations.push('Reduire dtMax ou renforcer la subdivision CFL pour les scenarios rapides.');
  if (byEnergy[0]?.metrics.energyError > 5) recommendations.push('Auditer le bilan d energie air/paroi et les conditions aux limites.');
  if (byOscillation[0]?.metrics.oscillationScore > 0.2) recommendations.push('Ajouter amortissement numerique ou hysteresis plus robuste sur les transitions.');
  if (failed > 0) recommendations.push('Prioriser les tests FAIL, puis rejouer la matrice complete apres correction.');
  if (recommendations.length === 0) recommendations.push('Suite coherente: conserver ces tests comme garde-fou de regression.');

  return {
    total: results.length,
    passed,
    failed,
    reliabilityScore,
    averageRuntimeMs,
    worstCfl: byCfl[0] ?? null,
    worstEnergy: byEnergy[0] ?? null,
    mostUnstable: byOscillation[0] ?? null,
    bestScenario,
    worstScenario,
    mostRealistic: results.find(result => result.id === 'temperate-weather') ?? bestScenario,
    recommendations,
  };
}

function scoreScenario(result: ValidationTestResult): number {
  return (
    (result.pass ? 100 : 30)
    - result.metrics.cflMax * 15
    - result.metrics.energyError * 2
    - result.metrics.oscillationScore * 40
    - result.errors.length * 20
  );
}
