import { ProjectFile } from '../../sources';
import { Framework, RouteEntry } from '../types';
import { logger } from '../../logger';

export function detectRoutes(files: ProjectFile[], framework: Framework): RouteEntry[] {
  if (framework === 'next') return detectNextRoutes(files);
  return detectReactRouterRoutes(files);
}

function detectNextRoutes(files: ProjectFile[]): RouteEntry[] {
  const routes: RouteEntry[] = [];

  for (const file of files) {
    const p = file.relativePath;

    // App Router: app/page.tsx → /
    if (/(?:^|\/)app\/page\.[tj]sx?$/.test(p)) {
      routes.push({ path: '/', file: p });
      continue;
    }

    // App Router: app/slug/page.tsx → /slug
    const appMatch = p.match(/(?:^|\/)app\/(.+)\/page\.[tj]sx?$/);
    if (appMatch) {
      routes.push({ path: '/' + appMatch[1], file: p });
      continue;
    }

    // Pages Router: pages/index.tsx → /
    if (/(?:^|\/)pages\/index\.[tj]sx?$/.test(p)) {
      routes.push({ path: '/', file: p });
      continue;
    }

    // Pages Router: pages/slug.tsx → /slug (exclui _app, _document, api/)
    const pagesMatch = p.match(/(?:^|\/)pages\/(.+)\.[tj]sx?$/);
    if (pagesMatch && !pagesMatch[1].startsWith('_') && !pagesMatch[1].startsWith('api/')) {
      routes.push({ path: '/' + pagesMatch[1], file: p });
    }
  }

  logger.debug(`Rotas Next.js detectadas: ${routes.length}`);
  return routes;
}

function detectReactRouterRoutes(files: ProjectFile[]): RouteEntry[] {
  const routes: RouteEntry[] = [];
  const SOURCE_EXT = /\.(tsx?|jsx?)$/;
  // Captura path: "/rota" ou path="/rota" em JSX e objetos de configuração
  const PATH_ATTR_RE = /path(?:=|:\s*)['"`]([^'"` ]+)['"`]/g;

  for (const file of files) {
    if (!SOURCE_EXT.test(file.relativePath)) continue;

    const content = file.content.toString();
    if (!content.includes('Route') && !content.includes('createBrowserRouter')) continue;

    for (const match of content.matchAll(PATH_ATTR_RE)) {
      routes.push({ path: match[1], file: file.relativePath });
    }
  }

  logger.debug(`Rotas React Router detectadas: ${routes.length}`);
  // Remove duplicatas pelo caminho
  return routes.filter((r, i, arr) => arr.findIndex((x) => x.path === r.path) === i);
}
