import type { HostProfile } from './types';

/**
 * Perfil padrão de host remoto (Ubuntu 22.04 com Docker).
 *
 * Representa o ambiente mínimo recomendado para deploy de projetos Lovable.
 * Usado quando o usuário não fornece um perfil customizado.
 */
export const DEFAULT_HOST_PROFILE: HostProfile = {
  os:               'ubuntu',
  osVersion:        '22.04',
  nodeVersion:      'v20.0.0',
  dockerAvailable:  true,
  packageManagers:  ['npm', 'apt'],
  availablePorts:   [22, 80, 443, 3000, 8080],
  diskSpaceGB:      20,
};

/** Mescla um perfil parcial com o perfil padrão. */
export function mergeHostProfile(partial?: Partial<HostProfile>): HostProfile {
  if (!partial) return DEFAULT_HOST_PROFILE;
  return { ...DEFAULT_HOST_PROFILE, ...partial };
}

/** Verifica se uma porta está disponível no perfil. */
export function isPortAvailable(profile: HostProfile, port: number): boolean {
  return profile.availablePorts.includes(port);
}

/** Extrai o major version de uma string de versão Node (ex: "v20.0.0" → 20). */
export function parseNodeMajor(version: string | null): number | null {
  if (!version) return null;
  const clean = version.replace(/^v/, '').split('.')[0];
  const n = parseInt(clean, 10);
  return isNaN(n) ? null : n;
}
