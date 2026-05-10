import type { SshConfig, SshValidationResult } from '../types';
import { validateSshConfigFormat } from '../ssh';

export function validateSshConfig(config: SshConfig): SshValidationResult {
  const issues = validateSshConfigFormat(config);
  const valid  = !issues.some((i) => i.severity === 'blocker');
  return { valid, config, issues };
}
