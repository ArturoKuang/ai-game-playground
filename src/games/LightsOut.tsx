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
import { getDailySeed, seededRandom, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

const GRID_SIZE = 5;

/** Difficulty-scaled parameters */
function getDifficultyParams() {
  const d = getDayDifficulty(); // 1 (Mon) to 5 (Fri)
  // Mon: 4-6 taps, par 10. Fri: 8-12 taps, par 6
  const minTaps = 3 + d;      // Mon=4, Fri=8
  const tapRange = 2 + d;     // Mon=3, Fri=7 → range 4-6 to 8-14
  const parTaps = 11 - d;     // Mon=10, Fri=6
  return { minTaps, tapRange, parTaps };
}

/** Generate a solvable board by working backwards from solved state */
function generateBoard(seed: number, minTaps: number, tapRange: number): boolean[][] {
  const rng = seededRandom(seed);
  const board = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(false)
  );

  const numTaps = minTaps + Math.floor(rng() * tapRange);
  for (let i = 0; i < numTaps; i++) {
    const r = Math.floor(rng() * GRID_SIZE);
    const c = Math.floor(rng() * GRID_SIZE);
    toggle(board, r, c);
  }

  // Ensure board isn't already solved
  if (isSolved(board)) {
    toggle(board, 0, 0);
  }

  return board;
}

function toggle(board: boolean[][], r: number, c: number) {
  const flip = (row: number, col: number) => {
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      board[row][col] = !board[row][col];
    }
  };
  flip(r, c);
  flip(r - 1, c);
  flip(r + 1, c);
  flip(r, c - 1);
  flip(r, c + 1);
}

function isSolved(board: boolean[][]): boolean {
  return board.every((row) => row.every((cell) => !cell));
}

export default function LightsOut() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const { minTaps, tapRange, parTaps } = useMemo(() => getDifficultyParams(), []);
  const initialBoard = useMemo(() => generateBoard(seed, minTaps, tapRange), [seed, minTaps, tapRange]);

  const [board, setBoard] = useState(() =>
    initialBoard.map((row) => [...row])
  );
  const [taps, setTaps] = useState(0);
  const [tapHistory, setTapHistory] = useState<[number, number][]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);

  const solved = isSolved(board);
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor(maxWidth / GRID_SIZE) - 6;

  const cellScales = useRef(
    Array.from({ length: GRID_SIZE * GRID_SIZE }, () => new Animated.Value(1))
  ).current;

  const animateAffected = useCallback(
    (r: number, c: number) => {
      const affected = [
        [r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
      ].filter(([ar, ac]) => ar >= 0 && ar < GRID_SIZE && ac >= 0 && ac < GRID_SIZE);

      const anims = affected.map(([ar, ac]) => {
        const idx = ar * GRID_SIZE + ac;
        return Animated.sequence([
          Animated.timing(cellScales[idx], {
            toValue: 1.15,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[idx], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.parallel(anims).start();
    },
    [cellScales]
  );

  const handleTap = useCallback(
    (r: number, c: number) => {
      if (solved) return;
      animateAffected(r, c);
      const next = board.map((row) => [...row]);
      toggle(next, r, c);
      setBoard(next);
      setTaps((t) => t + 1);
      setTapHistory((h) => [...h, [r, c]]);

      if (isSolved(next)) {
        recordGame('lightsout', taps + 1, parTaps).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [board, solved, taps]
  );

  const handleUndo = useCallback(() => {
    if (tapHistory.length === 0 || solved) return;
    const [r, c] = tapHistory[tapHistory.length - 1];
    const next = board.map((row) => [...row]);
    toggle(next, r, c);
    setBoard(next);
    setTaps((t) => t - 1);
    setTapHistory((h) => h.slice(0, -1));
  }, [board, tapHistory, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('lightsout');
    setStatsData(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const under = taps <= parTaps;
    // Build a 5x5 heatmap of tap locations
    const tapCounts = Array.from({ length: GRID_SIZE }, () =>
      Array(GRID_SIZE).fill(0)
    );
    for (const [r, c] of tapHistory) tapCounts[r][c]++;
    const heatmap = tapCounts
      .map((row) =>
        row
          .map((count) =>
            count === 0 ? '\u2b1b' : count === 1 ? '\ud83d\udfe8' : '\ud83d\udfe7'
          )
          .join('')
      )
      .join('\n');
    return `LightsOut Day #${puzzleDay} \ud83d\udca1\n${taps}/${parTaps} taps\n${heatmap}\n${under ? '\u2b50 All lights off!' : `Solved in ${taps} taps`}`;
  }

  // Count remaining lights
  const lightsOn = board.flat().filter(Boolean).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LightsOut</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Turn off all the lights. Tapping toggles a cell and its neighbors.
      </Text>

      <View style={styles.moveCounter}>
        <Text style={styles.moveLabel}>Taps</Text>
        <Text
          style={[
            styles.moveCount,
            solved && taps <= parTaps && styles.moveCountGood,
          ]}
        >
          {taps}
        </Text>
        <Text style={styles.movePar}>Par: {parTaps}</Text>
        <Text style={styles.lightsLeft}>
          {'\ud83d\udca1'} {lightsOn} left
        </Text>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {board.map((row, r) => (
          <View key={r} style={styles.gridRow}>
            {row.map((lit, c) => {
              const idx = r * GRID_SIZE + c;
              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[idx] }] }}
                >
                  <Pressable
                    onPress={() => handleTap(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: lit ? '#f1c40f' : '#2c2c2e',
                        borderColor: lit ? '#f39c12' : '#3a3a3c',
                      },
                    ]}
                  >
                    {lit && <View style={styles.glow} />}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Undo button */}
      {!solved && tapHistory.length > 0 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoBtnText}>Undo</Text>
        </Pressable>
      )}

      <CelebrationBurst show={solved && taps <= parTaps} />

      {solved && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {taps <= parTaps ? '\ud83c\udf1f' : '\ud83d\udca1'}
          </Text>
          <Text style={styles.winText}>
            {taps <= parTaps
              ? `Under par! ${taps} taps`
              : `Lights out in ${taps} taps`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap any cell to toggle it and its 4 neighbors (up, down, left, right).
          Your goal: turn every yellow cell dark.{'\n\n'}
          Looks simple — but finding the optimal sequence is the real challenge.
          Par: {parTaps} taps.
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
  moveCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  moveLabel: { color: '#818384', fontSize: 14 },
  moveCount: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  moveCountGood: { color: '#2ecc71' },
  movePar: { color: '#818384', fontSize: 14 },
  lightsLeft: { color: '#f1c40f', fontSize: 14, marginLeft: 8 },
  grid: {
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: '60%',
    height: '60%',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  undoBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  winMessage: {
    alignItems: 'center',
    marginTop: 20,
  },
  winEmoji: { fontSize: 48 },
  winText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  howTo: {
    marginTop: 28,
    paddingHorizontal: 12,
    maxWidth: 360,
  },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: {
    color: '#818384',
    fontSize: 13,
    lineHeight: 20,
  },
});
