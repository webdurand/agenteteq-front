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
};
