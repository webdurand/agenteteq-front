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
