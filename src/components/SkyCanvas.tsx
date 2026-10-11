import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PlanetPosition, CelestialPoint } from '../types/astronomy';
import { NAKSHATRAS } from '../data/nakshatrasData';
import { BRIGHT_STARS, generateBackgroundStars } from '../data/brightStars';
import {
  equatorialToHorizontal,
  getJulianDate,
  getJulianCenturies,
  getLST,
  getGMST,
} from '../utils/astronomyCalculations';
import {
  eulerToQuaternion,
  applyScreenOrientation,
  quaternionSlerp,
  quaternionToCelestialCoordinates,
  quaternionAngularDistance,
  Quaternion,
} from '../utils/quaternion';
import {
  ZoomIn,
  ZoomOut,
  Compass,
  RotateCcw,
  Crosshair,
  Sparkles,
  Navigation2,
  Lock,
  Sliders,
  Settings,
  Sun,
  Moon,
  CheckCircle2,
  X,
  AlertCircle,
  Camera,
  CameraOff,
  RefreshCw,
  Activity,
  Globe,
  Languages,
  ChevronDown,
  ChevronUp,
  Type,
  HelpCircle,
  MapPin,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { renderGlobeScene, GlobeClickTarget } from '../utils/globeRenderer';
import { celestialToSubPoint } from '../utils/globeCalculations';

interface SkyCanvasProps {
  currentDate: Date;
  latitude: number;
  longitude: number;
  planets: PlanetPosition[];
  selectedNakshatraId: number | null;
  onSelectNakshatra: (id: number) => void;
  selectedPlanetId: string | null;
  onSelectPlanet: (id: string | null) => void;
  nightMode: boolean;
  showConstellationLines: boolean;
  showStarLabels: boolean;
  showPlanets: boolean;
  showHorizon: boolean;
  showEcliptic: boolean;
  perspective?: 'sky' | 'ar' | 'globe';
  onPerspectiveChange?: (mode: 'sky' | 'ar' | 'globe') => void;
  onArStateChange?: (active: boolean) => void;
  isSettingsOpen?: boolean;
  onToggleSettings?: () => void;
}

function getCardinalDirection(az: number): { devanagari: string; english: string } {
  const norm = ((az % 360) + 360) % 360;
  if (norm >= 337.5 || norm < 22.5) return { devanagari: 'उत्तर', english: 'N' };
  if (norm >= 22.5 && norm < 67.5) return { devanagari: 'उत्तर-पूर्व', english: 'NE' };
  if (norm >= 67.5 && norm < 112.5) return { devanagari: 'पूर्व', english: 'E' };
  if (norm >= 112.5 && norm < 157.5) return { devanagari: 'दक्षिण-पूर्व', english: 'SE' };
  if (norm >= 157.5 && norm < 202.5) return { devanagari: 'दक्षिण', english: 'S' };
  if (norm >= 202.5 && norm < 247.5) return { devanagari: 'दक्षिण-पश्चिम', english: 'SW' };
  if (norm >= 247.5 && norm < 292.5) return { devanagari: 'पश्चिम', english: 'W' };
  return { devanagari: 'उत्तर-पश्चिम', english: 'NW' };
}

export const SkyCanvas: React.FC<SkyCanvasProps> = ({
  currentDate,
  latitude,
  longitude,
  planets,
  selectedNakshatraId,
  onSelectNakshatra,
  selectedPlanetId,
  onSelectPlanet,
  nightMode,
  showConstellationLines,
  showStarLabels,
  showPlanets,
  showHorizon,
  showEcliptic,
  perspective: perspectiveProp,
  onPerspectiveChange,
  onArStateChange,
  isSettingsOpen,
  onToggleSettings,
}) => {
  const { language, setLanguage, languages, upcomingLanguages, t } = useLanguage();
  const [showUpcomingLanguages, setShowUpcomingLanguages] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Sensor Panning Sensitivity (0.4x - 2.5x, default 1.0x)
  const [sensorSensitivity, setSensorSensitivity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('skymap_sensor_sensitivity');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.3 && val <= 3.0) return val;
      }
    } catch {
      // ignore
    }
    return 1.0;
  });

  // Zoom Target Mode: 'both' (3D sky + text), '3d' (3D sky only), 'text' (text labels only)
  const [zoomTarget, setZoomTarget] = useState<'both' | '3d' | 'text'>(() => {
    try {
      const saved = localStorage.getItem('skymap_zoom_target');
      if (saved === 'both' || saved === '3d' || saved === 'text') return saved;
    } catch {}
    return 'both';
  });

  // Text label scale multiplier (0.7x to 2.5x, default 1.0x)
  const [textZoom, setTextZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('skymap_text_zoom');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.7 && val <= 2.5) return val;
      }
    } catch {}
    return 1.0;
  });

  // Decoupled camera state stored in refs to avoid React re-render lag during 60/120fps motion
  const cameraRef = useRef<{
    az: number;
    alt: number;
    zoom: number;
    calibrationOffset: number;
    arDimmer: number;
    sensorSensitivity: number;
    textZoom: number;
    zoomTarget: 'both' | '3d' | 'text';
  }>({
    az: 180,
    alt: 45,
    zoom: 1.2,
    calibrationOffset: 0,
    arDimmer: 0.25,
    sensorSensitivity: 1.0,
    textZoom: 1.0,
    zoomTarget: 'both',
  });

  // Fast refs for gesture tracking
  const zoomTargetRef = useRef<'both' | '3d' | 'text'>(zoomTarget);
  const textZoomRef = useRef<number>(textZoom);

  // Keep cameraRef and fast refs synced with state
  useEffect(() => {
    cameraRef.current.sensorSensitivity = sensorSensitivity;
  }, [sensorSensitivity]);

  useEffect(() => {
    zoomTargetRef.current = zoomTarget;
    cameraRef.current.zoomTarget = zoomTarget;
    try {
      localStorage.setItem('skymap_zoom_target', zoomTarget);
    } catch {}
  }, [zoomTarget]);

  useEffect(() => {
    textZoomRef.current = textZoom;
    cameraRef.current.textZoom = textZoom;
    try {
      localStorage.setItem('skymap_text_zoom', textZoom.toString());
    } catch {}
  }, [textZoom]);

  // UI state
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [isPausedByTouch, setIsPausedByTouch] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isCalibrateModalOpen, setIsCalibrateModalOpen] = useState<boolean>(false);
  const [azimuthCalibrationOffset, setAzimuthCalibrationOffset] = useState<number>(0);
  const [alignmentToast, setAlignmentToast] = useState<{
    message: string;
    targetName: string;
    offset: number;
  } | null>(null);

  // Tooltip Help Toggle (persist in localStorage)
  const [showTooltipHelp, setShowTooltipHelp] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('skymap_tooltip_help');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // Default enabled
  });

  useEffect(() => {
    try {
      localStorage.setItem('skymap_tooltip_help', showTooltipHelp ? 'true' : 'false');
    } catch {}
  }, [showTooltipHelp]);

  // Sync external isSettingsOpen prop if provided
  useEffect(() => {
    if (isSettingsOpen !== undefined) {
      setIsCalibrateModalOpen(isSettingsOpen);
    }
  }, [isSettingsOpen]);

  // Auto-dismiss alignment confirmation toast after 4.5 seconds
  useEffect(() => {
    if (alignmentToast) {
      const timer = setTimeout(() => {
        setAlignmentToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [alignmentToast]);

  // Perspective View Mode: 'sky' (Observer Dome), 'ar' (Camera Horizon), 'globe' (3D Earth Sphere Projection)
  const [perspective, setPerspectiveState] = useState<'sky' | 'ar' | 'globe'>(
    perspectiveProp || 'sky'
  );

  // 3D Earth Globe Navigation State
  const globeRef = useRef<{
    lat: number;
    lon: number;
    zoom: number;
    spinVx: number;
    spinVy: number;
  }>({
    lat: latitude || 23.17,
    lon: longitude || 75.77,
    zoom: 1.0,
    spinVx: 0,
    spinVy: 0,
  });
  const globeClickTargetsRef = useRef<GlobeClickTarget[]>([]);

  // AR Camera Mode State
  const [arMode, setArMode] = useState<boolean>(false);
  const [arDimmer, setArDimmer] = useState<number>(0.25);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Sync external perspective prop
  useEffect(() => {
    if (perspectiveProp && perspectiveProp !== perspective) {
      switchPerspective(perspectiveProp);
    }
  }, [perspectiveProp]);

  // Throttled HUD readout for UI display (~10Hz)
  const [hudState, setHudState] = useState<{
    az: number;
    alt: number;
    cardinal: { devanagari: string; english: string };
  }>({
    az: 180,
    alt: 45,
    cardinal: { devanagari: 'दक्षिण', english: 'S' },
  });

  // Pointer drag state, pinch-to-zoom & smooth momentum
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panVelocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1.2);
  const initialPinchTextZoomRef = useRef<number>(1.0);
  const hasMovedSignificantRef = useRef<boolean>(false);

  // Quaternions for orientation and SLERP
  const currentQuatRef = useRef<Quaternion>({ w: 1, x: 0, y: 0, z: 0 });
  const targetQuatRef = useRef<Quaternion>({ w: 1, x: 0, y: 0, z: 0 });
  const hasInitialQuatRef = useRef<boolean>(false);

  // Background random stars cache
  const bgStarsRef = useRef<CelestialPoint[]>(generateBackgroundStars(350));

  // Sync calibration offset and AR dimmer into cameraRef
  useEffect(() => {
    cameraRef.current.calibrationOffset = azimuthCalibrationOffset;
    cameraRef.current.arDimmer = arDimmer;
  }, [azimuthCalibrationOffset, arDimmer]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, []);

  // Convert Alt/Az to Canvas coordinates
  const altAzToCanvas = useCallback(
    (
      alt: number,
      az: number,
      width: number,
      height: number,
      centerAlt: number,
      centerAz: number,
      scale: number
    ): { x: number; y: number; visible: boolean } => {
      let dAz = (az - centerAz) % 360;
      if (dAz > 180) dAz -= 360;
      if (dAz < -180) dAz += 360;

      const dAlt = alt - centerAlt;
      const fovLimit = 90 / scale;

      if (Math.abs(dAz) > fovLimit * 1.5 || Math.abs(dAlt) > fovLimit * 1.3) {
        return { x: 0, y: 0, visible: false };
      }

      const cx = width / 2;
      const cy = height / 2;
      const degToPx = (Math.min(width, height) / (fovLimit * 2)) * 1.8;

      const x = cx + dAz * degToPx;
      const y = cy - dAlt * degToPx;

      const visible = x >= -50 && x <= width + 50 && y >= -50 && y <= height + 50;
      return { x, y, visible };
    },
    []
  );

  // Listen to mobile hardware sensors and update target quaternion
  useEffect(() => {
    if (!sensorActive) {
      hasInitialQuatRef.current = false;
      return;
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (isPausedByTouch) return;

      const alpha = e.alpha ?? 0;
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;

      let q = eulerToQuaternion(alpha, beta, gamma);

      const screenAngle =
        typeof window !== 'undefined' && window.screen?.orientation
          ? window.screen.orientation.angle
          : (typeof window !== 'undefined' && (window as any).orientation) || 0;

      q = applyScreenOrientation(q, screenAngle);

      targetQuatRef.current = q;

      // Seed initial current quaternion on first sensor reading to prevent startup spinning
      if (!hasInitialQuatRef.current) {
        currentQuatRef.current = q;
        hasInitialQuatRef.current = true;
      }
    };

    const hasAbsolute = 'ondeviceorientationabsolute' in window;
    const eventName = hasAbsolute ? 'deviceorientationabsolute' : 'deviceorientation';

    window.addEventListener(eventName, handleOrientation as EventListener);
    if (hasAbsolute) {
      window.addEventListener('deviceorientation', handleOrientation as EventListener);
    }

    return () => {
      window.removeEventListener(eventName, handleOrientation as EventListener);
      if (hasAbsolute) {
        window.removeEventListener('deviceorientation', handleOrientation as EventListener);
      }
    };
  }, [sensorActive, isPausedByTouch]);

  // Request Mobile Sensor Permission (iOS & Android)
  const toggleSensor = async () => {
    if (sensorActive && !arMode) {
      setSensorActive(false);
      setIsPausedByTouch(false);
      return;
    }

    setPermissionError(null);

    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setSensorActive(true);
          setIsPausedByTouch(false);
        } else {
          setPermissionError('सेंसर अनुमति अस्वीकृत (Sensor permission denied)');
        }
      } catch (err: any) {
        setPermissionError(err.message || 'सेंसर अनुमति त्रुटि (Sensor permission error)');
      }
    } else if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setSensorActive(true);
      setIsPausedByTouch(false);
    } else {
      setPermissionError('सेंसर समर्थित नहीं है (Sensors not supported on this device)');
    }
  };

  // Start Camera Stream with multi-tier fallback for various devices
  const startCameraStream = async (targetFacing: 'environment' | 'user') => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: targetFacing },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
    }

    cameraStreamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch (err) {
        console.warn('Video play warning:', err);
      }
    }
  };

  // Switch between Rear and Front camera in AR mode
  const switchCamera = async () => {
    if (!arMode) return;
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setIsCameraLoading(true);
    setCameraError(null);
    try {
      await startCameraStream(nextFacing);
      setFacingMode(nextFacing);
      setIsCameraLoading(false);
    } catch (err: any) {
      setIsCameraLoading(false);
      setCameraError(err.message || 'कैमरा बदलने में त्रुटि (Failed to switch camera)');
    }
  };

  // Switch Perspective View: Sky Dome, AR Camera, Earth Globe
  const switchPerspective = async (mode: 'sky' | 'ar' | 'globe') => {
    if (mode === 'ar') {
      setCameraError(null);
      setIsCameraLoading(true);
      try {
        await startCameraStream(facingMode);
        setArMode(true);
        onArStateChange?.(true);
        setIsCameraLoading(false);
        setPerspectiveState('ar');
        onPerspectiveChange?.('ar');
        if (!sensorActive) {
          await toggleSensor();
        }
      } catch (err: any) {
        setIsCameraLoading(false);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'कैमरा अनुमति अस्वीकृत (Camera access denied)'
            : err.message || 'कैमरा प्रारंभ नहीं हो सका (Unable to start camera)'
        );
      }
    } else {
      if (arMode || cameraStreamRef.current) {
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach((track) => track.stop());
          cameraStreamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setArMode(false);
        onArStateChange?.(false);
      }
      setPerspectiveState(mode);
      onPerspectiveChange?.(mode);

      if (mode === 'globe') {
        globeRef.current.lat = latitude;
        globeRef.current.lon = longitude;
        globeRef.current.spinVx = 0;
        globeRef.current.spinVy = 0;
        setZoomLevel(globeRef.current.zoom);
        setAlignmentToast({
          message: t('perspectiveGlobeDesc'),
          targetName: '3D Earth Projection',
          offset: 0,
        });
      } else {
        setZoomLevel(cameraRef.current.zoom);
      }
    }
  };

  const focusObserverOnGlobe = () => {
    globeRef.current.lat = latitude;
    globeRef.current.lon = longitude;
    globeRef.current.spinVx = 0;
    globeRef.current.spinVy = 0;
    setAlignmentToast({
      message: t('observerLocationBeacon'),
      targetName: `${latitude.toFixed(1)}°N, ${longitude.toFixed(1)}°E`,
      offset: 0,
    });
  };

  // Toggle Augmented Reality (AR) Camera Mode
  const toggleARMode = async () => {
    if (perspective === 'ar') {
      await switchPerspective('sky');
    } else {
      await switchPerspective('ar');
    }
  };

  // Center globe on selected planet or nakshatra when in globe mode
  useEffect(() => {
    if (perspective === 'globe' && selectedPlanetId) {
      const pl = planets.find((p) => p.id === selectedPlanetId);
      if (pl) {
        const jd = currentDate.getTime() / 86400000 + 2440587.5;
        const t = (jd - 2451545.0) / 36525.0;
        const gmst = getGMST(jd, t);
        const sub = celestialToSubPoint(pl.ra, pl.dec, gmst);
        globeRef.current.lat = sub.lat;
        globeRef.current.lon = sub.lon;
        globeRef.current.spinVx = 0;
        globeRef.current.spinVy = 0;
      }
    }
  }, [selectedPlanetId, perspective, currentDate, planets]);

  useEffect(() => {
    if (perspective === 'globe' && selectedNakshatraId) {
      const n = NAKSHATRAS.find((item) => item.id === selectedNakshatraId);
      if (n) {
        const jd = currentDate.getTime() / 86400000 + 2440587.5;
        const t = (jd - 2451545.0) / 36525.0;
        const gmst = getGMST(jd, t);
        const sub = celestialToSubPoint(n.yogataraCoords.ra, n.yogataraCoords.dec, gmst);
        globeRef.current.lat = sub.lat;
        globeRef.current.lon = sub.lon;
        globeRef.current.spinVx = 0;
        globeRef.current.spinVy = 0;
      }
    }
  }, [selectedNakshatraId, perspective, currentDate]);

  // High-performance decoupled Render & SLERP loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frameCount = 0;
    let lastTime = performance.now();

    const render = () => {
      frameCount++;
      const now = performance.now();
      const dt = Math.min(0.064, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      // 1. Apply Adaptive Quaternion SLERP to update camera orientation
      if (sensorActive && !isPausedByTouch) {
        const angularDist = quaternionAngularDistance(
          currentQuatRef.current,
          targetQuatRef.current
        );

        const sensitivity = cameraRef.current.sensorSensitivity || 1.0;
        // Adaptive deadband filter: allows finer tracking at higher sensitivity while filtering jitter at lower sensitivity
        const deadband = Math.max(0.02, 0.08 / Math.sqrt(sensitivity));

        if (angularDist > deadband) {
          // Dynamic adaptive rate scaled by panning sensitivity
          const baseSpeed = angularDist > 15 ? 18 : angularDist > 5 ? 12 : 7.5;
          const speed = baseSpeed * sensitivity;
          const slerpFactor = 1 - Math.exp(-speed * dt);

          currentQuatRef.current = quaternionSlerp(
            currentQuatRef.current,
            targetQuatRef.current,
            Math.min(0.95, Math.max(0.02 * sensitivity, slerpFactor))
          );

          const coords = quaternionToCelestialCoordinates(
            currentQuatRef.current,
            cameraRef.current.calibrationOffset
          );

          cameraRef.current.az = coords.az;
          cameraRef.current.alt = Math.max(-10, Math.min(88, coords.alt));
        }
      } else {
        // Inertial momentum for manual touch drag
        if (!isDraggingRef.current) {
          const vx = panVelocityRef.current.vx;
          const vy = panVelocityRef.current.vy;
          if (Math.abs(vx) > 0.003 || Math.abs(vy) > 0.003) {
            cameraRef.current.az = (cameraRef.current.az + vx + 360) % 360;
            cameraRef.current.alt = Math.max(-10, Math.min(88, cameraRef.current.alt + vy));
            panVelocityRef.current.vx *= 0.92;
            panVelocityRef.current.vy *= 0.92;
          } else {
            panVelocityRef.current.vx = 0;
            panVelocityRef.current.vy = 0;
          }
        }
      }

      const camAz = cameraRef.current.az;
      const camAlt = cameraRef.current.alt;
      const camZoom = cameraRef.current.zoom;
      const activeZoomTarget = cameraRef.current.zoomTarget;
      const activeTextZoom = cameraRef.current.textZoom || 1.0;

      // Effective text scale depending on zoom target option:
      // - '3d': 3D celestial sky zooms, text remains crisp & fixed size without crowding
      // - 'text': 3D celestial sky remains stable, text labels enlarge or shrink cleanly
      // - 'both': both 3D celestial sky and text labels scale together
      const effectiveTextScale =
        activeZoomTarget === '3d'
          ? activeTextZoom
          : Math.sqrt(camZoom) * activeTextZoom;

      // 2. Throttled UI state update (~10Hz)
      if (frameCount % 6 === 0) {
        setHudState({
          az: Math.round(camAz),
          alt: Math.round(camAlt),
          cardinal: getCardinalDirection(camAz),
        });
      }

      // 3. Canvas Drawing
      const width = (canvas.width = canvas.clientWidth * window.devicePixelRatio || 800);
      const height = (canvas.height = canvas.clientHeight * window.devicePixelRatio || 600);

      // Globe Perspective Mode: All 3D items projected on Earth sphere
      if (perspective === 'globe') {
        if (!isDraggingRef.current) {
          globeRef.current.lon = (globeRef.current.lon + globeRef.current.spinVx + 360) % 360;
          globeRef.current.lat = Math.max(-85, Math.min(85, globeRef.current.lat + globeRef.current.spinVy));
          globeRef.current.spinVx *= 0.94;
          globeRef.current.spinVy *= 0.94;
          if (Math.abs(globeRef.current.spinVx) < 0.005) globeRef.current.spinVx = 0;
          if (Math.abs(globeRef.current.spinVy) < 0.005) globeRef.current.spinVy = 0;
        }

        const effectiveGlobeTextScale =
          activeZoomTarget === '3d'
            ? activeTextZoom
            : Math.sqrt(globeRef.current.zoom) * activeTextZoom;

        renderGlobeScene({
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
          centerLat: globeRef.current.lat,
          centerLon: globeRef.current.lon,
          globeZoom: globeRef.current.zoom,
          effectiveTextScale: effectiveGlobeTextScale,
          onTargetsComputed: (targets) => {
            globeClickTargetsRef.current = targets;
          },
        });

        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const jd = getJulianDate(currentDate);
      const t = getJulianCenturies(jd);
      const lst = getLST(jd, t, longitude);

      // AR Mode: Clear canvas for transparent camera passthrough with optional contrast tint
      if (arMode) {
        ctx.clearRect(0, 0, width, height);

        const dimmer = cameraRef.current.arDimmer;
        if (dimmer > 0) {
          ctx.fillStyle = nightMode
            ? `rgba(40, 2, 2, ${dimmer * 0.85})`
            : `rgba(2, 6, 23, ${dimmer})`;
          ctx.fillRect(0, 0, width, height);
        }
      } else {
        // Normal Non-AR Sky Dome Gradient
        const bgGradient = ctx.createRadialGradient(
          width / 2,
          height / 2,
          20,
          width / 2,
          height / 2,
          Math.max(width, height)
        );

        if (nightMode) {
          bgGradient.addColorStop(0, '#150303');
          bgGradient.addColorStop(0.6, '#080000');
          bgGradient.addColorStop(1, '#000000');
        } else {
          bgGradient.addColorStop(0, '#0a1026');
          bgGradient.addColorStop(0.5, '#050818');
          bgGradient.addColorStop(1, '#02030a');
        }

        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
      }

      // Coordinate Grid Rings (Alt 30, 60 deg)
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = nightMode
        ? 'rgba(239, 68, 68, 0.12)'
        : arMode
        ? 'rgba(147, 197, 253, 0.15)'
        : 'rgba(99, 102, 241, 0.08)';

      [30, 60].forEach((ringAlt) => {
        ctx.beginPath();
        for (let a = 0; a <= 360; a += 10) {
          const pt = altAzToCanvas(ringAlt, a, width, height, camAlt, camAz, camZoom);
          if (a === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      });
      ctx.restore();

      // Field Stars
      ctx.save();
      bgStarsRef.current.forEach((star) => {
        const horiz = equatorialToHorizontal(star.ra, star.dec, latitude, lst);
        const pt = altAzToCanvas(horiz.alt, horiz.az, width, height, camAlt, camAz, camZoom);
        if (!pt.visible) return;

        const size = Math.max(0.7, (5.5 - (star.mag || 4.5)) * 0.7 * Math.sqrt(camZoom));
        const alpha = Math.max(0.3, Math.min(0.95, (6 - (star.mag || 5)) / 5));

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);

        if (nightMode) {
          ctx.fillStyle = `rgba(248, 113, 113, ${alpha})`;
        } else if (arMode) {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha + 0.2)})`;
        } else {
          if (star.spectralType === 'O' || star.spectralType === 'B') {
            ctx.fillStyle = `rgba(199, 210, 254, ${alpha})`;
          } else if (star.spectralType === 'K' || star.spectralType === 'M') {
            ctx.fillStyle = `rgba(254, 215, 170, ${alpha})`;
          } else {
            ctx.fillStyle = `rgba(241, 245, 249, ${alpha})`;
          }
        }
        ctx.fill();
      });
      ctx.restore();

      // Major Bright Navigational Stars
      ctx.save();
      BRIGHT_STARS.forEach((star) => {
        const horiz = equatorialToHorizontal(star.ra, star.dec, latitude, lst);
        const pt = altAzToCanvas(horiz.alt, horiz.az, width, height, camAlt, camAz, camZoom);
        if (!pt.visible) return;

        const starMag = star.mag ?? 4.0;
        const radius = Math.max(1.8, (4.5 - starMag) * 1.4 * Math.sqrt(camZoom));

        const halo = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius * (arMode ? 4 : 3));
        if (nightMode) {
          halo.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
          halo.addColorStop(1, 'rgba(239, 68, 68, 0)');
        } else if (arMode) {
          halo.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          halo.addColorStop(0.5, 'rgba(125, 211, 252, 0.6)');
          halo.addColorStop(1, 'rgba(14, 165, 233, 0)');
        } else {
          halo.addColorStop(0, 'rgba(224, 231, 255, 0.9)');
          halo.addColorStop(0.5, 'rgba(147, 197, 253, 0.3)');
          halo.addColorStop(1, 'rgba(147, 197, 253, 0)');
        }

        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius * (arMode ? 4 : 3), 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = nightMode ? '#fca5a5' : '#ffffff';
        ctx.fill();

        if (showStarLabels && (camZoom > 1.3 || activeZoomTarget === 'text' || activeTextZoom > 1.2) && star.name) {
          ctx.font = `${Math.max(9, Math.round(11 * effectiveTextScale))}px 'Plus Jakarta Sans', sans-serif`;
          ctx.fillStyle = nightMode
            ? 'rgba(252, 165, 165, 0.85)'
            : arMode
            ? 'rgba(240, 249, 255, 0.95)'
            : 'rgba(203, 213, 225, 0.75)';
          ctx.fillText(star.name, pt.x + radius + 4, pt.y - 2);
        }
      });
      ctx.restore();

      // Ecliptic Path
      if (showEcliptic) {
        ctx.save();
        ctx.lineWidth = arMode ? 1.5 : 1.2;
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = nightMode
          ? 'rgba(239, 68, 68, 0.45)'
          : arMode
          ? 'rgba(251, 191, 36, 0.65)'
          : 'rgba(245, 158, 11, 0.35)';

        ctx.beginPath();
        let started = false;
        for (let l = 0; l <= 360; l += 5) {
          const eps = (23.439291 * Math.PI) / 180;
          const lRad = (l * Math.PI) / 180;
          const sinDec = Math.sin(eps) * Math.sin(lRad);
          const dec = (Math.asin(sinDec) * 180) / Math.PI;
          const y = Math.sin(lRad) * Math.cos(eps);
          const x = Math.cos(lRad);
          let ra = (Math.atan2(y, x) * 180) / Math.PI;
          if (ra < 0) ra += 360;

          const horiz = equatorialToHorizontal(ra, dec, latitude, lst);
          const pt = altAzToCanvas(horiz.alt, horiz.az, width, height, camAlt, camAz, camZoom);

          if (pt.visible) {
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
        ctx.stroke();
        ctx.restore();
      }

      // Nakshatras: Shapes & Star Points
      NAKSHATRAS.forEach((nakshatra) => {
        const isSelected = selectedNakshatraId === nakshatra.id;
        const starCanvasPoints: { x: number; y: number; visible: boolean; mag: number; name: string }[] = [];

        nakshatra.shape.stars.forEach((star) => {
          const horiz = equatorialToHorizontal(star.ra, star.dec, latitude, lst);
          const pt = altAzToCanvas(horiz.alt, horiz.az, width, height, camAlt, camAz, camZoom);
          starCanvasPoints.push({
            x: pt.x,
            y: pt.y,
            visible: pt.visible,
            mag: star.mag || 3.0,
            name: star.properName || star.id,
          });
        });

        const hasVisibleStars = starCanvasPoints.some((p) => p.visible);
        if (!hasVisibleStars) return;

        // Asterism Lines
        if (showConstellationLines || isSelected) {
          ctx.save();
          ctx.beginPath();
          ctx.lineWidth = isSelected ? 2.8 : arMode ? 1.6 : 1.2;
          ctx.setLineDash(isSelected ? [] : [4, 4]);

          if (nightMode) {
            ctx.strokeStyle = isSelected ? 'rgba(239, 68, 68, 0.95)' : 'rgba(185, 28, 28, 0.55)';
          } else if (arMode) {
            ctx.strokeStyle = isSelected ? 'rgba(251, 191, 36, 1)' : 'rgba(125, 211, 252, 0.75)';
          } else {
            ctx.strokeStyle = isSelected ? 'rgba(251, 191, 36, 0.95)' : 'rgba(147, 197, 253, 0.45)';
          }

          nakshatra.shape.lines.forEach(([i1, i2]) => {
            const p1 = starCanvasPoints[i1];
            const p2 = starCanvasPoints[i2];
            if (p1 && p2 && p1.visible && p2.visible) {
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
            }
          });
          ctx.stroke();
          ctx.restore();
        }

        // Star Points
        starCanvasPoints.forEach((pt) => {
          if (!pt.visible) return;

          const baseRadius = Math.max(2.2, (4.5 - pt.mag) * 1.5 * Math.sqrt(camZoom));
          const starRadius = isSelected ? baseRadius * 1.4 : baseRadius;

          const halo = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, starRadius * 3.5);
          if (nightMode) {
            halo.addColorStop(0, isSelected ? 'rgba(239, 68, 68, 0.9)' : 'rgba(239, 68, 68, 0.5)');
            halo.addColorStop(1, 'rgba(239, 68, 68, 0)');
          } else if (arMode) {
            halo.addColorStop(0, isSelected ? 'rgba(251, 191, 36, 1)' : 'rgba(186, 230, 253, 0.85)');
            halo.addColorStop(1, 'rgba(56, 189, 248, 0)');
          } else {
            halo.addColorStop(0, isSelected ? 'rgba(251, 191, 36, 0.95)' : 'rgba(199, 210, 254, 0.6)');
            halo.addColorStop(1, isSelected ? 'rgba(245, 158, 11, 0)' : 'rgba(99, 102, 241, 0)');
          }

          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, starRadius * 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, starRadius, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? (nightMode ? '#fee2e2' : '#fffbeb') : nightMode ? '#fca5a5' : '#ffffff';
          ctx.fill();

          if ((isSelected || camZoom > 2.0 || activeZoomTarget === 'text' || activeTextZoom > 1.2) && showStarLabels) {
            ctx.font = `${Math.max(8, Math.round(10 * effectiveTextScale))}px 'Plus Jakarta Sans', sans-serif`;
            ctx.fillStyle = isSelected
              ? nightMode
                ? '#fca5a5'
                : '#fef3c7'
              : arMode
              ? 'rgba(240, 249, 255, 0.9)'
              : 'rgba(203, 213, 225, 0.7)';
            ctx.fillText(pt.name, pt.x + starRadius + 3, pt.y + 3);
          }
        });

        // Label in Devanagari (English)
        const yogataraPt = starCanvasPoints[0];
        if (yogataraPt && yogataraPt.visible) {
          ctx.save();
          const labelY = yogataraPt.y - 12;

          ctx.font = isSelected
            ? `bold ${Math.max(11, Math.round(14 * effectiveTextScale))}px 'Cinzel', serif`
            : `${Math.max(9, Math.round(11 * effectiveTextScale))}px 'Cinzel', serif`;

          if (nightMode) {
            ctx.fillStyle = isSelected ? '#fee2e2' : 'rgba(248, 113, 113, 0.85)';
          } else if (arMode) {
            ctx.fillStyle = isSelected ? '#fde047' : '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 4;
          } else {
            ctx.fillStyle = isSelected ? '#fbbf24' : 'rgba(224, 231, 255, 0.8)';
          }

          const labelText = `${nakshatra.sanskrit} (${nakshatra.name})`;
          ctx.fillText(labelText, yogataraPt.x - 20, labelY);

          if (isSelected) {
            ctx.font = `${Math.max(8, Math.round(10 * effectiveTextScale))}px 'Plus Jakarta Sans', sans-serif`;
            ctx.fillStyle = nightMode ? '#fca5a5' : arMode ? '#93c5fd' : '#93c5fd';
            ctx.fillText(`${nakshatra.symbol} · स्वामी: ${nakshatra.grahaLord}`, yogataraPt.x - 20, labelY + 12 * effectiveTextScale);
          }
          ctx.restore();
        }
      });

      // Planets (Navagrahas)
      if (showPlanets) {
        ctx.save();
        planets.forEach((planet) => {
          const isSelected = selectedPlanetId === planet.id;
          const pt = altAzToCanvas(planet.alt, planet.az, width, height, camAlt, camAz, camZoom);
          if (!pt.visible) return;

          const isSun = planet.id === 'sun';
          const isMoon = planet.id === 'moon';
          const radius = isSun ? 13 : isMoon ? 11 : 7;

          const halo = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius * (arMode ? 4 : 3.5));
          if (nightMode) {
            halo.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
            halo.addColorStop(1, 'rgba(239, 68, 68, 0)');
          } else {
            halo.addColorStop(0, isSun ? 'rgba(245, 158, 11, 0.95)' : `${planet.color}CC`);
            halo.addColorStop(1, `${planet.color}00`);
          }

          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius * (arMode ? 4 : 3.5), 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = nightMode ? '#fee2e2' : planet.color;
          ctx.fill();

          if (isMoon && planet.phase !== undefined && !nightMode) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = arMode ? 'rgba(2, 6, 23, 0.85)' : 'rgba(15, 23, 42, 0.75)';
            const shadowOffset = (planet.phase - 0.5) * radius * 2;
            ctx.beginPath();
            ctx.arc(pt.x + shadowOffset, pt.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          ctx.save();
          ctx.font = `bold ${Math.max(10, Math.round(13 * effectiveTextScale))}px 'Plus Jakarta Sans', sans-serif`;
          ctx.fillStyle = nightMode ? '#fee2e2' : '#ffffff';
          ctx.fillText(planet.symbol, pt.x - 4, pt.y + 4);

          ctx.font = `${isSelected ? 'bold ' : ''}${Math.max(9, Math.round(11 * effectiveTextScale))}px 'Plus Jakarta Sans', sans-serif`;
          ctx.fillStyle = isSelected
            ? nightMode
              ? '#fca5a5'
              : '#fde047'
            : nightMode
            ? '#f87171'
            : '#ffffff';

          if (arMode) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 4;
          }

          ctx.fillText(`${planet.name}`, pt.x + radius + 4, pt.y - 2);

          ctx.font = `${Math.max(8, Math.round(9 * effectiveTextScale))}px 'Plus Jakarta Sans', sans-serif`;
          ctx.fillStyle = nightMode ? '#ef4444' : arMode ? '#cbd5e1' : '#94a3b8';
          ctx.fillText(
            `${planet.nakshatraSanskrit} (${planet.nakshatraName}) P${planet.pada}`,
            pt.x + radius + 4,
            pt.y + 10 * effectiveTextScale
          );
          ctx.restore();

          if (isSelected) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = nightMode ? '#ef4444' : '#fbbf24';
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      // Horizon Line & Compass
      if (showHorizon) {
        ctx.save();
        ctx.lineWidth = arMode ? 2.5 : 2;
        ctx.strokeStyle = nightMode
          ? 'rgba(239, 68, 68, 0.5)'
          : arMode
          ? 'rgba(56, 189, 248, 0.85)'
          : 'rgba(56, 189, 248, 0.4)';

        if (arMode) {
          ctx.shadowColor = 'rgba(14, 165, 233, 0.8)';
          ctx.shadowBlur = 6;
        }

        ctx.beginPath();
        let started = false;
        for (let az = 0; az <= 360; az += 2) {
          const pt = altAzToCanvas(0, az, width, height, camAlt, camAz, camZoom);
          if (pt.visible) {
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
        ctx.stroke();

        // AR Mode Horizon Pitch/Azimuth Tick Marks
        if (arMode) {
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = nightMode ? 'rgba(239, 68, 68, 0.6)' : 'rgba(56, 189, 248, 0.6)';
          for (let az = 0; az < 360; az += 10) {
            const isMajor = az % 45 === 0;
            const tickH = isMajor ? 3 : 1.5;
            const ptTop = altAzToCanvas(tickH, az, width, height, camAlt, camAz, camZoom);
            const ptBot = altAzToCanvas(-tickH, az, width, height, camAlt, camAz, camZoom);
            if (ptTop.visible && ptBot.visible) {
              ctx.beginPath();
              ctx.moveTo(ptTop.x, ptTop.y);
              ctx.lineTo(ptBot.x, ptBot.y);
              ctx.stroke();
            }
          }
        }

        const cardinalPoints = [
          { az: 0, label: 'उत्तर (N) 0°' },
          { az: 45, label: 'उ-पू (NE) 45°' },
          { az: 90, label: 'पूर्व (E) 90°' },
          { az: 135, label: 'द-पू (SE) 135°' },
          { az: 180, label: 'दक्षिण (S) 180°' },
          { az: 225, label: 'द-प (SW) 225°' },
          { az: 270, label: 'पश्चिम (W) 270°' },
          { az: 315, label: 'उ-प (NW) 315°' },
        ];

        cardinalPoints.forEach(({ az, label }) => {
          const pt = altAzToCanvas(0, az, width, height, camAlt, camAz, camZoom);
          if (pt.visible) {
            ctx.save();
            const fontSize = Math.max(9, Math.round(11 * effectiveTextScale));
            ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
            const textWidth = ctx.measureText(label).width;

            // Semi-transparent pill backing for legibility in AR over bright real-world backgrounds
            if (arMode) {
              ctx.fillStyle = nightMode ? 'rgba(20, 2, 2, 0.85)' : 'rgba(2, 6, 23, 0.85)';
              ctx.fillRect(pt.x - textWidth / 2 - 4, pt.y + 6, textWidth + 8, fontSize + 8);
              ctx.strokeStyle = nightMode ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.5)';
              ctx.lineWidth = 1;
              ctx.strokeRect(pt.x - textWidth / 2 - 4, pt.y + 6, textWidth + 8, fontSize + 8);
            }

            ctx.fillStyle = nightMode ? '#fca5a5' : '#38bdf8';
            if (arMode) {
              ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
              ctx.shadowBlur = 4;
            }
            ctx.fillText(label, pt.x - textWidth / 2, pt.y + 8 + fontSize);
            ctx.restore();
          }
        });
        ctx.restore();
      }

      // Center Reticle
      ctx.save();
      const cx = width / 2;
      const cy = height / 2;
      ctx.strokeStyle = nightMode
        ? 'rgba(239, 68, 68, 0.4)'
        : sensorActive
        ? 'rgba(251, 191, 36, 0.6)'
        : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx, cy + 10);
      ctx.stroke();

      if (sensorActive && !isPausedByTouch) {
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.strokeStyle = arMode ? 'rgba(56, 189, 248, 0.5)' : 'rgba(251, 191, 36, 0.3)';
        ctx.setLineDash([2, 4]);
        ctx.stroke();
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
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
    sensorActive,
    isPausedByTouch,
    arMode,
    perspective,
    altAzToCanvas,
  ]);

  // Touch, Drag and Pinch-to-zoom handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Track pointer
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback if pointer capture is unsupported or already active
    }

    if (activePointersRef.current.size === 1) {
      isDraggingRef.current = true;
      hasMovedSignificantRef.current = false;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      panVelocityRef.current = { vx: 0, vy: 0 };
    } else if (activePointersRef.current.size === 2) {
      // Two-finger pinch detected: freeze drag momentum and compute initial pinch span
      isDraggingRef.current = false;
      hasMovedSignificantRef.current = true;
      panVelocityRef.current = { vx: 0, vy: 0 };

      const points = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      initialPinchDistRef.current = dist > 0 ? dist : 1;
      initialPinchZoomRef.current = cameraRef.current.zoom;
      initialPinchTextZoomRef.current = textZoomRef.current;
    }

    if (sensorActive && !isPausedByTouch) {
      setIsPausedByTouch(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activePointersRef.current.has(e.pointerId)) return;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Handle 2-finger pinch to zoom according to zoomTarget option
    if (activePointersRef.current.size >= 2) {
      const points = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);

      if (initialPinchDistRef.current && initialPinchDistRef.current > 0) {
        const scale = currentDist / initialPinchDistRef.current;
        const mode = zoomTargetRef.current;

        if (perspective === 'globe') {
          if (mode === 'both' || mode === '3d') {
            const targetGlobeZoom = Math.max(0.6, Math.min(3.5, initialPinchZoomRef.current * scale));
            globeRef.current.zoom = targetGlobeZoom;
            setZoomLevel(targetGlobeZoom);
          }
          if (mode === 'both' || mode === 'text') {
            const targetTextZoom = Math.max(0.7, Math.min(2.5, initialPinchTextZoomRef.current * scale));
            textZoomRef.current = targetTextZoom;
            setTextZoom(targetTextZoom);
          }
        } else {
          if (mode === 'both' || mode === '3d') {
            const targetZoom = Math.max(0.7, Math.min(4.5, initialPinchZoomRef.current * scale));
            cameraRef.current.zoom = targetZoom;
            setZoomLevel(targetZoom);
          }
          if (mode === 'both' || mode === 'text') {
            const targetTextZoom = Math.max(0.7, Math.min(2.5, initialPinchTextZoomRef.current * scale));
            textZoomRef.current = targetTextZoom;
            setTextZoom(targetTextZoom);
          }
        }
      }
      return;
    }

    // Handle single-finger pan
    if (isDraggingRef.current && activePointersRef.current.size === 1) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (Math.hypot(dx, dy) > 6) {
        hasMovedSignificantRef.current = true;
      }

      if (perspective === 'globe') {
        const sens = 0.22 / globeRef.current.zoom;
        const deltaLon = -dx * sens;
        const deltaLat = dy * sens;

        globeRef.current.lon = (globeRef.current.lon + deltaLon + 360) % 360;
        globeRef.current.lat = Math.max(-85, Math.min(85, globeRef.current.lat + deltaLat));
        globeRef.current.spinVx = deltaLon * 0.4;
        globeRef.current.spinVy = deltaLat * 0.4;

        dragStartRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      const zoom = cameraRef.current.zoom;
      const sensitivity = 0.18 / zoom;

      // Natural direct manipulation:
      // Dragging right pulls celestial view to right (view center az decreases).
      // Dragging down pulls celestial view down (view center alt increases).
      const deltaAz = -dx * sensitivity;
      const deltaAlt = dy * sensitivity;

      cameraRef.current.az = (cameraRef.current.az + deltaAz + 360) % 360;
      cameraRef.current.alt = Math.max(-10, Math.min(88, cameraRef.current.alt + deltaAlt));

      panVelocityRef.current = { vx: deltaAz * 0.65, vy: deltaAlt * 0.65 };

      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    if (activePointersRef.current.size === 1) {
      // Transition from 2-finger pinch back to 1-finger drag seamlessly without jump
      const remainingPoint = Array.from(activePointersRef.current.values())[0];
      dragStartRef.current = { x: remainingPoint.x, y: remainingPoint.y };
      isDraggingRef.current = true;
      panVelocityRef.current = { vx: 0, vy: 0 };
      initialPinchDistRef.current = null;
    } else if (activePointersRef.current.size === 0) {
      isDraggingRef.current = false;
      initialPinchDistRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    const mode = zoomTargetRef.current;

    if (perspective === 'globe') {
      if (mode === 'both' || mode === '3d') {
        const nextGlobeZoom = Math.max(0.6, Math.min(3.5, globeRef.current.zoom + delta));
        globeRef.current.zoom = nextGlobeZoom;
        setZoomLevel(nextGlobeZoom);
      }
      if (mode === 'both' || mode === 'text') {
        const nextText = Math.max(0.7, Math.min(2.5, textZoomRef.current + delta * 0.4));
        textZoomRef.current = nextText;
        setTextZoom(nextText);
      }
      return;
    }

    if (mode === 'both' || mode === '3d') {
      const nextZoom = Math.max(0.7, Math.min(4.5, cameraRef.current.zoom + delta));
      cameraRef.current.zoom = nextZoom;
      setZoomLevel(nextZoom);
    }
    if (mode === 'both' || mode === 'text') {
      const nextText = Math.max(0.7, Math.min(2.5, textZoomRef.current + delta * 0.4));
      textZoomRef.current = nextText;
      setTextZoom(nextText);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // If the user was dragging or pinching, ignore the click to avoid false selections
    if (hasMovedSignificantRef.current) {
      hasMovedSignificantRef.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * window.devicePixelRatio;
    const clickY = (e.clientY - rect.top) * window.devicePixelRatio;

    // Hit test for 3D Earth Globe Perspective Mode
    if (perspective === 'globe') {
      const hit = globeClickTargetsRef.current.find(
        (t) => Math.hypot(clickX - t.x, clickY - t.y) <= Math.max(t.radius * 1.5, 20)
      );

      if (hit) {
        if (hit.type === 'planet') {
          onSelectPlanet(hit.id as string);
          const foundPlanet = planets.find((p) => p.id === hit.id);
          if (foundPlanet) {
            onSelectNakshatra(foundPlanet.nakshatraId);
          }
        } else if (hit.type === 'nakshatra') {
          onSelectNakshatra(hit.id as number);
        } else if (hit.type === 'observer') {
          focusObserverOnGlobe();
        }
      }
      return;
    }

    const jd = getJulianDate(currentDate);
    const t = getJulianCenturies(jd);
    const lst = getLST(jd, t, longitude);
    const width = canvas.width;
    const height = canvas.height;

    const camAz = cameraRef.current.az;
    const camAlt = cameraRef.current.alt;
    const camZoom = cameraRef.current.zoom;

    for (const planet of planets) {
      const pt = altAzToCanvas(planet.alt, planet.az, width, height, camAlt, camAz, camZoom);
      if (pt.visible) {
        const dist = Math.hypot(clickX - pt.x, clickY - pt.y);
        if (dist < 26) {
          onSelectPlanet(planet.id);
          onSelectNakshatra(planet.nakshatraId);
          return;
        }
      }
    }

    for (const nak of NAKSHATRAS) {
      for (const star of nak.shape.stars) {
        const horiz = equatorialToHorizontal(star.ra, star.dec, latitude, lst);
        const pt = altAzToCanvas(horiz.alt, horiz.az, width, height, camAlt, camAz, camZoom);
        if (pt.visible) {
          const dist = Math.hypot(clickX - pt.x, clickY - pt.y);
          if (dist < 28) {
            onSelectNakshatra(nak.id);
            onSelectPlanet(null);
            return;
          }
        }
      }
    }
  };

  const resetView = () => {
    setIsPausedByTouch(false);
    cameraRef.current.az = 180;
    cameraRef.current.alt = 45;
    cameraRef.current.zoom = 1.2;
    setZoomLevel(1.2);
    cameraRef.current.textZoom = 1.0;
    textZoomRef.current = 1.0;
    setTextZoom(1.0);
  };

  const focusOnMoon = () => {
    const moon = planets.find((p) => p.id === 'moon');
    if (moon) {
      setIsPausedByTouch(true);
      cameraRef.current.az = moon.az;
      cameraRef.current.alt = Math.max(5, moon.alt);
      cameraRef.current.zoom = 1.8;
      setZoomLevel(1.8);
      onSelectPlanet('moon');
      onSelectNakshatra(moon.nakshatraId);
    }
  };

  const relockSensor = () => {
    setIsPausedByTouch(false);
  };

  // Align celestial view/sensor to specified reference target
  const alignToDirection = (
    targetAz: number,
    targetAlt?: number,
    label: string = ''
  ) => {
    if (sensorActive) {
      const rawCoords = quaternionToCelestialCoordinates(currentQuatRef.current, 0);
      const rawAz = rawCoords.az;
      let delta = (targetAz - rawAz) % 360;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const newOffset = Math.round(delta);

      setAzimuthCalibrationOffset(newOffset);
      cameraRef.current.calibrationOffset = newOffset;
      setIsPausedByTouch(false);

      setAlignmentToast({
        message: `${label} (${Math.round(targetAz)}°) ${t('toastAlignedTo')}`,
        targetName: label,
        offset: newOffset,
      });
    } else {
      cameraRef.current.az = (targetAz + 360) % 360;
      if (targetAlt !== undefined) {
        cameraRef.current.alt = Math.max(-10, Math.min(85, targetAlt));
      }
      setIsPausedByTouch(false);

      setAlignmentToast({
        message: `${label} (${Math.round(targetAz)}°) ${t('toastAlignedTo')}`,
        targetName: label,
        offset: 0,
      });
    }
  };

  const sun = planets.find((p) => p.id === 'sun');
  const moon = planets.find((p) => p.id === 'moon');

  // Streamlined Zoom controls
  const handleZoomIn = () => {
    const mode = zoomTargetRef.current;
    if (perspective === 'globe') {
      if (mode === 'both' || mode === '3d') {
        const next = Math.min(3.5, globeRef.current.zoom + 0.25);
        globeRef.current.zoom = next;
        setZoomLevel(next);
      }
      if (mode === 'both' || mode === 'text') {
        const nextText = Math.min(2.5, textZoomRef.current + 0.15);
        textZoomRef.current = nextText;
        setTextZoom(nextText);
      }
    } else {
      if (mode === 'both' || mode === '3d') {
        const next = Math.min(4.5, cameraRef.current.zoom + 0.3);
        cameraRef.current.zoom = next;
        setZoomLevel(next);
      }
      if (mode === 'both' || mode === 'text') {
        const nextText = Math.min(2.5, textZoomRef.current + 0.15);
        textZoomRef.current = nextText;
        setTextZoom(nextText);
      }
    }
  };

  const handleZoomOut = () => {
    const mode = zoomTargetRef.current;
    if (perspective === 'globe') {
      if (mode === 'both' || mode === '3d') {
        const next = Math.max(0.6, globeRef.current.zoom - 0.25);
        globeRef.current.zoom = next;
        setZoomLevel(next);
      }
      if (mode === 'both' || mode === 'text') {
        const nextText = Math.max(0.7, textZoomRef.current - 0.15);
        textZoomRef.current = nextText;
        setTextZoom(nextText);
      }
    } else {
      if (mode === 'both' || mode === '3d') {
        const next = Math.max(0.7, cameraRef.current.zoom - 0.3);
        cameraRef.current.zoom = next;
        setZoomLevel(next);
      }
      if (mode === 'both' || mode === 'text') {
        const nextText = Math.max(0.7, textZoomRef.current - 0.15);
        textZoomRef.current = nextText;
        setTextZoom(nextText);
      }
    }
  };

  const cycleZoomMode = () => {
    const nextMode = zoomTarget === 'both' ? '3d' : zoomTarget === '3d' ? 'text' : 'both';
    setZoomTarget(nextMode);
    setAlignmentToast({
      message: `${t('zoomModeActive')}: ${
        nextMode === 'both'
          ? t('zoomTargetBothShort')
          : nextMode === '3d'
          ? t('zoomTarget3DShort')
          : t('zoomTargetTextShort')
      }`,
      targetName: 'Zoom Mode',
      offset: 0,
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none touch-none bg-black">
      {/* Live Video Camera Background Feed for AR Mode */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-500 ${
          arMode ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      />

      {/* Overlay Canvas for Real-Time Starmap & Nakshatras */}
      <canvas
        ref={canvasRef}
        className="relative z-10 w-full h-full cursor-grab active:cursor-grabbing block touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      />

      {/* Floating HUD Controls (Right Side) - Sleek, Unified 4-Button Dock */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex flex-col items-center bg-gray-950/85 backdrop-blur-md border border-gray-800 rounded-xl p-0.5 shadow-xl">
          <button
            onClick={handleZoomIn}
            title={`${t('zoomTargetBothShort')} (+)`}
            className="p-2 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-gray-800/60 active:scale-95 transition-all"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleZoomOut}
            title={`${t('zoomTargetBothShort')} (-)`}
            className="p-2 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-gray-800/60 active:scale-95 transition-all"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Contextual Action Button based on active 3D perspective */}
          {perspective === 'globe' ? (
            <button
              onClick={focusObserverOnGlobe}
              title={t('resetGlobeView')}
              className="p-2 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-500/25 active:scale-95 transition-all flex items-center justify-center"
              aria-label="Center Observer on Globe"
            >
              <MapPin className="w-4 h-4" />
            </button>
          ) : perspective === 'ar' ? (
            <button
              onClick={switchCamera}
              disabled={isCameraLoading}
              title={
                facingMode === 'environment'
                  ? 'आगे का कैमरा (Switch to Front Camera)'
                  : 'पिछला कैमरा (Switch to Rear Camera)'
              }
              className="p-2 rounded-lg text-sky-300 hover:text-white hover:bg-sky-500/25 active:scale-95 transition-all flex items-center justify-center"
              aria-label="Switch Camera"
            >
              <RefreshCw className={`w-4 h-4 ${isCameraLoading ? 'animate-spin' : ''}`} />
            </button>
          ) : (
            <button
              onClick={toggleSensor}
              title={
                sensorActive
                  ? 'सेंसर दिशा निष्क्रिय करें (Disable Quaternion Navigation)'
                  : 'क्वाटर्नियन सेंसर नेविगेशन सक्रिय करें (Enable Quaternion Navigation)'
              }
              className={`p-2 rounded-lg active:scale-95 transition-all flex items-center justify-center ${
                sensorActive
                  ? isPausedByTouch
                    ? 'text-amber-400 bg-amber-500/20'
                    : 'text-emerald-400 bg-emerald-500/20 ring-1 ring-emerald-500/40'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-gray-800/60'
              }`}
              aria-label="Toggle Mobile Sensors"
            >
              <Navigation2
                className={`w-4 h-4 transition-transform ${
                  sensorActive && !isPausedByTouch ? 'text-emerald-400 animate-pulse' : ''
                }`}
              />
            </button>
          )}

          {/* Reset View */}
          <button
            onClick={resetView}
            title="Reset View (दृश्य रीसेट)"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-gray-800/60 active:scale-95 transition-all flex items-center justify-center"
            aria-label="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Left: Real-Time Compass & Elevation HUD / Globe Status HUD */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 max-w-[280px] sm:max-w-md">
        {perspective === 'globe' ? (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-200 bg-gray-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/50 shadow-md flex-wrap">
            <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-300">
              {t('perspectiveGlobe')}
            </span>
            <span className="text-gray-600">·</span>
            <span>
              {globeRef.current.lat >= 0 ? `${globeRef.current.lat.toFixed(0)}°N` : `${Math.abs(globeRef.current.lat).toFixed(0)}°S`},{' '}
              {globeRef.current.lon.toFixed(0)}°
            </span>
            <span className="text-gray-600">·</span>
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-emerald-300">
                {zoomTarget === 'text' ? `Text: ${textZoom.toFixed(1)}x` : `Globe: ${zoomLevel.toFixed(1)}x`}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold border ${
                  zoomTarget === 'both'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : zoomTarget === '3d'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {zoomTarget === 'both' ? '3D+Text' : zoomTarget === '3d' ? '3D' : 'Text Only'}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-200 bg-gray-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-800/80 shadow-md flex-wrap">
            <Compass className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-amber-300">
              {hudState.az}° {hudState.cardinal.devanagari} ({hudState.cardinal.english})
            </span>
            <span className="text-gray-600">·</span>
            <span>उन्नतांश (Alt): {hudState.alt}°</span>
            <span className="text-gray-600">·</span>
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-amber-300">
                {zoomTarget === 'text' ? `Text: ${textZoom.toFixed(1)}x` : `${zoomLevel.toFixed(1)}x`}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold border ${
                  zoomTarget === 'both'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : zoomTarget === '3d'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {zoomTarget === 'both' ? '3D+Text' : zoomTarget === '3d' ? '3D Sky' : 'Text Only'}
              </span>
              {zoomTarget === 'both' && textZoom !== 1.0 && (
                <span className="text-[9px] text-emerald-400 font-bold">
                  (T:{textZoom.toFixed(1)}x)
                </span>
              )}
            </span>
          </div>
        )}

        {/* AR Mode Active Badge with Pitch Guidance */}
        {arMode && (
          <div className="flex items-center gap-2 text-[11px] bg-sky-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-sky-500/60 text-sky-200 shadow-md">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping shrink-0" />
            <span className="font-semibold text-sky-100">
              📷 एआर कैमरा क्षितिज दृश्य (AR Horizon Active)
            </span>
            <span className="text-sky-500">·</span>
            <span className="text-[10px] text-sky-300 font-medium">
              {hudState.alt >= 15
                ? '✨ आकाश (Overhead)'
                : hudState.alt >= -10
                ? '🌅 क्षितिज (Horizon Aligned)'
                : '🌍 भू-भाग (Below Horizon)'}
            </span>
          </div>
        )}

        {/* Sensor Status Indicator Badge */}
        {sensorActive && !arMode && (
          <div className="flex items-center gap-2 text-[11px] bg-gray-950/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-gray-800 text-slate-300 shadow-md">
            <span
              className={`w-2 h-2 rounded-full ${
                isPausedByTouch ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
              }`}
            />
            {isPausedByTouch ? (
              <span className="text-amber-300">
                स्पर्श द्वारा रोका गया (Touch Paused)
              </span>
            ) : (
              <span className="text-emerald-300 font-medium">
                क्वाटर्नियन सेंसर सक्रिय (Quaternion SLERP 60fps)
              </span>
            )}

            {isPausedByTouch && (
              <button
                onClick={relockSensor}
                className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-semibold"
              >
                <Lock className="w-2.5 h-2.5" />
                पुनः लॉक (Re-lock)
              </button>
            )}
          </div>
        )}

        {cameraError && (
          <div className="flex items-center gap-1.5 text-[11px] bg-rose-950/90 text-rose-300 px-2.5 py-1.5 rounded-lg border border-rose-800 shadow-md">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

        {permissionError && (
          <div className="flex items-center gap-1.5 text-[11px] bg-rose-950/80 text-rose-300 px-2.5 py-1 rounded border border-rose-800">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{permissionError}</span>
          </div>
        )}
      </div>

      {/* Floating Alignment Confirmation Toast */}
      {alignmentToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 max-w-sm pointer-events-none animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-950/95 backdrop-blur-md border border-emerald-500/70 text-emerald-200 text-xs shadow-2xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-white">{alignmentToast.message}</span>
              <span className="ml-1.5 text-[10px] text-emerald-300 font-mono">
                ({alignmentToast.offset > 0 ? `+${alignmentToast.offset}` : alignmentToast.offset}°)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation & AR Settings / Calibration Modal */}
      {isCalibrateModalOpen && (
        <div className="absolute top-16 right-3 sm:right-4 w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm max-h-[82vh] overflow-y-auto p-4 rounded-2xl bg-gray-950/95 backdrop-blur-xl border border-gray-800 shadow-2xl z-30 space-y-3.5 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-800">
            <div className="flex items-center gap-2 text-slate-100 font-semibold">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-400">{t('settingsTitle')}</h3>
                <p className="text-[10px] text-slate-400">{t('settingsSubtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsCalibrateModalOpen(false);
                onToggleSettings?.();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-gray-800 transition-colors"
              title={t('closeSettings')}
              aria-label="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Toast inside modal if recently aligned */}
          {alignmentToast && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 flex items-start gap-2 shadow-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <div className="font-semibold text-emerald-300">{alignmentToast.message}</div>
                <div className="text-[10px] text-emerald-400/80 font-mono">
                  {t('toastOffset')}: {alignmentToast.offset > 0 ? `+${alignmentToast.offset}` : alignmentToast.offset}°
                </div>
              </div>
            </div>
          )}

          {/* Dedicated Localization / Language Selection Section */}
          <div className="p-3 rounded-xl bg-gray-900/85 border border-amber-500/40 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px]">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('languageTitle')}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1">
                <span>{languages.find((l) => l.code === language)?.flag}</span>
                <span>{languages.find((l) => l.code === language)?.nativeName}</span>
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              {t('languageSubtitle')}
            </p>

            {/* 3 Main Supported Languages: Hindi, Marathi, English */}
            <div className="grid grid-cols-3 gap-1.5">
              {languages.map((item) => {
                const isSelected = language === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setLanguage(item.code)}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-md ring-1 ring-amber-400/50 font-bold'
                        : 'bg-gray-950/70 border-gray-800 text-slate-300 hover:border-gray-700 hover:text-white hover:bg-gray-800/60'
                    }`}
                  >
                    <span className="text-sm">{item.flag}</span>
                    <span className="text-xs tracking-wide">{item.nativeName}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Upcoming Indian Languages Dropdown / Preview */}
            <div className="pt-1.5 border-t border-gray-800/80">
              <button
                type="button"
                onClick={() => setShowUpcomingLanguages((prev) => !prev)}
                className="w-full flex items-center justify-between text-[10px] text-slate-400 hover:text-amber-300 transition-colors py-0.5"
              >
                <div className="flex items-center gap-1.5">
                  <Languages className="w-3 h-3 text-amber-400" />
                  <span>{t('upcomingLanguagesTitle')}</span>
                </div>
                {showUpcomingLanguages ? (
                  <ChevronUp className="w-3 h-3 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                )}
              </button>

              {showUpcomingLanguages && (
                <div className="mt-2 space-y-1.5 p-2 rounded-lg bg-gray-950/80 border border-gray-800/90 animate-in fade-in">
                  <p className="text-[10px] text-slate-400">
                    {t('upcomingLanguagesNote')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {upcomingLanguages.map((up) => (
                      <span
                        key={up.code}
                        className="px-1.5 py-0.5 rounded-md bg-gray-900 border border-gray-800 text-[10px] text-slate-300"
                        title={up.name}
                      >
                        {up.nativeName} <span className="text-[8px] text-slate-500 font-mono">({up.name})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Perspective Status (Switched via Top Header) */}
          <div className="p-3 rounded-xl bg-gray-900/85 border border-indigo-500/40 space-y-1.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('perspectiveMode')}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold">
                {perspective === 'globe'
                  ? t('perspectiveGlobe')
                  : perspective === 'ar'
                  ? t('perspectiveAR')
                  : t('perspectiveSky')}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              {perspective === 'globe'
                ? t('perspectiveGlobeDesc')
                : perspective === 'ar'
                ? t('perspectiveARDesc')
                : t('perspectiveSkyDesc')}
            </p>
          </div>

          {/* Zoom Target Options Section (3D Sky vs Text Labels) */}
          <div className="p-3 rounded-xl bg-gray-900/85 border border-indigo-500/40 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('zoomTargetSectionTitle')}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold flex items-center gap-1">
                {zoomTarget === 'both' ? (
                  <span>3D: {zoomLevel.toFixed(1)}x · Text: {textZoom.toFixed(1)}x</span>
                ) : zoomTarget === '3d' ? (
                  <span>3D: {zoomLevel.toFixed(1)}x</span>
                ) : (
                  <span>Text: {textZoom.toFixed(1)}x</span>
                )}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              {t('zoomTargetSectionDesc')}
            </p>

            {/* 3 Zoom Mode Options: Both, 3D Sky Only, Text Only */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setZoomTarget('both')}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${
                  zoomTarget === 'both'
                    ? 'bg-indigo-500/25 border-indigo-400 text-indigo-200 shadow-md ring-1 ring-indigo-400/50 font-bold'
                    : 'bg-gray-950/70 border-gray-800 text-slate-300 hover:border-gray-700 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] leading-tight font-medium">{t('zoomTargetBothShort')}</span>
                <span className="text-[9px] text-slate-400 leading-none">3D + Text</span>
              </button>

              <button
                type="button"
                onClick={() => setZoomTarget('3d')}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${
                  zoomTarget === '3d'
                    ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-md ring-1 ring-sky-400/50 font-bold'
                    : 'bg-gray-950/70 border-gray-800 text-slate-300 hover:border-gray-700 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <Globe className="w-4 h-4 text-sky-400" />
                <span className="text-[11px] leading-tight font-medium">{t('zoomTarget3DShort')}</span>
                <span className="text-[9px] text-slate-400 leading-none">3D Only</span>
              </button>

              <button
                type="button"
                onClick={() => setZoomTarget('text')}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${
                  zoomTarget === 'text'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-md ring-1 ring-emerald-400/50 font-bold'
                    : 'bg-gray-950/70 border-gray-800 text-slate-300 hover:border-gray-700 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <Type className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] leading-tight font-medium">{t('zoomTargetTextShort')}</span>
                <span className="text-[9px] text-slate-400 leading-none">Text Only</span>
              </button>
            </div>

            {/* Description of active selection */}
            <div className="p-2 rounded-lg bg-gray-950/80 border border-gray-800/80 text-[10px] text-slate-300 leading-relaxed">
              {zoomTarget === 'both' && (
                <span>🌟 {t('zoomTargetBothDesc')}</span>
              )}
              {zoomTarget === '3d' && (
                <span>🔭 {t('zoomTarget3DDesc')}</span>
              )}
              {zoomTarget === 'text' && (
                <span>🔤 {t('zoomTargetTextDesc')}</span>
              )}
            </div>

            {/* Dual Sliders: 3D Sky Zoom & Text Label Scale */}
            <div className="space-y-2.5 pt-1.5 border-t border-gray-800/80">
              {/* 3D Sky Zoom Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="font-medium flex items-center gap-1">
                    <Globe className="w-3 h-3 text-sky-400" />
                    <span>{t('zoomScale3DLabel')}</span>
                  </span>
                  <span className="font-mono text-sky-300 font-bold text-[11px]">
                    {zoomLevel.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="4.5"
                  step="0.1"
                  value={zoomLevel}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    cameraRef.current.zoom = val;
                    setZoomLevel(val);
                  }}
                  className="w-full accent-sky-400 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px] text-slate-500">
                  <span>0.7x (Wide)</span>
                  <span>1.2x (Normal)</span>
                  <span>4.5x (Tele)</span>
                </div>
              </div>

              {/* Text Label Scale Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="font-medium flex items-center gap-1">
                    <Type className="w-3 h-3 text-emerald-400" />
                    <span>{t('zoomScaleTextLabel')}</span>
                  </span>
                  <span className="font-mono text-emerald-300 font-bold text-[11px]">
                    {textZoom.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="2.5"
                  step="0.1"
                  value={textZoom}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    textZoomRef.current = val;
                    cameraRef.current.textZoom = val;
                    setTextZoom(val);
                  }}
                  className="w-full accent-emerald-400 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px] text-slate-500">
                  <span>0.7x (Compact)</span>
                  <span>1.0x (Normal)</span>
                  <span>2.5x (Large)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tooltip Help Checkbox Section */}
          <div className="p-3 rounded-xl bg-gray-900/85 border border-sky-500/40 space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sky-300 font-semibold text-[11px]">
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('tooltipHelpTitle')}</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold transition-all ${
                  showTooltipHelp
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-gray-950/80 text-slate-500 border-gray-800'
                }`}
              >
                {showTooltipHelp ? t('tooltipHelpActive') : t('tooltipHelpDisabled')}
              </span>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none group p-2 rounded-xl bg-gray-950/70 border border-gray-800/80 hover:border-sky-500/40 hover:bg-gray-900/80 transition-all">
              <input
                type="checkbox"
                checked={showTooltipHelp}
                onChange={(e) => {
                  const val = e.target.checked;
                  setShowTooltipHelp(val);
                  setAlignmentToast({
                    message: val ? t('tooltipHelpActive') : t('tooltipHelpDisabled'),
                    targetName: 'Tooltips',
                    offset: 0,
                  });
                }}
                className="mt-0.5 w-4 h-4 rounded border-gray-700 bg-gray-900 text-sky-500 focus:ring-sky-400 focus:ring-offset-gray-950 accent-sky-500 cursor-pointer"
              />
              <div className="space-y-0.5 flex-1">
                <div className="text-[11px] font-medium text-slate-200 group-hover:text-white transition-colors">
                  {t('tooltipHelpCheckboxLabel')}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {t('tooltipHelpDesc')}
                </p>
              </div>
            </label>
          </div>

          {/* User Instructions: 2-step alignment workflow */}
          <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-300 font-medium text-[11px]">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('alignmentGuideTitle')}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {t('alignmentStep1')}
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {t('alignmentStep2')}
            </p>
          </div>

          {/* 1. Alignment Buttons Section */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>{t('quickAlignTitle')}</span>
              {sensorActive ? (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {t('sensorActiveLabel')}
                </span>
              ) : (
                <span className="text-[10px] text-amber-400">{t('manualModeLabel')}</span>
              )}
            </div>

            {/* A. Align towards Sun Button */}
            {sun && (
              <button
                onClick={() => alignToDirection(sun.az, sun.alt, t('alignToSun'))}
                className="w-full p-2.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-amber-900/40 to-gray-900/80 border border-amber-500/50 hover:border-amber-400 text-left transition-all active:scale-[0.98] shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
                      <Sun className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-amber-200 flex items-center gap-1.5">
                        <span>{t('alignToSun')}</span>
                        {sun.alt >= 0 ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40 font-normal">
                            {t('sunDayVisible')}
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-slate-400 font-normal">
                            {t('sunBelowHorizon')}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {t('azimuth')}: {Math.round(sun.az)}° ({getCardinalDirection(sun.az).devanagari}) · {t('altitude')}: {Math.round(sun.alt)}°
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/20 px-2 py-1 rounded-md border border-amber-500/30 shrink-0">
                    {t('alignSunBtn')}
                  </span>
                </div>
              </button>
            )}

            {/* B. Four Cardinal Directions Grid: North, West, South, East */}
            <div className="grid grid-cols-2 gap-2">
              {/* North */}
              <button
                onClick={() => alignToDirection(0, 0, `${t('north')} · 0°`)}
                className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800/90 border border-sky-500/30 hover:border-sky-400 text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sky-200">{t('north')}</span>
                  <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/30">
                    0°
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{t('pointNorth')}</div>
              </button>

              {/* West */}
              <button
                onClick={() => alignToDirection(270, 0, `${t('west')} · 270°`)}
                className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800/90 border border-indigo-500/30 hover:border-indigo-400 text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-200">{t('west')}</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/30">
                    270°
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{t('pointWest')}</div>
              </button>

              {/* South */}
              <button
                onClick={() => alignToDirection(180, 0, `${t('south')} · 180°`)}
                className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800/90 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-200">{t('south')}</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    180°
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{t('pointSouth')}</div>
              </button>

              {/* East */}
              <button
                onClick={() => alignToDirection(90, 0, `${t('east')} · 90°`)}
                className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800/90 border border-amber-500/30 hover:border-amber-400 text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-200">{t('east')}</span>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                    90°
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{t('pointEast')}</div>
              </button>
            </div>

            {/* C. Moon Align Option */}
            {moon && (
              <button
                onClick={() => alignToDirection(moon.az, moon.alt, t('alignToMoon'))}
                className="w-full p-2 rounded-xl bg-gray-900/60 hover:bg-gray-800/70 border border-gray-800 hover:border-indigo-500/40 text-left transition-all active:scale-[0.98] flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-indigo-300" />
                  <span className="text-slate-300 font-medium">{t('alignToMoon')}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {Math.round(moon.az)}° ({moon.alt >= 0 ? t('moonAboveHorizon') : t('moonBelowHorizon')})
                </div>
              </button>
            )}
          </div>

          {/* 2. Sensor Auto-Panning Sensitivity Section */}
          <div className="pt-2 border-t border-gray-800/80 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-1.5 font-medium text-[11px]">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('sensitivityTitle')}</span>
              </div>
              <span
                className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${
                  sensorSensitivity <= 0.6
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                    : sensorSensitivity <= 1.1
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : sensorSensitivity <= 1.8
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {sensorSensitivity.toFixed(1)}x ·{' '}
                {sensorSensitivity <= 0.6
                  ? `${t('smooth')} (Smooth)`
                  : sensorSensitivity <= 1.1
                  ? `${t('balanced')} (Normal)`
                  : sensorSensitivity <= 1.8
                  ? `${t('fast')} (Fast)`
                  : `${t('ultra')} (Ultra)`}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal">
              {t('sensitivityDesc')}
            </p>

            <div className="space-y-1">
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={sensorSensitivity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSensorSensitivity(val);
                  cameraRef.current.sensorSensitivity = val;
                  try {
                    localStorage.setItem('skymap_sensor_sensitivity', val.toString());
                  } catch {}
                }}
                className="w-full accent-amber-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>0.4x ({t('smooth')})</span>
                <span>1.0x ({t('balanced')})</span>
                <span>2.5x ({t('fast')})</span>
              </div>
            </div>
          </div>

          {/* 3. Manual Fine-Tuning Slider */}
          <div className="pt-2 border-t border-gray-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[11px] font-medium">{t('fineOffsetTitle')}</span>
              <span className="font-mono text-amber-300 font-bold text-[11px]">
                {azimuthCalibrationOffset > 0 ? `+${azimuthCalibrationOffset}` : azimuthCalibrationOffset}°
              </span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={azimuthCalibrationOffset}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setAzimuthCalibrationOffset(val);
                cameraRef.current.calibrationOffset = val;
              }}
              className="w-full accent-amber-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>-180° (W)</span>
              <span>0° ({t('north')} · 0°)</span>
              <span>+180° (E)</span>
            </div>
          </div>

          {/* 3. AR Settings (if AR is active) */}
          {arMode && (
            <div className="pt-2 border-t border-gray-800/80 space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[11px] font-medium">{t('arDimmerTitle')}</span>
                <span className="font-mono text-sky-300 font-bold text-[11px]">
                  {Math.round(arDimmer * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.7"
                step="0.05"
                value={arDimmer}
                onChange={(e) => setArDimmer(parseFloat(e.target.value))}
                className="w-full accent-sky-400 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={switchCamera}
                  className="flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-white bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-800"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{t('switchCamera')} ({facingMode === 'environment' ? t('rearCamera') : t('frontCamera')})</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. Action Buttons: Reset Offset & Sensor Re-lock */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-800/80">
            <button
              onClick={() => {
                setAzimuthCalibrationOffset(0);
                cameraRef.current.calibrationOffset = 0;
                setAlignmentToast({
                  message: t('toastOffsetReset'),
                  targetName: 'Reset',
                  offset: 0,
                });
              }}
              className="py-1.5 px-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-slate-300 border border-gray-800 text-[11px] font-medium transition-colors text-center"
            >
              {t('resetOffset')}
            </button>
            <button
              onClick={() => {
                setIsPausedByTouch(false);
                if (!sensorActive) {
                  toggleSensor();
                }
              }}
              className="py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-medium transition-colors text-center"
            >
              {sensorActive && !isPausedByTouch ? t('sensorLocked') : t('relockSensor')}
            </button>
          </div>
        </div>
      )}

      {/* Helper Ribbon on Bottom Left (Controlled by Tooltip Help Checkbox Setting) */}
      {showTooltipHelp && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none max-w-xs sm:max-w-md text-xs text-slate-300 flex items-center gap-2 bg-gray-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-sky-500/30 shadow-lg animate-in fade-in transition-all">
          <HelpCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-200">
              {perspective === 'globe'
                ? t('perspectiveGlobe')
                : arMode
                ? t('helperAr')
                : sensorActive
                ? t('helperSensor')
                : t('helperTouch')}
            </span>
            <span className="text-[9.5px] text-slate-400 leading-tight">
              {perspective === 'globe'
                ? t('globeRotateHint')
                : t('gestureGuideTooltip')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
