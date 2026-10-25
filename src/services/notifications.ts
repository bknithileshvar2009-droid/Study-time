/**
 * Notification, Audio Cues, and Idle Detection Service
 */

class NotificationService {
  private audioCtx: AudioContext | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private isIdlePromptActive: boolean = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /* ---------------- BROWSER PUSH NOTIFICATIONS ---------------- */

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }

  isPermissionGranted(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    return Notification.permission === 'granted';
  }

  sendNotification(title: string, body: string, icon?: string) {
    if (this.isPermissionGranted()) {
      try {
        new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
          badge: icon || '/favicon.ico',
        });
      } catch {}
    }
  }

  send(title: string, body: string, icon?: string) {
    this.sendNotification(title, body, icon);
  }

  /* ---------------- SYNTHESIZED SOUND CUES (₹0 Web Audio) ---------------- */

  playWorkEndAlarm() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
      });
    } catch {}
  }

  playBreakEndAlarm() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [440, 554.37, 659.25]; // A4, C#5, E5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.14 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.14);
        osc.stop(ctx.currentTime + idx * 0.14 + 0.45);
      });
    } catch {}
  }

  playIdleWarning() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }
}

export const notificationService = new NotificationService();
