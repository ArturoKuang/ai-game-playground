import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Animated,
  Platform,
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
  isGameOver,
  energyRemaining,
  type GameState,
  type Move,
  type Cell,
} from '../solvers/SpotCheck.solver';

/* --- Colors --- */
const BG = '#0a0a0b';
const SURFACE = '#1a1a1c';
const ACCENT = '#a78bfa';
const ACCENT_BG = 'rgba(167,139,250,0.15)';
const CLASH_COLOR = '#ef4444';
const CLASH_BG = 'rgba(239,68,68,0.15)';
const SAFE_COLOR = '#34d399';
const SAFE_BG = 'rgba(52,211,153,0.12)';
const FLAGGED_COLOR = '#f59e0b';
const FLAGGED_BG = 'rgba(245,158,11,0.15)';
const HIDDEN_COLOR = '#374151';
const MUTED = '#818384';
const TEXT_COLOR = '#ffffff';
const DANGER = '#e74c3c';

type Mode = 'reveal' | 'flag';

function cloneState(s: GameState): GameState {
  return {
    ...s,
    cells: s.cells.map(c => ({ ...c })),
    clashCellIds: [...s.clashCellIds],
  };
}

export default function SpotCheck() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const dailyDifficulty = useMemo(() => getDayDifficulty(), []);

  const [selectedDifficulty, setSelectedDifficulty] = useState(dailyDifficulty);
  const initialState = useMemo(
    () => generatePuzzle(seed, selectedDifficulty),
    [seed, selectedDifficulty],
  );

  const [state, setState] = useState<GameState>(() => cloneState(initialState));
  const [history, setHistory] = useState<GameState[]>(() => [cloneState(initialState)]);
  const [mode, setMode] = useState<Mode>('reveal');
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);
  const [showBridge, setShowBridge] = useState(false);

  const solved = isGoal(state);
  const outOfEnergy = !solved && state.energyUsed >= state.energyBudget;
  const { width: screenWidth } = useWindowDimensions();

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // Visible clashes: revealed cells that share a value in same row/col/sector
  const visibleClashes = useMemo(() => {
    const clashSet = new Set<number>();
    for (const cell of state.cells) {
      if (cell.state === 'hidden') continue;
      for (const other of state.cells) {
        if (other.id === cell.id || other.state === 'hidden') continue;
        if (other.value !== cell.value) continue;
        if (other.row === cell.row || other.col === cell.col || other.sector === cell.sector) {
          clashSet.add(cell.id);
          clashSet.add(other.id);
        }
      }
    }
    return clashSet;
  }, [state.cells]);

  /* --- Handlers --- */
  const doMove = useCallback(
    (move: Move) => {
      if (solved || outOfEnergy) return;
      const next = applyMove(state, move);
      setState(next);
      setHistory(h => [...h, cloneState(next)]);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('spotcheck', next.energyUsed, next.energyBudget).then(s => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, outOfEnergy, gameRecorded],
  );

  const handleCellPress = useCallback(
    (cell: Cell) => {
      if (solved || outOfEnergy) return;

      if (mode === 'reveal' && cell.state === 'hidden') {
        doMove({ type: 'reveal', cellId: cell.id });
      } else if (mode === 'flag' && cell.state === 'revealed') {
        doMove({ type: 'flag', cellId: cell.id });
      } else if (mode === 'flag' && cell.state === 'flagged') {
        doMove({ type: 'unflag', cellId: cell.id });
      } else {
        shake();
      }
    },
    [mode, solved, outOfEnergy, doMove, shake],
  );

  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState(cloneState(prev));
    setHistory(h => h.slice(0, -1));
  }, [history, solved]);

  const handleReset = useCallback(() => {
    const init = cloneState(initialState);
    setState(init);
    setHistory([cloneState(init)]);
    setMode('reveal');
    setGameRecorded(false);
    setShowBridge(false);
  }, [initialState]);

  const handleDifficultyChange = useCallback((d: number) => {
    setSelectedDifficulty(d);
    const p = generatePuzzle(seed, d);
    const init = cloneState(p);
    setState(init);
    setHistory([cloneState(init)]);
    setMode('reveal');
    setGameRecorded(false);
    setShowBridge(false);
  }, [seed]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('spotcheck');
    setStats(s);
    setShowStats(true);
  }, []);

  /* --- Share --- */
  function buildShareText() {
    const stars = state.energyUsed <= state.energyBudget * 0.5 ? 3
      : state.energyUsed <= state.energyBudget * 0.75 ? 2 : 1;
    const starStr = Array(stars).fill('⭐').join('');
    return [
      'Spot Check Day #' + puzzleDay + ' D' + selectedDifficulty,
      starStr + ' ' + state.energyUsed + '/' + state.energyBudget + ' energy',
      state.clashesFound + '/' + state.clashCount + ' clashes found',
      state.gridSize + 'x' + state.gridSize + ' grid',
    ].join('\n');
  }

  /* --- Grid sizing --- */
  const n = state.gridSize;
  const maxBoard = Math.min(screenWidth - 48, 400);
  const gap = 4;
  const cellSize = Math.floor((maxBoard - (n - 1) * gap) / n);

  /* --- Sector borders --- */
  const sR = state.sectorRows;
  const sC = state.sectorCols;

  return (
    <View style={styles.outer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Spot Check</Text>
          <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
          <Pressable onPress={handleShowStats}>
            <Text style={styles.statsIcon}>📊</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Reveal frequencies, flag the clashes
        </Text>

        {/* Difficulty selector */}
        <View style={styles.diffRow}>
          {[1, 2, 3, 4, 5].map(d => (
            <Pressable
              key={d}
              onPress={() => handleDifficultyChange(d)}
              style={[
                styles.diffBtn,
                d === selectedDifficulty && styles.diffBtnActive,
              ]}
            >
              <Text style={[
                styles.diffText,
                d === selectedDifficulty && styles.diffTextActive,
              ]}>
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Info bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Energy</Text>
            <Text style={[
              styles.infoVal,
              state.energyUsed > state.energyBudget * 0.8 && !solved && styles.infoDanger,
              solved && styles.infoGood,
            ]}>
              {energyRemaining(state)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Budget</Text>
            <Text style={styles.infoPar}>{state.energyBudget}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Clashes</Text>
            <Text style={[styles.infoVal, solved && styles.infoGood]}>
              {state.clashesFound}/{state.clashCount}
            </Text>
          </View>
        </View>

        {/* Mode toggle */}
        {!solved && (
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode('reveal')}
              style={[
                styles.modeBtn,
                mode === 'reveal' && styles.modeBtnActive,
              ]}
            >
              <Text style={[
                styles.modeBtnText,
                mode === 'reveal' && styles.modeBtnTextActive,
              ]}>
                🔍 Reveal
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('flag')}
              style={[
                styles.modeBtn,
                mode === 'flag' && styles.modeBtnActiveFlag,
              ]}
            >
              <Text style={[
                styles.modeBtnText,
                mode === 'flag' && styles.modeBtnTextActiveFlag,
              ]}>
                ⚠️ Flag
              </Text>
            </Pressable>
          </View>
        )}

        {/* Grid */}
        <Animated.View
          style={[
            styles.boardWrap,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          <View style={[styles.grid, { width: n * cellSize + (n - 1) * gap }]}>
            {state.cells.map(cell => {
              const isClashVisible = visibleClashes.has(cell.id) && cell.state !== 'hidden';
              const isFlagged = cell.state === 'flagged';
              const isRevealed = cell.state === 'revealed';
              const isHidden = cell.state === 'hidden';

              // Sector border logic
              const rightBorder = (cell.col + 1) % sC === 0 && cell.col < n - 1;
              const bottomBorder = (cell.row + 1) % sR === 0 && cell.row < n - 1;

              let bg = HIDDEN_COLOR;
              let borderColor = '#555';
              let bw = 1;

              if (isFlagged) {
                bg = FLAGGED_BG;
                borderColor = FLAGGED_COLOR;
                bw = 2;
              } else if (isRevealed && isClashVisible) {
                bg = CLASH_BG;
                borderColor = CLASH_COLOR;
                bw = 2;
              } else if (isRevealed) {
                bg = SAFE_BG;
                borderColor = SAFE_COLOR;
                bw = 1;
              }

              return (
                <Pressable
                  key={cell.id}
                  onPress={() => handleCellPress(cell)}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: bg,
                      borderColor,
                      borderWidth: bw,
                      marginRight: rightBorder ? gap + 2 : gap,
                      marginBottom: bottomBorder ? gap + 2 : gap,
                    },
                    pressed && !isFlagged && styles.cellPressed,
                  ]}
                >
                  {isHidden ? (
                    <Text style={styles.hiddenIcon}>📡</Text>
                  ) : (
                    <View style={styles.cellContent}>
                      <Text style={[
                        styles.cellValue,
                        isFlagged && { color: FLAGGED_COLOR },
                        isClashVisible && !isFlagged && { color: CLASH_COLOR },
                      ]}>
                        {cell.value}
                      </Text>
                      {isFlagged && (
                        <Text style={styles.flagMark}>⚠️</Text>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Wrong flags warning */}
        {state.wrongFlags > 0 && !solved && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnText}>
              {state.wrongFlags} wrong flag{state.wrongFlags > 1 ? 's' : ''} (-2 energy each)
            </Text>
          </View>
        )}

        {/* Budget exhausted */}
        {outOfEnergy && (
          <View style={styles.stuckBanner}>
            <Text style={styles.stuckText}>
              Out of energy! Undo or reset.
            </Text>
          </View>
        )}

        <CelebrationBurst show={solved} />

        {/* Win state */}
        {solved && (
          <View style={styles.endMsg}>
            <Text style={styles.endEmoji}>
              {state.energyUsed <= state.energyBudget * 0.5
                ? "🌟"
                : state.energyUsed <= state.energyBudget * 0.75
                  ? "⭐"
                  : "📡"}
            </Text>
            <Text style={styles.endText}>
              {state.energyUsed <= state.energyBudget * 0.5
                ? "Set Master! " + state.energyUsed + " energy"
                : state.energyUsed <= state.energyBudget * 0.75
                  ? "Well done! " + state.energyUsed + " energy"
                  : "Solved! " + state.energyUsed + " energy"}
            </Text>
            <ShareButton text={buildShareText()} />

            {/* Concept Bridge */}
            <Pressable
              onPress={() => setShowBridge(!showBridge)}
              style={styles.bridgeToggle}
            >
              <Text style={styles.bridgeToggleText}>
                {showBridge ? "Hide" : "Show"} Algorithm Connection
              </Text>
            </Pressable>

            {showBridge && (
              <View style={styles.bridgeBox}>
                <Text style={styles.bridgeTitle}>
                  You just used a Hash Set!
                </Text>
                <Text style={styles.bridgeText}>
                  Every time you revealed a cell and checked if its value already
                  appeared in the same row, column, or sector, you were performing
                  a hash set membership check -- the exact same operation used to
                  validate a Sudoku board in code.
                </Text>
                <Text style={styles.bridgeText}>
                  The optimal strategy is O(n) per group: scan each row/column/sector
                  once, adding values to a set. If set.has(value) returns true,
                  you have found a clash. No need to compare every pair (O(n squared)).
                </Text>
                <Text style={styles.bridgeSubtitle}>Related LeetCode Problems</Text>
                <Text style={styles.bridgeLink}>
                  Valid Sudoku (LC 36) -- Check if a 9x9 board has valid rows, columns,
                  and 3x3 sub-boxes using hash sets for O(1) duplicate detection.
                  This game teaches the same technique on a smaller grid.
                </Text>
                <Text style={styles.bridgeLink}>
                  Longest Consecutive Sequence (LC 128) -- Use a hash set to check
                  membership in O(1) and find consecutive runs. The same
                  set.has() pattern you used here to spot clashes.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* How to Play */}
        <View style={styles.howTo}>
          <Text style={styles.howToTitle}>How to play</Text>
          <Text style={styles.howToText}>
            A grid of hidden radio towers needs inspection. Some towers
            broadcast duplicate frequencies that cause interference.
            {"\n\n"}
            Tap a tower in Reveal mode to see its frequency (costs 1 energy).
            Switch to Flag mode and tap revealed towers that clash -- same
            frequency in the same row, column, or sector (bordered zones).
            {"\n\n"}
            Find ALL clashing towers within your energy budget to win.
            Wrong flags cost 2 extra energy. Skilled players track which
            frequencies they have seen, flagging clashes immediately without
            needing to reveal the entire grid.
          </Text>
        </View>

        {/* Spacer for bottom bar */}
        {!solved && state.energyUsed > 0 && <View style={{ height: 72 }} />}

        {showStats && stats && (
          <StatsModal stats={stats} onClose={() => setShowStats(false)} />
        )}
      </ScrollView>

      {/* Fixed bottom bar */}
      {!solved && state.energyUsed > 0 && (
        <View style={styles.fixedBottom}>
          {history.length > 1 && (
            <Pressable style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          )}
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: BG },
  container: {
    flexGrow: 1, alignItems: "center", backgroundColor: BG,
    paddingVertical: 16, paddingHorizontal: 16,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 28, fontWeight: "800", color: TEXT_COLOR, letterSpacing: 2 },
  dayBadge: { color: ACCENT, fontSize: 13, fontWeight: "600" },
  statsIcon: { fontSize: 24 },
  subtitle: {
    fontSize: 13, color: MUTED, marginTop: 2, marginBottom: 10,
    textAlign: "center", maxWidth: 300,
  },
  diffRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  diffBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: SURFACE,
    borderWidth: 1, borderColor: "#333", alignItems: "center", justifyContent: "center",
  },
  diffBtnActive: { backgroundColor: ACCENT_BG, borderColor: ACCENT },
  diffText: { color: MUTED, fontSize: 14, fontWeight: "700" },
  diffTextActive: { color: ACCENT },
  infoBar: { flexDirection: "row", gap: 20, marginBottom: 10, alignItems: "center" },
  infoItem: { alignItems: "center" },
  infoLabel: { color: MUTED, fontSize: 11, marginBottom: 2 },
  infoVal: { color: TEXT_COLOR, fontSize: 22, fontWeight: "800" },
  infoGood: { color: SAFE_COLOR },
  infoDanger: { color: DANGER },
  infoPar: { color: MUTED, fontSize: 22, fontWeight: "800" },
  modeRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  modeBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: "#444",
  },
  modeBtnActive: { backgroundColor: ACCENT_BG, borderColor: ACCENT },
  modeBtnActiveFlag: { backgroundColor: FLAGGED_BG, borderColor: FLAGGED_COLOR },
  modeBtnText: { color: MUTED, fontWeight: "700", fontSize: 14 },
  modeBtnTextActive: { color: ACCENT },
  modeBtnTextActiveFlag: { color: FLAGGED_COLOR },
  boardWrap: { marginVertical: 8 },
  grid: {
    flexDirection: "row", flexWrap: "wrap",
  },
  cell: {
    borderRadius: 8, alignItems: "center", justifyContent: "center",
  },
  cellPressed: { opacity: 0.7 },
  cellContent: { alignItems: "center", justifyContent: "center" },
  cellValue: { fontSize: 18, fontWeight: "800", color: TEXT_COLOR },
  hiddenIcon: { fontSize: 16, opacity: 0.5 },
  flagMark: { position: "absolute", top: -2, right: -8, fontSize: 10 },
  warnBanner: {
    marginTop: 6, backgroundColor: "#4a2a1a",
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12,
  },
  warnText: { color: FLAGGED_COLOR, fontSize: 12, fontWeight: "600" },
  stuckBanner: {
    marginTop: 10, backgroundColor: "#4a1a1a",
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
  },
  stuckText: { color: DANGER, fontSize: 13, fontWeight: "600" },
  endMsg: { alignItems: "center", marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: { color: TEXT_COLOR, fontSize: 18, fontWeight: "600", marginTop: 8 },
  bridgeToggle: {
    marginTop: 16, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 16, backgroundColor: ACCENT_BG, borderWidth: 1, borderColor: ACCENT,
  },
  bridgeToggleText: { color: ACCENT, fontWeight: "700", fontSize: 13 },
  bridgeBox: {
    marginTop: 12, padding: 16, borderRadius: 12,
    backgroundColor: SURFACE, maxWidth: 360,
  },
  bridgeTitle: { color: ACCENT, fontSize: 16, fontWeight: "800", marginBottom: 8 },
  bridgeText: { color: MUTED, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  bridgeSubtitle: { color: TEXT_COLOR, fontSize: 14, fontWeight: "700", marginTop: 8, marginBottom: 4 },
  bridgeLink: { color: MUTED, fontSize: 12, lineHeight: 18, marginBottom: 6 },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: { color: TEXT_COLOR, fontSize: 15, fontWeight: "700", marginBottom: 6 },
  howToText: { color: MUTED, fontSize: 13, lineHeight: 20 },
  fixedBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: "#333",
  },
  undoBtn: {
    backgroundColor: "#3a3a3c", paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 20,
  },
  undoText: { color: TEXT_COLOR, fontWeight: "600", fontSize: 14 },
  resetBtn: {
    backgroundColor: "#4a1a1a", paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 20,
  },
  resetText: { color: DANGER, fontWeight: "600", fontSize: 14 },
});