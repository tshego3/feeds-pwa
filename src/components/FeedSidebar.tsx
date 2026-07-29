import { Box, Text, UnstyledButton, Collapse } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { FeedMenuItem, RssFeedModel } from '../types';
import { tokens } from '../theme';

interface FeedSidebarProps {
  readonly menuItems: readonly FeedMenuItem[];
  readonly selectedFeedId: number | null;
  readonly onSelectFeed: (feed: RssFeedModel) => void;
}

export function FeedSidebar({ menuItems, selectedFeedId, onSelectFeed }: FeedSidebarProps) {
  return (
    <Box component="nav" aria-label="Feeds" style={{ padding: '8px 0' }}>
      {/* FEEDS section label */}
      <Text
        style={{
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: tokens.onSurfaceVariant,
          opacity: 0.5,
          padding: '12px 24px 8px',
          textTransform: 'uppercase',
        }}
      >
        Feeds
      </Text>

      {menuItems.map((item) =>
        item.type === 'single' ? (
          <FeedRow
            key={item.feed.id}
            feed={item.feed}
            isSelected={selectedFeedId === item.feed.id}
            onSelect={onSelectFeed}
          />
        ) : (
          <FeedGroup
            key={item.id}
            id={item.id}
            title={item.title}
            feeds={item.feeds}
            selectedFeedId={selectedFeedId}
            onSelectFeed={onSelectFeed}
          />
        ),
      )}
    </Box>
  );
}

interface FeedRowProps {
  readonly feed: RssFeedModel;
  readonly isSelected: boolean;
  readonly onSelect: (feed: RssFeedModel) => void;
  readonly indented?: boolean;
}

function FeedRow({ feed, isSelected, onSelect, indented }: FeedRowProps) {
  return (
    <UnstyledButton
      onClick={() => onSelect(feed)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '8px 24px',
        paddingLeft: indented ? 36 : 24,
        backgroundColor: isSelected ? `${tokens.secondaryContainer}4D` : 'transparent',
        color: isSelected ? tokens.primary : tokens.onSurfaceVariant,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.02em',
      }}
    >
      <Box
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: isSelected ? tokens.primary : tokens.surfaceContainerHigh,
          flexShrink: 0,
        }}
      />
      <Text size="sm" lineClamp={1} style={{ color: 'inherit' }}>
        {feed.title}
      </Text>
    </UnstyledButton>
  );
}

interface FeedGroupProps {
  readonly id: string;
  readonly title: string;
  readonly feeds: readonly RssFeedModel[];
  readonly selectedFeedId: number | null;
  readonly onSelectFeed: (feed: RssFeedModel) => void;
}

function FeedGroup({ title, feeds, selectedFeedId, onSelectFeed }: FeedGroupProps) {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Box>
      <UnstyledButton
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 24px',
          color: tokens.onSurfaceVariant,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}
      >
        {opened ? <IconChevronDown size={10} stroke={2.5} /> : <IconChevronRight size={10} stroke={2.5} />}
        <Text size="sm" style={{ color: 'inherit', flex: 1 }}>
          {title}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: tokens.outline,
          }}
        >
          {feeds.length}
        </Text>
      </UnstyledButton>
      <Collapse expanded={opened}>
        {feeds.map((feed) => (
          <FeedRow
            key={feed.id}
            feed={feed}
            isSelected={selectedFeedId === feed.id}
            onSelect={onSelectFeed}
            indented
          />
        ))}
      </Collapse>
    </Box>
  );
}
