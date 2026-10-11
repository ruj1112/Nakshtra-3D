import { TransitNotification, PlanetPosition } from '../types/astronomy';
import { NAKSHATRAS } from '../data/nakshatrasData';

const NOTIFICATION_STORAGE_KEY = 'nakshatra_notifications_settings_v1';
const NOTIFICATION_HISTORY_KEY = 'nakshatra_notifications_history_v1';

export interface NotificationSettings {
  enabled: boolean;
  moonIngress: boolean;
  majorPlanets: boolean;
  eclipses: boolean;
  retrogrades: boolean;
  leadTimeHours: number; // 1, 6, 24
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  moonIngress: true,
  majorPlanets: true,
  eclipses: true,
  retrogrades: true,
  leadTimeHours: 1,
};

export function getStoredNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (raw) return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

export function triggerPushNotification(
  title: string,
  body: string,
  iconUrl?: string,
  tag?: string
): boolean {
  if (!isNotificationSupported()) return false;

  if (Notification.permission === 'granted') {
    try {
      const options: NotificationOptions & { vibrate?: number[] } = {
        body,
        icon: iconUrl || '/favicon.ico',
        badge: '/favicon.ico',
        tag: tag || `nakshatra-transit-${Date.now()}`,
        requireInteraction: false,
      };

      const notif = new Notification(title, options);
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch (err) {
      console.warn('Native notification spawn failed, fallback to in-app event:', err);
      return false;
    }
  }
  return false;
}

// Calculate upcoming transits relative to the reference date
export function computeUpcomingTransits(date: Date, planets: PlanetPosition[]): TransitNotification[] {
  const transits: TransitNotification[] = [];
  const nowMs = date.getTime();

  const moon = planets.find((p) => p.id === 'moon');
  if (moon) {
    // Moon moves approx 13.176 degrees per day (0.549 deg/hr)
    const currentNakshatra = NAKSHATRAS.find((n) => n.id === moon.nakshatraId) || NAKSHATRAS[0];
    const nakshatraEnd = currentNakshatra.endDeg;
    let degRemaining = nakshatraEnd - moon.siderealLongitude;
    if (degRemaining < 0) degRemaining += 360;

    const hoursUntilNext = Math.max(0.2, degRemaining / 0.549);
    const nextNakshatraIndex = (currentNakshatra.id % 27);
    const nextNakshatra = NAKSHATRAS[nextNakshatraIndex];

    const nextTransitTime = new Date(nowMs + hoursUntilNext * 3600 * 1000);

    transits.push({
      id: `moon-transit-${nextNakshatra.id}-${Math.round(nextTransitTime.getTime() / 100000)}`,
      title: `चन्द्र गोचर (Chandra Ingress): चन्द्र (Moon) enters ${nextNakshatra.sanskrit} (${nextNakshatra.name})`,
      body: `चन्द्र (Moon) transits from ${currentNakshatra.sanskrit} (${currentNakshatra.name}) into ${nextNakshatra.sanskrit} (${nextNakshatra.name}). स्वामी: ${nextNakshatra.grahaLord}. देवता: ${nextNakshatra.deity}.`,
      eventTime: nextTransitTime.toISOString(),
      type: 'moon_ingress',
      planet: 'चन्द्र (Moon)',
      targetNakshatra: `${nextNakshatra.sanskrit} (${nextNakshatra.name})`,
      significance: `Auspicious window for ${nextNakshatra.qualities.toLowerCase()}. Pada 1 begins in ${nextNakshatra.padas[0].navamsha}.`,
      isRead: false,
      scheduledTime: nextTransitTime.getTime(),
    });

    // Also subsequent moon transit
    const subsequentHours = hoursUntilNext + 24.3;
    const thirdNakshatraIndex = ((nextNakshatraIndex + 1) % 27);
    const thirdNakshatra = NAKSHATRAS[thirdNakshatraIndex];
    const subsequentTime = new Date(nowMs + subsequentHours * 3600 * 1000);

    transits.push({
      id: `moon-transit-${thirdNakshatra.id}-${Math.round(subsequentTime.getTime() / 100000)}`,
      title: `चन्द्र गोचर (Chandra Ingress): चन्द्र (Moon) enters ${thirdNakshatra.sanskrit} (${thirdNakshatra.name})`,
      body: `चन्द्र (Moon) continues cosmic orbit into ${thirdNakshatra.sanskrit} (${thirdNakshatra.name}). प्रतीक: ${thirdNakshatra.symbol}.`,
      eventTime: subsequentTime.toISOString(),
      type: 'moon_ingress',
      planet: 'चन्द्र (Moon)',
      targetNakshatra: `${thirdNakshatra.sanskrit} (${thirdNakshatra.name})`,
      significance: thirdNakshatra.qualities,
      isRead: false,
      scheduledTime: subsequentTime.getTime(),
    });
  }

  // Sun Sankranti transit
  const sun = planets.find((p) => p.id === 'sun');
  if (sun) {
    const sunRashiDeg = sun.rashiDeg;
    const daysUntilNextRashi = (30 - sunRashiDeg) / 0.9856; // Sun moves ~0.9856 deg/day
    const sunSankrantiTime = new Date(nowMs + daysUntilNextRashi * 24 * 3600 * 1000);

    transits.push({
      id: `sun-sankranti-${Math.round(sunSankrantiTime.getTime() / 100000)}`,
      title: `सूर्य संक्रांति (Surya Sankranti): सूर्य (Sun) enters next Rashi`,
      body: `सूर्य (Sun) completes its transit through ${sun.rashi} and enters the next zodiac sign, marking a seasonal and spiritual solar ingress.`,
      eventTime: sunSankrantiTime.toISOString(),
      type: 'planet_ingress',
      planet: 'सूर्य (Sun)',
      significance: 'Traditional holy day for meditation, charity, Surya Namaskar, and spiritual renewal.',
      isRead: false,
      scheduledTime: sunSankrantiTime.getTime(),
    });
  }

  // Jupiter or Saturn transit landmark
  transits.push({
    id: 'jupiter-retrograde-station',
    title: 'बृहस्पति स्थिति परिवर्तन (Jupiter Station & Motion Shift)',
    body: 'बृहस्पति (Jupiter) stabilizes its orbital arc in the sidereal sky, intensifying dharmic insights, philosophical study, and moral resolution.',
    eventTime: new Date(nowMs + 7 * 24 * 3600 * 1000).toISOString(),
    type: 'retrograde',
    planet: 'बृहस्पति (Jupiter)',
    significance: 'Optimal period for reassessing long-term educational goals, mentors, and ethical investments.',
    isRead: false,
    scheduledTime: nowMs + 7 * 24 * 3600 * 1000,
  });

  transits.push({
    id: 'upcoming-lunar-eclipse',
    title: 'आगामी चन्द्र ग्रहण (Upcoming Lunar Eclipse / Chandra Grahan)',
    body: 'चन्द्र (Moon) aligns with Rahu-Ketu nodal axis, creating an astronomical shadow transit visible in the nighttime sky.',
    eventTime: new Date(nowMs + 21 * 24 * 3600 * 1000).toISOString(),
    type: 'eclipse',
    planet: 'चन्द्र एवं नोड्स (Moon & Nodes)',
    significance: 'Cosmic shadow period recommended for intense inner sadhana, mantra chanting, and fasting.',
    isRead: false,
    scheduledTime: nowMs + 21 * 24 * 3600 * 1000,
  });

  return transits;
}
