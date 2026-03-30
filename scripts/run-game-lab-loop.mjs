#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import {
  access,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const runnerDir = path.join(rootDir, '.game-lab-runner');
const logsDir = path.join(runnerDir, 'logs');
const statePath = path.join(runnerDir, 'state.json');
const stopPath = path.join(runnerDir, 'STOP');
const lockPath = path.join(runnerDir, 'runner.json');
const promptTemplatePath = path.join(__dirname, 'game-lab-runner-prompt.md');
const resultsPath = path.join(rootDir, 'results.tsv');
const runLogPath = path.join(rootDir, 'run.log');

const defaultOptions = {
  iterations: Number.POSITIVE_INFINITY,
  delayMs: 0,
  codexBin: process.env.CODEX_BIN || 'codex',
  model: '',
  promptFile: promptTemplatePath,
  dryRun: false,
  search: false,
  dangerous: false,
  maxConsecutiveFailures: 3,
};

let activeChild = null;
let stopRequested = false;

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  await cleanupLock();
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  installSignalHandlers();

  await ensureRunnerLayout();
  await ensureSingleRunner();
  await ensureRequiredFiles(options.promptFile);
  await ensureResultsFile();

  const branch = (await safeCapture('git', ['branch', '--show-current'])).trim() || '(detached)';
  const commit = await getCommitLabel();
  const promptTemplate = await readFile(options.promptFile, 'utf8');

  const initialState = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    branch,
    commit,
    options: printableOptions(options),
    host: os.hostname(),
    cwd: rootDir,
  };

  await writeJson(lockPath, initialState);
  await writeJson(statePath, {
    status: 'running',
    ...initialState,
    completedIterations: 0,
    consecutiveFailures: 0,
    lastIteration: null,
  });

  if (options.iterations === 0) {
    console.log('Preflight complete. No iterations requested.');
    await finalizeState('idle', 0, 0, null);
    return;
  }

  let completedIterations = 0;
  let consecutiveFailures = 0;

  while (!stopRequested && completedIterations < options.iterations) {
    if (await fileExists(stopPath)) {
      console.log(`Stop file detected at ${stopPath}. Exiting loop.`);
      break;
    }

    const iterationNumber = completedIterations + 1;
    const iterationLabel = formatIterationLabel(iterationNumber);
    const iterationDir = path.join(logsDir, iterationLabel);
    await mkdir(iterationDir, { recursive: true });

    const prompt = await buildPrompt({
      promptTemplate,
      branch,
      commit: await getCommitLabel(),
      iterationNumber,
      iterationDir,
    });

    const promptPath = path.join(iterationDir, 'prompt.md');
    const transcriptPath = path.join(iterationDir, 'transcript.log');
    const lastMessagePath = path.join(iterationDir, 'last-message.txt');
    const metaPath = path.join(iterationDir, 'meta.json');

    await writeFile(promptPath, prompt, 'utf8');

    const codexArgs = buildCodexArgs(options, lastMessagePath);
    const startedAt = new Date();

    if (options.dryRun) {
      const meta = {
        iteration: iterationNumber,
        label: iterationLabel,
        startedAt: startedAt.toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: 0,
        command: [options.codexBin, ...codexArgs],
        dryRun: true,
      };
      await writeJson(metaPath, meta);
      console.log(`Dry run prepared ${iterationLabel}`);
      console.log([options.codexBin, ...codexArgs].join(' '));
      console.log(`Prompt written to ${promptPath}`);
      completedIterations += 1;
      await updateState('running', completedIterations, consecutiveFailures, meta);
      continue;
    }

    console.log(`Starting ${iterationLabel}`);
    const result = await runCodexIteration({
      codexBin: options.codexBin,
      args: codexArgs,
      prompt,
      transcriptPath,
    });

    const endedAt = new Date();
    const summary = await captureIterationSummary();
    const lastResultRow = await readLastResultsRow();
    const meta = {
      iteration: iterationNumber,
      label: iterationLabel,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - startedAt.getTime(),
      exitCode: result.code,
      signal: result.signal,
      command: [options.codexBin, ...codexArgs],
      summary,
      lastResultRow,
      transcriptPath,
      lastMessagePath: await fileExists(lastMessagePath) ? lastMessagePath : null,
    };

    await writeJson(metaPath, meta);
    completedIterations += 1;

    if (result.code === 0) {
      consecutiveFailures = 0;
    } else {
      consecutiveFailures += 1;
    }

    await updateState('running', completedIterations, consecutiveFailures, meta);

    if (result.code !== 0 && consecutiveFailures >= options.maxConsecutiveFailures) {
      console.error(
        `Stopping after ${consecutiveFailures} consecutive Codex failures. See ${iterationDir}`,
      );
      break;
    }

    if (!stopRequested && completedIterations < options.iterations && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  const finalStatus = stopRequested || (await fileExists(stopPath)) ? 'stopped' : 'idle';
  await finalizeState(finalStatus, completedIterations, consecutiveFailures, null);
}

function parseArgs(args) {
  const options = { ...defaultOptions, help: false };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--iterations':
        options.iterations = parseCount(args[++index], '--iterations');
        break;
      case '--delay-ms':
        options.delayMs = parseCount(args[++index], '--delay-ms');
        break;
      case '--model':
        options.model = requireValue(args[++index], '--model');
        break;
      case '--codex-bin':
        options.codexBin = requireValue(args[++index], '--codex-bin');
        break;
      case '--prompt-file':
        options.promptFile = path.resolve(rootDir, requireValue(args[++index], '--prompt-file'));
        break;
      case '--max-consecutive-failures':
        options.maxConsecutiveFailures = parseCount(args[++index], '--max-consecutive-failures');
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--search':
        options.search = true;
        break;
      case '--dangerous':
        options.dangerous = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/run-game-lab-loop.mjs [options]

Options:
  --iterations <n>                Number of iterations to run. Default: forever
  --delay-ms <ms>                 Pause between iterations. Default: 0
  --model <name>                  Override the Codex model
  --codex-bin <path>              Codex CLI binary. Default: codex
  --prompt-file <path>            Prompt template to feed each iteration
  --max-consecutive-failures <n>  Stop after n non-zero Codex exits. Default: 3
  --search                        Enable Codex web search during iterations
  --dangerous                     Use --dangerously-bypass-approvals-and-sandbox
  --dry-run                       Render prompts and commands without invoking Codex
  --help, -h                      Show this help

The runner writes artifacts to .game-lab-runner/.
Create .game-lab-runner/STOP to halt the loop after the current iteration.`);
}

async function ensureRunnerLayout() {
  await mkdir(logsDir, { recursive: true });
}

async function ensureSingleRunner() {
  if (!(await fileExists(lockPath))) {
    return;
  }

  const raw = await readFile(lockPath, 'utf8');
  const existing = JSON.parse(raw);
  throw new Error(
    `Runner lock already exists at ${lockPath} (pid ${existing.pid ?? 'unknown'}). Remove it if stale.`,
  );
}

async function ensureRequiredFiles(promptFile) {
  const required = ['program.md', 'README.md', 'game-lab.json', 'package.json'];

  for (const relativePath of required) {
    await access(path.join(rootDir, relativePath), fsConstants.R_OK);
  }

  await access(promptFile, fsConstants.R_OK);
}

async function ensureResultsFile() {
  if (await fileExists(resultsPath)) {
    return;
  }

  const result = await runProcess('npm', ['run', 'init:results'], {
    cwd: rootDir,
    stdinText: '',
    transcriptPath: path.join(logsDir, 'init-results.log'),
  });

  if (result.code !== 0) {
    throw new Error('Failed to initialize results.tsv');
  }
}

async function buildPrompt({ promptTemplate, branch, commit, iterationNumber, iterationDir }) {
  const recentResults = await tailResults(5);
  return `${promptTemplate}

Runner context:

- Branch: ${branch}
- Commit label: ${commit}
- Iteration: ${iterationNumber}
- Workspace root: ${rootDir}
- Runner artifacts: ${iterationDir}
- Stop file: ${stopPath}

Recent results.tsv tail:
${recentResults || '(no prior experiment rows)'}
`;
}

function buildCodexArgs(options, lastMessagePath) {
  const args = [];

  if (options.search) {
    args.push('--search');
  }

  args.push('exec', '--color', 'never', '--cd', rootDir, '--output-last-message', lastMessagePath);

  if (options.model) {
    args.push('--model', options.model);
  }

  if (options.dangerous) {
    args.push('--dangerously-bypass-approvals-and-sandbox');
  } else {
    args.push('--full-auto');
  }

  args.push('-');
  return args;
}

async function runCodexIteration({ codexBin, args, prompt, transcriptPath }) {
  return runProcess(codexBin, args, {
    cwd: rootDir,
    stdinText: prompt,
    transcriptPath,
  });
}

async function runProcess(command, args, { cwd, stdinText, transcriptPath }) {
  const logStream = createWriteStream(transcriptPath, { flags: 'a' });

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    activeChild = child;

    child.on('error', (error) => {
      activeChild = null;
      logStream.end();
      reject(error);
    });

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      logStream.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      logStream.write(chunk);
    });

    child.on('close', (code, signal) => {
      activeChild = null;
      logStream.end();
      resolve({ code: code ?? 1, signal: signal ?? null });
    });

    child.stdin.end(stdinText);
  });
}

async function captureIterationSummary() {
  const summary = {
    runLogLines: [],
  };

  if (await fileExists(runLogPath)) {
    const runLog = await readFile(runLogPath, 'utf8');
    summary.runLogLines = runLog
      .split('\n')
      .filter((line) =>
        /^(selected_score:|selected_game:|best_game:|selected_rank:|best_score:|verdict:)/.test(
          line,
        ),
      );
  }

  return summary;
}

async function tailResults(count) {
  if (!(await fileExists(resultsPath))) {
    return '';
  }

  const raw = await readFile(resultsPath, 'utf8');
  const lines = raw.trim().split('\n');
  return lines.slice(Math.max(0, lines.length - count)).join('\n');
}

async function readLastResultsRow() {
  if (!(await fileExists(resultsPath))) {
    return null;
  }

  const raw = await readFile(resultsPath, 'utf8');
  const lines = raw.trim().split('\n');
  return lines.length > 1 ? lines[lines.length - 1] : null;
}

async function getCommitLabel() {
  const commit = (await safeCapture('git', ['rev-parse', '--short', 'HEAD'])).trim();
  return commit || 'unborn';
}

async function safeCapture(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.on('error', () => resolve(''));
    child.on('close', () => resolve(output));
  });
}

async function updateState(status, completedIterations, consecutiveFailures, lastIteration) {
  const current = {
    status,
    pid: process.pid,
    updatedAt: new Date().toISOString(),
    completedIterations,
    consecutiveFailures,
    lastIteration,
  };

  await writeJson(statePath, current);
}

async function finalizeState(status, completedIterations, consecutiveFailures, lastIteration) {
  await updateState(status, completedIterations, consecutiveFailures, lastIteration);
  await cleanupLock();
  if (await fileExists(stopPath)) {
    await rm(stopPath, { force: true });
  }
}

function installSignalHandlers() {
  const requestStop = async (signal) => {
    stopRequested = true;
    console.error(`Received ${signal}. Stopping after the current iteration.`);

    if (activeChild) {
      activeChild.kill('SIGINT');
    }
  };

  process.on('SIGINT', () => {
    void requestStop('SIGINT');
  });

  process.on('SIGTERM', () => {
    void requestStop('SIGTERM');
  });
}

async function cleanupLock() {
  if (await fileExists(lockPath)) {
    await rm(lockPath, { force: true });
  }
}

function printableOptions(options) {
  return {
    iterations: Number.isFinite(options.iterations) ? options.iterations : 'forever',
    delayMs: options.delayMs,
    codexBin: options.codexBin,
    model: options.model || '(default)',
    promptFile: options.promptFile,
    search: options.search,
    dangerous: options.dangerous,
    maxConsecutiveFailures: options.maxConsecutiveFailures,
    dryRun: options.dryRun,
  };
}

function formatIterationLabel(iterationNumber) {
  const now = new Date();
  const stamp = now.toISOString().replaceAll(':', '-');
  return `${stamp}-iter-${String(iterationNumber).padStart(4, '0')}`;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function parseCount(value, flagName) {
  const parsed = Number.parseInt(requireValue(value, flagName), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flagName} must be a non-negative integer`);
  }

  return parsed;
}

function requireValue(value, flagName) {
  if (!value) {
    throw new Error(`${flagName} requires a value`);
  }

  return value;
}

function sleep(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
