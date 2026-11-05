import { Box, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { alpha, tokens } from '../theme';

// Shown while a database upgrade waits for an older feeds tab to close. It
// hides itself once the upgrade completes, so it has no dismiss button.
export function UpgradeBlockedBanner() {
  return (
    <Box
      role="status"
      style={{
        position: 'fixed',
        top: 8,
        left: 16,
        right: 16,
        zIndex: 300,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: alpha(tokens.primary, 95),
          borderRadius: 12,
        }}
      >
        <IconAlertTriangle size={18} color={tokens.onPrimary} aria-hidden />
        <Text style={{ fontSize: 15, fontWeight: 500, color: tokens.onPrimary }}>
          Updating feeds. Close other feeds tabs to finish.
        </Text>
      </Box>
    </Box>
  );
}
