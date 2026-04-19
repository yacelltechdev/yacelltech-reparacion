function beep(ctx: AudioContext, freq: number, duration: number, gain: number, startTime: number) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env);
  env.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = "sine";
  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(gain, startTime + 0.01);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Sonido para nueva reparación asignada al técnico
export function playNewRepairSound() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    beep(ctx, 880, 0.18, 0.4, t);
    beep(ctx, 1100, 0.18, 0.4, t + 0.2);
    beep(ctx, 1320, 0.25, 0.5, t + 0.4);
  } catch { /* silencioso si el browser lo bloquea */ }
}

// Sonido para equipo listo (notificación a cajera)
export function playReadySound() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    beep(ctx, 660, 0.15, 0.4, t);
    beep(ctx, 880, 0.15, 0.4, t + 0.18);
    beep(ctx, 660, 0.15, 0.4, t + 0.36);
    beep(ctx, 880, 0.22, 0.5, t + 0.54);
  } catch { /* silencioso si el browser lo bloquea */ }
}
