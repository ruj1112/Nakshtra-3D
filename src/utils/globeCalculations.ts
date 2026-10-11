// Utility functions and datasets for 3D Earth Globe projection of celestial items
import { getGMST } from './astronomyCalculations';

export interface GlobePoint3D {
  x: number; // -1 to 1
  y: number; // -1 to 1
  z: number; // -1 to 1 (z > 0 faces viewer, z < 0 behind globe)
}

export interface ScreenPoint3D {
  x: number;
  y: number;
  z: number;
  visible: boolean;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Convert Geographic Latitude and Longitude (-90..90, -180..180 or 0..360) to 3D Unit Vector
 * X: along prime meridian / equator (or 90E)
 * Y: North pole (+1) to South pole (-1)
 * Z: 0° lon at equator
 */
export function latLonToUnitVector(latDeg: number, lonDeg: number): [number, number, number] {
  const phi = latDeg * DEG_TO_RAD;
  const lambda = lonDeg * DEG_TO_RAD;

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const x = cosPhi * Math.sin(lambda);
  const y = sinPhi;
  const z = cosPhi * Math.cos(lambda);

  return [x, y, z];
}

/**
 * Transform 3D point by rotating Earth so (centerLat, centerLon) is centered directly facing the viewer (Z = +1)
 */
export function rotateGlobePoint(
  point: [number, number, number],
  centerLatDeg: number,
  centerLonDeg: number
): GlobePoint3D {
  const [x0, y0, z0] = point;

  // 1. Yaw rotation around Y axis by -centerLonDeg
  const yawRad = -centerLonDeg * DEG_TO_RAD;
  const cosYaw = Math.cos(yawRad);
  const sinYaw = Math.sin(yawRad);

  const x1 = x0 * cosYaw + z0 * sinYaw;
  const y1 = y0;
  const z1 = -x0 * sinYaw + z0 * cosYaw;

  // 2. Pitch rotation around X axis by +centerLatDeg (tilt north/south)
  const pitchRad = centerLatDeg * DEG_TO_RAD;
  const cosPitch = Math.cos(pitchRad);
  const sinPitch = Math.sin(pitchRad);

  const x2 = x1;
  const y2 = y1 * cosPitch - z1 * sinPitch;
  const z2 = y1 * sinPitch + z1 * cosPitch;

  return { x: x2, y: y2, z: z2 };
}

/**
 * Project a 3D unit point onto 2D Canvas screen coordinates
 */
export function projectGlobePoint(
  p: GlobePoint3D,
  cx: number,
  cy: number,
  radius: number,
  altitudeScale: number = 1.0 // allows celestial items to hover slightly above Earth surface (e.g. 1.06)
): ScreenPoint3D {
  const r = radius * altitudeScale;
  const x = cx + p.x * r;
  const y = cy - p.y * r; // invert Y for screen coords
  const visible = p.z > -0.05; // slight tolerance around limb

  return { x, y, z: p.z, visible };
}

/**
 * Calculate Geographic Sub-point (Zenith) for a Celestial Body with Right Ascension and Declination
 * Latitude = Declination
 * Longitude = RA - GMST (normalized to -180..180)
 */
export function celestialToSubPoint(raDeg: number, decDeg: number, gmstDeg: number): { lat: number; lon: number } {
  let lon = (raDeg - gmstDeg) % 360;
  if (lon < 0) lon += 360;
  if (lon > 180) lon -= 360;

  const lat = Math.max(-90, Math.min(90, decDeg));
  return { lat, lon };
}

/**
 * Great Circle point generator between two points or along a direction
 */
export function getGreatCirclePoints(
  centerLat: number,
  centerLon: number,
  angularRadiusDeg: number = 90,
  steps: number = 72
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const cPhi = centerLat * DEG_TO_RAD;
  const cLam = centerLon * DEG_TO_RAD;
  const dRad = angularRadiusDeg * DEG_TO_RAD;

  const sinCPhi = Math.sin(cPhi);
  const cosCPhi = Math.cos(cPhi);
  const sinD = Math.sin(dRad);
  const cosD = Math.cos(dRad);

  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI;
    const sinLat = sinCPhi * cosD + cosCPhi * sinD * Math.cos(bearing);
    const lat = Math.asin(Math.max(-1, Math.min(1, sinLat))) * RAD_TO_DEG;

    const y = Math.sin(bearing) * sinD * cosCPhi;
    const x = cosD - sinCPhi * sinLat;
    const lon = ((cLam + Math.atan2(y, x)) * RAD_TO_DEG + 540) % 360 - 180;

    points.push([lat, lon]);
  }
  return points;
}

/**
 * Simplified world continent polygons (lat, lon pairs) for high-performance canvas globe rendering
 */
export const CONTINENT_POLYGONS: Array<Array<[number, number]>> = [
  // Indian Subcontinent & South Asia
  [
    [8.1, 77.5], [10.8, 79.8], [13.1, 80.3], [16.5, 82.2], [19.8, 85.8], [21.5, 87.0],
    [22.5, 89.5], [21.0, 92.2], [16.0, 94.5], [10.0, 98.5], [3.0, 101.5], [1.3, 103.8],
    [6.0, 102.5], [10.0, 104.5], [13.5, 100.5], [16.0, 108.0], [21.0, 108.0], [24.0, 90.0],
    [26.5, 88.0], [28.0, 84.0], [30.5, 79.0], [34.5, 76.5], [36.0, 74.0], [34.0, 71.0],
    [30.0, 67.0], [25.0, 62.0], [25.0, 67.0], [23.0, 68.5], [21.0, 70.0], [21.5, 72.8],
    [19.0, 72.8], [15.4, 73.8], [12.9, 74.8], [8.1, 77.5]
  ],
  // Eurasia (Europe + Northern Asia)
  [
    [36.0, -5.5], [43.5, -9.0], [48.0, -4.5], [51.0, 2.0], [54.0, 8.5], [57.5, 10.5],
    [59.0, 18.0], [60.0, 25.0], [70.0, 28.0], [70.0, 60.0], [73.0, 80.0], [76.0, 110.0],
    [70.0, 140.0], [66.0, 170.0], [60.0, 163.0], [53.0, 142.0], [45.0, 135.0], [40.0, 128.0],
    [35.0, 129.0], [32.0, 120.0], [22.0, 114.0], [21.5, 108.0], [25.0, 100.0], [30.0, 80.0],
    [35.0, 60.0], [38.0, 48.0], [36.0, 36.0], [41.0, 29.0], [38.0, 24.0], [37.0, 15.0],
    [41.0, 14.0], [44.0, 8.0], [42.0, 3.0], [36.0, -5.5]
  ],
  // Africa
  [
    [37.0, 10.0], [32.0, 32.0], [22.0, 37.0], [12.0, 44.0], [11.5, 51.0], [2.0, 45.0],
    [-5.0, 39.0], [-15.0, 40.5], [-26.0, 33.0], [-34.5, 20.0], [-34.0, 18.5], [-22.0, 14.0],
    [-5.0, 12.0], [4.5, 9.0], [5.0, 1.0], [4.5, -7.5], [10.0, -14.0], [14.5, -17.5],
    [21.0, -17.0], [28.0, -10.0], [34.0, -6.0], [36.0, -1.0], [37.0, 10.0]
  ],
  // North America
  [
    [25.0, -80.0], [30.0, -81.0], [35.0, -75.5], [41.0, -71.0], [45.0, -64.0], [47.0, -53.0],
    [55.0, -60.0], [62.0, -64.0], [70.0, -70.0], [72.0, -125.0], [65.0, -168.0], [58.0, -158.0],
    [54.0, -133.0], [48.0, -124.0], [34.0, -120.0], [30.0, -115.0], [23.0, -110.0], [18.0, -104.0],
    [15.0, -93.0], [16.0, -88.0], [21.5, -87.0], [22.0, -97.5], [26.0, -97.0], [29.0, -94.0],
    [29.0, -89.0], [25.0, -80.0]
  ],
  // South America
  [
    [11.5, -73.0], [10.5, -62.0], [6.0, -55.0], [0.0, -50.0], [-5.0, -35.0], [-13.0, -38.5],
    [-23.0, -42.0], [-34.0, -53.5], [-45.0, -66.0], [-55.0, -67.0], [-53.0, -74.0], [-42.0, -74.0],
    [-30.0, -71.5], [-18.0, -70.5], [-5.0, -81.0], [2.0, -77.5], [8.0, -77.0], [11.5, -73.0]
  ],
  // Australia
  [
    [-12.0, 136.0], [-15.0, 145.0], [-23.0, 151.0], [-33.5, 151.5], [-38.0, 145.0], [-37.5, 140.0],
    [-32.0, 132.0], [-34.5, 120.0], [-32.0, 115.5], [-22.0, 114.0], [-18.0, 122.0], [-14.0, 126.0],
    [-12.0, 136.0]
  ],
  // Sri Lanka
  [
    [9.5, 80.0], [8.5, 81.2], [6.0, 80.5], [7.0, 79.8], [9.5, 80.0]
  ],
  // Japan (Main island)
  [
    [41.0, 141.0], [36.0, 140.5], [34.0, 136.0], [33.5, 130.5], [35.5, 133.0], [38.0, 138.5], [41.0, 141.0]
  ],
  // Great Britain
  [
    [58.5, -3.5], [55.0, -1.5], [51.5, 1.3], [50.0, -5.2], [53.0, -4.5], [56.0, -5.5], [58.5, -3.5]
  ]
];

/**
 * Standard Latitude parallels and Longitude meridians for Earth graticule
 */
export const LATITUDE_PARALLELS = [-60, -30, 0, 30, 60];
export const LONGITUDE_MERIDIANS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
