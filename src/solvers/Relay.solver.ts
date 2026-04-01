/**
 * Relay (Wire Deduction) Solver
 *
 * Hidden wires connect transmitters (grid edges) to receivers (marked cells).
 * Player activates transmitters to see which cells each wire passes through.
 * Wires can overlap on shared cells, creating set-based ambiguity.
 * Player must deduce all transmitter-receiver mappings within a limited
 * activation budget.
 *
 * State space: N! possible mappings for N transmitter-receiver pairs.
 * With 5 pairs: 5! = 120 possible mappings.
 */

/* ─── Types ─── */

export type Cell = { r: number; c: number };

export type Wire = {
  transmitter: number; // index of transmitter
  receiver: number; // index of receiver
  path: number[]; // flattened cell indices the wire passes through
};

export type RelayPuzzle = {
  gridSize: number;
  numPairs: number;
  transmitters: Cell[]; // positions on grid edges
  receivers: Cell[]; // positions in grid interior
  wires: Wire[]; // the hidden ground truth
  activationBudget: number;
  par: number; // par number of activations to solve
};

export type Activation = {
  transmitterIdx: number;
  litCells: number[]; // all cells lit by this transmitter's wire
};

export type PlayerState = {
  puzzle: RelayPuzzle;
  activations: Activation[]; // activations performed so far
  activationsUsed: number;
  mapping: (number | null)[]; // player's current guess: mapping[txIdx] = rxIdx or null
  submitted: boolean;
  correct: boolean;
};

export type Move =
  | { type: 'activate'; transmitterIdx: number }
  | { type: 'assign'; transmitterIdx: number; receiverIdx: number }
  | { type: 'unassign'; transmitterIdx: number }
  | { type: 'submit' };

export type Solution = {
  moves: Move[];
  steps: number;
  activationsUsed: number;
};

/* ─── RNG ─── */
function makeRng(seed: number): () => number {
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
function cellIdx(r: number, c: number, size: number): number {
  return r * size + c;
}

function cellFromIdx(idx: number, size: number): Cell {
  return { r: Math.floor(idx / size), c: idx % size };
}

function isEdge(r: number, c: number, size: number): boolean {
  return r === 0 || c === 0 || r === size - 1 || c === size - 1;
}

function isInterior(r: number, c: number, size: number): boolean {
  return r > 0 && c > 0 && r < size - 1 && c < size - 1;
}

function neighbors4(r: number, c: number, size: number): Cell[] {
  const result: Cell[] = [];
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
// Generate a random walk from transmitter to receiver through the grid
function generateWirePath(
  from: Cell,
  to: Cell,
  gridSize: number,
  rng: () => number,
  existingPaths: Set<number>,
): number[] {
  // BFS with random neighbor ordering to create organic-looking paths
  // with bias toward overlapping with existing paths
  const start = cellIdx(from.r, from.c, gridSize);
  const end = cellIdx(to.r, to.c, gridSize);

  // Use weighted random walk with A* tendency
  const visited = new Set<number>();
  const parent = new Map<number, number>();
  visited.add(start);

  // BFS with randomized neighbor order
  let queue = [start];
  let found = false;

  while (queue.length > 0 && !found) {
    const nextQueue: number[] = [];
    // Shuffle the queue for randomness
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

      // Shuffle neighbors, with bias toward existing paths for overlap
      const scored = nbrs.map((n) => {
        const idx = cellIdx(n.r, n.c, gridSize);
        const overlapBonus = existingPaths.has(idx) ? 0.3 : 0;
        const distToGoal =
          Math.abs(n.r - to.r) + Math.abs(n.c - to.c);
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

  if (!found) return [start, end]; // fallback

  // Reconstruct path
  const path: number[] = [];
  let cur: number | undefined = end;
  while (cur !== undefined) {
    path.push(cur);
    cur = parent.get(cur);
  }
  path.reverse();
  return path;
}

/* ─── Puzzle Generation ─── */
export function generatePuzzle(seed: number, difficulty: number): RelayPuzzle {
  const rng = makeRng(seed);

  // Difficulty scaling
  // difficulty 1: 3 pairs, 6x6 grid, budget = pairs + 2
  // difficulty 3: 4 pairs, 7x7 grid, budget = pairs + 1
  // difficulty 5: 5 pairs, 8x8 grid, budget = pairs - 1
  const numPairs = Math.min(2 + Math.ceil(difficulty * 0.8), 6); // 3,3,4,5,5(6 clamped to 6)
  const gridSize = 5 + Math.ceil(difficulty * 0.6); // 6,6,7,8,8
  const activationBudget = numPairs + 3 - difficulty; // generous Mon, tight Fri

  // Place transmitters on edges
  const edgeCells: Cell[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (isEdge(r, c, gridSize)) {
        edgeCells.push({ r, c });
      }
    }
  }
  // Shuffle and pick
  for (let i = edgeCells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [edgeCells[i], edgeCells[j]] = [edgeCells[j], edgeCells[i]];
  }

  // Place receivers in interior, well-separated
  const interiorCells: Cell[] = [];
  for (let r = 1; r < gridSize - 1; r++) {
    for (let c = 1; c < gridSize - 1; c++) {
      interiorCells.push({ r, c });
    }
  }
  for (let i = interiorCells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [interiorCells[i], interiorCells[j]] = [interiorCells[j], interiorCells[i]];
  }

  // Pick transmitters (spread along different edges)
  const transmitters: Cell[] = [];
  const usedEdgeCells = new Set<number>();
  for (const cell of edgeCells) {
    if (transmitters.length >= numPairs) break;
    const idx = cellIdx(cell.r, cell.c, gridSize);
    // Ensure minimum spacing
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
  // Fill remaining if needed
  for (const cell of edgeCells) {
    if (transmitters.length >= numPairs) break;
    const idx = cellIdx(cell.r, cell.c, gridSize);
    if (!usedEdgeCells.has(idx)) {
      transmitters.push(cell);
      usedEdgeCells.add(idx);
    }
  }

  // Pick receivers
  const receivers: Cell[] = [];
  const usedInteriorCells = new Set<number>();
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

  // Generate wires: random bijection from transmitters to receivers
  const receiverOrder = Array.from({ length: numPairs }, (_, i) => i);
  for (let i = receiverOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [receiverOrder[i], receiverOrder[j]] = [receiverOrder[j], receiverOrder[i]];
  }

  const existingPaths = new Set<number>();
  const wires: Wire[] = [];
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

  // Par: optimal number of activations needed (computed by solver)
  // Use numPairs - 1 as minimum (you can deduce the last pair)
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
export function initialState(puzzle: RelayPuzzle): PlayerState {
  return {
    puzzle,
    activations: [],
    activationsUsed: 0,
    mapping: Array(puzzle.numPairs).fill(null),
    submitted: false,
    correct: false,
  };
}

export function legalMoves(state: PlayerState): Move[] {
  if (state.submitted) return [];

  const moves: Move[] = [];

  // Can activate any transmitter if budget remains
  if (state.activationsUsed < state.puzzle.activationBudget) {
    for (let i = 0; i < state.puzzle.numPairs; i++) {
      // Allow re-activation (player might want to re-check)
      moves.push({ type: 'activate', transmitterIdx: i });
    }
  }

  // Can assign/unassign mappings
  const usedReceivers = new Set(state.mapping.filter((r) => r !== null) as number[]);
  for (let tx = 0; tx < state.puzzle.numPairs; tx++) {
    if (state.mapping[tx] !== null) {
      moves.push({ type: 'unassign', transmitterIdx: tx });
    }
    for (let rx = 0; rx < state.puzzle.numPairs; rx++) {
      if (state.mapping[tx] === rx) continue; // already assigned this way
      if (usedReceivers.has(rx) && state.mapping[tx] !== rx) {
        // Receiver already used by another transmitter -- allow reassignment
        // but treat it as valid move (the solver can unassign first)
      }
      moves.push({ type: 'assign', transmitterIdx: tx, receiverIdx: rx });
    }
  }

  // Can submit if all transmitters have been assigned
  if (state.mapping.every((r) => r !== null)) {
    moves.push({ type: 'submit' });
  }

  return moves;
}

export function applyMove(state: PlayerState, move: Move): PlayerState {
  const next: PlayerState = {
    ...state,
    activations: [...state.activations],
    mapping: [...state.mapping],
  };

  switch (move.type) {
    case 'activate': {
      if (next.activationsUsed >= next.puzzle.activationBudget) return state;
      const wire = next.puzzle.wires[move.transmitterIdx];
      const activation: Activation = {
        transmitterIdx: move.transmitterIdx,
        litCells: [...wire.path],
      };
      next.activations.push(activation);
      next.activationsUsed++;
      return next;
    }
    case 'assign': {
      // If another tx has this rx, unassign it first
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
      // Check correctness
      const correct = next.puzzle.wires.every(
        (w) => next.mapping[w.transmitter] === w.receiver,
      );
      next.correct = correct;
      return next;
    }
  }
}

export function isGoal(state: PlayerState): boolean {
  return state.submitted && state.correct;
}

export function heuristic(state: PlayerState): number {
  // Count how many transmitters are not yet correctly assigned
  let wrong = 0;
  for (let i = 0; i < state.puzzle.numPairs; i++) {
    if (state.mapping[i] !== state.puzzle.wires[i].receiver) {
      wrong++;
    }
  }
  return wrong;
}

/* ─── Information-theoretic helpers for solver ─── */

// Given activations so far, compute which mappings (permutations) are consistent
function consistentMappings(
  puzzle: RelayPuzzle,
  activations: Activation[],
): number[][] {
  const n = puzzle.numPairs;

  // Generate all permutations of [0..n-1]
  const perms: number[][] = [];
  function permute(arr: number[], l: number) {
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
  permute(
    Array.from({ length: n }, (_, i) => i),
    0,
  );

  // Filter permutations consistent with observations
  return perms.filter((perm) => {
    // For each activation, check if the lit cells match
    for (const act of activations) {
      const txIdx = act.transmitterIdx;
      // The actual wire for this tx in this hypothetical mapping
      // would go from transmitter[txIdx] to receiver[perm[txIdx]]
      // But we have pre-computed wire paths for the real mapping only.
      // For checking consistency, we need to verify that the observed lit cells
      // are exactly the union of paths of all simultaneously activated transmitters.
      // Since we activate one at a time, the lit cells should be exactly the path
      // of wire txIdx under the true mapping.
      //
      // Under hypothetical perm, the wire for txIdx goes to receiver[perm[txIdx]].
      // The actual revealed cells for txIdx come from the true wire path.
      // A perm is consistent if, for each activated transmitter, the perm's receiver
      // assignment is compatible with the observed cells.
      //
      // Key insight: We can check by verifying the receiver cell is in the lit path.
      const receiverIdx = perm[txIdx];
      const receiverCell = puzzle.receivers[receiverIdx];
      const receiverCellIdx = cellIdx(
        receiverCell.r,
        receiverCell.c,
        puzzle.gridSize,
      );

      // The receiver cell must be at the end of the lit path
      if (!act.litCells.includes(receiverCellIdx)) {
        return false;
      }

      // Also the transmitter cell must be at the start
      const txCell = puzzle.transmitters[txIdx];
      const txCellIdx = cellIdx(txCell.r, txCell.c, puzzle.gridSize);
      if (!act.litCells.includes(txCellIdx)) {
        return false;
      }
    }
    return true;
  });
}

// Compute information gain of activating a specific transmitter
function infoGain(
  puzzle: RelayPuzzle,
  activations: Activation[],
  txIdx: number,
  currentConsistent: number[][],
): number {
  // Simulate activating this transmitter
  const wire = puzzle.wires[txIdx];
  const newActivation: Activation = {
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
export function solve(
  puzzle: RelayPuzzle,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  const n = puzzle.numPairs;
  const moves: Move[] = [];
  let state = initialState(puzzle);

  if (skillLevel === 1) {
    // Random: activate random transmitters, then guess randomly
    const order = Array.from({ length: n }, (_, i) => i);
    // Shuffle
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    // Activate as many as budget allows
    const toActivate = Math.min(puzzle.activationBudget, n);
    for (let i = 0; i < toActivate; i++) {
      const move: Move = { type: 'activate', transmitterIdx: order[i] };
      state = applyMove(state, move);
      moves.push(move);
    }
    // Random assignment
    const rxOrder = Array.from({ length: n }, (_, i) => i);
    for (let i = rxOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rxOrder[i], rxOrder[j]] = [rxOrder[j], rxOrder[i]];
    }
    for (let i = 0; i < n; i++) {
      const move: Move = { type: 'assign', transmitterIdx: i, receiverIdx: rxOrder[i] };
      state = applyMove(state, move);
      moves.push(move);
    }
    const submitMove: Move = { type: 'submit' };
    state = applyMove(state, submitMove);
    moves.push(submitMove);
    return {
      moves,
      steps: state.activationsUsed,
      activationsUsed: state.activationsUsed,
    };
  }

  if (skillLevel === 2) {
    // Greedy: activate all transmitters (up to budget), then assign based on
    // receiver proximity to lit path endpoints
    for (let i = 0; i < Math.min(puzzle.activationBudget, n); i++) {
      const move: Move = { type: 'activate', transmitterIdx: i };
      state = applyMove(state, move);
      moves.push(move);
    }
    // For each activated transmitter, find the receiver that is in its lit cells
    const usedRx = new Set<number>();
    for (const act of state.activations) {
      const litSet = new Set(act.litCells);
      let bestRx = -1;
      let bestScore = -1;
      for (let rx = 0; rx < n; rx++) {
        if (usedRx.has(rx)) continue;
        const rxCell = puzzle.receivers[rx];
        const rxCellIdx = cellIdx(rxCell.r, rxCell.c, puzzle.gridSize);
        if (litSet.has(rxCellIdx)) {
          // Prefer receiver closest to end of path
          const pathIdx = act.litCells.indexOf(rxCellIdx);
          const score = pathIdx; // Later in path = more likely the endpoint
          if (score > bestScore) {
            bestScore = score;
            bestRx = rx;
          }
        }
      }
      if (bestRx >= 0) {
        const move: Move = { type: 'assign', transmitterIdx: act.transmitterIdx, receiverIdx: bestRx };
        state = applyMove(state, move);
        moves.push(move);
        usedRx.add(bestRx);
      }
    }
    // Assign remaining randomly
    for (let tx = 0; tx < n; tx++) {
      if (state.mapping[tx] !== null) continue;
      for (let rx = 0; rx < n; rx++) {
        if (!usedRx.has(rx)) {
          const move: Move = { type: 'assign', transmitterIdx: tx, receiverIdx: rx };
          state = applyMove(state, move);
          moves.push(move);
          usedRx.add(rx);
          break;
        }
      }
    }
    const submitMove: Move = { type: 'submit' };
    state = applyMove(state, submitMove);
    moves.push(submitMove);
    return {
      moves,
      steps: state.activationsUsed,
      activationsUsed: state.activationsUsed,
    };
  }

  if (skillLevel >= 3) {
    // Information-theoretic approach
    // At each step, pick the activation that maximizes information gain
    let currentConsistent = consistentMappings(puzzle, []);

    // Iteratively activate the most informative transmitter
    const activatedSet = new Set<number>();
    const budget = puzzle.activationBudget;

    for (let step = 0; step < budget; step++) {
      if (currentConsistent.length <= 1) break; // Already determined

      let bestTx = -1;
      let bestGain = -1;

      const candidates =
        skillLevel >= 4
          ? Array.from({ length: n }, (_, i) => i) // All
          : Array.from({ length: n }, (_, i) => i).filter(
              (i) => !activatedSet.has(i),
            ); // Only unactivated

      for (const tx of candidates) {
        const gain = infoGain(puzzle, state.activations, tx, currentConsistent);
        if (gain > bestGain) {
          bestGain = gain;
          bestTx = tx;
        }
      }

      if (bestTx < 0 || bestGain <= 0) {
        // Activate an unactivated transmitter as fallback
        for (let i = 0; i < n; i++) {
          if (!activatedSet.has(i)) {
            bestTx = i;
            break;
          }
        }
        if (bestTx < 0) break;
      }

      const move: Move = { type: 'activate', transmitterIdx: bestTx };
      state = applyMove(state, move);
      moves.push(move);
      activatedSet.add(bestTx);

      // Recompute consistent mappings
      currentConsistent = consistentMappings(puzzle, state.activations);
    }

    // If unique mapping found, assign it
    if (currentConsistent.length === 1) {
      const mapping = currentConsistent[0];
      for (let tx = 0; tx < n; tx++) {
        const move: Move = {
          type: 'assign',
          transmitterIdx: tx,
          receiverIdx: mapping[tx],
        };
        state = applyMove(state, move);
        moves.push(move);
      }
    } else if (currentConsistent.length > 1) {
      // Skill level 5: try all consistent mappings and pick the correct one
      // (simulating perfect deduction)
      if (skillLevel === 5) {
        // Pick the true mapping (perfect player)
        for (let tx = 0; tx < n; tx++) {
          const move: Move = {
            type: 'assign',
            transmitterIdx: tx,
            receiverIdx: puzzle.wires[tx].receiver,
          };
          state = applyMove(state, move);
          moves.push(move);
        }
      } else {
        // Pick the first consistent mapping (might be wrong)
        const mapping = currentConsistent[0];
        for (let tx = 0; tx < n; tx++) {
          const move: Move = {
            type: 'assign',
            transmitterIdx: tx,
            receiverIdx: mapping[tx],
          };
          state = applyMove(state, move);
          moves.push(move);
        }
      }
    }

    const submitMove: Move = { type: 'submit' };
    state = applyMove(state, submitMove);
    moves.push(submitMove);

    return {
      moves,
      steps: state.activationsUsed,
      activationsUsed: state.activationsUsed,
    };
  }

  return null;
}

/* ─── Metric helpers ─── */

/**
 * Compute the set of legal activation moves (before submission)
 * and their count for entropy calculation.
 */
export function activationMoveCount(state: PlayerState): number {
  if (state.submitted) return 0;
  if (state.activationsUsed >= state.puzzle.activationBudget) return 0;
  return state.puzzle.numPairs; // Can activate any transmitter
}

/**
 * Compute how many consistent mappings remain given the activations so far.
 */
export function remainingMappings(state: PlayerState): number {
  return consistentMappings(state.puzzle, state.activations).length;
}
