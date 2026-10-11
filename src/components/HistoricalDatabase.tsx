import React, { useState } from 'react';
import { HistoricalEvent } from '../types/astronomy';
import { HISTORICAL_EVENTS } from '../data/historicalEvents';
import {
  Search,
  Calendar,
  Compass,
  Crosshair,
  ExternalLink,
  SlidersHorizontal,
  Bookmark,
  Sparkles,
  History,
} from 'lucide-react';

interface HistoricalDatabaseProps {
  onJumpToEvent: (event: HistoricalEvent) => void;
  onSelectNakshatraByName?: (nakshatraName: string) => void;
}

export const HistoricalDatabase: React.FC<HistoricalDatabaseProps> = ({
  onJumpToEvent,
  onSelectNakshatraByName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredEvents = HISTORICAL_EVENTS.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.nakshatra.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.astrologicalSignificance.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.year.toString().includes(searchQuery);

    const matchesEra = selectedEra === 'all' || evt.era === selectedEra;
    const matchesCat = selectedCategory === 'all' || evt.category === selectedCategory;

    return matchesSearch && matchesEra && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="p-5 rounded-2xl bg-gray-900/70 border border-gray-800 space-y-4">
        <div>
          <h3 className="text-lg font-bold font-cinzel text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            Historical Astrological Database
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Chronicle of pivotal celestial conjunctions, Vedic astronomical passages, supernovae, and grand planetary assemblies across human history. Click any event to transport the interactive sky map to that exact historical moment.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by event, planet, Nakshatra, or year (e.g., 2020, Rohini, Conjunction)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-950/80 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Era filter */}
          <div className="flex items-center gap-1 p-1 bg-gray-950 rounded-lg border border-gray-800/80 text-xs">
            <span className="text-[11px] text-slate-400 px-2">Era:</span>
            {['all', 'modern', 'classical', 'ancient', 'upcoming'].map((era) => (
              <button
                key={era}
                onClick={() => setSelectedEra(era)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  selectedEra === era
                    ? 'bg-amber-500 text-gray-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {era}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1 p-1 bg-gray-950 rounded-lg border border-gray-800/80 text-xs">
            <span className="text-[11px] text-slate-400 px-2">Type:</span>
            {['all', 'conjunction', 'eclipse', 'alignment', 'supernova', 'transit'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-gray-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Results */}
      <div className="space-y-4">
        <div className="text-xs text-slate-400 flex items-center justify-between px-1">
          <span>Found {filteredEvents.length} historical events</span>
        </div>

        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-gray-700/80 transition-all space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-slate-100">
                    {evt.sanskritTitle ? `${evt.sanskritTitle} (${evt.title})` : evt.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1 text-slate-300 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {evt.date}
                  </span>
                  <span>·</span>
                  <span className="capitalize">{evt.era}</span>
                  <span>·</span>
                  <span className="text-indigo-300">नक्षत्र (Nakshatra): {evt.nakshatra}</span>
                </div>
              </div>

              {/* Jump to Starmap Button */}
              <button
                onClick={() => onJumpToEvent(evt)}
                className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
              >
                <Crosshair className="w-3.5 h-3.5" />
                आकाश में देखें (View in Sky Map)
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {evt.summary}
            </p>

            <div className="p-3 rounded-xl bg-gray-950/70 border border-gray-800/80">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                ज्योतिषीय एवं कर्म प्रभाव (Astrological & Karmic Significance)
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                {evt.astrologicalSignificance}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span className="capitalize">Category: {evt.category}</span>
                {evt.coordinates?.targetPlanet && (
                  <span>Focal Body: {evt.coordinates.targetPlanet}</span>
                )}
              </div>

              {onSelectNakshatraByName && (
                <button
                  onClick={() => onSelectNakshatraByName(evt.nakshatra.split('&')[0].trim())}
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Explore {evt.nakshatra.split('&')[0].trim()} →
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No historical events match your current search and filters.
          </div>
        )}
      </div>
    </div>
  );
};
