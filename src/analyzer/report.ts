import { TerminalRenderer } from '../output';
import type { AnalysisReport } from './types';

/**
 * Mantido para backward compatibility com código que chama printReport(report) diretamente.
 * Novo código deve obter um ProjectContext e usar TerminalRenderer.render(ctx).
 */
export function printReport(report: AnalysisReport): void {
  const renderer = new TerminalRenderer();
  renderer.render({
    meta:     { name: report.projectName, createdAt: report.detectedAt },
    source:   { kind: 'local', description: '', inputPath: '' },
    files:    [],
    analysis: report,
  });
}
