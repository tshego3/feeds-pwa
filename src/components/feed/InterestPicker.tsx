import { useState } from 'react';
import { Box, Button, Chip, Group, Text } from '@mantine/core';
import type { InterestId, InterestSource } from '../../types';
import { tokens } from '../../theme';

const MIN_INTERESTS = 3;

interface InterestPickerProps {
  readonly interests: readonly InterestSource[];
  readonly selected: readonly InterestId[];
  readonly onSave: (ids: InterestId[]) => void;
  readonly saveLabel?: string;
}

export function InterestPicker({ interests, selected, onSave, saveLabel = 'Start learning' }: InterestPickerProps) {
  const [chosen, setChosen] = useState<string[]>([...selected]);
  const ready = chosen.length >= MIN_INTERESTS;
  return (
    <Box style={{ maxWidth: 520, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Text component="h1" style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: tokens.primary }}>
        What do you want to learn?
      </Text>
      <Text id="interest-hint" style={{ fontSize: 15, color: tokens.textSecondary }}>
        Pick {MIN_INTERESTS} or more topics. You can change them later in Settings.
      </Text>
      <Chip.Group multiple value={chosen} onChange={setChosen}>
        <Group gap="sm" aria-describedby="interest-hint">
          {interests.map((interest) => (
            <Chip key={interest.id} value={interest.id} size="md" radius="xl" color="gray" variant="outline">
              {interest.title}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
      <Button
        radius="xl"
        size="md"
        disabled={!ready}
        onClick={() => onSave(interests.map((i) => i.id).filter((id) => chosen.includes(id)))}
        style={
          ready
            ? { backgroundColor: tokens.primary, color: tokens.onPrimary }
            : { backgroundColor: tokens.surfaceContainerHigh, color: tokens.textSecondary, opacity: 1 }
        }
      >
        {ready ? saveLabel : `Pick ${MIN_INTERESTS - chosen.length} more`}
      </Button>
    </Box>
  );
}
