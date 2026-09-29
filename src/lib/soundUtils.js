/**
 * Telephone Sound Synthesizer using Web Audio API
 * Generates authentic dual-frequency telephone ringback tones, pickup clicks, and hangup tones.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a realistic telephone ring (440Hz + 480Hz North American standard ringback)
 * @param {number} durationSeconds - duration of the ring burst (default ~1.8s)
 * @returns {Promise<void>}
 */
export function playTelephoneRing(durationSeconds = 1.8) {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Standard North American ringback tone: 440 Hz and 480 Hz
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      osc1.type = 'sine';
      osc2.type = 'sine';

      // Soft envelope to simulate analog telephone line
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.08);
      gainNode.gain.setValueAtTime(0.18, now + durationSeconds - 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + durationSeconds);
      osc2.stop(now + durationSeconds);

      setTimeout(() => {
        resolve();
      }, durationSeconds * 1000);
    } catch (e) {
      console.warn('Audio synthesis not supported or blocked:', e);
      resolve();
    }
  });
}

/**
 * Plays telephone receiver pickup click
 */
export function playPickupClick() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  } catch (e) {
    console.warn('Pickup sound failed:', e);
  }
}

/**
 * Plays telephone hangup / click sound
 */
export function playHangupClick() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {
    console.warn('Hangup sound failed:', e);
  }
}
