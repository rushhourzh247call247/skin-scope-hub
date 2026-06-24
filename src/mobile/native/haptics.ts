// Haptik-Wrapper. Web fällt auf navigator.vibrate zurück
// (auf iOS nicht verfügbar, dann no-op).
// Stufe 2: ersetzbar durch @capacitor/haptics.

export function tapHaptic() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(10);
    }
  } catch {
    /* no-op */
  }
}

export function successHaptic() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([15, 40, 15]);
    }
  } catch {
    /* no-op */
  }
}
