import type { ProjectContext } from '../../core/types';
import type { ValidationIssue } from '../types';
import type { ValidationRule } from '../registry';

function issue(
  code: string,
  severity: ValidationIssue['severity'],
  message: string,
  suggestion?: string,
): ValidationIssue {
  return { code, severity, rule: 'filesystem', message, suggestion };
}

const PATH_TRAVERSAL_RE = /\.\./;

const KNOWN_ENTRY_POINTS = [
  'index.html',
  'src/main.tsx',
  'src/main.ts',
  'src/index.tsx',
  'src/index.ts',
  'pages/_app.tsx',
  'pages/index.tsx',
  'app/page.tsx',
  'app/layout.tsx',
];

export const filesystemRule: ValidationRule = {
  key: 'filesystem',

  validate(ctx: ProjectContext): ValidationIssue[] {
    const { files, analysis } = ctx;
    const issues: ValidationIssue[] = [];

    // Path traversal guard — deve ser crítico pois indica projeto malformado ou malicioso
    const suspiciousPaths = files.filter((f) => PATH_TRAVERSAL_RE.test(f.relativePath));
    if (suspiciousPaths.length > 0) {
      issues.push(issue(
        'PATH_TRAVERSAL_DETECTED',
        'critical',
        `${suspiciousPaths.length} arquivo(s) com caminho suspeito detectado(s) — possível path traversal`,
        'Inspecione manualmente: ' + suspiciousPaths.map((f) => f.relativePath).slice(0, 3).join(', '),
      ));
    }

    // package.json é pré-requisito absoluto para qualquer projeto Node.js
    const hasPackageJson = files.some((f) => f.relativePath === 'package.json');
    if (!hasPackageJson) {
      issues.push(issue(
        'PACKAGE_JSON_MISSING',
        'critical',
        'package.json não encontrado — projeto incompleto ou corrompido',
        'Verifique se o export do Lovable.dev foi feito corretamente e inclui todos os arquivos do projeto.',
      ));
    }

    // Ponto de entrada — só verifica se o framework foi identificado
    if (analysis && analysis.framework !== 'unknown') {
      const hasEntryPoint = KNOWN_ENTRY_POINTS.some((ep) =>
        files.some((f) => f.relativePath === ep),
      );
      if (!hasEntryPoint) {
        issues.push(issue(
          'NO_ENTRY_POINT',
          'warning',
          'Nenhum ponto de entrada reconhecível encontrado (index.html, src/main.tsx, pages/index.tsx...)',
          'Verifique se a estrutura do projeto está correta e se todos os arquivos foram exportados.',
        ));
      }
    }

    return issues;
  },
};
