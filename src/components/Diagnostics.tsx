// Panneau de diagnostic physique

import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { SimulationState } from '../lib/types';
import { AllParameters } from '../lib/types';
import { validerSimulation, TestResult } from '../lib/validation';

interface Props {
  state: SimulationState | null;
  params: AllParameters;
}

export function DiagnosticPanel({ state, params }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    setTimeout(() => {
      const results = validerSimulation(params);
      setTestResults(results);
      setRunning(false);
    }, 100);
  };

  if (!state) return null;

  // Calculs de diagnostic
  const cfl = state.cflCourant;

  const tempMinAir = Math.min(...state.tempAir);
  const tempMaxAir = Math.max(...state.tempAir);
  const tempMinParoi = Math.min(...state.tempBoisseauInterne);
  const tempMaxParoi = Math.max(...state.tempBoisseauInterne);

  // Détection d'anomalies physiques
  const anomalies: { message: string, cause: string, action: string }[] = [];

  if (!state.cflStable) {
    anomalies.push({
      message: `CFL instable: ${cfl.toFixed(2)}`,
      cause: 'Vitesse trop élevée pour le pas de temps actuel',
      action: 'Le solveur a dû faire trop de sous-itérations. Réduisez dtMax ou passez en mode Stable.',
    });
  }
  const minPhysique = Math.min(params.initial.tempExtBase, state.tempAppartement);
  if (tempMinAir < minPhysique - 0.5) {
    anomalies.push({
      message: `Air anormalement froid: ${tempMinAir.toFixed(1)}°C`,
      cause: 'Overshoot numérique (CFL local > 1) ou bilan thermique déséquilibré.',
      action: 'Vérifiez les paramètres de simulation et réduisez dt.',
    });
  }
  if (!state.conserveEnergie) {
    anomalies.push({
      message: `Énergie non conservée (${state.erreurEnergiePct.toFixed(1)}%)`,
      cause: 'Déséquilibre entre chaleur injectée et énergie stockée/advectée.',
      action: 'Réduisez le pas de temps ou augmentez la résolution spatiale.',
    });
  }
  if (state.reynolds > 100000) {
    anomalies.push({
      message: `Reynolds très élevé: ${state.reynolds.toFixed(0)}`,
      cause: 'Vitesse de l\'air très importante.',
      action: 'Vérifiez si la pression ventilateur n\'est pas démesurée.',
    });
  }
  if (Math.abs(state.vitesse) < 0.01 && params.fan.actif) {
    anomalies.push({
      message: 'Ventilateur saturé (débit nul)',
      cause: 'Les pertes de charge ou le tirage inverse s\'opposent totalement au ventilateur.',
      action: 'Augmentez la pression max du ventilateur ou vérifiez le sens du flux.',
    });
  }
  if (Math.abs(state.residuPression) > 1.0) {
    anomalies.push({
      message: `Solveur pression non convergé: ${state.residuPression.toFixed(2)} Pa`,
      cause: 'Le solveur (sécante) n\'a pas trouvé l\'équilibre exact.',
      action: 'Généralement transitoire. Si persistant, signalez le bug.',
    });
  }

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          {anomalies.length === 0 ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <h3 className="text-sm font-semibold text-slate-100">
            Diagnostic Physique
          </h3>
          {anomalies.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-900/40 text-amber-300 text-xs rounded-full">
              {anomalies.length} alerte{anomalies.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Métriques principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="CFL"
              value={cfl.toFixed(2)}
              status={cfl < 0.5 ? 'ok' : cfl < 1 ? 'warning' : 'error'}
              target="< 1"
            />
            <MetricCard
              label="Sous-itérations"
              value={state.sousIterations.toString()}
              status={state.sousIterations > 50 ? 'warning' : 'ok'}
            />
            <MetricCard
              label="dt effectif"
              value={`${state.dtEffectif.toFixed(3)}s`}
              status="ok"
            />
          </div>

          {/* Températures */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/40 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Température Air</div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">Min: {tempMinAir.toFixed(1)}°C</span>
                <span className="text-orange-400">Max: {tempMaxAir.toFixed(1)}°C</span>
              </div>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Température Paroi</div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">Min: {tempMinParoi.toFixed(1)}°C</span>
                <span className="text-orange-400">Max: {tempMaxParoi.toFixed(1)}°C</span>
              </div>
            </div>
          </div>

          {/* Pressions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-700/40 rounded-lg p-2 text-center">
              <div className="text-xs text-slate-400">Tirage</div>
              <div className="text-sm font-semibold text-amber-400">
                {state.pressionTirage.toFixed(1)} Pa
              </div>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-2 text-center">
              <div className="text-xs text-slate-400">Ventilateur</div>
              <div className="text-sm font-semibold text-blue-400">
                {state.pressionVentilateur.toFixed(1)} Pa
              </div>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-2 text-center">
              <div className="text-xs text-slate-400">Pertes</div>
              <div className="text-sm font-semibold text-red-400">
                {state.pertesChargeTotal.toFixed(1)} Pa
              </div>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-2 text-center">
              <div className="text-xs text-slate-400">Résidu</div>
              <div className="text-sm font-semibold text-slate-200">
                {state.residuPression.toFixed(3)} Pa
              </div>
            </div>
          </div>

          {/* Anomalies */}
          {anomalies.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">Anomalies détectées</span>
              </div>
              <div className="space-y-3">
                {anomalies.map((a, i) => (
                  <div key={i} className="text-xs">
                    <div className="font-semibold text-amber-200">• {a.message}</div>
                    <div className="text-amber-400/80 ml-3">Cause: {a.cause}</div>
                    <div className="text-amber-500/80 ml-3">Action: {a.action}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tests de validation */}
          <div className="pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 text-slate-400 ${running ? 'animate-spin' : ''}`} />
                <span className="text-sm text-slate-300">Tests de validation physique</span>
              </div>
              <button
                onClick={runTests}
                disabled={running}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
              >
                {running ? 'Exécution...' : 'Exécuter tests'}
              </button>
            </div>

            {testResults && (
              <div className="space-y-2">
                {testResults.map((result, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg text-xs ${
                      result.passed
                        ? 'bg-emerald-900/20 border border-emerald-700/30'
                        : 'bg-red-900/20 border border-red-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {result.passed ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span className={`font-medium ${result.passed ? 'text-emerald-300' : 'text-red-300'}`}>
                        {result.nom}
                      </span>
                    </div>
                    {result.errors.map((e, j) => (
                      <div key={j} className="text-red-300 ml-5">Erreur: {e}</div>
                    ))}
                    {result.warnings.map((w, j) => (
                      <div key={j} className="text-amber-300 ml-5">Attention: {w}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warnings actuels */}
          {state.warnings.length > 0 && (
            <div className="bg-slate-700/40 rounded-lg p-2">
              <div className="text-xs text-slate-400 mb-1">Avertissements actuels</div>
              {state.warnings.map((w, i) => (
                <div key={i} className="text-xs text-amber-300">• {w}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  status,
  target,
}: {
  label: string;
  value: string;
  status: 'ok' | 'warning' | 'error';
  target?: string;
}) {
  const colorClass = {
    ok: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-red-400',
  }[status];

  const bgClass = {
    ok: 'bg-emerald-900/20',
    warning: 'bg-amber-900/20',
    error: 'bg-red-900/20',
  }[status];

  return (
    <div className={`${bgClass} rounded-lg p-2`}>
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-sm font-semibold ${colorClass}`}>{value}</div>
      {target && <div className="text-xs text-slate-500">cible: {target}</div>}
    </div>
  );
}
