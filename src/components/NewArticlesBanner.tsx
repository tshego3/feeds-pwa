import { useEffect, useState } from 'react';
import { Box, Text, UnstyledButton } from '@mantine/core';
import { IconNews, IconX } from '@tabler/icons-react';
import { SAFE_TOP, alpha, tokens } from '../theme';

interface NewArticlesBannerProps {
  readonly count: number;
  readonly onDismiss: () => void;
}

export function NewArticlesBanner({ count, onDismiss }: NewArticlesBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible || count === 0) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        top: `calc(8px + ${SAFE_TOP})`,
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
        <IconNews size={18} color={tokens.onPrimary} />
        <Text style={{ fontSize: 15, fontWeight: 500, color: tokens.onPrimary }}>
          New articles available
        </Text>
        <Box style={{ flex: 1 }} />
        <UnstyledButton onClick={onDismiss} style={{ color: tokens.onPrimary, display: 'flex' }}>
          <IconX size={14} />
        </UnstyledButton>
      </Box>
    </Box>
  );
}
