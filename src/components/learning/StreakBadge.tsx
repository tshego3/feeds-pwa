import { Box, Skeleton, Text } from '@mantine/core';
import { IconCheck, IconFlame } from '@tabler/icons-react';
import type { StreakSummary } from '../../types';
import { tokens } from '../../theme';

interface StreakBadgeProps {
  readonly streak: StreakSummary;
  readonly isLoading: boolean;
}

export function StreakBadge({ streak, isLoading }: StreakBadgeProps) {
  if (isLoading) return <Skeleton height={88} radius={16} />;

  const dayLabel = streak.current === 1 ? 'day streak' : 'days streak';
  return (
    <Box
      component="section"
      aria-label="Learning streak"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 20,
        borderRadius: 16,
        backgroundColor: tokens.surfaceContainerLow,
        border: `1px solid ${tokens.outlineVariant}`,
      }}
    >
      <IconFlame
        size={40}
        stroke={1.5}
        aria-hidden
        color={streak.activeToday ? tokens.accent : tokens.onSurfaceVariant}
      />
      <Box style={{ flex: 1 }}>
        <Text style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: tokens.primary }}>
          {streak.current} {dayLabel}
        </Text>
        <Text style={{ fontSize: 13, color: tokens.textSecondary, marginTop: 2 }}>
          Best: {streak.longest}
        </Text>
      </Box>
      <TodayStatus activeToday={streak.activeToday} />
    </Box>
  );
}

function TodayStatus({ activeToday }: { readonly activeToday: boolean }) {
  if (!activeToday) {
    return (
      <Text style={{ fontSize: 12, color: tokens.onSurfaceVariant, maxWidth: 140, textAlign: 'right' }}>
        Complete a lesson to keep your streak
      </Text>
    );
  }
  return (
    <Box style={{ display: 'flex', alignItems: 'center', gap: 4, color: tokens.primary }}>
      <IconCheck size={16} aria-hidden />
      <Text style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>Done today</Text>
    </Box>
  );
}
