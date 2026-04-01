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
import { getDailySeed, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import {
  generatePuzzle,
  simulate,
  seedsToGrid,
  isGoal,
  stepGeneration,
  emptyGrid,
  type Bloom2State,
  type Pos,
  type Grid,
} from '../solvers/Bloom2.solver';

/* ─── Colors ─── */
const COLORS = {
  bg: '#121213',
  cellEmpty: '#2a2a2c',
  cellTarget: '#3d5a3d',
  cellSeed: '#e67e22',
  cellPrePlaced: '#c0392b',
  cellAlive: '#2ecc71',
  cellDead: '#1a1a1b',
  cellWrong: '#e74c3c',
  cellCorrect: '#2ecc71',
  border: '#3a3a3c',
  text: '#ffffff',
  textMuted: '#818384',
  accent: '#6aaa64',
};

export default function Bloom2() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const puzzle = useMemo(() => generatePuzzle(seed, difficulty), [seed, difficulty]);

  const [seeds, setSeeds] = useState<Pos[]>([]);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showingGrowth, setShowingGrowth] = useState(false);
  const [growthStep, setGrowthStep] = useState(-1);
  const [growthFrames, setGrowthFrames] = useState<Grid[]>([]);
  const [lastResult, setLastResult] = useState<Grid | null>(null);

  const { width: screenWidth } = useWindowDimensions();
  const gridSize = Math.min(screenWidth - 64, 340);
  const cellSize = Math.floor(gridSize / puzzle.cols) - 2;

  /* ─── Animation refs ─── */
  const cellScales = useRef(
    Array.from({ length: puzzle.rows * puzzle.cols }, () => new Animated.Value(1)),
  ).current;

  const bounceCell = useCallback(
    (r: number, c: number) => {
      const idx = r * puzzle.cols + c;
      Animated.sequence([
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
      ]).start();
    },
    [cellScales, puzzle.cols],
  );

  /* ─── Seed placement ─── */
  const seedSet = useMemo(() => new Set(seeds.map(p => `${p.r},${p.c}`)), [seeds]);
  const preSet = useMemo(
    () => new Set(puzzle.prePlaced.map(p => `${p.r},${p.c}`)),
    [puzzle.prePlaced],
  );

  const handleCellPress = useCallback(
    (r: number, c: number) => {
      if (solved || showingGrowth) return;
      const key = `${r},${c}`;
      if (preSet.has(key)) return;

      bounceCell(r, c);

      if (seedSet.has(key)) {
        setSeeds(prev => prev.filter(p => !(p.r === r && p.c === c)));
      } else if (seeds.length < puzzle.maxSeeds) {
        setSeeds(prev => [...prev, { r, c }]);
      }
    },
    [solved, showingGrowth, preSet, seedSet, seeds.length, puzzle.maxSeeds, bounceCell],
  );

  /* ─── Grow simulation ─── */
  const handleGrow = useCallback(() => {
    if (seeds.length + puzzle.prePlaced.length === 0) return;
    if (solved || showingGrowth) return;
    if (attemptsUsed >= puzzle.attemptBudget) return;

    const seedGrid = seedsToGrid(seeds, puzzle.prePlaced, puzzle.rows, puzzle.cols);
    const frames: Grid[] = [seedGrid];
    let current = seedGrid;
    for (let g = 0; g < puzzle.generations; g++) {
      current = stepGeneration(current);
      frames.push(current);
    }

    setGrowthFrames(frames);
    setGrowthStep(0);
    setShowingGrowth(true);

    // Animate through generations
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= frames.length) {
        clearInterval(interval);
        const finalGrid = frames[frames.length - 1];
        setLastResult(finalGrid);
        setShowingGrowth(false);
        setGrowthStep(-1);

        const newAttempts = attemptsUsed + 1;
        setAttemptsUsed(newAttempts);

        // Check win
        let match = true;
        for (let r = 0; r < puzzle.rows; r++) {
          for (let c = 0; c < puzzle.cols; c++) {
            if (finalGrid[r][c] !== puzzle.target[r][c]) {
              match = false;
              break;
            }
          }
          if (!match) break;
        }
        if (match) {
          setSolved(true);
        }
      } else {
        setGrowthStep(step);
      }
    }, 600);
  }, [seeds, puzzle, solved, showingGrowth, attemptsUsed]);

  /* ─── Reset ─── */
  const handleReset = useCallback(() => {
    if (showingGrowth) return;
    setSeeds([]);
    setLastResult(null);
  }, [showingGrowth]);

  /* ─── Determine cell display ─── */
  function getCellStyle(r: number, c: number) {
    const key = `${r},${c}`;
    const isTarget = puzzle.target[r][c];

    // During growth animation
    if (showingGrowth && growthStep >= 0 && growthStep < growthFrames.length) {
      const alive = growthFrames[growthStep][r][c];
      return {
        bg: alive ? COLORS.cellAlive : COLORS.cellDead,
        label: '',
        opacity: 1,
      };
    }

    // After growth attempt (show result comparison)
    if (lastResult && !solved) {
      const resultAlive = lastResult[r][c];
      if (resultAlive && isTarget) {
        return { bg: COLORS.cellCorrect, label: '', opacity: 0.6 };
      }
      if (resultAlive && !isTarget) {
        return { bg: COLORS.cellWrong, label: '', opacity: 0.6 };
      }
      if (!resultAlive && isTarget) {
        return { bg: COLORS.cellTarget, label: '', opacity: 0.4 };
      }
    }

    // Seed placement mode
    if (preSet.has(key)) {
      return { bg: COLORS.cellPrePlaced, label: '', opacity: 1 };
    }
    if (seedSet.has(key)) {
      return { bg: COLORS.cellSeed, label: '', opacity: 1 };
    }
    if (isTarget) {
      return { bg: COLORS.cellTarget, label: '', opacity: 0.7 };
    }
    return { bg: COLORS.cellEmpty, label: '', opacity: 1 };
  }

  const gameOver = solved || attemptsUsed >= puzzle.attemptBudget;
  const seedsPlaced = seeds.length + puzzle.prePlaced.length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bloom2</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
      </View>
      <Text style={styles.subtitle}>
        Place seeds. They grow for {puzzle.generations} generations. Match the target.
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Seeds</Text>
          <Text style={styles.infoVal}>
            {seeds.length}/{puzzle.maxSeeds}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Attempts</Text>
          <Text style={styles.infoVal}>
            {attemptsUsed}/{puzzle.attemptBudget}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Gens</Text>
          <Text style={styles.infoVal}>{puzzle.generations}</Text>
        </View>
      </View>

      {/* Target display (small) */}
      <Text style={styles.sectionLabel}>Target Pattern:</Text>
      <View style={styles.targetContainer}>
        {Array.from({ length: puzzle.rows }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: puzzle.cols }, (_, c) => (
              <View
                key={c}
                style={[
                  styles.targetCell,
                  {
                    width: Math.floor(cellSize * 0.5),
                    height: Math.floor(cellSize * 0.5),
                    backgroundColor: puzzle.target[r][c]
                      ? COLORS.cellAlive
                      : COLORS.cellDead,
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Main grid */}
      <Text style={styles.sectionLabel}>
        {showingGrowth
          ? `Generation ${growthStep + 1}/${puzzle.generations + 1}`
          : lastResult && !solved
            ? 'Result (green = correct, red = extra, dim = missing)'
            : 'Place your seeds:'}
      </Text>
      <View style={styles.gridContainer}>
        {Array.from({ length: puzzle.rows }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: puzzle.cols }, (_, c) => {
              const cs = getCellStyle(r, c);
              const idx = r * puzzle.cols + c;
              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[idx] }] }}
                >
                  <Pressable
                    onPress={() => handleCellPress(r, c)}
                    disabled={showingGrowth || solved}
                  >
                    <View
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: cs.bg,
                          opacity: cs.opacity,
                        },
                      ]}
                    />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Action buttons */}
      {!gameOver && !showingGrowth && (
        <View style={styles.btnRow}>
          <Pressable
            style={[
              styles.growBtn,
              seedsPlaced === 0 && styles.btnDisabled,
            ]}
            onPress={handleGrow}
            disabled={seedsPlaced === 0}
          >
            <Text style={styles.btnText}>Grow</Text>
          </Pressable>
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.btnText}>Clear</Text>
          </Pressable>
        </View>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>{attemptsUsed <= 2 ? '\uD83C\uDF1F' : '\uD83C\uDF31'}</Text>
          <Text style={styles.endText}>
            Matched in {attemptsUsed} attempt{attemptsUsed !== 1 ? 's' : ''}!
          </Text>
        </View>
      )}

      {!solved && attemptsUsed >= puzzle.attemptBudget && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>{'\uD83E\uDD40'}</Text>
          <Text style={styles.endText}>Out of attempts</Text>
        </View>
      )}

      {/* How to play */}
      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap cells to place seeds (orange). Pre-placed seeds (red) cannot be
          moved.{'\n\n'}
          Press "Grow" to simulate {puzzle.generations} generation
          {puzzle.generations > 1 ? 's' : ''} of cellular automaton growth.
          {'\n'}
          Rule: a cell becomes alive if it has 2-3 live neighbors; a live cell
          with 0-1 or 4+ neighbors dies.{'\n\n'}
          The living pattern after growth must match the green target. You have{' '}
          {puzzle.attemptBudget} attempts.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 2,
  },
  dayBadge: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
    maxWidth: 300,
  },
  infoBar: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: COLORS.textMuted, fontSize: 11, marginBottom: 2 },
  infoVal: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
  },
  targetContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 4,
  },
  gridContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 4,
  },
  gridRow: { flexDirection: 'row' },
  cell: {
    margin: 1,
    borderRadius: 3,
  },
  targetCell: {
    margin: 1,
    borderRadius: 2,
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  growBtn: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  resetBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  endMsg: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20 },
});
