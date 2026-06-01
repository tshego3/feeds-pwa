import { Box, Text, Button, Skeleton, Stack } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { tokens } from '../theme';

interface ErrorStateProps {
  readonly message: string;
  readonly onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Box style={{ textAlign: 'center', padding: 40 }}>
      <Text size="sm" c={tokens.textSecondary} mb="md">
        {message}
      </Text>
      <Button
        variant="subtle"
        color="gray"
        leftSection={<IconRefresh size={16} />}
        onClick={onRetry}
      >
        Try Again
      </Button>
    </Box>
  );
}

interface EmptyStateProps {
  readonly message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <Box style={{ textAlign: 'center', padding: 40 }}>
      <Text size="sm" c={tokens.textSecondary}>
        {message}
      </Text>
    </Box>
  );
}

export function LoadingSkeleton() {
  return (
    <Stack gap="md" p="md">
      <Skeleton height={200} radius="lg" />
      <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Skeleton height={160} radius="lg" />
        <Skeleton height={160} radius="lg" />
      </Box>
      <Skeleton height={60} radius="sm" />
      <Skeleton height={60} radius="sm" />
      <Skeleton height={60} radius="sm" />
    </Stack>
  );
}
