import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  generatePuzzle,
  applyMove,
  isGoal,
  heuristic,
  solve,
  previewCascade,
  type FuseState,
  type Move,
  type CascadeEvent,
} from '../solvers/Fuse.solver';

/* ─── Constants ─── */
const GAP = 3;
const BOMB_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
const BOMB_BG_DARK = ['#5c1a1a', '#1a3d5c', '#1a4a1a', '#5c4a1a'];

export default function Fuse() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const par = initialState.par;
  const rows = initialState.rows;
  const cols = initialState.cols;

  const [state, setState] = useState<FuseState>(() => ({
    ...initialState,
    grid: initialState.grid.map((row) =>
      row.map((c) => (c ? { ...c } : null)),
    ),
  }));
  const [history, setHistory] = useState<FuseState[]>([initialState]);
  const [selectedCell, setSelectedCell] = useState<{
    r: number;
    c: number;
  } | null>(null);
  const [cascadePreview, setCascadePreview] = useState<CascadeEvent[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (cols - 1) * GAP) / cols);
  const gridWidth = cols * cellSize + (cols - 1) * GAP;
  const gridHeight = rows * cellSize + (rows - 1) * GAP;

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: rows * cols }, () => new Animated.Value(1)),
  ).current;

  /* ── Preview on select ── */
  useEffect(() => {
    if (selectedCell && state.grid[selectedCell.r][selectedCell.c]) {
      const events = previewCascade(
        state.grid,
        rows,
        cols,
        selectedCell.r,
        selectedCell.c,
      );
      setCascadePreview(events);
    } else {
      setCascadePreview([]);
    }
  }, [selectedCell, state.grid, rows, cols]);

  /* ── Tap handler: select then confirm ── */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (solved) return;
      const cell = state.grid[r][c];
      if (!cell) return;

      const key = r * cols + c;

      // First tap: select and preview
      if (!selectedCell || selectedCell.r !== r || selectedCell.c !== c) {
        setSelectedCell({ r, c });
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

      // Second tap: confirm ignition
      setSelectedCell(null);
      setCascadePreview([]);

      Animated.sequence([
        Animated.timing(cellScales[key], {
          toValue: 1.3,
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

      const next = applyMove(state, { r, c });
      setState(next);
      setHistory((h) => [...h, next]);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('fuse', next.ignitionsUsed, par).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, selectedCell, cellScales, par, gameRecorded, cols],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState({
      ...prev,
      grid: prev.grid.map((row) => row.map((c) => (c ? { ...c } : null))),
    });
    setHistory((h) => h.slice(0, -1));
    setSelectedCell(null);
    setCascadePreview([]);
  }, [history, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('fuse');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const under = state.ignitionsUsed <= par;
    return [
      `Fuse Day #${puzzleDay} \uD83D\uDCA3`,
      `${state.ignitionsUsed}/${par} ignitions`,
      under ? '\u2B50 Under par!' : `Solved in ${state.ignitionsUsed}`,
    ].join('\n');
  }

  const remaining = heuristic(state);

  const previewSet = useMemo(() => {
    const s = new Set<string>();
    for (const e of cascadePreview) s.add(`${e.r},${e.c}`);
    return s;
  }, [cascadePreview]);

  const previewTicks = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of cascadePreview) m.set(`${e.r},${e.c}`, e.tick);
    return m;
  }, [cascadePreview]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fuse</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Ignite bombs to trigger chain reactions. Clear all within par!
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Ignitions</Text>
          <Text
            style={[
              styles.infoVal,
              solved && state.ignitionsUsed <= par && styles.infoGood,
            ]}
          >
            {state.ignitionsUsed}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Bombs</Text>
          <Text style={styles.infoVal}>{remaining}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridHeight }]}>
        {Array.from({ length: rows }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: cols }).map((_, c) => {
              const key = r * cols + c;
              const cell = state.grid[r][c];
              const isSelected =
                selectedCell !== null &&
                selectedCell.r === r &&
                selectedCell.c === c;
              const inPreview = previewSet.has(`${r},${c}`);
              const tick = previewTicks.get(`${r},${c}`);

              if (!cell) {
                return (
                  <View
                    key={c}
                    style={[
                      styles.cell,
                      styles.cellEmpty,
                      { width: cellSize, height: cellSize },
                    ]}
                  />
                );
              }

              const colorIdx = cell.color % BOMB_COLORS.length;
              const bg = isSelected
                ? BOMB_COLORS[colorIdx]
                : BOMB_BG_DARK[colorIdx];
              const borderColor = isSelected
                ? '#f1c40f'
                : inPreview
                  ? BOMB_COLORS[colorIdx]
                  : BOMB_COLORS[colorIdx];
              const bw = isSelected ? 3 : inPreview ? 2 : 1;
              const opacity = inPreview && !isSelected ? 0.85 : 1;

              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[key] }] }}
                >
                  <Pressable
                    onPress={() => handleTap(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bg,
                        borderColor,
                        borderWidth: bw,
                        opacity,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timerText,
                        { color: BOMB_COLORS[colorIdx] },
                        isSelected && styles.timerTextSelected,
                      ]}
                    >
                      {cell.timer}
                    </Text>
                    {inPreview && tick !== undefined && (
                      <Text style={styles.tickLabel}>t{tick}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Preview hint */}
      {selectedCell && !solved && cascadePreview.length > 0 && (
        <View style={styles.previewHint}>
          <Text style={styles.previewText}>
            Chain clears {cascadePreview.length} bomb
            {cascadePreview.length !== 1 ? 's' : ''} -- tap again to ignite!
          </Text>
        </View>
      )}

      {/* Undo */}
      {!solved && history.length > 1 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {state.ignitionsUsed < par
              ? '\uD83C\uDF1F'
              : state.ignitionsUsed === par
                ? '\u2B50'
                : '\uD83D\uDCA3'}
          </Text>
          <Text style={styles.endText}>
            {state.ignitionsUsed < par
              ? `Under par! ${state.ignitionsUsed} ignitions`
              : state.ignitionsUsed === par
                ? `At par! ${state.ignitionsUsed} ignitions`
                : `Cleared in ${state.ignitionsUsed} ignitions (par ${par})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a bomb to preview its chain reaction. Tap again to ignite!
          {'\n\n'}
          Each bomb has a color and a countdown timer. When ignited, it counts
          down, then explodes and ignites adjacent same-colored bombs.
          {'\n\n'}
          Find the best entry points to clear all bombs within par ignitions.
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
  infoBar: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 22, fontWeight: '800' },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmpty: {
    backgroundColor: '#1a1a1b',
    borderColor: '#333',
    borderWidth: 1,
    opacity: 0.3,
  },
  timerText: {
    fontSize: 22,
    fontWeight: '800',
  },
  timerTextSelected: {
    color: '#ffffff',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  tickLabel: {
    position: 'absolute',
    bottom: 1,
    right: 3,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '700',
  },
  previewHint: {
    marginTop: 10,
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
  undoBtn: {
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
