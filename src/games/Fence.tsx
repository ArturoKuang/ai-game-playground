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
const SIZE = 5;
const NUM_REGIONS = 5;
const REGION_SIZE = 5;
const MAX_LIVES = 3;
const GAP = 2;

const REGION_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];
const REGION_COLORS_DIM = [
  '#e74c3c40',
  '#3498db40',
  '#2ecc7140',
  '#f1c40f40',
  '#9b59b640',
];
const REGION_EMOJI = ['🔴', '🔵', '🟢', '🟡', '🟣'];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1 (Mon) – 5 (Fri)
  return {
    maxScans: 20 - d * 2, // Mon: 18, Fri: 10
  };
}

/* ─── Adjacency helpers ─── */
function getOrthNeighbors(key: number): number[] {
  const r = Math.floor(key / SIZE);
  const c = key % SIZE;
  const result: number[] = [];
  if (r > 0) result.push((r - 1) * SIZE + c);
  if (r < SIZE - 1) result.push((r + 1) * SIZE + c);
  if (c > 0) result.push(r * SIZE + (c - 1));
  if (c < SIZE - 1) result.push(r * SIZE + (c + 1));
  return result;
}

/* Edge key: canonical pair string */
function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/* ─── Generate random partition into 5 connected regions of 5 ─── */
function generateRegions(seed: number): number[] {
  const rng = seededRandom(seed);
  const grid = new Array(SIZE * SIZE).fill(-1);

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  for (let attempt = 0; attempt < 100; attempt++) {
    grid.fill(-1);
    let success = true;

    for (let region = 0; region < NUM_REGIONS; region++) {
      // Find unclaimed cells
      const unclaimed = [];
      for (let i = 0; i < SIZE * SIZE; i++) {
        if (grid[i] === -1) unclaimed.push(i);
      }

      if (unclaimed.length === 0) {
        success = false;
        break;
      }

      // Pick a random unclaimed seed that is adjacent to claimed territory
      // (or any unclaimed cell for the first region)
      let seedCell: number;
      if (region === 0) {
        seedCell = unclaimed[Math.floor(rng() * unclaimed.length)];
      } else {
        // Prefer cells adjacent to already-placed regions (for better connectivity)
        const frontier = unclaimed.filter((c) =>
          getOrthNeighbors(c).some((n) => grid[n] !== -1),
        );
        const pool = frontier.length > 0 ? frontier : unclaimed;
        seedCell = pool[Math.floor(rng() * pool.length)];
      }

      grid[seedCell] = region;
      const regionCells = [seedCell];

      // Grow to REGION_SIZE
      while (regionCells.length < REGION_SIZE) {
        // Frontier: unclaimed cells adjacent to this region
        const frontier: number[] = [];
        for (const cell of regionCells) {
          for (const n of getOrthNeighbors(cell)) {
            if (grid[n] === -1 && !frontier.includes(n)) {
              frontier.push(n);
            }
          }
        }

        if (frontier.length === 0) {
          success = false;
          break;
        }

        const next = shuffle(frontier)[0];
        grid[next] = region;
        regionCells.push(next);
      }

      if (!success) break;
    }

    if (success && grid.every((v) => v >= 0)) {
      return grid;
    }
  }

  // Fallback: simple row-based partition
  const fallback = new Array(SIZE * SIZE).fill(0);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      fallback[r * SIZE + c] = r;
    }
  }
  return fallback;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Fence() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const regions = useMemo(() => generateRegions(seed), [seed]);

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 32, 320);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  /* State */
  type Mode = 'scan' | 'paint';
  const [mode, setMode] = useState<Mode>('scan');
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [revealedEdges, setRevealedEdges] = useState<
    Map<string, boolean>
  >(() => new Map()); // edgeKey → sameRegion
  const [paintedCells, setPaintedCells] = useState<Map<number, number>>(
    () => new Map(),
  ); // cell → region color index
  const [wrongPaints, setWrongPaints] = useState<Set<number>>(
    () => new Set(),
  );
  const [selectedColor, setSelectedColor] = useState<number>(0);
  const [scansUsed, setScansUsed] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;
  const shakeXValues = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(0)),
  ).current;

  const scansLeft = diff.maxScans - scansUsed;

  /* ─── Derived: cells correctly painted per region ─── */
  const correctCount = useMemo(() => {
    let count = 0;
    paintedCells.forEach((color, cell) => {
      if (regions[cell] === color) count++;
    });
    return count;
  }, [paintedCells, regions]);

  /* ─── Handle cell tap ─── */
  const handleCellTap = useCallback(
    (key: number) => {
      if (gameOver) return;

      if (mode === 'scan') {
        if (scansLeft <= 0) return;

        if (selectedCell === null) {
          // First tap: select cell
          setSelectedCell(key);
          Animated.sequence([
            Animated.timing(cellScales[key], {
              toValue: 1.15,
              duration: 60,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[key], {
              toValue: 1,
              friction: 3,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();
        } else if (selectedCell === key) {
          // Tap same cell: deselect
          setSelectedCell(null);
        } else {
          // Second tap: check if adjacent
          const neighbors = getOrthNeighbors(selectedCell);
          if (!neighbors.includes(key)) {
            // Not adjacent — select new cell instead
            setSelectedCell(key);
            Animated.sequence([
              Animated.timing(cellScales[key], {
                toValue: 1.15,
                duration: 60,
                useNativeDriver: true,
              }),
              Animated.spring(cellScales[key], {
                toValue: 1,
                friction: 3,
                tension: 200,
                useNativeDriver: true,
              }),
            ]).start();
            return;
          }

          // Adjacent! Reveal edge
          const ek = edgeKey(selectedCell, key);
          if (revealedEdges.has(ek)) {
            // Already revealed
            setSelectedCell(null);
            return;
          }

          const sameRegion = regions[selectedCell] === regions[key];
          const newEdges = new Map(revealedEdges);
          newEdges.set(ek, sameRegion);
          setRevealedEdges(newEdges);
          setScansUsed(scansUsed + 1);
          setSelectedCell(null);

          if (sameRegion) {
            // SAME REGION: reveal color of both cells!
            const regionColor = regions[selectedCell];
            const newPainted = new Map(paintedCells);
            newPainted.set(selectedCell, regionColor);
            newPainted.set(key, regionColor);
            setPaintedCells(newPainted);

            // Bounce both cells
            [selectedCell, key].forEach((k) => {
              Animated.sequence([
                Animated.timing(cellScales[k], {
                  toValue: 1.25,
                  duration: 80,
                  useNativeDriver: true,
                }),
                Animated.spring(cellScales[k], {
                  toValue: 1,
                  friction: 3,
                  tension: 200,
                  useNativeDriver: true,
                }),
              ]).start();
            });

            // Check win
            let newCorrect = 0;
            newPainted.forEach((color, cell) => {
              if (regions[cell] === color) newCorrect++;
            });
            if (newCorrect === SIZE * SIZE) {
              setGameOver(true);
              setWon(true);
              recordGame(
                'fence',
                scansUsed + 1,
                diff.maxScans,
                false,
              ).then((s) => {
                setStats(s);
                setShowStats(true);
              });
            }
          } else {
            // DIFFERENT REGIONS: just show the boundary
            [selectedCell, key].forEach((k) => {
              Animated.sequence([
                Animated.timing(cellScales[k], {
                  toValue: 1.1,
                  duration: 60,
                  useNativeDriver: true,
                }),
                Animated.spring(cellScales[k], {
                  toValue: 1,
                  friction: 4,
                  tension: 200,
                  useNativeDriver: true,
                }),
              ]).start();
            });
          }

          // Auto-switch to paint when scans depleted
          if (scansUsed + 1 >= diff.maxScans) {
            setMode('paint');
          }
        }
      } else {
        // PAINT mode
        if (paintedCells.has(key) && !wrongPaints.has(key)) return; // Already correctly painted

        // If wrong paint, allow re-paint
        if (wrongPaints.has(key)) {
          const newWrong = new Set(wrongPaints);
          newWrong.delete(key);
          setWrongPaints(newWrong);
        }

        if (regions[key] === selectedColor) {
          // Correct paint!
          const newPainted = new Map(paintedCells);
          newPainted.set(key, selectedColor);
          setPaintedCells(newPainted);

          Animated.sequence([
            Animated.timing(cellScales[key], {
              toValue: 1.25,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[key], {
              toValue: 1,
              friction: 3,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();

          // Check win
          let newCorrect = 0;
          newPainted.forEach((color, cell) => {
            if (regions[cell] === color) newCorrect++;
          });
          if (newCorrect === SIZE * SIZE) {
            setGameOver(true);
            setWon(true);
            recordGame('fence', scansUsed, diff.maxScans, false).then(
              (s) => {
                setStats(s);
                setShowStats(true);
              },
            );
          }
        } else {
          // Wrong paint!
          const newLives = lives - 1;
          setLives(newLives);

          const newWrong = new Set(wrongPaints);
          newWrong.add(key);
          setWrongPaints(newWrong);

          Animated.sequence([
            Animated.timing(shakeXValues[key], {
              toValue: 6,
              duration: 40,
              useNativeDriver: true,
            }),
            Animated.timing(shakeXValues[key], {
              toValue: -6,
              duration: 40,
              useNativeDriver: true,
            }),
            Animated.timing(shakeXValues[key], {
              toValue: 4,
              duration: 40,
              useNativeDriver: true,
            }),
            Animated.timing(shakeXValues[key], {
              toValue: -4,
              duration: 40,
              useNativeDriver: true,
            }),
            Animated.timing(shakeXValues[key], {
              toValue: 0,
              duration: 40,
              useNativeDriver: true,
            }),
          ]).start();

          if (newLives <= 0) {
            setGameOver(true);
            setWon(false);
            recordGame(
              'fence',
              scansUsed + 99,
              diff.maxScans,
              false,
            ).then((s) => {
              setStats(s);
              setShowStats(true);
            });
          }
        }
      }
    },
    [
      gameOver,
      mode,
      selectedCell,
      revealedEdges,
      paintedCells,
      wrongPaints,
      selectedColor,
      scansUsed,
      lives,
      regions,
      diff.maxScans,
      cellScales,
      shakeXValues,
      scansLeft,
    ],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('fence');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── Share text ─── */
  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const key = r * SIZE + c;
        if (
          paintedCells.has(key) &&
          regions[key] === paintedCells.get(key)
        ) {
          row += REGION_EMOJI[paintedCells.get(key)!];
        } else if (wrongPaints.has(key)) {
          row += '❌';
        } else {
          row += '⬛';
        }
      }
      rows.push(row);
    }
    const livesEmoji =
      '❤️'.repeat(lives) + '🖤'.repeat(MAX_LIVES - lives);
    const result = won ? `${scansUsed} scans ${livesEmoji}` : `Failed ${livesEmoji}`;
    return `🧩 Fence — Day #${puzzleDay}\n${result}\n\n${rows.join('\n')}`;
  }

  /* ─── Render helpers ─── */
  function getEdgeBorder(
    r: number,
    c: number,
    dr: number,
    dc: number,
  ): { width: number; color: string } {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) {
      return { width: 3, color: '#565758' }; // Outer border
    }
    const key = r * SIZE + c;
    const nKey = nr * SIZE + nc;
    const ek = edgeKey(key, nKey);

    if (revealedEdges.has(ek)) {
      const same = revealedEdges.get(ek)!;
      return same
        ? { width: 0, color: 'transparent' } // Same region: no border
        : { width: 3, color: '#ffffff' }; // Different: thick white border
    }
    return { width: 1, color: '#3a3a3c' }; // Unknown: thin gray
  }

  const livesDisplay = Array.from({ length: MAX_LIVES }, (_, i) =>
    i < lives ? '❤️' : '🖤',
  ).join('');

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.dayLabel}>Day #{puzzleDay}</Text>
      <Text style={styles.subtitle}>
        🔍 Scan: tap two neighbors — same region reveals color!{'\n'}
        🎨 Paint: assign remaining cells. {NUM_REGIONS} regions of {REGION_SIZE}.
      </Text>

      {/* Score bar */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Scans</Text>
          <Text
            style={[
              styles.scoreValue,
              scansLeft <= 3 && { color: '#e74c3c' },
            ]}
          >
            {scansLeft}
          </Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Lives</Text>
          <Text style={styles.livesValue}>{livesDisplay}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Painted</Text>
          <Text style={styles.scoreValue}>
            {correctCount}/{SIZE * SIZE}
          </Text>
        </View>
        <Pressable onPress={handleShowStats} style={styles.statsBtn}>
          <Text style={styles.statsBtnText}>📊</Text>
        </Pressable>
      </View>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <Pressable
          style={[
            styles.modeBtn,
            mode === 'scan' && styles.modeBtnActive,
          ]}
          onPress={() => !gameOver && setMode('scan')}
          disabled={scansLeft <= 0}
        >
          <Text
            style={[
              styles.modeBtnText,
              mode === 'scan' && styles.modeBtnTextActive,
            ]}
          >
            🔍 Scan
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.modeBtn,
            mode === 'paint' && styles.modeBtnActiveFlag,
          ]}
          onPress={() => !gameOver && setMode('paint')}
        >
          <Text
            style={[
              styles.modeBtnText,
              mode === 'paint' && styles.modeBtnTextActive,
            ]}
          >
            🎨 Paint
          </Text>
        </Pressable>
      </View>

      {/* Color palette (paint mode) */}
      {mode === 'paint' && (
        <View style={styles.palette}>
          {REGION_COLORS.map((color, i) => {
            let count = 0;
            paintedCells.forEach((v, cell) => {
              if (v === i && regions[cell] === i) count++;
            });
            return (
              <Pressable
                key={i}
                style={[
                  styles.paletteBtn,
                  {
                    backgroundColor: color,
                    borderColor:
                      selectedColor === i ? '#ffffff' : 'transparent',
                    borderWidth: 3,
                    transform: [
                      { scale: selectedColor === i ? 1.1 : 1 },
                    ],
                  },
                ]}
                onPress={() => setSelectedColor(i)}
              >
                <Text style={styles.paletteBtnText}>
                  {count}/{REGION_SIZE}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Grid */}
      <View style={[styles.gridContainer, { width: gridWidth }]}>
        {Array.from({ length: SIZE }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }, (_, c) => {
              const key = r * SIZE + c;
              const isPainted =
                paintedCells.has(key) && !wrongPaints.has(key);
              const paintColor = isPainted
                ? paintedCells.get(key)!
                : -1;
              const isWrong = wrongPaints.has(key);
              const isSelected = selectedCell === key;

              // Compute borders based on revealed edges
              const topEdge = getEdgeBorder(r, c, -1, 0);
              const bottomEdge = getEdgeBorder(r, c, 1, 0);
              const leftEdge = getEdgeBorder(r, c, 0, -1);
              const rightEdge = getEdgeBorder(r, c, 0, 1);

              const bgColor = isPainted
                ? REGION_COLORS[paintColor]
                : isWrong
                  ? '#3a1a1a'
                  : isSelected
                    ? mode === 'scan'
                      ? '#2a3a4a'
                      : REGION_COLORS_DIM[selectedColor]
                    : '#1a1a1b';

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [
                      { scale: cellScales[key] },
                      { translateX: shakeXValues[key] },
                    ],
                  }}
                >
                  <Pressable
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bgColor,
                        borderTopWidth: topEdge.width,
                        borderTopColor: topEdge.color,
                        borderBottomWidth: bottomEdge.width,
                        borderBottomColor: bottomEdge.color,
                        borderLeftWidth: leftEdge.width,
                        borderLeftColor: leftEdge.color,
                        borderRightWidth: rightEdge.width,
                        borderRightColor: rightEdge.color,
                      },
                    ]}
                    onPress={() => handleCellTap(key)}
                    disabled={gameOver}
                  >
                    {isWrong && (
                      <Text style={styles.wrongX}>✕</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Game over */}
      {gameOver && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>
            {won
              ? lives === MAX_LIVES
                ? 'Perfect! ✨'
                : 'Mapped! 🧩'
              : 'Out of lives 💔'}
          </Text>
          <Text style={styles.resultText}>
            {won
              ? `${scansUsed} scans — ${lives}/${MAX_LIVES} lives`
              : `${correctCount}/${SIZE * SIZE} cells painted`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      {/* Reveal solution on loss */}
      {gameOver && !won && (
        <View style={styles.revealBox}>
          <Text style={styles.revealTitle}>Solution:</Text>
          <View style={[styles.revealGrid, { width: gridWidth }]}>
            {Array.from({ length: SIZE }, (_, r) => (
              <View key={r} style={styles.revealRow}>
                {Array.from({ length: SIZE }, (_, c) => (
                  <View
                    key={c}
                    style={[
                      styles.revealCell,
                      {
                        width: cellSize,
                        height: Math.floor(cellSize * 0.6),
                        backgroundColor: REGION_COLORS[regions[r * SIZE + c]],
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      )}

      <CelebrationBurst show={gameOver && won && lives === MAX_LIVES} />

      {stats && showStats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
    </ScrollView>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#121213' },
  container: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dayLabel: {
    color: '#818384',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  subtitle: {
    color: '#818384',
    fontSize: 11,
    textAlign: 'left',
    marginBottom: 10,
    lineHeight: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
  },
  scoreBox: { alignItems: 'center' },
  scoreLabel: { color: '#818384', fontSize: 10, fontWeight: '600' },
  scoreValue: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  livesValue: { fontSize: 18, marginTop: 2 },
  statsBtn: { padding: 6 },
  statsBtnText: { fontSize: 18 },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  modeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a1b',
    borderWidth: 2,
    borderColor: '#3a3a3c',
  },
  modeBtnActive: {
    backgroundColor: '#1a2a3a',
    borderColor: '#3498db',
  },
  modeBtnActiveFlag: {
    backgroundColor: '#2a1a2a',
    borderColor: '#9b59b6',
  },
  modeBtnText: {
    color: '#818384',
    fontSize: 14,
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  palette: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  paletteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: '#00000060',
    textShadowRadius: 2,
  },
  gridContainer: { alignSelf: 'center' },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrongX: {
    color: '#e74c3c',
    fontSize: 18,
    fontWeight: '900',
  },
  revealBox: {
    alignItems: 'center',
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#1a1a1b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  revealTitle: {
    color: '#818384',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  revealGrid: { alignSelf: 'center' },
  revealRow: { flexDirection: 'row' },
  revealCell: { borderRadius: 2, margin: 1 },
  resultBox: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  resultText: {
    color: '#818384',
    fontSize: 14,
    marginBottom: 8,
  },
});
