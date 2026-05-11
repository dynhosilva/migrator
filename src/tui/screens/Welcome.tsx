import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../components/Header';
import { theme }  from '../theme';
import type { Navigation } from '../hooks/useNavigation';

interface WelcomeProps {
  readonly nav: Navigation;
}

export function Welcome({ nav }: WelcomeProps): React.ReactElement {
  useInput((input, key) => {
    if (input === 'q' || key.escape) process.exit(0);
    if (key.return || input === ' ') nav.goTo('project-select');
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header />
      <Box flexDirection="column" marginBottom={2}>
        <Text color={theme.colors.white} bold>
          Engine de migração para projetos Lovable.dev
        </Text>
        <Text color={theme.colors.muted}>
          Automatiza análise, planejamento, transformação e deploy.
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Text color={theme.colors.primary} bold>Fases disponíveis:</Text>
        {[
          'Analisar stack do projeto',
          'Gerar plano de migração',
          'Validar segurança do plano',
          'Gerar artefatos (env, Docker, SQL)',
          'Revisar dry-run e artefatos',
          'Planejar deploy remoto',
        ].map((step, i) => (
          <Text key={i} color={theme.colors.muted}>
            {'  '}{i + 1}. {step}
          </Text>
        ))}
      </Box>

      <Box>
        <Text color={theme.colors.muted}>Pressione </Text>
        <Text color={theme.colors.success} bold>Enter</Text>
        <Text color={theme.colors.muted}> para iniciar   </Text>
        <Text color={theme.colors.error} bold>q</Text>
        <Text color={theme.colors.muted}> para sair</Text>
      </Box>
    </Box>
  );
}
