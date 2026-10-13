import path from 'path';
import dotenv from 'dotenv';

/** Process variables win; cwd/server files take precedence over root defaults. */
export function loadEnvironment(
  target: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
  serverRoot = path.resolve(__dirname, '../..')
) {
  const paths = [...new Set([
    path.join(cwd, '.env'), path.join(serverRoot, '.env'), path.resolve(serverRoot, '../.env'),
  ])];
  for (const envPath of paths) {
    dotenv.config({ path: envPath, processEnv: target as Record<string, string>, override: false });
  }
}

// Tests supply mock configuration; never load local credentials into test processes.
if (process.env.NODE_ENV !== 'test') loadEnvironment();
