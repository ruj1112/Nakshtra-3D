import React, { useState } from 'react';
import { UserLocation } from '../types/astronomy';
import { MapPin, Navigation, Check, Globe } from 'lucide-react';

export const POPULAR_LOCATIONS: UserLocation[] = [
  { name: 'उज्जैन (Ujjain - Zero Meridian of Ancient Astronomy)', latitude: 23.1765, longitude: 75.7885 },
  { name: 'वाराणसी (Varanasi - Kashi Observatories)', latitude: 25.3176, longitude: 82.9739 },
  { name: 'नई दिल्ली (New Delhi - Jantar Mantar)', latitude: 28.6139, longitude: 77.209 },
  { name: 'ग्रीनविच (Greenwich - Royal Observatory)', latitude: 51.4826, longitude: 0.0077 },
  { name: 'काहिरा (Cairo - Giza / Heliopolis)', latitude: 29.9792, longitude: 31.1342 },
  { name: 'टोक्यो (Tokyo - National Observatory)', latitude: 35.6762, longitude: 139.6503 },
  { name: 'न्यूयॉर्क (New York - Hayden Planetarium)', latitude: 40.7128, longitude: -74.006 },
  { name: 'सैन फ्रांसिस्को (San Francisco)', latitude: 37.7749, longitude: -122.4194 },
  { name: 'सिडनी (Sydney - Sydney Observatory)', latitude: -33.8688, longitude: 151.2093 },
];

interface LocationSelectorProps {
  currentLocation: UserLocation;
  onSelectLocation: (loc: UserLocation) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  currentLocation,
  onSelectLocation,
  isOpen,
  onClose,
}) => {
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        onSelectLocation({
          name: 'My Current Location (GPS)',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        onClose();
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.message || 'Unable to retrieve location');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-sm sm:text-base">
              स्थान चुनें (Select Observing Location)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-xs px-2 py-1 rounded hover:bg-gray-800"
          >
            बंद करें (Close)
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Use GPS Button */}
          <button
            onClick={handleUseGPS}
            disabled={gpsLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            <Navigation className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
            {gpsLoading ? 'जीपीएस पता लगा रहे हैं...' : 'वर्तमान जीपीएस स्थान (Use Current Device GPS)'}
          </button>

          {gpsError && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg">
              {gpsError}
            </div>
          )}

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              विश्व एवं प्राचीन वेधशालाएं (Observatories)
            </span>
            <div className="space-y-1.5">
              {POPULAR_LOCATIONS.map((loc) => {
                const isSelected =
                  Math.abs(currentLocation.latitude - loc.latitude) < 0.01 &&
                  Math.abs(currentLocation.longitude - loc.longitude) < 0.01;

                return (
                  <button
                    key={loc.name}
                    onClick={() => {
                      onSelectLocation(loc);
                      onClose();
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                        : 'bg-gray-900/50 border-gray-800 text-slate-300 hover:bg-gray-900 hover:border-gray-700'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{loc.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {loc.latitude.toFixed(2)}° N, {loc.longitude.toFixed(2)}° E
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
