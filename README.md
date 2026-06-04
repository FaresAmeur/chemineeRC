# Simulateur Analytique de Cheminée Maçonnée

## Modèle RC Transitoire 1D Couplé Solide-Fluide

Ce simulateur modélise le comportement thermique transitoire d'une cheminée maçonnée de 20 mètres de hauteur avec ventilateur en tirage, utilisant un modèle analytique RC (résistance-capacité) au lieu de CFD.

## Caractéristiques

### Modèle Physique
- **Hydraulique 1D** : Bilan de pression complet avec ventilateur, tirage thermique naturel, pertes de charge (Darcy-Weisbach), pertes singulières (coude 45°, entrée/sortie)
- **Thermique air 1D** : Équation d'énergie transitoire avec schéma upwind explicite
- **Thermique solide 1D radial** : Diffusion thermique dans la maçonnerie discrétisée en réseau RC
- **Corrélations de convection** : Dittus-Boelter (turbulent), Nu=3.66 (laminaire), convection externe dépendant du vent

### Interface Utilisateur
- **4 onglets** : Vue d'ensemble, Paramètres, Simulation, Théorie
- **Formulaire complet** : Tous les paramètres géométriques, matériaux, ventilateur, conditions initiales
- **Visualisations interactives** : Graphiques Chart.js (températures, puissance, énergie, débit, profil axial)
- **KPIs temps réel** : Vitesse, Reynolds, Nusselt, coefficients hi/he, températures, puissance thermique
- **Export CSV** : Toutes les données de simulation exportables

### Intégration Météo
- **API Open-Meteo** (gratuit, sans clé)
- **Données d'exemple** intégrées (Paris)
- **Données synthétiques** générables

## Installation

```bash
npm install
npm run dev
```

## Utilisation

1. **Configurer les paramètres** (onglet Paramètres) : géométrie, propriétés de la brique, ventilateur (ΔP), conditions initiales
2. **Sélectionner la source météo** (onglet Simulation)
3. **Lancer la simulation** (bouton "Simuler")
4. **Consulter les résultats** : graphiques temporels, profil axial, KPIs
5. **Exporter les données** (bouton Download) au format CSV

## Structure du Code

```
src/
├── lib/
│   ├── types.ts        # Interfaces TypeScript
│   ├── defaults.ts     # Paramètres par défaut
│   ├── physics.ts      # Moteur physique (hydraulique + thermique)
│   ├── solver.ts       # Solveur numérique transitoire
│   └── weather.ts      # Service météo (API + local)
├── components/
│   ├── ParameterForm.tsx   # Formulaire de paramètres
│   ├── KPICards.tsx         # Affichage KPI
│   ├── Charts.tsx           # Visualisations Chart.js
│   ├── ChimneySchematic.tsx # Schéma visuel
│   └── TheoryDocs.tsx       # Documentation théorique
└── App.tsx             # Application principale
```

## Modèle Mathématique

### Bilan Hydraulique
```
ΔP_fan + ΔP_stack = ΔP_friction + ΣK·(ρv²/2)
```

### Équation Thermique Air (1D)
```
ρ·A·cp·∂T/∂t + ṁ·cp·∂T/∂z = hi·P·(Ts - Tf)
```

### Diffusion Solide (Radiale)
```
ρs·cs·∂Ts/∂t = ks·∂²Ts/∂r²
```

### Convection Interne (Dittus-Boelter)
```
Nu = 0.023·Re^0.8·Pr^0.4
hi = Nu·k/D
```

## Validation

Cas de test recommandés :
1. Ventilateur éteint → tirage naturel minimal
2. ΔP élevé → débit maximal, T_out ≈ T_in
3. Régime laminaire → vérifier Nu = 3.66
4. Comparaison avec profil convectif linéaire

## Références

1. Incropera & DeWitt, *Fundamentals of Heat and Mass Transfer*
2. ASHRAE Handbook - Fundamentals
3. Idel'cik, *Handbook of Hydraulic Resistance*
4. Munson et al., *Fundamentals of Fluid Mechanics*

## Licence

Projet éducatif et de recherche.

---

**Version** : 1.0  
**Auteur** : Simulateur de Cheminée Maçonnée
