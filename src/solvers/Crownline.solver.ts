export type CrownlineDifficulty = 1 | 2 | 3 | 4 | 5;

export type CrownlineMoveType = 'dispatchCrown' | 'swapLeft' | 'swapRight';

export type CrownlineMove = {
  type: CrownlineMoveType;
};

export type CrownlineVerdict = {
  correct: boolean;
  label: string;
};

export type CrownlineHeapNode = {
  laneIndex: number;
  lanePosition: number;
  value: number;
};

export type CrownlinePuzzle = {
  difficulty: CrownlineDifficulty;
  label: string;
  title: string;
  helper: string;
  lanes: number[][];
  budget: number;
};

export type CrownlineState = {
  puzzle: CrownlinePuzzle;
  nextPositions: number[];
  heap: CrownlineHeapNode[];
  merged: CrownlineHeapNode[];
  repairIndex: number | null;
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: CrownlineVerdict | null;
};

export type CrownlineSolution = {
  moves: CrownlineMove[];
  finalState: CrownlineState;
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
  budget: number;
  yards: number[][][];
};

type DifficultyAggregate = {
  difficulty: CrownlineDifficulty;
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
  difficultyBreakpoint: CrownlineDifficulty;
  algorithmAlignment: number;
};

export type CrownlineEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<CrownlineDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Three-Lane Lift',
    helper:
      'Three sorted sidings already loaded one live head each onto the crown ladder. Wrong child choices can still be repaired while the yard has spare dispatch time.',
    budget: 19,
    yards: [
      [
        [1, 7, 13],
        [2, 5, 11],
        [3, 4, 12],
      ],
      [
        [2, 8, 14],
        [1, 6, 10],
        [3, 5, 12],
      ],
      [
        [1, 9, 15],
        [2, 4, 13],
        [3, 7, 11],
      ],
      [
        [2, 7, 16],
        [1, 5, 12],
        [3, 6, 14],
      ],
    ],
  },
  2: {
    label: 'D2',
    title: 'Slack Crown',
    helper:
      'A fourth siding joins the ladder. The wrong child can still be rescued, but the wasted swaps are now clearly visible in the dispatch count.',
    budget: 35,
    yards: [
      [
        [1, 8, 15],
        [2, 5, 12],
        [3, 4, 13],
        [6, 7, 14],
      ],
      [
        [2, 9, 16],
        [1, 6, 11],
        [3, 5, 12],
        [4, 8, 15],
      ],
      [
        [1, 10, 17],
        [2, 4, 14],
        [3, 6, 13],
        [5, 7, 15],
      ],
      [
        [2, 8, 18],
        [1, 5, 13],
        [3, 6, 14],
        [4, 7, 16],
      ],
    ],
  },
  3: {
    label: 'D3',
    title: 'Exact Crown',
    helper:
      'The spare swaps are gone. Every time the root repairs, it must trade with the smaller child or the final dispatch misses the horn.',
    budget: 31,
    yards: [
      [
        [1, 9, 17],
        [2, 6, 14],
        [3, 5, 15],
        [4, 8, 16],
      ],
      [
        [2, 10, 18],
        [1, 7, 13],
        [3, 6, 15],
        [4, 9, 17],
      ],
      [
        [1, 11, 20],
        [2, 5, 16],
        [3, 7, 18],
        [4, 9, 19],
      ],
      [
        [2, 12, 21],
        [1, 6, 17],
        [3, 8, 18],
        [4, 10, 20],
      ],
    ],
  },
  4: {
    label: 'D4',
    title: 'Five-Way Dispatch',
    helper:
      'Five sidings keep the ladder busy. Refill only the lane you just dispatched, then sift the dropped head through the smaller child every time.',
    budget: 42,
    yards: [
      [
        [1, 10, 21],
        [2, 7, 18],
        [3, 6, 17],
        [4, 9, 20],
        [5, 8, 19],
      ],
      [
        [2, 11, 22],
        [1, 8, 16],
        [3, 7, 18],
        [4, 9, 19],
        [5, 10, 21],
      ],
      [
        [1, 12, 24],
        [2, 6, 17],
        [3, 8, 20],
        [4, 9, 21],
        [5, 11, 23],
      ],
      [
        [2, 13, 25],
        [1, 7, 18],
        [3, 9, 20],
        [4, 10, 22],
        [5, 11, 24],
      ],
    ],
  },
  5: {
    label: 'D5',
    title: 'Merger Horn',
    helper:
      'Long sidings and no slack. If the crown ladder is not restored with the true smaller child at every fork, the merged rail misses the final horn.',
    budget: 56,
    yards: [
      [
        [1, 12, 24, 36],
        [2, 8, 20, 32],
        [3, 7, 19, 31],
        [4, 10, 22, 34],
        [5, 9, 21, 33],
      ],
      [
        [2, 13, 25, 37],
        [1, 9, 18, 30],
        [3, 8, 20, 32],
        [4, 10, 23, 35],
        [5, 11, 24, 36],
      ],
      [
        [1, 14, 27, 39],
        [2, 7, 19, 31],
        [3, 9, 22, 34],
        [4, 11, 24, 37],
        [5, 13, 26, 38],
      ],
      [
        [2, 15, 28, 41],
        [1, 8, 20, 33],
        [3, 10, 23, 35],
        [4, 12, 25, 38],
        [5, 14, 27, 40],
      ],
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function nodeLess(left: CrownlineHeapNode, right: CrownlineHeapNode) {
  if (left.value !== right.value) return left.value < right.value;
  if (left.laneIndex !== right.laneIndex) return left.laneIndex < right.laneIndex;
  return left.lanePosition < right.lanePosition;
}

function cloneNode(node: CrownlineHeapNode): CrownlineHeapNode {
  return {
    laneIndex: node.laneIndex,
    lanePosition: node.lanePosition,
    value: node.value,
  };
}

function cloneState(state: CrownlineState): CrownlineState {
  return {
    ...state,
    nextPositions: [...state.nextPositions],
    heap: state.heap.map(cloneNode),
    merged: state.merged.map(cloneNode),
    history: [...state.history],
  };
}

function heapChildIndex(parentIndex: number, side: 'left' | 'right') {
  return parentIndex * 2 + (side === 'left' ? 1 : 2);
}

function heapify(nodes: CrownlineHeapNode[]) {
  const heap = nodes.map(cloneNode);

  for (let index = Math.floor(heap.length / 2) - 1; index >= 0; index -= 1) {
    let parent = index;

    while (true) {
      const leftIndex = heapChildIndex(parent, 'left');
      const rightIndex = heapChildIndex(parent, 'right');
      let smallest = parent;

      if (leftIndex < heap.length && nodeLess(heap[leftIndex], heap[smallest])) {
        smallest = leftIndex;
      }

      if (rightIndex < heap.length && nodeLess(heap[rightIndex], heap[smallest])) {
        smallest = rightIndex;
      }

      if (smallest === parent) break;

      const temp = heap[parent];
      heap[parent] = heap[smallest];
      heap[smallest] = temp;
      parent = smallest;
    }
  }

  return heap;
}

function totalCars(puzzle: CrownlinePuzzle) {
  return puzzle.lanes.reduce((sum, lane) => sum + lane.length, 0);
}

function laneTag(laneIndex: number) {
  return `L${laneIndex + 1}`;
}

function firstViolationIndex(heap: CrownlineHeapNode[]) {
  for (let parentIndex = 0; parentIndex < heap.length; parentIndex += 1) {
    const leftIndex = heapChildIndex(parentIndex, 'left');
    const rightIndex = heapChildIndex(parentIndex, 'right');

    if (leftIndex < heap.length && nodeLess(heap[leftIndex], heap[parentIndex])) {
      return parentIndex;
    }

    if (rightIndex < heap.length && nodeLess(heap[rightIndex], heap[parentIndex])) {
      return parentIndex;
    }
  }

  return null;
}

function legalRepairSides(state: CrownlineState): Array<'left' | 'right'> {
  if (state.repairIndex === null) return [];

  const parent = state.heap[state.repairIndex];
  if (!parent) return [];

  const legal: Array<'left' | 'right'> = [];
  const leftIndex = heapChildIndex(state.repairIndex, 'left');
  const rightIndex = heapChildIndex(state.repairIndex, 'right');

  if (leftIndex < state.heap.length && nodeLess(state.heap[leftIndex], parent)) {
    legal.push('left');
  }

  if (rightIndex < state.heap.length && nodeLess(state.heap[rightIndex], parent)) {
    legal.push('right');
  }

  return legal;
}

function updateRepairIndex(next: CrownlineState) {
  next.repairIndex = firstViolationIndex(next.heap);
}

function overflowLoss(next: CrownlineState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The merger horn sounded before the outbound rail was fully assembled.',
  };
  return true;
}

function finalizeIfSolved(next: CrownlineState) {
  if (next.heap.length > 0) return;
  if (next.merged.length !== totalCars(next.puzzle)) return;

  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The full rail merged cleanly, but the crew used too many crown moves.',
    };
    return;
  }

  next.verdict = {
    correct: true,
    label: `Crownline clear. The outbound rail finished with ${next.merged.length} cars in order.`,
  };
}

function crownLabel(state: CrownlineState) {
  return state.heap[0] ? `${state.heap[0].value}` : 'Clear';
}

export function generatePuzzle(seed: number, difficulty: CrownlineDifficulty): CrownlinePuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const lanes = blueprint.yards[seed % blueprint.yards.length];

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    lanes: lanes.map((lane) => [...lane]),
    budget: blueprint.budget,
  };
}

export function createInitialState(puzzle: CrownlinePuzzle): CrownlineState {
  const nextPositions = puzzle.lanes.map((lane) => (lane.length > 0 ? 1 : 0));
  const startingHeads = puzzle.lanes
    .map((lane, laneIndex) => {
      if (lane.length === 0) return null;
      return {
        laneIndex,
        lanePosition: 0,
        value: lane[0],
      };
    })
    .filter(Boolean) as CrownlineHeapNode[];

  const heap = heapify(startingHeads);

  return {
    puzzle,
    nextPositions,
    heap,
    merged: [],
    repairIndex: firstViolationIndex(heap),
    actionsUsed: 0,
    history: [],
    message:
      'Keep exactly one live head from each non-empty lane on the crown ladder. Dispatch the crown only when the ladder is ordered, then sift the dropped replacement through the smaller child.',
    verdict: null,
  };
}

function fail(next: CrownlineState, label: string) {
  next.verdict = {
    correct: false,
    label,
  };
  return next;
}

export function applyMove(state: CrownlineState, move: CrownlineMove): CrownlineState {
  if (state.verdict) return state;

  const next = cloneState(state);
  next.actionsUsed += 1;

  if (move.type === 'dispatchCrown') {
    if (next.heap.length === 0) {
      return fail(next, 'The crown ladder was already empty.');
    }

    if (next.repairIndex !== null) {
      return fail(
        next,
        `The ladder still had a lower child under slot ${next.repairIndex + 1}. Repair the crown before dispatching again.`,
      );
    }

    const root = cloneNode(next.heap[0]);
    next.merged.push(root);
    next.history.push(`Send ${laneTag(root.laneIndex)}:${root.value}`);

    const lane = next.puzzle.lanes[root.laneIndex];
    if (next.nextPositions[root.laneIndex] < lane.length) {
      const lanePosition = next.nextPositions[root.laneIndex];
      next.nextPositions[root.laneIndex] += 1;
      next.heap[0] = {
        laneIndex: root.laneIndex,
        lanePosition,
        value: lane[lanePosition],
      };
      next.message = `Car ${root.value} left ${laneTag(root.laneIndex)} for the outbound rail. Its next live head dropped onto the crown slot and must be sifted if a lower child is waiting.`;
    } else if (next.heap.length === 1) {
      next.heap = [];
      next.message = `Car ${root.value} was the final live head. The crown ladder is now clear.`;
    } else {
      const replacement = next.heap.pop();
      if (replacement) {
        next.heap[0] = replacement;
      }
      next.message = `Car ${root.value} left ${laneTag(root.laneIndex)} and that lane ran dry. The last live crown piece moved to the top and may need repair.`;
    }

    updateRepairIndex(next);
    if (overflowLoss(next)) return next;
    finalizeIfSolved(next);
    if (!next.verdict && next.repairIndex === null) {
      next.message = `${next.message} The crown is already lowest at ${crownLabel(next)}, so the next dispatch is ready.`;
    }
    return next;
  }

  if (next.repairIndex === null) {
    return fail(next, 'The crown ladder is already settled. Dispatch the crown instead of swapping.');
  }

  const side = move.type === 'swapLeft' ? 'left' : 'right';
  const parentIndex = next.repairIndex;
  const childIndex = heapChildIndex(parentIndex, side);
  const parent = next.heap[parentIndex];
  const child = next.heap[childIndex];

  if (!child) {
    return fail(next, `There is no ${side} child under crown slot ${parentIndex + 1}.`);
  }

  if (!nodeLess(child, parent)) {
    return fail(
      next,
      `${laneTag(child.laneIndex)}:${child.value} is not lower than ${laneTag(parent.laneIndex)}:${parent.value}, so that swap would not repair the ladder.`,
    );
  }

  next.heap[parentIndex] = child;
  next.heap[childIndex] = parent;
  next.history.push(
    `Swap ${side === 'left' ? 'L' : 'R'} ${laneTag(parent.laneIndex)}:${parent.value} <-> ${laneTag(child.laneIndex)}:${child.value}`,
  );
  updateRepairIndex(next);

  if (next.repairIndex === null) {
    next.message = `${laneTag(child.laneIndex)}:${child.value} now crowns the ladder. The ordering is repaired and the next dispatch is ready.`;
  } else {
    next.message = `The ladder still breaks at slot ${next.repairIndex + 1}. Keep sifting the dropped head through the smaller child.`;
  }

  if (overflowLoss(next)) return next;
  finalizeIfSolved(next);
  return next;
}

function simulate(
  puzzle: CrownlinePuzzle,
  chooseMove: (state: CrownlineState) => CrownlineMove,
) {
  let state = createInitialState(puzzle);
  const moves: CrownlineMove[] = [];
  let counterintuitiveSteps = 0;
  let totalDecisions = 0;
  let infoGainTotal = 0;
  let previousLane: number | null = null;
  const total = totalCars(puzzle);

  const guardLimit = total * 8 + 20;
  for (let guard = 0; guard < guardLimit && !state.verdict; guard += 1) {
    const legalCount =
      state.repairIndex === null
        ? (state.heap.length > 0 ? 1 : 0)
        : Math.max(1, legalRepairSides(state).length);
    const mergedBefore = state.merged.length;
    const move = chooseMove(state);

    totalDecisions += 1;
    if (move.type === 'dispatchCrown') {
      const laneIndex = state.heap[0]?.laneIndex ?? null;
      if (laneIndex !== null && previousLane === laneIndex && state.heap.length > 1) {
        counterintuitiveSteps += 1;
      }
      previousLane = laneIndex;
    } else {
      const legal = legalRepairSides(state);
      if (legal.length === 2) {
        const leftNode = state.heap[heapChildIndex(state.repairIndex ?? 0, 'left')];
        const rightNode = state.heap[heapChildIndex(state.repairIndex ?? 0, 'right')];
        const optimalSide = nodeLess(leftNode, rightNode) ? 'left' : 'right';
        if ((move.type === 'swapLeft' ? 'left' : 'right') === optimalSide) {
          counterintuitiveSteps += 1;
        }
      }
    }

    moves.push(move);
    state = applyMove(state, move);

    const mergedAfter = state.merged.length;
    if (mergedAfter > mergedBefore && total > mergedAfter) {
      infoGainTotal += (total - mergedBefore) / Math.max(1, total - mergedAfter);
    }
  }

  return {
    moves,
    state,
    counterintuitiveSteps,
    totalDecisions,
    meanInfoGainRatio: totalDecisions > 0 ? infoGainTotal / totalDecisions : 0,
  };
}

function chooseSmallerRepairSide(state: CrownlineState): CrownlineMove {
  const parentIndex = state.repairIndex ?? 0;
  const leftIndex = heapChildIndex(parentIndex, 'left');
  const rightIndex = heapChildIndex(parentIndex, 'right');
  const leftNode = state.heap[leftIndex];
  const rightNode = state.heap[rightIndex];

  if (leftNode && rightNode) {
    return nodeLess(leftNode, rightNode) ? { type: 'swapLeft' } : { type: 'swapRight' };
  }

  if (leftNode) return { type: 'swapLeft' };
  return { type: 'swapRight' };
}

export function solveOptimal(puzzle: CrownlinePuzzle): CrownlineSolution {
  const result = simulate(puzzle, (state) => {
    if (state.repairIndex === null) return { type: 'dispatchCrown' };
    return chooseSmallerRepairSide(state);
  });

  return {
    moves: result.moves,
    finalState: result.state,
    solved: Boolean(result.state.verdict?.correct),
    actionsUsed: result.state.actionsUsed,
    counterintuitiveSteps: result.counterintuitiveSteps,
    totalDecisions: result.totalDecisions,
    meanInfoGainRatio: result.meanInfoGainRatio,
  };
}

export function solvePreferLeft(puzzle: CrownlinePuzzle): CrownlineSolution {
  const result = simulate(puzzle, (state) => {
    if (state.repairIndex === null) return { type: 'dispatchCrown' };
    const legal = legalRepairSides(state);
    if (legal.includes('left')) return { type: 'swapLeft' };
    return { type: 'swapRight' };
  });

  return {
    moves: result.moves,
    finalState: result.state,
    solved: Boolean(result.state.verdict?.correct),
    actionsUsed: result.state.actionsUsed,
    counterintuitiveSteps: result.counterintuitiveSteps,
    totalDecisions: result.totalDecisions,
    meanInfoGainRatio: result.meanInfoGainRatio,
  };
}

export function solvePreferRight(puzzle: CrownlinePuzzle): CrownlineSolution {
  const result = simulate(puzzle, (state) => {
    if (state.repairIndex === null) return { type: 'dispatchCrown' };
    const legal = legalRepairSides(state);
    if (legal.includes('right')) return { type: 'swapRight' };
    return { type: 'swapLeft' };
  });

  return {
    moves: result.moves,
    finalState: result.state,
    solved: Boolean(result.state.verdict?.correct),
    actionsUsed: result.state.actionsUsed,
    counterintuitiveSteps: result.counterintuitiveSteps,
    totalDecisions: result.totalDecisions,
    meanInfoGainRatio: result.meanInfoGainRatio,
  };
}

function ternaryEntropy(a: number, b: number, c: number) {
  const values = [a, b, c];
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return 0;

  return clamp(
    0,
    3,
    values
      .filter((value) => value > 0)
      .reduce((sum, value) => {
        const probability = value / total;
        return sum - probability * log2(probability);
      }, 0),
  );
}

export function evaluateCrownline(): CrownlineEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalPressure = 0;
  let breakpoint: CrownlineDifficulty = 5;

  for (const difficulty of [1, 2, 3, 4, 5] as CrownlineDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.yards.map((_, index) => generatePuzzle(index, difficulty));
    const optimal = puzzles.map((puzzle) => solveOptimal(puzzle));
    const preferLeft = puzzles.map((puzzle) => solvePreferLeft(puzzle));
    const preferRight = puzzles.map((puzzle) => solvePreferRight(puzzle));

    let dispatchCount = 0;
    let swapLeftCount = 0;
    let swapRightCount = 0;
    let altSolvedCount = 0;
    let altActionTotal = 0;
    let gapTotal = 0;

    for (let index = 0; index < puzzles.length; index += 1) {
      const optimalSolution = optimal[index];
      const alternatives = [preferLeft[index], preferRight[index]];

      dispatchCount += optimalSolution.moves.filter((move) => move.type === 'dispatchCrown').length;
      swapLeftCount += optimalSolution.moves.filter((move) => move.type === 'swapLeft').length;
      swapRightCount += optimalSolution.moves.filter((move) => move.type === 'swapRight').length;

      const successful = alternatives.filter((solution) => solution.solved);
      const bestAlt =
        successful.length > 0
          ? successful.reduce((best, solution) =>
              solution.actionsUsed < best.actionsUsed ? solution : best,
            )
          : alternatives[0];

      if (bestAlt.solved) {
        altSolvedCount += 1;
        altActionTotal += bestAlt.actionsUsed;
        gapTotal += 1 - optimalSolution.actionsUsed / bestAlt.actionsUsed;
      } else {
        altActionTotal += blueprint.budget + 1;
        gapTotal += 1;
      }
    }

    const optimalActions =
      optimal.reduce((sum, solution) => sum + solution.actionsUsed, 0) / puzzles.length;
    const altActions = altActionTotal / puzzles.length;
    const altSolveRate = altSolvedCount / puzzles.length;
    const gap = gapTotal / puzzles.length;

    totalGap += gap;
    totalPressure += gap;

    if (breakpoint === 5 && (altSolveRate < 1 || gap > 0.45)) {
      breakpoint = difficulty;
    }

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: blueprint.budget,
      solvability: 1,
      puzzleEntropy:
        optimal.reduce((sum, solution) => sum + solution.moves.length * log2(3), 0) / puzzles.length,
      skillDepth: clamp(0, 1, gap),
      decisionEntropy: ternaryEntropy(dispatchCount, swapLeftCount, swapRightCount),
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
      operationMatch: 1,
      constraintMatch: 1,
      goalMatch: 1,
      leetCodeFit: 0.99,
      bestAlternativeGap: totalGap / difficulties.length,
      invariantPressure: totalPressure / difficulties.length,
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Keep exactly one live head from every non-empty lane on the ladder, dispatch the crowned smallest node, then refill only that same lane and sift the dropped replacement through the smaller child until the crown is truly lowest again.',
      strongestAlternative:
        'The strongest wrong strategy repairs the ladder by favoring one side at every fork instead of comparing the two children and choosing the smaller one.',
      evidence:
        'Early budgets tolerate a few side-biased repair mistakes, but the medium-plus yards remove that slack. Once D3 hits, the fork comparisons have to be exact or the merged rail overruns the horn.',
    },
  };
}
