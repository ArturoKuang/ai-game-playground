/**
 * Reflect solver -- Two Pointers palindrome detection game (curriculum 1.2)
 */
import { seededRandom } from '../utils/seed';

export type TileType = 'value' | 'noise';
export type TileState = 'hidden' | 'revealed';
export type TileData = { id: number; value: string; tileType: TileType; state: TileState };
export type RoundData = { tiles: TileData[]; isPalindrome: boolean };

export type GameState = {
  rounds: RoundData[];
  currentRound: number;
  energyUsed: number;
  energyBudget: number;
  roundResults: ('correct' | 'wrong' | 'pending')[];
  difficulty: number;
};

export type Move =
  | { type: 'reveal'; roundIndex: number; tileIndex: number }
  | { type: 'classify'; roundIndex: number; classification: 'palindrome' | 'not-palindrome' };

export type Solution = { moves: Move[]; won: boolean };

type DC = { rounds: number; tilesPerRow: number; noisePerRow: number; budget: number };
const DIFF: Record<number, DC> = {
  1: { rounds: 3, tilesPerRow: 5, noisePerRow: 0, budget: 16 },
  2: { rounds: 3, tilesPerRow: 7, noisePerRow: 0, budget: 22 },
  3: { rounds: 4, tilesPerRow: 9, noisePerRow: 2, budget: 26 },
  4: { rounds: 5, tilesPerRow: 9, noisePerRow: 2, budget: 28 },
  5: { rounds: 6, tilesPerRow: 11, noisePerRow: 3, budget: 44 },
};
const VALUE_EMOJIS = ['\u{1F534}', '\u{1F535}', '\u{1F7E2}', '\u{1F7E1}', '\u{1F7E3}', '\u{1F7E0}'];
const NOISE_SYMBOL = '\u2298';

export function generatePuzzle(seed: number, difficulty: number): GameState {
  const cfg = DIFF[difficulty] ?? DIFF[3];
  const rng = seededRandom(seed);
  const rounds: RoundData[] = [];
  const palindromeFlags: boolean[] = [];
  const halfPalin = Math.ceil(cfg.rounds / 2);
  for (let i = 0; i < cfg.rounds; i++) palindromeFlags.push(i < halfPalin);
  for (let i = palindromeFlags.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [palindromeFlags[i], palindromeFlags[j]] = [palindromeFlags[j], palindromeFlags[i]];
  }
  let tileIdCounter = 0;
  for (let r = 0; r < cfg.rounds; r++) {
    const isPalin = palindromeFlags[r];
    const totalTiles = cfg.tilesPerRow;
    const noiseCount = cfg.noisePerRow;
    const valueCount = totalTiles - noiseCount;
    const noisePositions = new Set<number>();
    while (noisePositions.size < noiseCount) noisePositions.add(Math.floor(rng() * totalTiles));
    const values: string[] = new Array(valueCount);
    const halfLen = Math.floor(valueCount / 2);
    for (let i = 0; i < halfLen; i++) {
      const sym = VALUE_EMOJIS[Math.floor(rng() * VALUE_EMOJIS.length)];
      values[i] = sym;
      values[valueCount - 1 - i] = sym;
    }
    if (valueCount % 2 === 1) values[halfLen] = VALUE_EMOJIS[Math.floor(rng() * VALUE_EMOJIS.length)];
    if (!isPalin) {
      const mismatchDepth = Math.floor(rng() * halfLen);
      let replacement: string;
      do { replacement = VALUE_EMOJIS[Math.floor(rng() * VALUE_EMOJIS.length)]; } while (replacement === values[mismatchDepth]);
      if (rng() < 0.5) values[mismatchDepth] = replacement;
      else values[valueCount - 1 - mismatchDepth] = replacement;
    }
    const tiles: TileData[] = new Array(totalTiles);
    let vi = 0;
    for (let i = 0; i < totalTiles; i++) {
      if (noisePositions.has(i)) {
        tiles[i] = { id: tileIdCounter++, value: NOISE_SYMBOL, tileType: 'noise', state: 'hidden' };
      } else {
        tiles[i] = { id: tileIdCounter++, value: values[vi++], tileType: 'value', state: 'hidden' };
      }
    }
    rounds.push({ tiles, isPalindrome: isPalin });
  }
  return { rounds, currentRound: 0, energyUsed: 0, energyBudget: cfg.budget, roundResults: new Array(cfg.rounds).fill('pending'), difficulty };
}
export function legalMoves(state: GameState): Move[] {
  if (isGoal(state) || state.currentRound >= state.rounds.length) return [];
  const moves: Move[] = [];
  const ri = state.currentRound;
  const round = state.rounds[ri];
  if (state.energyBudget - state.energyUsed > 0) {
    for (let ti = 0; ti < round.tiles.length; ti++) {
      if (round.tiles[ti].state === 'hidden') moves.push({ type: 'reveal', roundIndex: ri, tileIndex: ti });
    }
  }
  moves.push({ type: 'classify', roundIndex: ri, classification: 'palindrome' });
  moves.push({ type: 'classify', roundIndex: ri, classification: 'not-palindrome' });
  return moves;
}

export function applyMove(state: GameState, move: Move): GameState {
  const rounds = state.rounds.map((r) => ({ ...r, tiles: r.tiles.map((t) => ({ ...t })) }));
  const roundResults = [...state.roundResults];
  let { currentRound, energyUsed } = state;
  if (move.type === 'reveal') {
    const tile = rounds[move.roundIndex].tiles[move.tileIndex];
    if (tile.state === 'hidden') { tile.state = 'revealed'; energyUsed++; }
  } else if (move.type === 'classify') {
    const round = rounds[move.roundIndex];
    const isCorrect = (move.classification === 'palindrome' && round.isPalindrome) || (move.classification === 'not-palindrome' && !round.isPalindrome);
    if (isCorrect) roundResults[move.roundIndex] = 'correct';
    else { roundResults[move.roundIndex] = 'wrong'; energyUsed += 3; }
    currentRound++;
  }
  return { ...state, rounds, currentRound, energyUsed, roundResults };
}

export function isGoal(state: GameState): boolean { return state.roundResults.every((r) => r === 'correct'); }
export function isGameOver(state: GameState): boolean { if (isGoal(state)) return false; return state.currentRound >= state.rounds.length; }
export function heuristic(state: GameState): number { return state.roundResults.filter((r) => r === 'pending').length * 10 + state.roundResults.filter((r) => r === 'wrong').length * 50 + state.energyUsed; }

function getValueTileIndices(round: RoundData): number[] { return round.tiles.map((t, i) => (t.tileType === 'value' ? i : -1)).filter((i) => i >= 0); }

function clone(s: GameState): GameState {
  return { ...s, rounds: s.rounds.map((r) => ({ ...r, tiles: r.tiles.map((t) => ({ ...t })) })), roundResults: [...s.roundResults] };
}
function solveL1(puzzle: GameState): Solution {
  const rng = seededRandom(puzzle.difficulty * 1000 + 42);
  let s = clone(puzzle); const mv: Move[] = [];
  while (s.currentRound < s.rounds.length) {
    const ri = s.currentRound; const round = s.rounds[ri];
    const revealCount = Math.floor(rng() * 4);
    for (let r = 0; r < revealCount; r++) {
      if (s.energyUsed >= s.energyBudget) break;
      const hidden = round.tiles.map((t, i) => ({ t, i })).filter((x) => x.t.state === 'hidden');
      if (!hidden.length) break;
      const pick = hidden[Math.floor(rng() * hidden.length)];
      const m: Move = { type: 'reveal', roundIndex: ri, tileIndex: pick.i };
      s = applyMove(s, m); mv.push(m);
    }
    const cls: Move = { type: 'classify', roundIndex: ri, classification: rng() < 0.5 ? 'palindrome' : 'not-palindrome' };
    s = applyMove(s, cls); mv.push(cls);
  }
  return { moves: mv, won: isGoal(s) };
}

function solveL2(puzzle: GameState): Solution {
  let s = clone(puzzle); const mv: Move[] = [];
  while (s.currentRound < s.rounds.length) {
    const ri = s.currentRound; const round = s.rounds[ri];
    for (let ti = 0; ti < round.tiles.length; ti++) {
      if (s.energyUsed >= s.energyBudget) break;
      if (round.tiles[ti].state === 'hidden') { const m: Move = { type: 'reveal', roundIndex: ri, tileIndex: ti }; s = applyMove(s, m); mv.push(m); }
    }
    const valIndices = getValueTileIndices(s.rounds[ri]);
    const revVals = valIndices.filter((i) => s.rounds[ri].tiles[i].state === 'revealed').map((i) => s.rounds[ri].tiles[i].value);
    let isPalin = true;
    for (let i = 0; i < Math.floor(revVals.length / 2); i++) { if (revVals[i] !== revVals[revVals.length - 1 - i]) { isPalin = false; break; } }
    const cls: Move = { type: 'classify', roundIndex: ri, classification: isPalin ? 'palindrome' : 'not-palindrome' };
    s = applyMove(s, cls); mv.push(cls);
  }
  return { moves: mv, won: isGoal(s) };
}

function solveL3(puzzle: GameState): Solution {
  let s = clone(puzzle); const mv: Move[] = [];
  while (s.currentRound < s.rounds.length) {
    const ri = s.currentRound; const round = s.rounds[ri];
    for (let ti = 0; ti < round.tiles.length; ti++) {
      if (s.energyUsed >= s.energyBudget) break;
      if (round.tiles[ti].state === 'hidden') { const m: Move = { type: 'reveal', roundIndex: ri, tileIndex: ti }; s = applyMove(s, m); mv.push(m); }
    }
    const valIndices = getValueTileIndices(s.rounds[ri]);
    const revVals = valIndices.filter((i) => s.rounds[ri].tiles[i].state === 'revealed').map((i) => s.rounds[ri].tiles[i].value);
    let isPalin = true;
    for (let i = 0; i < Math.floor(revVals.length / 2); i++) { if (revVals[i] !== revVals[revVals.length - 1 - i]) { isPalin = false; break; } }
    const cls: Move = { type: 'classify', roundIndex: ri, classification: isPalin ? 'palindrome' : 'not-palindrome' };
    s = applyMove(s, cls); mv.push(cls);
  }
  return { moves: mv, won: isGoal(s) };
}
function solveL4(puzzle: GameState): Solution {
  let s = clone(puzzle); const mv: Move[] = [];
  while (s.currentRound < s.rounds.length) {
    const ri = s.currentRound; const round = s.rounds[ri];
    const valIndices = getValueTileIndices(round);
    let left = 0, right = valIndices.length - 1;
    while (left < right) {
      const li = valIndices[left];
      if (s.rounds[ri].tiles[li].state === 'hidden' && s.energyUsed < s.energyBudget) { const m: Move = { type: 'reveal', roundIndex: ri, tileIndex: li }; s = applyMove(s, m); mv.push(m); }
      const rIdx = valIndices[right];
      if (s.rounds[ri].tiles[rIdx].state === 'hidden' && s.energyUsed < s.energyBudget) { const m: Move = { type: 'reveal', roundIndex: ri, tileIndex: rIdx }; s = applyMove(s, m); mv.push(m); }
      left++; right--;
    }
    for (let ti = 0; ti < round.tiles.length; ti++) {
      if (round.tiles[ti].tileType === 'noise' && s.rounds[ri].tiles[ti].state === 'hidden' && s.energyUsed < s.energyBudget) {
        const m: Move = { type: 'reveal', roundIndex: ri, tileIndex: ti }; s = applyMove(s, m); mv.push(m);
      }
    }
    const revVals = valIndices.filter((i) => s.rounds[ri].tiles[i].state === 'revealed').map((i) => s.rounds[ri].tiles[i].value);
    let isPalin = true;
    for (let i = 0; i < Math.floor(revVals.length / 2); i++) { if (revVals[i] !== revVals[revVals.length - 1 - i]) { isPalin = false; break; } }
    const cls: Move = { type: 'classify', roundIndex: ri, classification: isPalin ? 'palindrome' : 'not-palindrome' };
    s = applyMove(s, cls); mv.push(cls);
  }
  return { moves: mv, won: isGoal(s) };
}

function solveL5(puzzle: GameState): Solution {
  let s = clone(puzzle); const mv: Move[] = [];
  while (s.currentRound < s.rounds.length) {
    const ri = s.currentRound; const round = s.rounds[ri];
    const valIndices = getValueTileIndices(round);
    let left = 0, right = valIndices.length - 1, foundMismatch = false;
    while (left < right) {
      const li = valIndices[left]; const rIdx = valIndices[right];
      if (s.rounds[ri].tiles[li].state === 'hidden' && s.energyUsed < s.energyBudget) { const m: Move = { type: 'reveal', roundIndex: ri, tileIndex: li }; s = applyMove(s, m); mv.push(m); }
      if (s.rounds[ri].tiles[rIdx].state === 'hidden' && s.energyUsed < s.energyBudget) { const m: Move = { type: 'reveal', roundIndex: ri, tileIndex: rIdx }; s = applyMove(s, m); mv.push(m); }
      const leftTile = s.rounds[ri].tiles[li]; const rightTile = s.rounds[ri].tiles[rIdx];
      if (leftTile.state === 'revealed' && rightTile.state === 'revealed' && leftTile.value !== rightTile.value) { foundMismatch = true; break; }
      left++; right--;
    }
    const cls: Move = { type: 'classify', roundIndex: ri, classification: foundMismatch ? 'not-palindrome' : 'palindrome' };
    s = applyMove(s, cls); mv.push(cls);
  }
  return { moves: mv, won: isGoal(s) };
}

export function solve(puzzle: GameState, skillLevel: 1 | 2 | 3 | 4 | 5): Solution | null {
  return [solveL1, solveL2, solveL3, solveL4, solveL5][skillLevel - 1](puzzle);
}
export function computeMetrics() {
  const T = 5;
  const l2MovesD3: number[] = []; const l5MovesD3: number[] = [];
  const l2WinRates: number[] = []; const l5WinRates: number[] = [];
  let breakpoint = -1;
  for (let d = 1; d <= 5; d++) {
    let l2Wins = 0, l5Wins = 0;
    for (let t = 0; t < T; t++) {
      const seed = d * 100 + t;
      const r2 = solve(generatePuzzle(seed, d), 2)!; const r5 = solve(generatePuzzle(seed, d), 5)!;
      if (r2.won) l2Wins++; if (r5.won) l5Wins++;
      if (d === 3) { l2MovesD3.push(r2.moves.filter((m) => m.type === 'reveal').length); l5MovesD3.push(r5.moves.filter((m) => m.type === 'reveal').length); }
    }
    const l2Rate = l2Wins / T; const l5Rate = l5Wins / T;
    l2WinRates.push(l2Rate); l5WinRates.push(l5Rate);
    if (breakpoint === -1 && (l2Rate <= 0.8 || (l5Rate > 0 && (l5Rate - l2Rate) / l5Rate > 0.3))) breakpoint = d;
  }
  const avgL2 = l2MovesD3.reduce((a, b) => a + b, 0) / l2MovesD3.length;
  const avgL5 = l5MovesD3.reduce((a, b) => a + b, 0) / l5MovesD3.length;
  const efficiencyGap = avgL2 > 0 ? (avgL2 - avgL5) / avgL2 : 0;
  const wastedWork = avgL5 > 0 ? (avgL2 - avgL5) / avgL5 : 0;
  let totalMoves = 0, multiOptionMoves = 0;
  for (let t = 0; t < T; t++) {
    const seed = 3 * 100 + t; let s = generatePuzzle(seed, 3); const sol = solve(generatePuzzle(seed, 3), 5)!;
    for (const m of sol.moves) { const legal = legalMoves(s); if (legal.length >= 2) multiOptionMoves++; totalMoves++; s = applyMove(s, m); }
  }
  const decisionDensity = totalMoves > 0 ? multiOptionMoves / totalMoves : 0;
  let twoPointerMoves = 0, totalRevealMoves = 0;
  for (let t = 0; t < T; t++) {
    const seed = 3 * 100 + t; const p = generatePuzzle(seed, 3); const sol = solve(generatePuzzle(seed, 3), 5)!;
    let ri = -1; let valIndicesForRound: number[] = []; let leftPtr = 0, rightPtr = 0;
    for (const m of sol.moves) {
      if (m.type === 'classify') { ri = -1; continue; }
      if (m.type === 'reveal') {
        if (m.roundIndex !== ri) { ri = m.roundIndex; valIndicesForRound = getValueTileIndices(p.rounds[ri]); leftPtr = 0; rightPtr = valIndicesForRound.length - 1; }
        totalRevealMoves++;
        const isLeftEnd = m.tileIndex === valIndicesForRound[leftPtr]; const isRightEnd = m.tileIndex === valIndicesForRound[rightPtr];
        if (isLeftEnd || isRightEnd) { twoPointerMoves++; if (isLeftEnd && !isRightEnd) leftPtr++; else if (isRightEnd && !isLeftEnd) rightPtr--; }
      }
    }
  }
  const algorithmAlignment = totalRevealMoves > 0 ? twoPointerMoves / totalRevealMoves : 0;
  const solvability: number[] = [];
  for (let d = 1; d <= 5; d++) { let wins = 0; for (let t = 0; t < T; t++) { if (solve(generatePuzzle(d * 100 + t, d), 5)!.won) wins++; } solvability.push(wins / T); }
  return { efficiencyGap, wastedWork, decisionDensity, algorithmAlignment, l2WinRates, l5WinRates, solvability, breakpoint, avgL2Reveals: avgL2, avgL5Reveals: avgL5 };
}
