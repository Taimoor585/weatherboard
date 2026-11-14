import React, { useEffect, useState } from 'react';
import {
  armReminder,
  capabilities,
  disarmReminder,
  readReminder,
  saveReminder,
  sendTestNotification,
  type Capabilities,
  type ReminderSettings,
} from '../lib/notifications';

interface Props {
  open: boolean;
  onClose: () => void;
  onReminderChange?: (enabled: boolean) => void;
}

const PRESET_TIMES = [
  { label: '6:30 AM', value: '06:30', tag: 'Early' },
  { label: '7:00 AM', value: '07:00', tag: 'Sunrise' },
  { label: '7:30 AM', value: '07:30', tag: 'Default' },
  { label: '8:00 AM', value: '08:00', tag: 'Commute' },
  { label: '8:30 AM', value: '08:30', tag: 'Work' },
];

export const NotificationModal: React.FC<Props> = ({ open, onClose, onReminderChange }) => {
  const [caps, setCaps] = useState<Capabilities>(capabilities);
  const [settings, setSettings] = useState<ReminderSettings>(readReminder);
  const [hours, setHours] = useState(7);
  const [minutes, setMinutes] = useState(30);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [testSent, setTestSent] = useState(false);
  const [preExplain, setPreExplain] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Sync state when opened
  useEffect(() => {
    if (open) {
      const c = capabilities();
      setCaps(c);
      const r = readReminder();
      setSettings(r);
      setTestSent(false);
      setPreExplain(false);

      // Parse HH:MM into hours, minutes, period
      if (r.time) {
        const [hStr, mStr] = r.time.split(':');
        const totalH = parseInt(hStr, 10) || 7;
        const m = parseInt(mStr, 10) || 30;
        setMinutes(m);
        if (totalH >= 12) {
          setPeriod('PM');
          setHours(totalH === 12 ? 12 : totalH - 12);
        } else {
          setPeriod('AM');
          setHours(totalH === 0 ? 12 : totalH);
        }
      }
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  // Convert 12-hour picker values to 24-hour "HH:MM" format
  const get24HourString = (h: number, m: number, p: 'AM' | 'PM') => {
    let h24 = h;
    if (p === 'PM' && h < 12) h24 = h + 12;
    if (p === 'AM' && h === 12) h24 = 0;
    return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const updateTime = (newH: number, newM: number, newP: 'AM' | 'PM') => {
    setHours(newH);
    setMinutes(newM);
    setPeriod(newP);
    const time24 = get24HourString(newH, newM, newP);
    if (settings.enabled) {
      const next = { ...settings, time: time24 };
      setSettings(next);
      void saveReminder(next);
      void armReminder(next);
    }
  };

  const handlePresetClick = (presetVal: string) => {
    const [hStr, mStr] = presetVal.split(':');
    const totalH = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const p: 'AM' | 'PM' = totalH >= 12 ? 'PM' : 'AM';
    const h12 = totalH % 12 || 12;
    updateTime(h12, m, p);
  };

  const adjustHour = (delta: number) => {
    let nextH = hours + delta;
    if (nextH > 12) nextH = 1;
    if (nextH < 1) nextH = 12;
    updateTime(nextH, minutes, period);
  };

  const adjustMinute = (delta: number) => {
    let nextM = minutes + delta;
    if (nextM >= 60) nextM = 0;
    if (nextM < 0) nextM = 55;
    updateTime(hours, nextM, period);
  };

  const togglePeriod = () => {
    const nextP = period === 'AM' ? 'PM' : 'AM';
    updateTime(hours, minutes, nextP);
  };

  const handleToggle = async () => {
    if (settings.enabled) {
      const next = { ...settings, enabled: false };
      setSettings(next);
      void saveReminder(next);
      await disarmReminder();
      onReminderChange?.(false);
      return;
    }

    if (!caps.supported) return;

    if (Notification.permission === 'default') {
      setPreExplain(true);
      return;
    }

    if (Notification.permission === 'denied') {
      setCaps(capabilities());
      return;
    }

    await activateReminder();
  };

  const activateReminder = async () => {
    const time24 = get24HourString(hours, minutes, period);
    setRequesting(true);
    let perm = Notification.permission;
    if (perm === 'default') {
      try {
        perm = await Notification.requestPermission();
      } catch {
        /* fallback */
      }
    }
    setRequesting(false);
    setPreExplain(false);
    setCaps(capabilities());

    if (perm === 'granted') {
      const next: ReminderSettings = { enabled: true, time: time24 };
      setSettings(next);
      await saveReminder(next);
      await armReminder(next);
      onReminderChange?.(true);
    }
  };

  const handleSendTest = async () => {
    if (Notification.permission !== 'granted') {
      await activateReminder();
    }
    const ok = await sendTestNotification();
    if (ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3500);
    }
  };

  const currentTime24 = get24HourString(hours, minutes, period);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="notif-modal-title">
      <div className="modal-dialog reminder-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close reminder dialog">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div className="reminder-modal-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <h3 className="modal-title" id="notif-modal-title" style={{ margin: 0 }}>
              Morning Weather Reminder
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily forecast briefing before you head out</span>
          </div>
        </div>

        {preExplain && (
          <div className="reminder-pre-explain">
            <strong style={{ color: 'var(--accent-blue)', display: 'block', marginBottom: '4px' }}>
              Why We Ask For Notification Access
            </strong>
            WeatherBoard sends one calm forecast each morning at your selected time so you know what to wear and whether to
            grab an umbrella. Zero ads or spam.
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-primary" onClick={activateReminder} disabled={requesting}>
                {requesting ? 'Requesting...' : 'Allow & Enable'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPreExplain(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {!caps.supported && (
          <div className="reminder-error-box">
            {caps.reason || 'Web notifications are not supported on this device/browser.'}
          </div>
        )}

        {caps.permission === 'denied' && (
          <div className="reminder-warn-box">
            Notifications are currently blocked by browser permissions. To enable them, click the lock icon in the address
            bar and set Notifications to "Allow".
          </div>
        )}

        {/* Master Toggle */}
        <div className="reminder-toggle-card">
          <div>
            <span style={{ fontWeight: 650, fontSize: '0.975rem', display: 'block' }}>Daily Notification</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {settings.enabled ? `Scheduled daily at ${currentTime24}` : 'Turn on to receive morning weather alerts'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: settings.enabled ? 'var(--accent-blue)' : 'var(--text-muted)',
                letterSpacing: '0.04em',
                userSelect: 'none',
              }}
            >
              {settings.enabled ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              className={`modern-toggle-switch ${settings.enabled ? 'is-checked' : ''}`}
              onClick={handleToggle}
              disabled={!caps.supported || caps.permission === 'denied'}
              aria-label="Toggle daily morning weather reminder"
            >
              <span className="modern-toggle-track">
                <span className="modern-toggle-thumb" />
              </span>
            </button>
          </div>
        </div>

        {/* Custom In-Card Time Picker (No ugly native browser popup!) */}
        <div className="reminder-picker-section">
          <label className="reminder-picker-label">Choose Reminder Time</label>

          <div className="custom-time-picker">
            {/* Hours stepper */}
            <div className="stepper-col">
              <button type="button" className="stepper-btn" onClick={() => adjustHour(1)} aria-label="Increase hour">
                ▲
              </button>
              <span className="stepper-display">{String(hours).padStart(2, '0')}</span>
              <button type="button" className="stepper-btn" onClick={() => adjustHour(-1)} aria-label="Decrease hour">
                ▼
              </button>
              <span className="stepper-tag">Hour</span>
            </div>

            <span className="time-colon">:</span>

            {/* Minutes stepper */}
            <div className="stepper-col">
              <button type="button" className="stepper-btn" onClick={() => adjustMinute(5)} aria-label="Increase minute">
                ▲
              </button>
              <span className="stepper-display">{String(minutes).padStart(2, '0')}</span>
              <button type="button" className="stepper-btn" onClick={() => adjustMinute(-5)} aria-label="Decrease minute">
                ▼
              </button>
              <span className="stepper-tag">Min</span>
            </div>

            {/* AM / PM toggle */}
            <div className="stepper-col">
              <div className="period-toggle">
                <button
                  type="button"
                  className={`period-btn ${period === 'AM' ? 'is-active' : ''}`}
                  onClick={() => period !== 'AM' && togglePeriod()}
                >
                  AM
                </button>
                <button
                  type="button"
                  className={`period-btn ${period === 'PM' ? 'is-active' : ''}`}
                  onClick={() => period !== 'PM' && togglePeriod()}
                >
                  PM
                </button>
              </div>
              <span className="stepper-tag">Period</span>
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="preset-times-row">
            {PRESET_TIMES.map((p) => {
              const isMatch = p.value === currentTime24;
              return (
                <button
                  key={p.value}
                  type="button"
                  className={`preset-time-chip ${isMatch ? 'is-active' : ''}`}
                  onClick={() => handlePresetClick(p.value)}
                >
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="reminder-footer-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleSendTest}
            disabled={!caps.supported || caps.permission === 'denied'}
          >
            {testSent ? '✓ Notification Dispatched' : 'Test Notification Now'}
          </button>

          <button type="button" className="btn btn-primary" onClick={onClose}>
            Save & Done
          </button>
        </div>
      </div>
    </div>
  );
};
