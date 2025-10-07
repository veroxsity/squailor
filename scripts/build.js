#!/usr/bin/env node
const { spawnSync } = require('child_process');

// Parse args: first semver-like arg is treated as version; rest forwarded to electron-builder
const rawArgs = process.argv.slice(2);
let version = null;
const forward = [];
const semverRe = /^(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z-.]+)?)$/;

// Helper to extract semver-like arg from an array
function extractVersionAndForward(arr) {
  const ver = { version: null, forward: [] };
  for (const a of arr) {
    if (!ver.version && semverRe.test(a)) {
      ver.version = a;
    } else {
      ver.forward.push(a);
    }
  }
  return ver;
}

if (rawArgs.length > 0) {
  const res = extractVersionAndForward(rawArgs);
  version = res.version;
  forward.push(...res.forward);
} else if (process.env.npm_config_argv) {
  // npm sometimes puts the original CLI args in this env var as a JSON string
  try {
    const parsed = JSON.parse(process.env.npm_config_argv);
    const original = parsed && (parsed.original || parsed.cooked || parsed.remain) || [];
    const res = extractVersionAndForward(original.map(String));
    version = res.version;
    forward.push(...res.forward);
  } catch (e) {
    // ignore parse errors
  }
}

const builderArgs = [...forward];
if (version) {
  builderArgs.push(`--config.extraMetadata.version=${version}`);
}

// If no args, default to plain electron-builder
if (builderArgs.length === 0) {
  builderArgs.push('');
}

console.log('Running electron-builder with args:', builderArgs.join(' '));

// Prefer the local electron-builder binary from node_modules/.bin (Windows uses .cmd)
const execName = process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder';
const localEb = require('path').join(process.cwd(), 'node_modules', '.bin', execName);
let cmd;
let args;
if (require('fs').existsSync(localEb)) {
  cmd = localEb;
  args = builderArgs.filter(Boolean);
} else {
  // Fall back to npx if local binary is not available
  cmd = 'npx';
  args = ['electron-builder', ...builderArgs].filter(Boolean);
}

const useShell = process.platform === 'win32';
const res = spawnSync(cmd, args, { stdio: 'inherit', shell: useShell });
if (res.error) {
  console.error('Failed to run electron-builder:', res.error);
  if (res.error.code === 'ENOENT') {
    console.error('Make sure npm is installed and that the local electron-builder is available in node_modules/.bin or npx is on PATH.');
  }
  process.exit(1);
}
process.exit(res.status);
