import React from 'react';
import { Text } from 'ink';
import { theme } from '../theme';

interface SpinnerProps {
  readonly label?: string;
}

export function Spinner({ label }: SpinnerProps): React.ReactElement {
  const [frame, setFrame] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % theme.symbols.spinner.length);
    }, 80);
    return () => clearInterval(id);
  }, []);

  return (
    <Text color={theme.colors.primary}>
      {theme.symbols.spinner[frame]}{label ? ` ${label}` : ''}
    </Text>
  );
}
