import type { ProjectContext } from '../../core/types';
import type { EnvArtifacts, GeneratedFile } from '../types';

function buildEnvBlock(vars: string[], comment: string): string[] {
  if (vars.length === 0) return [];
  return [`# ${comment}`, ...vars.map((v) => `${v}=`), ''];
}

export function generateEnvFiles(ctx: ProjectContext): EnvArtifacts {
  const { envVars } = ctx.analysis!;
  const plan = ctx.plan!;

  const { required, optional } = plan.env;

  // ── .env.example ──────────────────────────────────────────────────────────
  const exampleLines: string[] = [
    '# Gerado pelo lovable-migrate',
    '# Copie este arquivo para .env e preencha os valores antes de iniciar a aplicação',
    '',
    ...buildEnvBlock(required, 'Variáveis obrigatórias'),
    ...buildEnvBlock(optional, 'Variáveis opcionais (descomente e preencha se necessário)').map(
      (line) => (line.startsWith('#') || line === '' ? line : `# ${line}`),
    ),
  ];

  if (required.length === 0 && optional.length === 0) {
    exampleLines.push('# Nenhuma variável de ambiente detectada neste projeto');
  }

  const envExample: GeneratedFile = {
    relativePath: 'env/.env.example',
    content: exampleLines.join('\n'),
    description: 'Template de variáveis de ambiente para desenvolvimento',
  };

  // ── .env.production.example ───────────────────────────────────────────────
  const prodLines: string[] = [
    '# Configuração de produção — gerado pelo lovable-migrate',
    '# Configure estas variáveis no servidor de produção ou painel do hosting',
    '# NUNCA commite este arquivo com valores reais preenchidos',
    '',
    ...buildEnvBlock(required, 'Variáveis obrigatórias para produção'),
  ];

  if (plan.infrastructure.requiresSupabase) {
    prodLines.push(
      '# Dica: obtenha os valores em: app.supabase.com → Settings → API',
    );
  }

  const envProdExample: GeneratedFile = {
    relativePath: 'env/.env.production.example',
    content: prodLines.join('\n'),
    description: 'Template de variáveis de ambiente para produção',
  };

  return { files: [envExample, envProdExample] };
}
