// Vue en coupe radiale thermique - Visualisation scientifique détaillée

import { SimulationState } from '../lib/types';
import { useMemo, useState } from 'react';

interface Props {
  state: SimulationState;
  segmentIndex: number; // Position dans le conduit (0 à n-1)
  onSegmentChange?: (index: number) => void;
  conductivite?: number;
  epaisseur?: number;
}

export function ThermalRadialSection({
  state,
  segmentIndex,
  onSegmentChange,
  conductivite = 0.72,
  epaisseur = 0.22,
}: Props) {
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);
  const [showMode, setShowMode] = useState<'temperature' | 'heatflux'>('temperature');

  const nSegments = state.tempAir.length;
  const nRadial = state.tempBoisseau[0]?.length || 5;

  // Données pour le segment sélectionné
  const currentTempAir = state.tempAir[segmentIndex] || 20;
  const currentParoiInt = state.tempBoisseauInterne[segmentIndex] || 20;
  const currentParoiExt = state.tempBoisseauExterne[segmentIndex] || 20;
  const boisseauProfile = state.tempBoisseau[segmentIndex] || Array(nRadial).fill(20);

  // Calcul des flux thermiques
  const heatFluxData = useMemo(() => {
    const thickness = epaisseur / nRadial;

    const flux = boisseauProfile.map((temp, i) => {
      if (i === 0) return state.hi * (currentTempAir - temp);
      if (i === nRadial - 1) return state.he * (state.tempExt - temp);
      return -conductivite * (boisseauProfile[i + 1] - boisseauProfile[i - 1]) / (2 * thickness);
    });

    return flux;
  }, [boisseauProfile, conductivite, currentTempAir, epaisseur, nRadial, state.he, state.hi, state.tempExt]);

  const allTemps = [currentTempAir, ...boisseauProfile];
  const tempMin = Math.min(...allTemps);
  const tempMax = Math.max(...allTemps);

  const getColor = (temp: number) => {
    const ratio = tempMax !== tempMin ? (temp - tempMin) / (tempMax - tempMin) : 0.5;
    const hue = 240 - ratio * 240;
    return `hsl(${hue}, 75%, 50%)`;
  };

  const getHeatFluxColor = (flux: number) => {
    const maxFlux = Math.max(...heatFluxData.map(Math.abs));
    const ratio = maxFlux > 0 ? Math.abs(flux) / maxFlux : 0;
    return flux > 0 ? `rgba(239, 68, 68, ${0.3 + ratio * 0.7})` : `rgba(59, 130, 246, ${0.3 + ratio * 0.7})`;
  };

  const svgSize = 400;
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;

  // Rayons
  const rAir = 50;
  const rBoisseauInt = 70;
  const rBoisseauExt = 150;

  // Hauteur dans le conduit
  const heightPercent = ((segmentIndex + 0.5) / nSegments * 100).toFixed(1);

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-700 overflow-hidden">
      {/* En-tête avec contrôles */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/40">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-100">
            Coupe Radiale - z = {heightPercent}% de la hauteur
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMode('temperature')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                showMode === 'temperature'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Température
            </button>
            <button
              onClick={() => setShowMode('heatflux')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                showMode === 'heatflux'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Flux thermique
            </button>
          </div>
        </div>

        {/* Slider position */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 w-16">Position:</span>
          <input
            type="range"
            min="0"
            max={nSegments - 1}
            value={segmentIndex}
            onChange={(e) => onSegmentChange?.(parseInt(e.target.value))}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-slate-300 w-20 text-right">
            Segment {segmentIndex + 1}/{nSegments}
          </span>
        </div>
      </div>

      {/* Vue SVG */}
      <div className="p-4">
        <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="w-full max-w-md mx-auto">
          {/* Gradient définitions */}
          <defs>
            <radialGradient id="airGradient">
              <stop offset="0%" stopColor={getColor(currentTempAir)} />
              <stop offset="100%" stopColor={getColor(currentTempAir)} />
            </radialGradient>
            <radialGradient id="boisseauGradient">
              <stop offset="0%" stopColor={getColor(currentParoiInt)} />
              <stop offset="100%" stopColor={getColor(currentParoiExt)} />
            </radialGradient>
          </defs>

          {/* Air intérieur */}
          <circle
            cx={centerX}
            cy={centerY}
            r={rAir}
            fill={showMode === 'temperature' ? getColor(currentTempAir) : getHeatFluxColor(heatFluxData[0])}
            stroke="#60A5FA"
            strokeWidth="2"
            opacity="0.9"
            onMouseEnter={() => setHoveredLayer('air')}
            onMouseLeave={() => setHoveredLayer(null)}
            className="cursor-pointer"
          />

          {/* Interface interne (couche limite) */}
          <circle
            cx={centerX}
            cy={centerY}
            r={rBoisseauInt}
            fill="none"
            stroke={showMode === 'temperature' ? getColor(currentParoiInt) : '#F97316'}
            strokeWidth="6"
            opacity="0.85"
            onMouseEnter={() => setHoveredLayer('interface-int')}
            onMouseLeave={() => setHoveredLayer(null)}
            className="cursor-pointer"
          />

          {/* Boisseau (couches radiales) */}
          {boisseauProfile.map((_, reverseIndex) => {
            const i = nRadial - 1 - reverseIndex;
            const layerTemp = boisseauProfile[i];
            const r = rBoisseauInt + ((i + 1) * (rBoisseauExt - rBoisseauInt)) / nRadial;

            return (
              <circle
                key={i}
                cx={centerX}
                cy={centerY}
                r={r}
                fill={showMode === 'temperature' ? getColor(layerTemp) : getHeatFluxColor(heatFluxData[i])}
                stroke="#4B5563"
                strokeWidth="1"
                opacity="0.8"
                onMouseEnter={() => setHoveredLayer(`boisseau-${i}`)}
                onMouseLeave={() => setHoveredLayer(null)}
                className="cursor-pointer"
              />
            );
          })}

          {/* Surface externe */}
          <circle
            cx={centerX}
            cy={centerY}
            r={rBoisseauExt}
            fill="none"
            stroke="#EF4444"
            strokeWidth="3"
            strokeDasharray="5,5"
            opacity="0.6"
          />

          {/* Annotations */}
          <text x={centerX} y={centerY} textAnchor="middle" fill="#E2E8F0" fontSize="12" fontWeight="600">
            Air
          </text>
          <text x={centerX} y={centerY - 18} textAnchor="middle" fill="#CBD5E1" fontSize="10">
            {currentTempAir.toFixed(1)}°C
          </text>

          <text x={centerX + 100} y={centerY} fill="#CBD5E1" fontSize="9">
            Boisseau
          </text>

          <text x={centerX + 170} y={centerY - 30} fill="#94A3B8" fontSize="8">
            Extérieur
          </text>

          {/* Légende rayons */}
          <line x1={centerX} y1={centerY} x2={centerX + rAir} y2={centerY} stroke="#60A5FA" strokeWidth="1" strokeDasharray="2,2" />
          <text x={centerX + rAir / 2} y={centerY - 5} fill="#60A5FA" fontSize="8">r_air</text>

          <line x1={centerX} y1={centerY + 30} x2={centerX + rBoisseauExt} y2={centerY + 30} stroke="#94A3B8" strokeWidth="1" strokeDasharray="2,2" />
          <text x={centerX + (rAir + rBoisseauExt) / 2} y={centerY + 25} fill="#94A3B8" fontSize="8">épaisseur brique</text>
        </svg>
      </div>

      {/* Panneau d'information */}
      <div className="px-4 pb-4">
        {hoveredLayer && (
          <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-600 mb-3">
            <div className="text-xs text-slate-300">
              {hoveredLayer === 'air' && (
                <>
                  <span className="font-semibold text-blue-400">Air Intérieur</span>
                  <div className="mt-1 text-slate-400">
                    T = {currentTempAir.toFixed(2)}°C | Conv. int: {state.hi.toFixed(1)} W/m²K
                  </div>
                </>
              )}
              {hoveredLayer === 'interface-int' && (
                <>
                  <span className="font-semibold text-amber-400">Interface Interne</span>
                  <div className="mt-1 text-slate-400">
                    T = {currentParoiInt.toFixed(2)}°C | Flux = {(state.hi * (currentTempAir - currentParoiInt)).toFixed(1)} W/m²
                  </div>
                </>
              )}
              {hoveredLayer?.startsWith('boisseau-') && (
                <>
                  <span className="font-semibold text-orange-400">Couche {hoveredLayer.split('-')[1]}</span>
                  <div className="mt-1 text-slate-400">
                    T = {boisseauProfile[parseInt(hoveredLayer.split('-')[1])].toFixed(2)}°C
                    {showMode === 'heatflux' && ` | q = ${heatFluxData[parseInt(hoveredLayer.split('-')[1])].toFixed(1)} W/m²`}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Métriques */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-800/40 rounded-lg p-2">
            <div className="text-xs text-slate-400">T_air</div>
            <div className="text-sm font-semibold text-blue-400">{currentTempAir.toFixed(1)}°C</div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-2">
            <div className="text-xs text-slate-400">T_paroi_int</div>
            <div className="text-sm font-semibold text-orange-400">{currentParoiInt.toFixed(1)}°C</div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-2">
            <div className="text-xs text-slate-400">T_paroi_ext</div>
            <div className="text-sm font-semibold text-red-400">{currentParoiExt.toFixed(1)}°C</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3 text-center">
          <div className="bg-slate-800/40 rounded-lg p-2">
            <div className="text-xs text-slate-400">h_int (W/m²K)</div>
            <div className="text-sm font-semibold text-cyan-400">{state.hi.toFixed(1)}</div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-2">
            <div className="text-xs text-slate-400">h_ext (W/m²K)</div>
            <div className="text-sm font-semibold text-cyan-400">{state.he.toFixed(1)}</div>
          </div>
        </div>

        {/* Échelle */}
        <div className="mt-3">
          <div className="text-xs text-slate-400 mb-1">
            {showMode === 'temperature' ? 'Échelle thermique' : 'Flux thermique (W/m²)'}
          </div>
          <div className="h-4 rounded-lg overflow-hidden flex">
            {showMode === 'temperature' ? (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(to right, ${getColor(tempMin)}, ${getColor(tempMax)})`
                }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: 'linear-gradient(to right, rgba(59, 130, 246, 0.8), rgba(239, 68, 68, 0.8))'
                }}
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{showMode === 'temperature' ? tempMin.toFixed(1) : Math.min(...heatFluxData).toFixed(0)}</span>
            <span>{showMode === 'temperature' ? tempMax.toFixed(1) : Math.max(...heatFluxData).toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
