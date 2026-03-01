import { getAudioCtx } from "./audioCtx";

function tone(
  freq: number,
  dur: number,
  vol: number,
  delay = 0,
  type: OscillatorType = "sine",
) {
  const ctx = getAudioCtx();
  if (ctx.state !== "running") return;

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
    tone(520, 0.12, 0.06);
    tone(660, 0.12, 0.045, 0.08);
  },
  micClose() {
    tone(660, 0.1, 0.045);
    tone(520, 0.14, 0.035, 0.06);
  },
  thinking() {
    tone(880, 0.08, 0.025);
  },
  messageReceived() {
    tone(660, 0.12, 0.05);
    tone(880, 0.18, 0.035, 0.1);
  },
};
