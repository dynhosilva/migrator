import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let verbose = false;

export function setVerbose(value: boolean): void {
  verbose = value;
}

const prefix = {
  debug: chalk.gray('[debug]'),
  info:  chalk.blue('[info] '),
  warn:  chalk.yellow('[warn] '),
  error: chalk.red('[error]'),
};

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (!verbose) return;
    console.log(prefix.debug, message, ...args);
  },
  info(message: string, ...args: unknown[]): void {
    console.log(prefix.info, message, ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    console.warn(prefix.warn, message, ...args);
  },
  error(message: string, ...args: unknown[]): void {
    console.error(prefix.error, message, ...args);
  },
};
