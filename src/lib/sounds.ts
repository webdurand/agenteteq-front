import { getAudioCtx, blankAmplitude } from "./audioCtx";

const SFX_BLANK_MS = 350;

function tone(
  freq: number,
  dur: number,
  vol: number,
  delay = 0,
  type: OscillatorType = "sine",
) {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    ctx.resume().then(() => scheduleTone(ctx, freq, dur, vol, delay, type));
    return;
  }
  if (ctx.state !== "running") return;
  scheduleTone(ctx, freq, dur, vol, delay, type);
}

function scheduleTone(
  ctx: AudioContext,
  freq: number,
  dur: number,
  vol: number,
  delay: number,
  type: OscillatorType,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.value = freq;

  const t0 = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  osc.start(t0);
  osc.stop(t0 + dur);
}

let _thinkingNodes: { osc: OscillatorNode; gain: GainNode } | null = null;

function startThinkingLoop() {
  stopThinkingLoop();
  const ctx = getAudioCtx();
  if (ctx.state !== "running") {
    ctx.resume().then(() => startThinkingLoop());
    return;
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = 440;

  lfo.type = "sine";
  lfo.frequency.value = 0.7;
  lfoGain.gain.value = 0.012;

  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  gain.gain.value = 0.018;
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  lfo.start();

  _thinkingNodes = { osc, gain };
  (osc as any)._lfo = lfo;
  (osc as any)._lfoGain = lfoGain;
}

function stopThinkingLoop() {
  if (!_thinkingNodes) return;
  const { osc, gain } = _thinkingNodes;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.3);
  const lfo = (osc as any)._lfo as OscillatorNode | undefined;
  setTimeout(() => {
    try { osc.stop(); } catch { /* ignore */ }
    try { lfo?.stop(); } catch { /* ignore */ }
    try { osc.disconnect(); } catch { /* ignore */ }
    try { gain.disconnect(); } catch { /* ignore */ }
    try { lfo?.disconnect(); } catch { /* ignore */ }
    try { (osc as any)._lfoGain?.disconnect(); } catch { /* ignore */ }
  }, 400);
  _thinkingNodes = null;
}

export const sfx = {
  micOpen() {
    blankAmplitude(SFX_BLANK_MS);
    tone(520, 0.12, 0.06);
    tone(660, 0.12, 0.045, 0.08);
  },
  micClose() {
    blankAmplitude(600);
    tone(660, 0.1, 0.045);
    tone(520, 0.14, 0.035, 0.06);
  },
  thinking() {
    blankAmplitude(SFX_BLANK_MS);
    tone(880, 0.08, 0.025);
    startThinkingLoop();
  },
  stopThinking() {
    stopThinkingLoop();
  },
  messageReceived() {
    stopThinkingLoop();
    blankAmplitude(SFX_BLANK_MS);
    tone(660, 0.12, 0.05);
    tone(880, 0.18, 0.035, 0.1);
  },
};
