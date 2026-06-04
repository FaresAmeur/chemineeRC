import { SimulationState } from '../lib/types';

interface Props {
  state: SimulationState | null;
  hauteurTotale: number;
}

export function PressureGradient({ state, hauteurTotale }: Props) {
  if (!state || !state.pressionProfil || state.pressionProfil.length === 0) {
    return (
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 h-96 flex items-center justify-center">
        <span className="text-slate-500">En attente de simulation...</span>
      </div>
    );
  }

  const profil = state.pressionProfil;
  const maxZ = hauteurTotale;
  
  // Dimensions SVG
  const width = 400;
  const height = 500;
  const marginY = 40;
  const tubeWidth = 60;
  const tubeX = width / 2 - tubeWidth / 2;
  
  const innerHeight = height - 2 * marginY;

  // Calcul des min/max pour le gradient de couleur
  const pressions = profil.map(p => p.pressionStatique);
  const minP = Math.min(...pressions, -10);
  const maxP = Math.max(...pressions, 10);
  
  // Fonction pour convertir la hauteur z en y SVG (z=0 est en bas)
  const zToY = (z: number) => height - marginY - (z / maxZ) * innerHeight;

  // Interpolation de couleur: bleu foncé (dépression forte) -> cyan -> vert (neutre) -> jaune -> rouge (pression forte)
  const getColor = (p: number) => {
    const maxAbs = Math.max(Math.abs(minP), Math.abs(maxP), 1);
    const norm = Math.max(-1, Math.min(1, p / maxAbs));
    
    if (norm < 0) {
      // Bleu
      const intensity = Math.abs(norm);
      return `rgb(${Math.round(30 + 30 * intensity)}, ${Math.round(144 + 60 * intensity)}, ${Math.round(255)})`;
    } else {
      // Rouge/Orange
      const intensity = norm;
      return `rgb(${Math.round(255)}, ${Math.round(150 - 100 * intensity)}, ${Math.round(50 - 50 * intensity)})`;
    }
  };

  return (
    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 flex flex-col items-center h-full min-h-[400px]">
      <div className="flex flex-col w-full mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Profil de Pression</h3>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
          <strong className="text-blue-400">Bleu (Dépression) :</strong> Le conduit est "en aspiration", c'est le fonctionnement normal qui extrait l'air.<br/>
          <strong className="text-orange-400">Orange/Rouge (Surpression) :</strong> Le conduit est sous pression. L'air a tendance à fuir vers l'extérieur (ou dans le bâtiment s'il y a des fissures).
        </p>
      </div>
      
      <div className="relative flex-1 w-full flex justify-center items-center overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-h-full">
          
          {/* Dégradé du tube */}
          <defs>
            <linearGradient id="pressureGradient" x1="0" y1="0" x2="0" y2="1">
              {profil.map((p, idx) => {
                const offset = 1 - (p.z / maxZ); // 0 en haut, 1 en bas
                return (
                  <stop 
                    key={idx} 
                    offset={`${offset * 100}%`} 
                    stopColor={getColor(p.pressionStatique)} 
                  />
                );
              })}
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Grille de fond */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const z = ratio * maxZ;
            const y = zToY(z);
            return (
              <g key={ratio}>
                <line x1="40" y1={y} x2={width - 40} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                <text x="35" y={y + 4} fill="#64748B" fontSize="10" textAnchor="end">{z.toFixed(1)}m</text>
              </g>
            );
          })}

          {/* Tube Principal */}
          <rect 
            x={tubeX} 
            y={marginY} 
            width={tubeWidth} 
            height={innerHeight} 
            fill="url(#pressureGradient)" 
            stroke="#475569" 
            strokeWidth="2"
            rx="4"
          />

          {/* Annotations latérales */}
          {/* Pression Statique le long du tube (gauche) */}
          {profil.filter((_, i) => i % Math.max(1, Math.floor(profil.length / 5)) === 0 || i === profil.length - 1).map((p, idx) => {
            const y = zToY(p.z);
            return (
              <g key={`p-${idx}`}>
                <line x1={tubeX - 10} y1={y} x2={tubeX} y2={y} stroke="#cbd5e1" strokeWidth="1" />
                <text x={tubeX - 15} y={y + 4} fill="#e2e8f0" fontSize="11" textAnchor="end" fontWeight="500">
                  {p.pressionStatique > 0 ? '+' : ''}{p.pressionStatique.toFixed(1)} Pa
                </text>
              </g>
            );
          })}

          {/* Contributions cumulées (droite) */}
          {profil.length > 0 && (
            <g transform={`translate(${tubeX + tubeWidth + 20}, 0)`}>
              {/* Box des dynamiques au sommet */}
              <rect x="0" y={marginY - 20} width="120" height="90" fill="#0f172a" stroke="#334155" rx="4" opacity="0.8" />
              <text x="10" y={marginY} fill="#94a3b8" fontSize="10" fontWeight="bold">BILAN SORTIE</text>
              
              <text x="10" y={marginY + 18} fill="#ef4444" fontSize="11">Pertes: -{profil[profil.length - 1].perteCumulee.toFixed(1)} Pa</text>
              <text x="10" y={marginY + 34} fill="#10b981" fontSize="11">Tirage: +{profil[profil.length - 1].tirageCumule.toFixed(1)} Pa</text>
              <text x="10" y={marginY + 50} fill="#3b82f6" fontSize="11">Fan: {profil[profil.length - 1].ventilateur > 0 ? '+' : ''}{profil[profil.length - 1].ventilateur.toFixed(1)} Pa</text>
              <text x="10" y={marginY + 66} fill="#a855f7" fontSize="11">Venturi: {profil[profil.length - 1].venturi.toFixed(1)} Pa</text>
            </g>
          )}

          {/* Icône Fan (si actif) */}
          {profil.length > 0 && Math.abs(profil[profil.length-1].ventilateur) > 0.1 && (
            <g transform={`translate(${tubeX + tubeWidth / 2}, ${profil[profil.length-1].ventilateur === profil[0].ventilateur ? zToY(0) + 20 : zToY(maxZ) - 20})`}>
              <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" filter="url(#glow)"/>
              <path d="M-5 -5 L5 5 M-5 5 L5 -5 M0 -7 L0 7 M-7 0 L7 0" stroke="#60a5fa" strokeWidth="2" />
            </g>
          )}

        </svg>
      </div>

      <div className="w-full mt-2 flex justify-between text-xs text-slate-400 px-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(30, 144, 255)' }}></div> 
          <span>Dépression <span className="text-[10px] opacity-70">(Aspiration / Tirage)</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(255, 150, 50)' }}></div> 
          <span>Surpression <span className="text-[10px] opacity-70">(Refoulement / Fuites)</span></span>
        </div>
      </div>
    </div>
  );
}
