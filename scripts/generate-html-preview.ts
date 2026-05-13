/**
 * Gera um preview HTML estilizado do demo para captura de screenshot.
 *
 * Uso:
 *   npx ts-node scripts/generate-html-preview.ts
 *
 * Output:
 *   docs/media/demo-preview.html
 *
 * Fluxo:
 *   Abre no Chrome → Cmd/Ctrl+Shift+P → "Capture full size screenshot"
 *   Salva como docs/media/demo-analysis.png
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Captura o output ANSI do demo via ts-node
const raw = execSync('npx ts-node src/cli.ts demo', {
  encoding: 'utf-8',
  cwd: join(__dirname, '..'),
  env: { ...process.env, FORCE_COLOR: '3', COLORTERM: 'truecolor' },
  stdio: ['pipe', 'pipe', 'pipe'],
});

// Converte ANSI para HTML via mapeamento de cores chalk/ansi
function ansiToHtml(text: string): string {
  const ESC   = '\x1B';
  const RESET = `${ESC}[0m`;

  const colorMap: Record<string, string> = {
    '30': '#6e7681',  // black  → bright-black (mais legível)
    '31': '#ff7b72',  // red
    '32': '#3fb950',  // green
    '33': '#e3b341',  // yellow
    '34': '#79c0ff',  // blue
    '35': '#d2a8ff',  // magenta
    '36': '#56d364',  // cyan
    '37': '#c9d1d9',  // white
    '90': '#6e7681',  // bright-black / gray
    '91': '#ff7b72',  // bright-red
    '92': '#3fb950',  // bright-green
    '93': '#e3b341',  // bright-yellow
    '94': '#79c0ff',  // bright-blue
    '95': '#d2a8ff',  // bright-magenta
    '96': '#56d364',  // bright-cyan
    '97': '#f0f6fc',  // bright-white
  };

  let html     = '';
  let bold     = false;
  let italic   = false;
  let dim      = false;
  let fg: string | null = null;

  const flush  = () => {
    let style = `color:${fg ?? '#c9d1d9'};`;
    if (bold)   style += 'font-weight:700;';
    if (italic) style += 'font-style:italic;';
    if (dim)    style += 'opacity:0.5;';
    return style;
  };

  const parts = text.split(/(\x1B\[[0-9;]*m)/);
  let open = false;

  for (const part of parts) {
    if (part.startsWith(ESC + '[')) {
      const codes = part.slice(2, -1).split(';').map(Number);
      if (open) { html += '</span>'; open = false; }

      for (const code of codes) {
        if (code === 0)  { bold = false; italic = false; dim = false; fg = null; }
        if (code === 1)  { bold = true; }
        if (code === 2)  { dim = true; }
        if (code === 3)  { italic = true; }
        if (code === 22) { bold = false; dim = false; }
        if (code === 23) { italic = false; }
        if (colorMap[String(code)]) { fg = colorMap[String(code)]; }
      }
    } else if (part) {
      const escaped = part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      html += `<span style="${flush()}">${escaped}</span>`;
      open = true;
    }
  }
  if (open) html += '</span>';
  return html;
}

const htmlContent = ansiToHtml(raw);

const page = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>lovable-migrate — demo preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #010409;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 48px;
      min-height: 100vh;
    }
    .terminal {
      background: #0d1117;
      border-radius: 8px;
      padding: 24px 28px;
      width: 640px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05);
      font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", "Consolas", monospace;
      font-size: 13px;
      line-height: 1.55;
      color: #c9d1d9;
      white-space: pre;
      overflow: hidden;
    }
    .titlebar {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot-close   { background: #ff5f57; }
    .dot-min     { background: #ffbd2e; }
    .dot-max     { background: #28c840; }
    .titlebar-label {
      flex: 1;
      text-align: center;
      font-size: 11px;
      color: #6e7681;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      margin-right: 36px;
    }
  </style>
</head>
<body>
  <div class="terminal">
    <div class="titlebar">
      <div class="dot dot-close"></div>
      <div class="dot dot-min"></div>
      <div class="dot dot-max"></div>
      <div class="titlebar-label">lovable-migrate — demo</div>
    </div>
    ${htmlContent}
  </div>
</body>
</html>`;

mkdirSync(join(__dirname, '..', 'docs', 'media'), { recursive: true });
const outPath = join(__dirname, '..', 'docs', 'media', 'demo-preview.html');
writeFileSync(outPath, page, 'utf-8');

console.log(`\n  ✓ Preview gerado: ${outPath}`);
console.log('');
console.log('  Para capturar o screenshot oficial:');
console.log('  1. Abra o arquivo no Chrome');
console.log('  2. DevTools → Cmd/Ctrl+Shift+P → "Capture full size screenshot"');
console.log('  3. Salve como docs/media/demo-analysis.png');
console.log('');
console.log('  Crop para o hero shot (bloco Supabase):');
console.log('  Recorte do banner até o final de "Edge Functions"');
console.log('  (~680px de altura no zoom 1x)');
console.log('');
