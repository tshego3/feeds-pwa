import { useState } from 'react';
import { Box, Text, UnstyledButton, VisuallyHidden } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { tokens } from '../../theme';
import { ArticleImage } from '../ArticleImage';

interface LessonListItemProps {
  readonly title: string;
  readonly feedTitle: string;
  readonly imageUrl?: string;
  readonly readMinutes?: number;
  readonly isComplete: boolean;
  readonly onOpen: () => void;
}

export function LessonListItem({ title, feedTitle, imageUrl, readMinutes, isComplete, onOpen }: LessonListItemProps) {
  const [hovered, setHovered] = useState(false);
  const meta = readMinutes === undefined ? feedTitle : `${feedTitle} · ${readMinutes} min`;

  return (
    <UnstyledButton
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        minHeight: 44,
        padding: 12,
        borderRadius: 12,
        backgroundColor: hovered ? tokens.elevated : 'transparent',
        transition: 'background-color 150ms ease',
      }}
    >
      <Thumbnail imageUrl={imageUrl} label={feedTitle} />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text lineClamp={2} style={{ fontSize: 15, fontWeight: 500, color: tokens.primary }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 2 }}>{meta}</Text>
      </Box>
      {isComplete && (
        <Box style={{ color: tokens.primary }}>
          <IconCheck size={18} aria-hidden />
          <VisuallyHidden>Completed</VisuallyHidden>
        </Box>
      )}
    </UnstyledButton>
  );
}

function Thumbnail({ imageUrl, label }: { readonly imageUrl?: string; readonly label: string }) {
  return (
    <Box style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden' }}>
      <ArticleImage src={imageUrl} label={label} compact />
    </Box>
  );
}
