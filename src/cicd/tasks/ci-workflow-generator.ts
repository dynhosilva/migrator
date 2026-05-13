import type { CiSummary } from '../types';
import type { CicdTaskContext } from '../registry';
import type { GithubWorkflow } from '../workflow-types';
import {
  serializeWorkflow,
  checkoutStep,
  setupNodeMatrixStep,
  installStep,
  buildStep,
  testStep,
} from '../builders/workflow';

const CI_NODE_VERSIONS: readonly number[] = [20, 22];

export function generateCiWorkflow({ ctx }: CicdTaskContext): CiSummary {
  const pm      = ctx.analysis?.packageManager ?? 'npm';
  const scripts = ctx.analysis?.packageJson?.scripts ?? {};
  const steps   = [
    checkoutStep(),
    setupNodeMatrixStep(pm),
    installStep(pm),
    ...(scripts['build'] ? [buildStep(pm)] : []),
    ...(scripts['test']  ? [testStep(pm)]  : []),
  ];

  const workflow: GithubWorkflow = {
    name: 'CI',
    on: {
      push:         { branches: ['main'] },
      pull_request: { branches: ['main'] },
    },
    jobs: {
      build: {
        'runs-on': 'ubuntu-latest',
        strategy: { matrix: { 'node-version': CI_NODE_VERSIONS } },
        steps,
      },
    },
  };

  return {
    files: [{
      relativePath: '.github/workflows/ci.yml',
      content:      serializeWorkflow(workflow),
      description:  'GitHub Actions CI workflow — install, build e test',
    }],
    issues: [],
  };
}
