import type { ProjectContext } from '../core/types';
import type { ValidationIssue } from './types';

export interface ValidationRule {
  readonly key: string;
  validate(ctx: ProjectContext): ValidationIssue[];
}

export class ValidationRegistry {
  private readonly rules: ValidationRule[] = [];

  register(rule: ValidationRule): this {
    this.rules.push(rule);
    return this;
  }

  run(ctx: ProjectContext): { issues: ValidationIssue[]; rulesExecuted: number } {
    const issues: ValidationIssue[] = [];
    for (const rule of this.rules) {
      const result = rule.validate(ctx);
      issues.push(...result);
    }
    return { issues, rulesExecuted: this.rules.length };
  }
}
