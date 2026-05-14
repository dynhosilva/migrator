/**
 * Sync-users performance benchmark.
 *
 * Simulates API call patterns with configurable per-call latency to show
 * the reduction from O(users × columns) sequential to concurrency-limited
 * parallel execution.
 *
 * Usage:
 *   npx ts-node src/sync/benchmark/runner.ts
 *   npx ts-node src/sync/benchmark/runner.ts --latency 50 --concurrency 20
 */

const SCENARIOS = [
  { label: '100 users × 5 cols', users: 100, columns: 5 },
  { label: '1 000 users × 5 cols', users: 1_000, columns: 5 },
  { label: '1 000 users × 10 cols', users: 1_000, columns: 10 },
  { label: '10 000 users × 5 cols', users: 10_000, columns: 5 },
];

function parseArgs(): { latencyMs: number; concurrency: number } {
  const args = process.argv.slice(2);
  let latencyMs = 20;
  let concurrency = 10;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--latency' && args[i + 1]) latencyMs = parseInt(args[i + 1], 10);
    if (args[i] === '--concurrency' && args[i + 1]) concurrency = parseInt(args[i + 1], 10);
  }
  return { latencyMs, concurrency };
}

function fakeDelay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function runSequential(totalCalls: number, latencyMs: number): Promise<number> {
  const start = Date.now();
  for (let i = 0; i < totalCalls; i++) {
    await fakeDelay(latencyMs);
  }
  return Date.now() - start;
}

async function runConcurrent(totalCalls: number, latencyMs: number, concurrencyLimit: number): Promise<number> {
  const start = Date.now();
  let index = 0;

  async function worker(): Promise<void> {
    while (index < totalCalls) {
      index++;
      await fakeDelay(latencyMs);
    }
  }

  const workers = Array.from({ length: Math.min(concurrencyLimit, totalCalls) }, worker);
  await Promise.all(workers);
  return Date.now() - start;
}

async function main(): Promise<void> {
  const { latencyMs, concurrency } = parseArgs();

  console.log(`\nSync-users Performance Benchmark`);
  console.log(`Simulated latency per API call: ${latencyMs}ms`);
  console.log(`Concurrency limit: ${concurrency} parallel updates`);
  console.log(`${'─'.repeat(80)}\n`);

  console.log(
    'Scenario'.padEnd(30),
    'API Calls'.padEnd(12),
    'Sequential'.padEnd(14),
    `Concurrent (${concurrency}x)`.padEnd(18),
    'Speedup',
  );
  console.log('─'.repeat(80));

  for (const { label, users, columns } of SCENARIOS) {
    const totalCalls = users * columns;

    // For large scenarios, cap simulation at 1000 calls and extrapolate
    const simulatedCalls = Math.min(totalCalls, 1_000);
    const scaleFactor = totalCalls / simulatedCalls;

    const seqMs = await runSequential(simulatedCalls, latencyMs) * scaleFactor;
    const conMs = await runConcurrent(simulatedCalls, latencyMs, concurrency) * scaleFactor;

    const speedup = seqMs / conMs;
    const seqStr = seqMs >= 60_000
      ? `${(seqMs / 60_000).toFixed(1)}min`
      : `${(seqMs / 1000).toFixed(1)}s`;
    const conStr = conMs >= 60_000
      ? `${(conMs / 60_000).toFixed(1)}min`
      : `${(conMs / 1000).toFixed(1)}s`;

    console.log(
      label.padEnd(30),
      String(totalCalls).padEnd(12),
      seqStr.padEnd(14),
      conStr.padEnd(18),
      `${speedup.toFixed(1)}x faster`,
    );
  }

  console.log(`\n${'─'.repeat(80)}`);
  console.log('Notes:');
  console.log('  • Sequential = 1 API call at a time (original implementation)');
  console.log(`  • Concurrent = up to ${concurrency} calls in parallel (new implementation)`);
  console.log(`  • Speedup approaches concurrency limit for large datasets`);
  console.log(`  • Actual speedup depends on network latency and Supabase rate limits`);
  console.log(`  • Dry-run counts: always O(1) parallel round regardless of user count`);
  console.log(`  • Conflict detection: was O(N) sequential, now O(1) parallel round\n`);
}

main().catch(err => {
  process.stderr.write(`Benchmark error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
