import { initSimulation, pasSimulation } from './src/lib/solver';
import { calcTirageThermique, calcRhoAir } from './src/lib/physics';
import { DEFAULT_PARAMS } from './src/lib/defaults';

function runBenchmark() {
  const params = { ...DEFAULT_PARAMS };
  
  // Paramètres de l'expérience de référence (type ASHRAE / Expérience standard de tirage naturel)
  params.geometry.hauteurTotale = 10.0;
  params.geometry.diametreInterieur = 0.15;
  params.geometry.epaisseurBoisseau = 0.20;
  params.geometry.rugositeRelative = 0.015; // Maçonnerie rugueuse
  params.geometry.segmentsVerticaux = 20;

  params.fan.actif = false;
  params.fan.modeControle = 'manuel'; // Force arrêt

  params.initial.tempAppartementInit = 20.0;
  params.initial.tempExtBase = 5.0;
  params.initial.vitesseVent = 0.0; // Pas de vent pour isoler le tirage thermique pur

  // Lancer une courte simulation jusqu'à l'état stationnaire (ex: 2h)
  params.simulation.duree = 7200; 
  params.simulation.dt = 2.0;

  let state = initSimulation(params);
  let steps = 0;

  while (state.temps < params.simulation.duree) {
    state = pasSimulation(state, params, params.initial.tempExtBase, params.initial.vitesseVent);
    steps++;
  }

  // --- Calculs théoriques (ASHRAE) ---
  const rho_ext = calcRhoAir(params.initial.tempExtBase, params.initial.pressionAtm);
  const rho_int = calcRhoAir(params.initial.tempAppartementInit, params.initial.pressionAtm);
  const tirage_theorique = 9.81 * params.geometry.hauteurTotale * (rho_ext - rho_int);

  console.log('=== RÉSULTATS DU BENCHMARK DE VALIDATION ===');
  console.log(`Temps simulé: ${state.temps} s`);
  console.log(`Vitesse finale: ${state.vitesse.toFixed(4)} m/s`);
  console.log(`Débit volumique final: ${(Math.abs(state.debitVolmique) * 3600).toFixed(2)} m³/h`);
  console.log(`Température de sortie d'air: ${state.tempAirSortie.toFixed(2)} °C`);
  console.log(`Pression de tirage générée par le modèle: ${state.pressionTirage.toFixed(2)} Pa`);
  console.log(`Pertes de charges totales: ${state.pertesChargeTotal.toFixed(2)} Pa`);
  console.log(`Reynolds final: ${state.reynolds.toFixed(0)}`);
  
  console.log('\n=== COMPARAISON THÉORIQUE (ASHRAE) ===');
  console.log(`Tirage théorique (delta_rho * g * h): ${tirage_theorique.toFixed(2)} Pa`);
}

runBenchmark();
