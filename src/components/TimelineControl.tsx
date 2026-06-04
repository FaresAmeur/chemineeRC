// Timeline interactive pour contrôle de simulation

import { useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, FastForward, Rewind } from 'lucide-react';

interface Props {
  currentTime: number;
  maxTime: number;
  isPlaying: boolean;
  speed: number;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
}

export function SimulationTimeline({
  currentTime,
  maxTime,
  isPlaying,
  speed,
  onTimeChange,
  onPlayPause,
  onSpeedChange,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const speedOptions = [0.5, 1, 2, 5, 10];

  // Formater le temps
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    } else if (m > 0) {
      return `${m}m ${s}s`;
    } else {
      return `${s}s`;
    }
  };

  const progress = maxTime > 0 ? (currentTime / maxTime) * 100 : 0;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * maxTime;

    onTimeChange(newTime);
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * maxTime;

    onTimeChange(newTime);
  };

  return (
    <div className="w-full">
      {/* Contrôles principaux */}
      <div className="flex items-center gap-4 mb-4">
        {/* Bouton reset */}
        <button
          onClick={() => onTimeChange(0)}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          title="Retour au début"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        {/* Reculer */}
        <button
          onClick={() => onTimeChange(Math.max(0, currentTime - 60))}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          title="Reculer de 1 minute"
        >
          <Rewind className="w-5 h-5" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          className={`p-3 rounded-xl transition-all ${
            isPlaying
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          title={isPlaying ? 'Pause' : 'Lecture'}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>

        {/* Avancer */}
        <button
          onClick={() => onTimeChange(Math.min(maxTime, currentTime + 60))}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          title="Avancer de 1 minute"
        >
          <FastForward className="w-5 h-5" />
        </button>

        {/* Bouton fin */}
        <button
          onClick={() => onTimeChange(maxTime)}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          title="Aller à la fin"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        {/* Sélecteur de vitesse */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">Vitesse:</span>
          <div className="flex gap-1">
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  speed === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>{formatTime(currentTime)}</span>
          <span>/ {formatTime(maxTime)}</span>
        </div>

        <div
          ref={timelineRef}
          className="relative h-3 bg-slate-700 rounded-full cursor-pointer overflow-hidden group"
          onClick={handleTimelineClick}
          onMouseDown={() => setIsDragging(true)}
          onMouseMove={handleDrag}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          {/* Progrès */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all group-hover:opacity-90"
            style={{ width: `${progress}%` }}
          />

          {/* Curseur */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 8px)` }}
          />

          {/* Marqueurs */}
          {maxTime > 3600 && (
            <>
              {[0.25, 0.5, 0.75].map((frac) => (
                <div
                  key={frac}
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-600"
                  style={{ left: `${frac * 100}%` }}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
        <span>Progression: {progress.toFixed(1)}%</span>
        <span>Vitesse actuelle: {speed}x</span>
      </div>
    </div>
  );
}
