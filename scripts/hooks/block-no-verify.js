#!/usr/bin/env node
'use strict';

/**
 * block-no-verify.js — Local replacement for npx block-no-verify
 *
 * Blocks git commands that contain --no-verify (or -n shorthand for push)
 * to prevent Claude from skipping pre-commit, commit-msg, and pre-push hooks.
 *
 * Input:  Claude Code PreToolUse JSON on stdin
 * Output: JSON with "decision" field
 * Exit 0: command allowed
 * Exit 2: command blocked
 */

const GIT_NO_VERIFY = /\bgit\b.*--no-verify\b/;
const GIT_PUSH_SHORT_N = /\bgit\s+push\b.*\s-[a-zA-Z]*n/;

function extractCommand(input) {
  try {
    const parsed = JSON.parse(input);
    return (
      (parsed.tool_input && parsed.tool_input.command) ||
      parsed.command ||
      parsed.cmd ||
      parsed.input ||
      parsed.shell ||
      parsed.script ||
      ''
    );
  } catch {
    return input;
  }
}

function isBlocked(command) {
  if (typeof command !== 'string') return false;
  if (GIT_NO_VERIFY.test(command)) return true;
  if (GIT_PUSH_SHORT_N.test(command)) return true;
  return false;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  const command = extractCommand(input.trim());

  if (isBlocked(command)) {
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: 'Blocked: --no-verify flag is not allowed. Git hooks must not be bypassed.'
    }));
    process.exit(2);
  }

  process.stdout.write(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
});
