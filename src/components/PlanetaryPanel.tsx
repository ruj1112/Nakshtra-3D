import React from 'react';
import { PlanetPosition } from '../types/astronomy';
import { NAKSHATRAS } from '../data/nakshatrasData';
import { Crosshair, Eye, EyeOff, Compass, Moon, Sun } from 'lucide-react';

interface PlanetaryPanelProps {
  planets: PlanetPosition[];
  selectedPlanetId: string | null;
  onSelectPlanet: (id: string) => void;
  onSelectNakshatra: (id: number) => void;
}

export const PlanetaryPanel: React.FC<PlanetaryPanelProps> = ({
  planets,
  selectedPlanetId,
  onSelectPlanet,
  onSelectNakshatra,
}) => {
  const moon = planets.find((p) => p.id === 'moon');
  const sun = planets.find((p) => p.id === 'sun');
  const moonNakshatra = moon ? NAKSHATRAS.find((n) => n.id === moon.nakshatraId) : null;

  return (
    <div className="space-y-4">
      {/* Current Chandra (Moon) Highlight Card */}
      {moon && moonNakshatra && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-indigo-300" />
              चन्द्र नक्षत्र (Chandra Nakshatra)
            </span>
            <span className="text-xs text-indigo-200 font-mono">
              कला (Phase): {Math.round((moon.phase || 0) * 100)}%
            </span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold font-cinzel text-indigo-100">
                {moonNakshatra.sanskrit}{' '}
                <span className="text-sm font-sans font-normal text-indigo-300">
                  ({moonNakshatra.name})
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                चरण {moon.pada} (Pada {moon.pada}) · {moon.rashi} at {moon.rashiDeg.toFixed(1)}°
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                स्वामी: {moonNakshatra.grahaLord} · देवता: {moonNakshatra.deity}
              </p>
            </div>

            <button
              onClick={() => {
                onSelectPlanet('moon');
                onSelectNakshatra(moon.nakshatraId);
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-medium hover:bg-indigo-500/30 transition-colors flex items-center gap-1.5"
            >
              <Crosshair className="w-3.5 h-3.5" />
              आकाश में देखें (Locate)
            </button>
          </div>
        </div>
      )}

      {/* Navagrahas List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {planets.map((planet) => {
          const isSelected = selectedPlanetId === planet.id;
          const isVisible = planet.alt > 0;

          return (
            <div
              key={planet.id}
              onClick={() => {
                onSelectPlanet(planet.id);
                onSelectNakshatra(planet.nakshatraId);
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/60 shadow-lg'
                  : 'bg-gray-900/60 border-gray-800/80 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm"
                    style={{ backgroundColor: `${planet.color}25`, color: planet.color }}
                  >
                    {planet.symbol}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-slate-200">
                        {planet.name}
                      </span>
                      {planet.isRetrograde && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800/50">
                          वक्री (R)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {planet.rashi} {planet.rashiDeg.toFixed(1)}°
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className="text-xs font-medium text-amber-300">
                    {planet.nakshatraSanskrit} ({planet.nakshatraName})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    चरण {planet.pada} (Pada {planet.pada})
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                    {isVisible ? (
                      <>
                        <Eye className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">क्षितिज ऊपर (+{Math.round(planet.alt)}°)</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 text-slate-400" />
                        <span>क्षितिज नीचे ({Math.round(planet.alt)}°)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
