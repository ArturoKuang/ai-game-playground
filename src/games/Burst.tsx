import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import ShareButton from '../components/ShareButton';
import StatsModal from '../components/StatsModal';
import CelebrationBurst from '../components/CelebrationBurst';
import {
  getDailySeed,
  seededRandom,
  getPuzzleDay,
  getDayDifficulty,
} from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

/* ─── Constants ─── */
const GRID = 5;
const CELLS = GRID * GRID;
const OVERFLOW = 4;
const GAP = 4;
const FILL_COLORS = ['#2c2c2e', '#1a3a4a', '#1a5276', '#2471a3', '#e74c3c'];
const FILL_BORDERS = ['#3a3a3c', '#1f4f5f', '#1f618d', '#2980b9', '#c0392b'];

/* ─── Helpers ─── */
function neighbors(idx: number): number[] {
  const r = Math.floor(idx / GRID);
  const c = idx % GRID;
  const res: number[] = [];
  if (r > 0) res.push((r - 1) * GRID + c);
  if (r < GRID - 1) res.push((r + 1) * GRID + c);
  if (c > 0) res.push(r * GRID + c - 1);
  if (c < GRID - 1) res.push(r * GRID + c + 1);
  return res;
}

/* ─── Simulate (instant, for solver) ─── */
function simulate(board: number[]): { result: number[]; overflows: number } {
  const b = [...board];
  let overflows = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < CELLS; i++) {
      if (b[i] >= OVERFLOW) {
        b[i] -= OVERFLOW;
        overflows++;
        for (const nb of neighbors(i)) b[nb]++;
        changed = true;
      }
    }
  }
  return { result: b, overflows };
}

/* ─── Step-by-step cascade ─── */
function simulateSteps(
  board: number[],
): { states: number[][]; overflowCells: number[][] } {
  const b = [...board];
  const states: number[][] = [[...b]];
  const overflowCells: number[][] = [];
  let changed = true;
  while (changed) {
    changed = false;
    const wave: number[] = [];
    for (let i = 0; i < CELLS; i++) {
      if (b[i] >= OVERFLOW) wave.push(i);
    }
    if (wave.length === 0) break;
    changed = true;
    for (const i of wave) {
      b[i] -= OVERFLOW;
      for (const nb of neighbors(i)) b[nb]++;
    }
    overflowCells.push(wave);
    states.push([...b]);
  }
  return { states, overflowCells };
}

function isSolved(board: number[]): boolean {
  return board.every((v) => v === 0);
}

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  return {
    numTaps: 2 + Math.ceil(d / 2), // Mon:3, Wed:4, Fri:5
    fillLevel: 2 + (d >= 3 ? 1 : 0), // Mon:2, Thu+:3
  };
}

/* ─── Generate near-critical puzzle ─── */
function generatePuzzle(seed: number) {
  const diff = getDifficulty();

  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = seededRandom(seed + attempt * 997);

    // Start with near-critical board
    const board = Array.from({ length: CELLS }, () => {
      const v = rng();
      if (v < 0.35) return 3; // 35% at critical
      if (v < 0.65) return 2; // 30% at 2
      if (v < 0.85) return 1; // 20% at 1
      return 0; // 15% empty
    });

    // Settle any initial overflows
    const { result: settled } = simulate(board);

    // Skip if already solved or too empty
    if (isSolved(settled)) continue;
    const total = settled.reduce((s, v) => s + v, 0);
    if (total < 10) continue;
    const threes = settled.filter((v) => v === 3).length;
    if (threes < 3) continue; // Need enough near-critical cells

    // Find par: minimum taps to clear
    const par = solveBFS(settled, diff.numTaps + 3);
    if (par >= 2 && par <= diff.numTaps) {
      return {
        initialBoard: settled,
        par,
        numTaps: diff.numTaps,
      };
    }
  }

  // Fallback: generate by backward scramble
  const rng = seededRandom(seed);
  let board = Array(CELLS).fill(0);
  for (let i = 0; i < 4; i++) {
    board[Math.floor(rng() * CELLS)]++;
    const { result } = simulate(board);
    board = result;
  }
  if (isSolved(board)) board[0] = 3;
  return { initialBoard: board, par: 3, numTaps: diff.numTaps };
}

/* ─── BFS solver ─── */
function solveBFS(board: number[], maxDepth: number): number {
  if (isSolved(board)) return 0;
  const visited = new Set<string>([board.join(',')]);
  let frontier: number[][] = [board];

  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: number[][] = [];
    for (const b of frontier) {
      for (let cell = 0; cell < CELLS; cell++) {
        const nb = [...b];
        nb[cell]++;
        const { result } = simulate(nb);
        if (isSolved(result)) return depth;
        const key = result.join(',');
        if (!visited.has(key)) {
          visited.add(key);
          next.push(result);
        }
        if (visited.size > 80000) return -1;
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return -1;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Burst() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const puzzle = useMemo(() => generatePuzzle(seed), [seed]);
  const { initialBoard, par, numTaps } = puzzle;

  const [board, setBoard] = useState(() => [...initialBoard]);
  const [taps, setTaps] = useState(0);
  const [tapHistory, setTapHistory] = useState<number[]>([]);
  const [boardHistory, setBoardHistory] = useState<number[][]>(() => [
    [...initialBoard],
  ]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [lastCascadeDepth, setLastCascadeDepth] = useState(0);

  const solved = isSolved(board);
  const failed = !solved && taps >= numTaps;
  const gameOver = solved || failed;

  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor(maxWidth / GRID) - GAP;

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: CELLS }, () => new Animated.Value(1)),
  ).current;

  const pulseCell = useCallback(
    (idx: number, intensity: number) => {
      const scale = 1 + intensity * 0.15;
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: scale,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(cellScales[idx], {
          toValue: 1,
          friction: 3,
          tension: 180,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [cellScales],
  );

  /* ── Tap handler with animated cascades ── */
  const handleTap = useCallback(
    (idx: number) => {
      if (gameOver || animating) return;
      pulseCell(idx, 1);

      const next = [...board];
      next[idx]++;
      const nextTaps = taps + 1;
      const { states, overflowCells } = simulateSteps(next);
      const finalBoard = states[states.length - 1];
      const cascadeDepth = overflowCells.length;

      if (cascadeDepth > 0) {
        setAnimating(true);
        setBoard(states[0]);

        let wave = 0;
        const playWave = () => {
          if (wave >= overflowCells.length) {
            setAnimating(false);
            setBoard(finalBoard);
            setLastCascadeDepth(cascadeDepth);
            if (isSolved(finalBoard) && !gameRecorded) {
              setGameRecorded(true);
              recordGame('burst', nextTaps, par).then((s) => {
                setStatsData(s);
                setShowStats(true);
              });
            } else if (
              nextTaps >= numTaps &&
              !isSolved(finalBoard) &&
              !gameRecorded
            ) {
              setGameRecorded(true);
              recordGame('burst', numTaps + 1, par).then((s) => {
                setStatsData(s);
                setShowStats(true);
              });
            }
            return;
          }
          for (const cell of overflowCells[wave]) {
            pulseCell(cell, 2);
          }
          // Also pulse neighbors receiving overflow
          const nextState = states[wave + 1];
          const curState = wave === 0 ? states[0] : states[wave];
          for (let i = 0; i < CELLS; i++) {
            if (
              nextState[i] > curState[i] &&
              !overflowCells[wave].includes(i)
            ) {
              pulseCell(i, 0.5);
            }
          }
          setBoard(states[wave + 1]);
          wave++;
          setTimeout(playWave, 300);
        };
        setTimeout(playWave, 200);
      } else {
        setBoard(finalBoard);
        setLastCascadeDepth(0);
        if (isSolved(finalBoard) && !gameRecorded) {
          setGameRecorded(true);
          recordGame('burst', nextTaps, par).then((s) => {
            setStatsData(s);
            setShowStats(true);
          });
        } else if (
          nextTaps >= numTaps &&
          !isSolved(finalBoard) &&
          !gameRecorded
        ) {
          setGameRecorded(true);
          recordGame('burst', numTaps + 1, par).then((s) => {
            setStatsData(s);
            setShowStats(true);
          });
        }
      }

      setTaps(nextTaps);
      setTapHistory((h) => [...h, idx]);
      setBoardHistory((h) => [...h, finalBoard]);
    },
    [board, gameOver, animating, taps, par, numTaps, gameRecorded, pulseCell],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (boardHistory.length <= 1 || gameOver || animating) return;
    setBoard([...boardHistory[boardHistory.length - 2]]);
    setTaps((t) => t - 1);
    setTapHistory((h) => h.slice(0, -1));
    setBoardHistory((h) => h.slice(0, -1));
    setLastCascadeDepth(0);
  }, [boardHistory, gameOver, animating]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('burst');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const under = taps <= par;
    const rows: string[] = [];
    for (let r = 0; r < GRID; r++) {
      let row = '';
      for (let c = 0; c < GRID; c++) {
        const val = initialBoard[r * GRID + c];
        row +=
          val === 0
            ? '\u2b1b'
            : val === 1
              ? '\ud83d\udfe6'
              : val === 2
                ? '\ud83d\udfe8'
                : '\ud83d\udfe5';
      }
      rows.push(row);
    }
    return [
      `Burst Day #${puzzleDay} \ud83d\udca5`,
      `${taps}/${par} taps \u2022 ${numTaps} allowed`,
      ...rows,
      solved
        ? under
          ? '\u2b50 Under par!'
          : '\u2705 Cleared!'
        : `\ud83d\udca7 ${board.reduce((s, v) => s + v, 0)} left`,
    ].join('\n');
  }

  const totalFill = board.reduce((s, v) => s + v, 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Burst</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Tap to trigger chain reactions. Clear the board in {numTaps} taps.
      </Text>

      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Taps</Text>
          <Text
            style={[
              styles.infoVal,
              solved && taps <= par && styles.infoValGood,
            ]}
          >
            {taps}/{numTaps}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Liquid</Text>
          <Text style={styles.infoVal}>{totalFill}</Text>
        </View>
        {lastCascadeDepth > 1 && !animating && (
          <Text style={styles.cascadeBadge}>
            {'\ud83d\udca5'} {lastCascadeDepth}-chain!
          </Text>
        )}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {Array.from({ length: GRID }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: GRID }, (_, c) => {
              const idx = r * GRID + c;
              const val = board[idx];
              const critical = val === 3;
              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[idx] }] }}
                >
                  <Pressable
                    onPress={() => handleTap(idx)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor:
                          FILL_COLORS[Math.min(val, FILL_COLORS.length - 1)],
                        borderColor: critical
                          ? '#e74c3c'
                          : FILL_BORDERS[
                              Math.min(val, FILL_BORDERS.length - 1)
                            ],
                        borderWidth: critical ? 3 : 2,
                      },
                    ]}
                  >
                    {val > 0 && (
                      <Text
                        style={[
                          styles.cellVal,
                          critical && styles.cellValCritical,
                        ]}
                      >
                        {val}
                      </Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Undo */}
      {!gameOver && !animating && taps > 0 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}

      <CelebrationBurst show={solved && taps <= par} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {taps <= par ? '\ud83c\udf1f' : '\ud83d\udca5'}
          </Text>
          <Text style={styles.endText}>
            {taps <= par
              ? `Under par! ${taps} taps`
              : `Cleared in ${taps} taps`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      {failed && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>{'\ud83d\udca7'}</Text>
          <Text style={styles.endText}>Out of taps!</Text>
          <Text style={styles.endSub}>{totalFill} liquid remaining</Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          The board is loaded with liquid. Tap a cell to add 1. When a cell
          reaches 4, it bursts — emptying and splashing 1 to each neighbor.
          {'\n\n'}
          Bursts chain! One tap can cascade across the board.{'\n'}
          Clear every cell in {numTaps} taps. Par: {par}.{'\n\n'}
          {'\ud83d\udfe5'} = 3 (critical — one tap from bursting)
        </Text>
      </View>

      {showStats && stats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#121213',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  dayBadge: { color: '#6aaa64', fontSize: 13, fontWeight: '600' },
  statsIcon: { fontSize: 24 },
  subtitle: {
    fontSize: 13,
    color: '#818384',
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
    maxWidth: 300,
  },
  infoBar: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  infoValGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 20, fontWeight: '800' },
  cascadeBadge: {
    color: '#f39c12',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellVal: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  cellValCritical: { color: '#e74c3c' },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  undoText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  endMsg: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  endSub: { color: '#818384', fontSize: 13, marginTop: 4 },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
