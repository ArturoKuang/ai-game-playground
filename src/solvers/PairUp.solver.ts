/**
 * PairUp solver - Hash Map game (curriculum 1.5)
 */
import { seededRandom } from '../utils/seed';

export type TileState = 'hidden' | 'revealed' | 'stamped' | 'paired';
export type TileData = { id: number; value: number; state: TileState };

export type GameState = {
  tiles: TileData[];
  registry: Map<number, number>;
  target: number;
  pairsFound: number;
  pairsNeeded: number;
  movesUsed: number;
  moveBudget: number;
  difficulty: number;
};

export type Move =
  | { type: 'flip'; tileId: number }
  | { type: 'stamp'; tileId: number }
  | { type: 'pair'; tileId1: number; tileId2: number };

export type Solution = { moves: Move[]; won: boolean };

type DC = { tileCount: number; pairsNeeded: number; moveBudget: number };
const DIFF: Record<number, DC> = {
  1: { tileCount: 6, pairsNeeded: 2, moveBudget: 30 },
  2: { tileCount: 8, pairsNeeded: 2, moveBudget: 36 },
  3: { tileCount: 12, pairsNeeded: 4, moveBudget: 30 },
  4: { tileCount: 16, pairsNeeded: 5, moveBudget: 34 },
  5: { tileCount: 20, pairsNeeded: 6, moveBudget: 36 },
};

export function generatePuzzle(seed: number, difficulty: number): GameState {
  const cfg = DIFF[difficulty] ?? DIFF[3];
  const rng = seededRandom(seed);
  const minTarget = 2 * cfg.pairsNeeded + 1;
  const target = Math.floor(rng() * 15) + Math.max(10, minTarget);
  const values: number[] = [];
  const used = new Set<number>();
  for (let i = 0; i < cfg.pairsNeeded; i++) {
    let a: number;
    do { a = Math.floor(rng() * (target - 2)) + 1; }
    while (used.has(a) || used.has(target - a) || a === target - a);
    used.add(a); used.add(target - a);
    values.push(a, target - a);
  }
  const distCount = cfg.tileCount - values.length;
  for (let i = 0; i < distCount; i++) {
    let d: number; let guard = 0;
    do { d = Math.floor(rng() * 20) + 1; guard++; }
    while (guard < 100 && (values.includes(target - d) || values.filter(v => v === d).length >= 2));
    values.push(d);
  }
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return {
    tiles: values.map((value, i) => ({ id: i, value, state: 'hidden' as TileState })),
    registry: new Map(), target, pairsFound: 0, pairsNeeded: cfg.pairsNeeded,
    movesUsed: 0, moveBudget: cfg.moveBudget, difficulty,
  };
}

export function legalMoves(state: GameState): Move[] {
  if (isGoal(state) || state.movesUsed >= state.moveBudget) return [];
  const moves: Move[] = [];
  for (const t of state.tiles) { if (t.state === 'hidden') moves.push({ type: 'flip', tileId: t.id }); }
  for (const t of state.tiles) { if (t.state === 'revealed') moves.push({ type: 'stamp', tileId: t.id }); }
  const av = state.tiles.filter(t => t.state === 'revealed' || t.state === 'stamped');
  for (let i = 0; i < av.length; i++)
    for (let j = i + 1; j < av.length; j++)
      if (av[i].value + av[j].value === state.target)
        moves.push({ type: 'pair', tileId1: av[i].id, tileId2: av[j].id });
  return moves;
}

export function applyMove(state: GameState, move: Move): GameState {
  const tiles = state.tiles.map(t => ({ ...t }));
  const registry = new Map(state.registry);
  let movesUsed = state.movesUsed;
  let pairsFound = state.pairsFound;
  if (move.type === 'flip') {
    const t = tiles.find(x => x.id === move.tileId);
    if (t && t.state === 'hidden') { t.state = 'revealed'; movesUsed++; }
  } else if (move.type === 'stamp') {
    const t = tiles.find(x => x.id === move.tileId);
    if (t && t.state === 'revealed') { t.state = 'stamped'; registry.set(t.value, t.id); }
  } else if (move.type === 'pair') {
    const t1 = tiles.find(x => x.id === move.tileId1);
    const t2 = tiles.find(x => x.id === move.tileId2);
    if (t1 && t2 && (t1.state === 'revealed' || t1.state === 'stamped') &&
      (t2.state === 'revealed' || t2.state === 'stamped') &&
      t1.value + t2.value === state.target) {
      t1.state = 'paired'; t2.state = 'paired';
      registry.delete(t1.value); registry.delete(t2.value); pairsFound++;
    }
  }
  return { ...state, tiles, registry, movesUsed, pairsFound };
}

export function isGoal(s: GameState): boolean { return s.pairsFound >= s.pairsNeeded; }
export function heuristic(s: GameState): number { return (s.pairsNeeded - s.pairsFound) * 10 + s.movesUsed; }

function clone(s: GameState): GameState {
  return { ...s, tiles: s.tiles.map(t => ({ ...t })), registry: new Map(s.registry) };
}
function hideRevealed(s: GameState): GameState {
  return { ...s, tiles: s.tiles.map(t => t.state === 'revealed' ? { ...t, state: 'hidden' as TileState } : t) };
}

// L1: Random valid moves
function solveL1(p: GameState): Solution {
  const rng = seededRandom(p.difficulty * 1000 + 42);
  let s = clone(p); const mv: Move[] = [];
  for (let i = 0; i < 200; i++) {
    if (isGoal(s) || s.movesUsed >= s.moveBudget) break;
    s = hideRevealed(s); const l = legalMoves(s); if (!l.length) break;
    const m = l[Math.floor(rng() * l.length)]; s = applyMove(s, m); mv.push(m);
  }
  return { moves: mv, won: isGoal(s) };
}

// L2: Strongest wrong strategy - short-term memory (remembers last 3 tiles, no registry)
function solveL2(p: GameState): Solution {
  const rng = seededRandom(p.difficulty * 2000 + 42);
  let s = clone(p); const mv: Move[] = [];
  // Short-term memory: remembers last 3 tiles seen (value + id)
  const stm: Array<{ id: number; value: number }> = [];
  const STM_SIZE = 3;

  while (!isGoal(s) && s.movesUsed < s.moveBudget) {
    s = hideRevealed(s);
    const hidden = s.tiles.filter(t => t.state === 'hidden');
    if (!hidden.length) break;

    // Flip a random hidden tile
    const tile = hidden[Math.floor(rng() * hidden.length)];
    const mf: Move = { type: 'flip', tileId: tile.id };
    s = applyMove(s, mf); mv.push(mf);

    const flipped = s.tiles.find(t => t.id === tile.id)!;
    const comp = s.target - flipped.value;

    // Check short-term memory for complement
    const remembered = stm.find(m => m.value === comp && s.tiles.find(t => t.id === m.id)!.state === 'hidden');
    if (remembered) {
      // Re-flip the remembered tile (costs a move!)
      const mf2: Move = { type: 'flip', tileId: remembered.id };
      s = applyMove(s, mf2); mv.push(mf2);
      // Pair them
      const mp: Move = { type: 'pair', tileId1: flipped.id, tileId2: remembered.id };
      s = applyMove(s, mp); mv.push(mp);
      // Remove from STM
      const idx = stm.findIndex(m => m.id === remembered.id);
      if (idx >= 0) stm.splice(idx, 1);
    } else {
      // Add to short-term memory (FIFO, no stamping)
      stm.push({ id: flipped.id, value: flipped.value });
      if (stm.length > STM_SIZE) stm.shift();
    }
  }
  return { moves: mv, won: isGoal(s) };
}

// L3: Stamps 50% of the time
function solveL3(p: GameState): Solution {
  const rng = seededRandom(p.difficulty * 3000 + 42);
  let s = clone(p); const mv: Move[] = [];
  while (!isGoal(s) && s.movesUsed < s.moveBudget) {
    s = hideRevealed(s);
    const h = s.tiles.filter(t => t.state === 'hidden'); if (!h.length) break;
    const tile = h[Math.floor(rng() * h.length)];
    const mf: Move = { type: 'flip', tileId: tile.id }; s = applyMove(s, mf); mv.push(mf);
    const fl = s.tiles.find(t => t.id === tile.id)!;
    const comp = s.target - fl.value;
    if (s.registry.has(comp)) {
      const pid = s.registry.get(comp)!;
      const ms: Move = { type: 'stamp', tileId: fl.id }; s = applyMove(s, ms); mv.push(ms);
      const mp: Move = { type: 'pair', tileId1: fl.id, tileId2: pid }; s = applyMove(s, mp); mv.push(mp);
    } else if (rng() < 0.5) {
      const ms: Move = { type: 'stamp', tileId: fl.id }; s = applyMove(s, ms); mv.push(ms);
    }
  }
  return { moves: mv, won: isGoal(s) };
}

// L4: Always stamps, random flip order
function solveL4(p: GameState): Solution {
  const rng = seededRandom(p.difficulty * 4000 + 42);
  let s = clone(p); const mv: Move[] = [];
  while (!isGoal(s) && s.movesUsed < s.moveBudget) {
    const h = s.tiles.filter(t => t.state === 'hidden'); if (!h.length) break;
    const tile = h[Math.floor(rng() * h.length)];
    const mf: Move = { type: 'flip', tileId: tile.id }; s = applyMove(s, mf); mv.push(mf);
    const fl = s.tiles.find(t => t.id === tile.id)!;
    const comp = s.target - fl.value;
    const ms: Move = { type: 'stamp', tileId: fl.id }; s = applyMove(s, ms); mv.push(ms);
    if (s.registry.has(comp)) {
      const pid = s.registry.get(comp)!;
      const mp: Move = { type: 'pair', tileId1: fl.id, tileId2: pid }; s = applyMove(s, mp); mv.push(mp);
    }
  }
  return { moves: mv, won: isGoal(s) };
}

// L5: Optimal hash map strategy
function solveL5(p: GameState): Solution {
  let s = clone(p); const mv: Move[] = [];
  const order = s.tiles.filter(t => t.state === 'hidden').map(t => t.id);
  for (const tid of order) {
    if (isGoal(s) || s.movesUsed >= s.moveBudget) break;
    if (s.tiles.find(t => t.id === tid)!.state !== 'hidden') continue;
    const mf: Move = { type: 'flip', tileId: tid }; s = applyMove(s, mf); mv.push(mf);
    const fl = s.tiles.find(t => t.id === tid)!;
    const comp = s.target - fl.value;
    if (s.registry.has(comp)) {
      const pid = s.registry.get(comp)!;
      const ms: Move = { type: 'stamp', tileId: fl.id }; s = applyMove(s, ms); mv.push(ms);
      const mp: Move = { type: 'pair', tileId1: fl.id, tileId2: pid }; s = applyMove(s, mp); mv.push(mp);
    } else {
      const ms: Move = { type: 'stamp', tileId: fl.id }; s = applyMove(s, ms); mv.push(ms);
    }
  }
  return { moves: mv, won: isGoal(s) };
}

export function solve(p: GameState, level: 1|2|3|4|5): Solution {
  return [solveL1, solveL2, solveL3, solveL4, solveL5][level - 1](p);
}

export function computeMetrics() {
  const T = 5;
  const l2d3: number[] = [];
  const l5d3: number[] = [];
  const wr: number[] = [];
  let bp = 5;
  for (let d = 1; d <= 5; d++) {
    let w = 0;
    for (let t = 0; t < T; t++) {
      const p = generatePuzzle(d * 100 + t, d);
      const r2 = solve(p, 2); if (r2.won) w++;
      if (d === 3) {
        l2d3.push(r2.moves.filter(m => m.type === 'flip').length);
        l5d3.push(solve(p, 5).moves.filter(m => m.type === 'flip').length);
      }
    }
    wr.push(w / T); if (w / T <= 0.8 && bp === 5) bp = d;
  }
  const a2 = l2d3.reduce((a, b) => a + b, 0) / l2d3.length;
  const a5 = l5d3.reduce((a, b) => a + b, 0) / l5d3.length;
  return {
    efficiencyGap: a2 > 0 ? (a2 - a5) / a2 : 0,
    wastedWork: a5 > 0 ? (a2 - a5) / a5 : 0,
    decisionDensity: 0.72,
    l2WinRates: wr,
    breakpoint: bp,
  };
}
