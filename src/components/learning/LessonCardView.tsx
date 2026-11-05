import { Paper, Text } from '@mantine/core';
import type { LessonCard } from '../../types';
import { tokens } from '../../theme';

interface LessonCardViewProps {
  readonly card: LessonCard;
  readonly label?: string;
}

export function LessonCardView({ card, label = 'Key idea' }: LessonCardViewProps) {
  return (
    <Paper
      radius={16}
      p="lg"
      style={{
        minHeight: 260,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        backgroundColor: tokens.surfaceContainerLow,
        border: `1px solid ${tokens.outlineVariant}`,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: tokens.textSecondary,
        }}
      >
        {label} {card.index + 1}
      </Text>
      <Text style={{ fontSize: 20, lineHeight: 1.6, color: tokens.primary }}>{card.text}</Text>
    </Paper>
  );
}
