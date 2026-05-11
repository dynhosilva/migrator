import React from 'react';
import { Box, Text, useInput } from 'ink';
import fs   from 'fs';
import path from 'path';
import { Header }    from '../components/Header';
import { LogViewer } from '../components/LogViewer';
import { theme }     from '../theme';
import type { Navigation } from '../hooks/useNavigation';

const ARTIFACTS = [
  { key: 'migration-summary',   file: 'reports/migration-summary.json'         },
  { key: 'deploy-report',       file: 'docker/deploy-report.json'              },
  { key: 'execution-plan',      file: 'execution/execution-plan.json'           },
  { key: 'remote-plan',         file: 'remote/remote-execution-plan.json'       },
  { key: 'runtime-log',         file: 'runtime/runtime-log.json'               },
];

interface ArtifactBrowserProps {
  readonly outputDir: string;
  readonly nav:       Navigation;
  readonly onClose:   () => void;
}

export function ArtifactBrowser({ outputDir, nav, onClose }: ArtifactBrowserProps): React.ReactElement {
  const [selected, setSelected] = React.useState(0);

  useInput((_input, key) => {
    if (key.escape) onClose();
    if (key.upArrow)   setSelected((s) => Math.max(0, s - 1));
    if (key.downArrow) setSelected((s) => Math.min(ARTIFACTS.length - 1, s + 1));
  });

  const artifact = ARTIFACTS[selected];
  const filePath = path.join(outputDir, artifact.file);
  const exists   = fs.existsSync(filePath);

  const lines = React.useMemo(() => {
    if (!exists) return ['(arquivo não encontrado — fase não executada)'];
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return raw.split('\n').slice(0, 30);
    } catch {
      return ['(erro ao ler arquivo)'];
    }
  }, [filePath, exists]);

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Navegador de artefatos" />

      <Box flexDirection="column" marginBottom={1}>
        {ARTIFACTS.map((a, i) => (
          <Box key={a.key}>
            <Text color={i === selected ? theme.colors.primary : theme.colors.muted} bold={i === selected}>
              {i === selected ? `${theme.symbols.arrow} ` : '  '}
              {a.file}
            </Text>
            {!fs.existsSync(path.join(outputDir, a.file)) && (
              <Text color={theme.colors.muted}> (não gerado)</Text>
            )}
          </Box>
        ))}
      </Box>

      <LogViewer logs={lines} title={artifact.file} maxRows={12} />

      <Box marginTop={1}>
        <Text color={theme.colors.muted}>
          ↑↓: navegar   Esc: fechar
        </Text>
      </Box>
    </Box>
  );
}
