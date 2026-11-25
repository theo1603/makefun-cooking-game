// Sizzle & Serve — sound. One job: tiny synthesized effects (WebAudio only,
// no audio files) so the game sizzles, dings and pops without any network.
let audioCtx = null;

/** Lazily create the AudioContext on first user gesture. */
export function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/** A short oscillator blip. */
function blip(freq, dur, type, gainValue, when = 0) {
  const ctx = audioCtx;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, ctx.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + when);
  osc.stop(ctx.currentTime + when + dur);
}

/** White-noise burst, for the grill sizzle. */
function noiseBurst(dur, gainValue) {
  const ctx = audioCtx;
  if (!ctx) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3000;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

/** Play the effect named by a kitchen action. */
export function playSound(name, muted) {
  if (muted || !ensureAudio()) return;
  if (name === 'pickup') blip(520, 0.09, 'sine', 0.15);
  else if (name === 'chop') {
    blip(180, 0.07, 'square', 0.12);
    blip(140, 0.07, 'square', 0.1, 0.08);
  } else if (name === 'sizzle') noiseBurst(0.5, 0.2);
  else if (name === 'ding') {
    blip(880, 0.12, 'sine', 0.15);
    blip(1320, 0.18, 'sine', 0.12, 0.1);
  } else if (name === 'serve') {
    blip(660, 0.1, 'sine', 0.16);
    blip(880, 0.1, 'sine', 0.16, 0.09);
    blip(1100, 0.22, 'sine', 0.16, 0.18);
  } else if (name === 'error') blip(140, 0.16, 'sawtooth', 0.1);
  else if (name === 'tick') blip(1200, 0.05, 'square', 0.06);
  else if (name === 'alarm') {
    blip(980, 0.12, 'square', 0.08);
    blip(980, 0.12, 'square', 0.08, 0.18);
  }
}
