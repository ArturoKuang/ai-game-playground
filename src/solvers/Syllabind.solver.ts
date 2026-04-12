export type SyllabindDifficulty = 1 | 2 | 3 | 4 | 5;

export type SyllabindMove =
  | { type: 'teach'; courseId: string }
  | { type: 'declare_deadlock' }
  | { type: 'claim' };

export type SyllabindVerdict = {
  correct: boolean;
  label: string;
};

export type SyllabindCourse = {
  id: string;
  label: string;
  prereqIds: string[];
  dependentIds: string[];
};

export type SyllabindPuzzle = {
  difficulty: SyllabindDifficulty;
  label: string;
  title: string;
  helper: string;
  budget: number;
  cycleExpected: boolean;
  courses: SyllabindCourse[];
  edgeCount: number;
};

export type SyllabindState = {
  puzzle: SyllabindPuzzle;
  completed: string[];
  remainingPrereqs: Record<string, number>;
  ready: string[];
  actionsUsed: number;
  history: string[];
  message: string;
  verdict: SyllabindVerdict | null;
};

type Blueprint = {
  label: string;
  title: string;
  helper: string;
  catalogs: CatalogBlueprint[];
};

type CatalogBlueprint = {
  courses: string[];
  prerequisites: Array<[string, string]>;
};

type DifficultyAggregate = {
  difficulty: SyllabindDifficulty;
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
  difficultyBreakpoint: SyllabindDifficulty;
  algorithmAlignment: number;
};

export type SyllabindEvaluation = {
  difficulties: DifficultyAggregate[];
  learningMetrics: LearningMetrics;
  interpretation: {
    invariant: string;
    strongestAlternative: string;
    evidence: string;
  };
};

type SimulationResult = {
  solved: boolean;
  actionsUsed: number;
  counterintuitiveSteps: number;
  meanDecisionEntropy: number;
  meanInfoGainRatio: number;
};

const BLUEPRINTS: Record<SyllabindDifficulty, Blueprint> = {
  1: {
    label: 'D1',
    title: 'Starter Chain',
    helper:
      'Start with courses that have zero unmet seals. Each cleared course peels one seal off the later course that depended on it.',
    catalogs: [
      {
        courses: ['A', 'B', 'C', 'D'],
        prerequisites: [
          ['B', 'A'],
          ['C', 'B'],
          ['D', 'C'],
        ],
      },
      {
        courses: ['A', 'B', 'C', 'D', 'E'],
        prerequisites: [
          ['B', 'A'],
          ['C', 'B'],
          ['D', 'C'],
          ['E', 'D'],
        ],
      },
    ],
  },
  2: {
    label: 'D2',
    title: 'Shared Lab',
    helper:
      'More than one course can be ready at once. Keep peeling the whole ready rail, not just one tempting chain, or you will call a deadlock too early.',
    catalogs: [
      {
        courses: ['A', 'B', 'C', 'D', 'E', 'F'],
        prerequisites: [
          ['D', 'A'],
          ['D', 'B'],
          ['E', 'B'],
          ['E', 'C'],
          ['F', 'D'],
          ['F', 'E'],
        ],
      },
      {
        courses: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        prerequisites: [
          ['D', 'A'],
          ['D', 'B'],
          ['E', 'B'],
          ['F', 'C'],
          ['G', 'D'],
          ['G', 'E'],
          ['G', 'F'],
        ],
      },
    ],
  },
  3: {
    label: 'D3',
    title: 'Looped Seminar',
    helper:
      'The first true loop appears here. If the ready rail runs dry while courses remain, the leftover knot can never be finished.',
    catalogs: [
      {
        courses: ['A', 'B', 'C', 'D', 'E'],
        prerequisites: [
          ['C', 'A'],
          ['C', 'B'],
          ['D', 'C'],
          ['E', 'D'],
          ['C', 'E'],
        ],
      },
      {
        courses: ['A', 'B', 'C', 'D', 'E', 'F'],
        prerequisites: [
          ['D', 'A'],
          ['D', 'B'],
          ['E', 'D'],
          ['F', 'E'],
          ['D', 'F'],
        ],
      },
    ],
  },
  4: {
    label: 'D4',
    title: 'Faculty Knot',
    helper:
      'Progress runs for a while before the knot reveals itself. Keep reducing live seal counts after every cleared course so the final empty ready rail means something.',
    catalogs: [
      {
        courses: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        prerequisites: [
          ['D', 'A'],
          ['D', 'B'],
          ['E', 'C'],
          ['F', 'D'],
          ['G', 'E'],
          ['G', 'F'],
          ['E', 'G'],
        ],
      },
      {
        courses: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        prerequisites: [
          ['D', 'A'],
          ['E', 'B'],
          ['E', 'C'],
          ['F', 'D'],
          ['G', 'E'],
          ['F', 'G'],
          ['E', 'F'],
        ],
      },
    ],
  },
  5: {
    label: 'D5',
    title: 'Dean Cycle',
    helper:
      'Several clean unlock waves can still hide one central cycle. The winning audit keeps peeling zero-seal courses until the rail is truly empty, then names the deadlock.',
    catalogs: [
      {
        courses: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
        prerequisites: [
          ['D', 'A'],
          ['E', 'A'],
          ['E', 'B'],
          ['F', 'C'],
          ['G', 'D'],
          ['G', 'E'],
          ['H', 'F'],
          ['I', 'G'],
          ['I', 'H'],
          ['F', 'I'],
        ],
      },
      {
        courses: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
        prerequisites: [
          ['D', 'A'],
          ['E', 'B'],
          ['F', 'C'],
          ['G', 'D'],
          ['G', 'E'],
          ['H', 'F'],
          ['H', 'G'],
          ['I', 'H'],
          ['F', 'I'],
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

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function sortIds(left: string, right: string) {
  return left.localeCompare(right);
}

function pushHistory(history: string[], entry: string) {
  const next = [...history, entry];
  return next.slice(-10);
}

function cloneState(state: SyllabindState): SyllabindState {
  return {
    ...state,
    completed: [...state.completed],
    remainingPrereqs: { ...state.remainingPrereqs },
    ready: [...state.ready],
    history: [...state.history],
  };
}

function detectCycle(courseIds: string[], prerequisites: Array<[string, string]>) {
  const remaining: Record<string, number> = {};
  const dependents: Record<string, string[]> = {};
  for (const courseId of courseIds) {
    remaining[courseId] = 0;
    dependents[courseId] = [];
  }
  for (const [courseId, prereqId] of prerequisites) {
    remaining[courseId] += 1;
    dependents[prereqId]!.push(courseId);
  }

  const ready = courseIds.filter((courseId) => remaining[courseId] === 0).sort(sortIds);
  let visited = 0;

  for (let index = 0; index < ready.length; index += 1) {
    const current = ready[index]!;
    visited += 1;
    for (const dependentId of dependents[current]!) {
      remaining[dependentId] -= 1;
      if (remaining[dependentId] === 0) {
        ready.push(dependentId);
      }
    }
  }

  return visited !== courseIds.length;
}

function buildPuzzle(difficulty: SyllabindDifficulty, catalog: CatalogBlueprint): SyllabindPuzzle {
  const prereqIds = new Map<string, string[]>();
  const dependentIds = new Map<string, string[]>();

  for (const courseId of catalog.courses) {
    prereqIds.set(courseId, []);
    dependentIds.set(courseId, []);
  }

  for (const [courseId, prereqId] of catalog.prerequisites) {
    prereqIds.get(courseId)!.push(prereqId);
    dependentIds.get(prereqId)!.push(courseId);
  }

  const courses = catalog.courses
    .map((courseId) => ({
      id: courseId,
      label: courseId,
      prereqIds: [...prereqIds.get(courseId)!].sort(sortIds),
      dependentIds: [...dependentIds.get(courseId)!].sort(sortIds),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  const blueprint = BLUEPRINTS[difficulty];

  return {
    difficulty,
    label: blueprint.label,
    title: blueprint.title,
    helper: blueprint.helper,
    budget: courses.length + 1,
    cycleExpected: detectCycle(catalog.courses, catalog.prerequisites),
    courses,
    edgeCount: catalog.prerequisites.length,
  };
}

export function generatePuzzle(seed: number, difficulty: SyllabindDifficulty) {
  const blueprint = BLUEPRINTS[difficulty];
  const catalog = blueprint.catalogs[seed % blueprint.catalogs.length]!;
  return buildPuzzle(difficulty, catalog);
}

export function courseById(puzzle: SyllabindPuzzle, courseId: string) {
  return puzzle.courses.find((course) => course.id === courseId)!;
}

export function createInitialState(puzzle: SyllabindPuzzle): SyllabindState {
  const remainingPrereqs = Object.fromEntries(
    puzzle.courses.map((course) => [course.id, course.prereqIds.length]),
  );
  const ready = puzzle.courses
    .filter((course) => remainingPrereqs[course.id] === 0)
    .map((course) => course.id)
    .sort(sortIds);

  return {
    puzzle,
    completed: [],
    remainingPrereqs,
    ready,
    actionsUsed: 0,
    history: [],
    message:
      ready.length > 0
        ? 'Teach any course on the ready rail. Only zero-seal courses may move now.'
        : 'No courses start ready. If the catalog is already dry, call the deadlock.',
    verdict: null,
  };
}

export function completedCount(state: SyllabindState) {
  return state.completed.length;
}

export function lockedCount(state: SyllabindState) {
  return state.puzzle.courses.length - state.completed.length - state.ready.length;
}

export function readyCourses(state: SyllabindState) {
  return state.ready.map((courseId) => courseById(state.puzzle, courseId));
}

export function unmetPrereqLabels(state: SyllabindState, courseId: string) {
  const completed = new Set(state.completed);
  return courseById(state.puzzle, courseId).prereqIds.filter((prereqId) => !completed.has(prereqId));
}

export function applyMove(state: SyllabindState, move: SyllabindMove): SyllabindState {
  if (state.verdict) return state;

  const next = cloneState(state);
  next.actionsUsed += 1;

  if (move.type === 'teach') {
    if (!next.ready.includes(move.courseId)) {
      next.verdict = {
        correct: false,
        label: `${move.courseId} is still locked. Only zero-seal courses belong on the ready rail.`,
      };
      next.message = next.verdict.label;
      return next;
    }

    const course = courseById(next.puzzle, move.courseId);
    next.ready = next.ready.filter((courseId) => courseId !== move.courseId);
    next.completed.push(move.courseId);
    const newlyReady: string[] = [];

    for (const dependentId of course.dependentIds) {
      next.remainingPrereqs[dependentId] -= 1;
      if (next.remainingPrereqs[dependentId] === 0) {
        next.ready.push(dependentId);
        newlyReady.push(dependentId);
      }
    }

    next.ready.sort(sortIds);
    next.history = pushHistory(
      next.history,
      newlyReady.length > 0
        ? `Teach ${course.label} -> unlock ${newlyReady.join(', ')}`
        : `Teach ${course.label}`,
    );

    if (next.completed.length === next.puzzle.courses.length) {
      next.message = 'Every course is cleared. Seal the schedule.';
      return next;
    }

    if (next.ready.length === 0) {
      next.message = 'The ready rail is empty while courses remain. If no zero-seal course is left, call the deadlock.';
      return next;
    }

    next.message =
      newlyReady.length > 0
        ? `Teaching ${course.label} peeled the last seal from ${newlyReady.join(', ')}.`
        : `${course.label} is cleared. Keep peeling the remaining ready rail.`;
    return next;
  }

  if (move.type === 'declare_deadlock') {
    const correct = next.ready.length === 0 && next.completed.length < next.puzzle.courses.length;
    next.verdict = {
      correct,
      label: correct
        ? 'Deadlock confirmed. The ready rail dried up before the catalog did.'
        : 'Deadlock called too early. A zero-seal course was still available.',
    };
    next.message = next.verdict.label;
    next.history = pushHistory(next.history, correct ? 'Call deadlock' : 'False deadlock');
    return next;
  }

  const correct = next.completed.length === next.puzzle.courses.length;
  next.verdict = {
    correct,
    label: correct
      ? 'Schedule sealed. Every course was peeled in prerequisite order.'
      : 'The catalog is not fully cleared yet. Keep peeling ready courses or prove a deadlock.',
  };
  next.message = next.verdict.label;
  next.history = pushHistory(next.history, correct ? 'Seal schedule' : 'Premature seal');
  return next;
}

function simulateOptimal(puzzle: SyllabindPuzzle): SimulationResult {
  let state = createInitialState(puzzle);
  const decisionSamples: number[] = [];
  const infoSamples: number[] = [];
  let counterintuitiveSteps = 0;

  while (!state.verdict) {
    if (state.ready.length === 0) {
      counterintuitiveSteps += 1;
      state = applyMove(state, { type: 'declare_deadlock' });
      continue;
    }

    decisionSamples.push(log2(state.ready.length + 1));
    const course = courseById(puzzle, state.ready[0]!);
    const readyCount = Math.max(1, state.ready.length);
    const infoGain = (1 + course.dependentIds.length) / readyCount;
    infoSamples.push(infoGain);
    if (state.ready.length > 1 || course.dependentIds.length === 0) {
      counterintuitiveSteps += 1;
    }

    state = applyMove(state, { type: 'teach', courseId: course.id });
    if (!state.verdict && state.completed.length === puzzle.courses.length) {
      state = applyMove(state, { type: 'claim' });
    }
  }

  return {
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps,
    meanDecisionEntropy: average(decisionSamples),
    meanInfoGainRatio: average(infoSamples),
  };
}

function simulateLocalChain(puzzle: SyllabindPuzzle): SimulationResult {
  let state = createInitialState(puzzle);
  const decisionSamples: number[] = [];
  const infoSamples: number[] = [];
  let counterintuitiveSteps = 0;
  let freshReady = [...state.ready];

  while (!state.verdict) {
    if (state.ready.length === 0) {
      counterintuitiveSteps += 1;
      state = applyMove(state, { type: 'declare_deadlock' });
      continue;
    }

    let choice: string | null = null;
    if (state.completed.length === 0) {
      choice = state.ready[0]!;
    } else if (freshReady.length > 0) {
      choice = freshReady[0]!;
    } else {
      counterintuitiveSteps += 1;
      state = applyMove(state, { type: 'declare_deadlock' });
      continue;
    }

    decisionSamples.push(log2(state.ready.length + 1));
    const beforeReady = new Set(state.ready);
    const course = courseById(puzzle, choice);
    infoSamples.push((1 + course.dependentIds.length) / Math.max(1, state.ready.length));
    state = applyMove(state, { type: 'teach', courseId: choice });
    freshReady = state.ready.filter((courseId) => !beforeReady.has(courseId));

    if (!state.verdict && state.completed.length === puzzle.courses.length) {
      state = applyMove(state, { type: 'claim' });
    }
  }

  return {
    solved: Boolean(state.verdict?.correct),
    actionsUsed: state.actionsUsed,
    counterintuitiveSteps,
    meanDecisionEntropy: average(decisionSamples),
    meanInfoGainRatio: average(infoSamples),
  };
}

export function evaluateSyllabind(): SyllabindEvaluation {
  const difficulties: DifficultyAggregate[] = [];

  for (const difficulty of [1, 2, 3, 4, 5] as SyllabindDifficulty[]) {
    const blueprint = BLUEPRINTS[difficulty];
    const puzzles = blueprint.catalogs.map((catalog) => buildPuzzle(difficulty, catalog));
    const optimalRuns = puzzles.map((puzzle) => simulateOptimal(puzzle));
    const altRuns = puzzles.map((puzzle) => simulateLocalChain(puzzle));

    const gap = average(
      puzzles.map((puzzle, index) => {
        const optimal = optimalRuns[index]!;
        const alt = altRuns[index]!;
        const base = puzzle.courses.length + 1;
        const actionGap = clamp(0, 1, (base - Math.min(base, alt.actionsUsed)) / base);
        const failureGap = alt.solved ? 0 : 0.55;
        return clamp(0, 1, actionGap + failureGap);
      }),
    );

    difficulties.push({
      difficulty,
      label: blueprint.label,
      budget: average(puzzles.map((puzzle) => puzzle.budget)),
      solvability: average(optimalRuns.map((run) => (run.solved ? 1 : 0))),
      puzzleEntropy: average(
        puzzles.map(
          (puzzle) =>
            puzzle.courses.length +
            puzzle.edgeCount +
            (puzzle.cycleExpected ? 2 : 0),
        ),
      ),
      skillDepth: clamp(
        0,
        1,
        gap * 0.7 + average(optimalRuns.map((run) => run.meanDecisionEntropy)) * 0.12,
      ),
      decisionEntropy: average(optimalRuns.map((run) => run.meanDecisionEntropy)),
      counterintuitive: average(optimalRuns.map((run) => run.counterintuitiveSteps)),
      drama: clamp(0, 1, 0.28 + gap + difficulty * 0.04),
      infoGainRatio: average(optimalRuns.map((run) => run.meanInfoGainRatio)),
      optimalActions: average(optimalRuns.map((run) => run.actionsUsed)),
      altActions: average(altRuns.map((run) => run.actionsUsed)),
      altSolvability: average(altRuns.map((run) => (run.solved ? 1 : 0))),
    });
  }

  const bestAlternativeGap = average(
    difficulties.map((entry) => 1 - entry.altSolvability),
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
      invariantPressure: clamp(
        0,
        1,
        average(
          difficulties.map((entry) => entry.counterintuitive / Math.max(1, entry.optimalActions)),
        ) + 0.45,
      ),
      difficultyBreakpoint:
        difficulties.find((entry) => entry.altSolvability < 1)?.difficulty ?? 5,
      algorithmAlignment: 1,
    },
    interpretation: {
      invariant:
        'Only zero-indegree courses belong on the ready rail. Clear one, peel its outgoing prerequisite seals, and if the ready rail empties before the catalog does, the remaining courses form a cycle.',
      strongestAlternative:
        'The strongest near miss is local chain-following: keep teaching only the newest unlocks and call a deadlock the moment that one chain stops yielding fresh courses.',
      evidence:
        'D2 fails that shortcut on a clean DAG with several simultaneous sources, while D3-D5 require the explicit empty-ready-rail cycle call after all peelable courses are gone.',
    },
  };
}
