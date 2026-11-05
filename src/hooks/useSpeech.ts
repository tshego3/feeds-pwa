import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SpeechRate, SpeechStatus } from '../types';
import { isSpeechSupported, loadVoices, pickVoice, speakSegments, type SpeechHandle } from '../learning';
import {
  getSpeechRatePreference,
  getSpeechVoicePreference,
  setSpeechRatePreference,
  setSpeechVoicePreference,
} from '../preferences';

export interface SpeechControls {
  readonly status: SpeechStatus;
  readonly currentIndex: number;
  readonly rate: SpeechRate;
  readonly voices: readonly SpeechSynthesisVoice[];
  readonly voiceUri: string | null;
  readonly play: () => void;
  readonly pause: () => void;
  readonly stop: () => void;
  readonly setRate: (rate: SpeechRate) => void;
  readonly setVoiceUri: (uri: string) => void;
}

// Plays text segments aloud. Call play() straight from a click handler: iOS
// only starts speech inside a user gesture.
export function useSpeech(segments: readonly string[], onComplete?: () => void): SpeechControls {
  const supported = isSpeechSupported();
  const [status, setStatus] = useState<SpeechStatus>(supported ? 'idle' : 'unsupported');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rate, setRateState] = useState<SpeechRate>(getSpeechRatePreference);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceUri, setVoiceUriState] = useState<string | null>(getSpeechVoicePreference);
  const handleRef = useRef<SpeechHandle | null>(null);
  const onCompleteRef = useRef(onComplete);
  const voice = useMemo(() => pickVoice(voices, voiceUri, navigator.language), [voices, voiceUri]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    void loadVoices().then((list) => {
      if (active) setVoices(list);
    });
    return () => {
      active = false;
    };
  }, [supported]);

  const cancelHandle = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
  }, []);

  // New text or unmount: silence whatever is playing.
  useEffect(
    () => () => {
      cancelHandle();
      setStatus((s) => (s === 'unsupported' ? s : 'idle'));
      setCurrentIndex(0);
    },
    [segments, cancelHandle],
  );

  const start = useCallback(
    (from: number, nextRate: SpeechRate, nextVoice: SpeechSynthesisVoice | null) => {
      cancelHandle();
      if (from >= segments.length) return;
      setStatus('speaking');
      handleRef.current = speakSegments(segments, {
        startIndex: from,
        rate: nextRate,
        voice: nextVoice,
        onSegmentStart: setCurrentIndex,
        onEnd: () => {
          handleRef.current = null;
          setStatus('idle');
          setCurrentIndex(0);
          onCompleteRef.current?.();
        },
        onError: () => {
          handleRef.current = null;
          setStatus('idle');
        },
      });
    },
    [segments, cancelHandle],
  );

  const play = useCallback(() => {
    if (status !== 'unsupported') start(currentIndex, rate, voice);
  }, [status, start, currentIndex, rate, voice]);

  const pause = useCallback(() => {
    if (status !== 'speaking') return;
    cancelHandle();
    setStatus('paused');
  }, [status, cancelHandle]);

  const stop = useCallback(() => {
    if (status === 'unsupported') return;
    cancelHandle();
    setStatus('idle');
    setCurrentIndex(0);
  }, [status, cancelHandle]);

  const setRate = useCallback(
    (next: SpeechRate) => {
      setRateState(next);
      setSpeechRatePreference(next);
      if (status === 'speaking') start(currentIndex, next, voice);
    },
    [status, start, currentIndex, voice],
  );

  const setVoiceUri = useCallback(
    (uri: string) => {
      setVoiceUriState(uri);
      setSpeechVoicePreference(uri);
      if (status === 'speaking') start(currentIndex, rate, pickVoice(voices, uri, navigator.language));
    },
    [status, start, currentIndex, rate, voices],
  );

  return {
    status,
    currentIndex,
    rate,
    voices,
    voiceUri: voice?.voiceURI ?? null,
    play,
    pause,
    stop,
    setRate,
    setVoiceUri,
  };
}
