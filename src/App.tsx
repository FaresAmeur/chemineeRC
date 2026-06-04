// Simulateur de Cheminée Maçonnée — VERSION PRO OPTIMISÉE
// Simulation batch (plus de RAF frame-by-frame), 3 modes météo

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Settings,
  BookOpen,
  CloudSun,
  Thermometer,
  BarChart3,
  Layers,
  Download,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';
import { AllParameters, SimulationState, WeatherData } from './lib/types';
import { DEFAULT_PARAMS } from './lib/defaults';
import { runSimulation, resetSolverCache } from './lib/solver';
import { getWeatherForConfig, stepWeather } from './lib/weather';
import { ParameterForm } from './components/ParameterForm';
import { KPIDisplay } from './components/KPICards';
import { DiagnosticPanel } from './components/Diagnostics';
import { ChimneySchematic } from './components/ChimneySchematic';
import { ThermalRadialSection } from './components/ThermalSection';
import { PressureGradient } from './components/PressureGradient';
import { SimulationTimeline } from './components/TimelineControl';
import { TheoryDocumentation } from './components/TheoryDocs';
import { TestSuite } from './components/TestSuite';
import {
  TemperatureChart,
  PowerChart,
  EnergyChart,
  FlowChart,
  HeatmapChart,
  AxialProfileChart,
} from './components/Charts';
import { DraggablePanel } from './components/DraggablePanel';

type ViewMode = 'simple' | 'expert';
type ActivePanel = 'overview' | 'params' | 'thermal' | 'charts' | 'validation' | 'theory';

export default function App() {
  // État des paramètres
  const [params, setParams] = useState<AllParameters>(DEFAULT_PARAMS);

  // État de la simulation
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [states, setStates] = useState<SimulationState[]>([]);
  const [simulationTime, setSimulationTime] = useState(0); // ms

  // Interface
  const [viewMode, setViewMode] = useState<ViewMode>('expert');
  const [activePanel, setActivePanel] = useState<ActivePanel>('overview');
  const [selectedSegment, setSelectedSegment] = useState(0);

  // Contrôles de lecture (Playback)
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Boucle de lecture
  useEffect(() => {
    if (!isPlaying || states.length === 0) return;

    const baseDurationS = 30; // 30 secondes pour lire toute la simulation en vitesse 1x
    const fps = 20; // 50ms interval
    const stepsPerFrame = Math.max(1, (states.length / baseDurationS / fps) * playbackSpeed);

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = Math.floor(prev + stepsPerFrame);
        if (next >= states.length - 1) {
          setIsPlaying(false);
          return states.length - 1;
        }
        return next;
      });
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, states.length]);

  // Générer les données météo selon le mode configuré
  const weatherData = useMemo<WeatherData[]>(() => {
    return getWeatherForConfig(
      params.weatherConfig,
      params.simulation.duree,
      params.initial.tempExtBase,
      params.initial.vitesseVent,
      params.initial.humiditeRelative,
      params.initial.pressionAtm
    );
  }, [params.weatherConfig, params.simulation.duree, params.initial.tempExtBase, params.initial.vitesseVent, params.initial.humiditeRelative, params.initial.pressionAtm]);

  // Météo courante pour affichage
  const currentWeatherDisplay = useMemo(() => {
    const time = states[currentIndex]?.temps ?? 0;
    return stepWeather(weatherData, time);
  }, [weatherData, states, currentIndex]);

  // heureDebut pour charts (depuis weatherConfig)
  const heureDebut = params.weatherConfig?.heureDebut || '00:00';

  // =========================================================================
  // LANCER SIMULATION (batch async)
  // =========================================================================

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setStates([]);
    setCurrentIndex(0);

    const startMs = performance.now();

    try {
      // Synchroniser les conditions initiales avec la météo à t=0
      const weather0 = stepWeather(weatherData, 0);
      const runtimeParams: AllParameters = {
        ...params,
        initial: {
          ...params.initial,
          tempExtBase: weather0.tempExt,
          vitesseVent: weather0.windSpeed,
          humiditeRelative: weather0.humidity ?? params.initial.humiditeRelative,
          pressionAtm: weather0.pressure ?? params.initial.pressionAtm,
        },
      };

      resetSolverCache();

      const results = await runSimulation(
        runtimeParams,
        weatherData,
        (pct, _state) => {
          setProgress(pct);
        }
      );

      const elapsed = performance.now() - startMs;
      setSimulationTime(Math.round(elapsed));
      setStates(results);
      setCurrentIndex(results.length - 1);
    } catch (err) {
      console.error('Erreur simulation:', err);
    } finally {
      setIsRunning(false);
    }
  }, [params, weatherData]);

  const handleReset = useCallback(() => {
    setStates([]);
    setCurrentIndex(0);
    setProgress(0);
    setSimulationTime(0);
    setIsPlaying(false);
  }, []);

  // Export CSV
  const handleExportCSV = useCallback(() => {
    if (states.length === 0) return;

    const headers = ['temps_s', 'heure', 'T_air_moy_C', 'T_air_sortie_C', 'T_paroi_int_moy_C', 'T_paroi_ext_moy_C', 'T_ext_C', 'T_appartement_C', 'vitesse_m_s', 'debit_m3_s', 'Re', 'puissance_W', 'energie_J'];
    const rows = states.map(s => [
      s.temps.toFixed(2),
      (s.temps / 3600).toFixed(3),
      (s.tempAir.reduce((a,b) => a+b) / s.tempAir.length).toFixed(2),
      s.tempAirSortie.toFixed(2),
      (s.tempBoisseauInterne.reduce((a,b) => a+b) / s.tempBoisseauInterne.length).toFixed(2),
      (s.tempBoisseauExterne.reduce((a,b) => a+b) / s.tempBoisseauExterne.length).toFixed(2),
      s.tempExt.toFixed(2),
      s.tempAppartement.toFixed(2),
      s.vitesse.toFixed(4),
      s.debitVolmique.toFixed(6),
      s.reynolds.toFixed(0),
      s.puissanceThermique.toFixed(2),
      s.energieEchangee.toFixed(0),
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cheminee_simulation_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [states]);

  const currentState = states[currentIndex] || null;

  // Label mode météo
  const weatherModeLabel = params.weatherConfig.mode === 'fixe'
    ? 'Conditions fixes'
    : params.weatherConfig.mode === 'mensuelle'
    ? `Paris 2025 — ${['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][params.weatherConfig.moisIndex]}`
    : 'Personnalisé';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-[1920px] mx-auto px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Titre */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <Thermometer className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  Simulateur Cheminée V3.0
                </h1>
                <p className="text-xs text-slate-400">Modèle RC semi-implicite optimisé</p>
              </div>
            </div>

            {/* Contrôles principaux */}
            <div className="flex items-center gap-3">
              {/* Mode */}
              <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('simple')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    viewMode === 'simple' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Simple
                </button>
                <button
                  onClick={() => setViewMode('expert')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    viewMode === 'expert' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Expert
                </button>
              </div>

              {/* Actions */}
              <button
                onClick={handleRun}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{progress.toFixed(0)}%</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Lancer</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                disabled={isRunning}
                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 rounded-lg text-slate-300 transition-colors"
                title="Réinitialiser"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleExportCSV}
                disabled={states.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg text-slate-300 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">CSV</span>
              </button>
            </div>
          </div>

          {/* Barre de progression */}
          {isRunning && (
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </header>

      {/* Contenu principal — padding bottom augmenté pour la barre fixe */}
      <main className="pt-4 pb-32 px-6">
        <div className="max-w-[1920px] mx-auto">
          {/* Navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: Layers },
              { id: 'params', label: 'Paramètres', icon: Settings },
              { id: 'thermal', label: 'Coupe thermique', icon: Thermometer },
              { id: 'charts', label: 'Graphiques', icon: BarChart3 },
              { id: 'validation', label: 'Validation', icon: ClipboardCheck },
              { id: 'theory', label: 'Théorie', icon: BookOpen },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id as ActivePanel)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activePanel === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Badge performance */}
          {states.length > 0 && simulationTime > 0 && (
            <div className="mb-4 flex items-center gap-3 text-xs text-slate-400">
              <span className="px-2 py-1 bg-emerald-900/30 border border-emerald-800/40 rounded text-emerald-300">
                ✓ {states.length} points — {(params.simulation.duree / 3600).toFixed(1)}h simulées en {simulationTime}ms
              </span>
              <span className="px-2 py-1 bg-slate-800 rounded">
                {weatherModeLabel}
              </span>
            </div>
          )}

          {/* =============================================================== */}
          {/* VUE D'ENSEMBLE */}
          {/* =============================================================== */}
          {activePanel === 'overview' && (
            <div className="space-y-6">
              {/* KPIs */}
              {currentState && (
                <>
                  <KPIDisplay state={currentState} />
                  <DiagnosticPanel state={currentState} params={params} />
                </>
              )}

              {/* Schéma et vue thermique */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChimneySchematic
                  state={currentState}
                  fan={params.fan}
                  hauteurTotale={params.geometry.hauteurTotale}
                  tempExt={currentWeatherDisplay.tempExt}
                />

                {viewMode === 'expert' && (
                  <div className="flex gap-4 h-[500px]">
                    <div className="flex-1">
                      {currentState && (
                        <ThermalRadialSection
                          state={currentState}
                          segmentIndex={selectedSegment}
                          onSegmentChange={setSelectedSegment}
                          conductivite={params.material.conductivite}
                          epaisseur={params.geometry.epaisseurBoisseau}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <PressureGradient
                        state={currentState}
                        hauteurTotale={params.geometry.hauteurTotale}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Graphiques rapides */}
              {states.length > 10 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TemperatureChart
                    states={states}
                    tempExtBase={currentWeatherDisplay.tempExt}
                    weatherData={weatherData}
                    heureDebut={heureDebut}
                  />
                  <PowerChart states={states} heureDebut={heureDebut} />
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* PARAMÈTRES */}
          {/* =============================================================== */}
          {activePanel === 'params' && (
            <ParameterForm
              params={params}
              onChange={setParams}
              onRun={handleRun}
              isLoading={isRunning}
            />
          )}

          {/* =============================================================== */}
          {/* COUPE THERMIQUE */}
          {/* =============================================================== */}
          {activePanel === 'thermal' && currentState && (
            <div className="space-y-6">
              <ThermalRadialSection
                state={currentState}
                segmentIndex={selectedSegment}
                onSegmentChange={setSelectedSegment}
                conductivite={params.material.conductivite}
                epaisseur={params.geometry.epaisseurBoisseau}
              />

              {states.length > 10 && (
                <HeatmapChart states={states} type="temperature" height={params.geometry.hauteurTotale} />
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* GRAPHIQUES */}
          {/* =============================================================== */}
          {activePanel === 'charts' && states.length > 0 && (
            <div className="space-y-6">
              <TemperatureChart states={states} tempExtBase={currentWeatherDisplay.tempExt} weatherData={weatherData} heureDebut={heureDebut} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PowerChart states={states} heureDebut={heureDebut} />
                <EnergyChart states={states} heureDebut={heureDebut} />
              </div>
              <FlowChart states={states} heureDebut={heureDebut} />
              <AxialProfileChart state={currentState} hauteurTotale={params.geometry.hauteurTotale} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HeatmapChart states={states} type="temperature" height={params.geometry.hauteurTotale} heureDebut={heureDebut} />
                <HeatmapChart states={states} type="velocity" height={params.geometry.hauteurTotale} heureDebut={heureDebut} />
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* THÉORIE */}
          {/* =============================================================== */}
          {activePanel === 'theory' && (
            <TheoryDocumentation />
          )}

          {/* =============================================================== */}
          {/* VALIDATION */}
          {/* =============================================================== */}
          {activePanel === 'validation' && (
            <TestSuite params={params} />
          )}
        </div>
      </main>

      {/* Indicateur météo */}
      {weatherData.length > 0 && states.length === 0 && (
        <div className="fixed bottom-4 right-4 bg-slate-900/90 backdrop-blur-lg rounded-lg border border-slate-700 px-4 py-3 shadow-xl z-40">
          <div className="flex items-center gap-3">
            <CloudSun className="w-5 h-5 text-cyan-400" />
            <div className="text-xs">
              <div className="text-slate-400">{weatherModeLabel}</div>
              <div className="text-slate-200 font-medium">{currentWeatherDisplay.tempExt.toFixed(1)}°C — {currentWeatherDisplay.windSpeed.toFixed(1)} m/s</div>
            </div>
          </div>
        </div>
      )}

      {/* Barre de timeline flottante, redimensionnable et déplaçable */}
      {states.length > 0 && (
        <DraggablePanel initialWidth={800} minWidth={400} maxWidth={1800}>
          <SimulationTimeline
            currentTime={currentState?.temps || 0}
            maxTime={params.simulation.duree}
            isPlaying={isPlaying}
            speed={playbackSpeed}
            onTimeChange={(t) => {
              const idx = states.findIndex(s => s.temps >= t);
              if (idx !== -1) setCurrentIndex(idx);
            }}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onSpeedChange={setPlaybackSpeed}
          />
        </DraggablePanel>
      )}
    </div>
  );
}
