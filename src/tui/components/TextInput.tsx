import React from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme';

interface TextInputProps {
  readonly label:       string;
  readonly value:       string;
  readonly onChange:    (value: string) => void;
  readonly onSubmit:    (value: string) => void;
  readonly placeholder?: string;
  readonly active?:     boolean;
}

export function TextInput({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  active = true,
}: TextInputProps): React.ReactElement {
  useInput((input, key) => {
    if (!active) return;

    if (key.return) {
      onSubmit(value);
      return;
    }
    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }
    if (!key.ctrl && !key.meta && input) {
      onChange(value + input);
    }
  });

  const display = value || (placeholder ? placeholder : '');
  const color   = value ? theme.colors.white : theme.colors.muted;

  return (
    <Box marginBottom={1}>
      <Text color={active ? theme.colors.primary : theme.colors.muted} bold>{label}: </Text>
      <Text color={color as Parameters<typeof Text>[0]['color']}>{display}</Text>
      {active && <Text color={theme.colors.primary}>{'█'}</Text>}
    </Box>
  );
}
