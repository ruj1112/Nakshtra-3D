import React, { useState } from 'react';
import { NAKSHATRAS } from '../data/nakshatrasData';
import { Search, Star, Crosshair, ChevronRight } from 'lucide-react';

interface NakshatrasDirectoryProps {
  selectedNakshatraId: number | null;
  onSelectNakshatra: (id: number) => void;
  onFocusInSky?: (id: number) => void;
}

export const NakshatrasDirectory: React.FC<NakshatrasDirectoryProps> = ({
  selectedNakshatraId,
  onSelectNakshatra,
  onFocusInSky,
}) => {
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');

  const filtered = NAKSHATRAS.filter((n) => {
    const matchesSearch =
      n.name.toLowerCase().includes(search.toLowerCase()) ||
      n.sanskrit.includes(search) ||
      n.grahaLord.toLowerCase().includes(search.toLowerCase()) ||
      n.deity.toLowerCase().includes(search.toLowerCase()) ||
      n.rashiSpan.toLowerCase().includes(search.toLowerCase()) ||
      n.id.toString() === search;

    const matchesElement = filterElement === 'all' || n.element.toLowerCase() === filterElement.toLowerCase();

    return matchesSearch && matchesElement;
  });

  return (
    <div className="space-y-4">
      {/* Search and Element Filter */}
      <div className="p-4 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search 27 Nakshatras by name, Lord, Devata, or Rashi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-950/80 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] px-1 shrink-0">Element:</span>
          {['all', 'fire', 'earth', 'air', 'water', 'ether'].map((el) => (
            <button
              key={el}
              onClick={() => setFilterElement(el)}
              className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-colors ${
                filterElement === el
                  ? 'bg-amber-500 text-gray-950 font-semibold'
                  : 'bg-gray-950/80 text-slate-400 hover:text-slate-200 border border-gray-800'
              }`}
            >
              {el}
            </button>
          ))}
        </div>
      </div>

      {/* Nakshatras Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((nak) => {
          const isSelected = selectedNakshatraId === nak.id;
          return (
            <div
              key={nak.id}
              onClick={() => onSelectNakshatra(nak.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-500 shadow-md'
                  : 'bg-gray-900/60 border-gray-800/80 hover:border-gray-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{nak.symbolIcon}</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">
                        {nak.id}. {nak.sanskrit} ({nak.name})
                      </h4>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {nak.startDeg.toFixed(0)}°–{nak.endDeg.toFixed(0)}°
                  </span>
                </div>

                <div className="mt-2.5 space-y-1 text-xs text-slate-300">
                  <p className="line-clamp-1">
                    <span className="text-slate-400">राशि (Rashi):</span> {nak.rashiSpan}
                  </p>
                  <p>
                    <span className="text-slate-400">स्वामी (Lord):</span>{' '}
                    <span className="text-amber-300">{nak.grahaLord}</span> ·{' '}
                    <span className="text-slate-400">देवता (Deity):</span> {nak.deity.split('(')[0]}
                  </p>
                  <p className="line-clamp-1 text-slate-400 text-[11px]">
                    तारे (Stars): {nak.shape.stars.map((s) => s.properName || s.id).join(', ')}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-400">{nak.symbol}</span>
                <div className="flex items-center gap-2">
                  {onFocusInSky && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFocusInSky(nak.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-amber-400 transition-colors"
                      title="Focus in Sky Map"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
