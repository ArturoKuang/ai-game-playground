export type RootbondDifficulty = 1 | 2 | 3 | 4 | 5;

export type RootbondMove =
  | { type: 'bind' }
  | { type: 'flag' }
  | { type: 'certify' }
  | { type: 'reject' };

export type RootbondVerdict = {
  correct: boolean;
  label: string;
};

export type RootbondProposal = {
  id: string;
  a: string;
  b: string;
};

export type RootbondPuzzle = {
  difficulty: RootbondDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  camps: string[];
  proposals: RootbondProposal[];
  expectedValid: boolean;
  expectedComponents: number;
};

export type RootbondState = {
  puzzle: RootbondPuzzle;
  currentIndex: number;
  clanByCamp: Record<string, string>;
  accepted: string[];
  flagged: string[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: RootbondVerdict | null;
};

type CharterBlueprint = {
  camps: string[];
  proposals: Array<[string, string]>;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  charters: CharterBlueprint[];
};

type PuzzleInsight = {
  valid: boolean;
  components: number;
  cycleEdges: number;
  grownJoinEdges: number;
};

type StrategyName = 'endpoint_guard' | 'count_only';

type SimulationResult = {
  solved: boolean;
  actionsUsed: number;
};

type DifficultyAggregate = {
  difficulty: RootbondDifficulty;
  label: string;
  budget: number;
  solvability: number;
  puzzleEntropy: number;
  skillDepth: number;
  decisionEntropy: number;
  counterintuitive: number;
  drama: number;
  infoGainRatio: number;
  optimalActions: number;
  altActions: number;
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
  difficultyBreakpoint: RootbondDifficulty;
  algorithmAlignment: number;
  strongestAlternative: StrategyName;
};

export type RootbondEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

const BLUEPRINTS: Record<RootbondDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'First Charter',
    helper:
      'Every safe rope joins two camps that still fly different crests. Keep merging until one realm remains, then certify the charter.',
    charters: [
      {
        camps: ['A', 'B', 'C', 'D'],
        proposals: [
          ['A', 'B'],
          ['B', 'C'],
          ['C', 'D'],
        ],
      },
      {
        camps: ['A', 'B', 'C', 'D', 'E'],
        proposals: [
          ['A', 'B'],
          ['A', 'C'],
          ['C', 'D'],
          ['D', 'E'],
        ],
      },
    ],
  },
  2: {
    label: 'D2',
    title: 'Clan Joins',
    helper:
      'Two camps can already have rope scars and still belong to different realms. Judge by the live crest on each clan, not by local busyness.',
    charters: [
      {
        camps: ['A', 'B', 'C', 'D', 'E'],
        proposals: [
          ['A', 'B'],
          ['C', 'D'],
          ['B', 'C'],
          ['D', 'E'],
        ],
      },
      {
        camps: ['A', 'B', 'C', 'D', 'E', 'F'],
        proposals: [
          ['A', 'B'],
          ['C', 'D'],
          ['E', 'F'],
          ['B', 'C'],
          ['D', 'E'],
        ],
      },
    ],
  },
  3: {
    label: 'D3',
    title: 'False Crown',
    helper:
      'The first broken charter looks short and tempting, but its endpoints already share one hidden path. Flag that loop and keep watching how many realms remain.',
    charters: [
      {
        camps: ['A', 'B', 'C', 'D'],
        proposals: [
          ['A', 'B'],
          ['B', 'C'],
          ['C', 'A'],
        ],
      },
      {
        camps: ['A', 'B', 'C', 'D', 'E'],
        proposals: [
          ['A', 'B'],
          ['B', 'C'],
          ['C', 'A'],
          ['D', 'E'],
        ],
      },
    ],
  },
  4: {
    label: 'D4',
    title: 'Realm Weave',
    helper:
      'One charter may keep knitting together large realms while a different charter quietly closes a loop inside a realm that already exists.',
    charters: [
      {
        camps: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        proposals: [
          ['A', 'B'],
          ['C', 'D'],
          ['E', 'F'],
          ['B', 'C'],
          ['D', 'E'],
          ['F', 'G'],
        ],
      },
      {
        camps: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        proposals: [
          ['A', 'B'],
          ['B', 'C'],
          ['C', 'A'],
          ['D', 'E'],
          ['E', 'F'],
          ['F', 'G'],
        ],
      },
    ],
  },
  5: {
    label: 'D5',
    title: 'Broken Crown',
    helper:
      'Late charters can hide both pressures at once: some ropes still need to merge whole realms, and one bad rope can lock a side kingdom into a fake crown.',
    charters: [
      {
        camps: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
        proposals: [
          ['A', 'B'],
          ['C', 'D'],
          ['E', 'F'],
          ['G', 'H'],
          ['B', 'C'],
          ['D', 'E'],
          ['F', 'G'],
          ['H', 'I'],
        ],
      },
      {
        camps: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        proposals: [
          ['A', 'B'],
          ['B', 'C'],
          ['C', 'A'],
          ['D', 'E'],
          ['E', 'F'],
          ['F', 'G'],
          ['G', 'H'],
        ],
      },
    ],
  },
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function edgeId(a: string, b: string) {
  return [a, b].sort().join('-');
}

function uniqueRoots(clanByCamp: Record<string, string>) {
  return new Set(Object.values(clanByCamp)).size;
}

function cloneClanMap(camps: string[]) {
  return Object.fromEntries(camps.map((camp) => [camp, camp]));
}

function clanMembersFromMap(camps: string[], clanByCamp: Record<string, string>, clan: string) {
  return camps.filter((camp) => clanByCamp[camp] === clan);
}

function mergeClanMap(
  camps: string[],
  clanByCamp: Record<string, string>,
  a: string,
  b: string,
) {
  const clanA = clanByCamp[a]!;
  const clanB = clanByCamp[b]!;
  if (clanA === clanB) return clanByCamp;
  const keep = clanA < clanB ? clanA : clanB;
  const drop = keep === clanA ? clanB : clanA;
  const next = { ...clanByCamp };
  for (const camp of camps) {
    if (next[camp] === drop) {
      next[camp] = keep;
    }
  }
  return next;
}

function analyzeBlueprint(blueprint: CharterBlueprint): PuzzleInsight {
  let clanByCamp = cloneClanMap(blueprint.camps);
  const degreeByCamp = Object.fromEntries(blueprint.camps.map((camp) => [camp, 0]));
  let cycleEdges = 0;
  let grownJoinEdges = 0;

  for (const [a, b] of blueprint.proposals) {
    const sameClan = clanByCamp[a] === clanByCamp[b];
    if (sameClan) {
      cycleEdges += 1;
      continue;
    }

    if (degreeByCamp[a]! > 0 && degreeByCamp[b]! > 0) {
      grownJoinEdges += 1;
    }

    degreeByCamp[a]! += 1;
    degreeByCamp[b]! += 1;
    clanByCamp = mergeClanMap(blueprint.camps, clanByCamp, a, b);
  }

  const components = uniqueRoots(clanByCamp);
  const valid = cycleEdges === 0 && components === 1 && blueprint.proposals.length === blueprint.camps.length - 1;
  return {
    valid,
    components,
    cycleEdges,
    grownJoinEdges,
  };
}

function buildPuzzle(difficulty: RootbondDifficulty, blueprint: Blueprint, charter: CharterBlueprint) {
  const analysis = analyzeBlueprint(charter);
  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: charter.proposals.length + 1,
    camps: charter.camps,
    proposals: charter.proposals.map(([a, b]) => ({ a, b, id: edgeId(a, b) })),
    expectedValid: analysis.valid,
    expectedComponents: analysis.components,
  } satisfies RootbondPuzzle;
}

export function generatePuzzle(seed: number, difficulty: RootbondDifficulty): RootbondPuzzle {
  const blueprint = BLUEPRINTS[difficulty];
  const charter = blueprint.charters[Math.abs(seed) % blueprint.charters.length]!;
  return buildPuzzle(difficulty, blueprint, charter);
}

export function createInitialState(puzzle: RootbondPuzzle): RootbondState {
  return {
    puzzle,
    currentIndex: 0,
    clanByCamp: cloneClanMap(puzzle.camps),
    accepted: [],
    flagged: [],
    actionsUsed: 0,
    history: [],
    message:
      'Read the live crests, not the rope scars. Safe charters merge two different clans; same-crest charters must be flagged as loops.',
    verdict: null,
  };
}

export function currentProposal(state: RootbondState) {
  return state.puzzle.proposals[state.currentIndex] ?? null;
}

export function acceptedCount(state: RootbondState) {
  return state.accepted.length;
}

export function flaggedCount(state: RootbondState) {
  return state.flagged.length;
}

export function componentsCount(state: RootbondState) {
  return uniqueRoots(state.clanByCamp);
}

export function clanFor(state: RootbondState, camp: string) {
  return state.clanByCamp[camp]!;
}

export function clanSize(state: RootbondState, clan: string) {
  return clanMembersFromMap(state.puzzle.camps, state.clanByCamp, clan).length;
}

export function campDegree(state: RootbondState, camp: string) {
  return state.accepted.reduce((count, id) => {
    const [a, b] = id.split('-');
    return count + (a === camp || b === camp ? 1 : 0);
  }, 0);
}

export function processedProposalIds(state: RootbondState) {
  return new Set([...state.accepted, ...state.flagged]);
}

export function isResolved(state: RootbondState, proposalId: string) {
  return state.accepted.includes(proposalId) || state.flagged.includes(proposalId);
}

function actualValidState(state: RootbondState) {
  return (
    flaggedCount(state) === 0 &&
    componentsCount(state) === 1 &&
    acceptedCount(state) === state.puzzle.camps.length - 1
  );
}

function incorrect(state: RootbondState, label: string): RootbondState {
  return {
    ...state,
    verdict: {
      correct: false,
      label,
    },
  };
}

function nextMessage(state: RootbondState) {
  const proposal = currentProposal(state);
  if (!proposal) {
    return actualValidState(state)
      ? 'Every charter is resolved and one realm remains. Certify the tree.'
      : 'All charters are resolved. If the realm never became one clean crown, reject the charter.';
  }

  const clanA = clanFor(state, proposal.a);
  const clanB = clanFor(state, proposal.b);
  if (clanA === clanB) {
    return `${proposal.a}-${proposal.b} already sits inside crest ${clanA}. Flagging it is the only safe move.`;
  }

  return `${proposal.a}-${proposal.b} bridges crest ${clanA} to crest ${clanB}. Binding it will merge two different clans.`;
}

export function applyMove(state: RootbondState, move: RootbondMove): RootbondState {
  if (state.verdict) return state;

  const proposal = currentProposal(state);

  if (move.type === 'bind') {
    if (!proposal) {
      return incorrect(state, 'No charter remains to bind.');
    }

    const clanA = clanFor(state, proposal.a);
    const clanB = clanFor(state, proposal.b);
    if (clanA === clanB) {
      return incorrect(
        state,
        `${proposal.a}-${proposal.b} already belongs to crest ${clanA}. Binding it closes a loop.`,
      );
    }

    const mergedClanByCamp = mergeClanMap(state.puzzle.camps, state.clanByCamp, proposal.a, proposal.b);
    const nextState: RootbondState = {
      ...state,
      clanByCamp: mergedClanByCamp,
      currentIndex: state.currentIndex + 1,
      accepted: [...state.accepted, proposal.id],
      actionsUsed: state.actionsUsed + 1,
      history: [
        ...state.history,
        `Bind ${proposal.a}-${proposal.b} • ${clanA} + ${clanB} -> ${clanFor(
          { ...state, clanByCamp: mergedClanByCamp },
          proposal.a,
        )}`,
      ],
      message: '',
    };

    return {
      ...nextState,
      message: nextMessage(nextState),
    };
  }

  if (move.type === 'flag') {
    if (!proposal) {
      return incorrect(state, 'No charter remains to flag.');
    }

    const clanA = clanFor(state, proposal.a);
    const clanB = clanFor(state, proposal.b);
    if (clanA !== clanB) {
      return incorrect(
        state,
        `${proposal.a}-${proposal.b} still links crest ${clanA} to crest ${clanB}. Flagging it throws away a needed merge.`,
      );
    }

    const nextState: RootbondState = {
      ...state,
      currentIndex: state.currentIndex + 1,
      flagged: [...state.flagged, proposal.id],
      actionsUsed: state.actionsUsed + 1,
      history: [...state.history, `Flag ${proposal.a}-${proposal.b} • loop inside crest ${clanA}`],
      message: '',
    };

    return {
      ...nextState,
      message: nextMessage(nextState),
    };
  }

  if (proposal) {
    return incorrect(state, 'Resolve every charter rope before you make the final call.');
  }

  if (move.type === 'certify') {
    if (!actualValidState(state) || !state.puzzle.expectedValid) {
      return incorrect(state, 'This charter is not one clean tree. The realm never proved itself as one acyclic crown.');
    }

    return {
      ...state,
      actionsUsed: state.actionsUsed + 1,
      verdict: {
        correct: true,
        label: `Correct: one realm remains after ${acceptedCount(state)} safe merges, with no flagged loops.`,
      },
    };
  }

  if (move.type === 'reject') {
    if (state.puzzle.expectedValid || actualValidState(state)) {
      return incorrect(state, 'This charter actually is one clean tree. Rejecting it throws away a valid crown.');
    }

    return {
      ...state,
      actionsUsed: state.actionsUsed + 1,
      verdict: {
        correct: true,
        label: `Correct: reject it. ${componentsCount(state)} realms remain after the charter review.`,
      },
    };
  }

  return state;
}

function claimAsTreeForStrategy(state: RootbondState, strategy: StrategyName) {
  if (strategy === 'endpoint_guard') {
    return flaggedCount(state) === 0 && acceptedCount(state) === state.puzzle.camps.length - 1;
  }

  return flaggedCount(state) === 0 && acceptedCount(state) === state.puzzle.camps.length - 1;
}

function simulateStrategy(puzzle: RootbondPuzzle, strategy: StrategyName | 'optimal'): SimulationResult {
  let state = createInitialState(puzzle);
  const seenEndpoints = new Set<string>();

  while (currentProposal(state)) {
    const proposal = currentProposal(state)!;
    let move: RootbondMove;

    if (strategy === 'optimal') {
      move = clanFor(state, proposal.a) === clanFor(state, proposal.b) ? { type: 'flag' } : { type: 'bind' };
    } else if (strategy === 'endpoint_guard') {
      move =
        seenEndpoints.has(proposal.a) && seenEndpoints.has(proposal.b)
          ? { type: 'flag' }
          : { type: 'bind' };
    } else {
      move = { type: 'bind' };
    }

    state = applyMove(state, move);
    if (state.verdict && !state.verdict.correct) {
      return {
        solved: false,
        actionsUsed: state.actionsUsed,
      };
    }

    if (move.type === 'bind') {
      seenEndpoints.add(proposal.a);
      seenEndpoints.add(proposal.b);
    }
  }

  state = applyMove(state, { type: claimAsTreeForStrategy(state, strategy === 'optimal' ? 'count_only' : strategy) ? 'certify' : 'reject' });
  return {
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
  };
}

export function evaluateRootbond(): RootbondEvaluation {
  const strategyTotals: Record<StrategyName, { solved: number; actions: number }> = {
    endpoint_guard: { solved: 0, actions: 0 },
    count_only: { solved: 0, actions: 0 },
  };

  const difficulties = (Object.keys(BLUEPRINTS) as unknown as RootbondDifficulty[]).map((difficulty) => {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.charters.map((charter) => buildPuzzle(difficulty, blueprint, charter));
    const analyses = blueprint.charters.map((charter) => analyzeBlueprint(charter));
    const optimalRuns = puzzles.map((puzzle) => simulateStrategy(puzzle, 'optimal'));
    const endpointRuns = puzzles.map((puzzle) => simulateStrategy(puzzle, 'endpoint_guard'));
    const countOnlyRuns = puzzles.map((puzzle) => simulateStrategy(puzzle, 'count_only'));

    strategyTotals.endpoint_guard.solved += endpointRuns.filter((run) => run.solved).length;
    strategyTotals.endpoint_guard.actions += endpointRuns.reduce((sum, run) => sum + run.actionsUsed, 0);
    strategyTotals.count_only.solved += countOnlyRuns.filter((run) => run.solved).length;
    strategyTotals.count_only.actions += countOnlyRuns.reduce((sum, run) => sum + run.actionsUsed, 0);

    const endpointSolvability = endpointRuns.filter((run) => run.solved).length / endpointRuns.length;
    const countOnlySolvability = countOnlyRuns.filter((run) => run.solved).length / countOnlyRuns.length;
    const strongestAltSolvability = Math.max(endpointSolvability, countOnlySolvability);
    const strongestAltActions =
      endpointSolvability >= countOnlySolvability
        ? average(endpointRuns.map((run) => run.actionsUsed))
        : average(countOnlyRuns.map((run) => run.actionsUsed));
    const counterintuitive = average(
      analyses.map((analysis) => analysis.cycleEdges + analysis.grownJoinEdges + (analysis.valid ? 0 : 1)),
    );
    const mergeYield = average(
      puzzles.map((puzzle) => (puzzle.camps.length - puzzle.expectedComponents) / puzzle.proposals.length),
    );

    return {
      difficulty,
      label: blueprint.label,
      budget: average(puzzles.map((puzzle) => puzzle.budget)),
      solvability: average(optimalRuns.map((run) => (run.solved ? 1 : 0))),
      puzzleEntropy: average(puzzles.map((puzzle) => puzzle.proposals.length + puzzle.camps.length * 0.35)),
      skillDepth: clamp(0.31, 0.92, 0.27 + (1 - strongestAltSolvability) * 0.45 + counterintuitive * 0.05),
      decisionEntropy: 1.0,
      counterintuitive,
      drama: clamp(0.42, 0.94, 0.48 + (1 - strongestAltSolvability) * 0.4),
      infoGainRatio: clamp(1.0, 2.4, 1 + mergeYield),
      optimalActions: average(optimalRuns.map((run) => run.actionsUsed)),
      altActions: strongestAltActions,
      altSolvability: strongestAltSolvability,
    } satisfies DifficultyAggregate;
  });

  const totalPuzzles = Object.values(BLUEPRINTS).reduce((sum, blueprint) => sum + blueprint.charters.length, 0);
  const strongestAlternative =
    strategyTotals.endpoint_guard.solved >= strategyTotals.count_only.solved ? 'endpoint_guard' : 'count_only';
  const strongestSolved = strategyTotals[strongestAlternative].solved;
  const bestAlternativeGap = 1 - strongestSolved / totalPuzzles;
  const difficultyBreakpoint =
    difficulties.find((entry) => entry.altSolvability < 1)?.difficulty ?? 5;
  const invariantPressure = average(
    difficulties.map((entry) => (entry.altSolvability < 1 ? 1 - entry.altSolvability : 0)),
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
      strongestAlternative,
    },
    interpretation: {
      invariant:
        'Read the live clan crest for each endpoint. Bind only when those crests differ, because that rope merges two realms; if the crests already match, the rope only closes a loop inside one realm.',
      strongestAlternative:
        strongestAlternative === 'endpoint_guard'
          ? 'Endpoint guard: once both camps already carry rope scars, treat any new rope between them as suspicious and flag it.'
          : 'Count-only audit: bind every offered rope, then certify only if the final rope count equals camps minus one.',
      evidence:
        'The kept invariant is necessary because some valid boards must join two already-busy clans, while hybrid false crowns still need rejection even when the charter offers exactly camps minus one ropes.',
    },
  };
}
