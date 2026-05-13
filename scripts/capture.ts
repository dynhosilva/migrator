/**
 * capture.ts — gera hero screenshot e GIF animado do demo
 *
 * Uso: npm run capture
 *
 * Saída:
 *   docs/media/demo-analysis.png  — hero screenshot (banner → Supabase block)
 *   docs/media/demo-full.gif      — GIF animado ~25s
 */

import puppeteer, { Page, ElementHandle } from 'puppeteer-core';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GIFEncoder = require('gif-encoder-2') as any;
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const CHROME  = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT    = join(__dirname, '..');
const HTML    = `file:///${ROOT.replace(/\\/g, '/')}/docs/media/demo-preview.html`;
const OUTDIR  = join(ROOT, 'docs', 'media');

// Dimensões fixas dos frames do GIF — largura do terminal + body padding
const GIF_W = 688;   // 640px terminal + 24px padding × 2 (left só)
const GIF_H = 520;   // viewport height para GIF

// Keyframes: [maxHeight do terminal em px, delay em ms]
// maxHeight controla quanto conteúdo aparece (overflow: hidden no .terminal)
const FRAMES: Array<[number, number]> = [
  [115,  1500],  // banner
  [160,  400],   // + subtitle / analyze → plan → validate
  [260,  500],   // + análise header box
  [370,  500],   // + Framework, Linguagem, Build, Lovable
  [470,  400],   // + package.json
  [570,  400],   // + Tailwind
  [620,  350],   // + Supabase header + ✓ Detectado
  [645,  300],   // + ✓ Auth
  [666,  300],   // + ✓ Storage
  [688,  800],   // + ✓ Realtime  ← hero hold
  [750,  600],   // + Migrations + filenames
  [800,  2000],  // + Edge Functions + nomes  ← hold longo
  [880,  400],   // + Env vars
  [960,  400],   // + Rotas
  [1060, 400],   // + Arquivos críticos
  [1800, 350],   // Plano (rápido)
  [2600, 350],   // Validação (rápido)
  [2750, 600],   // + artefatos header
  [2880, 500],   // + GitHub Actions
  [3010, 500],   // + Docker
  [3170, 500],   // + Configuração + Supabase items
  [3310, 800],   // + Execução e planejamento ← hold
  [3450, 3000],  // CTA ← hold longo
];

async function screenshot(
  page: Page,
  termEl: ElementHandle,
  maxH: number,
  fixed?: { w: number; h: number },
): Promise<Buffer> {
  await page.evaluate((h: number) => {
    const el = document.querySelector('.terminal') as HTMLElement;
    if (el) el.style.maxHeight = `${h}px`;
  }, maxH);

  if (fixed) {
    const box = await termEl.boundingBox();
    if (!box) throw new Error('Terminal não encontrado na página');
    return Buffer.from(
      await page.screenshot({
        type: 'png',
        clip: { x: box.x, y: box.y, width: fixed.w, height: fixed.h },
      }),
    );
  }

  return Buffer.from(await termEl.screenshot({ type: 'png' }));
}

async function main(): Promise<void> {
  mkdirSync(OUTDIR, { recursive: true });

  console.log('Iniciando Chrome headless...');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  // ── PNG hero shot ─────────────────────────────────────────────
  // Viewport generoso para capturar o terminal completo sem clip
  await page.setViewport({ width: 800, height: 900 });
  await page.goto(HTML, { waitUntil: 'networkidle0' });

  const termEl = await page.$('.terminal');
  if (!termEl) throw new Error('Elemento .terminal não encontrado no HTML');

  // Hero: banner → Edge Functions (inclui o bloco Supabase completo)
  const heroBuf = await screenshot(page, termEl, 830);
  writeFileSync(join(OUTDIR, 'demo-analysis.png'), heroBuf);
  const heroSize = Math.round(heroBuf.length / 1024);
  console.log(`✓ demo-analysis.png  (${heroSize}KB)`);

  // ── GIF ───────────────────────────────────────────────────────
  // Viewport fixo para frames consistentes
  await page.setViewport({ width: GIF_W + 100, height: GIF_H + 100 });
  await page.goto(HTML, { waitUntil: 'networkidle0' });

  // Remover padding do body para encostar o terminal no topo-esquerdo
  await page.evaluate((gifW: number) => {
    (document.body.style as any).padding = '0';
    (document.body.style as any).alignItems = 'flex-start';
    (document.body.style as any).justifyContent = 'flex-start';
    const term = document.querySelector('.terminal') as any;
    if (term) {
      term.style.borderRadius = '0';
      term.style.boxShadow = 'none';
      term.style.width = `${gifW}px`;
      term.style.minWidth = `${gifW}px`;
    }
  }, GIF_W);

  // Reapontar o elemento após navegação
  const termGif = await page.$('.terminal');
  if (!termGif) throw new Error('Elemento .terminal não encontrado para GIF');

  const encoder = new GIFEncoder(GIF_W, GIF_H, 'neuquant', true);
  // createReadStream() deve ser chamado ANTES de start() para capturar todos os dados
  const rs = encoder.createReadStream();
  encoder.setRepeat(0);  // loop infinito
  encoder.setQuality(10);
  encoder.start();

  const chunks: Buffer[] = [];
  rs.on('data', (chunk: Buffer) => chunks.push(chunk));
  const gifReady = new Promise<void>((resolve) => rs.once('end', resolve));

  console.log(`Gerando ${FRAMES.length} frames do GIF...`);

  for (let i = 0; i < FRAMES.length; i++) {
    const [maxH, delay] = FRAMES[i];
    process.stdout.write(`  Frame ${i + 1}/${FRAMES.length} (${maxH}px, ${delay}ms)...`);

    const frameBuf = await screenshot(page, termGif, maxH, { w: GIF_W, h: GIF_H });
    const png      = PNG.sync.read(frameBuf);

    encoder.setDelay(delay);
    encoder.addFrame(png.data);

    process.stdout.write(' ok\n');
  }

  encoder.finish();
  await gifReady;

  const gifBuf = Buffer.concat(chunks);
  writeFileSync(join(OUTDIR, 'demo-full.gif'), gifBuf);
  const gifSize = Math.round(gifBuf.length / 1024);
  console.log(`✓ demo-full.gif  (${gifSize}KB)`);

  await browser.close();
  console.log('\nAssets gerados em docs/media/');
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
