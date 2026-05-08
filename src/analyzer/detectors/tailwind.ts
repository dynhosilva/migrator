import { ProjectFile } from '../../sources';
import { PackageJson, TailwindInfo } from '../types';
import { logger } from '../../logger';

export function detectTailwind(files: ProjectFile[], pkg: PackageJson | null): TailwindInfo {
  const allDeps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const depNames = Object.keys(allDeps);
  const basenames = files.map((f) => f.relativePath.split('/').pop() ?? '');

  const detected =
    'tailwindcss' in allDeps ||
    basenames.some((b) => /^tailwind\.config\.[jt]sx?$/.test(b));

  // components.json é o arquivo de configuração oficial do shadcn/ui
  const hasComponentsJson = basenames.includes('components.json');
  // Projetos shadcn costumam ter 3+ pacotes @radix-ui como deps diretas
  const radixPackages = depNames.filter((d) => d.startsWith('@radix-ui/'));
  const hasShadcn = hasComponentsJson || radixPackages.length >= 3;

  const hasRadix = radixPackages.length > 0;

  if (detected) {
    logger.debug(`Tailwind detectado${hasShadcn ? ' + shadcn/ui' : ''}${hasRadix ? ' + Radix UI' : ''}`);
  } else {
    logger.debug('Tailwind não detectado');
  }

  return { detected, hasShadcn, hasRadix };
}
