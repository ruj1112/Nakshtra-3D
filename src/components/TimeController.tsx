import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';

interface TimeControllerProps {
  currentDate: Date;
  onChangeDate: (newDate: Date) => void;
  isLive: boolean;
  onToggleLive: (live: boolean) => void;
}

export const TimeController: React.FC<TimeControllerProps> = ({
  currentDate,
  onChangeDate,
  isLive,
  onToggleLive,
}) => {
  const { t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(3600); // seconds advance per real second (1 hr/sec)
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Simulation loop when isPlaying
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      onChangeDate(new Date(currentDate.getTime() + playSpeed * 1000 * 0.1));
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, currentDate, onChangeDate]);

  const stepHours = (hours: number) => {
    onToggleLive(false);
    setIsPlaying(false);
    onChangeDate(new Date(currentDate.getTime() + hours * 3600 * 1000));
  };

  const stepDays = (days: number) => {
    onToggleLive(false);
    setIsPlaying(false);
    onChangeDate(new Date(currentDate.getTime() + days * 24 * 3600 * 1000));
  };

  const handleResetToLive = () => {
    setIsPlaying(false);
    onToggleLive(true);
    onChangeDate(new Date());
  };

  if (isMinimized) {
    return (
      <div className="flex items-center gap-2 bg-gray-950/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-800 text-xs text-slate-300 shadow-xl transition-all">
        <button
          onClick={handleResetToLive}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
            isLive
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              : 'bg-gray-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Reset to Live Current Time"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLive ? 'bg-rose-500 animate-pulse' : 'bg-gray-500'
            }`}
          />
          {t('timeLive')}
        </button>

        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-200">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>
            {currentDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <button
          onClick={() => setIsMinimized(false)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          title="Expand Time Controller"
          aria-label="Expand Time Controller"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-[-90deg]" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-gray-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-gray-800 text-xs text-slate-300 shadow-xl">
      {/* Live Indicator & Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleResetToLive}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            isLive
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
              : 'bg-gray-800/80 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? 'bg-rose-500 animate-pulse' : 'bg-gray-500'
            }`}
          />
          {t('timeLive')}
        </button>

        {/* Current Date & Time Display */}
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-200">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>{currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span className="text-gray-600">·</span>
          <span>{currentDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>

      {/* Scrubbing & Stepping Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => stepDays(-1)}
          title="-1 Day"
          className="px-2 py-1 rounded bg-gray-900 hover:bg-gray-800 text-slate-300 transition-colors border border-gray-800 text-[11px]"
        >
          -1d
        </button>
        <button
          onClick={() => stepHours(-1)}
          title="-1 Hour"
          className="px-2 py-1 rounded bg-gray-900 hover:bg-gray-800 text-slate-300 transition-colors border border-gray-800 text-[11px]"
        >
          -1h
        </button>

        {/* Play / Pause simulation */}
        <button
          onClick={() => {
            onToggleLive(false);
            setIsPlaying(!isPlaying);
          }}
          className={`p-1.5 rounded transition-colors ${
            isPlaying
              ? 'bg-amber-500 text-gray-950 font-bold'
              : 'bg-gray-900 hover:bg-gray-800 text-amber-400 border border-gray-800'
          }`}
          title={isPlaying ? 'Pause Celestial Motion' : 'Play Celestial Motion'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => stepHours(1)}
          title="+1 Hour"
          className="px-2 py-1 rounded bg-gray-900 hover:bg-gray-800 text-slate-300 transition-colors border border-gray-800 text-[11px]"
        >
          +1h
        </button>
        <button
          onClick={() => stepDays(1)}
          title="+1 Day"
          className="px-2 py-1 rounded bg-gray-900 hover:bg-gray-800 text-slate-300 transition-colors border border-gray-800 text-[11px]"
        >
          +1d
        </button>

        {/* Playback speed toggle */}
        {isPlaying && (
          <button
            onClick={() => {
              if (playSpeed === 360) setPlaySpeed(3600);
              else if (playSpeed === 3600) setPlaySpeed(86400);
              else setPlaySpeed(360);
            }}
            className="px-2 py-1 rounded bg-gray-800 text-amber-400 text-[10px] font-mono border border-gray-700"
            title="Cycle Simulation Speed"
          >
            {playSpeed === 360 ? '6m/s' : playSpeed === 3600 ? '1h/s' : '1d/s'}
          </button>
        )}

        {/* Minimize Button */}
        <button
          onClick={() => setIsMinimized(true)}
          className="p-1 ml-1 text-slate-400 hover:text-white transition-colors"
          title="Minimize Time Controller for Full Canvas View"
          aria-label="Minimize Time Controller"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-90" />
        </button>
      </div>
    </div>
  );
};
