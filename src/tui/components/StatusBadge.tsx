import React from 'react';
import { Text } from 'ink';
import { theme } from '../theme';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

interface StatusBadgeProps {
  readonly variant: BadgeVariant;
  readonly label:   string;
}

const VARIANT_COLOR: Record<BadgeVariant, string> = {
  success: theme.colors.success,
  warning: theme.colors.warning,
  error:   theme.colors.error,
  info:    theme.colors.info,
  muted:   theme.colors.muted,
};

const VARIANT_SYMBOL: Record<BadgeVariant, string> = {
  success: theme.symbols.check,
  warning: theme.symbols.warn,
  error:   theme.symbols.cross,
  info:    theme.symbols.bullet,
  muted:   theme.symbols.dot,
};

export function StatusBadge({ variant, label }: StatusBadgeProps): React.ReactElement {
  const color  = VARIANT_COLOR[variant];
  const symbol = VARIANT_SYMBOL[variant];
  return (
    <Text color={color as Parameters<typeof Text>[0]['color']}>
      {symbol} {label}
    </Text>
  );
}
