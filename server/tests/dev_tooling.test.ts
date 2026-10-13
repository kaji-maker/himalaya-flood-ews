import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

it('runs TypeScript in the development watcher and restarts after a source change', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'himalaya-dev-watch-'));
  const fixture = path.join(directory, 'sample.ts');
  const source = (value: number) => `const value: number = ${value}; console.log('WATCH_SAMPLE:' + value);\n`;
  let output = '';
  let stopped = false;
  let processError: Error | undefined;
  await writeFile(fixture, source(1));
  const watcher = spawn(process.execPath, [require.resolve('tsx/cli'), 'watch', '--clear-screen=false', fixture], {
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  watcher.stdout.on('data', data => { output += data.toString(); });
  watcher.stderr.on('data', data => { output += data.toString(); });
  watcher.on('error', error => { processError = error; });
  watcher.on('exit', () => { stopped = true; });

  const waitFor = async (marker: string) => {
    const deadline = Date.now() + 5000;
    while (!output.includes(marker)) {
      if (processError) throw processError;
      if (stopped || Date.now() >= deadline) throw new Error(`Watcher did not emit ${marker}: ${output}`);
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  };

  try {
    await waitFor('WATCH_SAMPLE:1');
    // Allow the watcher to register its dependency listeners after initial execution.
    await new Promise(resolve => setTimeout(resolve, 250));
    await writeFile(fixture, source(2));
    await waitFor('WATCH_SAMPLE:2');
    expect(output).toContain('WATCH_SAMPLE:1');
    expect(output).toContain('WATCH_SAMPLE:2');
  } finally {
    if (!stopped && watcher.pid) {
      const exited = once(watcher, 'exit');
      const forceStop = setTimeout(() => watcher.kill('SIGKILL'), 3000);
      watcher.kill('SIGTERM');
      await exited.finally(() => clearTimeout(forceStop));
    }
    await rm(directory, { recursive: true, force: true });
  }
}, 15000);
