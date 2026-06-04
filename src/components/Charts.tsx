// Visualisations avancées avec Plotly - VERSION COMPOSANTS REACT

import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js/dist/plotly.min.js';
import { SimulationState } from '../lib/types';

// ============================================================================
// CONFIGURATION PLOTLY COMMUNE
// ============================================================================

const plotLayout = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(30,41,59,0.5)',
  font: {
    family: 'Inter, system-ui, sans-serif',
    color: '#94a3b8',
    size: 12,
  },
  margin: { l: 60, r: 30, t: 40, b: 50 },
  xaxis: {
    gridcolor: '#334155',
    zerolinecolor: '#475569',
  },
  yaxis: {
    gridcolor: '#334155',
    zerolinecolor: '#475569',
  },
};

const plotConfig = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  scrollZoom: true,
};

// ============================================================================
// GRAPHIQUE TEMPÉRATURES TEMPORELLES
// ============================================================================

interface TemperatureChartProps {
  states: SimulationState[];
  tempExtBase?: number;
  weatherData?: import('../lib/types').WeatherData[];
  heureDebut?: string;
}

  export function TemperatureChart({ states, tempExtBase, weatherData, heureDebut }: TemperatureChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || states.length === 0) return;

    const [hh, mm] = (heureDebut || "00:00").split(':').map(Number);
    const baseTimeMs = new Date(2025, 0, 1, hh, mm, 0).getTime();
    const times = states.map(s => new Date(baseTimeMs + s.temps * 1000));

    const traces: Plotly.Data[] = [];

    // Ajouter la ligne météo 24h en arrière-plan si fournie
    if (weatherData && weatherData.length > 0) {
      const weatherTimes = weatherData.map(w => new Date(baseTimeMs + w.timestamp * 1000));
      traces.push({
        name: 'Météo (24h)',
        x: weatherTimes,
        y: weatherData.map(w => w.temperature),
        mode: 'lines',
        line: { color: 'rgba(96, 165, 250, 0.2)', width: 4 },
        hovertemplate: '%{x|%H:%M}: %{y:.1f}°C (Météo)<extra></extra>',
        showlegend: true,
      });
    }

    traces.push(
      {
        name: 'T° Extérieure (Simulée)',
        x: times,
        y: states.map(s => s.tempExt ?? tempExtBase ?? 15),
        mode: 'lines',
        line: { color: '#60a5fa', dash: 'dash', width: 2 },
        hovertemplate: '%{y:.1f}°C<extra></extra>',
      },
      {
        name: 'T° Air Entrée',
        x: times,
        y: states.map(s => s.tempAir[0]),
        mode: 'lines',
        line: { color: '#06b6d4', width: 2 },
        hovertemplate: '%{y:.1f}°C<extra></extra>',
      },
      {
        name: 'T° Air Sortie',
        x: times,
        y: states.map(s => s.tempAirSortie),
        mode: 'lines',
        line: { color: '#f97316', width: 2 },
        hovertemplate: '%{y:.1f}°C<extra></extra>',
      },
      {
        name: 'T° Boisseau (moy)',
        x: times,
        y: states.map(s => s.tempMoyenneBoisseau),
        mode: 'lines',
        line: { color: '#ef4444', width: 2 },
        hovertemplate: '%{y:.1f}°C<extra></extra>',
      },
      {
        name: 'T° Appartement',
        x: times,
        y: states.map(s => s.tempAppartement),
        mode: 'lines',
        line: { color: '#a855f7', width: 2 },
        hovertemplate: '%{y:.1f}°C<extra></extra>',
      }
    );

    const layout: Partial<Plotly.Layout> = {
      ...plotLayout,
      title: {
        text: 'Évolution des Températures',
        font: { color: '#e2e8f0', size: 14 },
      },
      xaxis: {
        ...plotLayout.xaxis,
        type: 'date',
        tickformat: '%H:%M',
        title: { text: 'Heure', font: { color: '#94a3b8' } },
      },
      yaxis: {
        ...plotLayout.yaxis,
        title: { text: 'Température (°C)', font: { color: '#94a3b8' } },
      },
      legend: {
        x: 0,
        y: 1.1,
        orientation: 'h' as const,
        font: { size: 10 },
      },
      hovermode: 'x unified',
    };

    Plotly.newPlot(containerRef.current, traces, layout, plotConfig);

    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [states, tempExtBase, weatherData, heureDebut]);

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700 p-4">
      <div ref={containerRef} style={{ height: '320px' }} />
    </div>
  );
}

// ============================================================================
// GRAPHIQUE PUISSANCE
// ============================================================================

interface PowerChartProps {
  states: SimulationState[];
  heureDebut?: string;
}

export function PowerChart({ states, heureDebut }: PowerChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || states.length === 0) return;

    const [hh, mm] = (heureDebut || "00:00").split(':').map(Number);
    const baseTimeMs = new Date(2025, 0, 1, hh, mm, 0).getTime();
    const times = states.map(s => new Date(baseTimeMs + s.temps * 1000));

    const traces: Plotly.Data[] = [
      {
        name: 'Puissance (W)',
        x: times,
        y: states.map(s => s.puissanceThermique),
        type: 'scatter',
        mode: 'lines',
        fill: 'tozeroy',
        line: { color: '#10b981', width: 2 },
        hovertemplate: '%{y:.1f} W<extra></extra>',
      },
    ];

    const layout: Partial<Plotly.Layout> = {
      ...plotLayout,
      title: {
        text: 'Puissance Thermique (Chaleur transportée par l\'air)',
        font: { color: '#e2e8f0', size: 14 },
      },
      xaxis: {
        ...plotLayout.xaxis,
        type: 'date',
        tickformat: '%H:%M',
        title: { text: 'Heure', font: { color: '#94a3b8' } },
      },
      yaxis: {
        ...plotLayout.yaxis,
        title: { text: 'Puissance (W)', font: { color: '#94a3b8' } },
      },
    };

    Plotly.newPlot(containerRef.current, traces, layout, plotConfig);

    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [states, heureDebut]);

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700 p-4 flex flex-col">
      <p className="text-[11px] text-slate-400 mb-2 leading-relaxed bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
        <strong className="text-emerald-400">Explication :</strong> Indique la quantité de chaleur (en Watts) transportée par l'air à chaque instant. Si l'air sort chaud, la cheminée extrait de la chaleur du logement (puissance de refroidissement).
      </p>
      <div ref={containerRef} style={{ height: '280px' }} />
    </div>
  );
}

// ============================================================================
// GRAPHIQUE ÉNERGIE
// ============================================================================

interface EnergyChartProps {
  states: SimulationState[];
  heureDebut?: string;
}

export function EnergyChart({ states, heureDebut }: EnergyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || states.length === 0) return;

    const [hh, mm] = (heureDebut || "00:00").split(':').map(Number);
    const baseTimeMs = new Date(2025, 0, 1, hh, mm, 0).getTime();
    const times = states.map(s => new Date(baseTimeMs + s.temps * 1000));

    const traces: Plotly.Data[] = [
      {
        name: 'Énergie (kWh)',
        x: times,
        y: states.map(s => s.energieEchangee / 3600 / 1000),
        type: 'scatter',
        mode: 'lines',
        fill: 'tozeroy',
        line: { color: '#8b5cf6', width: 2 },
        hovertemplate: '%{y:.3f} kWh<extra></extra>',
      },
    ];

    const layout: Partial<Plotly.Layout> = {
      ...plotLayout,
      title: {
        text: 'Énergie Totale Cumulée (kWh)',
        font: { color: '#e2e8f0', size: 14 },
      },
      xaxis: {
        ...plotLayout.xaxis,
        type: 'date',
        tickformat: '%H:%M',
        title: { text: 'Heure', font: { color: '#94a3b8' } },
      },
      yaxis: {
        ...plotLayout.yaxis,
        title: { text: 'Énergie (kWh)', font: { color: '#94a3b8' } },
      },
    };

    Plotly.newPlot(containerRef.current, traces, layout, plotConfig);

    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [states, heureDebut]);

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700 p-4 flex flex-col">
      <p className="text-[11px] text-slate-400 mb-2 leading-relaxed bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
        <strong className="text-purple-400">Explication :</strong> C'est la somme totale de toute l'énergie thermique déplacée depuis le début de la simulation. Permet de chiffrer l'impact de la cheminée sur la facture de chauffage.
      </p>
      <div ref={containerRef} style={{ height: '280px' }} />
    </div>
  );
}

// ============================================================================
// GRAPHIQUE HYDRAULIQUE
// ============================================================================

interface FlowChartProps {
  states: SimulationState[];
  heureDebut?: string;
}

export function FlowChart({ states, heureDebut }: FlowChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || states.length === 0) return;

    const [hh, mm] = (heureDebut || "00:00").split(':').map(Number);
    const baseTimeMs = new Date(2025, 0, 1, hh, mm, 0).getTime();
    const times = states.map(s => new Date(baseTimeMs + s.temps * 1000));

    const traces: Plotly.Data[] = [
      {
        name: 'Vitesse (m/s)',
        x: times,
        y: states.map(s => s.vitesse),
        mode: 'lines',
        line: { color: '#06b6d4', width: 2 },
        yaxis: 'y',
        hovertemplate: 'Vitesse: %{y:.2f} m/s<extra></extra>',
      },
      {
        name: 'Débit (m³/h)',
        x: times,
        y: states.map(s => s.debitVolmique * 3600),
        mode: 'lines',
        line: { color: '#10b981', width: 2 },
        yaxis: 'y2',
        hovertemplate: 'Débit: %{y:.0f} m³/h<extra></extra>',
      },
    ];

    const layout: Partial<Plotly.Layout> = {
      ...plotLayout,
      title: {
        text: 'Hydraulique',
        font: { color: '#e2e8f0', size: 14 },
      },
      xaxis: {
        ...plotLayout.xaxis,
        type: 'date',
        tickformat: '%H:%M',
        title: { text: 'Heure', font: { color: '#94a3b8' } },
      },
      yaxis: {
        ...plotLayout.yaxis,
        title: { text: 'Vitesse (m/s)', font: { color: '#06b6d4' } },
        side: 'left',
      },
      yaxis2: {
        title: { text: 'Débit (m³/h)', font: { color: '#10b981' } },
        side: 'right',
        overlaying: 'y',
        gridcolor: 'rgba(16, 185, 129, 0.2)',
      },
      legend: {
        x: 0,
        y: 1.1,
        orientation: 'h' as const,
      },
    };

    Plotly.newPlot(containerRef.current, traces, layout, plotConfig);

    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [states, heureDebut]);

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700 p-4">
      <div ref={containerRef} style={{ height: '280px' }} />
    </div>
  );
}

// ============================================================================
// PROFIL AXIAL
// ============================================================================

interface AxialProfileChartProps {
  state: SimulationState | null;
  hauteurTotale: number;
}

export function AxialProfileChart({ state, hauteurTotale }: AxialProfileChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !state) return;

    const nSegments = state.tempAir.length;
    const positions = Array.from({ length: nSegments }, (_, i) =>
      ((i + 0.5) / nSegments) * hauteurTotale
    );

    const traces: Plotly.Data[] = [
      {
        name: 'T° Air',
        x: positions,
        y: state.tempAir,
        mode: 'lines+markers',
        line: { color: '#f97316', width: 2 },
        marker: { size: 4 },
        hovertemplate: 'z=%{x:.1f}m: %{y:.1f}°C<extra></extra>',
      },
      {
        name: 'T° Boisseau Int.',
        x: positions,
        y: state.tempBoisseauInterne,
        mode: 'lines',
        line: { color: '#ef4444', width: 2 },
        hovertemplate: 'z=%{x:.1f}m: %{y:.1f}°C<extra></extra>',
      },
      {
        name: 'T° Boisseau Ext.',
        x: positions,
        y: state.tempBoisseauExterne,
        mode: 'lines',
        line: { color: '#fbbf24', width: 2 },
        hovertemplate: 'z=%{x:.1f}m: %{y:.1f}°C<extra></extra>',
      },
    ];

    const layout: Partial<Plotly.Layout> = {
      ...plotLayout,
      title: {
        text: 'Profil Vertical des Températures',
        font: { color: '#e2e8f0', size: 14 },
      },
      xaxis: {
        ...plotLayout.xaxis,
        title: { text: 'Hauteur (m)', font: { color: '#94a3b8' } },
      },
      yaxis: {
        ...plotLayout.yaxis,
        title: { text: 'Température (°C)', font: { color: '#94a3b8' } },
      },
      legend: {
        x: 0.7,
        y: 0.95,
      },
    };

    Plotly.newPlot(containerRef.current, traces, layout, plotConfig);

    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [state, hauteurTotale]);

  if (!state) {
    return <div className="bg-slate-800/40 rounded-xl animate-pulse h-64" />;
  }

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700 p-4">
      <div ref={containerRef} style={{ height: '280px' }} />
    </div>
  );
}

// ============================================================================
// HEATMAP TEMPS/HAUTEUR
// ============================================================================

interface HeatmapChartProps {
  states: SimulationState[];
  type: 'temperature' | 'velocity' | 'pressure';
  height: number;
  heureDebut?: string;
}

export function HeatmapChart({ states, type, height, heureDebut }: HeatmapChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || states.length === 0) return;

    const nSegments = states[0].tempAir.length;
    const [hh, mm] = (heureDebut || "00:00").split(':').map(Number);
    const baseTimeMs = new Date(2025, 0, 1, hh, mm, 0).getTime();
    const times = states.map(s => new Date(baseTimeMs + s.temps * 1000));
    const heights = Array.from({ length: nSegments }, (_, i) => ((i + 0.5) / nSegments * height));

    let zData: number[][];
    let colorbarTitle: string;
    let title: string;

    if (type === 'temperature') {
      zData = states.map(s => s.tempAir);
      colorbarTitle = 'T (°C)';
      title = 'Carte Thermique - Température Air';
    } else if (type === 'velocity') {
      zData = states.map(s => Array(nSegments).fill(s.vitesse));
      colorbarTitle = 'V (m/s)';
      title = 'Carte de Vitesse';
    } else {
      zData = states.map(s => Array(nSegments).fill(s.pressionTirage));
      colorbarTitle = 'P (Pa)';
      title = 'Carte de Pression';
    }

    // Transpose pour avoir z en Y et temps en X
    const zTransposed = zData[0].map((_, rowIdx) => zData.map(col => col[rowIdx]));

    const trace: Plotly.Data = {
      type: 'heatmap',
      x: times,
      y: heights,
      z: zTransposed,
      colorscale: [
        [0, '#1e3a8a'],
        [0.25, '#3b82f6'],
        [0.5, '#06b6d4'],
        [0.75, '#f97316'],
        [1, '#dc2626'],
      ],
      colorbar: {
        title: {
          text: colorbarTitle,
          font: { size: 11, color: '#94a3b8' },
        },
        tickfont: { color: '#94a3b8' },
      },
      hovertemplate: 't=%{x:.1f}h<br>z=%{y:.1f}m<br>valeur=%{z:.2f}<extra></extra>',
    };

    const layout: Partial<Plotly.Layout> = {
      ...plotLayout,
      title: {
        text: title,
        font: { size: 14, color: '#e2e8f0' },
      },
      xaxis: {
        ...plotLayout.xaxis,
        type: 'date',
        tickformat: '%H:%M',
        title: { text: 'Heure' },
      },
      yaxis: {
        ...plotLayout.yaxis,
        title: { text: 'Hauteur z (m)' },
      },
    };

    Plotly.newPlot(containerRef.current, [trace], layout, plotConfig);

    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [states, type, height, heureDebut]);

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700 p-4">
      <div ref={containerRef} style={{ height: '400px' }} />
    </div>
  );
}
