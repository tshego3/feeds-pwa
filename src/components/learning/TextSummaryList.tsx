import { Box, Text } from '@mantine/core';
import type { SummarySource } from '../../types';
import { tokens } from '../../theme';

interface TextSummaryListProps {
  readonly summary: readonly string[];
  readonly source: SummarySource;
}

const SOURCE_LABELS: Readonly<Record<SummarySource, string>> = {
  extractive: 'Key sentences',
  'on-device': 'On-device AI',
};

export function TextSummaryList({ summary, source }: TextSummaryListProps) {
  return (
    <Box>
      <Text
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: tokens.textSecondary,
          marginBottom: 12,
        }}
      >
        {SOURCE_LABELS[source]}
      </Text>
      <Box component="ol" style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {summary.map((sentence, i) => (
          <Text component="li" key={i} style={{ fontSize: 16, lineHeight: 1.6, color: tokens.onSurface }}>
            {sentence}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
