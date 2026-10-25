import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { soundService } from '../services/audio';
import { notificationService } from '../services/notifications';
import {
  Bell,
  Volume2,
  VolumeX,
  Clock,
  Coffee,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  ShieldAlert,
  Play,
} from 'lucide-react';

export const RemindersView: React.FC = () => {
  const { settings, updateSettings, showToast } = useStudy();

  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  const [testingSound, setTestingSound] = useState<string | null>(null);

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      setNotifPermission('granted');
      notificationService.send('Notifications Enabled', 'You will receive study & break alerts.');
      showToast('Browser notifications enabled.');
    } else {
      setNotifPermission('denied');
      showToast('Notification permission denied by browser.');
    }
  };

  const playTestSound = (type: 'workEnd' | 'breakEnd' | 'idleAlert') => {
    setTestingSound(type);
    if (type === 'workEnd') soundService.playWorkEnd();
    else if (type === 'breakEnd') soundService.playBreakEnd();
    else if (type === 'idleAlert') soundService.playIdleWarning();

    setTimeout(() => {
      setTestingSound(null);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0f17] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              Notifications & Audio Reminders
            </h1>
            <p className="text-xs text-slate-400">
              Configure synthesized harmonic audio alarms and desktop alerts for deep work sessions and scheduled breaks.
            </p>
          </div>
        </div>

        {/* Permission Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111420] border border-slate-800 text-xs self-start md:self-auto">
          <span
            className={`w-2 h-2 rounded-full ${
              notifPermission === 'granted'
                ? 'bg-emerald-400'
                : notifPermission === 'denied'
                ? 'bg-rose-500'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-slate-300 font-mono text-[11px] capitalize">
            Desktop Alerts: {notifPermission}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desktop Web Notifications */}
        <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Browser Push Notifications</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Receive notifications when your focus timer finishes, when breaks end, or if idle inactivity is detected while tracking study time.
            </p>

            <div className="p-4 rounded-xl bg-[#111420] border border-slate-800 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-200">
                  Notification Permissions
                </span>
                <span
                  className={`text-xs font-mono font-bold uppercase ${
                    notifPermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {notifPermission}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {notifPermission === 'granted'
                  ? 'Active. You will receive native OS notifications when timers finish.'
                  : notifPermission === 'denied'
                  ? 'Blocked in browser settings. Please permit notifications in your browser URL bar icon.'
                  : 'Not yet granted. Click the button below to enable desktop alerts.'}
              </p>
            </div>

            {notifPermission !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                <span>Enable Desktop Notifications</span>
              </button>
            )}

            {notifPermission === 'granted' && (
              <button
                onClick={() => {
                  notificationService.send('Test Notification', 'BK NITHILESHVAR Study Tracker alert test.');
                  showToast('Test notification dispatched.');
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>Send Test Alert</span>
              </button>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Runs completely offline using W3C Notification API without server push costs.</span>
          </div>
        </div>

        {/* Synthesized Audio Alarms */}
        <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-5 h-5 text-rose-400" />
                <h2 className="text-sm font-bold text-white">Synthesized Audio Alarms</h2>
              </div>

              {/* Master Mute Toggle */}
              <button
                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  settings.soundEnabled
                    ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30'
                    : 'text-slate-500 bg-slate-800'
                }`}
              >
                {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{settings.soundEnabled ? 'Audio Active' : 'Muted'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Pure harmonic chimes created via Web Audio API. Zero external audio downloads, ₹0 cost, and zero delay.
            </p>

            {/* Test buttons */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#111420] border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Study Complete Alarm</div>
                  <div className="text-[10px] text-slate-500">Major third harmonic chord when focus finishes</div>
                </div>
                <button
                  onClick={() => playTestSound('workEnd')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{testingSound === 'workEnd' ? 'Playing...' : 'Test'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#111420] border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Break Finished Bell</div>
                  <div className="text-[10px] text-slate-500">Calm ascending chime when recess concludes</div>
                </div>
                <button
                  onClick={() => playTestSound('breakEnd')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{testingSound === 'breakEnd' ? 'Playing...' : 'Test'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#111420] border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Idle Inactivity Warning</div>
                  <div className="text-[10px] text-slate-500">Subtle alert when timer runs unattended</div>
                </div>
                <button
                  onClick={() => playTestSound('idleAlert')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{testingSound === 'idleAlert' ? 'Playing...' : 'Test'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
            <span>Audio sounds respect browser autoplay guidelines and require user interaction.</span>
          </div>
        </div>
      </div>

      {/* Focus & Inactivity Configuration Card */}
      <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-6 shadow-lg">
        <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Intervals & Idle Sensitivity
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Tune duration intervals and inactivity checks to match your personal study habits.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#111420] border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Pomodoro Work (min)
            </label>
            <input
              type="number"
              min="1"
              max="180"
              value={settings.pomodoroWorkMin}
              onChange={(e) =>
                updateSettings({ pomodoroWorkMin: parseInt(e.target.value, 10) || 25 })
              }
              className="w-full px-3 py-2 bg-[#141824] border border-slate-700 rounded-lg text-xs text-white font-mono outline-none focus:border-amber-500"
            />
          </div>

          <div className="p-4 rounded-xl bg-[#111420] border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Short Break (min)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.pomodoroShortBreakMin}
              onChange={(e) =>
                updateSettings({ pomodoroShortBreakMin: parseInt(e.target.value, 10) || 5 })
              }
              className="w-full px-3 py-2 bg-[#141824] border border-slate-700 rounded-lg text-xs text-white font-mono outline-none focus:border-amber-500"
            />
          </div>

          <div className="p-4 rounded-xl bg-[#111420] border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Idle Check (min, 0 = off)
            </label>
            <input
              type="number"
              min="0"
              max="120"
              value={settings.idleDetectionMin}
              onChange={(e) =>
                updateSettings({ idleDetectionMin: parseInt(e.target.value, 10) || 0 })
              }
              className="w-full px-3 py-2 bg-[#141824] border border-slate-700 rounded-lg text-xs text-white font-mono outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
