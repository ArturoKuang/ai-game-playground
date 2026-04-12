#!/usr/bin/env node

/**
 * Ralph Loop — Claude Code outer-loop runner
 *
 * Drives the Blind 75 run-program.md by spawning one `claude` CLI session
 * per outer-loop pass. Each pass picks the next unchecked problem and runs
 * one full design cycle.
 *
 * Defaults: Opus 4.6, effort high. Override with flags.
 *
 * Usage:
 *   node tools/ralph-loop.mjs [options]
 *
 * Options:
 *   --delay-ms <n>         Pause between passes (ms). Default: 3000
 *   --max-iterations <n>   Stop after n passes. Default: unlimited
 *   --model <name>         Model. Default: opus
 *   --effort <level>       Effort level (low|medium|high|max). Default: high
 *   --allowedTools <list>  Comma-separated tool allow list. Default: all
 *   -h, --help             Show help
 *
 * Examples:
 *   node tools/ralph-loop.mjs
 *   node tools/ralph-loop.mjs --max-iterations 5
 *   node tools/ralph-loop.mjs --effort max --delay-ms 5000
 */

import { readFile, appendFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const cwd = process.cwd();
const runProgramPath = path.resolve(cwd, 'run-program.md');
const logPath = path.resolve(cwd, 'ralph-loop.log');

/* ── Arg parsing ── */

function parseArgs(argv) {
  const options = {
    delayMs: 3000,
    maxIterations: Infinity,
    model: 'opus',
    effort: 'high',
    allowedTools: null,
    extraArgs: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--delay-ms')        { options.delayMs = Number(argv[++i]); continue; }
    if (arg === '--max-iterations')   { options.maxIterations = Number(argv[++i]); continue; }
    if (arg === '--model')            { options.model = argv[++i]; continue; }
    if (arg === '--effort')           { options.effort = argv[++i]; continue; }
    if (arg === '--allowedTools')     { options.allowedTools = argv[++i]; continue; }
    if (arg === '--help' || arg === '-h') { printHelp(); process.exit(0); }
    options.extraArgs.push(arg);
  }

  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) {
    throw new Error('--delay-ms must be a non-negative number');
  }
  if (options.maxIterations !== Infinity && (!Number.isFinite(options.maxIterations) || options.maxIterations <= 0)) {
    throw new Error('--max-iterations must be a positive number');
  }

  return options;
}

function printHelp() {
  console.log(`Ralph loop runner for Claude Code.

Defaults: model=opus, effort=high (Opus 4.6 with extended thinking).

Usage:
  node tools/ralph-loop.mjs [options]

Options:
  --delay-ms <n>         Pause between passes (ms). Default: 3000
  --max-iterations <n>   Stop after n passes. Default: unlimited
  --model <name>         Model. Default: opus (claude-opus-4-6)
  --effort <level>       Effort level (low|medium|high|max). Default: high
  --allowedTools <list>  Comma-separated tool allow list
  -h, --help             Show help

Examples:
  node tools/ralph-loop.mjs
  node tools/ralph-loop.mjs --max-iterations 10
  node tools/ralph-loop.mjs --effort max
`);
}

/* ── Tracker helpers ── */

function countTracker(markdown) {
  const open = (markdown.match(/^- \[ \] /gm) || []).length;
  const done = (markdown.match(/^- \[x\] /gm) || []).length;
  return { total: open + done, open, done };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp() {
  return new Date().toISOString();
}

async function log(message) {
  const line = `[${timestamp()}] ${message}\n`;
  process.stdout.write(line);
  await appendFile(logPath, line).catch(() => {});
}

/* ── Prompt for each pass ── */

function createPrompt(iteration) {
  return [
    `You are executing outer-loop iteration ${iteration} for the Blind 75 effort.`,
    '',
    `Read ${runProgramPath} and follow the "One Outer-Loop Pass" steps exactly.`,
    '',
    'Do exactly one pass this session:',
    '1. Find the next unchecked Blind 75 problem in run-program.md.',
    '2. Run one full cycle from leetcode/program.md for that problem.',
    '3. Use Agent with isolation:"worktree" for engineer build work.',
    '4. Update run-program.md tracker with the result.',
    '5. Commit your changes.',
    '',
    'Do NOT start a second problem in this session.',
    'If all problems are complete, verify and exit without changes.',
    '',
    'Return a short summary: what was tried, what survived, what the next unchecked problem is.',
  ].join('\n');
}

/* ── Spawn one claude session ── */

function runClaude(prompt, options) {
  return new Promise((resolve) => {
    const args = [
      '--print',
      '--model', options.model,
      '--effort', options.effort,
    ];

    if (options.allowedTools) {
      args.push('--allowedTools', options.allowedTools);
    }

    args.push(...options.extraArgs);

    // Prompt is the positional arg at the end
    args.push(prompt);

    const child = spawn('claude', args, {
      cwd,
      stdio: ['ignore', 'inherit', 'inherit'],
    });

    child.on('error', (error) => {
      resolve({ code: 1, error });
    });

    child.on('exit', (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });
}

/* ── Signal handling ── */

let stopRequested = false;

function requestStop(signal) {
  if (stopRequested) {
    console.log(`\nReceived ${signal} again. Forcing exit.`);
    process.exit(130);
  }
  stopRequested = true;
  console.log(`\nReceived ${signal}. Will stop after the current pass finishes.`);
}

process.on('SIGINT', () => requestStop('SIGINT'));
process.on('SIGTERM', () => requestStop('SIGTERM'));

/* ── Main loop ── */

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let iteration = 0;

  await log(`Ralph loop starting (model=${options.model}, effort=${options.effort})`);

  while (!stopRequested && iteration < options.maxIterations) {
    const markdown = await readFile(runProgramPath, 'utf8');
    const tracker = countTracker(markdown);

    if (tracker.total === 0) {
      throw new Error(`No Blind 75 tracker entries found in ${runProgramPath}`);
    }

    if (tracker.done === tracker.total) {
      await log(`All Blind 75 problems complete (${tracker.done}/${tracker.total}). Stopping.`);
      return;
    }

    iteration += 1;
    await log(`=== Pass ${iteration} === (${tracker.done}/${tracker.total} done, ${tracker.open} remaining)`);

    const result = await runClaude(createPrompt(iteration), options);

    if (result.error) {
      await log(`Claude failed to start: ${result.error.message}`);
      process.exitCode = 1;
      return;
    }

    if (result.signal) {
      await log(`Claude killed by signal: ${result.signal}`);
      process.exitCode = 1;
      return;
    }

    if (result.code !== 0) {
      await log(`Claude exited with code ${result.code}. Stopping.`);
      process.exitCode = result.code;
      return;
    }

    // Check progress after the pass
    const updated = await readFile(runProgramPath, 'utf8');
    const updatedTracker = countTracker(updated);
    await log(`After pass: ${updatedTracker.done}/${updatedTracker.total} done, ${updatedTracker.open} remaining`);

    if (updatedTracker.done === updatedTracker.total) {
      await log('All problems complete. Stopping.');
      return;
    }

    if (!stopRequested && iteration < options.maxIterations) {
      await sleep(options.delayMs);
    }
  }

  await log(`Ralph loop finished after ${iteration} passes.`);
}

main().catch(async (error) => {
  await log(`Fatal: ${error.message}`);
  process.exitCode = 1;
});
