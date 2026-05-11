import React from 'react';
import { Box } from 'ink';
import { Header }        from '../components/Header';
import { ConfirmPrompt } from '../components/ConfirmPrompt';

interface ConfirmScreenProps {
  readonly subtitle:   string;
  readonly message:    string;
  readonly dangerous?: boolean;
  readonly onConfirm:  () => void;
  readonly onCancel:   () => void;
}

export function ConfirmScreen({
  subtitle,
  message,
  dangerous,
  onConfirm,
  onCancel,
}: ConfirmScreenProps): React.ReactElement {
  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle={subtitle} />
      <ConfirmPrompt
        message={message}
        dangerous={dangerous}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </Box>
  );
}
