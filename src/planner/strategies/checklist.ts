import type { AnalysisReport } from '../../analyzer/types';
import type { MigrationPlan, ChecklistItem } from '../types';

function item(id: string, label: string, required: boolean, notes?: string): ChecklistItem {
  return { id, label, required, notes };
}

export function generateChecklist(
  analysis: AnalysisReport,
  partial: Partial<MigrationPlan>,
): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const { supabase: supabasePlan, env, deployStrategy, infrastructure } = partial;
  const { framework, buildSystem, packageManager } = analysis;
  const pmRun = packageManager !== 'npm' ? `${packageManager} run` : 'npm run';

  items.push(item('clone', 'Clonar ou extrair o código-fonte do projeto', true));

  if (env && env.required.length > 0) {
    items.push(item(
      'env-config',
      `Configurar ${env.required.length} variável(eis) de ambiente`,
      true,
      env.required.join(', '),
    ));
  }

  if (buildSystem !== 'unknown') {
    items.push(item('build-verify', `Verificar se o build local funciona (${pmRun} build)`, true));
  }

  if (supabasePlan?.requiresOwnInstance) {
    items.push(item('supabase-create', 'Criar projeto no Supabase destino', true));
    items.push(item('supabase-keys', 'Copiar URL e chaves do Supabase para variáveis de ambiente', true));
  }

  if (supabasePlan?.requiresAuth) {
    items.push(item('supabase-auth', 'Configurar providers de autenticação na instância destino', true));
  }

  if (supabasePlan?.requiresMigrations) {
    items.push(item(
      'supabase-migrations',
      'Executar migrations no banco de dados destino',
      true,
      'supabase db push (requer Supabase CLI)',
    ));
  }

  if (supabasePlan?.requiresStorage) {
    items.push(item('supabase-storage-buckets', 'Recriar buckets do Storage e configurar políticas RLS', true));
    items.push(item('supabase-storage-files', 'Migrar arquivos do Storage manualmente', false, 'Necessário apenas se há dados em produção'));
  }

  if (supabasePlan?.requiresEdgeFunctions) {
    items.push(item(
      'supabase-edge',
      'Deployar Edge Functions via Supabase CLI',
      true,
      'supabase functions deploy <nome>',
    ));
  }

  if (deployStrategy?.recommended === 'static') {
    const bs = buildSystem !== 'unknown' ? buildSystem : 'build tool';
    items.push(item('deploy-build', `Gerar build de produção (${bs})`, true));
    items.push(item('deploy-upload', 'Fazer upload da pasta dist/ para o hosting estático', true));
    items.push(item('deploy-headers', 'Configurar headers de cache e CORS no hosting', false));
  } else if (deployStrategy?.recommended === 'node-server') {
    items.push(item('deploy-node', 'Configurar servidor Node.js no destino (VPS ou equivalente)', true));
    items.push(item('deploy-build-server', `Gerar build e iniciar servidor (${pmRun} build && ${pmRun} start)`, true));
    items.push(item('deploy-pm2', 'Configurar gerenciador de processos (PM2 ou similar)', false));
  } else if (deployStrategy?.recommended === 'docker') {
    items.push(item('deploy-dockerfile', 'Criar Dockerfile para o projeto', true));
    items.push(item('deploy-docker-test', 'Testar build Docker localmente', true));
    items.push(item('deploy-docker-push', 'Publicar imagem no registry e configurar deploy', true));
  }

  if (infrastructure?.requiresNodeServer) {
    items.push(item('node-version', 'Verificar versão do Node.js no servidor destino (>= 18)', true));
  }

  if (framework !== 'unknown') {
    items.push(item('smoke-test', 'Testar aplicação em ambiente staging antes de produção', true));
  }

  items.push(item('dns-config', 'Configurar DNS e domínio customizado (se aplicável)', false));

  return items;
}
