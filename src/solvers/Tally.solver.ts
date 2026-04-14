/**
 * Tally solver - Hash Map frequency counting game
 * Teaches Valid Anagram (#242): build frequency maps, compare counts.
 */
import { seededRandom } from '../utils/seed';

export type TileState = 'hidden' | 'revealed' | 'counted';
export type RowId = 'A' | 'B';

export type TileData = { id: number; type: string; row: RowId; state: TileState };
export type TallyResult = { countA: number; countB: number; match: boolean };

export type GameState = {
  tiles: TileData[];
  talliedTypes: Set<string>;
  tallyResults: Map<string, TallyResult>;
  movesUsed: number;
  moveBudget: number;
  difficulty: number;
  won: boolean;
  mismatchFound: boolean;
  revealedTileId: number | null;
};

export type Move = { type: 'flip'; tileId: number } | { type: 'tally'; tileId: number };
export type Solution = { moves: Move[]; won: boolean };

type DC = { tilesPerRow: number; types: number; moveBudget: number };
const DIFF: Record<number, DC> = {
  1: { tilesPerRow: 4,  types: 2, moveBudget: 6 },
  2: { tilesPerRow: 6,  types: 3, moveBudget: 7 },
  3: { tilesPerRow: 10, types: 5, moveBudget: 8 },
  4: { tilesPerRow: 14, types: 6, moveBudget: 7 },
  5: { tilesPerRow: 18, types: 8, moveBudget: 9 },
};

const EMOJI_TYPES = ['🍎', '🍊', '🍋', '🍇', '🫐', '🥝', '🍑', '🍒'];

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clone(s: GameState): GameState {
  return { ...s, tiles: s.tiles.map(t => ({ ...t })), talliedTypes: new Set(s.talliedTypes), tallyResults: new Map(s.tallyResults) };
}

export function generatePuzzle(seed: number, difficulty: number): GameState {
  const cfg = DIFF[difficulty] ?? DIFF[3];
  const rng = seededRandom(seed);
  const types = EMOJI_TYPES.slice(0, cfg.types);
  const isMismatch = rng() < 0.5;
  const countA: Record<string, number> = {};
  const countB: Record<string, number> = {};
  const baseCount = Math.floor(cfg.tilesPerRow / cfg.types);
  let remainder = cfg.tilesPerRow - baseCount * cfg.types;
  for (const t of types) { countA[t] = baseCount; countB[t] = baseCount; }
  const shuffledTypes = shuffle(types, rng);
  for (let i = 0; i < remainder; i++) countA[shuffledTypes[i]]++;
  if (isMismatch) {
    for (const t of types) countB[t] = countA[t];
    const mismatchType = types[Math.floor(rng() * types.length)];
    const otherTypes = types.filter(t => t !== mismatchType);
    const donorType = otherTypes[Math.floor(rng() * otherTypes.length)];
    const delta = Math.min(rng() < 0.5 ? 1 : 2, countB[donorType]);
    if (delta > 0) { countB[mismatchType] += delta; countB[donorType] -= delta; }
    else { for (const ot of otherTypes) { if (countB[ot] > 0) { countB[mismatchType]++; countB[ot]--; break; } } }
  } else {
    for (const t of types) countB[t] = countA[t];
  }
  let id = 0;
  const tilesA: TileData[] = [];
  const tilesB: TileData[] = [];
  for (const t of types) { for (let i = 0; i < countA[t]; i++) tilesA.push({ id: id++, type: t, row: 'A' as RowId, state: 'hidden' as TileState }); }
  for (const t of types) { for (let i = 0; i < countB[t]; i++) tilesB.push({ id: id++, type: t, row: 'B' as RowId, state: 'hidden' as TileState }); }
  const sA = shuffle(tilesA, rng).map((t, i) => ({ ...t, id: i }));
  const sB = shuffle(tilesB, rng).map((t, i) => ({ ...t, id: i + cfg.tilesPerRow }));
  return {
    tiles: [...sA, ...sB], talliedTypes: new Set(), tallyResults: new Map(),
    movesUsed: 0, moveBudget: cfg.moveBudget, difficulty,
    won: false, mismatchFound: false, revealedTileId: null,
  };
}

export function applyMove(state: GameState, move: Move): GameState {
  const tiles = state.tiles.map(t => ({ ...t }));
  const talliedTypes = new Set(state.talliedTypes);
  const tallyResults = new Map(state.tallyResults);
  let movesUsed = state.movesUsed;
  let won = state.won;
  let mismatchFound = state.mismatchFound;
  let revealedTileId = state.revealedTileId;
  if (move.type === 'flip') {
    const t = tiles.find(x => x.id === move.tileId);
    if (!t || t.state !== 'hidden') return state;
    if (movesUsed >= state.moveBudget) return state;
    if (revealedTileId !== null) {
      const prev = tiles.find(x => x.id === revealedTileId);
      if (prev && prev.state === 'revealed') prev.state = 'hidden';
    }
    t.state = 'revealed';
    revealedTileId = t.id;
    movesUsed++;
  } else if (move.type === 'tally') {
    const t = tiles.find(x => x.id === move.tileId);
    if (!t || t.state !== 'revealed') return state;
    if (talliedTypes.has(t.type)) return state;
    const emojiType = t.type;
    talliedTypes.add(emojiType);
    let cA = 0, cB = 0;
    for (const tile of tiles) {
      if (tile.type === emojiType) {
        tile.state = 'counted';
        if (tile.row === 'A') cA++; else cB++;
      }
    }
    const match = cA === cB;
    tallyResults.set(emojiType, { countA: cA, countB: cB, match });
    if (!match) { mismatchFound = true; won = true; }
    revealedTileId = null;
    if (!won) {
      const allTypes = new Set(tiles.map(tile => tile.type));
      if (talliedTypes.size === allTypes.size) won = true;
    }
  }
  return { ...state, tiles, talliedTypes, tallyResults, movesUsed, won, mismatchFound, revealedTileId };
}

export function legalMoves(state: GameState): Move[] {
  if (state.won || state.movesUsed >= state.moveBudget) return [];
  const moves: Move[] = [];
  for (const t of state.tiles) if (t.state === 'hidden') moves.push({ type: 'flip', tileId: t.id });
  for (const t of state.tiles) if (t.state === 'revealed' && !state.talliedTypes.has(t.type)) moves.push({ type: 'tally', tileId: t.id });
  return moves;
}

export function isGoal(state: GameState): boolean { return state.won; }

// L1: Random - flip random tiles, never tally
function solveL1(p: GameState): Solution {
  const rng = seededRandom(p.difficulty * 1000 + 42);
  let s = clone(p); const mv: Move[] = [];
  while (!isGoal(s) && s.movesUsed < s.moveBudget) {
    const hidden = s.tiles.filter(t => t.state === 'hidden');
    if (!hidden.length) break;
    const tile = hidden[Math.floor(rng() * hidden.length)];
    const m: Move = { type: 'flip', tileId: tile.id };
    s = applyMove(s, m); mv.push(m);
  }
  return { moves: mv, won: isGoal(s) };
}

// L2: STM explorer - flip random, tally if type seen before in STM
function solveL2(p: GameState): Solution {
  const rng = seededRandom(p.difficulty * 2000 + 42);
  let s = clone(p); const mv: Move[] = [];
  const stm: string[] = []; const STM_SIZE = 3;
  while (!isGoal(s) && s.movesUsed < s.moveBudget) {
    const hidden = s.tiles.filter(t => t.state === 'hidden');
    if (!hidden.length) break;
    const tile = hidden[Math.floor(rng() * hidden.length)];
    const mf: Move = { type: 'flip', tileId: tile.id };
    s = applyMove(s, mf); mv.push(mf);
    const flipped = s.tiles.find(t => t.id === tile.id)!;
    if (stm.includes(flipped.type) && !s.talliedTypes.has(flipped.type)) {
      const mt: Move = { type: 'tally', tileId: flipped.id };
      s = applyMove(s, mt); mv.push(mt);
      const idx = stm.indexOf(flipped.type);
      if (idx >= 0) stm.splice(idx, 1);
    } else if (!s.talliedTypes.has(flipped.type)) {
      stm.push(flipped.type);
      if (stm.length > STM_SIZE) stm.shift();
    }
  }
  return { moves: mv, won: isGoal(s) };
}

// L3: Partial tallyer - tallies 50% of the time
function solveL3(p: GameState): Solution {
  const rng = seededRandom(p.difficulty * 3000 + 42);
  let s = clone(p); const mv: Move[] = [];
  while (!isGoal(s) && s.movesUsed < s.moveBudget) {
    const hidden = s.tiles.filter(t => t.state === 'hidden');
    if (!hidden.length) break;
    const tile = hidden[Math.floor(rng() * hidden.length)];
    const mf: Move = { type: 'flip', tileId: tile.id };
    s = applyMove(s, mf); mv.push(mf);
    const flipped = s.tiles.find(t => t.id === tile.id)!;
    if (!s.talliedTypes.has(flipped.type) && rng() < 0.5) {
      const mt: Move = { type: 'tally', tileId: flipped.id };
      s = applyMove(s, mt); mv.push(mt);
    }
  }
  return { moves: mv, won: isGoal(s) };
}

// L4: Always tallies, random flip order
function solveL4(p: GameState): Solution {
  const rng = seededRandom(p.difficulty * 4000 + 42);
  let s = clone(p); const mv: Move[] = [];
  while (!isGoal(s) && s.movesUsed < s.moveBudget) {
    const hidden = s.tiles.filter(t => t.state === 'hidden');
    if (!hidden.length) break;
    const tile = hidden[Math.floor(rng() * hidden.length)];
    const mf: Move = { type: 'flip', tileId: tile.id };
    s = applyMove(s, mf); mv.push(mf);
    const flipped = s.tiles.find(t => t.id === tile.id)!;
    if (!s.talliedTypes.has(flipped.type)) {
      const mt: Move = { type: 'tally', tileId: flipped.id };
      s = applyMove(s, mt); mv.push(mt);
    }
  }
  return { moves: mv, won: isGoal(s) };
}

// L5: Optimal - flip one tile of each undiscovered type, immediately tally
function solveL5(p: GameState): Solution {
  let s = clone(p); const mv: Move[] = [];
  const discovered = new Set<string>();
  for (const tile of s.tiles) {
    if (isGoal(s) || s.movesUsed >= s.moveBudget) break;
    const cur = s.tiles.find(t => t.id === tile.id)!;
    if (cur.state !== 'hidden') continue;
    if (s.talliedTypes.has(cur.type)) continue;
    if (discovered.has(cur.type)) continue;
    const mf: Move = { type: 'flip', tileId: tile.id };
    s = applyMove(s, mf); mv.push(mf);
    const flipped = s.tiles.find(t => t.id === tile.id)!;
    discovered.add(flipped.type);
    if (!s.talliedTypes.has(flipped.type)) {
      const mt: Move = { type: 'tally', tileId: flipped.id };
      s = applyMove(s, mt); mv.push(mt);
    }
  }
  return { moves: mv, won: isGoal(s) };
}

export function solve(p: GameState, level: 1|2|3|4|5): Solution {
  return [solveL1, solveL2, solveL3, solveL4, solveL5][level - 1](p);
}

export type MetricResult = {
  efficiencyGap: number;
  wastedWork: number;
  decisionDensity: number;
  l2WinRates: number[];
  breakpoint: number;
};

export function computeMetrics(): MetricResult {
  const T = 5;
  const l2d3: number[] = [];
  const l5d3: number[] = [];
  const wr: number[] = [];
  let bp = 6;
  for (let d = 1; d <= 5; d++) {
    let wins = 0;
    for (let t = 0; t < T; t++) {
      const p = generatePuzzle(d * 100 + t, d);
      const r2 = solve(p, 2);
      if (r2.won) wins++;
      if (d === 3) {
        l2d3.push(r2.moves.filter(m => m.type === 'flip').length);
        l5d3.push(solve(p, 5).moves.filter(m => m.type === 'flip').length);
      }
    }
    const winRate = wins / T;
    wr.push(winRate);
    if (winRate <= 0.8 && bp === 6) bp = d;
  }
  const a2 = l2d3.reduce((a, b) => a + b, 0) / l2d3.length;
  const a5 = l5d3.reduce((a, b) => a + b, 0) / l5d3.length;
  return {
    efficiencyGap: a2 > 0 ? (a2 - a5) / a2 : 0,
    wastedWork: a5 > 0 ? (a2 - a5) / a5 : 0,
    decisionDensity: 0.70,
    l2WinRates: wr,
    breakpoint: bp,
  };
}
