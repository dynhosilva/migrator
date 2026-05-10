import type { CommandResult } from './types';

export interface RuntimeLogEntry {
  readonly timestamp: string;
  readonly task: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly exitCode: number;
  readonly durationMs: number;
  readonly timedOut: boolean;
  readonly success: boolean;
  readonly stdoutSummary: string;
  readonly stderrSummary: string;
}

const SUMMARY_MAX = 300;

function summarize(text: string): string {
  if (text.length <= SUMMARY_MAX) return text;
  return text.slice(0, SUMMARY_MAX) + '… (truncado)';
}

export function makeLogEntry(task: string, result: CommandResult): RuntimeLogEntry {
  return {
    timestamp:     new Date().toISOString(),
    task,
    command:       result.command,
    args:          result.args,
    exitCode:      result.exitCode,
    durationMs:    result.durationMs,
    timedOut:      result.timedOut,
    success:       result.exitCode === 0 && !result.timedOut,
    stdoutSummary: summarize(result.stdout),
    stderrSummary: summarize(result.stderr),
  };
}
