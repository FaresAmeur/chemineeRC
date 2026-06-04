// Validation physique automatique du simulateur — VERSION PRO

import type { AllParameters } from './types';
import { initSimulation, pasSimulation, resetSolverCache } from './solver';

export interface TestCase {
  nom: string;
  description: string;
  execute: () => TestResult;
}

export interface TestResult {
  passed: boolean;
  nom: string;
  errors: string[];
  warnings: string[];
  metriques: {
    cfl: number;
    erreurEnergetique: number;
    minTemp: number;
    maxTemp: number;
    reynolds: number;
  };
}

// =============================================================================
// CAS DE TEST 1: SANS VENTILATEUR (TIRAGE NATUREL)
// =============================================================================

export function testSansVentilateur(params: AllParameters): TestResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const testParams: AllParameters = {
    ...params,
    fan: { ...params.fan, actif: false, actifManuel: false, modeControle: 'manuel' },
    simulation: { ...params.simulation, duree: 300, adaptatif: true },
    weatherConfig: { ...params.weatherConfig, mode: 'fixe' },
  };

  resetSolverCache();
  const state = initSimulation(testParams);

  if (state.pressionTirage < 0) {
    errors.push(`Tirage négatif sans ventilateur: ${state.pressionTirage.toFixed(1)} Pa`);
  }
  if (state.vitesse < 0.01) {
    warnings.push(`Vitesse très faible: ${state.vitesse.toFixed(3)} m/s`);
  }
  if (state.vitesse > 5) {
    errors.push(`Vitesse trop élevée sans ventilateur: ${state.vitesse.toFixed(2)} m/s`);
  }

  let currentState = state;
  for (let i = 0; i < 10; i++) {
    currentState = pasSimulation(currentState, testParams, testParams.initial.tempExtBase, testParams.initial.vitesseVent);
  }

  return {
    passed: errors.length === 0,
    nom: 'Sans ventilateur (tirage naturel)',
    errors,
    warnings,
    metriques: {
      cfl: currentState.cflCourant,
      erreurEnergetique: 0,
      minTemp: Math.min(...currentState.tempAir),
      maxTemp: Math.max(...currentState.tempAir),
      reynolds: currentState.reynolds,
    },
  };
}

// =============================================================================
// CAS DE TEST 2: PAROIS ADIABATIQUES
// =============================================================================

export function testAdiabatique(params: AllParameters): TestResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const testParams: AllParameters = {
    ...params,
    material: { ...params.material, conductivite: 0.001 },
    simulation: { ...params.simulation, duree: 600, adaptatif: true },
    weatherConfig: { ...params.weatherConfig, mode: 'fixe' },
  };

  resetSolverCache();
  const state = initSimulation(testParams);
  const tempInitiale = testParams.initial.tempAirInit;

  let currentState = state;
  for (let i = 0; i < 100; i++) {
    currentState = pasSimulation(currentState, testParams, tempInitiale, 0.1);
  }

  const tempFinale = currentState.tempAirSortie;
  const deltaT = Math.abs(tempFinale - tempInitiale);

  if (deltaT > 2) {
    errors.push(`Variation température trop grande (adiabatique): ${deltaT.toFixed(1)}°C`);
  }
  if (deltaT > 0.5) {
    warnings.push(`Légère variation température: ${deltaT.toFixed(2)}°C`);
  }

  return {
    passed: errors.length === 0,
    nom: 'Parois adiabatiques',
    errors,
    warnings,
    metriques: {
      cfl: 0,
      erreurEnergetique: deltaT,
      minTemp: Math.min(...currentState.tempAir),
      maxTemp: Math.max(...currentState.tempAir),
      reynolds: currentState.reynolds,
    },
  };
}

// =============================================================================
// CAS DE TEST 3: CONDUIT FROID (REFROIDISSEMENT PROGRESSIF)
// =============================================================================

export function testConduitFroid(params: AllParameters): TestResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const testParams: AllParameters = {
    ...params,
    initial: {
      ...params.initial,
      tempExtBase: 5,
      tempAirInit: 25,
      tempBoisseauInit: 30,
    },
    simulation: { ...params.simulation, duree: 1000, adaptatif: true },
    weatherConfig: { ...params.weatherConfig, mode: 'fixe' },
  };

  resetSolverCache();
  const state = initSimulation(testParams);

  let currentState = state;
  const temperatures: number[] = [];

  for (let i = 0; i < 50; i++) {
    currentState = pasSimulation(currentState, testParams, 5, 1.0);
    temperatures.push(currentState.tempAirSortie);
  }

  const minTemp = Math.min(...temperatures);
  if (minTemp < 5 - 1) {
    errors.push(`Température descend sous T_ext: ${minTemp.toFixed(1)}°C < 5°C`);
  }

  const deltaTotal = temperatures[0] - temperatures[temperatures.length - 1];
  if (deltaTotal < 1) {
    warnings.push(`Refroidissement très faible: ${deltaTotal.toFixed(2)}°C`);
  }

  return {
    passed: errors.length === 0,
    nom: 'Conduit froid (refroidissement progressif)',
    errors,
    warnings,
    metriques: {
      cfl: currentState.cflCourant,
      erreurEnergetique: deltaTotal,
      minTemp,
      maxTemp: Math.max(...temperatures),
      reynolds: currentState.reynolds,
    },
  };
}

// =============================================================================
// CAS DE TEST 4: VENTILATION FORTE (STABILITÉ)
// =============================================================================

export function testVentilationForte(params: AllParameters): TestResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const testParams: AllParameters = {
    ...params,
    fan: {
      ...params.fan,
      actif: true,
      actifManuel: true,
      modeControle: 'manuel',
      pressionMax: 500,
      debitMax: 0.2,
    },
    simulation: { ...params.simulation, duree: 500, adaptatif: true },
    weatherConfig: { ...params.weatherConfig, mode: 'fixe' },
  };

  resetSolverCache();
  const state = initSimulation(testParams);

  if (state.reynolds < 4000) {
    warnings.push(`Régime non pleinement turbulent: Re = ${state.reynolds.toFixed(0)}`);
  }

  let currentState = state;
  let oscillations = 0;
  let prevTemp = state.tempAirSortie;

  for (let i = 0; i < 100; i++) {
    const tempVar = 10 + 5 * Math.sin(i * 0.1);
    currentState = pasSimulation(currentState, testParams, tempVar, 2.0);

    if (Math.abs(currentState.tempAirSortie - prevTemp) > 2) {
      oscillations++;
    }
    prevTemp = currentState.tempAirSortie;
  }

  if (oscillations > 10) {
    errors.push(`${oscillations} oscillations détectées`);
  }
  if (oscillations > 5) {
    warnings.push(`${oscillations} oscillations mineures`);
  }

  const minTemp = Math.min(...currentState.tempAir);
  const maxTemp = Math.max(...currentState.tempAir);

  if (Math.abs(maxTemp - minTemp) > 20) {
    errors.push(`Gradient thermique trop important: ${maxTemp.toFixed(1)}°C - ${minTemp.toFixed(1)}°C`);
  }

  return {
    passed: errors.length === 0,
    nom: 'Ventilation forte (stabilité)',
    errors,
    warnings,
    metriques: {
      cfl: currentState.cflCourant,
      erreurEnergetique: 0,
      minTemp,
      maxTemp,
      reynolds: currentState.reynolds,
    },
  };
}

// =============================================================================
// VALIDATION COMPLÈTE
// =============================================================================

export function validerSimulation(params: AllParameters): TestResult[] {
  return [
    testSansVentilateur(params),
    testAdiabatique(params),
    testConduitFroid(params),
    testVentilationForte(params),
  ];
}

export function formatTestResults(results: TestResult[]): string {
  const lines: string[] = [];
  lines.push('=== VALIDATION PHYSIQUE ===\n');

  let allPassed = true;
  results.forEach(r => {
    if (!r.passed) allPassed = false;
    lines.push(`\n${r.passed ? '✓' : '✗'} ${r.nom}`);
    r.errors.forEach(e => lines.push(`  ERREUR: ${e}`));
    r.warnings.forEach(w => lines.push(`  ATTENTION: ${w}`));
    lines.push(`  Métriques: CFL=${r.metriques.cfl.toFixed(2)}, Re=${r.metriques.reynolds.toFixed(0)}, Tmin=${r.metriques.minTemp.toFixed(1)}°C`);
  });

  lines.push(`\n=== ${allPassed ? 'TOUS LES TESTS PASSÉS' : 'CERTAINS TESTS ONT ÉCHOUÉ'} ===`);

  return lines.join('\n');
}
