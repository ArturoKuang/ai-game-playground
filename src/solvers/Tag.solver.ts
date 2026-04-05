/**
 * Tag Solver — Hash Map (Duplicate Detection)
 *
 * Numbered tiles arrive one at a time. Player can "stamp" each tile's
 * number into a registry (hash set) for free future lookups, or skip
 * and manually scan for duplicates (costs 1 action per comparison).
 * Tag all duplicates within the action budget.
 *
 * The hash map insight: stamping everything upfront (O(n) actions) is
 * far more efficient than scanning (O(n^2) comparisons).
 */

/* ─── Types ─── */

export type TagState = {
  arrived: number[];        // tile values that have arrived (on the board)
  incoming: number[];       // tile values still to arrive (front = next)
  registry: Set<number>;    // stamped numbers (hash set)
  registryCapacity: number; // max registry slots (Infinity = unlimited)
  tagged: Set<number>;      // global indices tagged as duplicates
  scanConfirmed: Set<number>; // global indices confirmed as dup via scan
  duplicateIndices: number[];// global indices of actual duplicate tiles (second occurrence)
  actions: number;          // actions used
  budget: number;           // max actions
  difficulty: number;       // 1-5
  stampCost: number;        // current cost to stamp (escalates at Level 5)
  stampCount: number;       // how many stamps done (for cost escalation)
  sequence: number[];       // full tile sequence, immutable reference
};

export type Move =
  | { type: 'stamp'; tileIndex: number }    // stamp tile's value into registry
  | { type: 'scan'; tileIndex1: number; tileIndex2: number } // compare two tiles (1 action)
  | { type: 'tag'; tileIndex: number }      // tag a tile as duplicate (free if correct)
  | { type: 'next' };                       // advance to next incoming tile (free)

export type Solution = {
  moves: Move[];
  steps: number;
  stampActions: number;     // count of stamp actions
  scanActions: number;      // count of scan actions
  freeMatches: number;      // count of registry auto-matches (tagging via registry)
  algorithmAligned: number; // stamp + free-match count
  totalNonTagActions: number; // stamp + scan actions (not tag, not next)
};

/* ─── PRNG ─── */

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

/* ─── Difficulty Config ─── */

type DiffConfig = {
  tileCount: number;
  duplicateCount: number;
  registryCapacity: number; // Infinity = unlimited
  budgetMultiplier: number; // budget = multiplier * stampAllCost
  stampEscalation: number;  // 0 = flat, 0.5 = +0.5 per stamp
};

function getDiffConfig(difficulty: number): DiffConfig {
  switch (difficulty) {
    case 1:  return { tileCount: 6,  duplicateCount: 2, registryCapacity: Infinity, budgetMultiplier: 5.0, stampEscalation: 0 };
    case 2:  return { tileCount: 10, duplicateCount: 3, registryCapacity: Infinity, budgetMultiplier: 3.0, stampEscalation: 0 };
    case 3:  return { tileCount: 15, duplicateCount: 5, registryCapacity: 10,       budgetMultiplier: 2.0, stampEscalation: 0 };
    case 4:  return { tileCount: 20, duplicateCount: 6, registryCapacity: 12,       budgetMultiplier: 1.5, stampEscalation: 0 };
    case 5:  return { tileCount: 25, duplicateCount: 8, registryCapacity: 15,       budgetMultiplier: 1.2, stampEscalation: 0.5 };
    default: return { tileCount: 6,  duplicateCount: 2, registryCapacity: Infinity, budgetMultiplier: 5.0, stampEscalation: 0 };
  }
}

function stampCostAt(stampCount: number, escalation: number): number {
  return 1 + stampCount * escalation;
}

function totalStampAllCost(n: number, escalation: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += stampCostAt(i, escalation);
  }
  return total;
}

/* ─── Helpers ─── */

/** Convert local arrived-array index to global sequence index */
function toGlobalIndex(state: TagState, arrivedIndex: number): number {
  return state.sequence.length - state.incoming.length - state.arrived.length + arrivedIndex;
}

/* ─── Puzzle Generation ─── */

export function generatePuzzle(seed: number, difficulty: number): TagState {
  const rng = makeRng(seed);
  const config = getDiffConfig(difficulty);
  const { tileCount, duplicateCount, registryCapacity, budgetMultiplier, stampEscalation } = config;

  const uniqueCount = tileCount - duplicateCount;

  for (let attempt = 0; attempt < 200; attempt++) {
    const valuePool = new Set<number>();
    while (valuePool.size < uniqueCount) {
      valuePool.add(Math.floor(rng() * 50) + 1);
    }
    const uniqueValues = Array.from(valuePool);

    // Pick which values to duplicate
    const shuffled = [...uniqueValues];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const duplicatedValues = shuffled.slice(0, duplicateCount);

    // Build sequence: one of each unique + one extra of each duplicated
    const sequence: number[] = [...uniqueValues, ...duplicatedValues];

    // Shuffle
    for (let i = sequence.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
    }

    // Ensure duplicates are non-adjacent
    for (let round = 0; round < 20; round++) {
      let clean = true;
      for (let i = 0; i < sequence.length - 1; i++) {
        if (sequence[i] === sequence[i + 1]) {
          const candidates: number[] = [];
          for (let j = 0; j < sequence.length; j++) {
            if (Math.abs(j - i) > 1 && Math.abs(j - (i + 1)) > 1) candidates.push(j);
          }
          if (candidates.length > 0) {
            const swapIdx = candidates[Math.floor(rng() * candidates.length)];
            [sequence[i + 1], sequence[swapIdx]] = [sequence[swapIdx], sequence[i + 1]];
            clean = false;
          }
        }
      }
      if (clean) break;
    }

    // Identify duplicate indices (second occurrence)
    const duplicateIndices: number[] = [];
    const seen = new Set<number>();
    for (let i = 0; i < sequence.length; i++) {
      if (seen.has(sequence[i])) {
        duplicateIndices.push(i);
      }
      seen.add(sequence[i]);
    }
    if (duplicateIndices.length !== duplicateCount) continue;

    // Budget = multiplier * stamp-all cost
    const stampAllCost = totalStampAllCost(tileCount, stampEscalation);
    const budget = Math.max(
      duplicateCount + 2,
      Math.ceil(stampAllCost * budgetMultiplier),
    );

    return {
      arrived: [],
      incoming: [...sequence],
      registry: new Set<number>(),
      registryCapacity,
      tagged: new Set<number>(),
      scanConfirmed: new Set<number>(),
      duplicateIndices,
      actions: 0,
      budget,
      difficulty,
      stampCost: stampCostAt(0, stampEscalation),
      stampCount: 0,
      sequence,
    };
  }

  // Fallback
  const sequence = [3, 7, 5, 3, 9, 7];
  return {
    arrived: [],
    incoming: [...sequence],
    registry: new Set<number>(),
    registryCapacity: Infinity,
    tagged: new Set<number>(),
    scanConfirmed: new Set<number>(),
    duplicateIndices: [3, 5],
    actions: 0,
    budget: 30,
    difficulty,
    stampCost: 1,
    stampCount: 0,
    sequence,
  };
}

/* ─── Game Logic ─── */

export function legalMoves(state: TagState): Move[] {
  const moves: Move[] = [];

  // 'next' — free, if tiles remain
  if (state.incoming.length > 0) {
    moves.push({ type: 'next' });
  }

  // 'stamp' — any arrived tile whose value is NOT in registry, if capacity + budget allow
  if (state.registry.size < state.registryCapacity) {
    const stampCeil = Math.ceil(state.stampCost);
    for (let i = 0; i < state.arrived.length; i++) {
      if (!state.registry.has(state.arrived[i]) && state.actions + stampCeil <= state.budget) {
        moves.push({ type: 'stamp', tileIndex: i });
      }
    }
  }

  // 'scan' — any two arrived, non-tagged tiles (costs 1 action)
  if (state.actions < state.budget) {
    for (let i = 0; i < state.arrived.length; i++) {
      const gi = toGlobalIndex(state, i);
      if (state.tagged.has(gi)) continue;
      for (let j = i + 1; j < state.arrived.length; j++) {
        const gj = toGlobalIndex(state, j);
        if (state.tagged.has(gj)) continue;
        moves.push({ type: 'scan', tileIndex1: i, tileIndex2: j });
      }
    }
  }

  // 'tag' — free, for tiles confirmed as duplicates via registry OR scan
  for (let i = 0; i < state.arrived.length; i++) {
    const gi = toGlobalIndex(state, i);
    if (state.tagged.has(gi)) continue;
    if (!state.duplicateIndices.includes(gi)) continue;

    // Evidence: registry contains this value (auto-detect via O(1) lookup)
    //        OR scan has confirmed this index
    if (state.registry.has(state.arrived[i]) || state.scanConfirmed.has(gi)) {
      moves.push({ type: 'tag', tileIndex: i });
    }
  }

  return moves;
}

export function applyMove(state: TagState, move: Move): TagState {
  const next: TagState = {
    ...state,
    arrived: [...state.arrived],
    incoming: [...state.incoming],
    registry: new Set(state.registry),
    tagged: new Set(state.tagged),
    scanConfirmed: new Set(state.scanConfirmed),
    duplicateIndices: state.duplicateIndices,
    sequence: state.sequence,
  };

  switch (move.type) {
    case 'next': {
      if (next.incoming.length === 0) break;
      const tile = next.incoming.shift()!;
      next.arrived.push(tile);
      // If this value is in registry, the tag will become available via legalMoves
      break;
    }

    case 'stamp': {
      const value = next.arrived[move.tileIndex];
      if (value === undefined) break;
      if (next.registry.has(value)) break;
      if (next.registry.size >= next.registryCapacity) break;

      const cost = Math.ceil(next.stampCost);
      if (next.actions + cost > next.budget) break;

      next.registry.add(value);
      next.actions += cost;
      next.stampCount += 1;

      const config = getDiffConfig(next.difficulty);
      next.stampCost = stampCostAt(next.stampCount, config.stampEscalation);
      break;
    }

    case 'scan': {
      // Compare two tiles — costs 1 action
      next.actions += 1;

      // If the two tiles have the same value, mark the second-occurrence as scan-confirmed
      const val1 = next.arrived[move.tileIndex1];
      const val2 = next.arrived[move.tileIndex2];
      if (val1 === val2) {
        const g1 = toGlobalIndex(next, move.tileIndex1);
        const g2 = toGlobalIndex(next, move.tileIndex2);
        // Whichever is the "duplicate index" gets confirmed
        if (next.duplicateIndices.includes(g1)) next.scanConfirmed.add(g1);
        if (next.duplicateIndices.includes(g2)) next.scanConfirmed.add(g2);
      }
      break;
    }

    case 'tag': {
      const gi = toGlobalIndex(next, move.tileIndex);
      if (next.duplicateIndices.includes(gi)) {
        next.tagged.add(gi);
      }
      break;
    }
  }

  return next;
}

export function isGoal(state: TagState): boolean {
  return state.incoming.length === 0 &&
    state.duplicateIndices.every(idx => state.tagged.has(idx));
}

export function heuristic(state: TagState): number {
  const untagged = state.duplicateIndices.filter(idx => !state.tagged.has(idx)).length;
  const remaining = state.incoming.length;

  let h = untagged * 3;
  h += remaining * 0.5;

  const budgetRemaining = state.budget - state.actions;
  if (budgetRemaining < untagged * 2) {
    h += (untagged * 2 - budgetRemaining) * 2;
  }

  const arrivedCount = state.arrived.length;
  const registryCoverage = arrivedCount > 0 ? state.registry.size / arrivedCount : 0;
  h -= registryCoverage * 2;

  return Math.max(0, h);
}

/* ─── Solvers ─── */

export function solve(
  puzzle: TagState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1: return solveRandom(puzzle);
    case 2: return solveScanOnly(puzzle);
    case 3: return solveStampThenScan(puzzle);
    case 4: return solveStampAll(puzzle);
    case 5: return solveOptimal(puzzle);
  }
}

function cloneState(s: TagState): TagState {
  return {
    ...s,
    arrived: [...s.arrived],
    incoming: [...s.incoming],
    registry: new Set(s.registry),
    tagged: new Set(s.tagged),
    scanConfirmed: new Set(s.scanConfirmed),
    duplicateIndices: s.duplicateIndices,
    sequence: s.sequence,
  };
}

function makeSolution(
  moves: Move[], stampActions: number, scanActions: number, freeMatches: number,
): Solution {
  const totalNonTagActions = stampActions + scanActions;
  return {
    moves,
    steps: moves.length,
    stampActions,
    scanActions,
    freeMatches,
    algorithmAligned: stampActions + freeMatches,
    totalNonTagActions,
  };
}

/* ─── helpers for solvers ─── */

function drainTags(state: TagState, moveList: Move[]): { state: TagState; freeMatches: number } {
  let s = state;
  let fm = 0;
  let found = true;
  while (found) {
    found = false;
    const tags = legalMoves(s).filter(m => m.type === 'tag');
    if (tags.length > 0) {
      const t = tags[0];
      // Was this via registry?
      if (t.type === 'tag' && s.registry.has(s.arrived[t.tileIndex])) fm++;
      moveList.push(t);
      s = applyMove(s, t);
      found = true;
    }
  }
  return { state: s, freeMatches: fm };
}

/**
 * Level 1: Random — stamp sometimes, scan sometimes, tag when possible.
 */
function solveRandom(puzzle: TagState): Solution | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = makeRng(42 + attempt * 97);
    let state = cloneState(puzzle);
    const moveList: Move[] = [];
    let stamps = 0, scans = 0, freeMatches = 0;

    for (let step = 0; step < 500; step++) {
      if (isGoal(state)) break;

      // Drain tags
      const dr = drainTags(state, moveList);
      state = dr.state; freeMatches += dr.freeMatches;
      if (isGoal(state)) break;

      const legal = legalMoves(state);
      if (legal.length === 0) break;

      // Advance if incoming
      const nexts = legal.filter(m => m.type === 'next');
      if (nexts.length > 0 && (state.arrived.length === 0 || rng() < 0.6)) {
        moveList.push(nexts[0]);
        state = applyMove(state, nexts[0]);
        continue;
      }

      // Random stamp or scan
      const nonNext = legal.filter(m => m.type !== 'next' && m.type !== 'tag');
      if (nonNext.length > 0) {
        const m = nonNext[Math.floor(rng() * nonNext.length)];
        moveList.push(m);
        if (m.type === 'stamp') stamps++;
        if (m.type === 'scan') scans++;
        state = applyMove(state, m);
      } else if (nexts.length > 0) {
        moveList.push(nexts[0]);
        state = applyMove(state, nexts[0]);
      } else {
        break;
      }
    }

    if (isGoal(state)) {
      return makeSolution(moveList, stamps, scans, freeMatches);
    }
  }
  return null;
}

/**
 * Level 2: Scan-only — advance all tiles, then scan pairs to find duplicates.
 * O(n^2) actions. Works at easy levels but exceeds budget at medium+.
 */
function solveScanOnly(puzzle: TagState): Solution | null {
  let state = cloneState(puzzle);
  const moveList: Move[] = [];
  let stamps = 0, scans = 0, freeMatches = 0;

  // Phase 1: advance all tiles
  while (state.incoming.length > 0) {
    moveList.push({ type: 'next' });
    state = applyMove(state, { type: 'next' });
  }

  // Phase 2: scan every pair until we find all duplicates
  // We scan systematically: for each tile i, compare with every tile j > i
  const scannedPairs = new Set<string>();

  for (let step = 0; step < 5000; step++) {
    if (isGoal(state)) break;

    // Drain tags
    const dr = drainTags(state, moveList);
    state = dr.state; freeMatches += dr.freeMatches;
    if (isGoal(state)) break;

    // Find next unscanned pair
    let foundPair = false;
    for (let i = 0; i < state.arrived.length && !foundPair; i++) {
      const gi = toGlobalIndex(state, i);
      if (state.tagged.has(gi)) continue;
      for (let j = i + 1; j < state.arrived.length && !foundPair; j++) {
        const gj = toGlobalIndex(state, j);
        if (state.tagged.has(gj)) continue;
        const key = `${i}:${j}`;
        if (scannedPairs.has(key)) continue;
        scannedPairs.add(key);

        if (state.actions >= state.budget) break;

        const m: Move = { type: 'scan', tileIndex1: i, tileIndex2: j };
        moveList.push(m);
        scans++;
        state = applyMove(state, m);
        foundPair = true;
      }
    }

    if (!foundPair) break;
  }

  if (isGoal(state)) {
    return makeSolution(moveList, stamps, scans, freeMatches);
  }
  return null;
}

/**
 * Level 3: Stamp-then-scan — advance all, then stamp all, then tag via registry.
 */
function solveStampThenScan(puzzle: TagState): Solution | null {
  let state = cloneState(puzzle);
  const moveList: Move[] = [];
  let stamps = 0, scans = 0, freeMatches = 0;

  // Phase 1: advance all
  while (state.incoming.length > 0) {
    moveList.push({ type: 'next' });
    state = applyMove(state, { type: 'next' });
  }

  // Phase 2: stamp all (that fit)
  for (let i = 0; i < state.arrived.length; i++) {
    if (isGoal(state)) break;

    // Drain tags
    const dr = drainTags(state, moveList);
    state = dr.state; freeMatches += dr.freeMatches;
    if (isGoal(state)) break;

    if (state.registry.has(state.arrived[i])) continue;
    if (state.registry.size >= state.registryCapacity) break;
    if (state.actions + Math.ceil(state.stampCost) > state.budget) break;

    moveList.push({ type: 'stamp', tileIndex: i });
    stamps++;
    state = applyMove(state, { type: 'stamp', tileIndex: i });
  }

  // Final drain
  const dr = drainTags(state, moveList);
  state = dr.state; freeMatches += dr.freeMatches;

  if (isGoal(state)) {
    return makeSolution(moveList, stamps, scans, freeMatches);
  }
  return null;
}

/**
 * Level 4: Stamp-all — stamp each tile as it arrives, auto-detect duplicates
 * via registry hits. O(n) actions. This IS the hash set approach.
 */
function solveStampAll(puzzle: TagState): Solution | null {
  let state = cloneState(puzzle);
  const moveList: Move[] = [];
  let stamps = 0, scans = 0, freeMatches = 0;

  for (let step = 0; step < 500; step++) {
    if (isGoal(state)) break;

    // Drain tags
    const dr = drainTags(state, moveList);
    state = dr.state; freeMatches += dr.freeMatches;
    if (isGoal(state)) break;

    // Advance
    if (state.incoming.length > 0) {
      moveList.push({ type: 'next' });
      state = applyMove(state, { type: 'next' });

      // Stamp newly arrived tile
      const idx = state.arrived.length - 1;
      if (!state.registry.has(state.arrived[idx]) &&
          state.registry.size < state.registryCapacity &&
          state.actions + Math.ceil(state.stampCost) <= state.budget) {
        moveList.push({ type: 'stamp', tileIndex: idx });
        stamps++;
        state = applyMove(state, { type: 'stamp', tileIndex: idx });
      }
    } else {
      // Stamp any remaining
      let stamped = false;
      for (let i = 0; i < state.arrived.length; i++) {
        if (!state.registry.has(state.arrived[i]) &&
            state.registry.size < state.registryCapacity &&
            state.actions + Math.ceil(state.stampCost) <= state.budget) {
          moveList.push({ type: 'stamp', tileIndex: i });
          stamps++;
          state = applyMove(state, { type: 'stamp', tileIndex: i });
          stamped = true;
          break;
        }
      }
      if (!stamped) break;
    }
  }

  // Final drain
  const dr = drainTags(state, moveList);
  state = dr.state; freeMatches += dr.freeMatches;

  if (isGoal(state)) {
    return makeSolution(moveList, stamps, scans, freeMatches);
  }
  return null;
}

/**
 * Level 5: Optimal — stamp selectively (only values with duplicates).
 * Saves budget by not stamping unique values.
 */
function solveOptimal(puzzle: TagState): Solution | null {
  let state = cloneState(puzzle);
  const moveList: Move[] = [];
  let stamps = 0, scans = 0, freeMatches = 0;

  // Oracle: knows which values have duplicates
  const valueCounts = new Map<number, number>();
  for (const v of state.sequence) {
    valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
  }
  const dupValues = new Set<number>();
  for (const [v, c] of valueCounts) {
    if (c > 1) dupValues.add(v);
  }

  for (let step = 0; step < 500; step++) {
    if (isGoal(state)) break;

    // Drain tags
    const dr = drainTags(state, moveList);
    state = dr.state; freeMatches += dr.freeMatches;
    if (isGoal(state)) break;

    // Advance
    if (state.incoming.length > 0) {
      moveList.push({ type: 'next' });
      state = applyMove(state, { type: 'next' });

      // Only stamp if this value has a duplicate
      const idx = state.arrived.length - 1;
      const val = state.arrived[idx];
      if (dupValues.has(val) && !state.registry.has(val) &&
          state.registry.size < state.registryCapacity &&
          state.actions + Math.ceil(state.stampCost) <= state.budget) {
        moveList.push({ type: 'stamp', tileIndex: idx });
        stamps++;
        state = applyMove(state, { type: 'stamp', tileIndex: idx });
      }
    } else {
      // Stamp any remaining duplicate values
      let stamped = false;
      for (let i = 0; i < state.arrived.length; i++) {
        const v = state.arrived[i];
        if (dupValues.has(v) && !state.registry.has(v) &&
            state.registry.size < state.registryCapacity &&
            state.actions + Math.ceil(state.stampCost) <= state.budget) {
          moveList.push({ type: 'stamp', tileIndex: i });
          stamps++;
          state = applyMove(state, { type: 'stamp', tileIndex: i });
          stamped = true;
          break;
        }
      }
      if (!stamped) break;
    }
  }

  // Final drain
  const dr = drainTags(state, moveList);
  state = dr.state; freeMatches += dr.freeMatches;

  if (isGoal(state)) {
    return makeSolution(moveList, stamps, scans, freeMatches);
  }
  return null;
}
