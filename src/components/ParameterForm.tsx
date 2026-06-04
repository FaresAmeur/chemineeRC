// Formulaire de paramètres — VERSION PRO
// 3 onglets météo exclusifs : Conditions Fixes / Météo Mensuelle / Météo Personnalisée

import { useState } from 'react';
import { HelpCircle, RotateCcw, ChevronDown, ChevronUp, Calendar, CloudSun, Pencil, Thermometer } from 'lucide-react';
import {
  AllParameters,
  MATERIAUX_PREDEFINIS,
} from '../lib/types';
import type { SimulationMode, WeatherMode, CustomWeatherPoint } from '../lib/types';
import { DEFAULT_PARAMS, METEO_SCENARIOS, PARIS_2025_MONTHLY, DEFAULT_CUSTOM_WEATHER } from '../lib/defaults';

interface Props {
  params: AllParameters;
  onChange: (params: AllParameters) => void;
  onRun?: () => void;
  isLoading?: boolean;
}

export function ParameterForm({ params, onChange }: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    material: true,
    fan: true,
    appartement: true,
    meteo: true,
    simulation: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Charger un preset de météo (mode fixe uniquement)
  const loadMeteoPreset = (presetKey: string) => {
    const preset = METEO_SCENARIOS[presetKey as keyof typeof METEO_SCENARIOS];
    if (!preset || presetKey === 'custom') return;

    onChange({
      ...params,
      initial: {
        ...params.initial,
        tempExtBase: preset.tempBase,
        vitesseVent: preset.vent,
        humiditeRelative: preset.humidite,
      },
      weatherConfig: {
        ...params.weatherConfig,
        mode: 'fixe',
      },
    });
  };

  // Sélectionner un matériau prédéfini
  const selectMaterial = (materialKey: keyof typeof MATERIAUX_PREDEFINIS) => {
    const material = MATERIAUX_PREDEFINIS[materialKey];
    onChange({
      ...params,
      material,
    });
  };

  // Changer le mode météo
  const setWeatherMode = (mode: WeatherMode) => {
    onChange({
      ...params,
      weatherConfig: {
        ...params.weatherConfig,
        mode,
      },
    });
  };

  // Sélectionner un mois (mode mensuel)
  const selectMonth = (monthIndex: number) => {
    const monthData = PARIS_2025_MONTHLY[monthIndex];
    onChange({
      ...params,
      weatherConfig: {
        ...params.weatherConfig,
        mode: 'mensuelle',
        moisIndex: monthIndex,
      },
      // Mettre à jour les conditions initiales pour cohérence
      initial: {
        ...params.initial,
        tempExtBase: monthData.tempMoyenne,
        vitesseVent: monthData.ventMoyen,
        humiditeRelative: monthData.humidite,
      },
    });
  };

  // Mettre à jour un point météo personnalisé
  const updateCustomPoint = (index: number, field: 'temperature' | 'windSpeed', value: number) => {
    const newPoints = [...(params.weatherConfig.customPoints || DEFAULT_CUSTOM_WEATHER)];
    newPoints[index] = { ...newPoints[index], [field]: value };
    onChange({
      ...params,
      weatherConfig: {
        ...params.weatherConfig,
        customPoints: newPoints,
      },
    });
  };

  const weatherMode = params.weatherConfig?.mode || 'fixe';

  return (
    <div className="space-y-4">
      {/* Boutons d'action */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-700">
        <button
          onClick={() => onChange(DEFAULT_PARAMS)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Réinitialiser défaut
        </button>
      </div>

      {/* GÉOMÉTRIE */}
      <CollapsibleSection
        title="Géométrie du Conduit"
        icon="📐"
        expanded={expandedSections.geometry}
        onToggle={() => toggleSection('geometry')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ParamInput
            label="Hauteur totale"
            value={params.geometry.hauteurTotale}
            unit="m"
            min={2}
            max={50}
            tooltip="Hauteur totale du conduit de la base au sommet"
            onChange={v => onChange({
              ...params,
              geometry: { ...params.geometry, hauteurTotale: v },
            })}
          />
          <ParamInput
            label="Hauteur sous toit"
            value={params.geometry.hauteurToit ?? 19}
            unit="m"
            min={2}
            max={50}
            tooltip="Hauteur jusqu'au niveau du toit (19m par défaut)"
            onChange={v => onChange({
              ...params,
              geometry: { ...params.geometry, hauteurToit: v },
            })}
          />
          <ParamInput
            label="Diamètre intérieur"
            value={params.geometry.diametreInterieur}
            unit="m"
            min={0.05}
            max={0.5}
            step={0.01}
            tooltip="Diamètre interne du conduit de ventilation"
            onChange={v => onChange({
              ...params,
              geometry: { ...params.geometry, diametreInterieur: v },
            })}
          />
          <ParamInput
            label="Épaisseur boisseau"
            value={params.geometry.epaisseurBoisseau}
            unit="m"
            min={0.02}
            max={0.5}
            step={0.01}
            tooltip="Épaisseur de la paroi maçonnée"
            onChange={v => onChange({
              ...params,
              geometry: { ...params.geometry, epaisseurBoisseau: v },
            })}
          />
          <ParamInput
            label="Angle coude"
            value={params.geometry.angleCoude}
            unit="°"
            min={0}
            max={90}
            step={5}
            tooltip="Angle du coude à la base (45° standard)"
            onChange={v => onChange({
              ...params,
              geometry: { ...params.geometry, angleCoude: v },
            })}
          />
          <ParamInput
            label="Rugosité relative"
            value={params.geometry.rugositeRelative}
            unit="ε/D"
            min={0.00001}
            max={0.1}
            step={0.00001}
            tooltip="Rugosité de surface (0.01=maçonnerie typique)"
            onChange={v => onChange({
              ...params,
              geometry: { ...params.geometry, rugositeRelative: v },
            })}
          />
          <ParamInput
            label="Segments verticaux"
            value={params.geometry.segmentsVerticaux}
            unit=""
            min={5}
            max={50}
            step={1}
            tooltip="Nombre de segments de discrétisation (20 recommandé)"
            integer
            onChange={v => onChange({
              ...params,
              geometry: { ...params.geometry, segmentsVerticaux: Math.round(v) },
            })}
          />
          <ParamInput
            label="Nœuds radiaux"
            value={params.geometry.noeudsRadiaux}
            unit=""
            min={2}
            max={10}
            step={1}
            tooltip="Nœuds dans l'épaisseur du boisseau (4 recommandé)"
            integer
            onChange={v => onChange({
              ...params,
              geometry: { ...params.geometry, noeudsRadiaux: Math.round(v) },
            })}
          />
        </div>
      </CollapsibleSection>

      {/* MATÉRIAUX */}
      <CollapsibleSection
        title="Matériau du Boisseau"
        icon="🧱"
        expanded={expandedSections.material}
        onToggle={() => toggleSection('material')}
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Matériaux prédéfinis
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(MATERIAUX_PREDEFINIS).map(([key, mat]) => (
              <button
                key={key}
                onClick={() => selectMaterial(key as keyof typeof MATERIAUX_PREDEFINIS)}
                className={`p-2 rounded-lg text-sm text-left transition-all ${
                  params.material.nom === mat.nom
                    ? 'bg-blue-600 text-white border-blue-400'
                    : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
                } border`}
              >
                {mat.nom}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ParamInput label="Densité" value={params.material.densite} unit="kg/m³" min={500} max={8000} tooltip="Masse volumique du matériau" onChange={v => onChange({ ...params, material: { ...params.material, densite: v } })} />
          <ParamInput label="Capacité thermique" value={params.material.cp} unit="J/kg·K" min={300} max={1500} tooltip="Chaleur spécifique du matériau" onChange={v => onChange({ ...params, material: { ...params.material, cp: v } })} />
          <ParamInput label="Conductivité" value={params.material.conductivite} unit="W/m·K" min={0.1} max={50} step={0.01} tooltip="Conductivité thermique" onChange={v => onChange({ ...params, material: { ...params.material, conductivite: v } })} />
          <ParamInput label="Émissivité" value={params.material.emissivite} unit="" min={0} max={1} step={0.05} tooltip="Coefficient d'émissivité (rayonnement)" onChange={v => onChange({ ...params, material: { ...params.material, emissivite: v } })} />
        </div>
      </CollapsibleSection>

      {/* VENTILATEUR */}
      <CollapsibleSection
        title="Ventilateur"
        icon="🌀"
        expanded={expandedSections.fan}
        onToggle={() => toggleSection('fan')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Position</label>
            <select
              value={params.fan.position}
              onChange={e => onChange({ ...params, fan: { ...params.fan, position: e.target.value as 'haut' | 'bas' } })}
              className="w-full bg-slate-700 border-slate-600 rounded-lg p-2.5 text-slate-100"
            >
              <option value="bas">Bas côté appartement</option>
              <option value="haut">Haut côté toiture</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Mode</label>
            <select
              value={params.fan.mode}
              onChange={e => onChange({ ...params, fan: { ...params.fan, mode: e.target.value as 'aspiration' | 'poussee' } })}
              className="w-full bg-slate-700 border-slate-600 rounded-lg p-2.5 text-slate-100"
            >
              <option value="aspiration">Aspiration vers le ventilateur</option>
              <option value="poussee">Poussée depuis le ventilateur</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Contrôle</label>
            <div className="flex gap-1 mb-2">
              {(['auto', 'manuel'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => onChange({ ...params, fan: { ...params.fan, modeControle: m } })}
                  className={`flex-1 px-2 py-2 text-xs rounded-lg transition-all ${
                    params.fan.modeControle === m ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            {params.fan.modeControle === 'manuel' ? (
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <input type="checkbox" checked={params.fan.actifManuel} onChange={e => onChange({ ...params, fan: { ...params.fan, actifManuel: e.target.checked } })} className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600" />
                Ventilateur actif (ON)
              </label>
            ) : (
              <div className="text-xs text-blue-400 bg-blue-900/20 p-2 rounded border border-blue-900/50">
                S'active si T_ext &lt; T_appartement
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ParamInput label="Pression max" value={params.fan.pressionMax} unit="Pa" min={0} max={1000} tooltip="Pression maximale à débit nul" onChange={v => onChange({ ...params, fan: { ...params.fan, pressionMax: v } })} />
          <ParamInput label="Débit max" value={params.fan.debitMax} unit="m³/s" min={0.01} max={1} step={0.01} tooltip="Débit maximal à pression nulle" onChange={v => onChange({ ...params, fan: { ...params.fan, debitMax: v } })} />
          <ParamInput label="Puissance" value={params.fan.puissance} unit="W" min={10} max={1000} tooltip="Puissance électrique du ventilateur" onChange={v => onChange({ ...params, fan: { ...params.fan, puissance: v } })} />
          <ParamInput label="Rendement" value={params.fan.rendement} unit="" min={0.1} max={1} step={0.05} tooltip="Rendement du moteur (0.5-0.7 typique)" onChange={v => onChange({ ...params, fan: { ...params.fan, rendement: v } })} />
        </div>
      </CollapsibleSection>

      {/* APPARTEMENT */}
      <CollapsibleSection
        title="Appartement"
        icon="🏠"
        expanded={expandedSections.appartement}
        onToggle={() => toggleSection('appartement')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ParamInput label="Volume" value={params.appartement.volume} unit="m³" min={10} max={500} tooltip="Volume de l'appartement" onChange={v => onChange({ ...params, appartement: { ...params.appartement, volume: v } })} />
          <ParamInput label="T° appartement initiale" value={params.initial.tempAppartementInit} unit="°C" min={5} max={35} tooltip="Température initiale de l'appartement" onChange={v => onChange({ ...params, initial: { ...params.initial, tempAppartementInit: v } })} />
          <ParamInput label="T° air initiale" value={params.initial.tempAirInit} unit="°C" min={-10} max={40} tooltip="Température initiale de l'air dans le conduit" onChange={v => onChange({ ...params, initial: { ...params.initial, tempAirInit: v } })} />
          <ParamInput label="Renouvellement naturel" value={params.appartement.renouvellementAirNaturel} unit="vol/h" min={0} max={2} step={0.1} tooltip="Infiltrations naturelles" onChange={v => onChange({ ...params, appartement: { ...params.appartement, renouvellementAirNaturel: v } })} />
          <ParamInput label="Pertes enveloppe" value={params.appartement.pertesEnveloppe} unit="W/K" min={10} max={500} tooltip="Déperditions thermiques vers l'extérieur" onChange={v => onChange({ ...params, appartement: { ...params.appartement, pertesEnveloppe: v } })} />
          <ParamInput label="Inertie thermique" value={params.appartement.inertieThermique} unit="Wh/K" min={0} max={5000} tooltip="Capacité thermique meubles + structure" onChange={v => onChange({ ...params, appartement: { ...params.appartement, inertieThermique: v } })} />
        </div>
      </CollapsibleSection>

      {/* ==================================================================== */}
      {/* MÉTÉO — 3 ONGLETS EXCLUSIFS */}
      {/* ==================================================================== */}
      <CollapsibleSection
        title="Source Météo"
        icon="🌤️"
        expanded={expandedSections.meteo}
        onToggle={() => toggleSection('meteo')}
      >
        {/* Sélecteur de mode */}
        <div className="flex gap-1 mb-4 p-1 bg-slate-900/50 rounded-xl">
          {([
            { mode: 'fixe' as WeatherMode, label: 'Conditions Fixes', icon: Thermometer, color: 'emerald' },
            { mode: 'mensuelle' as WeatherMode, label: 'Météo Mensuelle', icon: Calendar, color: 'cyan' },
            { mode: 'personnalisee' as WeatherMode, label: 'Météo Personnalisée', icon: Pencil, color: 'amber' },
          ]).map(({ mode, label, icon: Icon, color }) => (
            <button
              key={mode}
              onClick={() => setWeatherMode(mode)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                weatherMode === mode
                  ? `bg-${color}-600 text-white shadow-lg shadow-${color}-500/20`
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              style={weatherMode === mode ? {
                backgroundColor: color === 'emerald' ? '#059669' : color === 'cyan' ? '#0891b2' : '#d97706',
                boxShadow: `0 4px 14px -3px ${color === 'emerald' ? '#05966940' : color === 'cyan' ? '#0891b240' : '#d9770640'}`,
              } : {}}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ============================================================ */}
        {/* MODE FIXE — Conditions constantes */}
        {/* ============================================================ */}
        {weatherMode === 'fixe' && (
          <div>
            <div className="mb-3 p-2 bg-emerald-900/20 border border-emerald-800/30 rounded-lg">
              <p className="text-xs text-emerald-300">
                <strong>Mode Conditions Fixes :</strong> T_ext et vent constants pendant toute la simulation. Idéal pour l'analyse de cas d'étude spécifiques.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Scénarios prédéfinis
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {Object.entries(METEO_SCENARIOS).map(([key, scenario]) => (
                  <button
                    key={key}
                    onClick={() => loadMeteoPreset(key)}
                    className="p-2 rounded-lg text-xs text-left bg-slate-700 text-slate-200 border border-slate-600 hover:bg-slate-600 transition-colors"
                    title={scenario.description}
                  >
                    <div className="font-medium">{scenario.nom}</div>
                    <div className="text-[10px] text-slate-400">{scenario.tempBase}°C — {scenario.vent} m/s</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ParamInput label="T° extérieure" value={params.initial.tempExtBase} unit="°C" min={-20} max={45} tooltip="Température extérieure constante" onChange={v => onChange({ ...params, initial: { ...params.initial, tempExtBase: v } })} />
              <ParamInput label="Vitesse vent" value={params.initial.vitesseVent} unit="m/s" min={0} max={20} step={0.5} tooltip="Vitesse du vent constante" onChange={v => onChange({ ...params, initial: { ...params.initial, vitesseVent: v } })} />
              <ParamInput label="Humidité relative" value={params.initial.humiditeRelative * 100} unit="%" min={10} max={100} tooltip="Humidité relative de l'air" onChange={v => onChange({ ...params, initial: { ...params.initial, humiditeRelative: v / 100 } })} />
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODE MENSUEL — Paris 2025 */}
        {/* ============================================================ */}
        {weatherMode === 'mensuelle' && (
          <div>
            <div className="mb-3 p-2 bg-cyan-900/20 border border-cyan-800/30 rounded-lg">
              <p className="text-xs text-cyan-300">
                <strong>Mode Météo Mensuelle :</strong> Données Paris 2025 avec température par paliers horaires (pas d'interpolation continue).
              </p>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Sélection du mois
              </label>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {PARIS_2025_MONTHLY.map((m) => (
                  <button
                    key={m.moisIndex}
                    onClick={() => selectMonth(m.moisIndex)}
                    className={`p-2 rounded-lg text-xs text-center transition-all ${
                      params.weatherConfig.moisIndex === m.moisIndex
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
                    } border`}
                  >
                    <div className="font-medium">{m.mois}</div>
                    <div className="text-[10px] opacity-75">{m.tempMin}°C – {m.tempMax}°C</div>
                    <div className="text-[10px] opacity-60">vent {m.ventMoyen} m/s</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-2">
                  Heure début simulation
                  <span className="relative cursor-help group">
                    <HelpCircle className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-slate-900 text-slate-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity w-48 z-20 pointer-events-none border border-slate-700 shadow-lg">
                      Heure de démarrage dans la journée type
                    </span>
                  </span>
                </label>
                <input
                  type="time"
                  value={params.weatherConfig.heureDebut || '00:00'}
                  onChange={e => onChange({
                    ...params,
                    weatherConfig: { ...params.weatherConfig, heureDebut: e.target.value || '00:00' },
                  })}
                  className="w-full bg-slate-700 border-slate-600 rounded-lg p-2 text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODE PERSONNALISÉ — Tableau 0h-24h */}
        {/* ============================================================ */}
        {weatherMode === 'personnalisee' && (
          <div>
            <div className="mb-3 p-2 bg-amber-900/20 border border-amber-800/30 rounded-lg">
              <p className="text-xs text-amber-300">
                <strong>Mode Météo Personnalisée :</strong> Saisissez température et vent pour chaque heure. Valeurs par paliers horaires (la simulation utilise la valeur de l'heure entière).
              </p>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-2">
                Heure début simulation
              </label>
              <input
                type="time"
                value={params.weatherConfig.heureDebut || '00:00'}
                onChange={e => onChange({
                  ...params,
                  weatherConfig: { ...params.weatherConfig, heureDebut: e.target.value || '00:00' },
                })}
                className="w-48 bg-slate-700 border-slate-600 rounded-lg p-2 text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-300 font-medium">Heure</th>
                    <th className="px-3 py-2 text-left text-slate-300 font-medium">T° (°C)</th>
                    <th className="px-3 py-2 text-left text-slate-300 font-medium">Vent (m/s)</th>
                  </tr>
                </thead>
                <tbody>
                  {(params.weatherConfig.customPoints || DEFAULT_CUSTOM_WEATHER).map((point, idx) => (
                    <tr key={idx} className="border-t border-slate-700/50 hover:bg-slate-800/50">
                      <td className="px-3 py-1.5 text-slate-400 font-mono text-xs">
                        {String(point.heure).padStart(2, '0')}:00
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          value={point.temperature}
                          min={-30}
                          max={50}
                          step={0.5}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) updateCustomPoint(idx, 'temperature', val);
                          }}
                          className="w-20 bg-slate-700 border-slate-600 rounded px-2 py-1 text-slate-100 text-xs focus:ring-1 focus:ring-amber-500"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          value={point.windSpeed}
                          min={0}
                          max={30}
                          step={0.1}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) updateCustomPoint(idx, 'windSpeed', val);
                          }}
                          className="w-20 bg-slate-700 border-slate-600 rounded px-2 py-1 text-slate-100 text-xs focus:ring-1 focus:ring-amber-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex gap-2">
              <button
                onClick={() => onChange({
                  ...params,
                  weatherConfig: { ...params.weatherConfig, customPoints: DEFAULT_CUSTOM_WEATHER },
                })}
                className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
              >
                Réinitialiser les valeurs
              </button>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* SIMULATION */}
      <CollapsibleSection
        title="Paramètres Numériques"
        icon="⚙️"
        expanded={expandedSections.simulation}
        onToggle={() => toggleSection('simulation')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ParamInput
            label="Durée simulation"
            value={params.simulation.duree}
            unit="s"
            min={60}
            max={172800}
            step={300}
            tooltip="Durée totale de simulation (max 48h = 172800s)"
            onChange={v => onChange({
              ...params,
              simulation: { ...params.simulation, duree: v },
            })}
          />
          <ParamInput
            label="Pas de temps dt"
            value={params.simulation.dt}
            unit="s"
            min={0.1}
            max={30}
            step={0.5}
            tooltip="Pas de temps d'intégration (2s par défaut, semi-implicite)"
            onChange={v => onChange({
              ...params,
              simulation: { ...params.simulation, dt: v },
            })}
          />
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <input
                type="checkbox"
                checked={params.simulation.adaptatif}
                onChange={e => onChange({ ...params, simulation: { ...params.simulation, adaptatif: e.target.checked } })}
                className="w-4 h-4 rounded"
              />
              Pas de temps adaptatif
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Ajuste automatiquement dt pour la stabilité CFL
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Mode simulation
            </label>
            <div className="flex gap-1">
              {(['stable', 'rapide', 'precis'] as SimulationMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onChange({ ...params, simulation: { ...params.simulation, mode: m } })}
                  className={`flex-1 px-2 py-2 text-xs rounded-lg transition-all ${
                    params.simulation.mode === m
                      ? m === 'stable' ? 'bg-emerald-600 text-white'
                        : m === 'rapide' ? 'bg-amber-600 text-white'
                        : 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {params.simulation.mode === 'stable' ? 'CFL ≤ 0.8 — Bonne stabilité' :
               params.simulation.mode === 'rapide' ? 'CFL ≤ 0.95 — Calcul rapide' :
               'CFL ≤ 0.5 — Précision optimale'}
            </p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// COMPOSANTS AUXILIAIRES
// ============================================================================

function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="p-4 pt-0">
          {children}
        </div>
      )}
    </div>
  );
}

interface ParamInputProps {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  tooltip: string;
  integer?: boolean;
  onChange: (value: number) => void;
}

function ParamInput({
  label,
  value,
  unit,
  min,
  max,
  step = 0.01,
  tooltip,
  integer = false,
  onChange,
}: ParamInputProps) {
  return (
    <div className="group">
      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-2">
        {label}
        <span className="relative cursor-help">
          <HelpCircle className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-slate-900 text-slate-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity w-48 z-20 pointer-events-none border border-slate-700 shadow-lg">
            {tooltip}
          </span>
        </span>
        <span className="text-slate-500 text-xs ml-auto">{unit}</span>
      </label>
      <input
        type="number"
        value={integer ? Math.round(value) : value}
        min={min}
        max={max}
        step={step}
        onChange={e => {
          const val = parseFloat(e.target.value);
          if (!isNaN(val)) onChange(val);
        }}
        className="w-full bg-slate-700 border-slate-600 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-600/70"
      />
    </div>
  );
}
