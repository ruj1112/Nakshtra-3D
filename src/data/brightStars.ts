import { CelestialPoint } from '../types/astronomy';

export interface MajorStar extends CelestialPoint {
  id: string;
  constellation: string;
}

// Major bright navigational and reference stars in the celestial sphere
export const BRIGHT_STARS: MajorStar[] = [
  { id: 'sirius', name: 'Sirius', ra: 101.29, dec: -16.72, mag: -1.46, spectralType: 'A', constellation: 'Canis Major' },
  { id: 'canopus', name: 'Canopus', ra: 95.99, dec: -52.70, mag: -0.74, spectralType: 'F', constellation: 'Carina' },
  { id: 'rigel_kent', name: 'Alpha Centauri', ra: 219.90, dec: -60.83, mag: -0.27, spectralType: 'G', constellation: 'Centaurus' },
  { id: 'arcturus', name: 'Arcturus', ra: 213.92, dec: 19.18, mag: -0.05, spectralType: 'K', constellation: 'Boötes' },
  { id: 'vega', name: 'Vega', ra: 279.23, dec: 38.78, mag: 0.03, spectralType: 'A', constellation: 'Lyra' },
  { id: 'capella', name: 'Capella', ra: 79.17, dec: 46.00, mag: 0.08, spectralType: 'G', constellation: 'Auriga' },
  { id: 'rigel', name: 'Rigel', ra: 78.63, dec: -8.20, mag: 0.13, spectralType: 'B', constellation: 'Orion' },
  { id: 'procyon', name: 'Procyon', ra: 114.83, dec: 5.22, mag: 0.38, spectralType: 'F', constellation: 'Canis Minor' },
  { id: 'achernar', name: 'Achernar', ra: 24.43, dec: -57.24, mag: 0.46, spectralType: 'B', constellation: 'Eridanus' },
  { id: 'betelgeuse', name: 'Betelgeuse', ra: 88.79, dec: 7.41, mag: 0.50, spectralType: 'M', constellation: 'Orion' },
  { id: 'hadar', name: 'Hadar (Beta Centauri)', ra: 210.96, dec: -60.37, mag: 0.61, spectralType: 'B', constellation: 'Centaurus' },
  { id: 'altair', name: 'Altair', ra: 297.70, dec: 8.87, mag: 0.77, spectralType: 'A', constellation: 'Aquila' },
  { id: 'acrux', name: 'Acrux', ra: 186.65, dec: -63.10, mag: 0.76, spectralType: 'B', constellation: 'Crux' },
  { id: 'aldebaran', name: 'Aldebaran', ra: 68.98, dec: 16.51, mag: 0.85, spectralType: 'K', constellation: 'Taurus' },
  { id: 'antares', name: 'Antares', ra: 247.35, dec: -26.43, mag: 0.96, spectralType: 'M', constellation: 'Scorpius' },
  { id: 'spica', name: 'Spica', ra: 201.30, dec: -11.16, mag: 0.98, spectralType: 'B', constellation: 'Virgo' },
  { id: 'pollux', name: 'Pollux', ra: 116.33, dec: 28.03, mag: 1.16, spectralType: 'K', constellation: 'Gemini' },
  { id: 'fomalhaut', name: 'Fomalhaut', ra: 344.41, dec: -29.62, mag: 1.16, spectralType: 'A', constellation: 'Piscis Austrinus' },
  { id: 'deneb', name: 'Deneb', ra: 310.36, dec: 45.28, mag: 1.25, spectralType: 'A', constellation: 'Cygnus' },
  { id: 'mimosa', name: 'Mimosa (Beta Crucis)', ra: 191.93, dec: -59.69, mag: 1.25, spectralType: 'B', constellation: 'Crux' },
  { id: 'regulus', name: 'Regulus', ra: 152.09, dec: 11.97, mag: 1.36, spectralType: 'B', constellation: 'Leo' },
  { id: 'adhara', name: 'Adhara', ra: 104.66, dec: -28.97, mag: 1.50, spectralType: 'B', constellation: 'Canis Major' },
  { id: 'castor', name: 'Castor', ra: 113.65, dec: 31.89, mag: 1.58, spectralType: 'A', constellation: 'Gemini' },
  { id: 'shaula', name: 'Shaula', ra: 263.40, dec: -37.10, mag: 1.62, spectralType: 'B', constellation: 'Scorpius' },
  { id: 'bellatrix', name: 'Bellatrix', ra: 81.28, dec: 6.35, mag: 1.64, spectralType: 'B', constellation: 'Orion' },
  { id: 'alnath', name: 'Elnath', ra: 81.57, dec: 28.61, mag: 1.65, spectralType: 'B', constellation: 'Taurus' },
  { id: 'miaplacidus', name: 'Miaplacidus', ra: 138.30, dec: -69.72, mag: 1.68, spectralType: 'A', constellation: 'Carina' },
  { id: 'alnilam', name: 'Alnilam', ra: 84.05, dec: -1.20, mag: 1.69, spectralType: 'B', constellation: 'Orion' },
  { id: 'alnaitak', name: 'Alnitak', ra: 85.19, dec: -1.94, mag: 1.77, spectralType: 'O', constellation: 'Orion' },
  { id: 'alioth', name: 'Alioth', ra: 193.51, dec: 55.96, mag: 1.77, spectralType: 'A', constellation: 'Ursa Major' },
  { id: 'dubhe', name: 'Dubhe', ra: 165.93, dec: 61.75, mag: 1.79, spectralType: 'K', constellation: 'Ursa Major' },
  { id: 'mirfak', name: 'Mirfak', ra: 51.08, dec: 49.86, mag: 1.80, spectralType: 'F', constellation: 'Perseus' },
  { id: 'polaris', name: 'Polaris (Dhruva Star)', ra: 37.95, dec: 89.26, mag: 1.98, spectralType: 'F', constellation: 'Ursa Minor' },
  { id: 'kochab', name: 'Kochab', ra: 222.68, dec: 74.16, mag: 2.08, spectralType: 'K', constellation: 'Ursa Minor' },
  { id: 'merak', name: 'Merak', ra: 165.46, dec: 56.38, mag: 2.37, spectralType: 'A', constellation: 'Ursa Major' },
  { id: 'phecda', name: 'Phecda', ra: 178.46, dec: 53.69, mag: 2.44, spectralType: 'A', constellation: 'Ursa Major' },
  { id: 'megrez', name: 'Megrez', ra: 183.86, dec: 57.03, mag: 3.31, spectralType: 'A', constellation: 'Ursa Major' },
  { id: 'mizar', name: 'Mizar', ra: 200.98, dec: 54.92, mag: 2.23, spectralType: 'A', constellation: 'Ursa Major' },
  { id: 'alkaid', name: 'Alkaid', ra: 206.89, dec: 49.31, mag: 1.86, spectralType: 'B', constellation: 'Ursa Major' },
];

// Curated grid of background field stars to fill the celestial sphere (pseudo-random with deterministic seed)
export function generateBackgroundStars(count: number = 320): CelestialPoint[] {
  const stars: CelestialPoint[] = [];
  let seed = 42;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const spectralTypes = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];

  for (let i = 0; i < count; i++) {
    const ra = pseudoRandom() * 360;
    // Area-preserving distribution for sphere
    const u = pseudoRandom() * 2 - 1;
    const dec = Math.asin(u) * (180 / Math.PI);
    const mag = 3.2 + pseudoRandom() * 2.8;
    const specIndex = Math.floor(pseudoRandom() * spectralTypes.length);

    stars.push({
      ra,
      dec,
      mag,
      spectralType: spectralTypes[specIndex],
    });
  }

  return stars;
}
