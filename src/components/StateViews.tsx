import { Box, Text, UnstyledButton, Skeleton, Stack } from '@mantine/core';
import { IconRefresh, IconAlertTriangle, IconInbox } from '@tabler/icons-react';
import { tokens } from '../theme';

interface ErrorStateProps {
  readonly message: string;
  readonly onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        minHeight: 300,
        padding: 40,
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      <IconAlertTriangle size={40} color={tokens.onSurfaceVariant} stroke={1} />
      <Text style={{ fontSize: 15, color: tokens.onSurfaceVariant, textAlign: 'center' }}>
        {message}
      </Text>
      <UnstyledButton
        onClick={onRetry}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 20px',
          borderRadius: 999,
          backgroundColor: tokens.primary,
          color: tokens.onPrimary,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <IconRefresh size={14} />
        Try Again
      </UnstyledButton>
    </Box>
  );
}

interface EmptyStateProps {
  readonly message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        minHeight: 300,
        padding: 40,
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      <IconInbox size={40} color={tokens.onSurfaceVariant} stroke={1} />
      <Text style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', color: tokens.primary }}>
        No articles found.
      </Text>
      <Text style={{ fontSize: 15, color: tokens.onSurfaceVariant, textAlign: 'center' }}>
        {message}
      </Text>
    </Box>
  );
}

export function LoadingSkeleton() {
  return (
    <Stack gap="md" p="lg" style={{ maxWidth: 720, margin: '0 auto' }}>
      <Skeleton height={380} radius={16} />
      <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Skeleton height={260} radius={16} />
        <Skeleton height={260} radius={16} />
      </Box>
      <Skeleton height={80} radius={12} />
      <Skeleton height={80} radius={12} />
      <Skeleton height={80} radius={12} />
    </Stack>
  );
}
