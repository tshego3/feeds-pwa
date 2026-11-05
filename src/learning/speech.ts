// Thin wrapper over the Web Speech API (speechSynthesis). Free, built into the
// browser, and offline-capable with local voices. Segments are spoken one
// utterance at a time: Chrome cuts off long utterances after ~15 seconds, and
// per-sentence playback lets pause/resume restart at the current sentence
// (speechSynthesis.pause() is unreliable on Android).

const VOICE_WAIT_MS = 2_000;

export interface SpeakOptions {
  readonly startIndex: number;
  readonly rate: number;
  readonly voice: SpeechSynthesisVoice | null;
  readonly onSegmentStart: (index: number) => void;
  readonly onEnd: () => void;
  readonly onError: () => void;
}

export interface SpeechHandle {
  cancel(): void;
}

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

// Chromium fills the voice list asynchronously; wait briefly for it.
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const ready = synth.getVoices();
  if (ready.length > 0) return Promise.resolve(ready);

  return new Promise((resolve) => {
    const finish = () => {
      synth.removeEventListener('voiceschanged', finish);
      window.clearTimeout(timer);
      resolve(synth.getVoices());
    };
    const timer = window.setTimeout(finish, VOICE_WAIT_MS);
    synth.addEventListener('voiceschanged', finish);
  });
}

// Saved choice first, then a local (offline) voice for the language, then any
// voice for the language. Null lets the browser use its default.
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  preferredUri: string | null,
  lang: string,
): SpeechSynthesisVoice | null {
  const preferred = voices.find((voice) => voice.voiceURI === preferredUri);
  if (preferred) return preferred;
  const prefix = (lang.split('-')[0] ?? 'en').toLowerCase();
  const matching = voices.filter((voice) => voice.lang.toLowerCase().startsWith(prefix));
  return matching.find((voice) => voice.localService) ?? matching[0] ?? null;
}

export function speakSegments(segments: readonly string[], options: SpeakOptions): SpeechHandle {
  const synth = window.speechSynthesis;
  let cancelled = false;
  synth.cancel();

  // Each utterance starts the next from its end event, so the chain is
  // bounded by the segment count.
  const speakAt = (index: number) => {
    if (cancelled) return;
    const text = segments[index];
    if (text === undefined) {
      options.onEnd();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate;
    if (options.voice) {
      utterance.voice = options.voice;
      utterance.lang = options.voice.lang;
    }
    utterance.onend = () => speakAt(index + 1);
    utterance.onerror = (event) => {
      // cancel() reports "interrupted"/"canceled"; those are not failures.
      if (cancelled || event.error === 'interrupted' || event.error === 'canceled') return;
      options.onError();
    };
    options.onSegmentStart(index);
    synth.speak(utterance);
  };

  speakAt(options.startIndex);
  return {
    cancel() {
      cancelled = true;
      synth.cancel();
    },
  };
}
