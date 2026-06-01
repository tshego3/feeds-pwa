import { useState, useEffect } from 'react';
import { Box, Text, UnstyledButton, Switch, TextInput, Button } from '@mantine/core';
import { IconTrash, IconPlus, IconPhoto, IconPhotoOff, IconAntenna, IconFileExport } from '@tabler/icons-react';
import type { RssFeedModel } from '../types';
import { getAllSubscriptions, addSubscription, removeSubscription, updateSuppressHeroImage, clearArticles } from '../db';
import { tokens } from '../theme';
import {
  isNotificationSupported,
  getNotificationPreference,
  setNotificationPreference,
  requestNotificationPermission,
} from '../notifications';

type SettingsView = 'main' | 'manage-feeds' | 'add-feed';

export function SettingsScreen() {
  const [view, setView] = useState<SettingsView>('main');
  const [feeds, setFeeds] = useState<RssFeedModel[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showImages, setShowImages] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => getNotificationPreference());
  const notificationsSupported = isNotificationSupported();

  useEffect(() => {
    getAllSubscriptions().then(setFeeds);
  }, []);

  if (view === 'manage-feeds') {
    return (
      <ManageFeedsView
        feeds={feeds}
        setFeeds={setFeeds}
        onBack={() => setView('main')}
        onAdd={() => setView('add-feed')}
      />
    );
  }

  if (view === 'add-feed') {
    return (
      <AddFeedView
        feedCount={feeds.length}
        onAdded={(feed) => {
          setFeeds((prev) => [...prev, feed]);
          setView('manage-feeds');
        }}
        onCancel={() => setView('manage-feeds')}
      />
    );
  }

  return (
    <Box style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <Box style={{ padding: '32px 24px' }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: tokens.primary,
          }}
        >
          Settings
        </Text>
      </Box>

      {/* Preferences section */}
      <SettingsSection title="Preferences">
        <GlassPanel>
          <ToggleRow
            title="Auto-Refresh Feeds"
            subtitle="Refresh every 15 minutes"
            value={autoRefresh}
            onChange={setAutoRefresh}
          />
          <Divider />
          <ToggleRow
            title="Show Preview Images"
            subtitle="Display article thumbnails"
            value={showImages}
            onChange={setShowImages}
          />
          {notificationsSupported && (
            <>
              <Divider />
              <ToggleRow
                title="New Article Notifications"
                subtitle={Notification.permission === 'denied' ? 'Blocked by browser' : 'Notify when new articles arrive'}
                value={notificationsEnabled}
                onChange={async (enabled) => {
                  if (enabled) {
                    const granted = await requestNotificationPermission();
                    setNotificationsEnabled(granted);
                    setNotificationPreference(granted);
                  } else {
                    setNotificationsEnabled(false);
                    setNotificationPreference(false);
                  }
                }}
              />
            </>
          )}
        </GlassPanel>
      </SettingsSection>

      {/* Feed Management section */}
      <SettingsSection title="Feed Management">
        <GlassPanel>
          <UnstyledButton
            onClick={() => setView('manage-feeds')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              width: '100%',
            }}
          >
            <IconAntenna size={20} color={tokens.primary} />
            <Box style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: 500, color: tokens.primary }}>
                Manage Feeds
              </Text>
              <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: tokens.onSurfaceVariant }}>
                {feeds.length} subscription{feeds.length !== 1 ? 's' : ''}
              </Text>
            </Box>
            <Text style={{ fontSize: 16, color: tokens.onSurfaceVariant }}>›</Text>
          </UnstyledButton>
        </GlassPanel>
      </SettingsSection>

      {/* Data Management section */}
      <SettingsSection title="Data">
        <GlassPanel>
          <Box style={{ padding: 20 }}>
            <Box style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <IconFileExport size={28} color={tokens.primary} />
              <Box style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', color: tokens.primary }}>
                  Export Subscriptions
                </Text>
                <Text style={{ fontSize: 13, color: tokens.onSurfaceVariant, marginTop: 4 }}>
                  Download your feed list as JSON
                </Text>
              </Box>
            </Box>
            <Button
              variant="subtle"
              mt="md"
              onClick={() => exportSubscriptions(feeds)}
              style={{ color: tokens.primary }}
            >
              Export
            </Button>
          </Box>
          <Divider />
          <Box style={{ padding: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: 500, color: tokens.primary }}>
              Clear Article Cache
            </Text>
            <Text style={{ fontSize: 13, color: tokens.onSurfaceVariant, marginTop: 4 }}>
              Remove all cached articles (subscriptions preserved)
            </Text>
            <Button
              variant="subtle"
              color="red"
              mt="md"
              onClick={async () => {
                await clearArticles();
              }}
            >
              Clear Cache
            </Button>
          </Box>
        </GlassPanel>
      </SettingsSection>

      {/* Footer */}
      <Box style={{ padding: '32px 24px', textAlign: 'center' }}>
        <Box style={{ height: 1, backgroundColor: tokens.outlineVariant, marginBottom: 32 }} />
        <Text style={{ fontSize: 13, color: tokens.onSurfaceVariant, opacity: 0.2 }}>
          feeds v0.1.0
        </Text>
      </Box>
    </Box>
  );
}

// --- Manage Feeds View ---

interface ManageFeedsViewProps {
  readonly feeds: RssFeedModel[];
  readonly setFeeds: React.Dispatch<React.SetStateAction<RssFeedModel[]>>;
  readonly onBack: () => void;
  readonly onAdd: () => void;
}

function ManageFeedsView({ feeds, setFeeds, onBack, onAdd }: ManageFeedsViewProps) {
  async function handleRemove(id: number) {
    await removeSubscription(id);
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleToggleHero(id: number, value: boolean) {
    await updateSuppressHeroImage(id, value);
    setFeeds((prev) => prev.map((f) => (f.id === id ? { ...f, suppressHeroImage: value } : f)));
  }

  // Group feeds
  const grouped = new Map<string, RssFeedModel[]>();
  const general: RssFeedModel[] = [];
  for (const feed of feeds) {
    if (feed.groupTitle) {
      const existing = grouped.get(feed.groupTitle) ?? [];
      existing.push(feed);
      grouped.set(feed.groupTitle, existing);
    } else {
      general.push(feed);
    }
  }

  return (
    <Box style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <Box style={{ padding: '32px 24px', display: 'flex', alignItems: 'flex-start' }}>
        <Box style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: tokens.primary }}
          >
            Manage Feeds
          </Text>
          <Text
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: tokens.onSurfaceVariant, marginTop: 8, textTransform: 'uppercase' }}
          >
            {feeds.length} subscription{feeds.length !== 1 ? 's' : ''}
          </Text>
        </Box>
        <UnstyledButton onClick={onBack} style={{ fontSize: 13, fontWeight: 500, color: tokens.onSurfaceVariant, padding: '8px 0' }}>
          ← Back
        </UnstyledButton>
      </Box>

      {/* Add button */}
      <Box style={{ padding: '0 24px 24px' }}>
        <UnstyledButton
          onClick={onAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: tokens.primary,
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          <IconPlus size={20} />
          Add Feed
        </UnstyledButton>
      </Box>

      {/* General feeds */}
      {general.length > 0 && (
        <FeedGroupSection title="General" feeds={general} onRemove={handleRemove} onToggleHero={handleToggleHero} />
      )}

      {/* Grouped feeds */}
      {[...grouped.entries()].map(([groupTitle, groupFeeds]) => (
        <FeedGroupSection
          key={groupTitle}
          title={groupTitle}
          feeds={groupFeeds}
          onRemove={handleRemove}
          onToggleHero={handleToggleHero}
        />
      ))}
    </Box>
  );
}

interface FeedGroupSectionProps {
  readonly title: string;
  readonly feeds: RssFeedModel[];
  readonly onRemove: (id: number) => void;
  readonly onToggleHero: (id: number, value: boolean) => void;
}

function FeedGroupSection({ title, feeds, onRemove, onToggleHero }: FeedGroupSectionProps) {
  return (
    <Box style={{ padding: '0 24px 24px' }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.15em',
          color: tokens.onSurfaceVariant,
          opacity: 0.5,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      <GlassPanel>
        {feeds.map((feed, i) => (
          <Box key={feed.id}>
            {i > 0 && <Divider />}
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 16,
              }}
            >
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text
                  lineClamp={1}
                  style={{ fontSize: 15, fontWeight: 500, color: tokens.primary }}
                >
                  {feed.title}
                </Text>
                <Text
                  lineClamp={1}
                  style={{ fontSize: 11, color: tokens.onSurfaceVariant, marginTop: 4 }}
                >
                  {feed.url}
                </Text>
              </Box>
              <UnstyledButton
                onClick={() => onToggleHero(feed.id, !feed.suppressHeroImage)}
                style={{ padding: 6, color: feed.suppressHeroImage ? tokens.primary : tokens.onSurfaceVariant }}
              >
                {feed.suppressHeroImage ? <IconPhotoOff size={18} /> : <IconPhoto size={18} />}
              </UnstyledButton>
              <UnstyledButton
                onClick={() => onRemove(feed.id)}
                style={{ padding: 6, color: tokens.error }}
              >
                <IconTrash size={14} />
              </UnstyledButton>
            </Box>
          </Box>
        ))}
      </GlassPanel>
    </Box>
  );
}

// --- Add Feed View ---

interface AddFeedViewProps {
  readonly feedCount: number;
  readonly onAdded: (feed: RssFeedModel) => void;
  readonly onCancel: () => void;
}

function AddFeedView({ feedCount, onAdded, onCancel }: AddFeedViewProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [group, setGroup] = useState('');
  const [suppressHero, setSuppressHero] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  async function handleSubmit() {
    if (!title.trim() || !url.trim()) return;
    if (!validateUrl(url.trim())) {
      setError('Please enter a valid URL starting with https:// or http://');
      return;
    }
    setError(null);
    const id = await addSubscription({
      title: title.trim(),
      url: url.trim(),
      sortOrder: feedCount,
      suppressHeroImage: suppressHero,
      groupId: group.trim() || undefined,
      groupTitle: group.trim() || undefined,
    });
    onAdded({
      id,
      title: title.trim(),
      url: url.trim(),
      sortOrder: feedCount,
      suppressHeroImage: suppressHero,
      groupId: group.trim() || undefined,
      groupTitle: group.trim() || undefined,
    });
  }

  const canSubmit = title.trim().length > 0 && url.trim().length > 0;

  return (
    <Box style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <Box style={{ padding: '32px 24px', display: 'flex', alignItems: 'center' }}>
        <UnstyledButton onClick={onCancel} style={{ fontSize: 13, fontWeight: 500, color: tokens.onSurfaceVariant }}>
          Cancel
        </UnstyledButton>
        <Box style={{ flex: 1 }} />
        <Text style={{ fontSize: 20, fontWeight: 600, color: tokens.primary }}>
          Add Feed
        </Text>
        <Box style={{ flex: 1 }} />
        <UnstyledButton
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ fontSize: 13, fontWeight: 600, color: canSubmit ? tokens.primary : tokens.outline }}
        >
          Add
        </UnstyledButton>
      </Box>

      <Box style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Feed Name */}
        <Box>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: tokens.onSurfaceVariant,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Feed Name
          </Text>
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            placeholder="My Feed"
            styles={{
              input: {
                backgroundColor: tokens.surfaceContainerLow,
                borderColor: tokens.outlineVariant,
                color: tokens.primary,
                borderRadius: 8,
              },
            }}
          />
        </Box>

        {/* Feed URL */}
        <Box>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: tokens.onSurfaceVariant,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Feed URL
          </Text>
          <TextInput
            value={url}
            onChange={(e) => { setUrl(e.currentTarget.value); setError(null); }}
            placeholder="https://example.com/feed.xml"
            styles={{
              input: {
                backgroundColor: tokens.surfaceContainerLow,
                borderColor: error ? tokens.error : tokens.outlineVariant,
                color: tokens.primary,
                borderRadius: 8,
              },
            }}
          />
          {error && (
            <Text style={{ fontSize: 13, color: tokens.error, marginTop: 8 }}>
              {error}
            </Text>
          )}
        </Box>

        {/* Group */}
        <Box>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: tokens.onSurfaceVariant,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Group (Optional)
          </Text>
          <TextInput
            value={group}
            onChange={(e) => setGroup(e.currentTarget.value)}
            placeholder="News, Tech, Sports..."
            styles={{
              input: {
                backgroundColor: tokens.surfaceContainerLow,
                borderColor: tokens.outlineVariant,
                color: tokens.primary,
                borderRadius: 8,
              },
            }}
          />
        </Box>

        {/* Suppress Hero Image */}
        <GlassPanel>
          <Box style={{ padding: 16, display: 'flex', alignItems: 'center' }}>
            <Box style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: 500, color: tokens.primary }}>
                Suppress Hero Image
              </Text>
              <Text style={{ fontSize: 11, color: tokens.onSurfaceVariant, marginTop: 4 }}>
                Hide article preview images
              </Text>
            </Box>
            <Switch
              checked={suppressHero}
              onChange={(e) => setSuppressHero(e.currentTarget.checked)}
              color="dark"
            />
          </Box>
        </GlassPanel>
      </Box>
    </Box>
  );
}

// --- Shared components ---

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box style={{ padding: '0 24px 32px' }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: tokens.onSurfaceVariant,
          opacity: 0.5,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      {children}
    </Box>
  );
}

function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        backgroundColor: `${tokens.surfaceContainerLow}CC`,
        borderRadius: 12,
        border: `1px solid ${tokens.outlineVariant}`,
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void | Promise<void>;
}) {
  return (
    <Box style={{ display: 'flex', alignItems: 'center', padding: 16 }}>
      <Box style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: 500, color: tokens.primary }}>
          {title}
        </Text>
        <Text style={{ fontSize: 11, color: tokens.onSurfaceVariant, marginTop: 4 }}>
          {subtitle}
        </Text>
      </Box>
      <Switch checked={value} onChange={(e) => onChange(e.currentTarget.checked)} color="dark" />
    </Box>
  );
}

function Divider() {
  return <Box style={{ height: 1, backgroundColor: tokens.outlineVariant, margin: '0 16px' }} />;
}

function exportSubscriptions(feeds: RssFeedModel[]) {
  const json = JSON.stringify(feeds, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'feeds-subscriptions.json';
  a.click();
  URL.revokeObjectURL(url);
}
