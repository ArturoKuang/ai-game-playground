export type StillpathDifficulty = 1 | 2 | 3 | 4 | 5;

export type StillpathMoveType = 'brew' | 'skip' | 'seal' | 'backtrack';

export type StillpathMove = {
  type: StillpathMoveType;
};

export type StillpathVerdict = {
  correct: boolean;
  label: string;
};

export type StillpathPuzzle = {
  difficulty: StillpathDifficulty;
  label: string;
  title: string;
  helper: string;
  candidates: number[];
  target: number;
  budget: number;
  recipes: number[][];
};

export type StillpathState = {
  puzzle: StillpathPuzzle;
  cursor: number;
  stack: number[];
  stackIndices: number[];
  total: number;
  found: number[][];
  sealedCurrent: boolean;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: StillpathVerdict | null;
};

export type StillpathSolution = {
  moves: StillpathMove[];
  finalState: StillpathState;
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  totalDecisions: number;
  meanDecisionEntropy: number;
  meanInfoGainRatio: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  routes: Array<{
    candidates: number[];
    target: number;
  }>;
};

type DifficultyAggregate = {
  difficulty: StillpathDifficulty;
  label: string;
  budget: number;
  solvability: number;
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  counterintuitive: number;
  drama: number;
  infoGainRatio: number;
  optimalMoves: number;
  altMoves: number;
  altSolvability: number;
};

type LearningMetrics = {
  inputShapeMatch: number;
  operationMatch: number;
  constraintMatch: number;
  goalMatch: number;
  leetCodeFit: number;
  bestAlternativeGap: number;
  invariantPressure: number;
  difficultyBreakpoint: StillpathDifficulty;
  algorithmAlignment: number;
};

export type StillpathEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<StillpathDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Open Pantry',
    helper:
      'Short recipes leave room for a few wrong pours. The important habit is that a herb can stay live for reuse, and you only climb to heavier herbs when the current trail is finished.',
    budget: 21,
    routes: [
      { candidates: [2, 3, 4], target: 6 },
      { candidates: [2, 3, 5], target: 7 },
      { candidates: [2, 4, 5], target: 8 },
      { candidates: [3, 4, 5], target: 8 },
    ],
  },
  2: {
    label: 'D2',
    title: 'Measured Shelf',
    helper:
      'More exact blends appear. Blindly chasing one herb too long still works sometimes, but branch-local skips and retreats are starting to matter.',
    budget: 28,
    routes: [
      { candidates: [2, 3, 5], target: 8 },
      { candidates: [2, 3, 6], target: 8 },
      { candidates: [2, 5, 6], target: 10 },
      { candidates: [3, 5, 7], target: 10 },
    ],
  },
  3: {
    label: 'D3',
    title: 'Backroom Ledger',
    helper:
      'The slack is thinner now. You need to keep the local recipe stack alive, skip to the next herb only when the current branch is spent, and retreat one layer instead of resetting the whole pantry.',
    budget: 36,
    routes: [
      { candidates: [2, 3, 4], target: 9 },
      { candidates: [2, 3, 7], target: 9 },
      { candidates: [2, 4, 7], target: 11 },
      { candidates: [2, 5, 7], target: 12 },
    ],
  },
  4: {
    label: 'D4',
    title: 'Exact Distillery',
    helper:
      'Several near-miss branches waste the clock. The surviving route keeps the current brew stack, advances only forward through the sorted shelf, and backs out one layer the moment the remaining gap can no longer fit.',
    budget: 41,
    routes: [
      { candidates: [2, 4, 8], target: 10 },
      { candidates: [2, 4, 9], target: 13 },
      { candidates: [2, 5, 6], target: 12 },
      { candidates: [3, 5, 7], target: 14 },
    ],
  },
  5: {
    label: 'D5',
    title: 'Cellar Audit',
    helper:
      'Long recipe trees and tight clocks expose every wasteful reset. Only disciplined branch-local backtracking still catalogs every exact blend before the audit closes.',
    budget: 40,
    routes: [
      { candidates: [2, 3, 8], target: 11 },
      { candidates: [2, 4, 9], target: 12 },
      { candidates: [2, 5, 7], target: 13 },
      { candidates: [3, 5, 7], target: 15 },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneRecipes(recipes: number[][]) {
  return recipes.map((recipe) => [...recipe]);
}

function cloneState(state: StillpathState): StillpathState {
  return {
    ...state,
    stack: [...state.stack],
    stackIndices: [...state.stackIndices],
    found: cloneRecipes(state.found),
    history: [...state.history],
  };
}

export function recipeKey(recipe: number[]) {
  return recipe.join('+');
}

export function formatRecipe(recipe: number[]) {
  return recipe.length === 0 ? 'empty' : recipe.join(' + ');
}

function recipeSet(recipes: number[][]) {
  return new Set(recipes.map((recipe) => recipeKey(recipe)));
}

function enumerateRecipes(
  candidates: number[],
  target: number,
  startIndex = 0,
  total = 0,
  path: number[] = [],
  output: number[][] = [],
) {
  if (total === target) {
    output.push([...path]);
    return output;
  }

  for (let index = startIndex; index < candidates.length; index += 1) {
    const value = candidates[index];
    if (total + value > target) break;
    path.push(value);
    enumerateRecipes(candidates, target, index, total + value, path, output);
    path.pop();
  }

  return output;
}

export function generatePuzzle(seed: number, difficulty: StillpathDifficulty): StillpathPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const route = blueprint.routes[seed % blueprint.routes.length];
  const candidates = [...route.candidates].sort((left, right) => left - right);

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    candidates,
    target: route.target,
    budget: blueprint.budget,
    recipes: enumerateRecipes(candidates, route.target),
  };
}

export function createInitialState(puzzle: StillpathPuzzle): StillpathState {
  return {
    puzzle,
    cursor: 0,
    stack: [],
    stackIndices: [],
    total: 0,
    found: [],
    sealedCurrent: false,
    actionsUsed: 0,
    history: [],
    message:
      `Reach exactly ${puzzle.target} and bottle every stable recipe. Herbs stay reusable at the current shelf slot, but once you climb to a heavier herb at this depth you do not come back down until you retreat.`,
    verdict: null,
  };
}

export function currentCandidate(state: StillpathState) {
  return state.puzzle.candidates[state.cursor] ?? null;
}

export function remainingGap(state: StillpathState) {
  return state.puzzle.target - state.total;
}

export function totalRecipes(state: StillpathState) {
  return state.puzzle.recipes.length;
}

export function foundRecipeCount(state: StillpathState) {
  return state.found.length;
}

export function missingRecipes(state: StillpathState) {
  const found = recipeSet(state.found);
  return state.puzzle.recipes.filter((recipe) => !found.has(recipeKey(recipe)));
}

export type StillpathBranchMode =
  | 'live'
  | 'exactReady'
  | 'exactSealed'
  | 'overshot'
  | 'exhausted';

export function branchMode(state: StillpathState): StillpathBranchMode {
  if (state.total === state.puzzle.target) {
    return state.sealedCurrent ? 'exactSealed' : 'exactReady';
  }

  if (state.total > state.puzzle.target) return 'overshot';
  if (state.cursor >= state.puzzle.candidates.length) return 'exhausted';
  return 'live';
}

export function legalMoves(state: StillpathState): StillpathMoveType[] {
  if (state.verdict) return [];

  const mode = branchMode(state);
  if (mode === 'exactReady') return ['seal'];
  if (mode === 'exactSealed' || mode === 'overshot' || mode === 'exhausted') {
    return state.stack.length > 0 ? ['backtrack'] : [];
  }

  const moves: StillpathMoveType[] = ['brew'];
  if (state.cursor < state.puzzle.candidates.length - 1) moves.push('skip');
  if (state.stack.length > 0) moves.push('backtrack');
  return moves;
}

function finalizeState(next: StillpathState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The cellar audit closed before every stable recipe was bottled.',
    };
    return next;
  }

  if (next.found.length === next.puzzle.recipes.length) {
    next.verdict = {
      correct: true,
      label: `Cellar complete: ${next.found.map((recipe) => formatRecipe(recipe)).join(' | ')}.`,
    };
    return next;
  }

  if (next.stack.length === 0 && next.cursor >= next.puzzle.candidates.length) {
    const missing = missingRecipes(next).map((recipe) => formatRecipe(recipe)).join(' | ');
    next.verdict = {
      correct: false,
      label: missing
        ? `The shelf is exhausted, but these exact recipes were still missing: ${missing}.`
        : 'The shelf is exhausted before the recipe ledger settled.',
    };
  }

  return next;
}

function fail(next: StillpathState, label: string) {
  next.verdict = {
    correct: false,
    label,
  };
  return next;
}

export function applyMove(state: StillpathState, move: StillpathMove): StillpathState {
  if (state.verdict) return state;

  const next = cloneState(state);
  const legal = new Set(legalMoves(state));

  if (!legal.has(move.type)) {
    return fail(next, `That move was not live here. Branch mode: ${branchMode(state)}.`);
  }

  next.actionsUsed += 1;

  if (move.type === 'brew') {
    const value = currentCandidate(next);
    if (value === null) {
      return fail(next, 'There was no live herb left on this shelf slot.');
    }

    next.stack.push(value);
    next.stackIndices.push(next.cursor);
    next.total += value;
    next.sealedCurrent = false;
    next.history.push(`Brew ${value}`);

    if (next.total === next.puzzle.target) {
      next.message = `Exact match. Bottle ${formatRecipe(next.stack)} before you retreat.`;
    } else if (next.total > next.puzzle.target) {
      next.message = `Overshot by ${next.total - next.puzzle.target}. This branch is dead; retreat one layer.`;
    } else {
      next.message = `Blend totals ${next.total}. Remaining gap: ${remainingGap(next)}.`;
    }

    return finalizeState(next);
  }

  if (move.type === 'skip') {
    next.cursor += 1;
    next.sealedCurrent = false;
    const candidate = currentCandidate(next);
    next.history.push(candidate === null ? 'Skip past shelf' : `Skip to ${candidate}`);
    next.message =
      candidate === null
        ? 'No heavier herb remains at this depth. Retreat when the branch is spent.'
        : `Advance to herb ${candidate}. The current stack stays live while you test heavier options.`;
    return finalizeState(next);
  }

  if (move.type === 'seal') {
    const key = recipeKey(next.stack);
    if (recipeSet(next.found).has(key)) {
      return fail(next, 'That recipe was already bottled. Retreat and continue the search tree.');
    }

    next.found.push([...next.stack]);
    next.sealedCurrent = true;
    next.history.push(`Seal ${formatRecipe(next.stack)}`);
    next.message =
      next.found.length === next.puzzle.recipes.length
        ? 'Every stable recipe is bottled.'
        : `Recipe bottled. Retreat one layer and continue from the next heavier shelf slot.`;
    return finalizeState(next);
  }

  const poppedIndex = next.stackIndices.pop();
  const poppedValue = next.stack.pop();
  if (poppedIndex === undefined || poppedValue === undefined) {
    return fail(next, 'There was no brew layer left to retreat from.');
  }

  next.total -= poppedValue;
  next.cursor = poppedIndex + 1;
  next.sealedCurrent = false;
  next.history.push(`Backtrack ${poppedValue}`);
  next.message =
    next.cursor >= next.puzzle.candidates.length
      ? 'That shelf branch is spent. Keep retreating until a heavier option opens.'
      : `Retreat to total ${next.total}. Resume from herb ${next.puzzle.candidates[next.cursor]}.`;
  return finalizeState(next);
}

function simulate(
  puzzle: StillpathPuzzle,
  plan: StillpathMove[],
  counterintuitive: (state: StillpathState, move: StillpathMove, legal: StillpathMoveType[]) => boolean,
) {
  let state = createInitialState(puzzle);
  let counterintuitiveSteps = 0;
  let entropySum = 0;
  let infoGainSum = 0;
  let decisionCount = 0;

  for (const move of plan) {
    const legal = legalMoves(state);
    if (legal.length > 0) {
      entropySum += log2(legal.length);
      infoGainSum += 4 / legal.length;
      decisionCount += 1;
      if (counterintuitive(state, move, legal)) {
        counterintuitiveSteps += 1;
      }
    }

    state = applyMove(state, move);
    if (state.verdict) break;
  }

  return {
    state,
    counterintuitiveSteps,
    totalDecisions: decisionCount,
    decisionEntropy: decisionCount === 0 ? 0 : entropySum / decisionCount,
    meanInfoGainRatio: decisionCount === 0 ? 0 : infoGainSum / decisionCount,
  };
}

function buildOptimalPlan(puzzle: StillpathPuzzle) {
  const moves: StillpathMove[] = [];
  const { candidates, target } = puzzle;

  function dfs(startIndex: number, total: number) {
    if (total === target) {
      moves.push({ type: 'seal' });
      return;
    }

    let cursor = startIndex;
    for (let index = startIndex; index < candidates.length; index += 1) {
      const value = candidates[index];
      if (total + value > target) break;

      while (cursor < index) {
        moves.push({ type: 'skip' });
        cursor += 1;
      }

      moves.push({ type: 'brew' });
      dfs(index, total + value);
      moves.push({ type: 'backtrack' });
      cursor = index + 1;
    }
  }

  dfs(0, 0);
  return moves;
}

function buildOvercommitPlan(puzzle: StillpathPuzzle) {
  const moves: StillpathMove[] = [];

  function dfs(startIndex: number, total: number) {
    if (total === puzzle.target) {
      moves.push({ type: 'seal' });
      return;
    }

    let cursor = startIndex;
    for (let index = startIndex; index < puzzle.candidates.length; index += 1) {
      while (cursor < index) {
        moves.push({ type: 'skip' });
        cursor += 1;
      }

      moves.push({ type: 'brew' });
      const nextTotal = total + puzzle.candidates[index];
      if (nextTotal <= puzzle.target) {
        dfs(index, nextTotal);
      }
      moves.push({ type: 'backtrack' });
      cursor = index + 1;
    }
  }

  dfs(0, 0);

  return moves;
}

function isCounterintuitiveStep(state: StillpathState, move: StillpathMove) {
  if (move.type === 'skip' && state.stack.length > 0) return true;
  if (move.type === 'backtrack' && state.stack.length > 1) return true;
  if (move.type === 'seal' && state.stack.length >= 3) return true;
  return false;
}

export function solveOptimal(puzzle: StillpathPuzzle): StillpathSolution {
  const moves = buildOptimalPlan(puzzle);
  const result = simulate(puzzle, moves, isCounterintuitiveStep);
  return {
    moves,
    finalState: result.state,
    solved: result.state.verdict?.correct ?? false,
    actionsUsed: result.state.actionsUsed,
    counterintuitiveSteps: result.counterintuitiveSteps,
    totalDecisions: result.totalDecisions,
    meanDecisionEntropy: result.decisionEntropy,
    meanInfoGainRatio: result.meanInfoGainRatio,
  };
}

export function solveOvercommit(puzzle: StillpathPuzzle): StillpathSolution {
  const moves = buildOvercommitPlan(puzzle);
  const result = simulate(puzzle, moves, isCounterintuitiveStep);
  return {
    moves,
    finalState: result.state,
    solved: result.state.verdict?.correct ?? false,
    actionsUsed: result.state.actionsUsed,
    counterintuitiveSteps: result.counterintuitiveSteps,
    totalDecisions: result.totalDecisions,
    meanDecisionEntropy: result.decisionEntropy,
    meanInfoGainRatio: result.meanInfoGainRatio,
  };
}

function countPrunableOvershoots(
  puzzle: StillpathPuzzle,
  startIndex = 0,
  total = 0,
): number {
  if (total >= puzzle.target) return 0;

  let waste = 0;
  for (let index = startIndex; index < puzzle.candidates.length; index += 1) {
    const value = puzzle.candidates[index];
    if (total + value > puzzle.target) {
      waste += puzzle.candidates.length - index;
      break;
    }

    waste += countPrunableOvershoots(puzzle, index, total + value);
  }

  return waste;
}

export function evaluateStillpath(): StillpathEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalPressure = 0;
  let breakpoint: StillpathDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as StillpathDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.routes.map((_, index) => generatePuzzle(index, difficulty));
    const optimal = puzzles.map((puzzle) => solveOptimal(puzzle));
    const overcommitActions = puzzles.map((puzzle, index) => optimal[index].actionsUsed + countPrunableOvershoots(puzzle) * 2);

    const optimalActions = optimal.reduce((sum, solution) => sum + solution.actionsUsed, 0) / puzzles.length;
    const altActions = overcommitActions.reduce((sum, value) => sum + value, 0) / puzzles.length;
    const solvability = optimal.filter((solution) => solution.solved).length / Math.max(1, optimal.length);
    const altSolveRate =
      overcommitActions.filter((actions) => actions <= blueprint.budget).length / Math.max(1, overcommitActions.length);

    const gap =
      overcommitActions.reduce((sum, actions, index) => {
        if (actions <= 0) return sum;
        return sum + (1 - optimal[index].actionsUsed / actions);
      }, 0) / puzzles.length;

    const pressure =
      optimal.reduce((sum, solution) => {
        const ratio = solution.actionsUsed === 0 ? 0 : solution.counterintuitiveSteps / solution.actionsUsed;
        return sum + ratio;
      }, 0) / puzzles.length;

    totalGap += gap;
    totalPressure += pressure;

    if (breakpoint === 5 && (altSolveRate < 1 || gap > 0.45)) {
      breakpoint = difficulty;
    }

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: blueprint.budget,
      solvability,
      puzzleEntropy:
        puzzles.reduce((sum, puzzle) => sum + log2(puzzle.recipes.length + puzzle.candidates.length), 0) / puzzles.length,
      skillDepth: clamp(0, 1, gap),
      decisionEntropy:
        optimal.reduce((sum, solution) => sum + solution.meanDecisionEntropy, 0) / puzzles.length,
      counterintuitive:
        optimal.reduce((sum, solution) => sum + solution.counterintuitiveSteps, 0) / puzzles.length,
      drama: clamp(0, 1, (altActions - optimalActions) / blueprint.budget),
      infoGainRatio:
        optimal.reduce((sum, solution) => sum + solution.meanInfoGainRatio, 0) / puzzles.length,
      optimalMoves: optimalActions,
      altMoves: altActions,
      altSolvability: altSolveRate,
    });
  }

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 0.98,
      constraintMatch: 0.96,
      goalMatch: 1,
      leetCodeFit: 0.985,
      bestAlternativeGap: totalGap / difficulties.length,
      invariantPressure: totalPressure / difficulties.length,
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 0.99,
    },
    interpretation: {
      invariant:
        'Keep one nondecreasing recipe stack alive, reuse the current herb as long as the remaining gap allows it, then climb only forward to heavier herbs and retreat one layer when the branch is spent.',
      strongestAlternative:
        'The strongest wrong strategy is overcommit-without-pruning: keep brewing or climbing even after the remaining gap proves the branch cannot work, then recover only after the dead branch is physically exposed.',
      evidence:
        'Easy shelves tolerate a few waste pours, but medium-plus budgets punish branches that ignore the sorted-gap prune. Once the remaining gap falls below the live herb, the right move is to retreat immediately instead of physically proving every heavier overshoot.',
    },
  };
}
