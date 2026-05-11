import React from 'react';
import { Box, Text } from 'ink';
import { Header }      from '../components/Header';
import { Spinner }     from '../components/Spinner';
import { StepProgress } from '../components/StepProgress';
import type { Step }   from '../components/StepProgress';
import { theme }       from '../theme';
import type { PhaseState } from '../state/types';

interface PhaseRunnerProps {
  readonly phases:      PhaseState;
  readonly activePhase: string | null;
  readonly logs:        string[];
}

const PHASE_STEPS: Array<{ key: keyof PhaseState; label: string }> = [
  { key: 'analyze',  label: 'Analisar stack'         },
  { key: 'plan',     label: 'Gerar plano'             },
  { key: 'validate', label: 'Validar segurança'       },
  { key: 'migrate',  label: 'Gerar artefatos'         },
  { key: 'deploy',   label: 'Gerar artefatos Docker'  },
  { key: 'execute',  label: 'Verificar ambiente'      },
  { key: 'remote',   label: 'Planejar deploy remoto'  },
];

export function PhaseRunner({ phases, activePhase, logs }: PhaseRunnerProps): React.ReactElement {
  const steps: Step[] = PHASE_STEPS.map(({ key, label }) => ({
    key,
    label,
    status: phases[key],
  }));

  const lastLog = logs[logs.length - 1];

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Executando pipeline" />

      <StepProgress steps={steps} />

      {activePhase && (
        <Box marginTop={1}>
          <Spinner label={`Executando fase: ${activePhase}`} />
        </Box>
      )}

      {lastLog && (
        <Box marginTop={1}>
          <Text color={theme.colors.muted}>{theme.symbols.dot} {lastLog}</Text>
        </Box>
      )}
    </Box>
  );
}
