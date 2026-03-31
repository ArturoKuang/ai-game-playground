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
const GRID = 6;
const GAP = 3;

const DIST_COLORS = [
  '#e74c3c', // 0 (impossible for miss, but just in case)
  '#e67e22', // 1 — very close!
  '#f1c40f', // 2
  '#f39c12', // 3
  '#95a5a6', // 4
  '#7f8c8d', // 5
  '#636e72', // 6
  '#2d3436', // 7+
];

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  const numGems = 1 + d;          // Mon: 2, Fri: 6
  const maxGuesses = numGems * 3 + 2; // Mon: 8, Fri: 20
  const par = numGems * 2;        // Mon: 4, Fri: 12
  return { numGems, maxGuesses, par };
}

/* ─── Puzzle generation ─── */
function generatePuzzle(seed: number) {
  const rng = seededRandom(seed);
  const diff = getDifficulty();

  const gems: [number, number][] = [];
  const used = new Set<string>();

  for (let i = 0; i < diff.numGems; i++) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const r = Math.floor(rng() * GRID);
      const c = Math.floor(rng() * GRID);
      const key = cellKey(r, c);

      if (used.has(key)) continue;

      // Ensure minimum distance between gems (at least 2 Manhattan)
      const tooClose = gems.some(
        ([gr, gc]) => manhattan(r, c, gr, gc) < 2,
      );
      if (tooClose) continue;

      gems.push([r, c]);
      used.add(key);
      break;
    }
  }

  return {
    gems,
    gemSet: new Set(gems.map(([r, c]) => cellKey(r, c))),
    numGems: gems.length,
    maxGuesses: diff.maxGuesses,
    par: diff.par,
  };
}

/* ─── Cell state ─── */
type CellState =
  | { type: 'hidden' }
  | { type: 'miss'; distance: number }
  | { type: 'gem' };

/* ═══════════════════════════════════════════ */
/*                 Component                   */
/* ═══════════════════════════════════════════ */
export default function Seek() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const puzzle = useMemo(() => generatePuzzle(seed), [seed]);

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor(maxGrid / GRID);
  const gridPx = GRID * (cellSize + GAP) - GAP;

  const [cells, setCells] = useState<Map<string, CellState>>(() => new Map());
  const [foundGems, setFoundGems] = useState<Set<string>>(new Set());
  const [guessCount, setGuessCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const guessesLeft = puzzle.maxGuesses - guessCount;
  const gemsLeft = puzzle.numGems - foundGems.size;

  // Animation refs
  const scaleRefs = useRef<Map<string, Animated.Value>>(new Map());
  function getScale(key: string): Animated.Value {
    if (!scaleRefs.current.has(key)) {
      scaleRefs.current.set(key, new Animated.Value(1));
    }
    return scaleRefs.current.get(key)!;
  }

  /* Tap a cell */
  const tapCell = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const key = cellKey(r, c);
      if (cells.has(key)) return; // already revealed

      const newCells = new Map(cells);
      const newGuessCount = guessCount + 1;
      const scale = getScale(key);

      if (puzzle.gemSet.has(key)) {
        // HIT! Found a gem
        newCells.set(key, { type: 'gem' });
        const newFound = new Set(foundGems);
        newFound.add(key);

        // Big bounce animation
        scale.setValue(0.3);
        Animated.spring(scale, {
          toValue: 1,
          friction: 3,
          tension: 180,
          useNativeDriver: true,
        }).start();

        setCells(newCells);
        setFoundGems(newFound);
        setGuessCount(newGuessCount);

        // Check win
        if (newFound.size === puzzle.numGems) {
          setGameOver(true);
          setWon(true);
          recordGame('seek', newGuessCount, puzzle.par, false).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
      } else {
        // MISS — show distance to nearest unfound gem
        let minDist = Infinity;
        for (const [gr, gc] of puzzle.gems) {
          const gk = cellKey(gr, gc);
          if (foundGems.has(gk)) continue; // skip found gems
          const d = manhattan(r, c, gr, gc);
          if (d < minDist) minDist = d;
        }
        newCells.set(key, { type: 'miss', distance: minDist });

        // Subtle bounce
        scale.setValue(0.7);
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 200,
          useNativeDriver: true,
        }).start();

        setCells(newCells);
        setGuessCount(newGuessCount);

        // Check loss (out of guesses)
        if (newGuessCount >= puzzle.maxGuesses && foundGems.size < puzzle.numGems) {
          setGameOver(true);
          setWon(false);
          // Reveal remaining gems
          const revealCells = new Map(newCells);
          for (const [gr, gc] of puzzle.gems) {
            const gk = cellKey(gr, gc);
            if (!foundGems.has(gk)) {
              revealCells.set(gk, { type: 'gem' });
            }
          }
          setCells(revealCells);
          recordGame('seek', newGuessCount, puzzle.par, false).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
      }
    },
    [gameOver, cells, guessCount, puzzle, foundGems],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('seek');
    setStats(s);
    setShowStats(true);
  }, []);

  /* Share text */
  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < GRID; r++) {
      let row = '';
      for (let c = 0; c < GRID; c++) {
        const key = cellKey(r, c);
        const state = cells.get(key);
        if (!state || state.type === 'hidden') {
          row += '\u2B1B'; // black (untouched)
        } else if (state.type === 'gem') {
          row += '\uD83D\uDC8E'; // gem
        } else {
          // Distance → color
          const d = state.distance;
          if (d <= 1) row += '\uD83D\uDFE5'; // red (hot!)
          else if (d <= 2) row += '\uD83D\uDFE7'; // orange
          else if (d <= 3) row += '\uD83D\uDFE8'; // yellow
          else row += '\u2B1C'; // white (cold)
        }
      }
      rows.push(row);
    }
    const result = won
      ? `Found all ${puzzle.numGems}! ${guessCount} guesses (par ${puzzle.par})${guessCount <= puzzle.par ? ' \u2B50' : ''}`
      : `Found ${foundGems.size}/${puzzle.numGems} in ${guessCount} guesses`;
    return [
      `Seek Day #${puzzleDay} \uD83D\uDC8E`,
      rows.join('\n'),
      result,
    ].join('\n');
  }

  /* Get display color for a distance value */
  function distColor(d: number): string {
    if (d <= 0) return DIST_COLORS[0];
    if (d >= DIST_COLORS.length) return DIST_COLORS[DIST_COLORS.length - 1];
    return DIST_COLORS[d];
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Seek</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Find the hidden gems! Misses show distance to the nearest gem.
      </Text>

      {/* Info row */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Gems</Text>
          <Text style={[styles.infoValue, gemsLeft === 0 && styles.infoComplete]}>
            {foundGems.size}/{puzzle.numGems}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Guesses</Text>
          <Text style={[
            styles.infoValue,
            guessesLeft <= 3 && !gameOver && styles.infoWarning,
          ]}>
            {guessesLeft}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoValue}>{puzzle.par}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={{ width: gridPx, alignSelf: 'center' }}>
        {Array.from({ length: GRID }).map((_, r) => (
          <View key={`row-${r}`} style={styles.gridRow}>
            {Array.from({ length: GRID }).map((_, c) => {
              const key = cellKey(r, c);
              const state = cells.get(key);
              const scale = getScale(key);
              const isHidden = !state || state.type === 'hidden';
              const isGem = state?.type === 'gem';
              const isMiss = state?.type === 'miss';
              const dist = isMiss ? (state as { type: 'miss'; distance: number }).distance : 0;

              let bgColor = '#2a2a2c'; // hidden
              if (isGem) bgColor = '#9b59b6';
              else if (isMiss) bgColor = distColor(dist) + '33'; // translucent tint

              return (
                <Pressable
                  key={key}
                  onPress={() => tapCell(r, c)}
                  style={{ marginRight: c < GRID - 1 ? GAP : 0, marginBottom: GAP }}
                >
                  <Animated.View
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bgColor,
                        borderColor: isMiss
                          ? distColor(dist)
                          : isGem
                            ? '#9b59b6'
                            : '#3a3a3c',
                        borderWidth: isMiss || isGem ? 2 : 1,
                        transform: [{ scale }],
                      },
                    ]}
                  >
                    {isGem && (
                      <Text style={styles.gemEmoji}>{'\uD83D\uDC8E'}</Text>
                    )}
                    {isMiss && (
                      <Text style={[styles.distText, { color: distColor(dist) }]}>
                        {dist}
                      </Text>
                    )}
                    {isHidden && !gameOver && (
                      <Text style={styles.hiddenDot}>{'\u00B7'}</Text>
                    )}
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Distance legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Distance</Text>
        <View style={styles.legendRow}>
          {[1, 2, 3, 4, 5].map((d) => (
            <View key={d} style={styles.legendItem}>
              <View
                style={[
                  styles.legendSwatch,
                  { backgroundColor: distColor(d) + '33', borderColor: distColor(d) },
                ]}
              >
                <Text style={[styles.legendNum, { color: distColor(d) }]}>{d}</Text>
              </View>
              <Text style={styles.legendLabel}>
                {d === 1 ? 'Hot!' : d === 2 ? 'Warm' : d === 3 ? 'Near' : d <= 4 ? 'Far' : 'Cold'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <CelebrationBurst show={won} />

      {gameOver && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>
            {won ? '\uD83D\uDC8E' : '\uD83D\uDE14'}
          </Text>
          <Text style={styles.endText}>
            {won
              ? guessCount <= puzzle.par
                ? `Perfect! ${guessCount} guesses (par ${puzzle.par})`
                : `Found all ${puzzle.numGems}! ${guessCount} guesses (par ${puzzle.par})`
              : `Found ${foundGems.size}/${puzzle.numGems}. Better luck tomorrow!`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

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
    gap: 24,
    marginBottom: 16,
    alignItems: 'baseline',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  infoComplete: { color: '#2ecc71' },
  infoWarning: { color: '#e74c3c' },
  gridRow: { flexDirection: 'row' },
  cell: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gemEmoji: { fontSize: 22 },
  distText: {
    fontSize: 20,
    fontWeight: '900',
  },
  hiddenDot: {
    fontSize: 18,
    color: '#555',
  },
  legend: {
    marginTop: 12,
    alignItems: 'center',
  },
  legendTitle: {
    color: '#818384',
    fontSize: 11,
    marginBottom: 4,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 8,
  },
  legendItem: { alignItems: 'center', gap: 2 },
  legendSwatch: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendNum: { fontSize: 14, fontWeight: '800' },
  legendLabel: { fontSize: 9, color: '#818384' },
  endMessage: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
});
