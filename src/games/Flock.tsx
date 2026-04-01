import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';
import CelebrationBurst from '../components/CelebrationBurst';
import { getDailySeed, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';
import StatsModal from '../components/StatsModal';
import ShareButton from '../components/ShareButton';
import {
  generatePuzzle,
  applyMove,
  isGoal,
  heuristic,
  solve,
  DIRECTIONS,
  DIR_NAMES,
  type FlockState,
  type Direction,
} from '../solvers/Flock.solver';

/* ─── Constants ─── */
const CELL_SIZE = 48;
const GAP = 2;
const BIRD_EMOJI = ['\uD83D\uDC26', '\uD83E\uDD89', '\uD83E\uDD86', '\uD83E\uDD85']; // bird, owl, duck, eagle
const COLOR_VALUES = ['#e74c3c', '#3498db', '#2ecc71', '#e67e22'];
const COLOR_BG = [
  'rgba(231,76,60,0.2)',
  'rgba(52,152,219,0.2)',
  'rgba(46,204,113,0.2)',
  'rgba(230,126,34,0.2)',
];

/* ─── Seed utilities ─── */
function localGetDailySeed(): number {
  return getDailySeed();
}

function localGetPuzzleDay(): number {
  return getPuzzleDay();
}

function localGetDayDifficulty(): number {
  return getDayDifficulty();
}

/* ─── Game Component ─── */
export default function Flock() {
  const seed = useMemo(() => localGetDailySeed(), []);
  const puzzleDay = useMemo(() => localGetPuzzleDay(), []);
  const difficulty = useMemo(() => localGetDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );
  const par = useMemo(() => {
    const sol = solve(initialState, 5);
    return sol ? sol.steps : 10;
  }, [initialState]);

  const [state, setState] = useState<FlockState>(() => ({
    ...initialState,
    birds: initialState.birds.map((b) => ({ ...b, pos: { ...b.pos } })),
  }));
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<FlockState[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const h = heuristic(state);
  const gridSize = state.gridSize;
  const gridWidth = gridSize * CELL_SIZE + (gridSize - 1) * GAP;

  /* ─── Animations ─── */
  const cellScales = useRef(
    Array.from({ length: gridSize * gridSize }, () => new Animated.Value(1)),
  ).current;

  const bounceBirds = useCallback(
    (birdState: FlockState) => {
      const anims = birdState.birds.map((bird) => {
        const idx = bird.pos.r * gridSize + bird.pos.c;
        if (!cellScales[idx]) return null;
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
      }).filter(Boolean) as Animated.CompositeAnimation[];
      if (anims.length > 0) Animated.parallel(anims).start();
    },
    [cellScales, gridSize],
  );

  /* ─── Move handler ─── */
  const handleMove = useCallback(
    (dir: Direction) => {
      if (solved) return;

      // Save current state for undo
      const prevState: FlockState = {
        gridSize: state.gridSize,
        birds: state.birds.map((b) => ({ ...b, pos: { ...b.pos } })),
        numColors: state.numColors,
      };

      const next = applyMove(state, dir);
      const nextMoves = moves + 1;

      bounceBirds(next);
      setState(next);
      setMoves(nextMoves);
      setHistory((h) => [...h, prevState]);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('flock', nextMoves, par * 3).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, moves, par, gameRecorded, bounceBirds],
  );

  /* ─── Undo ─── */
  const handleUndo = useCallback(() => {
    if (history.length === 0 || solved) return;
    const prev = history[history.length - 1];
    setState(prev);
    setMoves((m) => m - 1);
    setHistory((h) => h.slice(0, -1));
  }, [history, solved]);

  /* ─── Reset ─── */
  const handleReset = useCallback(() => {
    setState({
      ...initialState,
      birds: initialState.birds.map((b) => ({ ...b, pos: { ...b.pos } })),
    });
    setMoves(0);
    setHistory([]);
    setGameRecorded(false);
  }, [initialState]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('flock');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ─── Share text ─── */
  function buildShareText() {
    const under = moves <= par;
    return [
      `Flock Day #${puzzleDay}`,
      `${moves}/${par} moves`,
      under ? 'Under par!' : `Solved in ${moves}`,
    ].join('\n');
  }

  /* ─── Build grid ─── */
  // Create a map of position -> bird(s)
  const birdMap = new Map<string, typeof state.birds>();
  for (const bird of state.birds) {
    const key = `${bird.pos.r},${bird.pos.c}`;
    const existing = birdMap.get(key) || [];
    existing.push(bird);
    birdMap.set(key, existing);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Flock</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Swipe a direction to slide ALL birds. Group same colors together!
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text style={[styles.infoVal, solved && moves <= par && styles.infoGood]}>
            {moves}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Scattered</Text>
          <Text style={styles.infoVal}>{h}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.gridContainer, { width: gridWidth }]}>
        {Array.from({ length: gridSize }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: gridSize }, (_, c) => {
              const key = `${r},${c}`;
              const birds = birdMap.get(key);
              const idx = r * gridSize + c;

              return (
                <Animated.View
                  key={key}
                  style={[
                    styles.cell,
                    { transform: [{ scale: cellScales[idx] || new Animated.Value(1) }] },
                  ]}
                >
                  {birds && birds.length > 0 ? (
                    <View
                      style={[
                        styles.birdCell,
                        { backgroundColor: COLOR_BG[birds[0].color] },
                      ]}
                    >
                      <Text style={styles.birdEmoji}>
                        {BIRD_EMOJI[birds[0].color] || BIRD_EMOJI[0]}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emptyCell} />
                  )}
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Color legend */}
      <View style={styles.legendRow}>
        {Array.from({ length: state.numColors }, (_, c) => {
          const count = state.birds.filter((b) => b.color === c).length;
          return (
            <View key={c} style={styles.legendItem}>
              <Text style={styles.legendEmoji}>{BIRD_EMOJI[c]}</Text>
              <View
                style={[styles.legendDot, { backgroundColor: COLOR_VALUES[c] }]}
              />
              <Text style={styles.legendCount}>x{count}</Text>
            </View>
          );
        })}
      </View>

      {/* Direction controls */}
      {!solved && (
        <View style={styles.dpad}>
          <View style={styles.dpadRow}>
            <View style={styles.dpadSpacer} />
            <Pressable
              style={styles.dpadBtn}
              onPress={() => handleMove('N')}
            >
              <Text style={styles.dpadText}>{'\u2191'}</Text>
            </Pressable>
            <View style={styles.dpadSpacer} />
          </View>
          <View style={styles.dpadRow}>
            <Pressable
              style={styles.dpadBtn}
              onPress={() => handleMove('W')}
            >
              <Text style={styles.dpadText}>{'\u2190'}</Text>
            </Pressable>
            <View style={styles.dpadCenter}>
              <Text style={styles.dpadCenterText}>{'\uD83D\uDC26'}</Text>
            </View>
            <Pressable
              style={styles.dpadBtn}
              onPress={() => handleMove('E')}
            >
              <Text style={styles.dpadText}>{'\u2192'}</Text>
            </Pressable>
          </View>
          <View style={styles.dpadRow}>
            <View style={styles.dpadSpacer} />
            <Pressable
              style={styles.dpadBtn}
              onPress={() => handleMove('S')}
            >
              <Text style={styles.dpadText}>{'\u2193'}</Text>
            </Pressable>
            <View style={styles.dpadSpacer} />
          </View>
        </View>
      )}

      {/* Undo / Reset */}
      {!solved && (
        <View style={styles.actionRow}>
          {history.length > 0 && (
            <Pressable style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          )}
          {moves > 0 && (
            <Pressable style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.undoText}>Reset</Text>
            </Pressable>
          )}
        </View>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {moves < par ? '\uD83C\uDF1F' : moves === par ? '\u2B50' : '\uD83D\uDC26'}
          </Text>
          <Text style={styles.endText}>
            {moves < par
              ? `Under par! ${moves} moves`
              : moves === par
                ? `At par! ${moves} moves`
                : `Solved in ${moves} moves`}
          </Text>
          <ShareButton text={buildShareText()} />
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.undoText}>Play Again</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a direction to slide ALL birds at once. Each bird slides until it
          hits a wall or another bird.{'\n\n'}
          Group all same-colored birds into connected clusters to win.{'\n'}
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
    marginBottom: 10,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 22, fontWeight: '800' },
  gridContainer: {
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  birdCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  emptyCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    backgroundColor: '#1a1a1b',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  birdEmoji: {
    fontSize: 26,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendEmoji: { fontSize: 18 },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendCount: {
    color: '#818384',
    fontSize: 12,
    fontWeight: '600',
  },
  dpad: {
    marginBottom: 8,
    gap: 4,
    alignItems: 'center',
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dpadBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#3a3a3c',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#565758',
  },
  dpadSpacer: {
    width: 52,
    height: 52,
  },
  dpadCenter: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dpadText: { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  dpadCenterText: { fontSize: 20 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
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
