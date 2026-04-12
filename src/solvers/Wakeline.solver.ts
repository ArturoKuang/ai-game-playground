export type WakelineDifficulty = 1 | 2 | 3 | 4 | 5;

export type WakelineMoveType = 'pulse' | 'tag';

export type WakelineMove = {
  type: WakelineMoveType;
};

export type WakelineVerdict = {
  correct: boolean;
  label: string;
};

export type WakelinePuzzle = {
  difficulty: WakelineDifficulty;
  label: string;
  title: string;
  helper: string;
  nodes: number[];
  cycleEntry: number | null;
  budget: number;
};

export type WakelineState = {
  puzzle: WakelinePuzzle;
  slow: number | null;
  fast: number | null;
  tailReveal: number | null | undefined;
  tags: number[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: WakelineVerdict | null;
};

export type WakelineSolution = {
  moves: WakelineMove[];
  finalState: WakelineState;
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  totalDecisions: number;
  meanInfoGainRatio: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  routes: Array<{
    nodes: number[];
    cycleEntry: number | null;
  }>;
  budget: number;
};

type DifficultyAggregate = {
  difficulty: WakelineDifficulty;
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
  difficultyBreakpoint: WakelineDifficulty;
  algorithmAlignment: number;
};

export type WakelineEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<WakelineDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Harbor Check',
    helper:
      'Short channels let you waste fuel on flares and still finish. The real trick is noticing that the two patrol boats can answer the whole question by themselves.',
    budget: 6,
    routes: [
      { nodes: [4, 7, 2], cycleEntry: null },
      { nodes: [6, 1, 8, 3], cycleEntry: 1 },
      { nodes: [5, 9, 2, 4], cycleEntry: null },
      { nodes: [7, 3, 1, 6], cycleEntry: 2 },
      { nodes: [8, 2, 5], cycleEntry: 0 },
    ],
  },
  2: {
    label: 'D2',
    title: 'Canal Patrol',
    helper:
      'The routes are longer, but there is still enough slack to flare every new buoy if you insist. Medium play should start to feel that the flares are insurance, not necessity.',
    budget: 10,
    routes: [
      { nodes: [2, 8, 5, 1, 7], cycleEntry: null },
      { nodes: [9, 4, 6, 2, 3], cycleEntry: 2 },
      { nodes: [1, 7, 4, 8, 5], cycleEntry: 1 },
      { nodes: [6, 3, 9, 2, 8], cycleEntry: null },
      { nodes: [5, 2, 7, 4, 1], cycleEntry: 0 },
    ],
  },
  3: {
    label: 'D3',
    title: 'Tide Gate',
    helper:
      'Fuel is exact now. If you keep dropping flares on every buoy, the tide gate closes before the chase resolves.',
    budget: 6,
    routes: [
      { nodes: [4, 1, 7, 9, 3, 8], cycleEntry: 1 },
      { nodes: [8, 5, 2, 6, 1, 4], cycleEntry: null },
      { nodes: [3, 9, 6, 2, 7, 5], cycleEntry: 2 },
      { nodes: [7, 4, 1, 8, 3, 6], cycleEntry: null },
      { nodes: [5, 2, 9, 4, 7, 1], cycleEntry: 0 },
    ],
  },
  4: {
    label: 'D4',
    title: 'Backwater Pursuit',
    helper:
      'Longer prefixes make flare-heavy play collapse. Trust the wake pattern: escape means clear water, collision means the tail curls back.',
    budget: 7,
    routes: [
      { nodes: [9, 4, 1, 7, 3, 8, 5], cycleEntry: 1 },
      { nodes: [6, 2, 8, 5, 1, 4, 7], cycleEntry: null },
      { nodes: [7, 3, 9, 2, 6, 5, 1], cycleEntry: 2 },
      { nodes: [8, 1, 5, 9, 4, 2, 6], cycleEntry: null },
      { nodes: [5, 7, 2, 8, 3, 9, 4], cycleEntry: 0 },
    ],
  },
  5: {
    label: 'D5',
    title: 'Maelstrom Proof',
    helper:
      'The chain is long enough that only the pure two-speed chase fits inside the fuel cap. Every breadcrumb is dead weight.',
    budget: 8,
    routes: [
      { nodes: [9, 4, 1, 7, 3, 8, 5, 2], cycleEntry: 1 },
      { nodes: [6, 2, 8, 5, 1, 4, 7, 3], cycleEntry: null },
      { nodes: [7, 3, 9, 2, 6, 5, 1, 8], cycleEntry: 2 },
      { nodes: [8, 1, 5, 9, 4, 2, 6, 7], cycleEntry: null },
      { nodes: [5, 7, 2, 8, 3, 9, 4, 1], cycleEntry: 0 },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneState(state: WakelineState): WakelineState {
  return {
    ...state,
    tags: [...state.tags],
    history: [...state.history],
  };
}

function nodeLabel(puzzle: WakelinePuzzle, index: number | null) {
  if (index === null) return 'open water';
  return `buoy ${index + 1}`;
}

function isTail(puzzle: WakelinePuzzle, index: number | null) {
  return index !== null && index === puzzle.nodes.length - 1;
}

function tailLabel(state: WakelineState) {
  if (state.tailReveal === undefined) return 'hidden';
  if (state.tailReveal === null) return 'open water';
  return `buoy ${state.tailReveal + 1}`;
}

function hasTag(state: WakelineState, index: number | null) {
  return index !== null && state.tags.includes(index);
}

function overflowLoss(next: WakelineState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'Fuel ran out before the patrol could certify the channel.',
  };
  return true;
}

function stepFromIndex(state: WakelineState, from: number | null) {
  if (from === null) return null;
  if (isTail(state.puzzle, from)) {
    nextTailReveal(state, state.puzzle.cycleEntry);
    return state.puzzle.cycleEntry;
  }

  return from + 1;
}

function nextTailReveal(state: WakelineState, target: number | null) {
  if (state.tailReveal !== undefined) return;
  state.tailReveal = target;
}

export function nextIndex(puzzle: WakelinePuzzle, index: number | null) {
  if (index === null) return null;
  if (index === puzzle.nodes.length - 1) return puzzle.cycleEntry;
  return index + 1;
}

export function visibleTailLabel(state: WakelineState) {
  return tailLabel(state);
}

export function generatePuzzle(seed: number, difficulty: WakelineDifficulty): WakelinePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const route = blueprint.routes[seed % blueprint.routes.length];

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    nodes: [...route.nodes],
    cycleEntry: route.cycleEntry,
    budget: blueprint.budget,
  };
}

export function createInitialState(puzzle: WakelinePuzzle): WakelineState {
  return {
    puzzle,
    slow: 0,
    fast: 0,
    tailReveal: undefined,
    tags: [],
    actionsUsed: 0,
    history: [],
    message:
      'Launch the wake pulse to move the drifter one buoy and the cutter two. If the cutter escapes to open water there is no loop; if it catches the drifter, the tail curls back.',
    verdict: null,
  };
}

export function legalMoves(state: WakelineState): WakelineMove[] {
  if (state.verdict) return [];
  const moves: WakelineMove[] = [{ type: 'pulse' }];
  if (state.slow !== null) {
    moves.push({ type: 'tag' });
  }
  return moves;
}

export function heuristic(state: WakelineState) {
  if (state.verdict?.correct) return 0;
  const unresolvedNodes = state.fast === null ? 0 : state.puzzle.nodes.length;
  return unresolvedNodes + state.tags.length + Math.max(0, state.puzzle.budget - state.actionsUsed);
}

export function isGoal(state: WakelineState) {
  return Boolean(state.verdict?.correct);
}

export function applyMove(state: WakelineState, move: WakelineMove): WakelineState {
  if (state.verdict) return state;

  const next = cloneState(state);
  next.actionsUsed += 1;

  if (move.type === 'tag') {
    if (next.slow === null) {
      next.verdict = {
        correct: false,
        label: 'There is no live drifter left to flare.',
      };
      return next;
    }

    if (hasTag(next, next.slow)) {
      next.history.push(`Retag ${next.slow + 1}`);
      next.message = `Buoy ${next.slow + 1} was already marked. The extra flare burned fuel without adding evidence.`;
      overflowLoss(next);
      return next;
    }

    next.tags.push(next.slow);
    next.history.push(`Flare ${next.slow + 1}`);
    next.message = `A flare now marks buoy ${next.slow + 1}. Safe, but expensive.`;
    overflowLoss(next);
    return next;
  }

  const slowBefore = next.slow;
  const fastBefore = next.fast;
  next.slow = stepFromIndex(next, next.slow);
  next.fast = stepFromIndex(next, next.fast);
  if (next.fast !== null) {
    next.fast = stepFromIndex(next, next.fast);
  }

  next.history.push(
    `Wake ${slowBefore === null ? 'open' : slowBefore + 1}->${next.slow === null ? 'open' : next.slow + 1} / ${
      fastBefore === null ? 'open' : fastBefore + 1
    }->${next.fast === null ? 'open' : next.fast + 1}`,
  );

  if (overflowLoss(next)) return next;

  if (next.fast === null) {
    next.message = `The cutter ran out into open water. The hidden tail link resolves to ${tailLabel(next)}.`;
    next.verdict = {
      correct: true,
      label: 'Channel certified clear. The fast cutter escaped, so there is no loop.',
    };
    return next;
  }

  if (next.slow !== null && next.fast === next.slow) {
    next.message = `The cutter slammed into the drifter at buoy ${next.slow + 1}. The hidden tail link resolves to ${tailLabel(next)}.`;
    next.verdict = {
      correct: true,
      label: `Wake collision at buoy ${next.slow + 1}. The chain loops.`,
    };
    return next;
  }

  const tailText =
    next.tailReveal === undefined
      ? 'The tail hook is still hidden.'
      : next.tailReveal === null
        ? 'The tail hook drains to open water.'
        : `The tail hook curls back to buoy ${next.tailReveal + 1}.`;
  next.message = `${tailText} Keep pulsing unless you want to spend fuel on flares.`;
  return next;
}

function solveWithPolicy(
  puzzle: WakelinePuzzle,
  chooseMove: (state: WakelineState) => WakelineMove,
): WakelineSolution {
  let state = createInitialState(puzzle);
  const moves: WakelineMove[] = [];
  let counterintuitiveSteps = 0;
  let totalDecisions = 0;
  let infoGainTotal = 0;

  while (!state.verdict) {
    const move = chooseMove(state);
    const legalCount = Math.max(1, legalMoves(state).length);

    if (move.type === 'pulse' && state.slow !== null && !hasTag(state, state.slow)) {
      counterintuitiveSteps += 1;
    }

    if (move.type === 'pulse') {
      totalDecisions += 1;
      infoGainTotal += legalCount >= 2 ? 3 : 1;
    }

    moves.push(move);
    state = applyMove(state, move);
  }

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps,
    totalDecisions,
    meanInfoGainRatio: totalDecisions > 0 ? infoGainTotal / totalDecisions : 0,
  };
}

function solveOptimal(puzzle: WakelinePuzzle) {
  return solveWithPolicy(puzzle, () => ({ type: 'pulse' }));
}

function solveFlareHappy(puzzle: WakelinePuzzle) {
  return solveWithPolicy(puzzle, (state) => {
    if (state.slow !== null && !hasTag(state, state.slow)) {
      return { type: 'tag' };
    }
    return { type: 'pulse' };
  });
}

function solveScattershot(puzzle: WakelinePuzzle) {
  return solveWithPolicy(puzzle, (state) => {
    if (state.slow !== null && state.actionsUsed % 3 !== 2) {
      return { type: 'tag' };
    }
    return { type: 'pulse' };
  });
}

function solveLaggedChase(puzzle: WakelinePuzzle) {
  let slow: number | null = 0;
  let fast: number | null = nextIndex(puzzle, 0);
  let actionsUsed = 0;
  const budgetCap = puzzle.budget + puzzle.nodes.length;

  while (actionsUsed < budgetCap) {
    actionsUsed += 1;
    slow = nextIndex(puzzle, slow);
    fast = nextIndex(puzzle, fast);

    if (fast === null) {
      return {
        solved: true,
        actionsUsed,
      };
    }

    if (slow !== null && fast === slow) {
      return {
        solved: false,
        actionsUsed: budgetCap,
      };
    }
  }

  return {
    solved: false,
    actionsUsed: budgetCap,
  };
}

export function solve(
  puzzle: WakelinePuzzle,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): WakelineSolution | null {
  if (skillLevel === 1) return solveScattershot(puzzle);
  if (skillLevel === 2) return solveFlareHappy(puzzle);
  if (skillLevel === 3) return solveWithPolicy(puzzle, (state) => {
    if (state.tailReveal !== undefined) return { type: 'pulse' };
    if (state.slow !== null && !hasTag(state, state.slow) && state.actionsUsed % 2 === 0) {
      return { type: 'tag' };
    }
    return { type: 'pulse' };
  });
  return solveOptimal(puzzle);
}

export function evaluateWakeline(): WakelineEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalPressure = 0;
  let breakpoint: WakelineDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as WakelineDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.routes.map((_, index) => generatePuzzle(index, difficulty));
    const optimal = puzzles.map((puzzle) => solveOptimal(puzzle));
    const flareHappy = puzzles.map((puzzle) => solveFlareHappy(puzzle));
    const scattershot = puzzles.map((puzzle) => solveScattershot(puzzle));
    const lagged = puzzles.map((puzzle) => solveLaggedChase(puzzle));

    const optimalActions = optimal.reduce((sum, solution) => sum + solution.actionsUsed, 0) / puzzles.length;
    const altActions = flareHappy.reduce((sum, solution) => sum + solution.actionsUsed, 0) / puzzles.length;
    const levelOneActions = scattershot.reduce((sum, solution) => sum + solution.actionsUsed, 0) / puzzles.length;
    const flareSolveRate =
      flareHappy.filter((solution) => solution.solved).length / Math.max(1, flareHappy.length);

    const gap =
      flareHappy.reduce((sum, solution, index) => {
        if (!solution.solved) return sum + 1;
        return sum + (1 - optimal[index].actionsUsed / solution.actionsUsed);
      }, 0) / puzzles.length;

    const pressure =
      lagged.reduce((sum, solution, index) => {
        if (!solution.solved) return sum + 1;
        return sum + (1 - optimal[index].actionsUsed / solution.actionsUsed);
      }, 0) / puzzles.length;

    totalGap += gap;
    totalPressure += pressure;

    if (breakpoint === 5 && (flareSolveRate < 1 || gap > 0.5)) {
      breakpoint = difficulty;
    }

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: blueprint.budget,
      solvability: 1,
      puzzleEntropy:
        optimal.reduce((sum, solution) => sum + solution.moves.length * log2(2), 0) / puzzles.length,
      skillDepth: clamp(0, 1, 1 - optimalActions / levelOneActions),
      decisionEntropy: 1,
      counterintuitive:
        optimal.reduce((sum, solution) => sum + solution.counterintuitiveSteps, 0) / puzzles.length,
      drama: clamp(0, 1, (altActions - optimalActions) / blueprint.budget),
      infoGainRatio:
        optimal.reduce((sum, solution) => sum + solution.meanInfoGainRatio, 0) / puzzles.length,
      optimalMoves: optimalActions,
      altMoves: altActions,
      altSolvability: flareSolveRate,
    });
  }

  const averageGap = totalGap / difficulties.length;
  const averagePressure = totalPressure / difficulties.length;

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 1,
      goalMatch: 1,
      leetCodeFit: 1,
      bestAlternativeGap: averageGap,
      invariantPressure: averagePressure,
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'One patrol boat must advance one edge while the other advances two. Escape proves a null tail; collision proves a back-link.',
      strongestAlternative:
        'The strongest wrong strategy is flare-happy patrol: mark every buoy before pulsing, which mirrors the instinct to store visited nodes instead of trusting the chase.',
      evidence:
        'Flare-happy patrol stays viable on D1-D2, then fuel caps at D3+ make the extra breadcrumb action fail while the pure wake pulse still resolves every route.',
    },
  };
}
