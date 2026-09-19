import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

export function runConfigSync(directory, runner = execute) {
  // execFile searches PATH for a bare filename; path.join('./', ...) removes ./.
  return runner(path.resolve(directory, 'syncconfig.sh'), [], { timeout: 30000 });
}
