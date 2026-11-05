import type { ComponentType, ReactNode } from 'react';
import { Box, Text, UnstyledButton, Skeleton, Stack } from '@mantine/core';
import { IconRefresh, IconAlertTriangle, IconInbox } from '@tabler/icons-react';
import { tokens } from '../theme';

// Empty and error states follow one pattern (ProperUI empty-state layout):
// a featured icon in a tonal ring, a title, a short description, and up to
// two actions. Shared by every screen so the app never shows a bare message.

export interface StateAction {
  readonly label: string;
  readonly onClick: () => void;
  readonly icon?: ReactNode;
}

interface StatePanelProps {
  readonly icon: ComponentType<{ size?: number; stroke?: number }>;
  readonly title: string;
  readonly message: string;
  readonly primary?: StateAction;
  readonly secondary?: StateAction;
  readonly role?: 'status' | 'alert';
}

function StatePanel({ icon: Icon, title, message, primary, secondary, role = 'status' }: StatePanelProps) {
  return (
    <Box
      role={role}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        minHeight: 300,
        padding: '40px 24px',
        maxWidth: 480,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <Box
        aria-hidden
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
          color: tokens.onSurfaceVariant,
          backgroundColor: tokens.surfaceContainerHigh,
          // Tonal ring, not a shadow (depth comes from tonal layering only).
          outline: `8px solid ${tokens.surfaceContainerLow}`,
        }}
      >
        <Icon size={26} stroke={1.5} />
      </Box>
      <Text style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: tokens.primary }}>
        {title}
      </Text>
      <Text style={{ fontSize: 15, lineHeight: 1.6, color: tokens.onSurfaceVariant }}>{message}</Text>
      {(primary ?? secondary) && (
        <Box style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 }}>
          {secondary && <StateButton action={secondary} />}
          {primary && <StateButton action={primary} primary />}
        </Box>
      )}
    </Box>
  );
}

function StateButton({ action, primary = false }: { readonly action: StateAction; readonly primary?: boolean }) {
  return (
    <UnstyledButton
      onClick={action.onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minHeight: 44,
        padding: '10px 20px',
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 500,
        backgroundColor: primary ? tokens.primary : 'transparent',
        color: primary ? tokens.onPrimary : tokens.primary,
        border: primary ? 'none' : `1px solid ${tokens.outlineVariant}`,
      }}
    >
      {action.icon}
      {action.label}
    </UnstyledButton>
  );
}

interface ErrorStateProps {
  readonly message: string;
  readonly onRetry: () => void;
  readonly title?: string;
}

export function ErrorState({ message, onRetry, title = 'Something went wrong' }: ErrorStateProps) {
  return (
    <StatePanel
      role="alert"
      icon={IconAlertTriangle}
      title={title}
      message={message}
      primary={{ label: 'Try again', onClick: onRetry, icon: <IconRefresh size={16} /> }}
    />
  );
}

interface EmptyStateProps {
  readonly message: string;
  readonly title?: string;
  readonly icon?: ComponentType<{ size?: number; stroke?: number }>;
  readonly primary?: StateAction;
  readonly secondary?: StateAction;
}

export function EmptyState({ message, title = 'No articles found.', icon = IconInbox, primary, secondary }: EmptyStateProps) {
  return <StatePanel icon={icon} title={title} message={message} primary={primary} secondary={secondary} />;
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
