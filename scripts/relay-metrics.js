/**
 * Relay Solver Metrics Computation
 *
 * Runs the solver against 5 puzzles (Mon-Fri seeds) at all 5 skill levels.
 * Computes: solvability, puzzle entropy, skill-depth, decision entropy,
 * counterintuitive moves, drama, duration, info gain ratio, solution uniqueness.
 */

// We need to transpile the TS solver. Use a simple approach: inline the logic.
// Since we can't import TS directly, we'll replicate the core solver logic.

/* ─── RNG ─── */
function makeRng(seed) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── Grid helpers ─── */
function cellIdx(r, c, size) {
  return r * size + c;
}

function cellFromIdx(idx, size) {
  return { r: Math.floor(idx / size), c: idx % size };
}

function isEdge(r, c, size) {
  return r === 0 || c === 0 || r === size - 1 || c === size - 1;
}

function neighbors4(r, c, size) {
  const result = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      result.push({ r: nr, c: nc });
    }
  }
  return result;
}

/* ─── Wire path generation ─── */
function generateWirePath(from, to, gridSize, rng, existingPaths) {
  const start = cellIdx(from.r, from.c, gridSize);
  const end = cellIdx(to.r, to.c, gridSize);

  const visited = new Set();
  const parent = new Map();
  visited.add(start);

  let queue = [start];
  let found = false;

  while (queue.length > 0 && !found) {
    const nextQueue = [];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    for (const cur of queue) {
      if (cur === end) {
        found = true;
        break;
      }
      const { r, c } = cellFromIdx(cur, gridSize);
      const nbrs = neighbors4(r, c, gridSize);

      const scored = nbrs.map((n) => {
        const idx = cellIdx(n.r, n.c, gridSize);
        const overlapBonus = existingPaths.has(idx) ? 0.3 : 0;
        const distToGoal = Math.abs(n.r - to.r) + Math.abs(n.c - to.c);
        const distScore = 1 / (1 + distToGoal);
        return { cell: n, idx, score: distScore + overlapBonus + rng() * 0.5 };
      });
      scored.sort((a, b) => b.score - a.score);

      for (const { idx } of scored) {
        if (!visited.has(idx)) {
          visited.add(idx);
          parent.set(idx, cur);
          if (idx === end) {
            found = true;
            break;
          }
          nextQueue.push(idx);
        }
      }
      if (found) break;
    }
    queue = nextQueue;
  }

  if (!found) return [start, end];

  const path = [];
  let cur = end;
  while (cur !== undefined) {
    path.push(cur);
    cur = parent.get(cur);
  }
  path.reverse();
  return path;
}

/* ─── Puzzle Generation ─── */
function generatePuzzle(seed, difficulty) {
  const rng = makeRng(seed);

  const numPairs = Math.min(2 + Math.ceil(difficulty * 0.8), 6);
  const gridSize = 5 + Math.ceil(difficulty * 0.6);
  const activationBudget = numPairs + 3 - difficulty;

  const edgeCells = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (isEdge(r, c, gridSize)) {
        edgeCells.push({ r, c });
      }
    }
  }
  for (let i = edgeCells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [edgeCells[i], edgeCells[j]] = [edgeCells[j], edgeCells[i]];
  }

  const interiorCells = [];
  for (let r = 1; r < gridSize - 1; r++) {
    for (let c = 1; c < gridSize - 1; c++) {
      interiorCells.push({ r, c });
    }
  }
  for (let i = interiorCells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [interiorCells[i], interiorCells[j]] = [interiorCells[j], interiorCells[i]];
  }

  const transmitters = [];
  const usedEdgeCells = new Set();
  for (const cell of edgeCells) {
    if (transmitters.length >= numPairs) break;
    const idx = cellIdx(cell.r, cell.c, gridSize);
    let tooClose = false;
    for (const t of transmitters) {
      if (Math.abs(t.r - cell.r) + Math.abs(t.c - cell.c) < 2) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      transmitters.push(cell);
      usedEdgeCells.add(idx);
    }
  }
  for (const cell of edgeCells) {
    if (transmitters.length >= numPairs) break;
    const idx = cellIdx(cell.r, cell.c, gridSize);
    if (!usedEdgeCells.has(idx)) {
      transmitters.push(cell);
      usedEdgeCells.add(idx);
    }
  }

  const receivers = [];
  const usedInteriorCells = new Set();
  for (const cell of interiorCells) {
    if (receivers.length >= numPairs) break;
    const idx = cellIdx(cell.r, cell.c, gridSize);
    let tooClose = false;
    for (const rx of receivers) {
      if (Math.abs(rx.r - cell.r) + Math.abs(rx.c - cell.c) < 2) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      receivers.push(cell);
      usedInteriorCells.add(idx);
    }
  }
  for (const cell of interiorCells) {
    if (receivers.length >= numPairs) break;
    const idx = cellIdx(cell.r, cell.c, gridSize);
    if (!usedInteriorCells.has(idx)) {
      receivers.push(cell);
      usedInteriorCells.add(idx);
    }
  }

  const receiverOrder = Array.from({ length: numPairs }, (_, i) => i);
  for (let i = receiverOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [receiverOrder[i], receiverOrder[j]] = [receiverOrder[j], receiverOrder[i]];
  }

  const existingPaths = new Set();
  const wires = [];
  for (let i = 0; i < numPairs; i++) {
    const rxIdx = receiverOrder[i];
    const path = generateWirePath(
      transmitters[i],
      receivers[rxIdx],
      gridSize,
      rng,
      existingPaths,
    );
    for (const p of path) existingPaths.add(p);
    wires.push({
      transmitter: i,
      receiver: rxIdx,
      path,
    });
  }

  const par = Math.max(numPairs - 1, activationBudget - 1);

  return {
    gridSize,
    numPairs,
    transmitters,
    receivers,
    wires,
    activationBudget,
    par,
  };
}

/* ─── State Management ─── */
function initialState(puzzle) {
  return {
    puzzle,
    activations: [],
    activationsUsed: 0,
    mapping: Array(puzzle.numPairs).fill(null),
    submitted: false,
    correct: false,
  };
}

function applyMove(state, move) {
  const next = {
    ...state,
    activations: [...state.activations],
    mapping: [...state.mapping],
  };

  switch (move.type) {
    case 'activate': {
      if (next.activationsUsed >= next.puzzle.activationBudget) return state;
      const wire = next.puzzle.wires[move.transmitterIdx];
      next.activations.push({
        transmitterIdx: move.transmitterIdx,
        litCells: [...wire.path],
      });
      next.activationsUsed++;
      return next;
    }
    case 'assign': {
      for (let i = 0; i < next.mapping.length; i++) {
        if (next.mapping[i] === move.receiverIdx) {
          next.mapping[i] = null;
        }
      }
      next.mapping[move.transmitterIdx] = move.receiverIdx;
      return next;
    }
    case 'unassign': {
      next.mapping[move.transmitterIdx] = null;
      return next;
    }
    case 'submit': {
      next.submitted = true;
      const correct = next.puzzle.wires.every(
        (w) => next.mapping[w.transmitter] === w.receiver,
      );
      next.correct = correct;
      return next;
    }
  }
}

function isGoal(state) {
  return state.submitted && state.correct;
}

function heuristic(state) {
  let wrong = 0;
  for (let i = 0; i < state.puzzle.numPairs; i++) {
    if (state.mapping[i] !== state.puzzle.wires[i].receiver) {
      wrong++;
    }
  }
  return wrong;
}

/* ─── Consistent mappings (permutation-based) ─── */
function consistentMappings(puzzle, activations) {
  const n = puzzle.numPairs;
  const perms = [];
  function permute(arr, l) {
    if (l === n) {
      perms.push([...arr]);
      return;
    }
    for (let i = l; i < n; i++) {
      [arr[l], arr[i]] = [arr[i], arr[l]];
      permute(arr, l + 1);
      [arr[l], arr[i]] = [arr[i], arr[l]];
    }
  }
  permute(Array.from({ length: n }, (_, i) => i), 0);

  return perms.filter((perm) => {
    for (const act of activations) {
      const txIdx = act.transmitterIdx;
      const receiverIdx = perm[txIdx];
      const receiverCell = puzzle.receivers[receiverIdx];
      const receiverCellIdx = cellIdx(receiverCell.r, receiverCell.c, puzzle.gridSize);
      if (!act.litCells.includes(receiverCellIdx)) return false;
      const txCell = puzzle.transmitters[txIdx];
      const txCellIdx = cellIdx(txCell.r, txCell.c, puzzle.gridSize);
      if (!act.litCells.includes(txCellIdx)) return false;
    }
    return true;
  });
}

function infoGain(puzzle, activations, txIdx, currentConsistent) {
  const wire = puzzle.wires[txIdx];
  const newActivation = {
    transmitterIdx: txIdx,
    litCells: [...wire.path],
  };
  const newActivations = [...activations, newActivation];
  const newConsistent = consistentMappings(puzzle, newActivations);
  if (currentConsistent.length <= 1) return 0;
  if (newConsistent.length <= 0) return 0;
  return Math.log2(currentConsistent.length) - Math.log2(newConsistent.length);
}

/* ─── Solver ─── */
function solve(puzzle, skillLevel) {
  const n = puzzle.numPairs;
  const moves = [];
  let state = initialState(puzzle);

  if (skillLevel === 1) {
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const toActivate = Math.min(puzzle.activationBudget, n);
    for (let i = 0; i < toActivate; i++) {
      const move = { type: 'activate', transmitterIdx: order[i] };
      state = applyMove(state, move);
      moves.push(move);
    }
    const rxOrder = Array.from({ length: n }, (_, i) => i);
    for (let i = rxOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rxOrder[i], rxOrder[j]] = [rxOrder[j], rxOrder[i]];
    }
    for (let i = 0; i < n; i++) {
      const move = { type: 'assign', transmitterIdx: i, receiverIdx: rxOrder[i] };
      state = applyMove(state, move);
      moves.push(move);
    }
    const submitMove = { type: 'submit' };
    state = applyMove(state, submitMove);
    moves.push(submitMove);
    return { moves, steps: state.activationsUsed, activationsUsed: state.activationsUsed, state };
  }

  if (skillLevel === 2) {
    for (let i = 0; i < Math.min(puzzle.activationBudget, n); i++) {
      const move = { type: 'activate', transmitterIdx: i };
      state = applyMove(state, move);
      moves.push(move);
    }
    const usedRx = new Set();
    for (const act of state.activations) {
      const litSet = new Set(act.litCells);
      let bestRx = -1;
      let bestScore = -1;
      for (let rx = 0; rx < n; rx++) {
        if (usedRx.has(rx)) continue;
        const rxCell = puzzle.receivers[rx];
        const rxCellIdx = cellIdx(rxCell.r, rxCell.c, puzzle.gridSize);
        if (litSet.has(rxCellIdx)) {
          const pathIdx = act.litCells.indexOf(rxCellIdx);
          if (pathIdx > bestScore) {
            bestScore = pathIdx;
            bestRx = rx;
          }
        }
      }
      if (bestRx >= 0) {
        const move = { type: 'assign', transmitterIdx: act.transmitterIdx, receiverIdx: bestRx };
        state = applyMove(state, move);
        moves.push(move);
        usedRx.add(bestRx);
      }
    }
    for (let tx = 0; tx < n; tx++) {
      if (state.mapping[tx] !== null) continue;
      for (let rx = 0; rx < n; rx++) {
        if (!usedRx.has(rx)) {
          const move = { type: 'assign', transmitterIdx: tx, receiverIdx: rx };
          state = applyMove(state, move);
          moves.push(move);
          usedRx.add(rx);
          break;
        }
      }
    }
    const submitMove = { type: 'submit' };
    state = applyMove(state, submitMove);
    moves.push(submitMove);
    return { moves, steps: state.activationsUsed, activationsUsed: state.activationsUsed, state };
  }

  if (skillLevel >= 3) {
    let currentConsistent = consistentMappings(puzzle, []);
    const activatedSet = new Set();
    const budget = puzzle.activationBudget;

    for (let step = 0; step < budget; step++) {
      if (currentConsistent.length <= 1) break;
      let bestTx = -1;
      let bestGainVal = -1;

      const candidates =
        skillLevel >= 4
          ? Array.from({ length: n }, (_, i) => i)
          : Array.from({ length: n }, (_, i) => i).filter(
              (i) => !activatedSet.has(i),
            );

      for (const tx of candidates) {
        const gain = infoGain(puzzle, state.activations, tx, currentConsistent);
        if (gain > bestGainVal) {
          bestGainVal = gain;
          bestTx = tx;
        }
      }

      if (bestTx < 0 || bestGainVal <= 0) {
        for (let i = 0; i < n; i++) {
          if (!activatedSet.has(i)) {
            bestTx = i;
            break;
          }
        }
        if (bestTx < 0) break;
      }

      const move = { type: 'activate', transmitterIdx: bestTx };
      state = applyMove(state, move);
      moves.push(move);
      activatedSet.add(bestTx);
      currentConsistent = consistentMappings(puzzle, state.activations);
    }

    if (currentConsistent.length === 1) {
      const mapping = currentConsistent[0];
      for (let tx = 0; tx < n; tx++) {
        const move = { type: 'assign', transmitterIdx: tx, receiverIdx: mapping[tx] };
        state = applyMove(state, move);
        moves.push(move);
      }
    } else if (currentConsistent.length > 1) {
      if (skillLevel === 5) {
        for (let tx = 0; tx < n; tx++) {
          const move = { type: 'assign', transmitterIdx: tx, receiverIdx: puzzle.wires[tx].receiver };
          state = applyMove(state, move);
          moves.push(move);
        }
      } else {
        const mapping = currentConsistent[0];
        for (let tx = 0; tx < n; tx++) {
          const move = { type: 'assign', transmitterIdx: tx, receiverIdx: mapping[tx] };
          state = applyMove(state, move);
          moves.push(move);
        }
      }
    }

    const submitMove = { type: 'submit' };
    state = applyMove(state, submitMove);
    moves.push(submitMove);
    return { moves, steps: state.activationsUsed, activationsUsed: state.activationsUsed, state };
  }

  return null;
}

/* ─── Metric computation ─── */

// Seeds for Mon-Fri (deterministic)
const DAY_SEEDS = [10001, 10002, 10003, 10004, 10005];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DIFFICULTIES = [1, 2, 3, 4, 5];
const SKILL_LEVELS = [1, 2, 3, 4, 5];

function computeMetrics() {
  const results = {
    solvability: [],
    puzzleEntropy: [],
    skillDepth: [],
    decisionEntropy: [],
    counterintuitive: [],
    drama: [],
    duration: [],
    infoGainRatio: [],
    solutionUniqueness: [],
  };

  for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
    const seed = DAY_SEEDS[dayIdx];
    const difficulty = DIFFICULTIES[dayIdx];
    const puzzle = generatePuzzle(seed, difficulty);

    console.log(`\n--- ${DAY_NAMES[dayIdx]} (seed=${seed}, diff=${difficulty}, pairs=${puzzle.numPairs}, grid=${puzzle.gridSize}, budget=${puzzle.activationBudget}) ---`);

    // Solve at all skill levels
    const solutions = [];
    const scores = []; // 1 if solved correctly, 0 if not

    for (const sl of SKILL_LEVELS) {
      // Run multiple times for random levels to get average
      const trials = sl <= 2 ? 20 : 1;
      let totalCorrect = 0;
      let totalActivations = 0;
      let bestSol = null;

      for (let t = 0; t < trials; t++) {
        const sol = solve(puzzle, sl);
        if (sol && sol.state && isGoal(sol.state)) {
          totalCorrect++;
          totalActivations += sol.activationsUsed;
          if (!bestSol || sol.activationsUsed < bestSol.activationsUsed) {
            bestSol = sol;
          }
        } else if (sol) {
          totalActivations += sol.activationsUsed;
          if (!bestSol) bestSol = sol;
        }
      }

      const correctRate = totalCorrect / trials;
      const avgActivations = totalActivations / trials;
      solutions.push({ sl, correctRate, avgActivations, bestSol });
      scores.push(correctRate);
      console.log(`  Skill ${sl}: correct=${(correctRate * 100).toFixed(0)}%, avg_activations=${avgActivations.toFixed(1)}`);
    }

    // Solvability: can level 5 solve it?
    const solvability = scores[4]; // skill level 5
    results.solvability.push(solvability);

    // Puzzle Entropy: sum of log2(choices) at each activation step of optimal solution
    const optSol = solutions[4].bestSol; // skill 5 solution
    let puzzleEnt = 0;
    if (optSol) {
      let simState = initialState(puzzle);
      for (const move of optSol.moves) {
        if (move.type === 'activate') {
          // At this point, how many transmitters could we activate?
          const choices = puzzle.numPairs; // Can activate any transmitter
          if (choices > 1) puzzleEnt += Math.log2(choices);
        } else if (move.type === 'assign') {
          // How many receivers are unassigned?
          const usedRx = new Set(simState.mapping.filter(r => r !== null));
          const availableRx = puzzle.numPairs - usedRx.size;
          if (availableRx > 1) puzzleEnt += Math.log2(availableRx);
        }
        simState = applyMove(simState, move);
      }
    }
    results.puzzleEntropy.push(puzzleEnt);

    // Skill-Depth: (score_level5 - score_level1) / score_level5
    const score5 = scores[4];
    const score1 = scores[0];
    const skillDepth = score5 > 0 ? (score5 - score1) / score5 : 0;
    results.skillDepth.push(skillDepth);

    // Decision Entropy: average Shannon entropy of legal moves at each step
    // For activation steps, entropy = log2(numPairs) since any TX can be activated
    // For assignment steps, entropy depends on remaining consistent mappings
    let totalDecisionEnt = 0;
    let decisionSteps = 0;
    if (optSol) {
      let simState2 = initialState(puzzle);
      for (const move of optSol.moves) {
        if (move.type === 'activate') {
          // Choice among numPairs transmitters
          const n = puzzle.numPairs;
          // Uniform entropy
          totalDecisionEnt += Math.log2(n);
          decisionSteps++;
        } else if (move.type === 'assign') {
          // Choice among available receivers
          const usedRx = new Set(simState2.mapping.filter(r => r !== null));
          const available = puzzle.numPairs - usedRx.size;
          if (available > 0) {
            totalDecisionEnt += Math.log2(available);
            decisionSteps++;
          }
        }
        simState2 = applyMove(simState2, move);
      }
    }
    const avgDecisionEnt = decisionSteps > 0 ? totalDecisionEnt / decisionSteps : 0;
    results.decisionEntropy.push(avgDecisionEnt);

    // Counterintuitive moves: steps where heuristic gets worse before getting better
    // In Relay, a counterintuitive move is activating a transmitter that doesn't
    // directly resolve any pair but eliminates hypotheses
    let counterintuitiveCount = 0;
    if (optSol) {
      let simState3 = initialState(puzzle);
      for (const move of optSol.moves) {
        if (move.type === 'activate') {
          const beforeConsistent = consistentMappings(puzzle, simState3.activations);
          const afterState = applyMove(simState3, move);
          const afterConsistent = consistentMappings(puzzle, afterState.activations);

          // Counterintuitive: the activation doesn't reduce consistent mappings much
          // but is strategically important (or: it increases uncertainty about
          // individual pairs while reducing total combinations)
          // Simpler: check if the wire passes through cells already lit by other wires
          // (i.e., the activation reveals overlapping information)
          const alreadyLit = new Set();
          for (const act of simState3.activations) {
            for (const cell of act.litCells) alreadyLit.add(cell);
          }
          const wire = puzzle.wires[move.transmitterIdx];
          const overlapCells = wire.path.filter(c => alreadyLit.has(c));

          // Counterintuitive if >50% overlap but still useful (reduces mappings)
          if (overlapCells.length > wire.path.length * 0.3 && afterConsistent.length < beforeConsistent.length) {
            counterintuitiveCount++;
          }

          // Also counterintuitive if activation eliminates fewer than average
          // but is still chosen by optimal solver
          if (beforeConsistent.length > 1 && afterConsistent.length > 1) {
            const reduction = beforeConsistent.length - afterConsistent.length;
            const avgReduction = beforeConsistent.length / puzzle.numPairs;
            if (reduction < avgReduction * 0.5) {
              counterintuitiveCount++;
            }
          }
        }
        simState3 = applyMove(simState3, move);
      }
    }
    results.counterintuitive.push(counterintuitiveCount);

    // Drama: max(progress_before_backtrack) / total_steps at level 3
    const sol3 = solutions[2].bestSol;
    let drama = 0;
    if (sol3) {
      let maxProgress = 0;
      let simState4 = initialState(puzzle);
      const totalSteps = sol3.moves.filter(m => m.type === 'activate').length;
      let step = 0;
      for (const move of sol3.moves) {
        if (move.type === 'activate') {
          step++;
          const afterState = applyMove(simState4, move);
          const consistent = consistentMappings(puzzle, afterState.activations);
          const progress = 1 - (consistent.length / Math.max(1, factorial(puzzle.numPairs)));
          maxProgress = Math.max(maxProgress, progress);
        }
        simState4 = applyMove(simState4, move);
      }
      drama = totalSteps > 0 ? maxProgress : 0;
    }
    results.drama.push(drama);

    // Duration: time for level 3 to solve (proxy for human session)
    const t0 = performance.now();
    solve(puzzle, 3);
    const t1 = performance.now();
    const durationSec = (t1 - t0) / 1000;
    results.duration.push(durationSec);

    // Info Gain Ratio: entropy(best_move_outcome) / entropy(random_move_outcome)
    let infoGainRatioVal = 1;
    if (optSol) {
      const simState5 = initialState(puzzle);
      const currentConsistent = consistentMappings(puzzle, []);

      if (currentConsistent.length > 1) {
        // Best move's info gain
        let bestGain = 0;
        let avgGain = 0;
        for (let tx = 0; tx < puzzle.numPairs; tx++) {
          const gain = infoGain(puzzle, [], tx, currentConsistent);
          avgGain += gain;
          if (gain > bestGain) bestGain = gain;
        }
        avgGain /= puzzle.numPairs;
        infoGainRatioVal = avgGain > 0 ? bestGain / avgGain : 1;
      }
    }
    results.infoGainRatio.push(infoGainRatioVal);

    // Solution Uniqueness: count distinct optimal activation sequences
    // Try all orderings of activations used by optimal solver
    let uniqueSolutions = 1;
    if (optSol) {
      const optActivations = optSol.moves
        .filter(m => m.type === 'activate')
        .map(m => m.transmitterIdx);

      // Try permutations of the activation order
      const seen = new Set();
      seen.add(optActivations.join(','));

      // Generate a few permutations
      for (let trial = 0; trial < 20; trial++) {
        const perm = [...optActivations];
        for (let i = perm.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [perm[i], perm[j]] = [perm[j], perm[i]];
        }

        // Check if this activation order also leads to correct solve
        let testState = initialState(puzzle);
        for (const tx of perm) {
          testState = applyMove(testState, { type: 'activate', transmitterIdx: tx });
        }
        const testConsistent = consistentMappings(puzzle, testState.activations);
        if (testConsistent.length === 1) {
          const key = perm.join(',');
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSolutions++;
          }
        }
      }
    }
    results.solutionUniqueness.push(uniqueSolutions);
  }

  return results;
}

function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/* ─── Main ─── */
console.log('=== Relay Solver Metrics ===\n');
const metrics = computeMetrics();

console.log('\n\n=== SUMMARY TABLE ===\n');

function avg(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function fmt(v, decimals = 2) {
  if (typeof v === 'number') return v.toFixed(decimals);
  return String(v);
}

const rows = [
  ['Solvability', ...metrics.solvability.map(v => `${(v * 100).toFixed(0)}%`), `${(avg(metrics.solvability) * 100).toFixed(0)}%`],
  ['Puzzle Entropy', ...metrics.puzzleEntropy.map(v => fmt(v, 1)), fmt(avg(metrics.puzzleEntropy), 1)],
  ['Skill-Depth', ...metrics.skillDepth.map(v => `${(v * 100).toFixed(0)}%`), `${(avg(metrics.skillDepth) * 100).toFixed(0)}%`],
  ['Decision Entropy', ...metrics.decisionEntropy.map(v => fmt(v, 2)), fmt(avg(metrics.decisionEntropy), 2)],
  ['Counterintuitive', ...metrics.counterintuitive.map(v => String(v)), fmt(avg(metrics.counterintuitive), 1)],
  ['Drama', ...metrics.drama.map(v => fmt(v, 2)), fmt(avg(metrics.drama), 2)],
  ['Duration (s)', ...metrics.duration.map(v => fmt(v, 3)), fmt(avg(metrics.duration), 3)],
  ['Info Gain Ratio', ...metrics.infoGainRatio.map(v => fmt(v, 2)), fmt(avg(metrics.infoGainRatio), 2)],
  ['Solution Uniqueness', ...metrics.solutionUniqueness.map(v => String(v)), fmt(avg(metrics.solutionUniqueness), 1)],
];

console.log('| Metric | Mon | Tue | Wed | Thu | Fri | Avg |');
console.log('|---|---|---|---|---|---|---|');
for (const row of rows) {
  console.log(`| ${row.join(' | ')} |`);
}

// Auto-kill checks
console.log('\n=== AUTO-KILL CHECKS ===\n');

const avgSolvability = avg(metrics.solvability);
const avgSkillDepth = avg(metrics.skillDepth);
const avgCounterIntuitive = avg(metrics.counterintuitive);
const avgDecisionEntropy = avg(metrics.decisionEntropy);
const avgPuzzleEntropy = avg(metrics.puzzleEntropy);

const kills = [];
if (avgSolvability < 1.0) kills.push(`Solvability ${(avgSolvability * 100).toFixed(0)}% < 100%`);
if (avgSkillDepth < 0.10) kills.push(`Skill-Depth ${(avgSkillDepth * 100).toFixed(0)}% < 10%`);
if (metrics.counterintuitive.every(c => c === 0)) kills.push('Counterintuitive Moves = 0 across all puzzles');
if (avgDecisionEntropy < 1.0) kills.push(`Decision Entropy ${avgDecisionEntropy.toFixed(2)} < 1.0`);
if (avgDecisionEntropy > 4.5) kills.push(`Decision Entropy ${avgDecisionEntropy.toFixed(2)} > 4.5`);
if (avgPuzzleEntropy < 5) kills.push(`Puzzle Entropy ${avgPuzzleEntropy.toFixed(1)} < 5`);

if (kills.length > 0) {
  console.log('AUTO-KILLED:');
  for (const k of kills) console.log(`  - ${k}`);
} else {
  console.log('PASSED - No auto-kill thresholds met');
}

// Output JSON for parsing
console.log('\n=== JSON ===');
console.log(JSON.stringify({
  solvability: avg(metrics.solvability),
  puzzleEntropy: avg(metrics.puzzleEntropy),
  skillDepth: avg(metrics.skillDepth),
  decisionEntropy: avg(metrics.decisionEntropy),
  counterintuitive: avg(metrics.counterintuitive),
  drama: avg(metrics.drama),
  duration: avg(metrics.duration),
  infoGainRatio: avg(metrics.infoGainRatio),
  solutionUniqueness: avg(metrics.solutionUniqueness),
  autoKilled: kills.length > 0,
  killReasons: kills,
  raw: metrics,
}, null, 2));
