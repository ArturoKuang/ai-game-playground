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
const GAP = 2;

const TILE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
const TILE_BORDERS = ['#c0392b', '#2980b9', '#27ae60', '#e67e22'];
const TILE_EMOJI = ['\uD83D\uDFE5', '\uD83D\uDFE6', '\uD83D\uDFE9', '\uD83D\uDFE8'];

type SlideAction = { type: 'row' | 'col'; index: number; dir: -1 | 1 };

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  const numColors = d <= 2 ? 3 : 4;
  const numSlides = 3 + d; // Mon: 4, Fri: 8
  return { numColors, numSlides };
}

/* ─── Generate grid ─── */
function generateGrid(seed: number, numColors: number): number[][] {
  const rng = seededRandom(seed);
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => Math.floor(rng() * numColors)),
  );
}

/* ─── Neighbors ─── */
function adj(key: number): number[] {
  const r = Math.floor(key / SIZE);
  const c = key % SIZE;
  const result: number[] = [];
  if (r > 0) result.push((r - 1) * SIZE + c);
  if (r < SIZE - 1) result.push((r + 1) * SIZE + c);
  if (c > 0) result.push(r * SIZE + c - 1);
  if (c < SIZE - 1) result.push(r * SIZE + c + 1);
  return result;
}

/* ─── Largest connected same-color region ─── */
function largestRegion(grid: number[][]): number {
  const visited = new Set<number>();
  let best = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const key = r * SIZE + c;
      if (visited.has(key)) continue;
      const color = grid[r][c];
      let size = 0;
      const queue = [key];
      visited.add(key);
      while (queue.length > 0) {
        const k = queue.shift()!;
        size++;
        for (const nk of adj(k)) {
          if (!visited.has(nk)) {
            const nr = Math.floor(nk / SIZE);
            const nc = nk % SIZE;
            if (grid[nr][nc] === color) {
              visited.add(nk);
              queue.push(nk);
            }
          }
        }
      }
      best = Math.max(best, size);
    }
  }
  return best;
}

/* ─── Apply a slide ─── */
function applySlide(grid: number[][], action: SlideAction): number[][] {
  const g = grid.map((r) => [...r]);
  if (action.type === 'row') {
    const row = g[action.index];
    if (action.dir === -1) {
      // Slide left: first goes to end
      const first = row[0];
      for (let c = 0; c < SIZE - 1; c++) row[c] = row[c + 1];
      row[SIZE - 1] = first;
    } else {
      // Slide right: last goes to start
      const last = row[SIZE - 1];
      for (let c = SIZE - 1; c > 0; c--) row[c] = row[c - 1];
      row[0] = last;
    }
  } else {
    if (action.dir === -1) {
      // Slide up: top goes to bottom
      const top = g[0][action.index];
      for (let r = 0; r < SIZE - 1; r++) g[r][action.index] = g[r + 1][action.index];
      g[SIZE - 1][action.index] = top;
    } else {
      // Slide down: bottom goes to top
      const bot = g[SIZE - 1][action.index];
      for (let r = SIZE - 1; r > 0; r--) g[r][action.index] = g[r - 1][action.index];
      g[0][action.index] = bot;
    }
  }
  return g;
}

/* ─── Greedy solver for par ─── */
function greedySolve(grid: number[][], numSlides: number): number {
  const allSlides: SlideAction[] = [];
  for (let i = 0; i < SIZE; i++) {
    allSlides.push({ type: 'row', index: i, dir: -1 });
    allSlides.push({ type: 'row', index: i, dir: 1 });
    allSlides.push({ type: 'col', index: i, dir: -1 });
    allSlides.push({ type: 'col', index: i, dir: 1 });
  }

  let g = grid;
  for (let s = 0; s < numSlides; s++) {
    let bestScore = largestRegion(g);
    let bestSlide: SlideAction | null = null;
    for (const slide of allSlides) {
      const ng = applySlide(g, slide);
      const sc = largestRegion(ng);
      if (sc > bestScore) {
        bestScore = sc;
        bestSlide = slide;
      }
    }
    if (bestSlide) g = applySlide(g, bestSlide);
    else break;
  }
  return largestRegion(g);
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Shift() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const initialGrid = useMemo(
    () => generateGrid(seed, diff.numColors),
    [seed, diff.numColors],
  );
  const par = useMemo(
    () => greedySolve(initialGrid, diff.numSlides),
    [initialGrid, diff.numSlides],
  );
  const initialRegion = useMemo(() => largestRegion(initialGrid), [initialGrid]);

  const { width: screenWidth } = useWindowDimensions();
  const arrowSize = 28;
  const arrowGap = 4;
  const pad = 48;
  const maxGridW = Math.min(
    screenWidth - (arrowSize + arrowGap) * 2 - pad,
    300,
  );
  const cellSize = Math.floor((maxGridW - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const minScore = Math.ceil(par * 0.6);

  const [grid, setGrid] = useState<number[][]>(() =>
    initialGrid.map((r) => [...r]),
  );
  const [slides, setSlides] = useState(0);
  const [region, setRegion] = useState(initialRegion);
  const [previewAction, setPreviewAction] = useState<SlideAction | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  /* ─── P1 preview: show result of a potential slide ─── */
  const previewData = useMemo(() => {
    if (!previewAction) return null;
    const pg = applySlide(grid, previewAction);
    return { grid: pg, region: largestRegion(pg) };
  }, [previewAction, grid]);

  /* ─── highlight cells in the largest region ─── */
  const regionCells = useMemo(() => {
    const g = previewData ? previewData.grid : grid;
    const visited = new Set<number>();
    let bestSet = new Set<number>();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const key = r * SIZE + c;
        if (visited.has(key)) continue;
        const color = g[r][c];
        const group = new Set<number>();
        const queue = [key];
        visited.add(key);
        while (queue.length > 0) {
          const k = queue.shift()!;
          group.add(k);
          for (const nk of adj(k)) {
            if (!visited.has(nk)) {
              const nr = Math.floor(nk / SIZE);
              const nc = nk % SIZE;
              if (g[nr][nc] === color) { visited.add(nk); queue.push(nk); }
            }
          }
        }
        if (group.size > bestSet.size) bestSet = group;
      }
    }
    return bestSet;
  }, [grid, previewData]);

  const displayGrid = previewData ? previewData.grid : grid;
  const displayRegion = previewData ? previewData.region : region;

  /* ─── handle arrow tap (two-tap: preview then confirm) ─── */
  const handleArrowTap = useCallback(
    (action: SlideAction) => {
      if (gameOver || slides >= diff.numSlides) return;

      // Same arrow tapped twice → confirm
      if (
        previewAction &&
        previewAction.type === action.type &&
        previewAction.index === action.index &&
        previewAction.dir === action.dir
      ) {
        setPreviewAction(null);
        const newGrid = applySlide(grid, action);
        const newRegion = largestRegion(newGrid);
        const newSlides = slides + 1;

        // Animate affected cells
        const affected: number[] = [];
        if (action.type === 'row') {
          for (let cc = 0; cc < SIZE; cc++) affected.push(action.index * SIZE + cc);
        } else {
          for (let rr = 0; rr < SIZE; rr++) affected.push(rr * SIZE + action.index);
        }
        for (const key of affected) {
          Animated.sequence([
            Animated.timing(cellScales[key], {
              toValue: 0.85,
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
        }

        setGrid(newGrid);
        setRegion(newRegion);
        setSlides(newSlides);

        if (newSlides >= diff.numSlides) {
          setGameOver(true);
          recordGame('shift', newRegion, par, true).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
        return;
      }

      // First tap → preview
      setPreviewAction(action);
    },
    [previewAction, grid, slides, gameOver, diff.numSlides, par, cellScales],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('shift');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) row += TILE_EMOJI[grid[r][c]];
      rows.push(row);
    }
    return [
      `Shift Day #${puzzleDay} \uD83D\uDD00`,
      rows.join('\n'),
      `Region: ${region} (par ${par})`,
      region >= par ? '\u2B50 Beat par!' : `${par - region} short of par`,
    ].join('\n');
  }

  /* ─── render ─── */
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shift</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Slide rows {'\u0026'} columns to group colors together!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Slides</Text>
          <Text style={styles.infoValue}>
            {slides}/{diff.numSlides}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Region</Text>
          <Text
            style={[
              styles.infoValue,
              gameOver && region >= par && styles.infoValueGood,
              gameOver && region < minScore && styles.infoValueBad,
            ]}
          >
            {displayRegion}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Min / Par</Text>
          <Text style={styles.infoPar}>{minScore} / {par}</Text>
        </View>
      </View>

      {/* Grid with slide arrows */}
      <View style={styles.gridArea}>
        {/* Column arrows (up) */}
        <View style={[styles.colArrows, { width: gridWidth, marginLeft: arrowSize + arrowGap }]}>
          {Array.from({ length: SIZE }).map((_, c) => (
            <Pressable
              key={c}
              onPress={() => handleArrowTap({ type: 'col', index: c, dir: -1 })}
              style={[styles.arrow, { width: cellSize, height: arrowSize }]}
            >
              <Text style={styles.arrowText}>{'\u25B2'}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.middleRow}>
          {/* Row arrows (left) */}
          <View style={styles.sideArrows}>
            {Array.from({ length: SIZE }).map((_, r) => (
              <Pressable
                key={r}
                onPress={() => handleArrowTap({ type: 'row', index: r, dir: -1 })}
                style={[styles.arrow, { width: arrowSize, height: cellSize }]}
              >
                <Text style={styles.arrowText}>{'\u25C0'}</Text>
              </Pressable>
            ))}
          </View>

          {/* Grid */}
          <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
            {Array.from({ length: SIZE }).map((_, r) => (
              <View key={r} style={styles.gridRow}>
                {Array.from({ length: SIZE }).map((_, c) => {
                  const key = r * SIZE + c;
                  const color = displayGrid[r][c];
                  const inRegion = regionCells.has(key);
                  return (
                    <Animated.View
                      key={c}
                      style={{ transform: [{ scale: cellScales[key] }] }}
                    >
                      <View
                        style={[
                          styles.cell,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: TILE_COLORS[color],
                            borderColor: inRegion ? '#fff' : TILE_BORDERS[color],
                            borderWidth: inRegion ? 3 : 2,
                          },
                        ]}
                      />
                    </Animated.View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Row arrows (right) */}
          <View style={styles.sideArrows}>
            {Array.from({ length: SIZE }).map((_, r) => (
              <Pressable
                key={r}
                onPress={() => handleArrowTap({ type: 'row', index: r, dir: 1 })}
                style={[styles.arrow, { width: arrowSize, height: cellSize }]}
              >
                <Text style={styles.arrowText}>{'\u25B6'}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Column arrows (down) */}
        <View style={[styles.colArrows, { width: gridWidth, marginLeft: arrowSize + arrowGap }]}>
          {Array.from({ length: SIZE }).map((_, c) => (
            <Pressable
              key={c}
              onPress={() => handleArrowTap({ type: 'col', index: c, dir: 1 })}
              style={[styles.arrow, { width: cellSize, height: arrowSize }]}
            >
              <Text style={styles.arrowText}>{'\u25BC'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Preview hint */}
      {previewAction && !gameOver && (
        <View style={styles.previewHint}>
          <Text style={styles.previewText}>
            Region {'\u2192'} {previewData?.region ?? '?'} — tap again!
          </Text>
        </View>
      )}

      <CelebrationBurst show={gameOver && region >= par} />

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {region >= par ? '\u2B50' : '\uD83D\uDD00'}
          </Text>
          <Text style={styles.winText}>
            {region >= par
              ? `Region ${region} \u2014 beat par (${par})!`
              : `Region ${region} (par ${par})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap the arrows to slide rows left/right or columns up/down
          (tiles wrap around). Create the biggest connected group of
          one color!
          {'\n\n'}
          You have {diff.numSlides} slides. Each slide affects an
          entire row or column. Plan carefully — sliding one row might
          break a group in another!
        </Text>
      </View>

      {showStats && stats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
    </ScrollView>
  );
}

/* ─── Styles ─── */
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
    marginBottom: 12,
    textAlign: 'center',
    maxWidth: 300,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
    alignItems: 'baseline',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  infoValueGood: { color: '#2ecc71' },
  infoValueBad: { color: '#e74c3c' },
  previewHint: {
    marginTop: 8,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  previewText: {
    color: '#f1c40f',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoPar: { color: '#818384', fontSize: 14, marginTop: 2 },
  gridArea: { alignItems: 'center', gap: 4 },
  colArrows: { flexDirection: 'row', gap: GAP, justifyContent: 'center' },
  middleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sideArrows: { gap: GAP },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: { borderRadius: 8, borderWidth: 2 },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 6,
  },
  arrowText: { color: '#888', fontSize: 12 },
  winMessage: { alignItems: 'center', marginTop: 20 },
  winEmoji: { fontSize: 48 },
  winText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
