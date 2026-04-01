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
import { getDailySeed, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';
import {
  SIZE,
  CELLS,
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
  solve,
} from '../solvers/Slide.solver';

/* ─── Constants ─── */
const GAP = 4;
const TILE_COLORS = [
  '', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
];

export default function Slide() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const initialTiles = useMemo(
    () => generatePuzzle(seed, getDayDifficulty()),
    [seed],
  );
  const par = useMemo(() => {
    const sol = solve(initialTiles, 5);
    return sol ? sol.steps : 20;
  }, [initialTiles]);

  const [tiles, setTiles] = useState(() => [...initialTiles]);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<number[][]>(() => [[...initialTiles]]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(tiles);
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 300);
  const cellSize = Math.floor(maxWidth / SIZE) - GAP;

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: CELLS }, () => new Animated.Value(1)),
  ).current;

  const bounceTile = useCallback(
    (idx: number) => {
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 1.08,
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
    [cellScales],
  );

  /* ── Tap handler ── */
  const handleTap = useCallback(
    (idx: number) => {
      if (solved) return;
      const legal = legalMoves(tiles);
      if (!legal.includes(idx)) return;

      bounceTile(idx);
      const next = applyMove(tiles, idx);
      const nextMoves = moves + 1;
      setTiles(next);
      setMoves(nextMoves);
      setHistory((h) => [...h, next]);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('slide', nextMoves, par).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [tiles, solved, moves, par, gameRecorded, bounceTile],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setTiles([...prev]);
    setMoves((m) => m - 1);
    setHistory((h) => h.slice(0, -1));
  }, [history, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('slide');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const under = moves <= par;
    // Show tile positions as emoji grid
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const tile = initialTiles[r * SIZE + c];
        row +=
          tile === 0
            ? '\u2b1b'
            : [
                '',
                '\ud83d\udfe5',
                '\ud83d\udfe7',
                '\ud83d\udfe8',
                '\ud83d\udfe9',
                '\ud83d\udfe6',
                '\ud83d\udfe6',
                '\ud83d\udfe3',
                '\ud83d\udfe5',
              ][tile];
      }
      rows.push(row);
    }
    return [
      `Slide Day #${puzzleDay} \ud83e\udde9`,
      `${moves}/${par} moves`,
      ...rows,
      under ? '\u2b50 Under par!' : `Solved in ${moves}`,
    ].join('\n');
  }

  const h = heuristic(tiles);

  // Check which tiles are in correct position
  const goalArr = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  const correctSet = new Set<number>();
  tiles.forEach((t, i) => {
    if (t !== 0 && t === goalArr[i]) correctSet.add(i);
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Slide</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Slide tiles into order. Tap a tile next to the gap.
      </Text>

      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text
            style={[
              styles.infoVal,
              solved && moves <= par && styles.infoGood,
            ]}
          >
            {moves}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Dist</Text>
          <Text style={styles.infoVal}>{h}</Text>
        </View>
      </View>

      {/* Progress: tiles in correct position */}
      <View style={styles.progress}>
        {Array.from({ length: 8 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              correctSet.has(goalArr.indexOf(i + 1)) &&
                styles.progressDotDone,
            ]}
          />
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {Array.from({ length: SIZE }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }, (_, c) => {
              const idx = r * SIZE + c;
              const tile = tiles[idx];
              const isEmpty = tile === 0;
              const isMovable = !solved && legalMoves(tiles).includes(idx);
              const isCorrect = correctSet.has(idx);
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
                        backgroundColor: isEmpty
                          ? '#1a1a1b'
                          : TILE_COLORS[tile],
                        borderColor: isMovable
                          ? 'rgba(255,255,255,0.6)'
                          : isCorrect
                            ? '#6aaa64'
                            : isEmpty
                              ? '#1a1a1b'
                              : 'rgba(0,0,0,0.3)',
                        borderWidth: isMovable ? 3 : isCorrect ? 2 : 1,
                      },
                    ]}
                  >
                    {!isEmpty && (
                      <Text style={styles.tileNum}>{tile}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Undo */}
      {!solved && history.length > 1 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}

      <CelebrationBurst show={solved && moves <= par} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {moves <= par ? '\ud83c\udf1f' : '\ud83e\udde9'}
          </Text>
          <Text style={styles.endText}>
            {moves <= par
              ? `Under par! ${moves} moves`
              : `Solved in ${moves} moves`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a tile next to the empty space to slide it. Arrange tiles 1-8 in
          order (left to right, top to bottom).{'\n\n'}
          Tiles with green borders are in the correct position.{'\n'}
          Par: {par} moves.
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
    gap: 20,
    marginBottom: 8,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 22, fontWeight: '800' },
  progress: { flexDirection: 'row', gap: 5, marginBottom: 12 },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3a3a3c',
  },
  progressDotDone: { backgroundColor: '#6aaa64' },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileNum: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 14,
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
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
