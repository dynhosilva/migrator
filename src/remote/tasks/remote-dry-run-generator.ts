import type { ProjectContext } from '../../core/types';
import type { RemoteState, RemoteConfig, RemoteDryRunArtifacts, GeneratedFile, RemoteStep } from '../types';

function formatStep(step: RemoteStep, index: number): string {
  const location = step.remote ? 'Servidor remoto' : 'Máquina local';
  const risk = step.risk === 'high' ? 'ALTO'
    : step.risk === 'medium' ? 'MÉDIO'
    : 'baixo';
  const requires = step.requires ? `\n- **Requer:** ${step.requires.join(', ')}` : '';
  return [
    `### Passo ${index + 1}: ${step.description}`,
    '',
    `- **Execução:** ${location}`,
    `- **Risco:** ${risk}${requires}`,
    '',
    '```bash',
    step.command,
    '```',
  ].join('\n');
}

export function generateRemoteDryRun(
  ctx: ProjectContext,
  config: RemoteConfig,
  partial: Partial<RemoteState>,
): RemoteDryRunArtifacts {
  const projectName  = ctx.meta.name;
  const { sshConfig, hostProfile, remotePath } = config;
  const steps        = partial.executionPlan?.steps ?? [];
  const transferPlan = partial.transferPlan;
  const hostCheck    = partial.hostCheck;
  const sshCheck     = partial.sshCheck;
  const deployCheck  = partial.deploymentCheck;

  const lines: string[] = [
    `# Dry-run — Deploy Remoto: ${projectName}`,
    '',
    '> **Atenção:** Este documento é apenas um preview. Nenhuma ação real foi executada.',
    '',
    '## Configuração',
    '',
    '| Campo | Valor |',
    '|---|---|',
    `| Servidor | \`${sshConfig.host}:${sshConfig.port}\` |`,
    `| Usuário SSH | \`${sshConfig.user}\` |`,
    `| Autenticação | \`${sshConfig.authStrategy}\` |`,
    `| Chave SSH | \`${sshConfig.keyPath}\` |`,
    `| Caminho remoto | \`${remotePath}\` |`,
    `| Sistema operacional | ${hostProfile.os} ${hostProfile.osVersion} |`,
    `| Docker no host | ${hostProfile.dockerAvailable ? 'Disponível' : 'Não disponível'} |`,
    `| Espaço em disco | ${hostProfile.diskSpaceGB}GB |`,
    '',
    '## Validação do ambiente',
    '',
    `- Host compatível: **${hostCheck?.compatible ? 'Sim' : 'Não'}**`,
    `- Configuração SSH válida: **${sshCheck?.valid ? 'Sim' : 'Não'}**`,
    `- Estratégia de deploy: **${deployCheck?.strategy ?? 'desconhecida'}**`,
    `- Deploy compatível com o host: **${deployCheck?.compatible ? 'Sim' : 'Não'}**`,
    '',
    '## Arquivos a transferir',
    '',
  ];

  if (transferPlan && transferPlan.files.length > 0) {
    lines.push(`Total estimado: **${transferPlan.totalEstimatedSizeKB}KB**`);
    lines.push('');
    for (const f of transferPlan.files) {
      lines.push(`- \`${f.localPath}\` → \`${f.remotePath}\` (~${f.estimatedSizeKB}KB)`);
    }
  } else {
    lines.push('_Nenhum arquivo a transferir._');
  }

  lines.push('');
  lines.push('## Passos de execução');
  lines.push('');

  if (steps.length > 0) {
    steps.forEach((step, i) => {
      lines.push(formatStep(step, i));
      lines.push('');
    });
  } else {
    lines.push('_Nenhum passo de execução gerado._');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`_Gerado em: ${new Date().toISOString()}_`);

  const files: GeneratedFile[] = [
    {
      relativePath: 'remote/remote-dry-run.md',
      content:      lines.join('\n'),
      description:  'Preview legível do deploy remoto (sem execução real)',
    },
  ];

  return { files };
}
