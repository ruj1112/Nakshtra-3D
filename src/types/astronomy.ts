export interface CelestialPoint {
  ra: number; // Right Ascension in degrees (0 to 360)
  dec: number; // Declination in degrees (-90 to +90)
  name?: string;
  mag?: number; // Visual magnitude (lower = brighter)
  spectralType?: string; // O, B, A, F, G, K, M
}

export interface StarPoint extends CelestialPoint {
  id: string;
  bayerDesignation?: string;
  properName?: string;
}

export interface NakshatraShape {
  stars: StarPoint[]; // Coordinate points of the stars in the Nakshatra
  lines: [number, number][]; // Index pairs connecting stars to form the traditional shape
}

export interface NakshatraData {
  id: number; // 1 to 27
  name: string;
  sanskrit: string;
  symbol: string;
  symbolIcon: string;
  deity: string;
  grahaLord: string;
  rashiSpan: string; // e.g., "Aries 00°00' - 13°20'"
  startDeg: number; // Sidereal degree start (0 to 360)
  endDeg: number; // Sidereal degree end (0 to 360)
  yogatara: string; // Principal junction star name (e.g. "Hamal / Alpha Arietis")
  yogataraCoords: { ra: number; dec: number };
  padas: Array<{
    number: number;
    navamsha: string;
    syllable: string;
  }>;
  element: string; // Fire, Earth, Air, Water
  gana: 'Deva' | 'Manushya' | 'Rakshasa';
  qualities: string;
  mythology: string;
  shape: NakshatraShape;
}

export interface PlanetPosition {
  id: string;
  name: string; // "सूर्य (Sun)"
  devanagariName: string; // "सूर्य"
  englishName: string; // "Sun"
  sanskritName: string;
  symbol: string;
  color: string;
  ra: number; // Equatorial Right Ascension (deg)
  dec: number; // Equatorial Declination (deg)
  alt: number; // Altitude in degrees (-90 to +90)
  az: number; // Azimuth in degrees (0 to 360, 0=North, 90=East)
  siderealLongitude: number; // Nirayana ecliptic longitude (0 to 360)
  nakshatraId: number;
  nakshatraName: string;
  nakshatraSanskrit: string;
  pada: number;
  rashi: string;
  rashiDeg: number;
  isRetrograde: boolean;
  distanceAU?: number;
  phase?: number; // 0 to 1 for Moon
}

export interface TransitNotification {
  id: string;
  title: string;
  body: string;
  eventTime: string; // ISO date string or timestamp
  type: 'moon_ingress' | 'planet_ingress' | 'eclipse' | 'conjunction' | 'retrograde';
  planet: string;
  targetNakshatra?: string;
  significance: string;
  isRead: boolean;
  scheduledTime: number;
}

export interface HistoricalEvent {
  id: string;
  title: string;
  sanskritTitle?: string;
  date: string; // Display date string e.g. "Dec 21, 2020"
  year: number;
  era: 'ancient' | 'classical' | 'modern' | 'upcoming';
  category: 'conjunction' | 'eclipse' | 'alignment' | 'supernova' | 'transit';
  nakshatra: string;
  nakshatraId?: number;
  summary: string;
  astrologicalSignificance: string;
  coordinates?: {
    ra: number;
    dec: number;
    targetPlanet?: string;
  };
  isoDate: string; // for instant time machine jumping
}

export interface UserLocation {
  name: string;
  latitude: number;
  longitude: number;
}
