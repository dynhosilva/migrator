export const theme = {
  colors: {
    primary: 'cyan',
    success: 'green',
    warning: 'yellow',
    error:   'red',
    muted:   'gray',
    info:    'blue',
    white:   'white',
  } as const,

  symbols: {
    check:   '✓',
    cross:   '✗',
    warn:    '⚠',
    arrow:   '→',
    dot:     '·',
    bullet:  '•',
    pipe:    '│',
    corner:  '└',
    spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as string[],
  },

  labels: {
    blocker: 'BLOQUEADOR',
    warning: 'AVISO',
    info:    'INFO',
    ok:      'OK',
    failed:  'FALHOU',
    running: 'EXECUTANDO',
    done:    'CONCLUÍDO',
    idle:    'AGUARDANDO',
  },
} as const;
