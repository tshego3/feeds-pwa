import { getSummarizerApi, type SummarizerInstance } from '../types/summarizer';

// Optional upgrade over the extractive summary: Chrome's built-in on-device
// Summarizer. Used only when the model is already on the device; this never
// starts a model download. Every failure returns null so the caller falls back.

const ON_DEVICE_TIMEOUT_MS = 15_000;
const ON_DEVICE_MAX_INPUT = 12_000;
const MIN_KEY_POINTS = 2;
const LIST_MARKER = /^\s*(?:[*\-•]|\d+[.)])\s*/;

export async function summarizeOnDevice(text: string, title: string): Promise<string[] | null> {
  const api = getSummarizerApi();
  if (!api) return null;

  let instance: SummarizerInstance | null = null;
  try {
    if ((await api.availability()) !== 'available') return null;
    instance = await api.create({
      type: 'key-points',
      format: 'plain-text',
      length: 'short',
      sharedContext: title,
    });
    const output = await withTimeout(instance.summarize(text.slice(0, ON_DEVICE_MAX_INPUT)));
    return output === null ? null : parseKeyPoints(output);
  } catch {
    // Model busy, quota exceeded, or unsupported language: fall back.
    return null;
  } finally {
    instance?.destroy();
  }
}

export function parseKeyPoints(output: string): string[] | null {
  const points = output
    .split('\n')
    .map((line) => line.replace(LIST_MARKER, '').trim())
    .filter((line) => line !== '');
  return points.length >= MIN_KEY_POINTS ? points : null;
}

function withTimeout(promise: Promise<string>): Promise<string | null> {
  let timer = 0;
  const timeout = new Promise<null>((resolve) => {
    timer = window.setTimeout(() => resolve(null), ON_DEVICE_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}
