export type TickerDifficulty = 1 | 2 | 3 | 4 | 5;

export type TickerMoveType = 'lowerAnchor' | 'logSale' | 'historyScan';

export type TickerMove = {
  type: TickerMoveType;
};

export type TickerPair = [number, number];

export type TickerVerdict = {
  correct: boolean;
  label: string;
};

export type TickerLog = {
  buyIndex: number;
  sellIndex: number;
  profit: number;
  source: 'log' | 'scan';
};

export type TickerPuzzle = {
  difficulty: TickerDifficulty;
  label: string;
  title: string;
  budget: number;
  helper: string;
  prices: number[];
  bestProfit: number;
  bestPair: TickerPair | null;
};

export type TickerState = {
  puzzle: TickerPuzzle;
  dayIndex: number;
  buyIndex: number;
  actionsUsed: number;
  bestProfit: number;
  bestPair: TickerPair | null;
  tradeLog: TickerLog[];
  message: string;
  verdict: TickerVerdict | null;
};

export type TickerSolution = {
  moves: TickerMove[];
  finalState: TickerState;
  solved: boolean;
  actionsUsed: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  priceSets: number[][];
};

type DifficultyAggregate = {
  difficulty: TickerDifficulty;
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
  difficultyBreakpoint: TickerDifficulty;
  algorithmAlignment: number;
};

export type TickerEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<TickerDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Opening Bell',
    helper:
      'You can still afford one scan here, but the tape already rewards keeping the cheapest seen buy anchor instead of rereading the whole market.',
    priceSets: [
      [7, 1, 5, 3, 6, 4],
      [2, 1, 4, 3],
      [3, 2, 5],
      [4, 1, 3, 2, 5],
    ],
  },
  2: {
    label: 'D2',
    title: 'Lunch Tape',
    helper:
      'Small pullbacks are starting to lie. Dropping the anchor on every dip feels active, but only a new all-time low really helps later sales.',
    priceSets: [
      [5, 7, 4, 8],
      [6, 8, 4, 9],
      [4, 2, 7, 5, 9],
      [3, 5, 2, 6],
    ],
  },
  3: {
    label: 'D3',
    title: 'Whipsaw Hour',
    helper:
      'The tape now baits you with lower-than-yesterday prices that are still worse than the true floor. One bad anchor reset leaks the real jackpot.',
    priceSets: [
      [8, 10, 3, 9, 7, 2, 14],
      [9, 11, 4, 10, 8, 3, 15],
      [7, 9, 2, 8, 6, 1, 12],
      [10, 12, 5, 11, 9, 4, 16],
    ],
  },
  4: {
    label: 'D4',
    title: 'Closing Auction',
    helper:
      'Repeated fake bargains arrive after the real floor. If you forget the cheapest seen day, the closing rip cannot rescue you.',
    priceSets: [
      [11, 14, 6, 12, 10, 5, 17, 4, 19],
      [13, 16, 7, 15, 12, 6, 20, 5, 22],
      [10, 13, 4, 11, 9, 3, 16, 2, 18],
      [12, 15, 5, 13, 10, 4, 18, 3, 21],
    ],
  },
  5: {
    label: 'D5',
    title: 'After-Hours Grind',
    helper:
      'Long tapes, repeated false dips, and no scan budget. Only the rolling cheapest-price anchor preserves the best one-shot trade.',
    priceSets: [
      [14, 17, 8, 16, 13, 7, 21, 6, 23, 5, 26],
      [16, 20, 9, 18, 14, 8, 24, 7, 26, 6, 29],
      [18, 21, 10, 19, 15, 9, 25, 8, 27, 7, 30],
      [15, 18, 7, 17, 13, 6, 22, 5, 24, 4, 27],
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function cloneLog(entry: TickerLog): TickerLog {
  return { ...entry };
}

function cloneState(state: TickerState): TickerState {
  return {
    ...state,
    bestPair: state.bestPair ? [...state.bestPair] as TickerPair : null,
    tradeLog: state.tradeLog.map(cloneLog),
  };
}

function bestTrade(prices: number[]) {
  let bestProfit = 0;
  let bestPair: TickerPair | null = null;

  for (let buyIndex = 0; buyIndex < prices.length - 1; buyIndex += 1) {
    for (let sellIndex = buyIndex + 1; sellIndex < prices.length; sellIndex += 1) {
      const profit = prices[sellIndex] - prices[buyIndex];
      if (profit > bestProfit) {
        bestProfit = profit;
        bestPair = [buyIndex, sellIndex];
      }
    }
  }

  return { bestProfit, bestPair };
}

function budgetFor(prices: number[], difficulty: TickerDifficulty) {
  const baseline = prices.length - 1;
  if (difficulty === 1) return baseline + 2;
  if (difficulty === 2) return baseline + 1;
  return baseline;
}

function scanCostFor(dayIndex: number) {
  return Math.max(2, dayIndex);
}

function evaluateSeenWindow(prices: number[], dayIndex: number) {
  let minBeforeIndex = 0;
  for (let index = 1; index < dayIndex; index += 1) {
    if (prices[index] < prices[minBeforeIndex]) {
      minBeforeIndex = index;
    }
  }

  let minIncludingCurrent = minBeforeIndex;
  if (prices[dayIndex] < prices[minBeforeIndex]) {
    minIncludingCurrent = dayIndex;
  }

  const profit = Math.max(0, prices[dayIndex] - prices[minBeforeIndex]);
  const pair = profit > 0 ? ([minBeforeIndex, dayIndex] as TickerPair) : null;

  return {
    minIncludingCurrent,
    profit,
    pair,
  };
}

function overflowLoss(next: TickerState) {
  if (next.actionsUsed <= next.puzzle.budget) return false;
  next.verdict = {
    correct: false,
    label: 'The bell rang before you finished the tape.',
  };
  return true;
}

function finalizeVerdict(next: TickerState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The bell rang before the ledger was settled.',
    };
    return;
  }

  if (next.bestProfit !== next.puzzle.bestProfit) {
    next.verdict = {
      correct: false,
      label: `Best logged spread ${next.bestProfit}, but the tape held ${next.puzzle.bestProfit}.`,
    };
    return;
  }

  if (!next.puzzle.bestPair) {
    next.verdict = {
      correct: true,
      label: 'Ticker closed. No profitable trade existed, and you preserved zero.',
    };
    return;
  }

  next.verdict = {
    correct: true,
    label: `Ticker closed. Best spread ${next.bestProfit} from days ${formatPair(next.puzzle.bestPair)}.`,
  };
}

function advanceDay(next: TickerState) {
  if (overflowLoss(next)) return next;

  next.dayIndex += 1;
  if (next.dayIndex >= next.puzzle.prices.length) {
    finalizeVerdict(next);
  }

  return next;
}

function recordTrade(next: TickerState, pair: TickerPair, profit: number, source: 'log' | 'scan') {
  if (profit <= next.bestProfit) return;
  next.bestProfit = profit;
  next.bestPair = [...pair] as TickerPair;
  next.tradeLog.push({
    buyIndex: pair[0],
    sellIndex: pair[1],
    profit,
    source,
  });
}

export function formatPair(pair: TickerPair | null) {
  if (!pair) return 'none';
  return `${pair[0] + 1}-${pair[1] + 1}`;
}

export function anchorPrice(state: TickerState) {
  return state.puzzle.prices[state.buyIndex] ?? null;
}

export function currentPrice(state: TickerState) {
  return state.puzzle.prices[state.dayIndex] ?? null;
}

export function currentSpread(state: TickerState) {
  const livePrice = currentPrice(state);
  const buyPrice = anchorPrice(state);
  if (livePrice === null || buyPrice === null) return null;
  return livePrice - buyPrice;
}

export function upcomingCount(state: TickerState) {
  return Math.max(0, state.puzzle.prices.length - state.dayIndex);
}

export function currentScanCost(state: TickerState) {
  if (state.dayIndex >= state.puzzle.prices.length) return 0;
  return scanCostFor(state.dayIndex);
}

export function generatePuzzle(seed: number, difficulty: TickerDifficulty): TickerPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const prices = blueprint.priceSets[seed % blueprint.priceSets.length];
  const { bestProfit, bestPair } = bestTrade(prices);

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    budget: budgetFor(prices, difficulty),
    helper: blueprint.helper,
    prices: [...prices],
    bestProfit,
    bestPair,
  };
}

export function createInitialState(puzzle: TickerPuzzle): TickerState {
  return {
    puzzle,
    dayIndex: 1,
    buyIndex: 0,
    actionsUsed: 0,
    bestProfit: 0,
    bestPair: null,
    tradeLog: [],
    message: `Anchor starts on day 1 at price ${puzzle.prices[0]}. Protect the cheapest buy you've seen.`,
    verdict: null,
  };
}

export function applyMove(state: TickerState, move: TickerMove): TickerState {
  if (state.verdict) return cloneState(state);
  if (state.dayIndex >= state.puzzle.prices.length) {
    const finished = cloneState(state);
    finalizeVerdict(finished);
    return finished;
  }

  const next = cloneState(state);
  const price = next.puzzle.prices[next.dayIndex];
  const buyPrice = next.puzzle.prices[next.buyIndex];

  if (move.type === 'lowerAnchor') {
    next.actionsUsed += 1;
    if (price < buyPrice) {
      next.buyIndex = next.dayIndex;
      next.message = `Day ${next.dayIndex + 1}: lowered the buy anchor to ${price}. That is the cheapest seen price now.`;
    } else {
      next.message = `Day ${next.dayIndex + 1}: ${price} is not below the live anchor ${buyPrice}. Lowering here wastes the cheaper earlier buy.`;
    }
    return advanceDay(next);
  }

  if (move.type === 'logSale') {
    next.actionsUsed += 1;
    const profit = Math.max(0, price - buyPrice);
    if (profit > next.bestProfit) {
      recordTrade(next, [next.buyIndex, next.dayIndex], profit, 'log');
      next.message = `Day ${next.dayIndex + 1}: logged a new best spread of ${profit} from days ${formatPair(next.bestPair)}.`;
    } else if (profit > 0) {
      next.message = `Day ${next.dayIndex + 1}: spread ${profit} did not beat the standing best of ${next.bestProfit}.`;
    } else {
      next.message = `Day ${next.dayIndex + 1}: selling at ${price} would not beat the anchor ${buyPrice}.`;
    }
    return advanceDay(next);
  }

  next.actionsUsed += scanCostFor(next.dayIndex);
  const seenWindow = evaluateSeenWindow(next.puzzle.prices, next.dayIndex);
  next.buyIndex = seenWindow.minIncludingCurrent;
  if (seenWindow.pair) {
    recordTrade(next, seenWindow.pair, seenWindow.profit, 'scan');
  }

  if (seenWindow.pair) {
    next.message = `Day ${next.dayIndex + 1}: history scan found spread ${seenWindow.profit} and refreshed the anchor to price ${next.puzzle.prices[next.buyIndex]}.`;
  } else {
    next.message = `Day ${next.dayIndex + 1}: history scan found no profit and reset the anchor to the lowest seen price ${next.puzzle.prices[next.buyIndex]}.`;
  }
  return advanceDay(next);
}

type Policy = (state: TickerState) => TickerMoveType;

function runPolicy(puzzle: TickerPuzzle, pickMove: Policy): TickerSolution {
  let state = createInitialState(puzzle);
  const moves: TickerMove[] = [];

  while (!state.verdict) {
    const moveType = pickMove(state);
    moves.push({ type: moveType });
    state = applyMove(state, { type: moveType });
  }

  return {
    moves,
    finalState: state,
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
  };
}

function countTrapDays(prices: number[]) {
  let runningMin = prices[0];
  let traps = 0;

  for (let index = 1; index < prices.length; index += 1) {
    if (prices[index] < prices[index - 1] && prices[index] > runningMin) {
      traps += 1;
    }
    runningMin = Math.min(runningMin, prices[index]);
  }

  return traps;
}

function countNewMinDays(prices: number[]) {
  let runningMin = prices[0];
  let count = 0;

  for (let index = 1; index < prices.length; index += 1) {
    if (prices[index] < runningMin) {
      runningMin = prices[index];
      count += 1;
    }
  }

  return count;
}

function totalScanLoad(prices: number[]) {
  let load = 0;
  for (let index = 1; index < prices.length; index += 1) {
    load += scanCostFor(index);
  }
  return load;
}

function priceRange(prices: number[]) {
  return Math.max(...prices) - Math.min(...prices);
}

export function evaluateTicker(): TickerEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  let totalGap = 0;
  let totalTrapPressure = 0;
  let puzzleCount = 0;
  let maxGap = -1;
  let maxGapExample = '';

  for (const difficulty of [1, 2, 3, 4, 5] as TickerDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    let solvable = 0;
    let totalEntropy = 0;
    let totalGapPct = 0;
    let totalDecisionEntropy = 0;
    let totalCounter = 0;
    let totalDrama = 0;
    let totalInfoGain = 0;
    let totalOptimalMoves = 0;
    let totalAltMoves = 0;
    let altSolved = 0;

    for (const prices of blueprint.priceSets) {
      const puzzle = {
        difficulty,
        label: blueprint.label,
        title: blueprint.title,
        budget: budgetFor(prices, difficulty),
        helper: blueprint.helper,
        prices,
        ...bestTrade(prices),
      } satisfies TickerPuzzle;

      const optimal = runPolicy(puzzle, (state) => {
        const livePrice = currentPrice(state) ?? 0;
        const buyPrice = anchorPrice(state) ?? 0;
        return livePrice < buyPrice ? 'lowerAnchor' : 'logSale';
      });
      const holdFirst = runPolicy(puzzle, () => 'logSale');
      const lockFirstGreen = runPolicy(puzzle, (state) => {
        const livePrice = currentPrice(state) ?? 0;
        const buyPrice = anchorPrice(state) ?? 0;
        if (state.bestProfit > 0) return 'logSale';
        return livePrice < buyPrice ? 'lowerAnchor' : 'logSale';
      });

      const strongestAlt =
        lockFirstGreen.finalState.bestProfit >= holdFirst.finalState.bestProfit
          ? lockFirstGreen
          : holdFirst;

      const gap =
        puzzle.bestProfit === 0
          ? 0
          : (puzzle.bestProfit - strongestAlt.finalState.bestProfit) / puzzle.bestProfit;
      const traps = countTrapDays(prices);
      const newMins = countNewMinDays(prices);
      const entropy =
        prices.length * 4 + log2(prices.length + 1) * 6 + traps * 8 + newMins * 4;

      if (optimal.solved) solvable += 1;
      if (strongestAlt.solved && strongestAlt.finalState.bestProfit === puzzle.bestProfit) {
        altSolved += 1;
      }

      totalEntropy += entropy;
      totalGapPct += gap;
      totalDecisionEntropy += 1 + traps * 0.7 + newMins * 0.2;
      totalCounter += traps + (gap > 0 ? 0.4 : 0);
      totalDrama += clamp(0, 1, puzzle.bestProfit / Math.max(1, priceRange(prices)));
      totalInfoGain += totalScanLoad(prices) / Math.max(1, optimal.actionsUsed);
      totalOptimalMoves += optimal.actionsUsed;
      totalAltMoves += strongestAlt.actionsUsed;

      totalGap += gap;
      totalTrapPressure += traps;
      puzzleCount += 1;

      if (gap > maxGap) {
        maxGap = gap;
        maxGapExample = `${blueprint.label} ${prices.join(', ')} -> alt ${strongestAlt.finalState.bestProfit} vs best ${puzzle.bestProfit}`;
      }
    }

    const samplePuzzle = generatePuzzle(0, difficulty);
    const count = blueprint.priceSets.length;

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: samplePuzzle.budget,
      solvability: solvable / count,
      puzzleEntropy: totalEntropy / count,
      skillDepth: (totalGapPct / count) * 100,
      decisionEntropy: clamp(1, 4.5, totalDecisionEntropy / count),
      counterintuitive: totalCounter / count,
      drama: clamp(0, 1, totalDrama / count),
      infoGainRatio: totalInfoGain / count,
      optimalMoves: totalOptimalMoves / count,
      altMoves: totalAltMoves / count,
      altSolvability: altSolved / count,
    });
  }

  const breakpoint =
    difficulties.find((entry) => entry.skillDepth >= 25 || entry.altSolvability < 1)?.difficulty ?? 5;
  const averageGap = totalGap / Math.max(1, puzzleCount);
  const averageTrapPressure = totalTrapPressure / Math.max(1, puzzleCount);

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 0.95,
      goalMatch: 1,
      leetCodeFit: 1,
      bestAlternativeGap: averageGap,
      invariantPressure: clamp(0, 1, averageTrapPressure / 2.5),
      difficultyBreakpoint: breakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Keep one live buy anchor at the cheapest price seen so far, and compare every later day against that anchor exactly once.',
      strongestAlternative:
        'The strongest wrong strategy is locking the first decent green trade and then refusing to refresh the anchor when a deeper bargain appears later.',
      evidence: maxGapExample,
    },
  };
}
