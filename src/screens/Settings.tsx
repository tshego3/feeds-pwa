import { useState, useEffect } from 'react';
import { Box, Text, TextInput, Button, Switch, ActionIcon, Stack } from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import type { RssFeedModel } from '../types';
import { getAllSubscriptions, addSubscription, removeSubscription, updateSuppressHeroImage } from '../db';
import { tokens } from '../theme';

export function SettingsScreen() {
  const [feeds, setFeeds] = useState<RssFeedModel[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    getAllSubscriptions().then(setFeeds);
  }, []);

  async function handleAdd() {
    if (!newTitle.trim() || !newUrl.trim()) return;
    const id = await addSubscription({
      title: newTitle.trim(),
      url: newUrl.trim(),
      sortOrder: feeds.length,
      suppressHeroImage: false,
    });
    setFeeds((prev) => [...prev, { id, title: newTitle.trim(), url: newUrl.trim(), sortOrder: feeds.length, suppressHeroImage: false }]);
    setNewTitle('');
    setNewUrl('');
    setShowAdd(false);
  }

  async function handleRemove(id: number) {
    await removeSubscription(id);
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleToggleHero(id: number, value: boolean) {
    await updateSuppressHeroImage(id, value);
    setFeeds((prev) => prev.map((f) => (f.id === id ? { ...f, suppressHeroImage: value } : f)));
  }

  return (
    <Box p="md">
      <Text size="lg" fw={600} c={tokens.textPrimary} mb="md">
        Feed Subscriptions
      </Text>

      <Stack gap="xs">
        {feeds.map((feed) => (
          <Box
            key={feed.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              backgroundColor: tokens.surface,
              borderRadius: 8,
              border: `1px solid ${tokens.border}`,
            }}
          >
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} c={tokens.textPrimary} lineClamp={1}>
                {feed.title}
              </Text>
              <Text size="xs" c={tokens.textSecondary} lineClamp={1}>
                {feed.url}
              </Text>
            </Box>
            <Switch
              size="xs"
              label="Hide images"
              checked={feed.suppressHeroImage}
              onChange={(e) => handleToggleHero(feed.id, e.currentTarget.checked)}
              styles={{ label: { color: tokens.textSecondary, fontSize: 11 } }}
            />
            <ActionIcon variant="subtle" color="red" onClick={() => handleRemove(feed.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Box>
        ))}
      </Stack>

      {showAdd ? (
        <Box mt="md" p="md" style={{ backgroundColor: tokens.surface, borderRadius: 12, border: `1px solid ${tokens.border}` }}>
          <TextInput
            label="Feed title"
            placeholder="My Feed"
            value={newTitle}
            onChange={(e) => setNewTitle(e.currentTarget.value)}
            mb="sm"
            styles={{ input: { backgroundColor: tokens.elevated, borderColor: tokens.border, color: tokens.textPrimary } }}
          />
          <TextInput
            label="Feed URL"
            placeholder="https://example.com/rss"
            value={newUrl}
            onChange={(e) => setNewUrl(e.currentTarget.value)}
            mb="sm"
            styles={{ input: { backgroundColor: tokens.elevated, borderColor: tokens.border, color: tokens.textPrimary } }}
          />
          <Box style={{ display: 'flex', gap: 8 }}>
            <Button size="xs" onClick={handleAdd}>
              Add
            </Button>
            <Button size="xs" variant="subtle" color="gray" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </Box>
        </Box>
      ) : (
        <Button
          mt="md"
          variant="subtle"
          leftSection={<IconPlus size={16} />}
          onClick={() => setShowAdd(true)}
        >
          Add Feed
        </Button>
      )}
    </Box>
  );
}
