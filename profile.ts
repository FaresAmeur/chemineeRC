import { initSimulation, pasSimulation } from './src/lib/solver';
import { getWeatherForConfig, stepWeather } from './src/lib/weather';
import { DEFAULT_PARAMS } from './src/lib/defaults';
import { performance } from 'perf_hooks';
import * as physics from './src/lib/physics';

// Wrap physics functions to profile
const profile = {
  pasSimulation: 0,
  resoudreDebit: 0,
  calculConvection: 0,
  calculDiffusion: 0,
  meteo: 0,
  history: 0,
  total: 0
};

async function run() {
  const params = { ...DEFAULT_PARAMS };
  params.simulation.duree = 6 * 3600; // 6h
  params.simulation.dt = 2; // 2s

  const weatherData = getWeatherForConfig(
    params.weatherConfig,
    params.simulation.duree,
    params.initial.tempExtBase,
    params.initial.vitesseVent,
    params.initial.humiditeRelative,
    params.initial.pressionAtm
  );

  const startTotal = performance.now();
  let state = initSimulation(params);
  let steps = 0;
  let lastStoredTime = 0;
  const outputPeriod = Math.max(1, params.simulation.duree / 2000);

  const states = [state];

  while (state.temps < params.simulation.duree) {
    const startMeteo = performance.now();
    const weather = stepWeather(weatherData, state.temps);
    profile.meteo += performance.now() - startMeteo;

    const startPas = performance.now();
    state = pasSimulation(state, params, weather.tempExt, weather.windSpeed);
    profile.pasSimulation += performance.now() - startPas;
    steps++;

    const startHist = performance.now();
    if (state.temps - lastStoredTime >= outputPeriod || state.temps >= params.simulation.duree) {
      states.push(state);
      lastStoredTime = state.temps;
    }
    profile.history += performance.now() - startHist;
  }

  profile.total = performance.now() - startTotal;

  console.log(`=== PROFILING RESULTS ===`);
  console.log(`Total Time: ${profile.total.toFixed(2)} ms`);
  console.log(`pasSimulation: ${profile.pasSimulation.toFixed(2)} ms (${(profile.pasSimulation / profile.total * 100).toFixed(1)}%)`);
  console.log(`meteo: ${profile.meteo.toFixed(2)} ms (${(profile.meteo / profile.total * 100).toFixed(1)}%)`);
  console.log(`history: ${profile.history.toFixed(2)} ms (${(profile.history / profile.total * 100).toFixed(1)}%)`);
  console.log(`Total steps: ${steps}`);
  console.log(`Stored points: ${states.length}`);
}

run().catch(console.error);
