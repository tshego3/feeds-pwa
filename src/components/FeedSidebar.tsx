import { Box, Text, UnstyledButton, Collapse } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconChevronRight, IconRss } from '@tabler/icons-react';
import type { FeedMenuItem, RssFeedModel } from '../types';
import { tokens } from '../theme';

interface FeedSidebarProps {
  readonly menuItems: readonly FeedMenuItem[];
  readonly selectedFeedId: number | null;
  readonly onSelectFeed: (feed: RssFeedModel) => void;
}

export function FeedSidebar({ menuItems, selectedFeedId, onSelectFeed }: FeedSidebarProps) {
  return (
    <Box component="nav" style={{ padding: '8px 0' }}>
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
}

function FeedRow({ feed, isSelected, onSelect }: FeedRowProps) {
  return (
    <UnstyledButton
      onClick={() => onSelect(feed)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 16px',
        borderLeft: isSelected ? `2px solid ${tokens.accent}` : '2px solid transparent',
        backgroundColor: isSelected ? tokens.elevated : 'transparent',
        color: tokens.textPrimary,
        fontSize: 14,
      }}
    >
      <IconRss size={16} stroke={1.5} />
      <Text size="sm" lineClamp={1}>
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
          padding: '10px 16px',
          color: tokens.textSecondary,
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {opened ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        {title}
      </UnstyledButton>
      <Collapse expanded={opened}>
        {feeds.map((feed) => (
          <FeedRow
            key={feed.id}
            feed={feed}
            isSelected={selectedFeedId === feed.id}
            onSelect={onSelectFeed}
          />
        ))}
      </Collapse>
    </Box>
  );
}
