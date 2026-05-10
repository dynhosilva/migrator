import type { ProjectContext } from '../../core/types';
import type { DockerArtifacts, GeneratedFile } from '../types';
import type { DeployTarget } from '../../planner/types';
import type { BuildSystem, PackageManager } from '../../analyzer/types';

// Porta exposta por estratégia
const PORT_BY_STRATEGY: Record<DeployTarget, number> = {
  'static':      80,
  'node-server': 3000,
  'docker':      3000,
  'edge':        3000,
  'unknown':     3000,
};

// Diretório de saída do build por sistema de build
const BUILD_OUTPUT_BY_SYSTEM: Record<BuildSystem, string> = {
  vite:    'dist',
  cra:     'build',
  webpack: 'dist',
  next:    '.next',
  unknown: 'dist',
};

// Linhas que instalam o package manager (quando diferente de npm)
function pmSetupLines(pm: PackageManager): string[] {
  if (pm === 'pnpm') return ['RUN npm install -g pnpm'];
  if (pm === 'bun')  return ['RUN npm install -g bun'];
  return [];
}

// Linha COPY dos arquivos de lock por package manager
function pmCopyLock(pm: PackageManager): string {
  const lock: Record<PackageManager, string> = {
    npm:  'COPY package.json package-lock.json* ./',
    yarn: 'COPY package.json yarn.lock* ./',
    pnpm: 'COPY package.json pnpm-lock.yaml* ./',
    bun:  'COPY package.json bun.lockb* ./',
  };
  return lock[pm] ?? 'COPY package.json ./';
}

// Comando de instalação de dependências
function pmInstall(pm: PackageManager): string {
  const cmd: Record<PackageManager, string> = {
    npm:  'RUN npm ci',
    yarn: 'RUN yarn install --frozen-lockfile',
    pnpm: 'RUN pnpm install --frozen-lockfile',
    bun:  'RUN bun install',
  };
  return cmd[pm] ?? 'RUN npm ci';
}

// Comando de build
function pmBuild(pm: PackageManager): string {
  const cmd: Record<PackageManager, string> = {
    npm:  'RUN npm run build',
    yarn: 'RUN yarn build',
    pnpm: 'RUN pnpm run build',
    bun:  'RUN bun run build',
  };
  return cmd[pm] ?? 'RUN npm run build';
}

function buildStaticDockerfile(pm: PackageManager, buildDir: string): string {
  const setup   = pmSetupLines(pm);
  const lines: string[] = [
    '# syntax=docker/dockerfile:1',
    '# Stage 1: build',
    'FROM node:18-alpine AS builder',
    'WORKDIR /app',
    ...setup,
    pmCopyLock(pm),
    pmInstall(pm),
    'COPY . .',
    pmBuild(pm),
    '',
    '# Stage 2: serve com nginx',
    'FROM nginx:alpine AS runner',
    `COPY --from=builder /app/${buildDir} /usr/share/nginx/html`,
    'EXPOSE 80',
    'CMD ["nginx", "-g", "daemon off;"]',
  ];
  return lines.join('\n') + '\n';
}

function buildNodeServerDockerfile(pm: PackageManager): string {
  const setup = pmSetupLines(pm);
  const lines: string[] = [
    '# syntax=docker/dockerfile:1',
    '# Stage 1: instalar dependências',
    'FROM node:18-alpine AS deps',
    'WORKDIR /app',
    ...setup,
    pmCopyLock(pm),
    pmInstall(pm),
    '',
    '# Stage 2: build da aplicação',
    'FROM node:18-alpine AS builder',
    'WORKDIR /app',
    ...setup,
    'COPY --from=deps /app/node_modules ./node_modules',
    'COPY . .',
    pmBuild(pm),
    '',
    '# Stage 3: runtime de produção',
    'FROM node:18-alpine AS runner',
    'WORKDIR /app',
    'ENV NODE_ENV=production',
    'COPY --from=builder /app/.next ./.next',
    'COPY --from=builder /app/public ./public',
    'COPY --from=builder /app/package.json ./',
    'COPY --from=builder /app/node_modules ./node_modules',
    'EXPOSE 3000',
    'CMD ["npm", "start"]',
  ];
  return lines.join('\n') + '\n';
}

function buildGenericDockerfile(pm: PackageManager, buildDir: string): string {
  const setup = pmSetupLines(pm);
  const lines: string[] = [
    '# syntax=docker/dockerfile:1',
    '# Stage 1: build',
    'FROM node:18-alpine AS builder',
    'WORKDIR /app',
    ...setup,
    pmCopyLock(pm),
    pmInstall(pm),
    'COPY . .',
    pmBuild(pm),
    '',
    '# Stage 2: runtime de produção',
    'FROM node:18-alpine AS runner',
    'WORKDIR /app',
    'ENV NODE_ENV=production',
    `COPY --from=builder /app/${buildDir} ./${buildDir}`,
    'COPY --from=builder /app/package.json ./',
    `EXPOSE 3000`,
    `CMD ["node", "${buildDir}/index.js"]`,
  ];
  return lines.join('\n') + '\n';
}

export function generateDockerfile(ctx: ProjectContext): DockerArtifacts {
  const analysis  = ctx.analysis!;
  const plan      = ctx.plan!;
  const { framework, buildSystem, packageManager } = analysis;
  const strategy  = plan.deployStrategy.recommended;

  const buildDir  = BUILD_OUTPUT_BY_SYSTEM[buildSystem] ?? 'dist';
  const port      = PORT_BY_STRATEGY[strategy] ?? 3000;

  let content: string;
  let baseImage: string;
  let multiStage: boolean;

  if (strategy === 'static') {
    content   = buildStaticDockerfile(packageManager, buildDir);
    baseImage = 'nginx:alpine';
    multiStage = true;
  } else if (strategy === 'node-server' || framework === 'next') {
    content   = buildNodeServerDockerfile(packageManager);
    baseImage = 'node:18-alpine';
    multiStage = true;
  } else {
    content   = buildGenericDockerfile(packageManager, buildDir);
    baseImage = 'node:18-alpine';
    multiStage = true;
  }

  const file: GeneratedFile = {
    relativePath: 'docker/Dockerfile',
    content,
    description: 'Dockerfile multi-estágio otimizado para produção',
  };

  return {
    files:      [file],
    baseImage,
    exposedPort: port,
    multiStage,
    strategy,
  };
}
