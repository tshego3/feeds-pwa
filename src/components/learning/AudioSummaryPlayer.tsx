import { ActionIcon, Box, SegmentedControl, Select, Text, VisuallyHidden } from '@mantine/core';
import { IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlayerStopFilled } from '@tabler/icons-react';
import type { SpeechRate, SpeechStatus } from '../../types';
import { tokens } from '../../theme';

interface AudioSummaryPlayerProps {
  readonly segments: readonly string[];
  readonly status: SpeechStatus;
  readonly currentIndex: number;
  readonly rate: SpeechRate;
  readonly rates: readonly SpeechRate[];
  readonly voices: readonly SpeechSynthesisVoice[];
  readonly voiceUri: string | null;
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onStop: () => void;
  readonly onRateChange: (rate: SpeechRate) => void;
  readonly onVoiceChange: (voiceUri: string) => void;
}

export function AudioSummaryPlayer(props: AudioSummaryPlayerProps) {
  const { segments, status, currentIndex } = props;
  if (status === 'unsupported') {
    return (
      <Text style={{ fontSize: 15, color: tokens.onSurfaceVariant }}>
        Audio is not available in this browser.
      </Text>
    );
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <TransportControls status={status} onPlay={props.onPlay} onPause={props.onPause} onStop={props.onStop} />
      <SpeedAndVoice {...props} />
      <VisuallyHidden aria-live="polite">
        {status === 'speaking' ? `Sentence ${currentIndex + 1} of ${segments.length}` : ''}
      </VisuallyHidden>
      <Box component="ol" style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.map((segment, i) => {
          const isCurrent = status !== 'idle' && i === currentIndex;
          return (
            <Text
              component="li"
              key={i}
              aria-current={isCurrent ? 'true' : undefined}
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                padding: '8px 12px',
                borderRadius: 8,
                color: isCurrent ? tokens.primary : tokens.onSurfaceVariant,
                backgroundColor: isCurrent ? tokens.elevated : 'transparent',
              }}
            >
              {segment}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}

interface TransportControlsProps {
  readonly status: SpeechStatus;
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onStop: () => void;
}

function TransportControls({ status, onPlay, onPause, onStop }: TransportControlsProps) {
  const speaking = status === 'speaking';
  const playLabel = status === 'paused' ? 'Resume audio summary' : 'Play audio summary';
  return (
    <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <ActionIcon
        size={56}
        radius="xl"
        aria-label={speaking ? 'Pause audio summary' : playLabel}
        onClick={speaking ? onPause : onPlay}
        style={{ backgroundColor: tokens.primary, color: tokens.onPrimary }}
      >
        {speaking ? <IconPlayerPauseFilled size={24} /> : <IconPlayerPlayFilled size={24} />}
      </ActionIcon>
      <ActionIcon
        size={44}
        radius="xl"
        variant="subtle"
        aria-label="Stop audio summary"
        disabled={status === 'idle'}
        onClick={onStop}
        style={{ color: tokens.primary, backgroundColor: 'transparent' }}
      >
        <IconPlayerStopFilled size={20} />
      </ActionIcon>
    </Box>
  );
}

function SpeedAndVoice({ rate, rates, voices, voiceUri, onRateChange, onVoiceChange }: AudioSummaryPlayerProps) {
  // Some platforms list the same voice twice; Select needs unique values.
  const voiceOptions = [...new Map(voices.map((v) => [v.voiceURI, v])).values()].map((v) => ({
    value: v.voiceURI,
    label: v.localService ? `${v.name} (offline)` : v.name,
  }));

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Box>
        <Text id="speech-rate-label" style={{ fontSize: 13, color: tokens.textSecondary, marginBottom: 6 }}>
          Speed
        </Text>
        <SegmentedControl
          aria-labelledby="speech-rate-label"
          value={String(rate)}
          onChange={(value) => {
            const next = rates.find((r) => String(r) === value);
            if (next !== undefined) onRateChange(next);
          }}
          data={rates.map((r) => ({ value: String(r), label: `${r}x` }))}
        />
      </Box>
      {voiceOptions.length > 0 && (
        <Select
          label="Voice"
          value={voiceUri}
          onChange={(value) => value && onVoiceChange(value)}
          data={voiceOptions}
          allowDeselect={false}
          searchable
        />
      )}
    </Box>
  );
}
