import { execSync } from 'child_process';
import { VERSION } from './version';

interface Check {
  label: string;
  ok: boolean;
  detail: string;
  required: boolean;
}

function tryExec(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}

export function runDoctor(): void {
  const checks: Check[] = [];

  // Node.js version
  const nodeRaw = process.versions.node;
  const nodeMajor = parseInt(nodeRaw.split('.')[0], 10);
  checks.push({
    label: 'Node.js',
    ok: nodeMajor >= 20,
    detail: nodeMajor >= 20 ? nodeRaw : `${nodeRaw} — requerido: >= 20`,
    required: true,
  });

  // npm
  const npmOut = tryExec('npm --version');
  checks.push({
    label: 'npm',
    ok: npmOut !== null,
    detail: npmOut ?? 'não encontrado',
    required: true,
  });

  // Docker (optional — only needed for local container execution)
  const dockerOut = tryExec('docker --version');
  checks.push({
    label: 'Docker',
    ok: dockerOut !== null,
    detail: dockerOut
      ? dockerOut.replace('Docker version ', '').split(',')[0].trim()
      : 'não encontrado — necessário para: run, execute (deploy local)',
    required: false,
  });

  // CLI version
  checks.push({
    label: 'lovable-migrate',
    ok: true,
    detail: VERSION,
    required: true,
  });

  // Print
  let allRequired = true;
  for (const c of checks) {
    const icon = c.ok ? '  ✓' : c.required ? '  ✗' : '  ·';
    const suffix = !c.required ? ' (opcional)' : '';
    console.log(`${icon}  ${c.label}: ${c.detail}${suffix}`);
    if (!c.ok && c.required) allRequired = false;
  }

  console.log('');

  if (allRequired) {
    console.log('  Sistema: OK — pronto para usar lovable-migrate');
    console.log('');
    console.log('  Comandos: analyze  plan  validate  migrate  deploy');
    console.log('            sync-users  sync-ui  server  ui  demo');
  } else {
    process.stderr.write('  Sistema: ERRO — resolva os itens marcados com ✗ antes de continuar\n');
    process.exit(1);
  }
}
