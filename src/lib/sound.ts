/** Sonido breve de confirmación (dos notas ascendentes). No necesita archivos de audio. */
export function playSuccess() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    void ctx.resume();
    const t0 = ctx.currentTime;
    [[659.25, 0, 0.14], [987.77, 0.11, 0.3]].forEach(([freq, at, dur]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.28, t0 + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + at);
      o.stop(t0 + at + dur + 0.05);
    });
    setTimeout(() => void ctx.close(), 900);
  } catch { /* sin audio: no pasa nada */ }
}
