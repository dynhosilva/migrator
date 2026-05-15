import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../../../tui/components/Header';
import { TextInput } from '../../../tui/components/TextInput';
import { theme } from '../../../tui/theme';
import type { SyncNavigation } from '../hooks/useSyncNav';
import type { SyncWizardAction, SyncWizardSession } from '../state/types';

type Field = 0 | 1 | 2 | 3;

interface Props {
  nav: SyncNavigation;
  session: SyncWizardSession;
  dispatch: React.Dispatch<SyncWizardAction>;
  onSubmit: () => void;
}

export function SyncConnect({ nav, session, dispatch, onSubmit }: Props) {
  const [active, setActive] = useState<Field>(0);
  const mode = session.oldAuthMode;

  const isJsonExport = mode === 'json-export';

  const field1Label = isJsonExport
    ? 'Arquivo export JSON (caminho ou URL)'
    : 'Service Role Key do projeto ANTIGO';

  const field1Placeholder = isJsonExport
    ? './auth-users.json'
    : 'eyJ...';

  const field1Value = isJsonExport ? session.oldAuthExport : session.oldKey;

  const allFilled = isJsonExport
    ? !!(session.oldAuthExport.trim() && session.newUrl.trim() && session.newKey.trim())
    : !!(session.oldUrl.trim() && session.oldKey.trim() && session.newUrl.trim() && session.newKey.trim());

  useInput((input, key) => {
    if (key.escape) { nav.goTo('sync-welcome'); return; }
    if (input === 'm' || input === 'M') {
      dispatch({
        type: 'SET_OLD_AUTH_MODE',
        value: isJsonExport ? 'service-key' : 'json-export',
      });
      return;
    }
    if (key.tab) { setActive(prev => ((prev + 1) % 4) as Field); return; }
    if (key.return && active < 3) { setActive(prev => ((prev + 1) % 4) as Field); return; }
    if (key.return && active === 3 && allFilled) { onSubmit(); return; }
  });

  function handleField1Change(v: string) {
    if (isJsonExport) {
      dispatch({ type: 'SET_OLD_AUTH_EXPORT', value: v });
    } else {
      dispatch({ type: 'SET_OLD_KEY', value: v });
    }
  }

  const modeIndicator = isJsonExport
    ? '○ service_role  ● JSON export  [M: alternar]'
    : '● service_role  ○ JSON export  [M: alternar]';

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Passo 1/4 — Credenciais Supabase" />

      <Box flexDirection="column" marginLeft={2} marginTop={1}>
        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.colors.primary} bold>Projeto ANTIGO</Text>
          <Text color={theme.colors.muted} dimColor>(onde estão os dados existentes)</Text>
          <Text color={theme.colors.muted}>{modeIndicator}</Text>
        </Box>

        <TextInput
          label="URL do projeto ANTIGO"
          value={session.oldUrl}
          onChange={(v) => dispatch({ type: 'SET_OLD_URL', value: v })}
          onSubmit={() => setActive(1)}
          placeholder="https://abc.supabase.co"
          active={active === 0}
        />
        <TextInput
          label={field1Label}
          value={field1Value}
          onChange={handleField1Change}
          onSubmit={() => setActive(2)}
          placeholder={field1Placeholder}
          active={active === 1}
        />

        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Text color={theme.colors.primary} bold>Projeto NOVO</Text>
          <Text color={theme.colors.muted} dimColor>(onde os usuários criaram nova conta)</Text>
        </Box>

        <TextInput
          label="URL do projeto NOVO"
          value={session.newUrl}
          onChange={(v) => dispatch({ type: 'SET_NEW_URL', value: v })}
          onSubmit={() => setActive(3)}
          placeholder="https://xyz.supabase.co"
          active={active === 2}
        />
        <TextInput
          label="Service Role Key do projeto NOVO"
          value={session.newKey}
          onChange={(v) => dispatch({ type: 'SET_NEW_KEY', value: v })}
          onSubmit={() => allFilled && onSubmit()}
          placeholder="eyJ..."
          active={active === 3}
        />
      </Box>

      <Box marginLeft={2} marginTop={2}>
        {allFilled
          ? <Text color={theme.colors.muted}>Tab: próximo campo  ·  Enter: continuar  ·  M: alternar modo  ·  Esc: voltar</Text>
          : <Text color={theme.colors.muted}>Tab: próximo campo  ·  M: alternar modo  ·  Esc: voltar</Text>
        }
      </Box>
    </Box>
  );
}
