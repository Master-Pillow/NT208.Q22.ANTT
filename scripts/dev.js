import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [
  spawn(npmCommand, ['run', 'dev'], {
    cwd: path.join(rootDir, 'backend'),
    stdio: 'inherit',
  }),
  spawn(npmCommand, ['run', 'dev'], {
    cwd: path.join(rootDir, 'frontend'),
    stdio: 'inherit',
  }),
];

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on('error', (error) => {
    console.error('[dev]', error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping && code && code !== 0) stop(code);
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
