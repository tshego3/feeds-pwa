import { useEffect, useState } from 'react';
import { Box, Text, CloseButton } from '@mantine/core';
import { tokens } from '../theme';

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
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        backgroundColor: tokens.elevated,
        border: `1px solid ${tokens.border}`,
        borderRadius: 8,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Text size="sm" c={tokens.textPrimary}>
        {count} new {count === 1 ? 'article' : 'articles'}
      </Text>
      <CloseButton size="sm" c={tokens.textSecondary} onClick={onDismiss} />
    </Box>
  );
}
