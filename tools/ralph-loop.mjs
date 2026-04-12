#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const cwd = process.cwd();
const runProgramPath = path.resolve(cwd, 'run-program.md');

function parseArgs(argv) {
  const options = {
    delayMs: 2000,
    maxIterations: Infinity,
    model: null,
    sandbox: 'workspace-write',
    extraArgs: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--delay-ms') {
      options.delayMs = Number(argv[++i]);
      continue;
    }

    if (arg === '--max-iterations') {
      options.maxIterations = Number(argv[++i]);
      continue;
    }

    if (arg === '--model') {
      options.model = argv[++i];
      continue;
    }

    if (arg === '--sandbox') {
      options.sandbox = argv[++i];
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    options.extraArgs.push(arg);
  }

  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) {
    throw new Error('--delay-ms must be a non-negative number');
  }

  if (options.maxIterations !== Infinity) {
    if (!Number.isFinite(options.maxIterations) || options.maxIterations <= 0) {
      throw new Error('--max-iterations must be a positive number');
    }
  }

  return options;
}

function printHelp() {
  console.log(`Ralph loop runner for Codex.

Usage:
  node tools/ralph-loop.mjs [options] [extra codex args...]

Options:
  --delay-ms <n>         Delay between Codex runs in milliseconds. Default: 2000
  --max-iterations <n>   Stop after n outer-loop runs. Default: unlimited
  --model <name>         Pass a model override to codex exec
  --sandbox <mode>       Sandbox mode for codex exec. Default: workspace-write
  -h, --help             Show this help

Examples:
  npm run ralph:loop
  npm run ralph:loop -- --model gpt-5.4 --delay-ms 5000
`);
}

function countTracker(markdown) {
  const open = (markdown.match(/^- \[ \] /gm) || []).length;
  const done = (markdown.match(/^- \[x\] /gm) || []).length;
  return {
    total: open + done,
    open,
    done,
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createPrompt(iteration) {
  return [
    `You are executing outer-loop iteration ${iteration} for the Blind 75 effort in this repository.`,
    `Read ${runProgramPath} and leetcode/program.md, then follow them.`,
    'Do exactly one outer-loop pass this session.',
    'That means: work on the next valid unchecked Blind 75 item, or explicitly map it to an existing kept game if that mapping is strong and you update the tracker.',
    'Do not start a second outer-loop item in the same Codex run.',
    'If all items are already complete, verify that state and exit without making changes.',
    'Before finishing, update run-program.md if progress was made.',
    'Return a short summary of what changed and what the next unchecked item is.',
  ].join('\n');
}

function runCodex(prompt, options) {
  return new Promise((resolve) => {
    const args = ['exec', '--cd', cwd, '--sandbox', options.sandbox];

    if (options.model) {
      args.push('--model', options.model);
    }

    args.push(...options.extraArgs, '-');

    const child = spawn('codex', args, {
      cwd,
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    child.on('error', (error) => {
      resolve({ code: 1, error });
    });

    child.on('exit', (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });

    child.stdin.end(prompt);
  });
}

let stopRequested = false;
let forceStopRequested = false;

function requestStop(signal) {
  if (forceStopRequested) {
    process.exit(130);
  }

  if (stopRequested) {
    forceStopRequested = true;
    console.log(`\nReceived ${signal} again. Stopping immediately.`);
    process.exit(130);
    return;
  }

  stopRequested = true;
  console.log(`\nReceived ${signal}. Ralph loop will stop after the current Codex run ends.`);
}

process.on('SIGINT', () => requestStop('SIGINT'));
process.on('SIGTERM', () => requestStop('SIGTERM'));

async function main() {
  const options = parseArgs(process.argv.slice(2));

  let iteration = 0;

  while (!stopRequested && iteration < options.maxIterations) {
    const markdown = await readFile(runProgramPath, 'utf8');
    const tracker = countTracker(markdown);

    if (tracker.total === 0) {
      throw new Error(`No Blind 75 tracker entries found in ${runProgramPath}`);
    }

    if (tracker.done === tracker.total) {
      console.log(`All Blind 75 items are complete (${tracker.done}/${tracker.total}). Stopping.`);
      return;
    }

    iteration += 1;
    console.log(`\n=== Ralph loop iteration ${iteration} ===`);
    console.log(`Progress before run: ${tracker.done}/${tracker.total} complete, ${tracker.open} remaining`);

    const result = await runCodex(createPrompt(iteration), options);

    if (result.error) {
      console.error(`Codex failed to start: ${result.error.message}`);
      process.exitCode = 1;
      return;
    }

    if (result.signal) {
      console.error(`Codex exited due to signal: ${result.signal}`);
      process.exitCode = 1;
      return;
    }

    if (result.code !== 0) {
      console.error(`Codex exited with code ${result.code}. Stopping loop.`);
      process.exitCode = result.code;
      return;
    }

    const updatedMarkdown = await readFile(runProgramPath, 'utf8');
    const updatedTracker = countTracker(updatedMarkdown);

    console.log(
      `Progress after run: ${updatedTracker.done}/${updatedTracker.total} complete, ${updatedTracker.open} remaining`
    );

    if (updatedTracker.done === updatedTracker.total) {
      console.log('Blind 75 tracker is complete. Stopping.');
      return;
    }

    if (!stopRequested && iteration < options.maxIterations) {
      await sleep(options.delayMs);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
