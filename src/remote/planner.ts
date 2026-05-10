import type { RemoteStep } from './types';

/** Cria um passo executado no servidor remoto via SSH. */
export function remoteStep(
  id: string,
  command: string,
  description: string,
  opts: { requires?: string[]; risk?: RemoteStep['risk'] } = {},
): RemoteStep {
  return {
    id,
    command,
    description,
    remote:   true,
    requires: opts.requires,
    risk:     opts.risk ?? 'low',
  };
}

/** Cria um passo executado localmente (ex: rsync, scp). */
export function localStep(
  id: string,
  command: string,
  description: string,
  opts: { requires?: string[]; risk?: RemoteStep['risk'] } = {},
): RemoteStep {
  return {
    id,
    command,
    description,
    remote:   false,
    requires: opts.requires,
    risk:     opts.risk ?? 'low',
  };
}
