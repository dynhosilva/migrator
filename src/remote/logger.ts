export interface RemotePlanLogEntry {
  readonly timestamp: string;
  readonly event: string;
  readonly details: Record<string, unknown>;
}

export function makeRemoteLogEntry(
  event: string,
  details: Record<string, unknown> = {},
): RemotePlanLogEntry {
  return { timestamp: new Date().toISOString(), event, details };
}
