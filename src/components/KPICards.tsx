// Affichage des KPIs avancé

import {
  TrendingUp,
  Wind,
  Thermometer,
  Zap,
  Gauge,
  Droplets,
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { SimulationState } from '../lib/types';

interface Props {
  state: SimulationState | null;
}

export function KPIDisplay({ state }: Props) {
  if (!state) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-slate-800/40 rounded-xl p-3 border border-slate-700 animate-pulse">
            <div className="h-3 bg-slate-700 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-slate-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  // Déterminer le statut global
  const hasWarnings = state.warnings.length > 0;
  const isStable = state.cflStable && state.conserveEnergie;

  // KPIs principaux
  const mainKPIs = [
    {
      label: 'Vitesse',
      value: state.vitesse,
      unit: 'm/s',
      icon: Wind,
      color: 'from-blue-500 to-cyan-500',
      precision: 2,
    },
    {
      label: 'Débit',
      value: state.debitVolmique * 3600,
      unit: 'm³/h',
      icon: Droplets,
      color: 'from-cyan-500 to-teal-500',
      precision: 0,
    },
    {
      label: 'Reynolds',
      value: state.reynolds,
      unit: '',
      icon: Gauge,
      color: state.reynolds < 2300 ? 'from-amber-500 to-yellow-500' : 'from-emerald-500 to-green-500',
      precision: 0,
    },
    {
      label: 'Nusselt',
      value: state.nusselt,
      unit: '',
      icon: TrendingUp,
      color: 'from-orange-500 to-amber-500',
      precision: 1,
    },
    {
      label: 'hi',
      value: state.hi,
      unit: 'W/m²K',
      icon: Thermometer,
      color: 'from-red-500 to-rose-500',
      precision: 1,
    },
    {
      label: 'he',
      value: state.he,
      unit: 'W/m²K',
      icon: Wind,
      color: 'from-sky-500 to-blue-500',
      precision: 1,
    },
    {
      label: 'T° Sortie',
      value: state.tempAirSortie,
      unit: '°C',
      icon: Thermometer,
      color: 'from-orange-500 to-red-500',
      precision: 1,
    },
    {
      label: 'T° Appart.',
      value: state.tempAppartement,
      unit: '°C',
      icon: Thermometer,
      color: 'from-violet-500 to-purple-500',
      precision: 1,
    },
    {
      label: 'Tirage',
      value: state.pressionTirage,
      unit: 'Pa',
      icon: ArrowUpCircle,
      color: state.pressionTirage > 0 ? 'from-green-500 to-emerald-500' : 'from-amber-500 to-orange-500',
      precision: 1,
    },
    {
      label: 'Ventilo',
      value: state.pressionVentilateur,
      unit: 'Pa',
      icon: Zap,
      color: 'from-blue-500 to-indigo-500',
      precision: 1,
    },
    {
      label: 'Puissance',
      value: state.puissanceThermique,
      unit: 'W',
      icon: Zap,
      color: 'from-emerald-500 to-green-500',
      precision: 0,
    },
    {
      label: 'Énergie',
      value: state.energieEchangee / 3600 / 1000,
      unit: 'kWh',
      icon: Zap,
      color: 'from-fuchsia-500 to-pink-500',
      precision: 2,
    },
  ];

  return (
    <div>
      {/* Alerte de statut */}
      <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
        isStable && !hasWarnings
          ? 'bg-emerald-900/30 border border-emerald-700'
          : 'bg-amber-900/30 border border-amber-700'
      }`}>
        {isStable && !hasWarnings ? (
          <>
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-300 text-sm">Simulation stable • Régime {state.regimeEcoulement}</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-amber-300 text-sm">
              {hasWarnings ? state.warnings[0] : 'Attention: vérifier les paramètres'}
            </span>
          </>
        )}
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {mainKPIs.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-slate-800/60 rounded-xl p-3 border border-slate-700 backdrop-blur-sm hover:border-slate-600 transition-all group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded-lg bg-gradient-to-br ${kpi.color}`}>
                <kpi.icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-400">{kpi.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-100">
                {kpi.value.toFixed(kpi.precision)}
              </span>
              <span className="text-xs text-slate-500">{kpi.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ligne de KPIs secondaires */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700">
          <div className="text-xs text-slate-500 mb-0.5">T° Boisseau</div>
          <div className="text-sm font-semibold text-slate-200">{state.tempMoyenneBoisseau.toFixed(1)}°C</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700">
          <div className="text-xs text-slate-500 mb-0.5">Pertes réparties</div>
          <div className="text-sm font-semibold text-slate-200">{state.pertesChargeReparties.toFixed(1)} Pa</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700">
          <div className="text-xs text-slate-500 mb-0.5">Pertes singulières</div>
          <div className="text-sm font-semibold text-slate-200">{state.pertesChargeSingulieres.toFixed(1)} Pa</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700">
          <div className="text-xs text-slate-500 mb-0.5">CFL</div>
          <div className={`text-sm font-semibold ${state.cflCourant < 0.5 ? 'text-emerald-400' : state.cflCourant < 1 ? 'text-amber-400' : 'text-red-400'}`}>
            {state.cflCourant.toFixed(3)}
          </div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700">
          <div className="text-xs text-slate-500 mb-0.5">dt effectif</div>
          <div className="text-sm font-semibold text-slate-200">{state.dtEffectif.toFixed(3)}s</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700">
          <div className="text-xs text-slate-500 mb-0.5">Sous-itérations</div>
          <div className="text-sm font-semibold text-slate-200">{state.sousIterations}</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700">
          <div className="text-xs text-slate-500 mb-0.5">Temps</div>
          <div className="text-sm font-semibold text-slate-200">
            {Math.floor(state.temps / 3600)}h {Math.floor((state.temps % 3600) / 60)}m
          </div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700">
          <div className="text-xs text-slate-500 mb-0.5">Régime</div>
          <div className={`text-sm font-semibold ${
            state.regimeEcoulement === 'turbulent' ? 'text-emerald-400' :
            state.regimeEcoulement === 'laminaire' ? 'text-amber-400' : 'text-yellow-400'
          }`}>
            {state.regimeEcoulement.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}
