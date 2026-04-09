'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '..', '..', 'scripts', 'hooks', 'block-no-verify.js');

function run(input) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT], {
      input,
      encoding: 'utf8',
      timeout: 5000,
    });
    return { code: 0, output: JSON.parse(stdout) };
  } catch (err) {
    const output = err.stdout ? JSON.parse(err.stdout) : null;
    return { code: err.status, output };
  }
}

let passed = 0;
let failed = 0;

function assert(name, actual, expected) {
  if (actual === expected) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.error(`  FAIL: ${name} — expected ${expected}, got ${actual}`);
    failed++;
  }
}

console.log('block-no-verify.js tests\n');

// --- Blocked commands (exit 2) ---
console.log('Should block:');

const blocked = [
  'git commit --no-verify -m "test"',
  'git push --no-verify',
  'git commit -m "msg" --no-verify',
  'git push origin main --no-verify',
];

for (const cmd of blocked) {
  const claudeInput = JSON.stringify({ tool_input: { command: cmd } });
  const result = run(claudeInput);
  assert(`"${cmd}"`, result.code, 2);
  assert(`  decision = block`, result.output.decision, 'block');
}

// --- Allowed commands (exit 0) ---
console.log('\nShould allow:');

const allowed = [
  'git commit -m "test"',
  'git push origin main',
  'npm test',
  'echo "--no-verify is just a string"',
  'ls -la',
  'git status',
];

for (const cmd of allowed) {
  const claudeInput = JSON.stringify({ tool_input: { command: cmd } });
  const result = run(claudeInput);
  assert(`"${cmd}"`, result.code, 0);
  assert(`  decision = allow`, result.output.decision, 'allow');
}

// --- JSON field variants ---
console.log('\nJSON field variants:');

const variants = [
  { command: 'git commit --no-verify' },
  { cmd: 'git push --no-verify' },
  { input: 'git commit --no-verify -m "x"' },
];

for (const obj of variants) {
  const result = run(JSON.stringify(obj));
  const key = Object.keys(obj)[0];
  assert(`field "${key}" blocked`, result.code, 2);
}

// --- Summary ---
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
