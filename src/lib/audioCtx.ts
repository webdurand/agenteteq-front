let _ctx: AudioContext | null = null;

export function getAudioCtx(): AudioContext {
  if (!_ctx || _ctx.state === "closed") {
    _ctx = new AudioContext();
  }
  return _ctx;
}

export function ensureAudioResumed(): void {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    ctx.resume().then(() => console.log("[AUDIO] AudioContext resumed"));
  }
}

const _resume = () => {
  ensureAudioResumed();
  document.removeEventListener("click", _resume);
  document.removeEventListener("touchstart", _resume);
};
document.addEventListener("click", _resume, { capture: true });
document.addEventListener("touchstart", _resume, { capture: true });

// ─── AnalyserNode para visualização reativa ──────────────────────────────────

let _playbackAnalyser: AnalyserNode | null = null;
let _micAnalyser: AnalyserNode | null = null;
const _tdBuf = new Uint8Array(256);

export function getPlaybackAnalyser(): AnalyserNode {
  const ctx = getAudioCtx();
  if (!_playbackAnalyser) {
    _playbackAnalyser = ctx.createAnalyser();
    _playbackAnalyser.fftSize = 256;
    _playbackAnalyser.smoothingTimeConstant = 0.75;
    _playbackAnalyser.connect(ctx.destination);
  }
  return _playbackAnalyser;
}

function rms(analyser: AnalyserNode): number {
  analyser.getByteTimeDomainData(_tdBuf);
  let sum = 0;
  for (let i = 0; i < _tdBuf.length; i++) {
    const v = (_tdBuf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / _tdBuf.length);
}

export function getPlaybackAmplitude(): number {
  return _playbackAnalyser ? rms(_playbackAnalyser) : 0;
}

export function getMicAmplitude(): number {
  return _micAnalyser ? rms(_micAnalyser) : 0;
}

let _micStream: MediaStream | null = null;

export async function startMicAnalysis(): Promise<void> {
  if (_micAnalyser) return;
  try {
    const ctx = getAudioCtx();
    _micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = ctx.createMediaStreamSource(_micStream);
    _micAnalyser = ctx.createAnalyser();
    _micAnalyser.fftSize = 256;
    _micAnalyser.smoothingTimeConstant = 0.75;
    source.connect(_micAnalyser);
    console.log("[AUDIO] Mic analyser ativo");
  } catch (e) {
    console.warn("[AUDIO] Mic analyser indisponível:", e);
  }
}
