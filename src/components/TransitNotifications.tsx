import React, { useState, useEffect } from 'react';
import { TransitNotification, PlanetPosition } from '../types/astronomy';
import {
  getNotificationPermission,
  requestNotificationPermission,
  triggerPushNotification,
  computeUpcomingTransits,
  getStoredNotificationSettings,
  saveNotificationSettings,
  NotificationSettings,
} from '../services/notificationService';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Sparkles,
  Sliders,
  Send,
  AlertTriangle,
  Moon,
  Sun,
  Radio,
} from 'lucide-react';

interface TransitNotificationsProps {
  currentDate: Date;
  planets: PlanetPosition[];
  onSelectNakshatraByName?: (name: string) => void;
}

export const TransitNotifications: React.FC<TransitNotificationsProps> = ({
  currentDate,
  planets,
  onSelectNakshatraByName,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>(getStoredNotificationSettings());
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [transits, setTransits] = useState<TransitNotification[]>([]);

  useEffect(() => {
    setPermission(getNotificationPermission());
    setTransits(computeUpcomingTransits(currentDate, planets));
  }, [currentDate, planets]);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      triggerPushNotification(
        '🌟 Nakshatra Darpana Alerts Active',
        'Push notifications enabled for upcoming celestial transits and planetary ingresses.'
      );
      setTestSuccess('Push notifications successfully enabled!');
      setTimeout(() => setTestSuccess(null), 4000);
    }
  };

  const handleTestNotification = () => {
    const success = triggerPushNotification(
      '🌙 Chandra Ingress Alert',
      'Chandra has entered Rohini Nakshatra (Pada 1). Presiding deity: Brahma / Prajapati. Lord: Moon.'
    );

    if (success) {
      setTestSuccess('Push notification dispatched to your system banner!');
    } else {
      setTestSuccess(
        permission === 'granted'
          ? 'Notification sent!'
          : 'Please enable notifications in your browser first.'
      );
    }
    setTimeout(() => setTestSuccess(null), 4000);
  };

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveNotificationSettings(next);
  };

  const formatCountdown = (targetTimeMs: number) => {
    const diffMs = targetTimeMs - currentDate.getTime();
    if (diffMs <= 0) return 'Transiting now';
    const hours = Math.floor(diffMs / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ~${days}d ${hours % 24}h`;
    }
    return `in ~${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Push Notification Activation Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900 to-indigo-950/40 border border-indigo-500/30 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100">
                  Celestial Transit Push Alerts
                </h3>
                {permission === 'granted' ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-400 font-medium">
                    {permission === 'denied' ? 'Disabled in browser' : 'Permission needed'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Get real-time mobile push notifications when Chandra (Moon) moves into new Nakshatras, during Graha ingresses, solar/lunar eclipses, and rare alignments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {permission !== 'granted' ? (
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold text-xs transition-colors shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Bell className="w-4 h-4" />
                Enable Push Alerts
              </button>
            ) : (
              <button
                onClick={handleTestNotification}
                className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-slate-200 font-medium text-xs border border-gray-700 transition-colors flex items-center gap-1.5 active:scale-95"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                Test Push Notification
              </button>
            )}
          </div>
        </div>

        {testSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{testSuccess}</span>
          </div>
        )}
      </div>

      {/* Notification Categories & Preferences */}
      <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            Transit Notification Preferences
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Lead time: {settings.leadTimeHours} hr before
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center justify-between p-3 rounded-lg bg-gray-950/80 border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors">
            <div className="text-left">
              <span className="text-xs font-medium text-slate-200 block">
                चन्द्र गोचर (Moon Ingresses)
              </span>
              <span className="text-[11px] text-slate-400">
                Every ~2.3 days (all 27 Nakshatras)
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.moonIngress}
              onChange={(e) => updateSetting('moonIngress', e.target.checked)}
              className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-gray-950/80 border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors">
            <div className="text-left">
              <span className="text-xs font-medium text-slate-200 block">
                प्रमुख ग्रह गोचर (Major Graha Ingresses)
              </span>
              <span className="text-[11px] text-slate-400">
                Surya Sankranti, Guru, Shani shifts
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.majorPlanets}
              onChange={(e) => updateSetting('majorPlanets', e.target.checked)}
              className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-gray-950/80 border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors">
            <div className="text-left">
              <span className="text-xs font-medium text-slate-200 block">
                ग्रहण एवं योग (Eclipses & Alignments)
              </span>
              <span className="text-[11px] text-slate-400">
                Surya & Chandra Grahan, Nodal shifts
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.eclipses}
              onChange={(e) => updateSetting('eclipses', e.target.checked)}
              className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Real-time Upcoming Transits Stream */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            आगामी आकाशीय गोचर (Upcoming Celestial Transits)
          </h4>
          <span className="text-xs text-slate-400">
            {transits.length} events scheduled
          </span>
        </div>

        <div className="space-y-3">
          {transits.map((transit) => {
            const isMoon = transit.type === 'moon_ingress';
            return (
              <div
                key={transit.id}
                className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`p-2 rounded-lg text-sm mt-0.5 ${
                        isMoon
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {isMoon ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-sm text-slate-100">
                          {transit.title}
                        </h5>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-800 text-amber-400 border border-gray-700">
                          {formatCountdown(transit.scheduledTime)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {transit.body}
                      </p>
                      <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                        <span>{transit.significance}</span>
                      </div>
                    </div>
                  </div>

                  {transit.targetNakshatra && onSelectNakshatraByName && (
                    <button
                      onClick={() => onSelectNakshatraByName(transit.targetNakshatra!)}
                      className="shrink-0 px-2.5 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-slate-300 hover:text-white transition-colors border border-gray-700"
                    >
                      नक्षत्र देखें (Inspect Nakshatra)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
