// Schéma professionnel animé de la cheminée avec vue en coupe détaillée

import { SimulationState, FanParams } from '../lib/types';
import { useState, useEffect, useRef } from 'react';

interface Props {
  state: SimulationState | null;
  fan: FanParams;
  hauteurTotale: number;
  tempExt: number;
  className?: string;
}

export function ChimneySchematic({ state, fan, hauteurTotale, tempExt, className = '' }: Props) {
  const [animTime, setAnimTime] = useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      setAnimTime(prev => (prev + 1) % 200);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  if (!state) {
    return (
      <div className={`bg-slate-900/60 rounded-xl border border-slate-700 animate-pulse flex items-center justify-center ${className}`}>
        <span className="text-slate-500">Initialisation...</span>
      </div>
    );
  }

  // Configuration du flux issue du solveur.
  const isVentilateurBas = fan.position === 'bas';
  const fluxMontant = state.vitesse >= 0;

  // Dimensions
  const scale = 8;
  const svgHeight = Math.max(500, hauteurTotale * scale + 80);
  const svgWidth = 600;

  // Positions clé
  const solY = svgHeight - 40;
  const appartementY = solY - 30;
  const toitY = solY - 19 * scale;
  const sortieY = 60;

  // Dimensions visuelles
  const conduitX = 280;
  const conduitWidth = 60;
  const boisseauWidth = 90;
  const epaisseurBoisseau = 15;

  // Températures
  const tempMin = Math.min(tempExt, ...state.tempAir, ...state.tempBoisseauInterne);
  const tempMax = Math.max(tempExt, ...state.tempAir, ...state.tempBoisseauInterne);

  const getTempColor = (temp: number) => {
    const normalized = tempMax !== tempMin ? (temp - tempMin) / (tempMax - tempMin) : 0.5;
    const hue = 240 - normalized * 240; // 240 = bleu, 0 = rouge
    return `hsl(${hue}, 80%, 50%)`;
  };

  // Animation des particules d'air
  const particles = [];
  const nParticles = 15;
  for (let i = 0; i < nParticles; i++) {
    const progress = ((animTime * 0.5 + i * (200 / nParticles)) % 200) / 200;
    const y = fluxMontant
      ? solY - progress * (solY - sortieY)
      : sortieY + progress * (solY - sortieY);
    const x = conduitX + (Math.sin(progress * Math.PI * 4 + i) * 5);
    particles.push({ x, y, opacity: 0.3 + Math.sin(progress * Math.PI) * 0.6 });
  }

  return (
    <div className={`bg-slate-900/60 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      {/* En-tête */}
      <div className="px-4 py-2 border-b border-slate-700 bg-slate-800/40">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Vue en Coupe - Cheminée Maçonnée</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded ${fluxMontant ? 'bg-blue-900/50 text-blue-300' : 'bg-amber-900/50 text-amber-300'}`}>
              {fluxMontant ? '↑ Flux montant' : '↓ Flux descendant'}
            </span>
            <span className={`px-2 py-0.5 rounded ${fan.mode === 'aspiration' ? 'bg-cyan-900/50 text-cyan-300' : 'bg-orange-900/50 text-orange-300'}`}>
              {fan.position} · {fan.mode === 'aspiration' ? 'aspiration' : 'poussée'}
            </span>
          </div>
        </div>
      </div>

      {/* SVG */}
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
        {/* Gradient définitions */}
        <defs>
          <linearGradient id="boisseauGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8B4513" />
            <stop offset="100%" stopColor="#654321" />
          </linearGradient>
          <linearGradient id="airGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fluxMontant ? '#60A5FA' : '#FB923C'} />
            <stop offset="100%" stopColor={fluxMontant ? '#3B82F6' : '#F97316'} />
          </linearGradient>
          <radialGradient id="ventilatorGradient">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1E293B" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
          </marker>
          <linearGradient id="tempScale" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={getTempColor(tempMin)} />
            <stop offset="100%" stopColor={getTempColor(tempMax)} />
          </linearGradient>
        </defs>

        {/* Vent Extérieur */}
        <g transform={`translate(380, ${toitY - 60})`}>
          <path d="M0,10 Q20,0 40,10 T80,10" fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4,4" opacity="0.6">
            <animate attributeName="stroke-dashoffset" from="16" to="0" dur="1s" repeatCount="indefinite" />
          </path>
          <path d="M10,25 Q30,15 50,25 T90,25" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.4">
            <animate attributeName="stroke-dashoffset" from="16" to="0" dur="1.2s" repeatCount="indefinite" />
          </path>
          <text x="45" y="0" fill="#94A3B8" fontSize="10" textAnchor="middle" fontStyle="italic">Vent ext.</text>
          <text x="45" y="-12" fill="#CBD5E1" fontSize="11" textAnchor="middle" fontWeight="bold">{tempExt.toFixed(1)}°C</text>
        </g>

        {/* Sol */}
        <rect x="0" y={solY} width={svgWidth} height="40" fill="#1E293B" />
        <line x1="0" y1={solY} x2={svgWidth} y2={solY} stroke="#334155" strokeWidth="2" />

        {/* Appartement */}
        <rect x="20" y={appartementY} width="200" height="40" fill="#1E3A5F" stroke="#2563EB" strokeWidth="1" rx="4" />
        <text x="120" y={appartementY + 15} textAnchor="middle" fill="#60A5FA" fontSize="11" fontWeight="600">
          Appartement (T_in)
        </text>
        <text x="120" y={appartementY + 30} textAnchor="middle" fill="#E2E8F0" fontSize="12" fontWeight="bold">
          {state.tempAppartement.toFixed(1)}°C
        </text>

        {/* Toiture */}
        <polygon
          points={`220,${toitY + 30} 380,${toitY + 30} 380,${toitY} 220,${toitY}`}
          fill="#374151"
          stroke="#4B5563"
          strokeWidth="1"
        />
        <text x="300" y={toitY + 20} textAnchor="middle" fill="#9CA3AF" fontSize="10">
          Toiture
        </text>

        {/* Boisseau (structure externe) */}
        <rect
          x={conduitX - boisseauWidth/2}
          y={toitY}
          width={boisseauWidth}
          height={solY - toitY}
          fill="url(#boisseauGradient)"
          stroke="#5D4037"
          strokeWidth="2"
          rx="2"
        />

        {/* Conduit intérieur */}
        <rect
          x={conduitX - conduitWidth/2}
          y={toitY + epaisseurBoisseau}
          width={conduitWidth}
          height={solY - toitY - epaisseurBoisseau * 2}
          fill="#0F172A"
          stroke="#1E3A8A"
          strokeWidth="1"
        />

        {/* Gradient thermique dans le conduit */}
        {state.tempAir.map((temp, i) => {
          const n = state.tempAir.length;
          const segmentHeight = (solY - toitY - epaisseurBoisseau * 2) / n;
          const y = toitY + epaisseurBoisseau + i * segmentHeight;
          return (
            <rect
              key={i}
              x={conduitX - conduitWidth/2 + 2}
              y={y}
              width={conduitWidth - 4}
              height={segmentHeight}
              fill={getTempColor(temp)}
              opacity="0.5"
            />
          );
        })}

        {/* Particules d'air animées */}
        {particles.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#60A5FA"
            opacity={p.opacity}
            filter="url(#glow)"
          />
        ))}

        {/* Ventilateur */}
        <g transform={`translate(${conduitX}, ${isVentilateurBas ? solY - 20 : toitY + 20})`}>
          <circle cx="0" cy="0" r="25" fill="url(#ventilatorGradient)" stroke="#64748B" strokeWidth="2" />
          <g transform={`rotate(${animTime * 5})`}>
            <path d="M-15,-3 L15,-3 L12,-12 L-12,-12 Z" fill="#94A3B8" />
            <path d="M-15,3 L15,3 L12,12 L-12,12 Z" fill="#94A3B8" />
          </g>
          <text x="0" y="45" textAnchor="middle" fill="#CBD5E1" fontSize="10" fontWeight="500">
            Ventilateur ({fan.position}, {fan.mode})
          </text>
        </g>

        {/* Flèches de flux */}
        <g>
          {fluxMontant ? (
            <>
              {/* Entrée en bas */}
              <path d={`M${conduitX - 60} ${solY - 10} L${conduitX - 30} ${solY - 10}`} stroke="#60A5FA" strokeWidth="3" markerEnd="url(#arrow)" />
              <text x={conduitX - 100} y={solY - 5} fill="#60A5FA" fontSize="10" fontWeight="600">Entrée</text>

              {/* Sortie en haut */}
              <path d={`M${conduitX} ${sortieY} L${conduitX} ${sortieY - 30}`} stroke="#F97316" strokeWidth="3" markerEnd="url(#arrow)" />
              <text x={conduitX - 20} y={sortieY - 40} fill="#F97316" fontSize="10" fontWeight="600">Sortie</text>
            </>
          ) : (
            <>
              {/* Entrée en haut */}
              <path d={`M${conduitX} ${sortieY - 30} L${conduitX} ${sortieY}`} stroke="#60A5FA" strokeWidth="3" markerEnd="url(#arrow)" />
              <text x={conduitX - 20} y={sortieY - 40} fill="#60A5FA" fontSize="10" fontWeight="600">Entrée</text>

              {/* Sortie en bas */}
              <path d={`M${conduitX - 30} ${solY - 10} L${conduitX - 60} ${solY - 10}`} stroke="#F97316" strokeWidth="3" markerEnd="url(#arrow)" />
              <text x={conduitX - 100} y={solY - 5} fill="#F97316" fontSize="10" fontWeight="600">Sortie</text>
            </>
          )}
        </g>

        {/* Échelle de température */}
        <g transform={`translate(${svgWidth - 100}, 80)`}>
          <text x="-15" y="-10" fill="#94A3B8" fontSize="10" fontWeight="500">Échelle Temp (°C)</text>
          <rect x="0" y="0" width="20" height="150" fill="url(#tempScale)" rx="2" stroke="#334155" strokeWidth="1" />
          <text x="25" y="8" fill="#CBD5E1" fontSize="10" fontWeight="bold">Chaud ({tempMax.toFixed(1)}°C)</text>
          <text x="25" y="148" fill="#CBD5E1" fontSize="10" fontWeight="bold">Froid ({tempMin.toFixed(1)}°C)</text>
        </g>

        {/* Zone d'information dynamique */}
        <g transform={`translate(30, 150)`}>
          <rect x="0" y="0" width="160" height="140" fill="#1E293B" stroke="#334155" strokeWidth="1" rx="4" opacity="0.9" />
          <text x="10" y="20" fill="#E2E8F0" fontSize="11" fontWeight="600">Informations</text>
          <text x="10" y="38" fill="#94A3B8" fontSize="9">Vitesse: {state.vitesse.toFixed(2)} m/s</text>
          <text x="10" y="52" fill="#94A3B8" fontSize="9">Re: {state.reynolds.toFixed(0)}</text>
          <text x="10" y="66" fill="#94A3B8" fontSize="9">Régime: {state.regimeEcoulement}</text>
          <text x="10" y="80" fill="#94A3B8" fontSize="9">T_air_out: {state.tempAirSortie.toFixed(1)}°C</text>
          <text x="10" y="94" fill="#94A3B8" fontSize="9">ΔP_tirage: {state.pressionTirage.toFixed(1)} Pa</text>
          <text x="10" y="108" fill="#94A3B8" fontSize="9">ΔP_fan: {state.pressionVentilateur.toFixed(1)} Pa</text>
          <text x="10" y="122" fill="#94A3B8" fontSize="9">ΔP_pertes: {state.pertesChargeTotal.toFixed(1)} Pa</text>
        </g>

        {/* Coude 45° */}
        <g transform={`translate(${conduitX}, ${solY - hauteurTotale * scale + 100})`}>
          <path d={`M-30,30 Q-30,0 0,-30`} stroke="#4B5563" strokeWidth="6" fill="none" strokeDasharray="4,4" />
          <text x="-50" y="20" fill="#9CA3AF" fontSize="9">Coude 45°</text>
        </g>
      </svg>

      {/* Légende */}
      <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-orange-500"></div>
            <span className="text-slate-400">Gradient thermique</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-400"></div>
            <span className="text-slate-400">Particules d'air</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-700"></div>
            <span className="text-slate-400">Boisseau maçonné</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-500"></div>
            <span className="text-slate-400">Ventilateur</span>
          </div>
        </div>
      </div>
    </div>
  );
}
