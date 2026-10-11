// Quaternion mathematical utilities for 3D device orientation and celestial sky tracking
export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function normalizeQuaternion(q: Quaternion): Quaternion {
  const len = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
  if (len < 1e-9) return { w: 1, x: 0, y: 0, z: 0 };
  const inv = 1 / len;
  return {
    w: q.w * inv,
    x: q.x * inv,
    y: q.y * inv,
    z: q.z * inv,
  };
}

// Convert W3C Euler angles (alpha, beta, gamma in degrees) to rotation quaternion
// Standard intrinsic rotation order: Z(alpha) -> X(beta) -> Y(gamma)
export function eulerToQuaternion(alphaDeg: number, betaDeg: number, gammaDeg: number): Quaternion {
  const alpha2 = (alphaDeg * DEG_TO_RAD) / 2;
  const beta2 = (betaDeg * DEG_TO_RAD) / 2;
  const gamma2 = (gammaDeg * DEG_TO_RAD) / 2;

  const cA = Math.cos(alpha2);
  const sA = Math.sin(alpha2);
  const cB = Math.cos(beta2);
  const sB = Math.sin(beta2);
  const cG = Math.cos(gamma2);
  const sG = Math.sin(gamma2);

  // q = q_z(alpha) * q_x(beta) * q_y(gamma)
  const w = cA * cB * cG - sA * sB * sG;
  const x = cA * sB * cG - sA * cB * sG;
  const y = cA * cB * sG + sA * sB * cG;
  const z = sA * cB * cG + cA * sB * sG;

  return normalizeQuaternion({ w, x, y, z });
}

// Multiply two quaternions: q1 * q2
export function multiplyQuaternions(q1: Quaternion, q2: Quaternion): Quaternion {
  return normalizeQuaternion({
    w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
    x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
    y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
    z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
  });
}

// Adjust for screen orientation (portrait vs landscape 90, -90, 180)
export function applyScreenOrientation(q: Quaternion, screenAngleDeg: number): Quaternion {
  if (screenAngleDeg === 0) return q;
  const halfAngle = (-screenAngleDeg * DEG_TO_RAD) / 2;
  const qScreen: Quaternion = {
    w: Math.cos(halfAngle),
    x: 0,
    y: 0,
    z: Math.sin(halfAngle),
  };
  return multiplyQuaternions(q, qScreen);
}

// Spherical Linear Interpolation (SLERP) between two quaternions
export function quaternionSlerp(q1: Quaternion, q2: Quaternion, t: number): Quaternion {
  // Dot product (cosine of half angle)
  let dot = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;

  // Take the shortest path on the 4D hypersphere
  let w2 = q2.w;
  let x2 = q2.x;
  let y2 = q2.y;
  let z2 = q2.z;

  if (dot < 0) {
    dot = -dot;
    w2 = -w2;
    x2 = -x2;
    y2 = -y2;
    z2 = -z2;
  }

  // Linear interpolation fallback for nearly identical orientations
  if (dot > 0.9995) {
    return normalizeQuaternion({
      w: q1.w + t * (w2 - q1.w),
      x: q1.x + t * (x2 - q1.x),
      y: q1.y + t * (y2 - q1.y),
      z: q1.z + t * (z2 - q1.z),
    });
  }

  const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
  const sinTheta = Math.sin(theta);
  const w1Coeff = Math.sin((1 - t) * theta) / sinTheta;
  const w2Coeff = Math.sin(t * theta) / sinTheta;

  return normalizeQuaternion({
    w: w1Coeff * q1.w + w2Coeff * w2,
    x: w1Coeff * q1.x + w2Coeff * x2,
    y: w1Coeff * q1.y + w2Coeff * y2,
    z: w1Coeff * q1.z + w2Coeff * z2,
  });
}

// Rotate vector v using quaternion q: v_rot = q * v * q^-1
export function rotateVectorByQuaternion(v: Vector3, q: Quaternion): Vector3 {
  // Formula: v + 2*r x (r x v + w*v) where r = (x, y, z)
  const rx = q.x;
  const ry = q.y;
  const rz = q.z;
  const w = q.w;

  // cross1 = r x v + w*v
  const cx1 = ry * v.z - rz * v.y + w * v.x;
  const cy1 = rz * v.x - rx * v.z + w * v.y;
  const cz1 = rx * v.y - ry * v.x + w * v.z;

  // cross2 = r x cross1
  const cx2 = ry * cz1 - rz * cy1;
  const cy2 = rz * cx1 - rx * cz1;
  const cz2 = rx * cy1 - ry * cx1;

  return {
    x: v.x + 2 * cx2,
    y: v.y + 2 * cy2,
    z: v.z + 2 * cz2,
  };
}

// Conjugate of a quaternion: q* = [w, -x, -y, -z] (inverse of a unit quaternion)
export function conjugateQuaternion(q: Quaternion): Quaternion {
  return {
    w: q.w,
    x: -q.x,
    y: -q.y,
    z: -q.z,
  };
}

// Angular distance between two quaternions in degrees (0° to 180°)
export function quaternionAngularDistance(q1: Quaternion, q2: Quaternion): number {
  const dot = Math.abs(q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z);
  const clampedDot = Math.max(-1, Math.min(1, dot));
  return 2 * Math.acos(clampedDot) * RAD_TO_DEG;
}

// Convert quaternion to celestial pointing coordinates (Azimuth & Altitude)
// Note: The sensor quaternion q rotates from Earth frame to Device frame.
// To find where the device's line-of-sight vector (0, 0, -1) points in Earth coordinates,
// we apply the inverse/conjugate quaternion (Device to Earth transform).
export function quaternionToCelestialCoordinates(
  q: Quaternion,
  azimuthOffsetDeg: number = 0
): { az: number; alt: number } {
  // Device line-of-sight vector pointing out the back of the device into the sky
  const vDevice: Vector3 = { x: 0, y: 0, z: -1 };
  
  // Transform from Device frame to Earth frame using the conjugate (inverse) quaternion
  const qDeviceToEarth = conjugateQuaternion(q);
  const vWorld = rotateVectorByQuaternion(vDevice, qDeviceToEarth);

  // In Earth frame (ENU: East-North-Up):
  // vWorld.x is East
  // vWorld.y is North
  // vWorld.z is Up (Zenith)
  // Compass Azimuth is clockwise from North (+Y) towards East (+X)
  let rawAz = Math.atan2(vWorld.x, vWorld.y) * RAD_TO_DEG;
  let az = (rawAz + azimuthOffsetDeg + 360) % 360;

  const alt = Math.asin(Math.max(-1, Math.min(1, vWorld.z))) * RAD_TO_DEG;

  return { az, alt };
}
