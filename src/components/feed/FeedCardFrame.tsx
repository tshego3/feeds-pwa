import type { ReactNode } from 'react';
import { ActionIcon, Box, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconBookmark,
  IconBookmarkFilled,
  IconExternalLink,
  IconEyeOff,
  IconSchool,
  IconShare,
  IconVolume,
} from '@tabler/icons-react';
import type { FeedCard } from '../../types';
import { alpha, tokens } from '../../theme';

export interface CardActions {
  readonly onSave?: () => void;
  readonly onListen?: () => void;
  readonly onOpen?: () => void;
  readonly onLearn?: () => void;
  readonly onShare?: () => void;
  readonly onNotInterested?: () => void;
}

interface FeedCardFrameProps extends CardActions {
  readonly card: FeedCard;
  readonly index: number;
  readonly isSaved: boolean;
  readonly label: string;
  readonly titleId: string;
  readonly openLabel?: string;
  readonly children: ReactNode;
}

// One full-screen snap page of the For You feed: the card body plus the
// action rail. Actions render only when their handler is given.
export function FeedCardFrame(props: FeedCardFrameProps) {
  const { card, index, label, titleId, children } = props;
  const isDesktop = useMediaQuery('(min-width: 768px)');
  return (
    <Box
      component="article"
      data-card-id={card.id}
      data-card-kind={card.kind}
      data-index={index}
      aria-posinset={index + 1}
      aria-setsize={-1}
      aria-labelledby={titleId}
      style={{
        height: '100%',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        display: 'flex',
        justifyContent: 'center',
        padding: isDesktop ? '16px 72px 16px 16px' : 12,
        boxSizing: 'border-box',
      }}
    >
      <Box style={{ position: 'relative', width: '100%', maxWidth: 480, height: '100%', display: 'flex' }}>
        <Box
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 24,
            overflow: 'hidden',
            backgroundColor: tokens.surfaceContainerLow,
            border: `1px solid ${tokens.outlineVariant}`,
          }}
        >
          <Text
            style={{
              padding: '16px 20px 0',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: tokens.textSecondary,
            }}
          >
            {label}
          </Text>
          {children}
          {/* Phones: actions sit in a row under the content, so they never
              cover text. Desktop: a rail beside the card. */}
          {!isDesktop && <ActionRail {...props} isDesktop={false} />}
        </Box>
        {isDesktop && <ActionRail {...props} isDesktop />}
      </Box>
    </Box>
  );
}

interface RailProps extends CardActions {
  readonly isSaved: boolean;
  readonly isDesktop: boolean;
  readonly openLabel?: string;
}

function ActionRail({ isSaved, isDesktop, openLabel, ...actions }: RailProps) {
  return (
    <Box
      role="toolbar"
      aria-label="Card actions"
      style={
        isDesktop
          ? { position: 'absolute', bottom: 0, right: -60, display: 'flex', flexDirection: 'column', gap: 8 }
          : {
              display: 'flex',
              justifyContent: 'space-around',
              gap: 4,
              padding: '8px 12px 12px',
              borderTop: `1px solid ${tokens.outlineVariant}`,
              flexShrink: 0,
            }
      }
    >
      <RailButton label={isSaved ? 'Remove from saved' : 'Save'} onClick={actions.onSave} active={isSaved}>
        {isSaved ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
      </RailButton>
      <RailButton label="Listen" onClick={actions.onListen}>
        <IconVolume size={20} />
      </RailButton>
      <RailButton label={openLabel ?? 'Open'} onClick={actions.onOpen}>
        <IconExternalLink size={20} />
      </RailButton>
      <RailButton label="Learn: turn this article into a lesson" onClick={actions.onLearn}>
        <IconSchool size={20} />
      </RailButton>
      <RailButton label="Share" onClick={actions.onShare}>
        <IconShare size={20} />
      </RailButton>
      <RailButton label="Not interested in this topic" onClick={actions.onNotInterested}>
        <IconEyeOff size={20} />
      </RailButton>
    </Box>
  );
}

interface RailButtonProps {
  readonly label: string;
  readonly onClick?: () => void;
  readonly active?: boolean;
  readonly children: ReactNode;
}

function RailButton({ label, onClick, active = false, children }: RailButtonProps) {
  if (!onClick) return null;
  return (
    <ActionIcon
      size={44}
      radius="xl"
      variant="filled"
      aria-label={label}
      aria-pressed={active ? true : undefined}
      onClick={onClick}
      style={{
        backgroundColor: alpha(tokens.elevated, 90),
        color: active ? tokens.accent : tokens.onSurface,
        border: `1px solid ${tokens.outlineVariant}`,
      }}
    >
      {children}
    </ActionIcon>
  );
}
