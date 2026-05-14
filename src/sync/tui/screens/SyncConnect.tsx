import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../../../tui/components/Header';
import { TextInput } from '../../../tui/components/TextInput';
import { theme } from '../../../tui/theme';
import type { SyncNavigation } from '../hooks/useSyncNav';
import type { SyncWizardAction, SyncWizardSession } from '../state/types';

type Field = 0 | 1 | 2 | 3;

const FIELDS: { label: string; key: keyof Pick<SyncWizardSession, 'oldUrl' | 'oldKey' | 'newUrl' | 'newKey'>; placeholder: string }[] = [
  { label: 'URL do projeto ANTIGO', key: 'oldUrl', placeholder: 'https://abc.supabase.co' },
  { label: 'Service Role Key do projeto ANTIGO', key: 'oldKey', placeholder: 'eyJ...' },
  { label: 'URL do projeto NOVO', key: 'newUrl', placeholder: 'https://xyz.supabase.co' },
  { label: 'Service Role Key do projeto NOVO', key: 'newKey', placeholder: 'eyJ...' },
];

interface Props {
  nav: SyncNavigation;
  session: SyncWizardSession;
  dispatch: React.Dispatch<SyncWizardAction>;
  onSubmit: () => void;
}

const ACTION_MAP = {
  oldUrl: 'SET_OLD_URL',
  oldKey: 'SET_OLD_KEY',
  newUrl: 'SET_NEW_URL',
  newKey: 'SET_NEW_KEY',
} as const;

export function SyncConnect({ nav, session, dispatch, onSubmit }: Props) {
  const [active, setActive] = useState<Field>(0);

  const allFilled =
    session.oldUrl.trim() &&
    session.oldKey.trim() &&
    session.newUrl.trim() &&
    session.newKey.trim();

  useInput((_input, key) => {
    if (key.escape) nav.goTo('sync-welcome');
    if (key.tab) setActive(prev => ((prev + 1) % 4) as Field);
    if (key.return && active < 3) setActive(prev => ((prev + 1) % 4) as Field);
    if (key.return && active === 3 && allFilled) onSubmit();
  });

  const values: Record<string, string> = {
    oldUrl: session.oldUrl,
    oldKey: session.oldKey,
    newUrl: session.newUrl,
    newKey: session.newKey,
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Passo 1/4 — Credenciais Supabase" />

      <Box flexDirection="column" marginLeft={2} marginTop={1}>
        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.colors.primary} bold>Projeto ANTIGO</Text>
          <Text color={theme.colors.muted} dimColor>(onde estão os dados existentes)</Text>
        </Box>

        <TextInput
          label={FIELDS[0].label}
          value={values.oldUrl}
          onChange={(v) => dispatch({ type: ACTION_MAP.oldUrl, value: v })}
          onSubmit={() => setActive(1)}
          placeholder={FIELDS[0].placeholder}
          active={active === 0}
        />
        <TextInput
          label={FIELDS[1].label}
          value={values.oldKey}
          onChange={(v) => dispatch({ type: ACTION_MAP.oldKey, value: v })}
          onSubmit={() => setActive(2)}
          placeholder={FIELDS[1].placeholder}
          active={active === 1}
        />

        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Text color={theme.colors.primary} bold>Projeto NOVO</Text>
          <Text color={theme.colors.muted} dimColor>(onde os usuários criaram nova conta)</Text>
        </Box>

        <TextInput
          label={FIELDS[2].label}
          value={values.newUrl}
          onChange={(v) => dispatch({ type: ACTION_MAP.newUrl, value: v })}
          onSubmit={() => setActive(3)}
          placeholder={FIELDS[2].placeholder}
          active={active === 2}
        />
        <TextInput
          label={FIELDS[3].label}
          value={values.newKey}
          onChange={(v) => dispatch({ type: ACTION_MAP.newKey, value: v })}
          onSubmit={() => allFilled && onSubmit()}
          placeholder={FIELDS[3].placeholder}
          active={active === 3}
        />
      </Box>

      <Box marginLeft={2} marginTop={2}>
        {allFilled
          ? <Text color={theme.colors.muted}>Tab: próximo campo  ·  Enter: continuar  ·  Esc: voltar</Text>
          : <Text color={theme.colors.muted}>Tab: próximo campo  ·  Esc: voltar</Text>
        }
      </Box>
    </Box>
  );
}
