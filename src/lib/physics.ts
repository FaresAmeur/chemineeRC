// Moteur physique CORRIGÉ FINAL pour le simulateur de cheminée
// Modèle distribué verticalement avec hydraulique réaliste
// Corrections: tirage intégré, solveur sécante, Venturi, CFL

import type { GeometryParams, FanParams, AirProps } from './types';
import { CONSTANTS, COEFFICIENTS_K } from './types';

// =============================================================================
// SECTION 1: PROPRIÉTÉS DE L'AIR
// =============================================================================

/**
 * Masse volumique de l'air (loi des gaz parfaits)
 * ρ = P/(R·T)
 */
export function calcRhoAir(temperature: number, pression: number = CONSTANTS.P_atm): number {
  const T_kelvin = temperature + 273.15;
  return pression / (CONSTANTS.R_air * T_kelvin);
}

/**
 * Viscosité dynamique de l'air (loi de Sutherland)
 */
export function calcMuAir(temperature: number): number {
  const T_kelvin = temperature + 273.15;
  const T_ref = 273.15;
  const mu_ref = 1.716e-5;
  const S = 110.4;
  return mu_ref * Math.pow(T_kelvin / T_ref, 1.5) * (T_ref + S) / (T_kelvin + S);
}

/**
 * Conductivité thermique de l'air
 */
export function calcKAir(temperature: number): number {
  const T_kelvin = temperature + 273.15;
  return 0.0241 * Math.pow(T_kelvin / 273.15, 0.9);
}

/**
 * Capacité thermique massique de l'air (variation avec humidité)
 */
export function calcCpAir(humiditeRelative: number): number {
  const basique = CONSTANTS.cp_air;
  const augmentation = 1.86 * (humiditeRelative * 100);
  return basique + augmentation;
}

/**
 * Calcul groupé des propriétés de l'air (cache par pas de temps)
 * Évite les appels redondants à rho, mu, cp, k
 */
export function calcAirProps(
  temperature: number,
  pression: number = CONSTANTS.P_atm,
  humiditeRelative: number = 0.6
): AirProps {
  return {
    rho: calcRhoAir(temperature, pression),
    mu: calcMuAir(temperature),
    cp: calcCpAir(humiditeRelative),
    k: calcKAir(temperature),
  };
}

// =============================================================================
// SECTION 2: MODÈLE HYDRAULIQUE COMPLET
// =============================================================================

/**
 * Nombre de Reynolds
 * Re = ρ·|v|·D/μ
 */
export function calcReynolds(vitesse: number, diametre: number, rho: number, mu: number): number {
  if (vitesse === 0) return 0;
  return Math.abs(rho * vitesse * diametre / mu);
}

/**
 * Facteur de friction Darcy-Weisbach
 * Laminaire: f = 64/Re
 * Turbulent: Swamee-Jain (approximation de Colebrook)
 */
export function calcFrictionFactor(Re: number, rugosite: number): number {
  if (Re === 0) return 0;

  if (Re < 2300) {
    return 64 / Re;
  } else if (Re < 4000) {
    // Zone de transition - interpolation douce
    const f_lam = 64 / 2300;
    const f_turb = calcSwameeJain(4000, rugosite);
    const ratio = (Re - 2300) / 1700;
    return f_lam + ratio * (f_turb - f_lam);
  } else {
    return calcSwameeJain(Re, rugosite);
  }
}

function calcSwameeJain(Re: number, rugosite: number): number {
  if (Re <= 0) return 0;
  const logArg = rugosite / 3.7 + 5.74 / Math.pow(Re, 0.9);
  if (logArg <= 0) return 0.02;
  return 0.25 / Math.pow(Math.log10(logArg), 2);
}

/**
 * Pertes de charge réparties (Darcy-Weisbach)
 * ΔP = f · (L/D) · (ρ·v²/2)
 */
export function calcPertesReparties(
  vitesse: number,
  diametre: number,
  longueur: number,
  rho: number,
  f: number
): number {
  if (vitesse === 0) return 0;
  return f * (longueur / diametre) * (rho * vitesse * vitesse) / 2;
}

/**
 * Pertes de charge singulières
 * ΔP = ΣK · (ρ·v²/2)
 */
export function calcPertesSingulieres(
  vitesse: number,
  rho: number,
  angleCoude: number
): number {
  if (vitesse === 0) return 0;

  let K_coude = COEFFICIENTS_K.coude45;
  if (angleCoude <= 45) {
    K_coude = COEFFICIENTS_K.coude45 * (angleCoude / 45);
  } else if (angleCoude <= 90) {
    K_coude = COEFFICIENTS_K.coude45 +
      (angleCoude - 45) / 45 * (COEFFICIENTS_K.coude90 - COEFFICIENTS_K.coude45);
  } else {
    K_coude = COEFFICIENTS_K.coude90 + (angleCoude - 90) / 90 * 0.5;
  }

  const K_total = COEFFICIENTS_K.entree + K_coude + COEFFICIENTS_K.sortieToit + COEFFICIENTS_K.sortie;
  return K_total * rho * vitesse * vitesse / 2;
}

/**
 * TIRAGE THERMIQUE INTÉGRÉ segment par segment
 * Remplace l'ancien calcul à température moyenne unique.
 * ΔP_stack = Σ g · (ρ_ext - ρ_int[i]) · Δz
 * 
 * Positif si l'air intérieur est globalement plus chaud → pousse vers le haut.
 */
export function calcTirageIntegre(
  tempExt: number,
  tempAir: number[],
  dz: number,
  pression: number
): number {
  const rho_ext = calcRhoAir(tempExt, pression);
  let tirage = 0;
  for (let i = 0; i < tempAir.length; i++) {
    const rho_int = calcRhoAir(tempAir[i], pression);
    tirage += CONSTANTS.g * (rho_ext - rho_int) * dz;
  }
  return tirage;
}

/**
 * Ancien calcul simplifié — conservé pour compatibilité initiale
 */
export function calcTirageThermique(
  tempExt: number,
  tempIntMoyenne: number,
  hauteur: number,
  pression: number
): number {
  const rho_ext = calcRhoAir(tempExt, pression);
  const rho_int = calcRhoAir(tempIntMoyenne, pression);
  return CONSTANTS.g * hauteur * (rho_ext - rho_int);
}

/**
 * Dépression Venturi en toiture due au vent
 * ΔP_venturi = -0.5 · Cp · ρ_ext · v_vent²
 * Cp ≈ -0.5 (toiture plate, aspiration)
 * Résultat positif = aide le flux montant (aspiration en sortie)
 */
export function calcVenturiToiture(
  windSpeed: number,
  rho_ext: number,
  Cp: number = -0.5
): number {
  return -0.5 * Cp * rho_ext * windSpeed * windSpeed;
}

/**
 * Courbe de ventilateur (modèle réaliste)
 * P = P_max · (1 - (Q/Q_max)²)^0.8
 * 
 * Convention de signe:
 *   direction = +1 : la pression aide le flux montant (v > 0)
 *   direction = -1 : la pression aide le flux descendant (v < 0)
 */
export function calcPressionVentilateur(
  debitVolumique: number,
  fan: FanParams
): number {
  if (!fan.actif) return 0;

  const { pressionMax, debitMax, position, mode } = fan;

  // Courbe quadratique réaliste
  const ratio = Math.min(Math.abs(debitVolumique) / debitMax, 1);
  const pression = pressionMax * Math.pow(1 - ratio * ratio, 0.8);

  // Convention: v > 0 = flux montant, v < 0 = flux descendant.
  // Aspiration: l'air se dirige vers le ventilateur.
  // Poussée: l'air s'éloigne du ventilateur.
  //
  // Fan bas + aspiration → air descend vers le fan → direction -1
  // Fan bas + poussée    → air monte, poussé vers le haut → direction +1
  // Fan haut + aspiration → air monte vers le fan → direction +1
  // Fan haut + poussée   → air descend, poussé vers le bas → direction -1
  const direction =
    (position === 'haut' && mode === 'aspiration') ||
    (position === 'bas' && mode === 'poussee')
      ? 1
      : -1;

  return direction * pression;
}

/**
 * Perte de charge signée (s'oppose toujours au flux)
 * Utilise |v|·v pour conserver le signe
 */
function calcPerteSignee(
  vitesse: number,
  diametre: number,
  longueur: number,
  rho: number,
  f: number,
  angleCoude: number
): number {
  if (Math.abs(vitesse) < 1e-9) return 0;

  const perteRepartie = f * (longueur / diametre) * (rho * Math.abs(vitesse) * vitesse) / 2;

  let K_coude = COEFFICIENTS_K.coude45;
  if (angleCoude <= 45) {
    K_coude = COEFFICIENTS_K.coude45 * (angleCoude / 45);
  } else if (angleCoude <= 90) {
    K_coude = COEFFICIENTS_K.coude45 +
      (angleCoude - 45) / 45 * (COEFFICIENTS_K.coude90 - COEFFICIENTS_K.coude45);
  } else {
    K_coude = COEFFICIENTS_K.coude90 + (angleCoude - 90) / 90 * 0.5;
  }

  const K_total = COEFFICIENTS_K.entree + K_coude + COEFFICIENTS_K.sortieToit + COEFFICIENTS_K.sortie;
  const perteSinguliere = K_total * rho * Math.abs(vitesse) * vitesse / 2;

  return perteRepartie + perteSinguliere;
}

/**
 * RÉSOLUTION DU DÉBIT PAR ÉQUILIBRE DES PRESSIONS
 * Résout: ΔP_fan + ΔP_stack + ΔP_venturi = ΔP_losses
 * 
 * CORRECTIONS vs version précédente:
 * 1. Tirage intégré segment par segment (tempAir[])
 * 2. tempExt dynamique (plus initial.tempExtBase fixe)
 * 3. Dépression Venturi en toiture
 * 4. Méthode sécante + bisection fallback (remplace grid-search 240 pts)
 */
export function resoudreDebit(
  geometry: GeometryParams,
  fan: FanParams,
  tempAir: number[],
  tempExt: number,
  windSpeed: number,
  pressionAtm: number
): {
  vitesse: number;
  debitVolumique: number;
  debitMassique: number;
  reynolds: number;
  pressionTirage: number;
  pressionVentilateur: number;
  pressionVenturi: number;
  pertesReparties: number;
  pertesSingulieres: number;
  pertesTotal: number;
  residuPression: number;
  regimeEcoulement: 'laminaire' | 'transition' | 'turbulent';
} {
  const hauteurTotale = geometry.hauteurTotale;
  const diametre = geometry.diametreInterieur;
  const rugosite = geometry.rugositeRelative;
  const dz = hauteurTotale / geometry.segmentsVerticaux;

  // Propriétés de l'air à température moyenne interne
  const tempIntMoyenne = tempAir.reduce((a, b) => a + b, 0) / tempAir.length;
  const rho = calcRhoAir(tempIntMoyenne, pressionAtm);
  const mu = calcMuAir(tempIntMoyenne);
  const rho_ext = calcRhoAir(tempExt, pressionAtm);

  // Pression de tirage (intégrée segment par segment)
  const pressionTirage = calcTirageIntegre(tempExt, tempAir, dz, pressionAtm);

  // Dépression Venturi en toiture
  const pressionVenturi = calcVenturiToiture(windSpeed, rho_ext);

  const section = Math.PI * diametre * diametre / 4;

  // Fonction résidu: tirage + ventilateur + venturi - pertes = 0
  const residu = (v: number): number => {
    const Re = calcReynolds(v, diametre, rho, mu);
    const f = calcFrictionFactor(Re, rugosite);
    const debitVol = section * Math.abs(v);
    const pvent = calcPressionVentilateur(debitVol, fan);
    const pertes = calcPerteSignee(v, diametre, hauteurTotale, rho, f, geometry.angleCoude);
    return pressionTirage + pvent + pressionVenturi - pertes;
  };

  // =========================================================================
  // SOLVEUR: Méthode sécante avec fallback bisection
  // =========================================================================

  let vitesse = 0;

  // Étape 1: Trouver un intervalle contenant la racine par scan rapide
  const vMin_scan = -20;
  const vMax_scan = 20;
  const nScan = 60;
  let bracketFound = false;
  let vA = vMin_scan;
  let vB = vMax_scan;
  let fA = residu(vA);

  for (let i = 1; i <= nScan; i++) {
    const vCandidate = vMin_scan + (i / nScan) * (vMax_scan - vMin_scan);
    const fCandidate = residu(vCandidate);
    if (fA * fCandidate <= 0) {
      vB = vCandidate;
      bracketFound = true;
      break;
    }
    vA = vCandidate;
    fA = fCandidate;
  }

  if (bracketFound) {
    // Étape 2a: Méthode sécante dans l'intervalle trouvé
    let v0 = vA;
    let v1 = vB;
    let f0 = residu(v0);
    let f1 = residu(v1);

    for (let iter = 0; iter < 40; iter++) {
      if (Math.abs(f1) < 1e-5) break;

      const denom = f1 - f0;
      if (Math.abs(denom) < 1e-14) break;

      let v_next = v1 - f1 * (v1 - v0) / denom;

      // Guard: rester dans des bornes raisonnables
      v_next = Math.max(-25, Math.min(25, v_next));

      // Vérifier si la sécante a convergé, sinon faire un pas de bisection
      const f_next = residu(v_next);
      if (Math.abs(f_next) < Math.abs(f1)) {
        // La sécante progresse
        v0 = v1;
        f0 = f1;
        v1 = v_next;
        f1 = f_next;
      } else {
        // Fallback bisection
        const vMid = 0.5 * (vA + vB);
        const fMid = residu(vMid);
        if (fA * fMid <= 0) {
          vB = vMid;
        } else {
          vA = vMid;
          fA = fMid;
        }
        v1 = vMid;
        f1 = fMid;
      }

      if (Math.abs(vB - vA) < 1e-6) break;
    }
    vitesse = v1;
  } else {
    // Étape 2b: Aucun bracket trouvé — choisir le point de plus faible résidu
    let bestV = 0;
    let bestAbs = Math.abs(residu(0));
    for (let i = 0; i <= nScan; i++) {
      const candidateV = vMin_scan + (i / nScan) * (vMax_scan - vMin_scan);
      const candidateAbs = Math.abs(residu(candidateV));
      if (candidateAbs < bestAbs) {
        bestAbs = candidateAbs;
        bestV = candidateV;
      }
    }
    vitesse = bestV;
  }

  // =========================================================================
  // Calculs finaux
  // =========================================================================

  const debitVolumique = section * vitesse;
  const debitMassique = rho * debitVolumique;
  const reynolds = calcReynolds(vitesse, diametre, rho, mu);

  const f_final = calcFrictionFactor(reynolds, rugosite);
  const pertesReparties = calcPertesReparties(vitesse, diametre, hauteurTotale, rho, f_final);
  const pertesSingulieres = calcPertesSingulieres(vitesse, rho, geometry.angleCoude);

  let regimeEcoulement: 'laminaire' | 'transition' | 'turbulent';
  if (reynolds < 2300) {
    regimeEcoulement = 'laminaire';
  } else if (reynolds < 4000) {
    regimeEcoulement = 'transition';
  } else {
    regimeEcoulement = 'turbulent';
  }

  return {
    vitesse,
    debitVolumique,
    debitMassique,
    reynolds,
    pressionTirage,
    pressionVentilateur: calcPressionVentilateur(Math.abs(debitVolumique), fan),
    pressionVenturi,
    pertesReparties,
    pertesSingulieres,
    pertesTotal: pertesReparties + pertesSingulieres,
    residuPression: residu(vitesse),
    regimeEcoulement,
  };
}

/**
 * Calcul du profil de pression vertical détaillé
 * Fournit la pression statique relative (P_int - P_ext) et ses composantes (P_tirage, P_pertes, P_fan).
 */
export function calcProfilPression(
  geometry: GeometryParams,
  fan: FanParams,
  tempAir: number[],
  tempExt: number,
  vitesse: number,
  pressionAtm: number
): import('./types').PressionZ[] {
  const nSegments = tempAir.length;
  const dz = geometry.hauteurTotale / nSegments;
  const diametre = geometry.diametreInterieur;
  const rugosite = geometry.rugositeRelative;

  const tempIntMoyenne = tempAir.reduce((a, b) => a + b, 0) / nSegments;
  const rho = calcRhoAir(tempIntMoyenne, pressionAtm);
  const rho_ext = calcRhoAir(tempExt, pressionAtm);
  const mu = calcMuAir(tempIntMoyenne);
  const reynolds = calcReynolds(vitesse, diametre, rho, mu);
  const f = calcFrictionFactor(reynolds, rugosite);

  const section = Math.PI * Math.pow(diametre, 2) / 4;
  const debitVolumique = section * Math.abs(vitesse);
  const pFanTotal = calcPressionVentilateur(debitVolumique, fan);

  // La perte totale répartie
  const dpRepartieZ = f * (dz / diametre) * (rho * vitesse * vitesse) / 2;

  // Pertes singulières (réparties arbitrairement ou placées précisément)
  const dpEntree = COEFFICIENTS_K.entree * rho * vitesse * vitesse / 2;
  const dpSortie = (COEFFICIENTS_K.sortieToit + COEFFICIENTS_K.sortie) * rho * vitesse * vitesse / 2;
  let K_coude = COEFFICIENTS_K.coude45;
  if (geometry.angleCoude > 45) {
    K_coude = COEFFICIENTS_K.coude90; // Approx
  }
  const dpCoude = K_coude * rho * vitesse * vitesse / 2;
  const iCoude = Math.floor((geometry.positionCoude / geometry.hauteurTotale) * nSegments);

  const profil: import('./types').PressionZ[] = [];
  
  let perteCumulee = dpEntree; // Perte d'entrée immédiate
  let tirageCumule = 0;
  let ventilateurCumule = fan.position === 'bas' ? pFanTotal : 0;
  
  // Pression au point bas z=0
  // P_statique_rel = P_fan_bas + P_tirage_0 - Pertes_0
  let pressionStatique = ventilateurCumule + tirageCumule - perteCumulee;
  
  profil.push({
    z: 0,
    pressionStatique,
    perteCumulee,
    tirageCumule,
    ventilateur: ventilateurCumule,
    venturi: 0
  });

  for (let i = 0; i < nSegments; i++) {
    const rho_int = calcRhoAir(tempAir[i], pressionAtm);
    const tirageLocal = CONSTANTS.g * (rho_ext - rho_int) * dz;
    
    let perteLocale = dpRepartieZ;
    if (i === iCoude) {
      perteLocale += dpCoude;
    }
    if (i === nSegments - 1) {
      perteLocale += dpSortie;
    }

    let fanLocal = 0;
    if (fan.position === 'haut' && i === nSegments - 1) {
      fanLocal = pFanTotal;
    }

    tirageCumule += tirageLocal;
    perteCumulee += perteLocale;
    ventilateurCumule += fanLocal;
    
    pressionStatique = ventilateurCumule + tirageCumule - perteCumulee;

    // A la dernière étape (sortie), ajouter l'effet venturi sur la pression relative
    const venturi = i === nSegments - 1 ? calcVenturiToiture(vitesse, rho_ext) : 0;
    pressionStatique += venturi;

    profil.push({
      z: (i + 1) * dz,
      pressionStatique,
      perteCumulee,
      tirageCumule,
      ventilateur: ventilateurCumule,
      venturi
    });
  }

  return profil;
}

// =============================================================================
// SECTION 3: CORRÉLATIONS DE CONVECTION
// =============================================================================

/**
 * Nombre de Nusselt interne (Gnielinski - plus précis que Dittus-Boelter)
 * Valide pour 0.5 < Pr < 2000 et 3000 < Re < 5×10⁶
 */
export function calcNusseltInterne(
  Re: number,
  Pr: number = CONSTANTS.Pr_air,
  L_over_D: number = 100
): number {
  if (Re < 2300) {
    // Laminaire - Graetz
    const Gz = Re * Pr * (1 / L_over_D);
    if (Gz < 10) return 3.66;
    return 1.953 * Math.pow(Gz, 1/3);
  } else if (Re < 4000) {
    // Transition - interpolation
    const Nu_lam = 3.66;
    const Nu_turb = calcGnielinski(4000, Pr);
    const ratio = (Re - 2300) / 1700;
    return Nu_lam + ratio * (Nu_turb - Nu_lam);
  } else {
    // Turbulent - Gnielinski
    return calcGnielinski(Re, Pr);
  }
}

function calcGnielinski(Re: number, Pr: number): number {
  const f_petukhov = (0.7905 * Math.log(Re) - 1.64);
  const friction_factor = Math.pow(f_petukhov, -2);
  const Nu = (friction_factor / 8) * (Re - 1000) * Pr / (1 + 12.7 * Math.sqrt(friction_factor / 8) * (Math.pow(Pr, 2/3) - 1));
  return Math.max(Nu, 3.66);
}

/**
 * Coefficient de convection interne
 * h_i = Nu · k / D
 */
export function calcHi(Nu: number, diametre: number, temperature: number): number {
  const k = calcKAir(temperature);
  return Nu * k / diametre;
}

/**
 * Coefficient de convection externe
 * Combinaison convection naturelle + forcée (vent)
 */
export function calcHe(
  vitesseVent: number,
  tempSurface: number,
  tempAmbiance: number,
  diametreExterne: number
): number {
  // Convection naturelle (plaque verticale)
  const dT = Math.abs(tempSurface - tempAmbiance);
  const h_naturel = dT > 0 ? 1.42 * Math.pow(dT / diametreExterne, 0.25) : 0;

  // Convection forcée par vent
  const h_force = 5 + 3.8 * vitesseVent;

  // Combinaison (méthode superposition)
  const R_naturel = h_naturel > 0 ? 1 / h_naturel : Infinity;
  const R_force = 1 / h_force;
  const R_total = Math.pow(Math.pow(R_naturel, -2) + Math.pow(R_force, -2), -0.5);

  return 1 / R_total;
}

// =============================================================================
// SECTION 4: COEFFICIENTS RÉSISTANCE THERMIQUE
// =============================================================================

/**
 * Résistance thermique convective interne par unité de longueur
 * R_conv,i = 1/(hi·π·D_i) [m·K/W]
 */
export function calcRConvInterne(hi: number, diametreInt: number): number {
  return 1 / (hi * Math.PI * diametreInt);
}

/**
 * Résistance thermique conductive du boisseau par unité de longueur
 * R_cond = ln(D_e/D_i) / (2π·k) [m·K/W]
 */
export function calcRCondBoisseau(
  diametreInt: number,
  epaisseur: number,
  conductivite: number
): number {
  const diametreExt = diametreInt + 2 * epaisseur;
  return Math.log(diametreExt / diametreInt) / (2 * Math.PI * conductivite);
}

/**
 * Résistance thermique convective externe par unité de longueur
 * R_conv,e = 1/(he·π·D_e) [m·K/W]
 */
export function calcRConvExterne(he: number, diametreInt: number, epaisseur: number): number {
  const diametreExt = diametreInt + 2 * epaisseur;
  return 1 / (he * Math.PI * diametreExt);
}

// =============================================================================
// SECTION 5: DIFFUSION RADIALE (BOISSEAU)
// =============================================================================

/**
 * Coefficient de diffusion thermique
 * α = k / (ρ·c_p) [m²/s]
 */
export function calcAlphaThermique(k: number, rho: number, cp: number): number {
  return k / (rho * cp);
}

/**
 * Pas de temps maximal stable pour diffusion 1D (critère de Fourier)
 * Δt_max = Δr² / (2·α)
 */
export function calcDtMaxDiffusion(dr: number, alpha: number): number {
  return dr * dr / (2 * alpha);
}

/**
 * Pas de temps maximal pour convection (CFL)
 * Δt_max = Δz / |v|
 * CORRIGÉ: utilise Math.abs(vitesse) pour gérer les flux descendants
 */
export function calcDtMaxConvection(dz: number, vitesse: number): number {
  const v_abs = Math.abs(vitesse);
  if (v_abs < 1e-6) return Infinity;
  return dz / v_abs;
}
