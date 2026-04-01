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
import CelebrationBurst from '../components/CelebrationBurst';
import { getDailySeed, getPuzzleDay } from '../utils/seed';
import {
  SIZE,
  generatePuzzle,
  legalMoves,
  applyMove,
  isGoal,
  heuristic,
} from '../solvers/Slide.solver';

/* ─── Constants ─── */
const CELLS = SIZE * SIZE;
const GAP = 4;
const TILE_COLORS = [
  '', // 0 = empty
  '#e74c3c', // 1
  '#e67e22', // 2
  '#f1c40f', // 3
  '#2ecc71', // 4
  '#1abc9c', // 5
  '#3498db', // 6
  '#9b59b6', // 7
  '#e91e63', // 8
];

export default function Slide() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const initialTiles = useMemo(() => generatePuzzle(seed, 1), [seed]);

  const [tiles, setTiles] = useState(() => [...initialTiles]);
  const [moves, setMoves] = useState(0);

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
      setTiles(next);
      setMoves((m) => m + 1);
    },
    [tiles, solved, bounceTile],
  );

  const h = heuristic(tiles);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Slide</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
      </View>
      <Text style={styles.subtitle}>
        Slide tiles into order. Tap a tile next to the empty space.
      </Text>

      <View style={styles.infoBar}>
        <Text style={styles.infoLabel}>
          Moves: <Text style={styles.infoVal}>{moves}</Text>
        </Text>
        <Text style={styles.infoLabel}>
          Distance: <Text style={styles.infoVal}>{h}</Text>
        </Text>
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
                          ? 'rgba(255,255,255,0.5)'
                          : isEmpty
                            ? '#1a1a1b'
                            : 'rgba(0,0,0,0.3)',
                        borderWidth: isMovable ? 2 : 1,
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

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>{'\ud83c\udf1f'}</Text>
          <Text style={styles.endText}>Solved in {moves} moves!</Text>
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a tile adjacent to the empty space to slide it. Arrange tiles
          1-8 in order, left to right, top to bottom.
        </Text>
      </View>
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
  subtitle: {
    fontSize: 13,
    color: '#818384',
    marginTop: 2,
    marginBottom: 12,
    textAlign: 'center',
    maxWidth: 300,
  },
  infoBar: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  infoLabel: { color: '#818384', fontSize: 14 },
  infoVal: { color: '#ffffff', fontWeight: '800' },
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
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
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
