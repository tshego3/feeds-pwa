import { Anchor, Text } from '@mantine/core';
import { tokens } from '../../theme';

interface SourceAttributionProps {
  readonly label: string;
  readonly href: string;
  readonly license?: string;
}

// Credit line required by CC BY-SA sources (Wikipedia, Open Trivia DB) and
// shown for public-domain books too.
export function SourceAttribution({ label, href, license }: SourceAttributionProps) {
  return (
    <Text style={{ fontSize: 11, color: tokens.textSecondary, padding: '0 20px 16px' }}>
      <Anchor
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: tokens.textSecondary, textDecoration: 'underline' }}
      >
        {label}
      </Anchor>
      {license ? `, ${license}` : ''}
    </Text>
  );
}
