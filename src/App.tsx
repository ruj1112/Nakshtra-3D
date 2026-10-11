/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { SkyCanvas } from './components/SkyCanvas';
import { NakshatraDetailModal } from './components/NakshatraDetailModal';
import { PlanetaryPanel } from './components/PlanetaryPanel';
import { TransitNotifications } from './components/TransitNotifications';
import { HistoricalDatabase } from './components/HistoricalDatabase';
import { NakshatrasDirectory } from './components/NakshatrasDirectory';
import { TimeController } from './components/TimeController';
import { LocationSelector, POPULAR_LOCATIONS } from './components/LocationSelector';
import { UserLocation, HistoricalEvent, PlanetPosition } from './types/astronomy';
import { calculateAllPlanets } from './utils/astronomyCalculations';
import { NAKSHATRAS } from './data/nakshatrasData';
import { useLanguage } from './context/LanguageContext';
import {
  Compass,
  Moon,
  Sparkles,
  Layers,
  History,
  Bell,
  MapPin,
  Eye,
  Settings,
  Settings2,
  Calendar,
  X,
  Share2,
  Camera,
  Globe,
} from 'lucide-react';

export default function App() {
  const { t } = useLanguage();
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'sky' | 'nakshatras' | 'planets' | 'transits' | 'history'>('sky');

  // Perspective View mode: 'sky' (Observer Dome), 'ar' (Camera Horizon), 'globe' (3D Earth Sphere Projection)
  const [perspective, setPerspective] = useState<'sky' | 'ar' | 'globe'>('sky');

  // Celestial time & observer location
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState<boolean>(true);
  const [location, setLocation] = useState<UserLocation>(POPULAR_LOCATIONS[0]); // Ujjain by default
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  // Selection states
  const [selectedNakshatraId, setSelectedNakshatraId] = useState<number | null>(null);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);

  // View & Layer display preferences
  const [nightMode, setNightMode] = useState<boolean>(false);
  const [showConstellationLines, setShowConstellationLines] = useState<boolean>(true);
  const [showStarLabels, setShowStarLabels] = useState<boolean>(true);
  const [showPlanets, setShowPlanets] = useState<boolean>(true);
  const [showHorizon, setShowHorizon] = useState<boolean>(true);
  const [showEcliptic, setShowEcliptic] = useState<boolean>(true);
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState<boolean>(false);
  const [isArActive, setIsArActive] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Live timer interval to advance time in real-time when isLive is true
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Real-time planetary positions calculation
  const planets: PlanetPosition[] = useMemo(() => {
    return calculateAllPlanets(currentDate, location.latitude, location.longitude);
  }, [currentDate, location]);

  // Jump from Historical Database to Sky Map
  const handleJumpToHistoricalEvent = (event: HistoricalEvent) => {
    const targetDate = new Date(event.isoDate);
    setCurrentDate(targetDate);
    setIsLive(false);

    if (event.nakshatraId) {
      setSelectedNakshatraId(event.nakshatraId);
    }
    if (event.coordinates?.targetPlanet) {
      const match = planets.find(
        (p) => p.name.toLowerCase() === event.coordinates?.targetPlanet?.toLowerCase()
      );
      if (match) setSelectedPlanetId(match.id);
    }

    setActiveTab('sky');
  };

  const handleSelectNakshatraByName = (name: string) => {
    const found = NAKSHATRAS.find((n) => n.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setSelectedNakshatraId(found.id);
    }
  };

  const currentMoon = planets.find((p) => p.id === 'moon');
  const currentMoonNakshatra = currentMoon
    ? NAKSHATRAS.find((n) => n.id === currentMoon.nakshatraId)
    : null;

  return (
    <div
      className={`relative w-screen h-screen flex flex-col overflow-hidden bg-gray-950 text-slate-100 ${
        nightMode ? 'night-mode' : ''
      }`}
    >
      {/* Top Application Bar */}
      <header className="shrink-0 h-14 bg-gray-950/85 backdrop-blur-md border-b border-gray-800/80 px-3 sm:px-5 flex items-center justify-between z-30">
        {/* Brand & Emblem */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold font-cinzel tracking-wider text-amber-400">
              {t('appName')}
            </h1>
            <p className="text-[10px] text-slate-400 hidden sm:block font-mono">
              {t('appSubtitle')}
            </p>
          </div>
        </div>

        {/* Current Moon Ticker (Desktop) */}
        {currentMoonNakshatra && (
          <div
            onClick={() => {
              setSelectedNakshatraId(currentMoonNakshatra.id);
              setSelectedPlanetId('moon');
            }}
            className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900/90 border border-gray-800 text-xs cursor-pointer hover:border-indigo-500/50 transition-colors"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-slate-400">{t('moon')} :</span>
            <span className="font-semibold text-amber-300">
              {currentMoonNakshatra.sanskrit} ({currentMoonNakshatra.name})
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {t('pada')} {currentMoon?.pada} · {currentMoon?.rashi}
            </span>
          </div>
        )}

        {/* Header Action Badges & Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 3-Way Perspective Selector in Header */}
          {activeTab === 'sky' && (
            <div className="flex items-center bg-gray-900/90 rounded-lg p-0.5 border border-gray-800 text-xs shadow-inner">
              <button
                onClick={() => setPerspective('sky')}
                className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  perspective === 'sky'
                    ? 'bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={t('perspectiveSkyDesc')}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t('perspectiveSky')}</span>
              </button>
              <button
                onClick={() => setPerspective('ar')}
                className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  perspective === 'ar'
                    ? 'bg-sky-500/30 text-sky-200 font-bold border border-sky-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={t('perspectiveARDesc')}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t('perspectiveAR')}</span>
              </button>
              <button
                onClick={() => setPerspective('globe')}
                className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  perspective === 'globe'
                    ? 'bg-emerald-500/30 text-emerald-200 font-bold border border-emerald-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={t('perspectiveGlobeDesc')}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t('perspectiveGlobe')}</span>
              </button>
            </div>
          )}

          {/* Location button */}
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-900/80 border border-gray-800 text-xs text-slate-300 hover:text-white hover:border-gray-700 transition-colors"
            title={t('changeLocation')}
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span className="max-w-[110px] sm:max-w-[140px] truncate font-medium">
              {location.name.split('(')[0].trim()}
            </span>
          </button>

          {/* Night Vision Mode Toggle */}
          <button
            onClick={() => setNightMode(!nightMode)}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              nightMode
                ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                : 'bg-gray-900/80 border-gray-800 text-slate-300 hover:text-amber-400 hover:border-gray-700'
            }`}
            title={nightMode ? t('nightVisionDisable') : t('nightVisionEnable')}
            aria-label="Toggle Night Vision"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Sky Layer Visibility Settings */}
          {activeTab === 'sky' && (
            <div className="relative">
              <button
                onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
                className={`p-2 rounded-lg border text-xs transition-colors ${
                  isLayersMenuOpen
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-gray-900/80 border-gray-800 text-slate-300 hover:text-amber-400 hover:border-gray-700'
                }`}
                title={t('displayLayers')}
                aria-label="Starmap Layers"
              >
                <Layers className="w-4 h-4" />
              </button>

              {isLayersMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-gray-950 border border-gray-800 rounded-xl shadow-2xl z-50 space-y-2 text-xs">
                  <div className="font-semibold text-slate-300 pb-1 border-b border-gray-800 flex items-center justify-between">
                    <span>{t('displayLayers')}</span>
                    <button
                      onClick={() => setIsLayersMenuOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">{t('nakshatraShapes')}</span>
                    <input
                      type="checkbox"
                      checked={showConstellationLines}
                      onChange={(e) => setShowConstellationLines(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">{t('starLabels')}</span>
                    <input
                      type="checkbox"
                      checked={showStarLabels}
                      onChange={(e) => setShowStarLabels(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">{t('planetsNavagrahas')}</span>
                    <input
                      type="checkbox"
                      checked={showPlanets}
                      onChange={(e) => setShowPlanets(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">{t('horizonCompass')}</span>
                    <input
                      type="checkbox"
                      checked={showHorizon}
                      onChange={(e) => setShowHorizon(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">{t('eclipticPath')}</span>
                    <input
                      type="checkbox"
                      checked={showEcliptic}
                      onChange={(e) => setShowEcliptic(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Map Alignment & Settings Button */}
          {activeTab === 'sky' && (
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2 rounded-lg border text-xs transition-colors ${
                isSettingsOpen
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                  : 'bg-gray-900/80 border-gray-800 text-slate-300 hover:text-amber-400 hover:border-gray-700'
              }`}
              title={t('mapSettings')}
              aria-label="Map Alignment & Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main View Area */}
      <main className="relative flex-1 w-full h-[calc(100vh-3.5rem-4rem)] overflow-hidden">
        {/* Sky View */}
        {activeTab === 'sky' && (
          <div className="relative w-full h-full">
            <SkyCanvas
              currentDate={currentDate}
              latitude={location.latitude}
              longitude={location.longitude}
              planets={planets}
              selectedNakshatraId={selectedNakshatraId}
              onSelectNakshatra={(id) => setSelectedNakshatraId(id)}
              selectedPlanetId={selectedPlanetId}
              onSelectPlanet={(id) => setSelectedPlanetId(id)}
              nightMode={nightMode}
              showConstellationLines={showConstellationLines}
              showStarLabels={showStarLabels}
              showPlanets={showPlanets}
              showHorizon={showHorizon}
              showEcliptic={showEcliptic}
              perspective={perspective}
              onPerspectiveChange={setPerspective}
              onArStateChange={setIsArActive}
              isSettingsOpen={isSettingsOpen}
              onToggleSettings={() => setIsSettingsOpen((prev) => !prev)}
            />

            {/* Bottom floating Time Controller */}
            <div className="absolute bottom-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-20 max-w-xl">
              <TimeController
                currentDate={currentDate}
                onChangeDate={setCurrentDate}
                isLive={isLive}
                onToggleLive={setIsLive}
              />
            </div>
          </div>
        )}

        {/* Nakshatras Directory Tab */}
        {activeTab === 'nakshatras' && (
          <div className="w-full h-full overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto pb-20">
            <div className="mb-4">
              <h2 className="text-xl font-bold font-cinzel text-amber-400">
                {t('nakshatrasDirectoryTitle')}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {t('nakshatrasDirectorySub')}
              </p>
            </div>
            <NakshatrasDirectory
              selectedNakshatraId={selectedNakshatraId}
              onSelectNakshatra={(id) => setSelectedNakshatraId(id)}
              onFocusInSky={(id) => {
                setSelectedNakshatraId(id);
                setActiveTab('sky');
              }}
            />
          </div>
        )}

        {/* Planets (Navagrahas) Tab */}
        {activeTab === 'planets' && (
          <div className="w-full h-full overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto pb-20">
            <div className="mb-4">
              <h2 className="text-xl font-bold font-cinzel text-amber-400">
                {t('planetsTitle')}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {t('planetsSub')}
              </p>
            </div>
            <PlanetaryPanel
              planets={planets}
              selectedPlanetId={selectedPlanetId}
              onSelectPlanet={(id) => {
                setSelectedPlanetId(id);
                setActiveTab('sky');
              }}
              onSelectNakshatra={(id) => setSelectedNakshatraId(id)}
            />
          </div>
        )}

        {/* Transit Push Notifications Tab */}
        {activeTab === 'transits' && (
          <div className="w-full h-full overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto pb-20">
            <div className="mb-4">
              <h2 className="text-xl font-bold font-cinzel text-amber-400">
                {t('transitsTitle')}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {t('transitsSub')}
              </p>
            </div>
            <TransitNotifications
              currentDate={currentDate}
              planets={planets}
              onSelectNakshatraByName={(name) => {
                handleSelectNakshatraByName(name);
                setActiveTab('sky');
              }}
            />
          </div>
        )}

        {/* Historical Astrological Database Tab */}
        {activeTab === 'history' && (
          <div className="w-full h-full overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto pb-20">
            <div className="mb-4">
              <h2 className="text-xl font-bold font-cinzel text-amber-400">
                {t('historyTitle')}
              </h2>
            </div>
            <HistoricalDatabase
              onJumpToEvent={handleJumpToHistoricalEvent}
              onSelectNakshatraByName={(name) => {
                handleSelectNakshatraByName(name);
                setActiveTab('nakshatras');
              }}
            />
          </div>
        )}
      </main>

      {/* Selected Nakshatra Detail Modal / Sheet */}
      <NakshatraDetailModal
        nakshatraId={selectedNakshatraId}
        onClose={() => setSelectedNakshatraId(null)}
        onFocusInSky={(id) => {
          setSelectedNakshatraId(id);
          setActiveTab('sky');
        }}
      />

      {/* Location Selection Modal */}
      <LocationSelector
        currentLocation={location}
        onSelectLocation={setLocation}
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

      {/* Bottom Cross-Platform Navigation Bar */}
      <nav className="shrink-0 h-16 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/80 px-2 flex items-center justify-around z-30">
        <button
          onClick={() => setActiveTab('sky')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'sky'
              ? 'text-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[11px]">{t('tabSky')}</span>
        </button>

        <button
          onClick={() => setActiveTab('nakshatras')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'nakshatras'
              ? 'text-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[11px]">{t('tabNakshatras')}</span>
        </button>

        <button
          onClick={() => setActiveTab('planets')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'planets'
              ? 'text-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Moon className="w-5 h-5" />
          <span className="text-[11px]">{t('tabPlanets')}</span>
        </button>

        <button
          onClick={() => setActiveTab('transits')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'transits'
              ? 'text-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-5 h-5" />
          <span className="text-[11px]">{t('tabTransits')}</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'history'
              ? 'text-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[11px]">{t('tabHistory')}</span>
        </button>
      </nav>
    </div>
  );
}
