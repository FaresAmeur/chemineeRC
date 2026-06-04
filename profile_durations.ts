import { initSimulation, pasSimulation } from './src/lib/solver';
import { getWeatherForConfig, stepWeather } from './src/lib/weather';
import { DEFAULT_PARAMS } from './src/lib/defaults';
import { performance } from 'perf_hooks';

const durations = [6, 12, 24, 48];

async function run() {
  for (const h of durations) {
    const params = { ...DEFAULT_PARAMS };
    params.simulation.duree = h * 3600; 
    params.simulation.dt = 2;

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
    
    // Test a simpler inner loop
    while (state.temps < params.simulation.duree) {
      const weather = stepWeather(weatherData, state.temps);
      state = pasSimulation(state, params, weather.tempExt, weather.windSpeed);
      steps++;
    }

    const totalTime = performance.now() - startTotal;
    const avgDt = state.temps / steps;
    console.log(`Duration: ${h}h`);
    console.log(`Total Time: ${totalTime.toFixed(2)} ms`);
    console.log(`Total steps: ${steps}`);
    console.log(`Avg dt: ${avgDt.toFixed(4)} s`);
    console.log(`---------------------------------`);
  }
}

run().catch(console.error);
