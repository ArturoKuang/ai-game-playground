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
  generatePuzzle,
  applyMove,
  isGoal,
  heuristic,
  legalMoves,
  solve,
  type VaultState,
  type Move,
} from '../solvers/Vault.solver';

/* ─── Constants ─── */
const LOCK_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
const LOCK_LABELS = ['R', 'B', 'G', 'Y'];
const LOCK_EMOJI = ['\uD83D\uDD34', '\uD83D\uDD35', '\uD83D\uDFE2', '\uD83D\uDFE1'];
const GAP = 3;

export default function Vault() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const [state, setState] = useState<VaultState>(() => ({
    ...initialState,
    cells: initialState.cells.map((c) => ({ ...c, pos: { ...c.pos } })),
    ringKeys: [...initialState.ringKeys],
    playerPos: { ...initialState.playerPos },
  }));
  const [history, setHistory] = useState<VaultState[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const { width: screenWidth } = useWindowDimensions();

  const cellSize = Math.min(
    Math.floor((Math.min(screenWidth - 64, 360) - (state.cols - 1) * GAP) / state.cols),
    56,
  );
  const gridWidth = state.cols * cellSize + (state.cols - 1) * GAP;

  const currentKey = state.ringKeys[state.ringPos % state.ringKeys.length];

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: state.cells.length }, () => new Animated.Value(1)),
  ).current;

  const bounceCell = useCallback(
    (idx: number) => {
      if (cellScales[idx]) {
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
      }
    },
    [cellScales],
  );

  /* ── Handlers ── */
  const handleCellTap = useCallback(
    (cellIndex: number) => {
      if (solved) return;
      const cell = state.cells[cellIndex];
      if (cell.unlocked) return;
      if (cell.lockType !== currentKey) return;

      const move: Move = { type: 'unlock', cellIndex };
      const next = applyMove(state, move);
      bounceCell(cellIndex);

      setHistory((h) => [...h, state]);
      setState(next);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('vault', next.cost, next.par).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, currentKey, gameRecorded, bounceCell],
  );

  const handleSkip = useCallback(() => {
    if (solved) return;
    const move: Move = { type: 'skip' };
    const next = applyMove(state, move);
    setHistory((h) => [...h, state]);
    setState(next);
  }, [state, solved]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || solved) return;
    setState(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }, [history, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('vault');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText(): string {
    const grid: string[][] = [];
    for (let r = 0; r < state.rows; r++) {
      const row: string[] = [];
      for (let c = 0; c < state.cols; c++) {
        const idx = r * state.cols + c;
        const cell = state.cells[idx];
        row.push(LOCK_EMOJI[cell.lockType]);
      }
      grid.push(row);
    }
    const boardStr = grid.map((row) => row.join('')).join('\n');
    const under = state.cost <= state.par;

    return [
      `Vault Day #${puzzleDay} \uD83D\uDD10`,
      `${state.cost}/${state.par} moves`,
      under ? '\u2B50 At or under par!' : `Solved in ${state.cost}`,
      '',
      boardStr,
    ].join('\n');
  }

  const h = heuristic(state);
  const legal = legalMoves(state);
  const matchingCells = legal.filter((m) => m.type === 'unlock');

  const matchingSet = new Set<number>();
  for (const m of matchingCells) {
    if (m.type === 'unlock') matchingSet.add(m.cellIndex);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Vault</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Unlock all cells using the rotating key ring.
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text
            style={[
              styles.infoVal,
              solved && state.cost <= state.par && styles.infoGood,
            ]}
          >
            {state.cost}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{state.par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Left</Text>
          <Text style={styles.infoVal}>
            {state.cells.filter((c) => !c.unlocked).length}
          </Text>
        </View>
      </View>

      {/* Key Ring Display */}
      <View style={styles.ringSection}>
        <Text style={styles.ringLabel}>Key Ring</Text>
        <View style={styles.ringContainer}>
          {state.ringKeys.map((keyType, i) => {
            const isActive = i === state.ringPos % state.ringKeys.length;
            const nextPos1 = (state.ringPos + 1) % state.ringKeys.length;
            const nextPos2 = (state.ringPos + 2) % state.ringKeys.length;
            const isNext = i === nextPos1 || i === nextPos2;
            return (
              <View
                key={i}
                style={[
                  styles.ringKey,
                  {
                    backgroundColor: LOCK_COLORS[keyType],
                    opacity: isActive ? 1 : isNext ? 0.6 : 0.25,
                    borderColor: isActive ? '#ffffff' : 'transparent',
                    borderWidth: isActive ? 3 : 0,
                    transform: [{ scale: isActive ? 1.3 : 1 }],
                  },
                ]}
              >
                <Text style={styles.ringKeyText}>{LOCK_LABELS[keyType]}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.currentKeyLabel}>
          Current: {LOCK_LABELS[currentKey]} key
        </Text>
      </View>

      {/* Grid */}
      <View style={[styles.gridContainer, { width: gridWidth }]}>
        {Array.from({ length: state.rows }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: state.cols }, (_, c) => {
              const idx = r * state.cols + c;
              const cell = state.cells[idx];
              const isMatching = matchingSet.has(idx);
              const isPlayerHere =
                state.playerPos.r === r && state.playerPos.c === c;

              return (
                <Animated.View
                  key={`${r}-${c}`}
                  style={{ transform: [{ scale: cellScales[idx] }] }}
                >
                  <Pressable
                    onPress={() => handleCellTap(idx)}
                    disabled={solved || cell.unlocked || !isMatching}
                  >
                    <View
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: cell.unlocked
                            ? '#2a2a2b'
                            : LOCK_COLORS[cell.lockType] + '33',
                          borderColor: cell.unlocked
                            ? '#3a3a3c'
                            : isMatching
                              ? '#ffffff'
                              : LOCK_COLORS[cell.lockType] + '88',
                          borderWidth: isMatching && !cell.unlocked ? 2 : 1,
                        },
                      ]}
                    >
                      {cell.unlocked ? (
                        <Text style={styles.unlockedIcon}>{'\u2713'}</Text>
                      ) : (
                        <Text
                          style={[
                            styles.lockIcon,
                            { color: LOCK_COLORS[cell.lockType] },
                          ]}
                        >
                          {LOCK_LABELS[cell.lockType]}
                        </Text>
                      )}
                      {isPlayerHere && !cell.unlocked && (
                        <View style={styles.playerDot} />
                      )}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Skip + Undo buttons */}
      {!solved && (
        <View style={styles.btnRow}>
          <Pressable style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipBtnText}>Skip Key {'\u23E9'}</Text>
          </Pressable>
          {history.length > 0 && (
            <Pressable style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          )}
        </View>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {state.cost < state.par
              ? '\uD83C\uDF1F'
              : state.cost === state.par
                ? '\u2B50'
                : '\uD83D\uDD10'}
          </Text>
          <Text style={styles.endText}>
            {state.cost < state.par
              ? `Under par! ${state.cost} moves`
              : state.cost === state.par
                ? `At par! ${state.cost} moves`
                : `Solved in ${state.cost} moves`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Unlock all cells on the grid. The key ring shows your available keys
          -- the highlighted key is active. Tap a matching cell to unlock it.
          {'\n\n'}
          After each unlock, the ring advances to the next key. You can also
          skip a key (costs 1 move) to realign the ring.
          {'\n\n'}
          Plan your unlock order to minimize total moves. Par: {state.par}
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
  /* Ring */
  ringSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  ringLabel: {
    color: '#818384',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  ringContainer: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 320,
  },
  ringKey: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringKeyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  currentKeyLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  /* Grid */
  gridContainer: {
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  cell: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 18,
    fontWeight: '800',
  },
  unlockedIcon: {
    fontSize: 18,
    color: '#6aaa64',
    fontWeight: '800',
  },
  playerDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  /* Buttons */
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  skipBtn: {
    backgroundColor: '#4a3a1a',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#f39c12',
  },
  skipBtnText: {
    color: '#f39c12',
    fontWeight: '700',
    fontSize: 14,
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  undoText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  /* End */
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
