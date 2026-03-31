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
const GAP = 3;

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1..5
  return {
    spans: 3 + Math.ceil(d / 2), // Mon:4, Fri:6
    maxVal: 5 + d,               // Mon:6, Fri:10
  };
}

/* ─── Board generation ─── */
function generateGrid(seed: number, maxVal: number): number[][] {
  const rng = seededRandom(seed);
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => 2 + Math.floor(rng() * (maxVal - 1))),
  );
}

/* ─── Cell key helpers ─── */
function key(r: number, c: number): string {
  return `${r},${c}`;
}

function neighbors(r: number, c: number): [number, number][] {
  const result: [number, number][] = [];
  for (const [dr, dc] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) result.push([nr, nc]);
  }
  return result;
}

/* ─── Compute blocked cells from a span ─── */
function computeBlocked(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  existing: Set<string>,
): Set<string> {
  const blocked = new Set<string>();
  // Block all neighbors of both endpoints (except the endpoints themselves)
  for (const [nr, nc] of neighbors(r1, c1)) {
    const k = key(nr, nc);
    if (k !== key(r2, c2) && !existing.has(k)) blocked.add(k);
  }
  for (const [nr, nc] of neighbors(r2, c2)) {
    const k = key(nr, nc);
    if (k !== key(r1, c1) && !existing.has(k)) blocked.add(k);
  }
  return blocked;
}

/* ─── Optimal solver (DFS + pruning) ─── */
function solvePar(grid: number[][], numSpans: number): number {
  let best = 0;

  function dfs(
    available: Set<string>,
    spansLeft: number,
    score: number,
    usedCells: Set<string>,
  ) {
    if (spansLeft === 0) {
      best = Math.max(best, score);
      return;
    }

    // Collect all valid span placements
    const placements: [number, number, number, number, number][] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!available.has(key(r, c))) continue;
        // Try right and down (avoid duplicates)
        if (c + 1 < SIZE && available.has(key(r, c + 1))) {
          placements.push([
            r,
            c,
            r,
            c + 1,
            grid[r][c] + grid[r][c + 1],
          ]);
        }
        if (r + 1 < SIZE && available.has(key(r + 1, c))) {
          placements.push([
            r,
            c,
            r + 1,
            c,
            grid[r][c] + grid[r + 1][c],
          ]);
        }
      }
    }

    if (placements.length === 0) return;

    // Sort by value descending
    placements.sort((a, b) => b[4] - a[4]);

    // Upper bound: sum of top spansLeft placement values
    let ub = score;
    for (
      let i = 0;
      i < Math.min(spansLeft, placements.length);
      i++
    )
      ub += placements[i][4];
    if (ub <= best) return;

    // Try top candidates
    const limit = Math.min(placements.length, 10);
    for (let i = 0; i < limit; i++) {
      const [r1, c1, r2, c2, val] = placements[i];
      const blocked = computeBlocked(r1, c1, r2, c2, usedCells);
      const newAvailable = new Set(available);
      newAvailable.delete(key(r1, c1));
      newAvailable.delete(key(r2, c2));
      for (const k of blocked) newAvailable.delete(k);
      const newUsed = new Set(usedCells);
      newUsed.add(key(r1, c1));
      newUsed.add(key(r2, c2));
      dfs(newAvailable, spansLeft - 1, score + val, newUsed);
    }
  }

  const allCells = new Set<string>();
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) allCells.add(key(r, c));

  dfs(allCells, numSpans, 0, new Set());
  return best;
}

/* ═══════════════════════════════════════════ */
/*                 Component                   */
/* ═══════════════════════════════════════════ */
export default function Span() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const grid = useMemo(
    () => generateGrid(seed, diff.maxVal),
    [seed, diff],
  );
  const par = useMemo(
    () => solvePar(grid, diff.spans),
    [grid, diff.spans],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
    null,
  );
  const [spansPlaced, setSpansPlaced] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [usedCells, setUsedCells] = useState<Set<string>>(new Set());
  const [blockedCells, setBlockedCells] = useState<Set<string>>(new Set());
  const [spanPairs, setSpanPairs] = useState<Set<string>>(new Set());

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  const spansLeft = diff.spans - spansPlaced;

  /* Which cells are available (not used, not blocked) */
  const available = useMemo(() => {
    const s = new Set<string>();
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        const k = key(r, c);
        if (!usedCells.has(k) && !blockedCells.has(k)) s.add(k);
      }
    return s;
  }, [usedCells, blockedCells]);

  /* P1 preview: when first cell selected, show valid partners and their blocking */
  const validPartners = useMemo(() => {
    if (!selectedCell) return new Set<string>();
    const [sr, sc] = selectedCell;
    const partners = new Set<string>();
    for (const [nr, nc] of neighbors(sr, sc)) {
      if (available.has(key(nr, nc))) partners.add(key(nr, nc));
    }
    return partners;
  }, [selectedCell, available]);

  /* Preview blocked cells for a potential second endpoint */
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const previewBlocked = useMemo(() => {
    if (!selectedCell || !hoverCell) return new Set<string>();
    const [r1, c1] = selectedCell;
    const [r2, c2] = hoverCell;
    return computeBlocked(
      r1,
      c1,
      r2,
      c2,
      new Set([...usedCells, ...blockedCells]),
    );
  }, [selectedCell, hoverCell, usedCells, blockedCells]);

  const previewBlockedValue = useMemo(() => {
    let total = 0;
    for (const k of previewBlocked) {
      const [rr, cc] = k.split(',').map(Number);
      total += grid[rr][cc];
    }
    return total;
  }, [previewBlocked, grid]);

  /* Tap a cell */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver || spansLeft <= 0) return;
      const k = key(r, c);
      if (!available.has(k)) return;

      // First tap: select first endpoint
      if (!selectedCell) {
        setSelectedCell([r, c]);
        setHoverCell(null);
        const idx = r * SIZE + c;
        Animated.sequence([
          Animated.timing(cellScales[idx], {
            toValue: 1.1,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[idx], {
            toValue: 1,
            friction: 4,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
        return;
      }

      // Tap same cell: deselect
      if (selectedCell[0] === r && selectedCell[1] === c) {
        setSelectedCell(null);
        setHoverCell(null);
        return;
      }

      // Tap a valid partner: place span
      if (validPartners.has(k)) {
        const [r1, c1] = selectedCell;
        const val = grid[r1][c1] + grid[r][c];
        const blocked = computeBlocked(
          r1,
          c1,
          r,
          c,
          new Set([...usedCells, ...blockedCells]),
        );

        // Animate span placement
        for (const [cr, cc] of [
          [r1, c1],
          [r, c],
        ]) {
          const idx = cr * SIZE + cc;
          Animated.sequence([
            Animated.timing(cellScales[idx], {
              toValue: 1.25,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[idx], {
              toValue: 1,
              friction: 3,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
        // Animate blocked cells (shrink)
        for (const bk of blocked) {
          const [br, bc] = bk.split(',').map(Number);
          const bidx = br * SIZE + bc;
          Animated.sequence([
            Animated.timing(cellScales[bidx], {
              toValue: 0.85,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[bidx], {
              toValue: 1,
              friction: 4,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }

        const newUsed = new Set(usedCells);
        newUsed.add(key(r1, c1));
        newUsed.add(k);
        const newBlocked = new Set(blockedCells);
        for (const bk of blocked) newBlocked.add(bk);
        const newPairs = new Set(spanPairs);
        newPairs.add(`${r1},${c1}-${r},${c}`);

        const newScore = score + val;
        const newSpans = spansPlaced + 1;

        setUsedCells(newUsed);
        setBlockedCells(newBlocked);
        setSpanPairs(newPairs);
        setScore(newScore);
        setSpansPlaced(newSpans);
        setSelectedCell(null);
        setHoverCell(null);

        if (newSpans >= diff.spans) {
          setGameOver(true);
          recordGame('span', newScore, par, true).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
        return;
      }

      // Tap a non-partner available cell: reselect
      setSelectedCell([r, c]);
      setHoverCell(null);
      const idx = r * SIZE + c;
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 1.1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.spring(cellScales[idx], {
          toValue: 1,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [
      gameOver,
      spansLeft,
      available,
      selectedCell,
      validPartners,
      grid,
      usedCells,
      blockedCells,
      spanPairs,
      score,
      spansPlaced,
      diff.spans,
      par,
      cellScales,
    ],
  );

  /* Show preview when entering a valid partner */
  const handlePreview = useCallback(
    (r: number, c: number) => {
      if (!selectedCell) return;
      if (validPartners.has(key(r, c))) {
        setHoverCell([r, c]);
      } else {
        setHoverCell(null);
      }
    },
    [selectedCell, validPartners],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('span');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const k = key(r, c);
        if (usedCells.has(k)) row += '\uD83D\uDFE2';
        else if (blockedCells.has(k)) row += '\uD83D\uDFE5';
        else row += '\u2B1C';
      }
      rows.push(row);
    }
    return [
      `Span Day #${puzzleDay} \uD83E\uDDF1`,
      rows.join('\n'),
      `Score: ${score} / ${par}${score >= par ? ' \u2B50' : ''}`,
    ].join('\n');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Span</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Place {diff.spans} spans on adjacent pairs {'\u2014'} each blocks
        its neighbors!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Score</Text>
          <Text
            style={[
              styles.infoValue,
              gameOver && score >= par && styles.infoValueGood,
            ]}
          >
            {score}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Spans</Text>
          <Text
            style={[
              styles.infoValue,
              spansLeft <= 1 && spansLeft > 0 && styles.infoValueWarn,
            ]}
          >
            {spansLeft}
          </Text>
        </View>
      </View>

      {/* Preview hint */}
      {selectedCell && !gameOver && (
        <View style={styles.previewHint}>
          <Text style={styles.previewText}>
            {hoverCell
              ? `+${grid[selectedCell[0]][selectedCell[1]] + grid[hoverCell[0]][hoverCell[1]]} pts, blocks ${previewBlocked.size} cells \u2014 tap to place!`
              : `Selected ${grid[selectedCell[0]][selectedCell[1]]} \u2014 tap an adjacent cell`}
          </Text>
        </View>
      )}

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }).map((_, c) => {
              const k = key(r, c);
              const isUsed = usedCells.has(k);
              const isBlocked = blockedCells.has(k);
              const isSelected =
                selectedCell &&
                selectedCell[0] === r &&
                selectedCell[1] === c;
              const isPartner = validPartners.has(k);
              const isPreviewBlocked = previewBlocked.has(k);
              const isHover =
                hoverCell && hoverCell[0] === r && hoverCell[1] === c;

              let bg = '#3a5a3a';
              if (isUsed) bg = '#1a4a1a';
              else if (isBlocked) bg = '#2a2a2c';
              else {
                const intensity = Math.min(
                  1,
                  grid[r][c] / 10,
                );
                bg = `rgb(${52 + Math.floor(intensity * 100)}, ${100 + Math.floor(intensity * 100)}, ${52 + Math.floor(intensity * 50)})`;
              }

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [{ scale: cellScales[r * SIZE + c] }],
                  }}
                >
                  <Pressable
                    onPress={() => handleTap(r, c)}
                    onPressIn={() => handlePreview(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bg,
                      },
                      isSelected && styles.cellSelected,
                      isPartner && styles.cellPartner,
                      isHover && styles.cellHover,
                      isPreviewBlocked && styles.cellPreviewBlocked,
                    ]}
                  >
                    {isUsed ? (
                      <Text style={styles.usedCheck}>{'\u2713'}</Text>
                    ) : isBlocked ? (
                      <Text style={styles.blockedX}>{'\u2715'}</Text>
                    ) : (
                      <Text
                        style={[
                          styles.cellValue,
                          grid[r][c] >= 7 && styles.cellValueHigh,
                        ]}
                      >
                        {grid[r][c]}
                      </Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      <CelebrationBurst show={gameOver && score >= par} />

      {gameOver && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>
            {score >= par ? '\u2B50' : '\uD83E\uDDF1'}
          </Text>
          <Text style={styles.endText}>
            {score >= par
              ? `Score ${score} \u2014 beat par (${par})!`
              : `Score ${score} / ${par}`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a cell, then tap an adjacent cell to place a span.
          You score both values! But every cell next to your span
          gets blocked.{'\n\n'}
          Plan your {diff.spans} spans to grab big values without
          blocking future targets. Orientation matters {'\u2014'}{' '}
          horizontal vs vertical blocks different cells!
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
    maxWidth: 340,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
    alignItems: 'baseline',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  infoValueGood: { color: '#2ecc71' },
  infoValueWarn: { color: '#f1c40f' },
  infoPar: {
    color: '#818384',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  previewHint: {
    marginBottom: 8,
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
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  cellSelected: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  cellPartner: {
    borderColor: '#f1c40f',
    borderWidth: 2,
  },
  cellHover: {
    borderColor: '#2ecc71',
    borderWidth: 3,
  },
  cellPreviewBlocked: {
    borderColor: '#c0392b',
    borderWidth: 2,
  },
  cellValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  cellValueHigh: {
    textShadowColor: 'rgba(255,255,255,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  usedCheck: {
    color: '#2ecc71',
    fontSize: 24,
    fontWeight: '800',
  },
  blockedX: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
  },
  endMessage: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
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
