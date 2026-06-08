# Simulateur Analytique de Cheminée Maçonnée — `chemineejsp`

## Modèle RC Transitoire 1D Couplé Solide-Fluide

Ce simulateur modélise le comportement **thermique transitoire** d'une cheminée maçonnée (conduit de fumée collectif en terre cuite, béton ou inox) équipée d'un ventilateur, sur une durée de quelques heures à 48 h. Il utilise un modèle analytique **RC (résistance-capacité)** couplé à une résolution hydraulique par bilan de pression, en alternative aux simulations CFD lourdes.

**Objectif principal** : Prédire l'impact thermique de la ventilation via le conduit de cheminée sur la température de l'appartement, en fonction de la météo, de la géométrie et des matériaux.

---

## Table des Matières

1. [Installation et Démarrage](#1-installation-et-démarrage)
2. [Utilisation de l'Interface](#2-utilisation-de-linterface)
3. [Architecture du Code](#3-architecture-du-code)
4. [Pipeline de Simulation — Du Clic au Résultat](#4-pipeline-de-simulation--du-clic-au-résultat)
5. [Modèle Mathématique Complet (Théorie)](#5-modèle-mathématique-complet-théorie)
6. [Schémas Numériques et Stabilité](#6-schémas-numériques-et-stabilité)
7. [Scripts Utilitaires (CLI)](#7-scripts-utilitaires-cli)
8. [Validation et Tests](#8-validation-et-tests)
9. [Limites et Hypothèses du Modèle](#9-limites-et-hypothèses-du-modèle)
10. [Références Bibliographiques](#10-références-bibliographiques)

---

## 1. Installation et Démarrage

### Pré-requis

- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
cd chemineejsp
npm install
```

### Lancement (serveur de développement)

```bash
npm run dev
```

L'application web est disponible sur `http://localhost:5173` (Vite).

### Build production

```bash
npm run build
npm run preview
```

### Stack technique

| Couche        | Technologie                         |
| ------------- | ----------------------------------- |
| Framework     | React 18 + TypeScript               |
| Bundler       | Vite 5                              |
| Graphiques    | Plotly.js (via react-plotly.js)      |
| Icônes        | Lucide React                        |
| CSS           | Tailwind CSS 3                      |
| Lint          | ESLint 9 + typescript-eslint        |

---

## 2. Utilisation de l'Interface

L'application comporte **6 onglets** accessibles depuis la barre de navigation :

| Onglet             | Description |
| ------------------ | ----------- |
| **Vue d'ensemble** | KPIs temps réel, schéma interactif de la cheminée, coupe thermique radiale, profil de pression vertical, et graphiques rapides (températures, puissance). |
| **Paramètres**     | Formulaire complet pour configurer la géométrie, les matériaux (4 préréglages), le ventilateur (position, mode, courbe), l'appartement, les conditions initiales, la simulation et la source météo (3 modes). |
| **Coupe thermique** | Visualisation en temps simulé de la distribution radiale de température dans le boisseau (face interne → face externe) pour un segment choisi, et heatmap axiale. |
| **Graphiques**     | Graphiques Plotly interactifs : températures temporelles, puissance, énergie cumulée, débit/vitesse, profil axial, heatmaps (température, vitesse). |
| **Validation**     | Suite de tests automatisés (36+ scénarios) couvrant la stabilité numérique, la physique, l'UI et la performance. Score de fiabilité global. |
| **Théorie**        | Documentation théorique complète du modèle, exportable en HTML. |

### Workflow type

1. **Configurer** les paramètres (onglet *Paramètres*) : géométrie, matériau, ventilateur, appartement, météo.
2. **Lancer** la simulation (bouton *Lancer*) — progression affichée en temps réel.
3. **Explorer** les résultats via la timeline glissante en bas de page (lecture/pause, vitesse ×1 à ×16).
4. **Analyser** les graphiques et KPIs.
5. **Exporter** en CSV (bouton *CSV*) pour exploitation externe.

### Modes météo

| Mode           | Description |
| -------------- | ----------- |
| **Fixe**       | T_ext et vent constants pendant toute la simulation (définis dans les conditions initiales). |
| **Mensuelle**  | Données Paris 2025 avec variation diurne sinusoïdale. Choix du mois et de l'heure de début. |
| **Personnalisée** | Tableau de 25 points (0h-24h) de température et vent, éditables par l'utilisateur. Paliers horaires. |

---

## 3. Architecture du Code

```
chemineejsp/
├── src/
│   ├── lib/                          # ← MOTEUR DE CALCUL (pur TypeScript, sans dépendance React)
│   │   ├── types.ts                  # Interfaces, constantes physiques, coefficients K
│   │   ├── defaults.ts               # Paramètres par défaut, données météo Paris 2025, scénarios
│   │   ├── physics.ts                # Propriétés air, hydraulique, convection, résistances thermiques
│   │   ├── solver.ts                 # Solveur transitoire semi-implicite (cœur du calcul)
│   │   ├── weather.ts                # Service météo (3 modes : fixe / mensuel / personnalisé)
│   │   ├── validation.ts             # 4 tests physiques rapides (tirage naturel, adiabatique, etc.)
│   │   └── testRunner.ts             # Matrice de validation exhaustive (36+ scénarios)
│   │
│   ├── components/                   # ← COMPOSANTS REACT (UI)
│   │   ├── ParameterForm.tsx         # Formulaire de saisie complet (33 Ko)
│   │   ├── Charts.tsx                # 6 types de graphiques Plotly
│   │   ├── ChimneySchematic.tsx      # Schéma SVG interactif du conduit
│   │   ├── KPICards.tsx              # Cartes KPI (vitesse, Re, Nu, hi, he, T, puissance)
│   │   ├── Diagnostics.tsx           # Panneau de diagnostic (résidus, CFL, conservation)
│   │   ├── ThermalSection.tsx        # Coupe radiale du boisseau
│   │   ├── PressureGradient.tsx      # Profil de pression vertical (tirage, pertes, fan)
│   │   ├── TimelineControl.tsx       # Barre de lecture temporelle
│   │   ├── DraggablePanel.tsx        # Panneau flottant redimensionnable
│   │   ├── TheoryDocs.tsx            # Documentation théorique inline
│   │   ├── TestSuite.tsx             # Interface de la suite de validation
│   │   └── ValidationReport.tsx      # Rapport de validation formaté
│   │
│   ├── App.tsx                       # Application principale (orchestration)
│   ├── main.tsx                      # Point d'entrée React
│   └── index.css                     # Styles globaux
│
├── generate_synthetic_data.ts        # Script CLI : génération de données synthétiques
├── run_chemineejsp_for_comparison.ts # Script CLI : comparaison avec mesures réelles
├── thermal_validation.ts             # Script CLI : validation thermique état stationnaire
├── benchmark_validation.ts           # Script CLI : benchmark tirage naturel vs ASHRAE
├── profile.ts                        # Script CLI : profiling de performance
├── profile_durations.ts              # Script CLI : profiling par durée
│
├── synthetic_data_7m.csv             # Données synthétiques générées (6h, T à 7m)
├── chemineejsp_output.csv            # Résultats de comparaison avec mesures
│
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── tailwind.config.js / postcss.config.js
└── eslint.config.js
```

### Séparation des responsabilités

Le code est strictement séparé en deux couches :

- **`src/lib/`** : Moteur physique pur (zéro dépendance UI). Peut être importé dans des scripts Node.js CLI pour le benchmarking, la génération de données, ou l'intégration dans d'autres outils.
- **`src/components/`** : Interface React. Ne contient aucune logique physique, consomme uniquement les types et résultats du moteur.

---

## 4. Pipeline de Simulation — Du Clic au Résultat

Voici le flux complet lorsqu'on clique sur **Lancer** :

```
┌─────────────────────────────────────────────────────────────────────┐
│  App.tsx::handleRun()                                               │
│  1. Synchronise les conditions initiales avec la météo à t=0        │
│  2. Appelle resetSolverCache()                                      │
│  3. Appelle runSimulation(params, weatherData, onProgress)          │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  solver.ts::runSimulation()  — BOUCLE PRINCIPALE                    │
│                                                                     │
│  while (temps < durée):                                             │
│    ┌─────────────────────────────────────────────────────────────┐   │
│    │ 1. stepWeather() → T_ext, windSpeed pour cet instant       │   │
│    │                                                             │   │
│    │ 2. pasSimulation() :                                        │   │
│    │    a. HYDRAULIQUE (tous les 5s, cache sinon)                │   │
│    │       • Calcul du tirage intégré segment par segment        │   │
│    │       • Calcul du Venturi toiture                           │   │
│    │       • Résolution v par sécante + bisection fallback       │   │
│    │       • → vitesse, débit, Re, ΔP                            │   │
│    │                                                             │   │
│    │    b. PAS DE TEMPS ADAPTATIF                                │   │
│    │       • dt = CFL_target · Δz / |v|                          │   │
│    │       • Borné entre 0.05s et 30s                            │   │
│    │                                                             │   │
│    │    c. PHASE 1 : THERMIQUE AIR (semi-implicite)              │   │
│    │       • Advection upwind explicite                          │   │
│    │       • Échange air-paroi implicite                         │   │
│    │       • Clamp physique des températures                     │   │
│    │                                                             │   │
│    │    d. PHASE 2 : THERMIQUE BOISSEAU (Euler explicite radial) │   │
│    │       • Convection interne (hi) → nœud 0                   │   │
│    │       • Conduction cylindrique inter-nœuds                  │   │
│    │       • Convection externe (he) → nœud N-1                  │   │
│    │                                                             │   │
│    │    e. PHASE 3 : THERMIQUE APPARTEMENT                       │   │
│    │       • Apport cheminée + ventilation naturelle             │   │
│    │       • Pertes enveloppe                                    │   │
│    │                                                             │   │
│    │    f. BILAN ÉNERGÉTIQUE + CFL + WARNINGS                   │   │
│    └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Stocke ~2000 états pour l'affichage                                │
│  Yield au navigateur tous les 50 pas                                │
│  Arrêt de sécurité à 5 000 000 itérations                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Modèle Mathématique Complet (Théorie)

### 5.0 Physique Intuitive

Avant les équations, voici les principes physiques clés :

- **Tirage naturel (effet cheminée)** : L'air chaud à l'intérieur du conduit est moins dense que l'air froid extérieur. La colonne d'air chaud « flotte » vers le haut, créant une dépression en bas du conduit qui aspire l'air depuis l'appartement. Plus l'écart de température int/ext est grand, plus le tirage est fort.

- **Inertie thermique** : La maçonnerie (terre cuite : ρ = 1800 kg/m³, cp = 840 J/kg·K) accumule de la chaleur. Après arrêt de la ventilation, la brique restitue lentement cette énergie → tirage résiduel pendant des heures.

- **Puissance vs Énergie** : La *puissance thermique* (W) est le flux de chaleur instantané échangé entre l'air et la paroi. L'*énergie cumulée* (kWh) est l'intégrale temporelle de cette puissance — la quantité totale de chaleur perdue par le bâtiment via la cheminée.

---

### 5.1 Propriétés Thermo-physiques de l'Air

Les propriétés sont calculées en fonction de la température, et non constantes.

| Propriété | Formule | Référence |
|-----------|---------|-----------|
| **Masse volumique** | ρ = P / (R·T) avec R = 287 J/kg·K | Loi des gaz parfaits |
| **Viscosité dynamique** | Loi de Sutherland : μ = μ_ref · (T/T_ref)^1.5 · (T_ref + S) / (T + S), avec μ_ref = 1.716×10⁻⁵ Pa·s, T_ref = 273.15 K, S = 110.4 K | Sutherland (1893) |
| **Conductivité thermique** | k = 0.0241 · (T/273.15)^0.9 W/m·K | Corrélation empirique |
| **Capacité thermique** | cp = 1005 + 1.86·(HR·100) J/kg·K | Influence légère de l'humidité |
| **Nombre de Prandtl** | Pr = 0.71 (constante) | Air sec |

> Les propriétés sont regroupées dans `calcAirProps()` et calculées **une seule fois par pas de temps** à la température moyenne de l'air dans le conduit (optimisation : évite les appels redondants).

---

### 5.2 Modèle Hydraulique

#### 5.2.1 Équation d'équilibre des pressions

Le débit est déterminé par l'équilibre :

```
ΔP_ventilateur + ΔP_tirage + ΔP_venturi = ΔP_pertes
```

Où :
- **ΔP_ventilateur** : pression fournie par le ventilateur (Pa)
- **ΔP_tirage** : tirage thermique naturel (Pa)
- **ΔP_venturi** : dépression en toiture due au vent (Pa)
- **ΔP_pertes** : pertes de charge réparties + singulières (Pa)

#### 5.2.2 Tirage thermique intégré

Le tirage est calculé **segment par segment** (et non à température moyenne) pour capturer les gradients axiaux :

```
ΔP_tirage = Σᵢ g · (ρ_ext - ρ_int(Tᵢ)) · Δz
```

Avec ρ_ext et ρ_int calculés via la loi des gaz parfaits. Si l'air intérieur est globalement plus chaud que l'air extérieur → tirage positif → flux montant.

#### 5.2.3 Pertes de charge réparties (Darcy-Weisbach)

```
ΔP_friction = f · (L/D) · (ρ·v²/2)
```

Le facteur de friction `f` est déterminé selon le régime d'écoulement :

| Régime | Condition | Formule |
|--------|-----------|---------|
| Laminaire | Re < 2300 | f = 64 / Re |
| Transition | 2300 ≤ Re < 4000 | Interpolation linéaire entre laminaire et turbulent |
| Turbulent | Re ≥ 4000 | Swamee-Jain : f = 0.25 / [log₁₀(ε/(3.7D) + 5.74/Re⁰·⁹)]² |

> L'approximation de Swamee-Jain est une forme explicite de l'équation implicite de Colebrook-White, avec une erreur < 1% pour 10⁻⁶ < ε/D < 10⁻² et 5000 < Re < 10⁸.

#### 5.2.4 Pertes de charge singulières

```
ΔP_singulière = Σ Kᵢ · (ρ·v²/2)
```

| Élément | Coefficient K | Source |
|---------|---------------|--------|
| Entrée (arêtes vives) | 0.5 | Idel'cik |
| Coude 45° | 0.3 | Idel'cik |
| Coude 90° | 0.75 | Idel'cik |
| Traversée toiture | 0.5 | Estimation |
| Sortie libre | 1.0 | Standard |

Pour les angles intermédiaires, le coefficient K est interpolé linéairement.

> **Convention de signe** : Les pertes s'opposent toujours au sens du flux. Le code utilise |v|·v pour conserver le signe dans `calcPerteSignee()`.

#### 5.2.5 Dépression Venturi en toiture

Le vent crée une aspiration au sommet du conduit via l'effet de pression du vent sur la toiture :

```
ΔP_venturi = -0.5 · Cp · ρ_ext · v_vent²
```

Avec Cp ≈ -0.5 (coefficient de pression, toiture plate, aspiration). Le résultat est positif → aide le flux montant.

#### 5.2.6 Courbe de ventilateur

Le ventilateur est modélisé par une courbe pression-débit réaliste (et non un ΔP constant) :

```
P_fan = P_max · (1 - (Q/Q_max)²)^0.8
```

Le signe de P_fan dépend de la configuration :

| Position | Mode | Sens favorisé |
|----------|------|---------------|
| Haut | Aspiration | Flux montant (+1) |
| Bas | Poussée | Flux montant (+1) |
| Bas | Aspiration | Flux descendant (-1) |
| Haut | Poussée | Flux descendant (-1) |

En **mode automatique**, le ventilateur s'active lorsque T_ext < T_appartement.

#### 5.2.7 Résolution numérique du débit

L'équation d'équilibre est **non linéaire** (f dépend de Re, qui dépend de v). Le solveur utilise :

1. **Scan rapide** (60 points entre -20 et +20 m/s) pour trouver un intervalle contenant la racine (changement de signe du résidu).
2. **Méthode sécante** dans l'intervalle trouvé (convergence super-linéaire).
3. **Fallback bisection** si la sécante ne progresse pas (convergence garantie).
4. Si aucun bracket n'est trouvé → retourne le point de plus faible résidu.

Tolérance : |résidu| < 10⁻⁵ Pa, ou |vB - vA| < 10⁻⁶ m/s. Maximum 40 itérations.

---

### 5.3 Modèle Thermique de l'Air (1D Axial Transitoire)

#### 5.3.1 Équation d'énergie

Pour chaque segment axial *i* du conduit, l'équation de conservation d'énergie s'écrit :

```
ρ·A·cp · ∂Tf/∂t + ṁ·cp · ∂Tf/∂z = hi · P · (Ts,i - Tf,i)
```

Où :
- Tf : température de l'air dans le segment (°C)
- Ts,i : température de la face interne du boisseau au segment i (°C)
- P = π·D_int : périmètre intérieur du conduit (m)
- A = π·D_int²/4 : section du conduit (m²)
- hi : coefficient de convection interne (W/m²·K)
- ṁ = ρ·A·v : débit massique (kg/s)

#### 5.3.2 Discrétisation semi-implicite

Le schéma combine :
- **Advection explicite** (upwind / amont) :
  - v > 0 (flux montant) : ∂T/∂z ≈ (Tᵢ - Tᵢ₋₁) / Δz
  - v < 0 (flux descendant) : ∂T/∂z ≈ (Tᵢ₊₁ - Tᵢ) / Δz

- **Échange air-paroi implicite** :

```
Tᵢⁿ⁺¹ = (Tᵢⁿ + Δt·Advection + α·Ts,i) / (1 + α)
```

avec α = Δt · hi · P / (ρ · cp · A)

> L'échange thermique étant traité implicitement, le schéma est **inconditionnellement stable** vis-à-vis du couplage air-paroi (pas de restriction de pas de temps liée à hi). Seule la CFL de l'advection impose une contrainte.

**Conditions aux limites** :
- Si v > 0 : T_entrée = T_appartement (flux montant, air aspiré depuis l'appartement)
- Si v < 0 : T_entrée = T_ext (flux descendant, air extérieur aspiré)

**Clamp physique** : Après chaque pas, les températures d'air sont bornées à [T_min - 0.5, T_max + 0.5] où T_min et T_max englobent toutes les sources et puits thermiques (T_ext, T_app, Ts) pour prévenir les oscillations non physiques.

---

### 5.4 Modèle Thermique de la Maçonnerie (1D Radial)

#### 5.4.1 Équation de diffusion radiale

La conduction dans la paroi cylindrique est modélisée par l'équation de diffusion 1D :

```
ρs · cs · ∂Ts/∂t = (1/r) · ∂/∂r (r · ks · ∂Ts/∂r)
```

Le boisseau est discrétisé en **N_radial nœuds** (par défaut 4) répartis sur l'épaisseur entre r_int = D_int/2 et r_ext = r_int + épaisseur.

#### 5.4.2 Discrétisation en réseau RC

Chaque nœud radial est caractérisé par :
- **Capacité thermique** Cⱼ = ρs · cs · π · (rⱼ₊₁² - rⱼ²) · Δz [J/K]
- **Résistance de conduction** entre nœuds j et j+1 : Rⱼ = ln(rⱼ₊₁/rⱼ) / (2π · ks · Δz) [K/W]

La mise à jour est **Euler explicite** :

```
Ts,j^(n+1) = Ts,j^n + (Σ flux_j / Cj) · Δt
```

Les flux aux nœuds :
- **Nœud 0 (face interne)** : flux = hi · A_int · (T_air - Ts,0) + flux_conduction vers nœud 1
- **Nœuds internes** : flux = conduction entrante - conduction sortante
- **Nœud N-1 (face externe)** : flux = he · A_ext · (T_ext - Ts,N-1) + flux_conduction depuis nœud N-2

> Avec 4 nœuds radiaux et une épaisseur de 0.22 m (Δr ≈ 55 mm), le pas de temps critique de Fourier est Δt_max = Δr²/(2α) ≈ 3150 s ≫ dt_simulation typique. La diffusion radiale n'est donc jamais limitante pour la stabilité.

#### 5.4.3 Conditions aux limites

| Frontière | Type | Formulation |
|-----------|------|-------------|
| Paroi interne (r = r_int) | Convection interne | q = hi · (T_air - Ts,0) |
| Paroi externe (r = r_ext) | Convection externe combinée | q = he · (T_ext - Ts,N-1) |

---

### 5.5 Corrélations de Convection

#### 5.5.1 Convection interne (hi)

Le nombre de Nusselt interne est calculé selon le régime :

| Régime | Condition | Corrélation | Source |
|--------|-----------|-------------|--------|
| Laminaire établi | Re < 2300, Gz < 10 | Nu = 3.66 | Shah & London (1978) |
| Laminaire en développement | Re < 2300, Gz ≥ 10 | Nu = 1.953 · Gz^(1/3) | Graetz (1883) |
| Transition | 2300 ≤ Re < 4000 | Interpolation linéaire | — |
| Turbulent | Re ≥ 4000 | Gnielinski (voir ci-dessous) | Gnielinski (1976) |

**Corrélation de Gnielinski** (turbulent, 0.5 < Pr < 2000, 3000 < Re < 5×10⁶) :

```
f_Petukhov = (0.7905 · ln(Re) - 1.64)⁻²

Nu = (f/8) · (Re - 1000) · Pr / [1 + 12.7 · √(f/8) · (Pr^(2/3) - 1)]
```

> La corrélation de Gnielinski est utilisée à la place de Dittus-Boelter (Nu = 0.023·Re⁰·⁸·Pr⁰·⁴) car elle est **plus précise dans la zone de transition** (erreur < 10% vs < 25% pour Dittus-Boelter).

Le coefficient de convection :

```
hi = Nu · k_air / D_int
```

#### 5.5.2 Convection externe (he)

Le coefficient externe combine convection naturelle et forcée par le vent :

```
h_naturel = 1.42 · (|ΔT| / D_ext)^0.25    (plaque verticale)
h_forcé = 5 + 3.8 · v_vent                  (corrélation ASHRAE)
```

La combinaison utilise une **superposition par résistances** :

```
1/he² = 1/h_nat² + 1/h_forcé²    →    he = √(h_nat² + h_forcé²)
```

Valeurs typiques : 5-8 W/m²·K (air calme) → 20-30 W/m²·K (vent fort).

---

### 5.6 Modèle de l'Appartement

L'appartement est modélisé comme un volume d'air unique avec inertie thermique :

```
C_app · dT_app/dt = Q_cheminée + Q_infiltrations + Q_enveloppe
```

Avec :
- **C_app** = V · ρ · cp + C_inertie : capacité thermique totale (air + meubles + structure)
- **Q_cheminée** = ṁ_conduit · cp · (T_source - T_app) : apport/perte via le conduit
- **Q_infiltrations** = ṁ_nat · cp · (T_ext - T_app) : renouvellement d'air naturel
- **Q_enveloppe** = UA · (T_ext - T_app) : déperditions par l'enveloppe

Le sens du flux dans la cheminée détermine T_source : si le flux est descendant (v < 0), l'air du conduit est injecté dans l'appartement → T_source = T_air_sortie.

---

### 5.7 Profil de Pression Vertical

Le profil de pression statique relative (P_int - P_ext) est reconstruit segment par segment :

```
P_statique(z) = P_ventilateur(z) + P_tirage_cumulé(z) - Pertes_cumulées(z) + P_venturi(z)
```

Chaque composante est accumulée le long du conduit, avec les singularités placées à leur position physique (entrée → z=0, coude → z=position_coude, sortie → z=H).

---

## 6. Schémas Numériques et Stabilité

### 6.1 Pas de temps adaptatif

Le pas de temps est calculé dynamiquement pour respecter la condition CFL :

```
Δt = CFL_target · Δz / |v|
```

Borné entre Δt_min = 0.05 s et Δt_max = 30 s.

| Mode | CFL cible | Compromis |
|------|-----------|-----------|
| Stable | 0.8 | Bonne précision, vitesse raisonnable |
| Rapide | 0.95 | Vitesse maximale, stabilité limite |
| Précis | 0.5 | Haute précision, plus lent |

### 6.2 Découplage hydraulique

L'hydraulique (calcul de v via le bilan de pression) n'est **recalculée que toutes les 5 secondes simulées** (cache `_cachedHydraulique`). Entre deux recalculs, la vitesse est supposée constante. Ce découplage repose sur le fait que l'hydraulique évolue beaucoup plus lentement que la thermique (constante de temps hydrodynamique ≪ constante de temps thermique de la brique).

> **Gain de performance** : ×100 à ×1000 par rapport à un recalcul hydraulique à chaque pas.

### 6.3 Critères de stabilité

| Critère | Formule | Seuil |
|---------|---------|-------|
| CFL (advection air) | v · Δt / Δz | < 1.0 (warning) |
| Fourier (diffusion solide) | α · Δt / Δr² | < 0.5 (automatique) |
| Conservation d'énergie | |ΔE_air - (E_advection + E_paroi)| / E_ref | < 5% (warning), < 10% (erreur) |

### 6.4 Stockage des résultats

La boucle de simulation stocke au maximum ~2000 points pour l'affichage (sous-échantillonnage automatique). Le profil de pression vertical n'est calculé que pour les états stockés (et non à chaque pas) pour économiser du temps de calcul.

---

## 7. Scripts Utilitaires (CLI)

Ces scripts importent directement le moteur `src/lib/` et s'exécutent dans Node.js (via `tsx` ou `ts-node`) :

| Script | Objectif | Commande |
|--------|----------|----------|
| `generate_synthetic_data.ts` | Génère 6h de données synthétiques (tirage naturel → ventilateur ON → coupure) et exporte un CSV avec T à 7m. | `npx tsx generate_synthetic_data.ts` |
| `run_chemineejsp_for_comparison.ts` | Lit un fichier CSV de mesures réelles (`Temperature.csv`) et simule les mêmes conditions avec chemineejsp. Compare la température prédite à 7m. | `npx tsx run_chemineejsp_for_comparison.ts` |
| `thermal_validation.ts` | Valide la thermique en régime permanent : compare T_sortie numérique vs formule analytique exponentielle T(L) = T_ext + (T_in - T_ext)·exp(-U·P·L/(ṁ·cp)). | `npx tsx thermal_validation.ts` |
| `benchmark_validation.ts` | Benchmark de tirage naturel pur (pas de vent, pas de ventilateur) : compare le tirage calculé au tirage théorique ASHRAE. | `npx tsx benchmark_validation.ts` |
| `profile.ts` | Profiling de performance de la boucle de simulation (décomposition du temps : pasSimulation, météo, stockage). | `npx tsx profile.ts` |

---

## 8. Validation et Tests

### 8.1 Tests physiques rapides (`validation.ts`)

4 cas de test avec résultats pass/fail :

| Test | Vérifie |
|------|---------|
| **Sans ventilateur** | Tirage naturel positif, vitesse < 5 m/s, pas de divergence. |
| **Parois adiabatiques** | Avec k ≈ 0, la température d'air ne varie presque pas (ΔT < 2°C). |
| **Conduit froid** | Refroidissement progressif, T_air ne descend pas sous T_ext. |
| **Ventilation forte** | Pas d'oscillations excessives sous forçage variable. |

### 8.2 Matrice de validation complète (`testRunner.ts`)

36+ scénarios automatiques couvrant :

| Catégorie | Scénarios | Vérifications |
|-----------|-----------|---------------|
| **Numérique** | 36 combinaisons (6 heures de début × 6 durées : 15min à 24h) | CFL < 1, conservation énergie < 5%, valeurs finies, continuité temporelle. |
| **Physique** | 4 configurations de ventilateur (haut/bas × aspiration/poussée), tirage naturel, météo froide/tempérée/chaude, mode auto, CFL extrême | Sens du flux correct, débit non nul si fan actif, bornes physiques de température. |
| **UI** | 2 scénarios | Pas d'overflow horizontal, contrôles UI présents, éléments visuels valides. |
| **Performance** | 1 scénario (48h) | Temps de calcul < 60 s. |

Chaque scénario produit des métriques détaillées : CFL max, erreur énergétique P95, oscillation, Reynolds max, runtime, etc.

Le rapport final calcule un **score de fiabilité** global (0-100%) et fournit des recommandations.

---

## 9. Limites et Hypothèses du Modèle

| Hypothèse | Justification / Conséquence |
|-----------|-----------------------------|
| Modèle 1D axial pour l'air | Acceptable pour L/D > 100 (ici L/D ≈ 133). Écoulement développé sur la quasi-totalité du conduit. |
| Conduction axiale négligée dans la maçonnerie | Le nombre de Peclet axial dans le solide est très élevé (Pe_axial = ρ·cp·v_conduit·L / k_solide ≫ 1). La conduction axiale dans la brique est négligeable devant le transport convectif de l'air. |
| Propriétés de l'air variables | ρ, μ, k varient avec T. cp varie légèrement avec l'humidité. |
| Ventilateur modélisé par une courbe P(Q) | Plus réaliste qu'un ΔP constant. Modèle quadratique P = P_max·(1-(Q/Q_max)²)^0.8. |
| Pas de rayonnement explicite | Le rayonnement externe de la cheminée est intégré implicitement dans he. Le rayonnement interne (paroi-air) est négligé (surfaces à T < 100°C). |
| Pas de condensation | L'humidité n'influence que cp_air. Pas de modèle de condensation/évaporation dans le conduit. |
| Géométrie cylindrique uniforme | Pas de variation de section le long du conduit. Le coude est modélisé par une perte singulière K. |
| Météo par paliers horaires | Pas d'interpolation continue entre les heures — c'est une step function. |

---

## 10. Références Bibliographiques

1. **Incropera, F. P. & DeWitt, D. P.** (2007). *Fundamentals of Heat and Mass Transfer* (6th ed.). Wiley.
   — Référence principale pour les corrélations de convection (Nusselt, Gnielinski, Dittus-Boelter) et les modèles de conduction.

2. **ASHRAE** (2021). *ASHRAE Handbook — Fundamentals*. American Society of Heating, Refrigerating and Air-Conditioning Engineers.
   — Corrélation convection externe he = 5 + 3.8·v_vent. Tirage de cheminée.

3. **Idel'cik, I. E.** (2005). *Handbook of Hydraulic Resistance* (4th ed.). IPC.
   — Coefficients de pertes singulières K (entrée, coudes, sortie).

4. **Munson, B. R., Young, D. F. & Okiishi, T. H.** (2006). *Fundamentals of Fluid Mechanics* (5th ed.). Wiley.
   — Facteur de friction Darcy-Weisbach, diagramme de Moody.

5. **Gnielinski, V.** (1976). *New equations for heat and mass transfer in turbulent pipe and channel flow*. International Chemical Engineering, 16(2), 359-368.
   — Corrélation de Nusselt turbulent utilisée dans le code.

6. **Swamee, P. K. & Jain, A. K.** (1976). *Explicit equations for pipe-flow problems*. Journal of the Hydraulics Division, 102(5), 657-664.
   — Approximation explicite de Colebrook-White pour le facteur de friction.

7. **Kreith, F., Manglik, R. M. & Bohn, M. S.** (2010). *Principles of Heat Transfer* (7th ed.). Cengage Learning.
   — Diffusion radiale en coordonnées cylindriques, réseau RC.

8. **Sutherland, W.** (1893). *The viscosity of gases and molecular force*. Philosophical Magazine, 36(223), 507-531.
   — Loi de viscosité dynamique utilisée dans `calcMuAir()`.

---

**Version** : 3.0 (semi-implicite optimisé)  
**Projet** : Vestaclim — Simulation thermique de conduits de cheminée maçonnée
