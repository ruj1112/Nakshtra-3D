import { PlanetPosition } from '../types/astronomy';
import { NAKSHATRAS } from '../data/nakshatrasData';
import { BRIGHT_STARS } from '../data/brightStars';
import {
  CONTINENT_POLYGONS,
  LATITUDE_PARALLELS,
  LONGITUDE_MERIDIANS,
  latLonToUnitVector,
  rotateGlobePoint,
  projectGlobePoint,
  celestialToSubPoint,
  getGreatCirclePoints,
} from './globeCalculations';
import { getGMST } from './astronomyCalculations';

export interface GlobeClickTarget {
  id: string | number;
  type: 'planet' | 'nakshatra' | 'observer';
  name: string;
  x: number;
  y: number;
  radius: number;
}

export interface RenderGlobeOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  currentDate: Date;
  latitude: number;
  longitude: number;
  planets: PlanetPosition[];
  selectedNakshatraId: number | null;
  selectedPlanetId: string | null;
  nightMode: boolean;
  showConstellationLines: boolean;
  showStarLabels: boolean;
  showPlanets: boolean;
  showHorizon: boolean;
  showEcliptic: boolean;
  centerLat: number;
  centerLon: number;
  globeZoom: number;
  effectiveTextScale: number;
  onTargetsComputed?: (targets: GlobeClickTarget[]) => void;
}

export function renderGlobeScene({
  ctx,
  width,
  height,
  currentDate,
  latitude,
  longitude,
  planets,
  selectedNakshatraId,
  selectedPlanetId,
  nightMode,
  showConstellationLines,
  showStarLabels,
  showPlanets,
  showHorizon,
  showEcliptic,
  centerLat,
  centerLon,
  globeZoom,
  effectiveTextScale,
  onTargetsComputed,
}: RenderGlobeOptions) {
  const clickTargets: GlobeClickTarget[] = [];
  const cx = width / 2;
  const cy = height / 2;
  const baseRadius = Math.min(width, height) * 0.30 * globeZoom;

  const jd = currentDate.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525.0;
  const gmst = getGMST(jd, t);

  // 1. Cosmic Space Background
  const bgGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, Math.max(width, height) * 0.8);
  if (nightMode) {
    bgGrad.addColorStop(0, '#1a0404');
    bgGrad.addColorStop(0.6, '#0d0101');
    bgGrad.addColorStop(1, '#000000');
  } else {
    bgGrad.addColorStop(0, '#0c1630');
    bgGrad.addColorStop(0.5, '#060a17');
    bgGrad.addColorStop(1, '#020308');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Background stars in deep space
  ctx.save();
  BRIGHT_STARS.slice(0, 40).forEach((star) => {
    const sub = celestialToSubPoint(star.ra, star.dec, gmst);
    const uv = latLonToUnitVector(sub.lat, sub.lon);
    const rotated = rotateGlobePoint(uv, centerLat, centerLon);
    const pt = projectGlobePoint(rotated, cx, cy, baseRadius, 1.35);

    // Only draw stars outside the immediate globe silhouette or softly in background
    const distFromCenter = Math.hypot(pt.x - cx, pt.y - cy);
    if (distFromCenter > baseRadius * 0.98) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(0.8, (5 - (star.mag || 4)) * 0.8), 0, Math.PI * 2);
      ctx.fillStyle = nightMode ? 'rgba(248, 113, 113, 0.4)' : 'rgba(199, 210, 254, 0.5)';
      ctx.fill();
    }
  });
  ctx.restore();

  // 2. Atmospheric Outer Glow Ring
  ctx.save();
  const atmosphereGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.95, cx, cy, baseRadius * 1.15);
  if (nightMode) {
    atmosphereGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
    atmosphereGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.1)');
    atmosphereGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    atmosphereGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    atmosphereGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
    atmosphereGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  }
  ctx.fillStyle = atmosphereGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius * 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Earth Globe Base Sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
  ctx.clip(); // Clip everything inside Earth to the sphere boundary!

  // Ocean fill gradient with 3D spherical lighting
  // Determine Sun sub-solar point for realistic solar illumination
  const sun = planets.find((p) => p.id === 'sun');
  const sunSub = sun ? celestialToSubPoint(sun.ra, sun.dec, gmst) : { lat: 15, lon: 45 };
  const sunUv = latLonToUnitVector(sunSub.lat, sunSub.lon);
  const sunRot = rotateGlobePoint(sunUv, centerLat, centerLon);
  const sunScreenX = cx + sunRot.x * baseRadius;
  const sunScreenY = cy - sunRot.y * baseRadius;

  const oceanGrad = ctx.createRadialGradient(
    sunScreenX,
    sunScreenY,
    baseRadius * 0.1,
    cx,
    cy,
    baseRadius * 1.2
  );

  if (nightMode) {
    oceanGrad.addColorStop(0, '#380808');
    oceanGrad.addColorStop(0.5, '#1e0404');
    oceanGrad.addColorStop(1, '#0a0101');
  } else {
    oceanGrad.addColorStop(0, '#1e3a8a');
    oceanGrad.addColorStop(0.35, '#0f2356');
    oceanGrad.addColorStop(0.7, '#081434');
    oceanGrad.addColorStop(1, '#030816');
  }
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(cx - baseRadius, cy - baseRadius, baseRadius * 2, baseRadius * 2);

  // 4. Latitude Parallels & Longitude Meridians (Graticule)
  ctx.lineWidth = 1;
  ctx.strokeStyle = nightMode ? 'rgba(239, 68, 68, 0.18)' : 'rgba(96, 165, 250, 0.2)';

  // Draw Parallels
  LATITUDE_PARALLELS.forEach((parLat) => {
    ctx.beginPath();
    let isDrawing = false;
    for (let lon = -180; lon <= 180; lon += 5) {
      const uv = latLonToUnitVector(parLat, lon);
      const rot = rotateGlobePoint(uv, centerLat, centerLon);
      if (rot.z > 0) {
        const pt = projectGlobePoint(rot, cx, cy, baseRadius);
        if (!isDrawing) {
          ctx.moveTo(pt.x, pt.y);
          isDrawing = true;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      } else {
        isDrawing = false;
      }
    }
    // Highlight equator with slightly brighter stroke
    if (parLat === 0) {
      ctx.save();
      ctx.strokeStyle = nightMode ? 'rgba(248, 113, 113, 0.45)' : 'rgba(251, 191, 36, 0.5)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.stroke();
    }
  });

  // Draw Meridians
  LONGITUDE_MERIDIANS.forEach((merLon) => {
    ctx.beginPath();
    let isDrawing = false;
    for (let lat = -85; lat <= 85; lat += 5) {
      const uv = latLonToUnitVector(lat, merLon);
      const rot = rotateGlobePoint(uv, centerLat, centerLon);
      if (rot.z > 0) {
        const pt = projectGlobePoint(rot, cx, cy, baseRadius);
        if (!isDrawing) {
          ctx.moveTo(pt.x, pt.y);
          isDrawing = true;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      } else {
        isDrawing = false;
      }
    }
    // Highlight prime meridian
    if (merLon === 0) {
      ctx.save();
      ctx.strokeStyle = nightMode ? 'rgba(248, 113, 113, 0.45)' : 'rgba(147, 197, 253, 0.45)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.stroke();
    }
  });

  // 5. Continents & Landmasses
  CONTINENT_POLYGONS.forEach((polygon) => {
    ctx.beginPath();
    let started = false;
    let anyVisible = false;

    polygon.forEach(([polyLat, polyLon]) => {
      const uv = latLonToUnitVector(polyLat, polyLon);
      const rot = rotateGlobePoint(uv, centerLat, centerLon);
      if (rot.z > -0.15) {
        anyVisible = true;
        const pt = projectGlobePoint(rot, cx, cy, baseRadius);
        if (!started) {
          ctx.moveTo(pt.x, pt.y);
          started = true;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      } else {
        started = false;
      }
    });

    if (anyVisible) {
      ctx.fillStyle = nightMode ? 'rgba(185, 28, 28, 0.28)' : 'rgba(16, 185, 129, 0.22)';
      ctx.strokeStyle = nightMode ? 'rgba(248, 113, 113, 0.55)' : 'rgba(52, 211, 153, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();
    }
  });

  // 6. Day/Night Solar Terminator Shading on Globe
  if (sun) {
    const terminatorPoints = getGreatCirclePoints(sunSub.lat, sunSub.lon, 90, 90);
    ctx.beginPath();
    let started = false;
    terminatorPoints.forEach(([tLat, tLon]) => {
      const uv = latLonToUnitVector(tLat, tLon);
      const rot = rotateGlobePoint(uv, centerLat, centerLon);
      if (rot.z > -0.05) {
        const pt = projectGlobePoint(rot, cx, cy, baseRadius);
        if (!started) {
          ctx.moveTo(pt.x, pt.y);
          started = true;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      } else {
        started = false;
      }
    });
    ctx.strokeStyle = nightMode ? 'rgba(252, 165, 165, 0.4)' : 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Night shadow on anti-solar hemisphere
    const antiSunRot = rotateGlobePoint(
      latLonToUnitVector(-sunSub.lat, (sunSub.lon + 180) % 360),
      centerLat,
      centerLon
    );
    if (antiSunRot.z > 0) {
      const nightCenter = projectGlobePoint(antiSunRot, cx, cy, baseRadius);
      const nightGrad = ctx.createRadialGradient(
        nightCenter.x,
        nightCenter.y,
        baseRadius * 0.1,
        nightCenter.x,
        nightCenter.y,
        baseRadius * 1.1
      );
      nightGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      nightGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.35)');
      nightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nightGrad;
      ctx.fillRect(cx - baseRadius, cy - baseRadius, baseRadius * 2, baseRadius * 2);
    }
  }

  // 7. Observer's Local Horizon Circle (clipped to globe surface)
  if (showHorizon) {
    const horizonPoints = getGreatCirclePoints(latitude, longitude, 90, 90);
    ctx.beginPath();
    let started = false;
    horizonPoints.forEach(([hLat, hLon]) => {
      const uv = latLonToUnitVector(hLat, hLon);
      const rot = rotateGlobePoint(uv, centerLat, centerLon);
      if (rot.z > 0) {
        const pt = projectGlobePoint(rot, cx, cy, baseRadius);
        if (!started) {
          ctx.moveTo(pt.x, pt.y);
          started = true;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      } else {
        started = false;
      }
    });
    ctx.strokeStyle = nightMode ? 'rgba(239, 68, 68, 0.85)' : 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore(); // End globe clip!

  // 8. Globe Rim Stroke & Specular Limb
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
  ctx.strokeStyle = nightMode ? 'rgba(239, 68, 68, 0.7)' : 'rgba(56, 189, 248, 0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 9. Observer Location Beacon on Earth Globe
  const obsUv = latLonToUnitVector(latitude, longitude);
  const obsRot = rotateGlobePoint(obsUv, centerLat, centerLon);
  if (obsRot.z > -0.05) {
    const obsPt = projectGlobePoint(obsRot, cx, cy, baseRadius);

    ctx.save();
    // Pulsing outer beacon
    const pulseR = 6 + Math.sin(Date.now() / 250) * 2;
    ctx.beginPath();
    ctx.arc(obsPt.x, obsPt.y, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = nightMode ? 'rgba(248, 113, 113, 0.6)' : 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center pin
    ctx.beginPath();
    ctx.arc(obsPt.x, obsPt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = nightMode ? '#f87171' : '#fbbf24';
    ctx.fill();

    // Observer label
    const obsFontSize = Math.round(11 * effectiveTextScale);
    ctx.font = `bold ${obsFontSize}px system-ui, sans-serif`;
    const obsText = `📍 ${latitude.toFixed(1)}°N, ${longitude.toFixed(1)}°E`;
    ctx.fillStyle = nightMode ? '#fca5a5' : '#fef08a';
    ctx.fillText(obsText, obsPt.x + 8, obsPt.y - 6);
    ctx.restore();

    clickTargets.push({
      id: 'observer',
      type: 'observer',
      name: 'Observer Location',
      x: obsPt.x,
      y: obsPt.y,
      radius: 14,
    });
  }

  // 10. Ecliptic Great Circle (Zodiac Band projected around the Earth sphere)
  if (showEcliptic) {
    ctx.save();
    ctx.beginPath();
    const epsRad = 23.44 * (Math.PI / 180);
    let started = false;

    for (let lambdaDeg = 0; lambdaDeg <= 360; lambdaDeg += 4) {
      const lRad = lambdaDeg * (Math.PI / 180);
      const sinDec = Math.sin(epsRad) * Math.sin(lRad);
      const decDeg = Math.asin(sinDec) * (180 / Math.PI);
      const y = Math.sin(lRad) * Math.cos(epsRad);
      const x = Math.cos(lRad);
      const raDeg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

      const sub = celestialToSubPoint(raDeg, decDeg, gmst);
      const uv = latLonToUnitVector(sub.lat, sub.lon);
      const rot = rotateGlobePoint(uv, centerLat, centerLon);
      const pt = projectGlobePoint(rot, cx, cy, baseRadius, 1.08);

      if (rot.z > -0.1) {
        if (!started) {
          ctx.moveTo(pt.x, pt.y);
          started = true;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      } else {
        started = false;
      }
    }
    ctx.strokeStyle = nightMode ? 'rgba(251, 146, 60, 0.65)' : 'rgba(251, 191, 36, 0.75)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  // 11. 27 Nakshatras Projected on the Celestial Shell
  NAKSHATRAS.forEach((nakshatra) => {
    const isSelected = selectedNakshatraId === nakshatra.id;
    const { ra, dec } = nakshatra.yogataraCoords;
    const sub = celestialToSubPoint(ra, dec, gmst);
    const uv = latLonToUnitVector(sub.lat, sub.lon);
    const rot = rotateGlobePoint(uv, centerLat, centerLon);
    const isFront = rot.z > -0.05;

    // Hover slightly above Earth surface (1.09x radius)
    const pt = projectGlobePoint(rot, cx, cy, baseRadius, 1.09);

    // Register click target on front hemisphere
    if (isFront) {
      clickTargets.push({
        id: nakshatra.id,
        type: 'nakshatra',
        name: nakshatra.name,
        x: pt.x,
        y: pt.y,
        radius: isSelected ? 18 : 12,
      });
    }

    // Constellation lines if enabled
    if (showConstellationLines && nakshatra.shape && nakshatra.shape.stars.length > 1) {
      ctx.save();
      ctx.lineWidth = isSelected ? 2.0 : 1.0;
      ctx.strokeStyle = isSelected
        ? nightMode
          ? 'rgba(252, 165, 165, 0.95)'
          : 'rgba(251, 191, 36, 0.95)'
        : nightMode
        ? 'rgba(239, 68, 68, 0.35)'
        : 'rgba(129, 140, 248, 0.4)';

      nakshatra.shape.lines.forEach(([i1, i2]) => {
        const s1 = nakshatra.shape.stars[i1];
        const s2 = nakshatra.shape.stars[i2];
        if (!s1 || !s2) return;

        const sub1 = celestialToSubPoint(s1.ra, s1.dec, gmst);
        const sub2 = celestialToSubPoint(s2.ra, s2.dec, gmst);
        const rot1 = rotateGlobePoint(latLonToUnitVector(sub1.lat, sub1.lon), centerLat, centerLon);
        const rot2 = rotateGlobePoint(latLonToUnitVector(sub2.lat, sub2.lon), centerLat, centerLon);

        if (rot1.z > -0.1 && rot2.z > -0.1) {
          const p1 = projectGlobePoint(rot1, cx, cy, baseRadius, 1.09);
          const p2 = projectGlobePoint(rot2, cx, cy, baseRadius, 1.09);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    // Draw Yogatara Junction Star
    ctx.save();
    const starAlpha = isFront ? (isSelected ? 1.0 : 0.85) : 0.15;
    const starRadius = isSelected ? 5.5 : isFront ? 3.0 : 1.5;

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, starRadius, 0, Math.PI * 2);
    ctx.fillStyle = isSelected
      ? nightMode
        ? `rgba(254, 202, 202, ${starAlpha})`
        : `rgba(253, 224, 71, ${starAlpha})`
      : nightMode
      ? `rgba(248, 113, 113, ${starAlpha})`
      : `rgba(224, 231, 255, ${starAlpha})`;
    ctx.fill();

    if (isSelected && isFront) {
      // Glowing selection beacon around selected Nakshatra
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = nightMode ? '#f87171' : '#fbbf24';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Projection drop line connecting celestial star to Earth's surface
      const surfacePt = projectGlobePoint(rot, cx, cy, baseRadius, 1.0);
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(surfacePt.x, surfacePt.y);
      ctx.strokeStyle = nightMode ? 'rgba(248, 113, 113, 0.6)' : 'rgba(251, 191, 36, 0.7)';
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Nakshatra Labels
    if ((showStarLabels || isSelected) && isFront) {
      const fontSize = Math.round((isSelected ? 12 : 9.5) * effectiveTextScale);
      ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px system-ui, sans-serif`;
      const label = `${nakshatra.id}. ${nakshatra.name}`;

      ctx.fillStyle = isSelected
        ? nightMode
          ? '#fca5a5'
          : '#fde047'
        : nightMode
        ? 'rgba(252, 165, 165, 0.8)'
        : 'rgba(224, 231, 255, 0.85)';

      ctx.fillText(label, pt.x + 5, pt.y - 4);
    }
    ctx.restore();
  });

  // 12. Navagrahas / Planets Projected on Earth Sphere
  if (showPlanets) {
    planets.forEach((planet) => {
      const isSelected = selectedPlanetId === planet.id;
      const sub = celestialToSubPoint(planet.ra, planet.dec, gmst);
      const uv = latLonToUnitVector(sub.lat, sub.lon);
      const rot = rotateGlobePoint(uv, centerLat, centerLon);
      const isFront = rot.z > -0.05;

      // Planets hover at 1.16x radius with radial drop line to Earth's surface
      const pt = projectGlobePoint(rot, cx, cy, baseRadius, 1.16);
      const surfacePt = projectGlobePoint(rot, cx, cy, baseRadius, 1.0);

      if (isFront) {
        clickTargets.push({
          id: planet.id,
          type: 'planet',
          name: planet.name,
          x: pt.x,
          y: pt.y,
          radius: isSelected ? 20 : 15,
        });
      }

      ctx.save();
      const alpha = isFront ? 1.0 : 0.2;

      // Drop line connecting Planet to its Earth sub-planetary zenith point
      if (isFront) {
        ctx.beginPath();
        ctx.moveTo(surfacePt.x, surfacePt.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.strokeStyle = isSelected
          ? planet.color
          : nightMode
          ? `rgba(239, 68, 68, ${alpha * 0.6})`
          : `rgba(147, 197, 253, ${alpha * 0.5})`;
        ctx.lineWidth = isSelected ? 1.6 : 1.0;
        ctx.setLineDash([3, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Surface footprint dot
        ctx.beginPath();
        ctx.arc(surfacePt.x, surfacePt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = planet.color;
        ctx.fill();
      }

      // Planet Sphere Marker
      const pRadius = (planet.id === 'sun' || planet.id === 'moon' ? 9 : 7) * (isSelected ? 1.25 : 1.0);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pRadius, 0, Math.PI * 2);
      ctx.fillStyle = nightMode ? '#f87171' : planet.color;
      ctx.fill();

      // Planet outline
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = isSelected ? 2.5 : 1.2;
      ctx.stroke();

      // Active pulse if selected
      if (isSelected && isFront) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pRadius + 6 + Math.sin(Date.now() / 200) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      // Planet Name & Glyphs
      if (isFront) {
        const pFontSize = Math.round(11 * effectiveTextScale);
        ctx.font = `bold ${pFontSize}px system-ui, sans-serif`;
        const planetLabel = `${planet.symbol} ${planet.name.split('(')[0].trim()}`;

        // Pill badge backing for high readability
        const textWidth = ctx.measureText(planetLabel).width;
        ctx.fillStyle = nightMode ? 'rgba(25, 2, 2, 0.85)' : 'rgba(3, 7, 18, 0.85)';
        ctx.fillRect(pt.x - textWidth / 2 - 4, pt.y + pRadius + 3, textWidth + 8, pFontSize + 6);
        ctx.strokeStyle = isSelected ? planet.color : 'rgba(100, 116, 139, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(pt.x - textWidth / 2 - 4, pt.y + pRadius + 3, textWidth + 8, pFontSize + 6);

        ctx.fillStyle = isSelected ? '#ffffff' : nightMode ? '#fca5a5' : '#e2e8f0';
        ctx.fillText(planetLabel, pt.x - textWidth / 2, pt.y + pRadius + 3 + pFontSize);
      }
      ctx.restore();
    });
  }

  // 13. Perspective Overlay HUD Watermark
  ctx.save();
  ctx.font = `bold ${Math.round(10 * effectiveTextScale)}px monospace`;
  ctx.fillStyle = nightMode ? 'rgba(248, 113, 113, 0.5)' : 'rgba(147, 197, 253, 0.5)';
  const viewInfo = `3D EARTH PERSPECTIVE · ORIENTATION: ${centerLat > 0 ? centerLat.toFixed(0) + '°N' : Math.abs(centerLat).toFixed(0) + '°S'} ${centerLon.toFixed(0)}°`;
  ctx.fillText(viewInfo, 16, height - 16);
  ctx.restore();

  // Send computed targets back to SkyCanvas for hit testing
  if (onTargetsComputed) {
    onTargetsComputed(clickTargets);
  }
}
