import type { ReleaseSummary } from '../types';
import type { CicdTaskContext } from '../registry';
import type { GithubWorkflow } from '../workflow-types';
import {
  serializeWorkflow,
  checkoutStep,
  setupNodeReleaseStep,
  installStep,
  buildStep,
  publishDryRunStep,
} from '../builders/workflow';

const RELEASE_NODE_VERSION = 20;

export function generateReleaseWorkflow({ ctx }: CicdTaskContext): ReleaseSummary {
  const pm = ctx.analysis?.packageManager ?? 'npm';

  const workflow: GithubWorkflow = {
    name: 'Release',
    on: {
      push: { tags: ['v*'] },
    },
    jobs: {
      publish: {
        'runs-on': 'ubuntu-latest',
        steps: [
          checkoutStep(),
          setupNodeReleaseStep(RELEASE_NODE_VERSION, pm),
          installStep(pm),
          buildStep(pm),
          publishDryRunStep(),
        ],
      },
    },
  };

  return {
    files: [{
      relativePath: '.github/workflows/release.yml',
      content:      serializeWorkflow(workflow),
      description:  'GitHub Actions Release workflow — npm publish com dry-run por padrão',
    }],
    issues: [],
  };
}
