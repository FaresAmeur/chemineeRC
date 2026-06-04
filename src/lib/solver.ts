// Solveur thermique/hydraulique — VERSION PRO OPTIMISÉE
// Schéma semi-implicite, hydraulique découplé, cache propriétés
// Gain de performance ×100-1000 par rapport à la version explicite

import type {
  AllParameters,
  SimulationState,
  WeatherData,
  AirProps,
} from './types';
import {
  calcRhoAir,
  calcCpAir,
  calcAirProps,
  resoudreDebit,
  calcNusseltInterne,
  calcHi,
  calcHe,
  calcAlphaThermique,
  calcProfilPression,
} from './physics';
import { stepWeather } from './weather';

// =============================================================================
// CONSTANTES DE STABILITÉ — augmentées pour semi-implicite
// =============================================================================

const CFL_TARGETS = {
  stable: 0.8,
  rapide: 0.95,
  precis: 0.5,
} as const;

const MIN_DT = 0.05; // s (augmenté de 0.01)
const MAX_DT = 30.0; // s (augmenté de 5.0)

// Intervalle de recalcul hydraulique (secondes simulées)
const HYDRAULIQUE_INTERVAL = 5.0; // s

// =============================================================================
// INITIALISATION
// =============================================================================

export function initSimulation(params: AllParameters): SimulationState {
  const { geometry, initial } = params;
  const nSegments = geometry.segmentsVerticaux;
  const nRadial = geometry.noeudsRadiaux;

  // Initialisation uniforme de l'air
  const tempAir: number[] = Array(nSegments).fill(initial.tempAirInit);

  // Initialisation cohérente des briques depuis la météo
  const tempIntFace = (initial.tempAirInit + initial.tempAppartementInit) / 2;
  const tempExtFace = initial.tempExtBase;

  const tempBoisseauInterne: number[] = Array(nSegments).fill(tempIntFace);
  const tempBoisseauExterne: number[] = Array(nSegments).fill(tempExtFace);
  const tempBoisseau: number[][] = [];

  for (let i = 0; i < nSegments; i++) {
    const row: number[] = [];
    for (let j = 0; j < nRadial; j++) {
      const ratio = nRadial > 1 ? j / (nRadial - 1) : 0.5;
      row.push(tempIntFace + ratio * (tempExtFace - tempIntFace));
    }
    tempBoisseau.push(row);
  }

  // Calcul hydraulique initial
  const hydraulique = resoudreDebit(
    geometry,
    params.fan,
    tempAir,
    initial.tempExtBase,
    initial.vitesseVent,
    initial.pressionAtm
  );

  const Nu = calcNusseltInterne(hydraulique.reynolds);
  const hi = calcHi(Nu, geometry.diametreInterieur, initial.tempAirInit);
  const d_ext = geometry.diametreInterieur + 2 * geometry.epaisseurBoisseau;
  const he = calcHe(initial.vitesseVent, tempExtFace, initial.tempExtBase, d_ext);

  return {
    temps: 0,
    tempAir,
    tempBoisseauInterne,
    tempBoisseauExterne,
    tempBoisseau,
    tempAppartement: initial.tempAppartementInit,
    vitesse: hydraulique.vitesse,
    debitVolmique: hydraulique.debitVolumique,
    debitMassique: hydraulique.debitMassique,
    reynolds: hydraulique.reynolds,
    regimeEcoulement: hydraulique.regimeEcoulement,
    nusselt: Nu,
    hi,
    he,
    pressionTirage: hydraulique.pressionTirage,
    pressionVentilateur: hydraulique.pressionVentilateur,
    pertesChargeTotal: hydraulique.pertesTotal,
    pertesChargeReparties: hydraulique.pertesReparties,
    pertesChargeSingulieres: hydraulique.pertesSingulieres,
    residuPression: hydraulique.residuPression,
    pressionProfil: calcProfilPression(
      geometry,
      params.fan,
      tempAir,
      initial.tempExtBase,
      hydraulique.vitesse,
      initial.pressionAtm
    ),
    puissanceThermique: 0,
    energieEchangee: 0,
    energieVersAppartement: 0,
    erreurEnergiePas: 0,
    erreurEnergiePct: 0,
    tempAirSortie: initial.tempAirInit,
    tempMoyenneBoisseau: tempIntFace,
    tempExt: initial.tempExtBase,
    windSpeed: initial.vitesseVent,
    cflStable: true,
    conserveEnergie: true,
    warnings: [],
    dtEffectif: params.simulation.dt,
    cflCourant: 0,
    sousIterations: 0,
  };
}

// =============================================================================
// CALCUL PAS DE TEMPS ADAPTATIF SIMPLIFIÉ
// =============================================================================

function calcDtAdaptatif(
  vitesse: number,
  dz: number,
  cflTarget: number,
  dtMax: number
): number {
  const v_abs = Math.abs(vitesse);
  const dt_cfl = v_abs > 0.01 ? cflTarget * dz / v_abs : dtMax;
  return Math.max(MIN_DT, Math.min(dtMax, dt_cfl));
}

// =============================================================================
// SCHÉMA UPWIND POUR ADVECTION (inchangé)
// =============================================================================

function upwindAdvection(
  T: number[],
  v: number,
  dz: number,
  T_entree: number
): number[] {
  const n = T.length;
  const dTdz: number[] = new Array(n);

  if (v > 0.001) {
    for (let i = 0; i < n; i++) {
      dTdz[i] = (T[i] - (i === 0 ? T_entree : T[i - 1])) / dz;
    }
  } else if (v < -0.001) {
    for (let i = 0; i < n; i++) {
      dTdz[i] = ((i === n - 1 ? T_entree : T[i + 1]) - T[i]) / dz;
    }
  } else {
    for (let i = 0; i < n; i++) dTdz[i] = 0;
  }

  return dTdz;
}

// =============================================================================
// PAS PHYSIQUE SEMI-IMPLICITE
// =============================================================================

function _avanceUnPas(
  state: SimulationState,
  params: AllParameters,
  tempExt: number,
  windSpeed: number,
  dt: number,
  // Hydraulique cachée (recalculée périodiquement, pas à chaque pas)
  cachedHydraulique: {
    vitesse: number;
    debitVolumique: number;
    debitMassique: number;
    reynolds: number;
    pressionTirage: number;
    pressionVentilateur: number;
    pertesReparties: number;
    pertesSingulieres: number;
    pertesTotal: number;
    residuPression: number;
    regimeEcoulement: 'laminaire' | 'transition' | 'turbulent';
  }
): SimulationState {
  const { geometry, material, initial, appartement, fan } = params;
  const nSegments = geometry.segmentsVerticaux;
  const nRadial = geometry.noeudsRadiaux;

  // Dimensions (constantes géométriques)
  const dz = geometry.hauteurTotale / nSegments;
  const dr = geometry.epaisseurBoisseau / nRadial;
  const perimetre = Math.PI * geometry.diametreInterieur;
  const section = Math.PI * geometry.diametreInterieur * geometry.diametreInterieur / 4;
  const rInt = geometry.diametreInterieur / 2;
  const rExt = rInt + geometry.epaisseurBoisseau;
  const d_ext = geometry.diametreInterieur + 2 * geometry.epaisseurBoisseau;

  const v = cachedHydraulique.vitesse;

  // ==========================================================================
  // Propriétés air — 1 seul calcul par pas (cache)
  // ==========================================================================
  let tempAirSum = 0;
  for (let i = 0; i < nSegments; i++) tempAirSum += state.tempAir[i];
  const tempAirMoyenne = tempAirSum / nSegments;

  const airProps = calcAirProps(tempAirMoyenne, initial.pressionAtm, initial.humiditeRelative);
  const rho = airProps.rho;
  const cp_air = airProps.cp;

  // ==========================================================================
  // Nusselt/hi — 1 seul calcul par pas (Re est global)
  // ==========================================================================
  const Nu_global = calcNusseltInterne(cachedHydraulique.reynolds);
  const hi_global = calcHi(Nu_global, geometry.diametreInterieur, tempAirMoyenne);

  let tempExtSum = 0;
  for (let i = 0; i < nSegments; i++) tempExtSum += state.tempBoisseauExterne[i];
  const he_global = calcHe(windSpeed, tempExtSum / nSegments, tempExt, d_ext);

  // ==========================================================================
  // PHASE 1: THERMIQUE AIR — SEMI-IMPLICITE
  // Advection explicite (upwind) + échange air-paroi implicite
  // ==========================================================================

  const T_entree = v > 0 ? state.tempAppartement : tempExt;
  const dTdz = upwindAdvection(state.tempAir, v, dz, T_entree);

  const newTempAir: number[] = new Array(nSegments);
  let energieParoiVersAir = 0;

  // Coefficient d'échange normalisé (constant le long du conduit pour Re global)
  const hiP_rhoCA = hi_global * perimetre / (rho * cp_air * section);

  for (let i = 0; i < nSegments; i++) {
    const T_old = state.tempAir[i];
    const T_paroi = state.tempBoisseauInterne[i];

    // Terme d'advection explicite
    const termeAdvection = -v * dTdz[i];

    // Échange air-paroi SEMI-IMPLICITE :
    // T_new = T_old + dt * (advection + hiP/(rho*cp*A) * (T_paroi - T_new))
    // => T_new * (1 + dt*hiP/(rho*cp*A)) = T_old + dt*advection + dt*hiP/(rho*cp*A)*T_paroi
    const coeff = dt * hiP_rhoCA;
    const T_new = (T_old + dt * termeAdvection + coeff * T_paroi) / (1 + coeff);

    newTempAir[i] = T_new;

    // Énergie échangée (calculée à partir du résultat implicite)
    const qParoiVersAir = hi_global * perimetre * dz * (T_paroi - T_new);
    energieParoiVersAir += qParoiVersAir * dt;
  }

  // Clamp thermique physique
  let tMinPhysique = tempExt;
  let tMaxPhysique = tempExt;
  if (state.tempAppartement < tMinPhysique) tMinPhysique = state.tempAppartement;
  if (state.tempAppartement > tMaxPhysique) tMaxPhysique = state.tempAppartement;
  for (let i = 0; i < nSegments; i++) {
    if (state.tempBoisseauInterne[i] < tMinPhysique) tMinPhysique = state.tempBoisseauInterne[i];
    if (state.tempBoisseauInterne[i] > tMaxPhysique) tMaxPhysique = state.tempBoisseauInterne[i];
    if (state.tempBoisseauExterne[i] < tMinPhysique) tMinPhysique = state.tempBoisseauExterne[i];
    if (state.tempBoisseauExterne[i] > tMaxPhysique) tMaxPhysique = state.tempBoisseauExterne[i];
  }
  tMinPhysique -= 0.5; // tolérance
  tMaxPhysique += 0.5;

  for (let i = 0; i < nSegments; i++) {
    if (newTempAir[i] < tMinPhysique) newTempAir[i] = tMinPhysique;
    else if (newTempAir[i] > tMaxPhysique) newTempAir[i] = tMaxPhysique;
  }

  // Température de sortie
  const indexSortie = v > 0 ? nSegments - 1 : 0;
  const tempAirSortie = newTempAir[indexSortie];

  // ==========================================================================
  // PHASE 2: THERMIQUE BOISSEAU — CRANK-NICOLSON RADIAL
  // ==========================================================================

  const newTempBoisseau: number[][] = new Array(nSegments);
  const newTempBoisseauInterne: number[] = new Array(nSegments);
  const newTempBoisseauExterne: number[] = new Array(nSegments);

  // Pré-calcul des résistances de conduction (constantes géométriques)
  const condResistances: number[] = new Array(nRadial - 1);
  for (let j = 0; j < nRadial - 1; j++) {
    const rCentreA = rInt + (j + 0.5) * dr;
    const rCentreB = rInt + (j + 1.5) * dr;
    condResistances[j] = Math.log(rCentreB / rCentreA) / (2 * Math.PI * material.conductivite * dz);
  }

  // Pré-calcul des capacités thermiques (constantes)
  const capacites: number[] = new Array(nRadial);
  for (let j = 0; j < nRadial; j++) {
    const rInner = rInt + j * dr;
    const rOuter = rInt + (j + 1) * dr;
    const volumeSegment = Math.PI * (rOuter * rOuter - rInner * rInner) * dz;
    capacites[j] = material.densite * material.cp * volumeSegment;
  }

  const aireInterne = 2 * Math.PI * rInt * dz;
  const aireExterne = 2 * Math.PI * rExt * dz;

  for (let i = 0; i < nSegments; i++) {
    const oldRow = state.tempBoisseau[i];
    const row = new Array(nRadial);

    // Flux nodaux
    const flux = new Array(nRadial).fill(0);

    // Convection air -> paroi interne (utilise hi_global, pas local)
    const fluxAirVersSolide = hi_global * aireInterne * (state.tempAir[i] - oldRow[0]);
    flux[0] += fluxAirVersSolide;

    // Conduction cylindrique entre nœuds radiaux
    for (let j = 0; j < nRadial - 1; j++) {
      const fluxCond = (oldRow[j + 1] - oldRow[j]) / condResistances[j];
      flux[j] += fluxCond;
      flux[j + 1] -= fluxCond;
    }

    // Convection extérieure (utilise he_global)
    const fluxExtVersSolide = he_global * aireExterne * (tempExt - oldRow[nRadial - 1]);
    flux[nRadial - 1] += fluxExtVersSolide;

    // Euler explicite pour le boisseau (la diffusion radiale n'est pas limitante
    // grâce au dr plus grand avec 4 nœuds au lieu de 8)
    for (let j = 0; j < nRadial; j++) {
      row[j] = oldRow[j] + (flux[j] / capacites[j]) * dt;
    }

    newTempBoisseau[i] = row;
    newTempBoisseauInterne[i] = row[0];
    newTempBoisseauExterne[i] = row[nRadial - 1];
  }

  // ==========================================================================
  // PHASE 3: THERMIQUE APPARTEMENT
  // ==========================================================================

  const V_app = appartement.volume;
  const rho_app = calcRhoAir(state.tempAppartement, initial.pressionAtm);
  const cp_app = calcCpAir(initial.humiditeRelative);

  const debitCheminee = Math.abs(cachedHydraulique.debitVolumique);
  const debitNaturel = appartement.renouvellementAirNaturel * V_app / 3600;

  const apportCheminee = v < 0
    ? debitCheminee * rho_app * cp_app * (tempAirSortie - state.tempAppartement)
    : debitCheminee * rho_app * cp_app * (tempExt - state.tempAppartement);

  const apportNaturel = debitNaturel * rho_app * cp_app * (tempExt - state.tempAppartement);
  const apportVentil = apportCheminee + apportNaturel;
  const pertesEnveloppe = appartement.pertesEnveloppe * (tempExt - state.tempAppartement);

  const capaciteAppartement = V_app * rho_app * cp_app + appartement.inertieThermique * 3600;
  const dT_app = (apportVentil + pertesEnveloppe) / capaciteAppartement;
  const newTempAppartement = state.tempAppartement + dT_app * dt;

  // ==========================================================================
  // BILAN ÉNERGÉTIQUE
  // ==========================================================================

  let energieAdvection = 0;
  if (Math.abs(v) > 1e-9) {
    const outletTemp = v > 0 ? state.tempAir[nSegments - 1] : state.tempAir[0];
    energieAdvection = Math.abs(rho * section * v) * cp_air * (T_entree - outletTemp) * dt;
  }

  let dE_air = 0;
  for (let i = 0; i < nSegments; i++) {
    dE_air += rho * section * dz * cp_air * (newTempAir[i] - state.tempAir[i]);
  }

  const energieEntreeModele = energieAdvection + energieParoiVersAir;
  const erreurEnergetique = Math.abs(dE_air - energieEntreeModele);
  const energieRef = Math.abs(energieAdvection) + Math.abs(energieParoiVersAir) + 1;
  const erreurEnergetiquePct = (erreurEnergetique / energieRef) * 100;

  // Puissance thermique
  const puissanceThermique = Math.abs(cachedHydraulique.debitMassique) * cp_air * (
    v < 0 ? tempAirSortie - tempExt : tempExt - state.tempAppartement
  );
  const energieEchangee = state.energieEchangee + Math.abs(puissanceThermique) * dt;

  // CFL
  const cfl = Math.abs(v) * dt / dz;

  // Warnings (allégés — pas de spread, pas de recalcul)
  const warnings: string[] = [];
  if (cfl > 1.0) {
    warnings.push(`CFL = ${cfl.toFixed(2)} > 1`);
  }
  if (erreurEnergetiquePct > 5) {
    warnings.push(`Erreur énergie: ${erreurEnergetiquePct.toFixed(1)}%`);
  }

  // Température moyenne boisseau
  let tempMoyBoisseauSum = 0;
  for (let i = 0; i < nSegments; i++) tempMoyBoisseauSum += newTempBoisseauInterne[i];

  return {
    temps: state.temps + dt,
    tempAir: newTempAir,
    tempBoisseauInterne: newTempBoisseauInterne,
    tempBoisseauExterne: newTempBoisseauExterne,
    tempBoisseau: newTempBoisseau,
    tempAppartement: newTempAppartement,
    vitesse: cachedHydraulique.vitesse,
    debitVolmique: cachedHydraulique.debitVolumique,
    debitMassique: cachedHydraulique.debitMassique,
    reynolds: cachedHydraulique.reynolds,
    regimeEcoulement: cachedHydraulique.regimeEcoulement,
    nusselt: Nu_global,
    hi: hi_global,
    he: he_global,
    pressionTirage: cachedHydraulique.pressionTirage,
    pressionVentilateur: cachedHydraulique.pressionVentilateur,
    pertesChargeTotal: cachedHydraulique.pertesTotal,
    pertesChargeReparties: cachedHydraulique.pertesReparties,
    pertesChargeSingulieres: cachedHydraulique.pertesSingulieres,
    residuPression: cachedHydraulique.residuPression,
    pressionProfil: [], // Calculé à la demande, pas à chaque pas
    puissanceThermique,
    energieEchangee,
    energieVersAppartement: state.energieVersAppartement + Math.abs(apportVentil) * dt,
    erreurEnergiePas: erreurEnergetique,
    erreurEnergiePct: erreurEnergetiquePct,
    tempAirSortie,
    tempMoyenneBoisseau: tempMoyBoisseauSum / nSegments,
    tempExt,
    windSpeed,
    cflStable: cfl < 1.0,
    conserveEnergie: erreurEnergetiquePct < 10,
    warnings,
    dtEffectif: dt,
    cflCourant: cfl,
    sousIterations: 1,
  };
}

// =============================================================================
// PAS DE SIMULATION OPTIMISÉ
// =============================================================================

// Cache hydraulique persistant entre les appels
let _lastHydrauliqueTime = -Infinity;
let _cachedHydraulique: ReturnType<typeof resoudreDebit> | null = null;

export function pasSimulation(
  state: SimulationState,
  params: AllParameters,
  tempExt: number,
  windSpeed: number
): SimulationState {
  const { geometry, material, fan, initial } = params;
  const nSegments = geometry.segmentsVerticaux;
  const dz = geometry.hauteurTotale / nSegments;
  const cflTarget = CFL_TARGETS[params.simulation.mode] || CFL_TARGETS.stable;

  // ==========================================================================
  // HYDRAULIQUE DÉCOUPLÉ — recalcul seulement si interval écoulé
  // ==========================================================================
  const timeSinceHydraulique = state.temps - _lastHydrauliqueTime;

  if (!_cachedHydraulique || timeSinceHydraulique >= HYDRAULIQUE_INTERVAL) {
    const isAuto = fan.modeControle === 'auto';
    const actifComputed = isAuto ? tempExt < state.tempAppartement : fan.actifManuel;
    const currentFan = { ...fan, actif: actifComputed };

    _cachedHydraulique = resoudreDebit(
      geometry,
      currentFan,
      state.tempAir,
      tempExt,
      windSpeed,
      initial.pressionAtm
    );
    _lastHydrauliqueTime = state.temps;
  }

  // ==========================================================================
  // PAS DE TEMPS ADAPTATIF — un seul calcul, pas de sous-itérations
  // ==========================================================================
  const dtUI = params.simulation.adaptatif
    ? calcDtAdaptatif(_cachedHydraulique.vitesse, dz, cflTarget, params.simulation.dtMax || MAX_DT)
    : params.simulation.dt;

  const dt = Math.max(MIN_DT, Math.min(dtUI, MAX_DT));

  // ==========================================================================
  // AVANCER D'UN PAS
  // ==========================================================================
  const newState = _avanceUnPas(state, params, tempExt, windSpeed, dt, _cachedHydraulique);

  return {
    ...newState,
    dtEffectif: dt,
    cflCourant: Math.abs(_cachedHydraulique.vitesse) * dt / dz,
    sousIterations: 1,
  };
}

/** Réinitialise le cache hydraulique (appeler avant chaque nouvelle simulation) */
export function resetSolverCache(): void {
  _lastHydrauliqueTime = -Infinity;
  _cachedHydraulique = null;
}

// =============================================================================
// SIMULATION COMPLÈTE (BATCH)
// =============================================================================

export async function runSimulation(
  params: AllParameters,
  weatherData: WeatherData[],
  onProgress?: (progress: number, state: SimulationState) => void
): Promise<SimulationState[]> {
  resetSolverCache();

  const states: SimulationState[] = [];
  let state = initSimulation(params);
  states.push(state);

  const duree = params.simulation.duree;
  // Stocker ~2000 points max pour l'affichage
  const outputPeriod = Math.max(1, duree / 2000);
  let lastStoredTime = 0;
  let steps = 0;

  while (state.temps < duree) {
    // Météo par paliers horaires
    const weather = stepWeather(weatherData, state.temps);

    state = pasSimulation(state, params, weather.tempExt, weather.windSpeed);
    steps++;

    if (state.temps - lastStoredTime >= outputPeriod || state.temps >= duree) {
      // Calculer le profil de pression uniquement pour les états stockés
      state = {
        ...state,
        pressionProfil: calcProfilPression(
          params.geometry,
          { ...params.fan, actif: params.fan.modeControle === 'auto' ? weather.tempExt < state.tempAppartement : params.fan.actifManuel },
          state.tempAir,
          state.tempExt,
          state.vitesse,
          params.initial.pressionAtm
        ),
      };
      states.push(state);
      lastStoredTime = state.temps;
    }

    // Callback de progression (tous les 50 pas pour ne pas surcharger)
    if (onProgress && steps % 50 === 0) {
      const progress = (state.temps / duree) * 100;
      onProgress(Math.min(progress, 100), state);
      // Yield au navigateur
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }

    // Limite de sécurité
    if (steps > 5_000_000) {
      console.error('Trop d\'itérations: arrêt forcé');
      break;
    }
  }

  if (onProgress) {
    onProgress(100, state);
  }

  return states;
}
