import { useState } from 'react';
import { Box, Text, UnstyledButton } from '@mantine/core';
import { IconHome, IconSearch, IconBookmark, IconSettings } from '@tabler/icons-react';
import type { AppScreen } from '../types';
import { tokens } from '../theme';

export interface NavTab {
  readonly id: AppScreen;
  readonly icon: typeof IconHome;
  readonly label: string;
}

// Single source of truth for the four top-level destinations, shared by the
// desktop/tablet sidebar and the mobile bottom tab bar.
export const navTabs: readonly NavTab[] = [
  { id: 'home', icon: IconHome, label: 'Home' },
  { id: 'search', icon: IconSearch, label: 'Search' },
  { id: 'bookmarks', icon: IconBookmark, label: 'Bookmarks' },
  { id: 'settings', icon: IconSettings, label: 'Settings' },
];

interface PrimaryNavProps {
  readonly current: AppScreen;
  readonly onNavigate: (screen: AppScreen) => void;
}

export function PrimaryNav({ current, onNavigate }: PrimaryNavProps) {
  return (
    <Box component="nav" aria-label="Main" style={{ padding: '8px 0' }}>
      {navTabs.map((tab) => (
        <NavRow
          key={tab.id}
          tab={tab}
          isActive={current === tab.id}
          onSelect={() => onNavigate(tab.id)}
        />
      ))}
    </Box>
  );
}

interface NavRowProps {
  readonly tab: NavTab;
  readonly isActive: boolean;
  readonly onSelect: () => void;
}

function NavRow({ tab, isActive, onSelect }: NavRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <UnstyledButton
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-current={isActive ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        minHeight: 44,
        // Left accent border is always laid out so the label never shifts.
        padding: '10px 24px',
        borderLeft: `2px solid ${isActive ? tokens.accent : 'transparent'}`,
        paddingLeft: 22,
        backgroundColor: isActive
          ? `${tokens.secondaryContainer}4D`
          : hovered
            ? tokens.elevated
            : 'transparent',
        color: isActive ? tokens.primary : tokens.onSurfaceVariant,
        transition: 'background-color 150ms ease',
      }}
    >
      <tab.icon size={20} stroke={1.5} />
      <Text
        size="sm"
        style={{
          color: 'inherit',
          fontWeight: isActive ? 600 : 500,
          letterSpacing: '0.02em',
        }}
      >
        {tab.label}
      </Text>
    </UnstyledButton>
  );
}
