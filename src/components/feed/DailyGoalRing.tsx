import { RingProgress, Text } from '@mantine/core';
import { tokens } from '../../theme';

interface DailyGoalRingProps {
  readonly value: number;
  readonly goal: number;
  readonly size?: number;
  /** Small rings (header) are too small for a centered label. */
  readonly showLabel?: boolean;
}

export function DailyGoalRing({ value, goal, size = 40, showLabel = true }: DailyGoalRingProps) {
  const percent = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <RingProgress
      size={size}
      thickness={Math.max(3, Math.round(size / 10))}
      roundCaps
      sections={[{ value: percent, color: tokens.accent }]}
      rootColor={tokens.outlineVariant}
      aria-label={`Daily goal: ${Math.min(value, goal)} of ${goal} ideas`}
      label={
        showLabel && (
          <Text ta="center" style={{ fontSize: Math.max(10, Math.round(size / 4)), fontWeight: 600, color: tokens.primary }}>
            {Math.min(value, goal)}/{goal}
          </Text>
        )
      }
    />
  );
}
