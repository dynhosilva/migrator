import React from 'react';
import { Box, Text, useInput } from 'ink';
import path from 'path';
import { Header }    from '../components/Header';
import { TextInput } from '../components/TextInput';
import { theme }     from '../theme';
import type { TuiAction } from '../state/types';
import type { Navigation } from '../hooks/useNavigation';

interface ProjectSelectProps {
  readonly inputPath: string;
  readonly outputDir: string;
  readonly dispatch:  React.Dispatch<TuiAction>;
  readonly nav:       Navigation;
  readonly onSubmit:  (inputPath: string, outputDir: string) => void;
}

type Field = 'input' | 'output';

export function ProjectSelect({
  inputPath,
  outputDir,
  dispatch,
  nav,
  onSubmit,
}: ProjectSelectProps): React.ReactElement {
  const [activeField, setActiveField] = React.useState<Field>('input');

  useInput((_input, key) => {
    if (key.escape) nav.goTo('welcome');
    if (key.tab) setActiveField((f) => f === 'input' ? 'output' : 'input');
  });

  function handleInputChange(val: string) {
    dispatch({ type: 'SET_INPUT', inputPath: val });
  }

  function handleOutputChange(val: string) {
    dispatch({ type: 'SET_OUTPUT', outputDir: val });
  }

  function handleInputSubmit(val: string) {
    if (!val.trim()) return;
    // Auto-generate outputDir if not set
    if (!outputDir.trim()) {
      const name = path.basename(val).replace(/\.zip$/i, '');
      const auto = path.resolve('output', name);
      dispatch({ type: 'SET_OUTPUT', outputDir: auto });
    }
    setActiveField('output');
  }

  function handleOutputSubmit(val: string) {
    if (!inputPath.trim()) {
      setActiveField('input');
      return;
    }
    const out = val.trim() || outputDir;
    onSubmit(inputPath.trim(), out);
  }

  const isReady = inputPath.trim().length > 0;

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Selecionar projeto" />

      <TextInput
        label="Projeto (pasta, .zip ou .git)"
        value={inputPath}
        onChange={handleInputChange}
        onSubmit={handleInputSubmit}
        placeholder="/caminho/para/projeto"
        active={activeField === 'input'}
      />

      <TextInput
        label="Diretório de saída"
        value={outputDir}
        onChange={handleOutputChange}
        onSubmit={handleOutputSubmit}
        placeholder="output/<projeto> (padrão)"
        active={activeField === 'output'}
      />

      <Box marginTop={1} flexDirection="column">
        <Text color={theme.colors.muted}>
          Tab: alternar campo   Enter: confirmar campo   Esc: voltar
        </Text>
        {isReady && activeField === 'output' && (
          <Text color={theme.colors.success}>
            {theme.symbols.arrow} Enter para iniciar análise
          </Text>
        )}
      </Box>
    </Box>
  );
}
