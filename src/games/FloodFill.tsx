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
import { getDailySeed, seededRandom, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';
import StatsModal from '../components/StatsModal';
import CelebrationBurst from '../components/CelebrationBurst';

const PALETTE = [
  { hex: '#e74c3c', emoji: '\ud83d\udfe5' }, // red
  { hex: '#3498db', emoji: '\ud83d\udfe6' }, // blue
  { hex: '#2ecc71', emoji: '\ud83d\udfe9' }, // green
  { hex: '#f1c40f', emoji: '\ud83d\udfe8' }, // yellow
  { hex: '#9b59b6', emoji: '\ud83d\udfea' }, // purple
  { hex: '#e67e22', emoji: '\ud83d\udfe7' }, // orange
];

const GRID_SIZE = 8;

/** Difficulty-scaled parameters: Monday easy, Friday hard */
function getDifficultyParams() {
  const d = getDayDifficulty(); // 1-5
  const numColors = d <= 2 ? 5 : 6;
  // Mon=24, Tue=22, Wed=20, Thu=18, Fri=16
  const par = 24 - (d - 1) * 2;
  return { numColors, par };
}

function generateGrid(seed: number, numColors: number): number[][] {
  const rng = seededRandom(seed);
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => Math.floor(rng() * numColors))
  );
}

function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row) => [...row]);
}

/** Find all cells connected to (0,0) that share its color */
function getFloodRegion(grid: number[][]): Set<string> {
  const color = grid[0][0];
  const visited = new Set<string>();
  const stack: [number, number][] = [[0, 0]];

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
    if (grid[r][c] !== color) continue;
    visited.add(key);
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }

  return visited;
}

/** Apply a flood move: change all connected cells from (0,0) to newColor */
function applyFlood(grid: number[][], newColor: number): number[][] {
  const next = cloneGrid(grid);
  const region = getFloodRegion(next);
  for (const key of region) {
    const [r, c] = key.split(',').map(Number);
    next[r][c] = newColor;
  }
  return next;
}

function isSolved(grid: number[][]): boolean {
  const c = grid[0][0];
  return grid.every((row) => row.every((cell) => cell === c));
}

/** Count how many NEW cells each color option would gain */
function countGains(grid: number[][], numColors: number): number[] {
  const currentRegion = getFloodRegion(grid);
  const currentSize = currentRegion.size;
  const gains: number[] = [];
  for (let color = 0; color < numColors; color++) {
    if (color === grid[0][0]) {
      gains.push(0);
    } else {
      const nextGrid = applyFlood(grid, color);
      const nextRegion = getFloodRegion(nextGrid);
      gains.push(nextRegion.size - currentSize);
    }
  }
  return gains;
}

export default function FloodFill() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const { numColors, par } = useMemo(() => getDifficultyParams(), []);
  const initialGrid = useMemo(() => generateGrid(seed, numColors), [seed, numColors]);
  const { width: screenWidth } = useWindowDimensions();

  const [grid, setGrid] = useState(() => cloneGrid(initialGrid));
  const [moves, setMoves] = useState(0);
  const [colorHistory, setColorHistory] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const won = isSolved(grid);
  const underPar = moves <= par;

  // Calculate gains for each color option
  const gains = useMemo(() => countGains(grid, numColors), [grid, numColors]);

  // Bounce animations for picker buttons
  const pickerScales = useRef(
    PALETTE.map(() => new Animated.Value(1))
  ).current;

  const bounceButton = useCallback((idx: number) => {
    Animated.sequence([
      Animated.timing(pickerScales[idx], {
        toValue: 1.2,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(pickerScales[idx], {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pickerScales]);

  // Grid flash animation on win
  const winGlow = useRef(new Animated.Value(0)).current;

  const handleColorPick = useCallback(
    (colorIdx: number) => {
      if (gameOver) return;
      // Can't pick the current flood color — it's a no-op
      if (colorIdx === grid[0][0]) return;

      bounceButton(colorIdx);
      setColorHistory((h) => [...h, colorIdx]);

      const nextGrid = applyFlood(grid, colorIdx);
      const nextMoves = moves + 1;
      setGrid(nextGrid);
      setMoves(nextMoves);

      if (isSolved(nextGrid)) {
        setGameOver(true);
        // Win celebration pulse
        Animated.loop(
          Animated.sequence([
            Animated.timing(winGlow, { toValue: 1, duration: 600, useNativeDriver: false }),
            Animated.timing(winGlow, { toValue: 0, duration: 600, useNativeDriver: false }),
          ]),
          { iterations: 3 }
        ).start();
        // Record stats
        recordGame('floodfill', nextMoves, par).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [grid, moves, gameOver, bounceButton, winGlow]
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('floodfill');
    setStats(s);
    setShowStats(true);
  }, []);

  // Responsive cell size
  const maxGridWidth = Math.min(screenWidth - 32, 400);
  const cellSize = Math.floor(maxGridWidth / GRID_SIZE) - 2;

  function buildShareText(): string {
    // Show the color sequence as emoji — like Wordle's colored grid
    const sequence = colorHistory.map((c) => PALETTE[c].emoji).join('');
    // Break into rows of 6 for readability
    const rows: string[] = [];
    for (let i = 0; i < sequence.length; i += 6) {
      rows.push(sequence.slice(i, i + 6));
    }
    return `FloodFill Day #${puzzleDay} ${moves}/${par}${underPar ? '\ud83c\udf1f' : '\ud83c\udfaf'}\n${rows.join('\n')}`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>FloodFill</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Flood the board with one color from the top-left corner
        {numColors < 6 ? ' \u2022 Easy day' : getDayDifficulty() >= 4 ? ' \u2022 Hard day' : ''}
      </Text>

      {/* Move counter */}
      <View style={styles.moveCounter}>
        <Text style={styles.moveLabel}>Moves</Text>
        <Text
          style={[
            styles.moveCount,
            gameOver && underPar && styles.moveCountGood,
            gameOver && !underPar && styles.moveCountOver,
          ]}
        >
          {moves}
        </Text>
        <Text style={styles.movePar}>Par: {par}</Text>
      </View>

      {/* Grid */}
      <Animated.View
        style={[
          styles.gridContainer,
          gameOver && {
            shadowColor: PALETTE[grid[0][0]].hex,
            shadowOpacity: winGlow.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.8],
            }) as unknown as number,
            shadowRadius: winGlow.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 20],
            }) as unknown as number,
          },
        ]}
      >
        {grid.map((row, r) => (
          <View key={r} style={styles.gridRow}>
            {row.map((cell, c) => (
              <View
                key={c}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: PALETTE[cell].hex,
                  },
                  r === 0 && c === 0 && styles.originCell,
                ]}
              />
            ))}
          </View>
        ))}
      </Animated.View>

      <CelebrationBurst show={gameOver && underPar} />

      {/* Win message */}
      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {underPar ? '\ud83c\udf89' : '\ud83d\udc4d'}
          </Text>
          <Text style={styles.winText}>
            {underPar
              ? `Under par! ${moves} moves`
              : `Solved in ${moves} moves (par: ${par})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      {/* Color picker */}
      {!gameOver && (
        <View style={styles.picker}>
          <Text style={styles.pickerLabel}>Pick a color to flood:</Text>
          <View style={styles.pickerRow}>
            {PALETTE.slice(0, numColors).map((color, i) => {
              const isCurrentColor = i === grid[0][0];
              const gain = gains[i];
              return (
                <Animated.View
                  key={i}
                  style={{ transform: [{ scale: pickerScales[i] }] }}
                >
                  <Pressable
                    onPress={() => handleColorPick(i)}
                    style={[
                      styles.pickerBtn,
                      { backgroundColor: color.hex },
                      isCurrentColor && styles.pickerBtnDisabled,
                    ]}
                  >
                    {isCurrentColor ? (
                      <View style={styles.pickerBtnOverlay} />
                    ) : (
                      <Text style={styles.gainText}>+{gain}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      )}

      {/* How to play */}
      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          The top-left cell is your starting point. Pick a color below to change
          your region to that color — absorbing all adjacent cells of the new
          color. Keep flooding until the entire board is one color.{'\n\n'}
          Try to do it in {par} moves or fewer!
        </Text>
      </View>

      {/* Stats Modal */}
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
  dayBadge: {
    color: '#6aaa64',
    fontSize: 13,
    fontWeight: '600',
  },
  statsIcon: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 13,
    color: '#818384',
    marginTop: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  moveCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  moveLabel: {
    color: '#818384',
    fontSize: 14,
  },
  moveCount: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  moveCountGood: {
    color: '#2ecc71',
  },
  moveCountOver: {
    color: '#e67e22',
  },
  movePar: {
    color: '#818384',
    fontSize: 14,
  },
  gridContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#3a3a3c',
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  originCell: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  winMessage: {
    alignItems: 'center',
    marginTop: 20,
  },
  winEmoji: {
    fontSize: 48,
  },
  winText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  picker: {
    marginTop: 20,
    alignItems: 'center',
  },
  pickerLabel: {
    color: '#818384',
    fontSize: 13,
    marginBottom: 10,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerBtnDisabled: {
    opacity: 0.25,
  },
  pickerBtnOverlay: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  gainText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
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
