// Einfache In-Memory-Upload-Queue für Stufe 1.
// Wird in Stufe 2 (Capacitor) auf IndexedDB + Retry mit Backoff erweitert.
// Aufruf-Signatur bleibt identisch.

type Task = () => Promise<unknown>;

const queue: Task[] = [];
let running = false;

async function runNext() {
  if (running) return;
  const next = queue.shift();
  if (!next) return;
  running = true;
  try {
    await next();
  } catch (err) {
    console.error("[mobile.upload]", err);
  } finally {
    running = false;
    if (queue.length) void runNext();
  }
}

export function enqueueUpload(task: Task) {
  queue.push(task);
  void runNext();
}
