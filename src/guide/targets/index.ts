import type { GuideTarget, GuideTargetProfile } from '../types';
import { HOSTINGER_PROFILE } from './hostinger';
import { GENERIC_PROFILE }   from './generic';

/**
 * Registro estático de perfis de target.
 *
 * Adicionar um novo provedor é um arquivo + uma linha aqui — zero alteração
 * no orquestrador ou no gerador.
 *
 * Targets não suportados explicitamente (digitalocean, aws-lightsail na Fase 1)
 * caem no perfil GENERIC para não bloquear o usuário enquanto perfis dedicados
 * não existem.
 */
const PROFILES: Record<GuideTarget, GuideTargetProfile> = {
  hostinger:      HOSTINGER_PROFILE,
  generic:        GENERIC_PROFILE,
  digitalocean:   GENERIC_PROFILE,  // perfil dedicado virá na Fase 2
  'aws-lightsail': GENERIC_PROFILE, // perfil dedicado virá na Fase 2
} as const;

/** Retorna o perfil para um target. Fallback seguro para 'generic'. */
export function resolveTargetProfile(target: GuideTarget): GuideTargetProfile {
  return PROFILES[target] ?? GENERIC_PROFILE;
}

/** Lista todos os targets suportados (útil para CLI e TUI). */
export function listAvailableTargets(): readonly GuideTarget[] {
  return Object.keys(PROFILES) as GuideTarget[];
}

export { HOSTINGER_PROFILE, GENERIC_PROFILE };
