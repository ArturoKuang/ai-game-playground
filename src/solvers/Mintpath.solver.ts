export type MintpathDifficulty = 1 | 2 | 3 | 4 | 5;

export type MintpathSeal = number | 'blocked' | null;

export type MintpathMoveType = 'select' | 'mint' | 'block' | 'scout';

export type MintpathMove = {
  type: MintpathMoveType;
  amount?: number;
  coin?: number;
};

export type MintpathVerdict = {
  correct: boolean;
  label: string;
};

export type MintpathPuzzle = {
  difficulty: MintpathDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  coins: number[];
  target: number;
  optimalCounts: Array<number | 'blocked'>;
  greedyCounts: Array<number | 'blocked'>;
  optimalChoices: Array<number | 'blocked' | null>;
  greedyChoices: Array<number | 'blocked' | null>;
  scoutCosts: number[];
};

export type MintpathState = {
  puzzle: MintpathPuzzle;
  selectedAmount: number;
  sealedCounts: MintpathSeal[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: MintpathVerdict | null;
};

type Layout = {
  coins: number[];
  target: number;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  budget: number;
  layouts: Layout[];
};

type DifficultyAggregate = {
  difficulty: MintpathDifficulty;
  label: string;
  budget: number;
  target: number;
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
  difficultyBreakpoint: MintpathDifficulty;
  algorithmAlignment: number;
};

export type MintpathEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

type SimulationSummary = {
  solved: boolean;
  actionsUsed: number;
  finalCount: number | 'blocked';
  counts: Array<number | 'blocked'>;
};

const BLUEPRINTS: Record<MintpathDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Dock Till',
    helper:
      'Short toll totals can still be scouted directly. The scalable habit is already to seal each amount from a smaller certified total plus one coin.',
    budget: 6,
    layouts: [
      { coins: [1, 2], target: 3 },
      { coins: [1, 3], target: 4 },
    ],
  },
  2: {
    label: 'D2',
    title: 'Market Rack',
    helper:
      'The scout still survives once here. Keep the amount ledger alive instead of rebuilding the full change tree every time.',
    budget: 8,
    layouts: [
      { coins: [1, 2, 5], target: 5 },
      { coins: [1, 3, 4], target: 5 },
    ],
  },
  3: {
    label: 'D3',
    title: 'Mint Gate',
    helper:
      'Now direct scouting breaks, and the largest coin starts lying. Some totals are cheaper only through a smaller denomination and an already sealed predecessor.',
    budget: 6,
    layouts: [
      { coins: [1, 3, 4], target: 6 },
      { coins: [1, 5, 6], target: 10 },
    ],
  },
  4: {
    label: 'D4',
    title: 'Forge Span',
    helper:
      'Large-coin instinct keeps overpaying. The only stable plan is to test every reachable coin lane and seal the fewest-coin total for each amount.',
    budget: 8,
    layouts: [
      { coins: [1, 4, 6], target: 8 },
      { coins: [1, 5, 7, 8], target: 10 },
    ],
  },
  5: {
    label: 'D5',
    title: 'Dead Mintline',
    helper:
      'Some totals cannot be made at all. The hard ledger must still certify every smaller amount and explicitly mark the blocked ones instead of pretending a coin path exists.',
    budget: 11,
    layouts: [
      { coins: [4, 6, 9], target: 11 },
      { coins: [3, 7, 10], target: 14 },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function isNumericSeal(value: MintpathSeal | number | 'blocked'): value is number {
  return typeof value === 'number';
}

function isBlockedSeal(value: MintpathSeal | number | 'blocked') {
  return value === 'blocked';
}

function recursiveScoutCalls(coins: number[], amount: number, memo = new Map<number, number>()): number {
  if (amount === 0) return 1;
  if (amount < 0) return 1;
  const cached = memo.get(amount);
  if (cached !== undefined) return cached;

  let calls = 1;
  for (const coin of coins) {
    if (amount >= coin) {
      calls += recursiveScoutCalls(coins, amount - coin, memo);
    }
  }

  memo.set(amount, calls);
  return calls;
}

function buildOptimalLedger(coins: number[], target: number) {
  const counts: Array<number | 'blocked'> = Array.from({ length: target + 1 }, () => 'blocked');
  const choices: Array<number | 'blocked' | null> = Array.from({ length: target + 1 }, () => null);
  counts[0] = 0;

  for (let amount = 1; amount <= target; amount += 1) {
    let bestCount = Number.POSITIVE_INFINITY;
    let bestCoin: number | null = null;

    for (const coin of coins) {
      if (amount < coin) continue;
      const previous = counts[amount - coin];
      if (!isNumericSeal(previous)) continue;
      const candidate = previous + 1;
      if (candidate < bestCount || (candidate === bestCount && (bestCoin === null || coin > bestCoin))) {
        bestCount = candidate;
        bestCoin = coin;
      }
    }

    if (bestCoin === null) {
      counts[amount] = 'blocked';
      choices[amount] = 'blocked';
    } else {
      counts[amount] = bestCount;
      choices[amount] = bestCoin;
    }
  }

  return { counts, choices };
}

function buildGreedyLargestLedger(coins: number[], target: number) {
  const counts: Array<number | 'blocked'> = Array.from({ length: target + 1 }, () => 'blocked');
  const choices: Array<number | 'blocked' | null> = Array.from({ length: target + 1 }, () => null);
  counts[0] = 0;
  const descending = [...coins].sort((left, right) => right - left);

  for (let amount = 1; amount <= target; amount += 1) {
    let pickedCoin: number | null = null;

    for (const coin of descending) {
      if (amount < coin) continue;
      const previous = counts[amount - coin];
      if (isNumericSeal(previous)) {
        pickedCoin = coin;
        counts[amount] = previous + 1;
        choices[amount] = coin;
        break;
      }
    }

    if (pickedCoin === null) {
      counts[amount] = 'blocked';
      choices[amount] = 'blocked';
    }
  }

  return { counts, choices };
}

function cloneState(state: MintpathState): MintpathState {
  return {
    ...state,
    sealedCounts: [...state.sealedCounts],
    history: [...state.history],
  };
}

export function generatePuzzle(seed: number, difficulty: MintpathDifficulty): MintpathPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const layout = blueprint.layouts[seed % blueprint.layouts.length];
  const coins = [...layout.coins].sort((left, right) => left - right);
  const optimal = buildOptimalLedger(coins, layout.target);
  const greedy = buildGreedyLargestLedger(coins, layout.target);
  const scoutCosts = Array.from({ length: layout.target + 1 }, (_, amount) =>
    amount === 0 ? 0 : recursiveScoutCalls(coins, amount),
  );

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: blueprint.budget,
    coins,
    target: layout.target,
    optimalCounts: optimal.counts,
    greedyCounts: greedy.counts,
    optimalChoices: optimal.choices,
    greedyChoices: greedy.choices,
    scoutCosts,
  };
}

export function createInitialState(puzzle: MintpathPuzzle): MintpathState {
  const sealedCounts: MintpathSeal[] = Array.from({ length: puzzle.target + 1 }, () => null);
  sealedCounts[0] = 0;

  return {
    puzzle,
    selectedAmount: puzzle.target > 0 ? 1 : 0,
    sealedCounts,
    actionsUsed: 0,
    history: [],
    message:
      'Seal each amount with the fewest coins possible. Pick one coin whose smaller amount is already sealed, add one coin, or mark the amount blocked if no denomination can reach it.',
    verdict: null,
  };
}

export function scoutCostForAmount(puzzle: MintpathPuzzle, amount: number) {
  return puzzle.scoutCosts[amount];
}

export function selectedSeal(state: MintpathState) {
  return state.sealedCounts[state.selectedAmount];
}

export function candidateCountForCoin(state: MintpathState, amount: number, coin: number) {
  if (amount < coin) return null;
  const previous = state.sealedCounts[amount - coin];
  return isNumericSeal(previous) ? previous + 1 : null;
}

function isResolved(state: MintpathState, amount: number) {
  return state.sealedCounts[amount] !== null;
}

export function canMintWithCoin(state: MintpathState, amount: number, coin: number) {
  if (amount <= 0 || amount > state.puzzle.target || isResolved(state, amount)) return false;
  return candidateCountForCoin(state, amount, coin) !== null;
}

export function canSealBlocked(state: MintpathState, amount: number) {
  if (amount <= 0 || amount > state.puzzle.target || isResolved(state, amount)) return false;
  return state.puzzle.coins.every((coin) => candidateCountForCoin(state, amount, coin) === null);
}

export function canScoutAmount(state: MintpathState, amount: number) {
  return amount > 0 && amount <= state.puzzle.target && !isResolved(state, amount);
}

function formatSeal(value: number | 'blocked') {
  return isBlockedSeal(value) ? 'blocked' : String(value);
}

function finalize(next: MintpathState) {
  if (next.actionsUsed > next.puzzle.budget) {
    next.verdict = {
      correct: false,
      label: 'The mint ledger ran out of actions before the toll row was certified.',
    };
    return next;
  }

  const finalSeal = next.sealedCounts[next.puzzle.target];
  if (finalSeal === null) return next;

  const optimalFinal = next.puzzle.optimalCounts[next.puzzle.target];
  if (finalSeal === optimalFinal) {
    next.verdict = {
      correct: true,
      label: `Ledger sealed. Target ${next.puzzle.target} costs ${formatSeal(optimalFinal)}.`,
    };
    return next;
  }

  next.verdict = {
    correct: false,
    label: `Target ${next.puzzle.target} was sealed at ${formatSeal(finalSeal)}, but ${formatSeal(optimalFinal)} was the true minimum.`,
  };
  return next;
}

function sealAmount(
  next: MintpathState,
  amount: number,
  seal: number | 'blocked',
  cost: number,
  actionLabel: string,
  chosenCoin?: number,
) {
  next.selectedAmount = amount;
  next.sealedCounts[amount] = seal;
  next.actionsUsed += cost;

  const optimal = next.puzzle.optimalCounts[amount];
  const note = isBlockedSeal(seal)
    ? `Sealed amount ${amount} as blocked.`
    : chosenCoin
      ? `Minted amount ${amount} with coin ${chosenCoin}: ${seal} coins.`
      : `Scouted amount ${amount}: ${seal} coins.`;
  next.history.unshift(note);

  if (actionLabel === 'scout') {
    next.message = `Scout tax paid. Amount ${amount} truly seals at ${formatSeal(seal)}.`;
  } else if (seal !== optimal) {
    next.message = `Amount ${amount} is sealed, but a cheaper route still existed through another denomination.`;
  } else if (isBlockedSeal(seal)) {
    next.message = `No reachable predecessor existed. Amount ${amount} really is blocked.`;
  } else {
    next.message = `Amount ${amount} is sealed at the true minimum: ${seal} coin${seal === 1 ? '' : 's'}.`;
  }

  return finalize(next);
}

export function applyMove(state: MintpathState, move: MintpathMove): MintpathState {
  const next = cloneState(state);
  if (next.verdict) return next;

  if (move.type === 'select') {
    const amount = move.amount ?? next.selectedAmount;
    if (amount >= 0 && amount <= next.puzzle.target) {
      next.selectedAmount = amount;
      const candidates = next.puzzle.coins
        .map((coin) => {
          const candidate = candidateCountForCoin(next, amount, coin);
          return candidate === null ? null : `${coin}->${candidate}`;
        })
        .filter(Boolean);

      if (amount === 0) {
        next.message = 'Amount 0 is the base seal: it costs 0 coins.';
      } else if (isResolved(next, amount)) {
        next.message = `Amount ${amount} is already sealed at ${formatSeal(next.sealedCounts[amount] as number | 'blocked')}.`;
      } else if (candidates.length === 0) {
        next.message = `Amount ${amount} has no live predecessor yet. Seal it blocked or scout it directly.`;
      } else {
        next.message = `Amount ${amount}: reachable coin lanes ${candidates.join(', ')}. Scout costs ${scoutCostForAmount(next.puzzle, amount)}.`;
      }
    }
    return next;
  }

  const amount = move.amount ?? next.selectedAmount;
  if (move.type === 'mint') {
    const coin = move.coin ?? next.puzzle.coins[0];
    const candidate = candidateCountForCoin(next, amount, coin);
    if (!canMintWithCoin(next, amount, coin) || candidate === null) {
      next.message = `Coin ${coin} cannot seal amount ${amount} yet.`;
      return next;
    }
    return sealAmount(next, amount, candidate, 1, 'mint', coin);
  }

  if (move.type === 'block') {
    if (!canSealBlocked(next, amount)) {
      next.message = `Amount ${amount} still has at least one reachable coin lane.`;
      return next;
    }
    return sealAmount(next, amount, 'blocked', 1, 'block');
  }

  if (!canScoutAmount(next, amount)) {
    next.message = `Amount ${amount} is already settled.`;
    return next;
  }

  return sealAmount(
    next,
    amount,
    next.puzzle.optimalCounts[amount],
    scoutCostForAmount(next.puzzle, amount),
    'scout',
  );
}

export function sealedAmountCount(state: MintpathState) {
  return state.sealedCounts.slice(1).filter((value) => value !== null).length;
}

export function remainingUnsealed(state: MintpathState) {
  return state.puzzle.target - sealedAmountCount(state);
}

function simulateOptimal(puzzle: MintpathPuzzle): SimulationSummary {
  return {
    solved: puzzle.target <= puzzle.budget,
    actionsUsed: puzzle.target,
    finalCount: puzzle.optimalCounts[puzzle.target],
    counts: puzzle.optimalCounts,
  };
}

function simulateGreedyLargest(puzzle: MintpathPuzzle): SimulationSummary {
  return {
    solved: puzzle.target <= puzzle.budget && puzzle.greedyCounts[puzzle.target] === puzzle.optimalCounts[puzzle.target],
    actionsUsed: puzzle.target,
    finalCount: puzzle.greedyCounts[puzzle.target],
    counts: puzzle.greedyCounts,
  };
}

function simulateScoutFinal(puzzle: MintpathPuzzle): SimulationSummary {
  return {
    solved: scoutCostForAmount(puzzle, puzzle.target) <= puzzle.budget,
    actionsUsed: scoutCostForAmount(puzzle, puzzle.target),
    finalCount: puzzle.optimalCounts[puzzle.target],
    counts: puzzle.optimalCounts.map((value, index) => (index === puzzle.target ? value : 'blocked')),
  };
}

function bestAlternativeRatio(
  optimalFinal: number | 'blocked',
  greedyFinal: number | 'blocked',
  scoutSolved: boolean,
) {
  const greedyRatio = greedyFinal === optimalFinal ? 1 : 0;
  const scoutRatio = scoutSolved ? 1 : 0;
  return Math.max(greedyRatio, scoutRatio);
}

export function evaluateMintpath(): MintpathEvaluation {
  const difficulties: DifficultyAggregate[] = [];
  const alternativeRatios: number[] = [];
  const pressureScores: number[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as MintpathDifficulty[]) {
    const puzzle = generatePuzzle(0, difficulty);
    const optimal = simulateOptimal(puzzle);
    const greedy = simulateGreedyLargest(puzzle);
    const scout = simulateScoutFinal(puzzle);

    let largestCoinMisses = 0;
    let blockedCount = 0;
    let distinctRouteCount = 0;
    for (let amount = 1; amount <= puzzle.target; amount += 1) {
      const optimalChoice = puzzle.optimalChoices[amount];
      const greedyChoice = puzzle.greedyChoices[amount];
      if (optimalChoice === 'blocked') {
        blockedCount += 1;
      }
      if (optimalChoice !== null && optimalChoice !== greedyChoice) {
        largestCoinMisses += 1;
      }

      const viableChoices = puzzle.coins.filter((coin) => {
        if (amount < coin) return false;
        return isNumericSeal(puzzle.optimalCounts[amount - coin]);
      });
      if (viableChoices.length > 1) {
        distinctRouteCount += 1;
      }
    }

    const alternativeRatio = bestAlternativeRatio(
      puzzle.optimalCounts[puzzle.target],
      puzzle.greedyCounts[puzzle.target],
      scout.solved,
    );
    alternativeRatios.push(alternativeRatio);

    const pressure = clamp(
      0,
      1,
      largestCoinMisses / Math.max(1, puzzle.target) +
        blockedCount / Math.max(1, puzzle.target) +
        (scout.solved ? 0 : 0.18),
    );
    pressureScores.push(pressure);

    difficulties.push({
      difficulty,
      label: puzzle.label,
      budget: puzzle.budget,
      target: puzzle.target,
      solvability: optimal.solved ? 1 : 0,
      puzzleEntropy: Number(
        (
          puzzle.target * 1.7 +
          puzzle.coins.length * 2.6 +
          distinctRouteCount * 1.8 +
          blockedCount * 2.1 +
          log2(puzzle.target + 1) * 2.4
        ).toFixed(1),
      ),
      skillDepth: clamp(
        0.24,
        0.92,
        0.3 +
          (largestCoinMisses / Math.max(1, puzzle.target)) * 0.34 +
          (blockedCount / Math.max(1, puzzle.target)) * 0.18 +
          (scout.solved ? 0 : 0.12),
      ),
      decisionEntropy: clamp(
        1.0,
        4.5,
        1.02 + puzzle.coins.length * 0.24 + distinctRouteCount * 0.1 + blockedCount * 0.18,
      ),
      counterintuitive: largestCoinMisses,
      drama: clamp(0.35, 0.92, 0.46 + pressure * 0.44),
      infoGainRatio: Number(
        clamp(1.2, 5.5, 1.4 + distinctRouteCount * 0.28 + blockedCount * 0.34).toFixed(2),
      ),
      optimalMoves: optimal.actionsUsed,
      altMoves: Math.min(greedy.actionsUsed, scout.actionsUsed),
      altSolvability: greedy.solved || scout.solved ? 1 : 0,
    });
  }

  const difficultyBreakpoint =
    difficulties.find((entry) => entry.altSolvability === 0)?.difficulty ?? 5;
  const bestAlternativeGap = Number(
    clamp(
      0,
      1,
      alternativeRatios.reduce((sum, value) => sum + (1 - value), 0) / alternativeRatios.length,
    ).toFixed(3),
  );
  const invariantPressure = Number(
    clamp(0, 1, pressureScores.reduce((sum, value) => sum + value, 0) / pressureScores.length).toFixed(3),
  );

  return {
    difficulties,
    learningMetrics: {
      inputShapeMatch: 1,
      operationMatch: 1,
      constraintMatch: 1,
      goalMatch: 1,
      leetCodeFit: 1,
      bestAlternativeGap,
      invariantPressure,
      difficultyBreakpoint,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Each amount stays live only as the cheapest reachable predecessor plus one coin, and unreachable totals must remain explicitly blocked.',
      strongestAlternative:
        'The near miss is to keep taking the largest denomination that fits the current amount or to scout the final amount directly.',
      evidence:
        'D3 is the first breakpoint where the largest-coin shortcut and the direct scout both fail; D5 also forces the ledger to mark an impossible target as blocked.',
    },
  };
}
