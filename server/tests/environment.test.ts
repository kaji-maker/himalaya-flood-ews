import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import os from 'os';
import path from 'path';
import { loadEnvironment } from '../src/config/environment';

it('loads root defaults from server cwd while preserving process and server overrides', () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'ews-env-test-'));
  try {
    const serverRoot = path.join(temp, 'server');
    mkdirSync(serverRoot);
    writeFileSync(path.join(temp, '.env'), 'NEBIUS_API_KEY=mock-root-key\nNEBIUS_MODEL=root-model\nPROCESS_SETTING=root\n');
    writeFileSync(path.join(serverRoot, '.env'), 'NEBIUS_MODEL=server-model\n');
    const target: NodeJS.ProcessEnv = { PROCESS_SETTING: 'shell' };
    loadEnvironment(target, serverRoot, serverRoot);
    expect(target).toEqual({ PROCESS_SETTING: 'shell', NEBIUS_API_KEY: 'mock-root-key', NEBIUS_MODEL: 'server-model' });
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
