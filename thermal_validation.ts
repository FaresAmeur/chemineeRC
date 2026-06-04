import { initSimulation, pasSimulation } from './src/lib/solver';
import { calcRhoAir, calcCpAir } from './src/lib/physics';
import { DEFAULT_PARAMS } from './src/lib/defaults';

function runThermalBenchmark() {
  const params = { ...DEFAULT_PARAMS };
  
  // Paramètres géométriques
  const H = 10.0;
  const D_int = 0.15;
  const epaisseur = 0.10;
  const D_ext = D_int + 2 * epaisseur;
  
  params.geometry.hauteurTotale = H;
  params.geometry.diametreInterieur = D_int;
  params.geometry.epaisseurBoisseau = epaisseur;
  params.geometry.segmentsVerticaux = 20;

  // On force une vitesse constante via le ventilateur pour geler l'hydraulique
  const fixedVelocity = 2.0; // m/s
  params.fan.actif = true;
  params.fan.modeControle = 'manuel';
  params.fan.debitMax = (Math.PI * Math.pow(D_int / 2, 2)) * fixedVelocity; // force la vitesse

  const T_in = 20.0;
  const T_ext = 0.0;

  params.initial.tempAppartementInit = T_in;
  params.initial.tempAirInit = T_in;
  params.initial.tempExtBase = T_ext;
  params.initial.vitesseVent = 3.0; // Vent constant pour fixer h_e
  params.simulation.duree = 3600 * 24; // 24h pour garantir l'état stationnaire
  params.simulation.dt = 0.2; // Respecter la CFL < 1 (dz=0.5m, v=1m/s -> dt < 0.5s)
  
  // Propriétés matériau (Terre cuite)
  const k_mat = params.material.conductivite; // ~0.8 W/m.K

  let state = initSimulation(params);
  let steps = 0;

  // Forcer la vitesse à une valeur fixe dans le solver si le fan n'est pas parfait,
  // mais le solveur hydraulique le fera. Pour être sûr, on lit la vitesse calculée.
  
  while (state.temps < params.simulation.duree) {
    state.tempAppartement = T_in; // FORCER LA TEMPÉRATURE DE L'APPARTEMENT (Pas de refroidissement)
    state = pasSimulation(state, params, T_ext, params.initial.vitesseVent);
    steps++;
  }

  // --- Calculs Analytiques (État Stationnaire) ---
  const v = state.vitesse; // Vitesse stabilisée
  const rho = calcRhoAir((T_in + state.tempAirSortie)/2, params.initial.pressionAtm);
  const cp = calcCpAir(params.initial.humiditeRelative);
  const m_dot = rho * (Math.PI * Math.pow(D_int / 2, 2)) * v;

  const h_i = state.hi;
  const h_e = state.he;

  // Résistance thermique globale U (ramenée à la surface interne)
  // 1 / (U * A_int) = 1/(h_i * A_int) + ln(r_e/r_i)/(2*pi*k*L) + 1/(h_e * A_ext)
  // U = 1 / [ 1/h_i + (D_int / (2*k)) * ln(D_ext / D_int) + (D_int / D_ext) * (1/h_e) ]
  
  const R_conv_i = 1 / h_i;
  const R_cond = (D_int / (2 * k_mat)) * Math.log(D_ext / D_int);
  const R_conv_e = (D_int / D_ext) * (1 / h_e);
  
  const U = 1 / (R_conv_i + R_cond + R_conv_e);

  // Formule de chute exponentielle: T(L) = T_ext + (T_in - T_ext) * exp(-U * P * L / (m_dot * cp))
  const P = Math.PI * D_int;
  const theoretical_T_out = T_ext + (T_in - T_ext) * Math.exp(-U * P * H / (m_dot * cp));

  console.log('=== VALIDATION THERMIQUE (ÉTAT STATIONNAIRE) ===');
  console.log(`Temps simulé: ${state.temps / 3600} heures`);
  console.log(`Vitesse: ${v.toFixed(3)} m/s | Débit massique: ${m_dot.toFixed(4)} kg/s`);
  console.log(`Coeff conv interne (h_i): ${h_i.toFixed(2)} W/m²K`);
  console.log(`Coeff conv externe (h_e): ${h_e.toFixed(2)} W/m²K`);
  console.log(`Coefficient global d'échange (U): ${U.toFixed(2)} W/m²K (ref interne)`);
  console.log('--------------------------------------------------');
  console.log(`Température entrée (T_in): ${T_in.toFixed(2)} °C`);
  console.log(`Température extérieure (T_ext): ${T_ext.toFixed(2)} °C`);
  console.log(`Température de sortie CALCULÉE (RC Modèle) : ${state.tempAirSortie.toFixed(3)} °C`);
  console.log(`Température de sortie THÉORIQUE (Analytique) : ${theoretical_T_out.toFixed(3)} °C`);
  
  const erreur = Math.abs(state.tempAirSortie - theoretical_T_out);
  console.log(`Écart absolu : ${erreur.toFixed(3)} °C`);
  console.log(`Marge d'erreur relative : ${((erreur / (T_in - theoretical_T_out)) * 100).toFixed(2)} %`);

  console.log('--- DEBUG WALL ---');
  console.log('Air à la sortie:', state.tempAir[params.geometry.segmentsVerticaux - 1]);
  console.log('Wall noeuds sortie:', state.tempBoisseau[params.geometry.segmentsVerticaux - 1]);
  console.log('Air à l entree:', state.tempAir[0]);
  console.log('Wall noeuds entree:', state.tempBoisseau[0]);
}

runThermalBenchmark();
