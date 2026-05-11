import React from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme';

interface ConfirmPromptProps {
  readonly message:    string;
  readonly onConfirm:  () => void;
  readonly onCancel:   () => void;
  readonly dangerous?: boolean;
}

export function ConfirmPrompt({
  message,
  onConfirm,
  onCancel,
  dangerous = false,
}: ConfirmPromptProps): React.ReactElement {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y') onConfirm();
    if (input === 'n' || input === 'N' || key.escape) onCancel();
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={dangerous ? theme.colors.warning : theme.colors.white}>{message}</Text>
      <Box marginTop={1}>
        <Text color={theme.colors.muted}>
          Pressione{' '}
        </Text>
        <Text color={theme.colors.success} bold>y</Text>
        <Text color={theme.colors.muted}> para confirmar, </Text>
        <Text color={theme.colors.error} bold>n</Text>
        <Text color={theme.colors.muted}>/</Text>
        <Text color={theme.colors.error} bold>Esc</Text>
        <Text color={theme.colors.muted}> para cancelar</Text>
      </Box>
    </Box>
  );
}
