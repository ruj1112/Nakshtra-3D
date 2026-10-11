import { PlanetPosition } from '../types/astronomy';
import { NAKSHATRAS } from '../data/nakshatrasData';

export const RASHI_NAMES = [
  'मेष (Aries)',
  'वृषभ (Taurus)',
  'मिथुन (Gemini)',
  'कर्क (Cancer)',
  'सिंह (Leo)',
  'कन्या (Virgo)',
  'तुला (Libra)',
  'वृश्चिक (Scorpio)',
  'धनु (Sagittarius)',
  'मकर (Capricorn)',
  'कुम्भ (Aquarius)',
  'मीन (Pisces)',
];

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function normalizeDegrees(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

export function getJulianDate(date: Date): number {
  const time = date.getTime();
  return time / 86400000 + 2440587.5;
}

export function getJulianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

// Lahiri / Chitra Paksha Ayanamsha in degrees
export function getLahiriAyanamsha(t: number): number {
  // Epoch 2000.0 is approx 23.856 degrees, precession rate ~50.29 arcseconds/year
  return 23.856 + t * 1.3968878;
}

// Greenwich Mean Sidereal Time (in degrees)
export function getGMST(jd: number, t: number): number {
  const d = jd - 2451545.0;
  let gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38710000;
  return normalizeDegrees(gmst);
}

// Local Sidereal Time (in degrees)
export function getLST(jd: number, t: number, longitude: number): number {
  const gmst = getGMST(jd, t);
  return normalizeDegrees(gmst + longitude);
}

// Convert Right Ascension & Declination to Altitude & Azimuth
export function equatorialToHorizontal(
  ra: number, // degrees
  dec: number, // degrees
  lat: number, // degrees
  lst: number // degrees
): { alt: number; az: number } {
  const ha = normalizeDegrees(lst - ra) * DEG_TO_RAD;
  const decRad = dec * DEG_TO_RAD;
  const latRad = lat * DEG_TO_RAD;

  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(ha);
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const alt = altRad * RAD_TO_DEG;

  const cosAlt = Math.cos(altRad);
  let az = 0;
  if (cosAlt > 1e-6) {
    const sinAz = (-Math.cos(decRad) * Math.sin(ha)) / cosAlt;
    const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * cosAlt);
    az = normalizeDegrees(Math.atan2(sinAz, cosAz) * RAD_TO_DEG);
  }

  return { alt, az };
}

// Convert Ecliptic coordinates to Equatorial
export function eclipticToEquatorial(
  l: number, // Ecliptic Longitude (deg)
  b: number, // Ecliptic Latitude (deg)
  eps: number // Obliquity of ecliptic (deg)
): { ra: number; dec: number } {
  const lRad = l * DEG_TO_RAD;
  const bRad = b * DEG_TO_RAD;
  const epsRad = eps * DEG_TO_RAD;

  const sinDec = Math.sin(bRad) * Math.cos(epsRad) + Math.cos(bRad) * Math.sin(epsRad) * Math.sin(lRad);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec))) * RAD_TO_DEG;

  const y = Math.sin(lRad) * Math.cos(epsRad) - Math.tan(bRad) * Math.sin(epsRad);
  const x = Math.cos(lRad);
  const ra = normalizeDegrees(Math.atan2(y, x) * RAD_TO_DEG);

  return { ra, dec };
}

// Convert sidereal longitude to Nakshatra and Pada
export function getSiderealNakshatra(siderealLon: number): {
  id: number;
  name: string;
  sanskrit: string;
  pada: number;
  rashi: string;
  rashiDeg: number;
} {
  const normLon = normalizeDegrees(siderealLon);
  const nakshatraSpan = 360 / 27; // 13.333333 deg
  const padaSpan = nakshatraSpan / 4; // 3.333333 deg

  const nakshatraIndex = Math.floor(normLon / nakshatraSpan);
  const nakshatra = NAKSHATRAS[nakshatraIndex] || NAKSHATRAS[0];
  const offset = normLon - nakshatraIndex * nakshatraSpan;
  const pada = Math.min(4, Math.floor(offset / padaSpan) + 1);

  const rashiIndex = Math.floor(normLon / 30);
  const rashi = RASHI_NAMES[rashiIndex] || RASHI_NAMES[0];
  const rashiDeg = normLon % 30;

  return {
    id: nakshatra.id,
    name: nakshatra.name,
    sanskrit: nakshatra.sanskrit,
    pada,
    rashi,
    rashiDeg,
  };
}

// Calculate Sun position
function calculateSun(jd: number, t: number, ayanamsha: number, eps: number) {
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const m = (357.52911 + 35999.05029 * t - 0.0001537 * t * t) * DEG_TO_RAD;
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m) +
    0.000289 * Math.sin(3 * m);
  const trueLon = normalizeDegrees(l0 + c);
  const siderealLon = normalizeDegrees(trueLon - ayanamsha);
  const eq = eclipticToEquatorial(trueLon, 0, eps);

  return {
    tropicalLon: trueLon,
    siderealLon,
    ra: eq.ra,
    dec: eq.dec,
    distanceAU: 1.00014 - 0.01671 * Math.cos(m),
  };
}

// Calculate Moon position with lunar perturbations
function calculateMoon(jd: number, t: number, ayanamsha: number, eps: number) {
  const lp = (218.3164477 + 481267.88128 * t) * DEG_TO_RAD;
  const d = (297.8501921 + 445267.11140 * t) * DEG_TO_RAD;
  const m = (357.5291092 + 35999.05029 * t) * DEG_TO_RAD;
  const mp = (134.9633964 + 477198.86751 * t) * DEG_TO_RAD;
  const f = (93.2720950 + 483202.01752 * t) * DEG_TO_RAD;

  // Major periodic terms in longitude (arcdegrees)
  let l =
    lp * RAD_TO_DEG +
    6.288774 * Math.sin(mp) +
    1.274027 * Math.sin(2 * d - mp) +
    0.658314 * Math.sin(2 * d) +
    0.213618 * Math.sin(2 * mp) -
    0.185116 * Math.sin(m) -
    0.114332 * Math.sin(2 * f);

  // Periodic terms in latitude
  let b =
    5.128122 * Math.sin(f) +
    0.280602 * Math.sin(mp + f) +
    0.277693 * Math.sin(mp - f) +
    0.173237 * Math.sin(2 * d - f);

  const tropicalLon = normalizeDegrees(l);
  const siderealLon = normalizeDegrees(tropicalLon - ayanamsha);
  const eq = eclipticToEquatorial(tropicalLon, b, eps);

  // Phase calculation (illumination fraction 0 to 1)
  const elongation = normalizeDegrees(d * RAD_TO_DEG);
  const phase = 0.5 * (1 - Math.cos(elongation * DEG_TO_RAD));

  return {
    tropicalLon,
    siderealLon,
    ra: eq.ra,
    dec: eq.dec,
    phase,
  };
}

// Planetary orbital elements calculation (simplified Keplerian model for accurate visual rendering)
interface PlanetKeplerElements {
  a: number; // semi-major axis (AU)
  e: number; // eccentricity
  i: number; // inclination (deg)
  l: number; // mean longitude (deg)
  w: number; // longitude of perihelion (deg)
  node: number; // longitude of ascending node (deg)
}

function solveKepler(mDeg: number, e: number): number {
  const m = normalizeDegrees(mDeg) * DEG_TO_RAD;
  let ea = m;
  for (let i = 0; i < 5; i++) {
    ea = ea - (ea - e * Math.sin(ea) - m) / (1 - e * Math.cos(ea));
  }
  return ea;
}

function getHeliocentricPosition(elem: PlanetKeplerElements, t: number) {
  const meanM = elem.l - elem.w;
  const ea = solveKepler(meanM, elem.e);

  // Heliocentric coordinates in orbital plane
  const xPrime = elem.a * (Math.cos(ea) - elem.e);
  const yPrime = elem.a * Math.sqrt(1 - elem.e * elem.e) * Math.sin(ea);

  const r = Math.sqrt(xPrime * xPrime + yPrime * yPrime);
  const v = Math.atan2(yPrime, xPrime);

  // Heliocentric coordinates in ecliptic frame
  const nodeRad = elem.node * DEG_TO_RAD;
  const iRad = elem.i * DEG_TO_RAD;
  const omegaRad = (elem.w - elem.node) * DEG_TO_RAD;
  const u = v + omegaRad;

  const xh = r * (Math.cos(nodeRad) * Math.cos(u) - Math.sin(nodeRad) * Math.sin(u) * Math.cos(iRad));
  const yh = r * (Math.sin(nodeRad) * Math.cos(u) + Math.cos(nodeRad) * Math.sin(u) * Math.cos(iRad));
  const zh = r * (Math.sin(u) * Math.sin(iRad));

  return { xh, yh, zh, r };
}

// Calculate geocentric position for Mercury, Venus, Mars, Jupiter, Saturn
function calculatePlanet(
  elem: PlanetKeplerElements,
  t: number,
  sunTropicalLon: number,
  sunR: number,
  ayanamsha: number,
  eps: number
) {
  const helio = getHeliocentricPosition(elem, t);

  // Earth's heliocentric coordinates (opposite of Sun geocentric)
  const earthSunRad = sunTropicalLon * DEG_TO_RAD;
  const xe = -sunR * Math.cos(earthSunRad);
  const ye = -sunR * Math.sin(earthSunRad);
  const ze = 0;

  // Geocentric coordinates
  const xg = helio.xh - xe;
  const yg = helio.yh - ye;
  const zg = helio.zh - ze;

  const dist = Math.sqrt(xg * xg + yg * yg + zg * zg);
  const lambda = normalizeDegrees(Math.atan2(yg, xg) * RAD_TO_DEG);
  const beta = Math.asin(zg / dist) * RAD_TO_DEG;

  const siderealLon = normalizeDegrees(lambda - ayanamsha);
  const eq = eclipticToEquatorial(lambda, beta, eps);

  return {
    tropicalLon: lambda,
    siderealLon,
    ra: eq.ra,
    dec: eq.dec,
    distanceAU: dist,
  };
}

// Calculate all 9 Vedic Grahas (Navagrahas)
export function calculateAllPlanets(date: Date, lat: number, lon: number): PlanetPosition[] {
  const jd = getJulianDate(date);
  const t = getJulianCenturies(jd);
  const ayanamsha = getLahiriAyanamsha(t);
  const lst = getLST(jd, t, lon);
  const eps = 23.439291 - 0.0130042 * t;

  // 1. Sun (Surya)
  const sun = calculateSun(jd, t, ayanamsha, eps);
  const sunHoriz = equatorialToHorizontal(sun.ra, sun.dec, lat, lst);
  const sunNakshatra = getSiderealNakshatra(sun.siderealLon);

  // 2. Moon (Chandra)
  const moon = calculateMoon(jd, t, ayanamsha, eps);
  const moonHoriz = equatorialToHorizontal(moon.ra, moon.dec, lat, lst);
  const moonNakshatra = getSiderealNakshatra(moon.siderealLon);

  // Kepler orbital elements at epoch T:
  const mercuryElem: PlanetKeplerElements = {
    a: 0.387098,
    e: 0.20563 + 0.000025 * t,
    i: 7.0049 + 0.0018 * t,
    l: normalizeDegrees(252.25084 + 149474.0722 * t),
    w: normalizeDegrees(77.45611 + 1.5564 * t),
    node: normalizeDegrees(48.33089 + 1.1862 * t),
  };

  const venusElem: PlanetKeplerElements = {
    a: 0.723332,
    e: 0.00677 - 0.000049 * t,
    i: 3.3946 + 0.0010 * t,
    l: normalizeDegrees(181.9798 + 58519.213 * t),
    w: normalizeDegrees(131.5637 + 1.4022 * t),
    node: normalizeDegrees(76.6799 + 0.9011 * t),
  };

  const marsElem: PlanetKeplerElements = {
    a: 1.523688,
    e: 0.09340 + 0.00009 * t,
    i: 1.8497 - 0.0006 * t,
    l: normalizeDegrees(355.433 + 19141.696 * t),
    w: normalizeDegrees(336.06 + 1.841 * t),
    node: normalizeDegrees(49.558 + 0.772 * t),
  };

  const jupiterElem: PlanetKeplerElements = {
    a: 5.2026,
    e: 0.04849 + 0.00016 * t,
    i: 1.303 - 0.00015 * t,
    l: normalizeDegrees(34.3515 + 3036.3027 * t),
    w: normalizeDegrees(14.3312 + 1.612 * t),
    node: normalizeDegrees(100.464 + 1.021 * t),
  };

  const saturnElem: PlanetKeplerElements = {
    a: 9.5549,
    e: 0.0555 - 0.00034 * t,
    i: 2.4889 - 0.00037 * t,
    l: normalizeDegrees(50.0774 + 1223.5098 * t),
    w: normalizeDegrees(93.057 + 1.963 * t),
    node: normalizeDegrees(113.665 + 0.877 * t),
  };

  const merc = calculatePlanet(mercuryElem, t, sun.tropicalLon, sun.distanceAU, ayanamsha, eps);
  const mercHoriz = equatorialToHorizontal(merc.ra, merc.dec, lat, lst);
  const mercNak = getSiderealNakshatra(merc.siderealLon);

  const ven = calculatePlanet(venusElem, t, sun.tropicalLon, sun.distanceAU, ayanamsha, eps);
  const venHoriz = equatorialToHorizontal(ven.ra, ven.dec, lat, lst);
  const venNak = getSiderealNakshatra(ven.siderealLon);

  const mar = calculatePlanet(marsElem, t, sun.tropicalLon, sun.distanceAU, ayanamsha, eps);
  const marHoriz = equatorialToHorizontal(mar.ra, mar.dec, lat, lst);
  const marNak = getSiderealNakshatra(mar.siderealLon);

  const jup = calculatePlanet(jupiterElem, t, sun.tropicalLon, sun.distanceAU, ayanamsha, eps);
  const jupHoriz = equatorialToHorizontal(jup.ra, jup.dec, lat, lst);
  const jupNak = getSiderealNakshatra(jup.siderealLon);

  const sat = calculatePlanet(saturnElem, t, sun.tropicalLon, sun.distanceAU, ayanamsha, eps);
  const satHoriz = equatorialToHorizontal(sat.ra, sat.dec, lat, lst);
  const satNak = getSiderealNakshatra(sat.siderealLon);

  // Rahu & Ketu (Ascending and Descending Lunar Nodes)
  const nodeLong = normalizeDegrees(125.04452 - 1934.136261 * t);
  const rahuSidereal = normalizeDegrees(nodeLong - ayanamsha);
  const ketuSidereal = normalizeDegrees(rahuSidereal + 180);

  const rahuEq = eclipticToEquatorial(nodeLong, 0, eps);
  const rahuHoriz = equatorialToHorizontal(rahuEq.ra, rahuEq.dec, lat, lst);
  const rahuNak = getSiderealNakshatra(rahuSidereal);

  const ketuEq = eclipticToEquatorial(normalizeDegrees(nodeLong + 180), 0, eps);
  const ketuHoriz = equatorialToHorizontal(ketuEq.ra, ketuEq.dec, lat, lst);
  const ketuNak = getSiderealNakshatra(ketuSidereal);

  return [
    {
      id: 'sun',
      name: 'सूर्य (Sun)',
      devanagariName: 'सूर्य',
      englishName: 'Sun',
      sanskritName: 'सूर्य (Surya)',
      symbol: '☉',
      color: '#F59E0B',
      ra: sun.ra,
      dec: sun.dec,
      alt: sunHoriz.alt,
      az: sunHoriz.az,
      siderealLongitude: sun.siderealLon,
      nakshatraId: sunNakshatra.id,
      nakshatraName: sunNakshatra.name,
      nakshatraSanskrit: sunNakshatra.sanskrit,
      pada: sunNakshatra.pada,
      rashi: sunNakshatra.rashi,
      rashiDeg: sunNakshatra.rashiDeg,
      isRetrograde: false,
      distanceAU: sun.distanceAU,
    },
    {
      id: 'moon',
      name: 'चन्द्र (Moon)',
      devanagariName: 'चन्द्र',
      englishName: 'Moon',
      sanskritName: 'चन्द्र (Chandra)',
      symbol: '☽',
      color: '#E0E7FF',
      ra: moon.ra,
      dec: moon.dec,
      alt: moonHoriz.alt,
      az: moonHoriz.az,
      siderealLongitude: moon.siderealLon,
      nakshatraId: moonNakshatra.id,
      nakshatraName: moonNakshatra.name,
      nakshatraSanskrit: moonNakshatra.sanskrit,
      pada: moonNakshatra.pada,
      rashi: moonNakshatra.rashi,
      rashiDeg: moonNakshatra.rashiDeg,
      isRetrograde: false,
      phase: moon.phase,
    },
    {
      id: 'mercury',
      name: 'बुध (Mercury)',
      devanagariName: 'बुध',
      englishName: 'Mercury',
      sanskritName: 'बुध (Budha)',
      symbol: '☿',
      color: '#10B981',
      ra: merc.ra,
      dec: merc.dec,
      alt: mercHoriz.alt,
      az: mercHoriz.az,
      siderealLongitude: merc.siderealLon,
      nakshatraId: mercNak.id,
      nakshatraName: mercNak.name,
      nakshatraSanskrit: mercNak.sanskrit,
      pada: mercNak.pada,
      rashi: mercNak.rashi,
      rashiDeg: mercNak.rashiDeg,
      isRetrograde: false,
      distanceAU: merc.distanceAU,
    },
    {
      id: 'venus',
      name: 'शुक्र (Venus)',
      devanagariName: 'शुक्र',
      englishName: 'Venus',
      sanskritName: 'शुक्र (Shukra)',
      symbol: '♀',
      color: '#EC4899',
      ra: ven.ra,
      dec: ven.dec,
      alt: venHoriz.alt,
      az: venHoriz.az,
      siderealLongitude: ven.siderealLon,
      nakshatraId: venNak.id,
      nakshatraName: venNak.name,
      nakshatraSanskrit: venNak.sanskrit,
      pada: venNak.pada,
      rashi: venNak.rashi,
      rashiDeg: venNak.rashiDeg,
      isRetrograde: false,
      distanceAU: ven.distanceAU,
    },
    {
      id: 'mars',
      name: 'मंगल (Mars)',
      devanagariName: 'मंगल',
      englishName: 'Mars',
      sanskritName: 'मंगल (Mangala)',
      symbol: '♂',
      color: '#EF4444',
      ra: mar.ra,
      dec: mar.dec,
      alt: marHoriz.alt,
      az: marHoriz.az,
      siderealLongitude: mar.siderealLon,
      nakshatraId: marNak.id,
      nakshatraName: marNak.name,
      nakshatraSanskrit: marNak.sanskrit,
      pada: marNak.pada,
      rashi: marNak.rashi,
      rashiDeg: marNak.rashiDeg,
      isRetrograde: false,
      distanceAU: mar.distanceAU,
    },
    {
      id: 'jupiter',
      name: 'बृहस्पति (Jupiter)',
      devanagariName: 'बृहस्पति',
      englishName: 'Jupiter',
      sanskritName: 'बृहस्पति (Guru)',
      symbol: '♃',
      color: '#FBBF24',
      ra: jup.ra,
      dec: jup.dec,
      alt: jupHoriz.alt,
      az: jupHoriz.az,
      siderealLongitude: jup.siderealLon,
      nakshatraId: jupNak.id,
      nakshatraName: jupNak.name,
      nakshatraSanskrit: jupNak.sanskrit,
      pada: jupNak.pada,
      rashi: jupNak.rashi,
      rashiDeg: jupNak.rashiDeg,
      isRetrograde: false,
      distanceAU: jup.distanceAU,
    },
    {
      id: 'saturn',
      name: 'शनि (Saturn)',
      devanagariName: 'शनि',
      englishName: 'Saturn',
      sanskritName: 'शनि (Shani)',
      symbol: '♄',
      color: '#6366F1',
      ra: sat.ra,
      dec: sat.dec,
      alt: satHoriz.alt,
      az: satHoriz.az,
      siderealLongitude: sat.siderealLon,
      nakshatraId: satNak.id,
      nakshatraName: satNak.name,
      nakshatraSanskrit: satNak.sanskrit,
      pada: satNak.pada,
      rashi: satNak.rashi,
      rashiDeg: satNak.rashiDeg,
      isRetrograde: false,
      distanceAU: sat.distanceAU,
    },
    {
      id: 'rahu',
      name: 'राहु (Rahu)',
      devanagariName: 'राहु',
      englishName: 'Rahu',
      sanskritName: 'राहु (North Node)',
      symbol: '☊',
      color: '#8B5CF6',
      ra: rahuEq.ra,
      dec: rahuEq.dec,
      alt: rahuHoriz.alt,
      az: rahuHoriz.az,
      siderealLongitude: rahuSidereal,
      nakshatraId: rahuNak.id,
      nakshatraName: rahuNak.name,
      nakshatraSanskrit: rahuNak.sanskrit,
      pada: rahuNak.pada,
      rashi: rahuNak.rashi,
      rashiDeg: rahuNak.rashiDeg,
      isRetrograde: true,
    },
    {
      id: 'ketu',
      name: 'केतु (Ketu)',
      devanagariName: 'केतु',
      englishName: 'Ketu',
      sanskritName: 'केतु (South Node)',
      symbol: '☋',
      color: '#A855F7',
      ra: ketuEq.ra,
      dec: ketuEq.dec,
      alt: ketuHoriz.alt,
      az: ketuHoriz.az,
      siderealLongitude: ketuSidereal,
      nakshatraId: ketuNak.id,
      nakshatraName: ketuNak.name,
      nakshatraSanskrit: ketuNak.sanskrit,
      pada: ketuNak.pada,
      rashi: ketuNak.rashi,
      rashiDeg: ketuNak.rashiDeg,
      isRetrograde: true,
    },
  ];
}
