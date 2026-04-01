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
  GRID_SIZE,
  generatePuzzle,
  applyMove,
  isGoal,
  heuristic,
  type Move,
  type Direction,
  type SignalState,
} from '../solvers/Signal.solver';

/* --- Constants --- */
const GAP = 3;
const EDGE_BTN_SIZE = 32;
const COLOR_PALETTE = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f39c12', // orange
  '#9b59b6', // purple
];

const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Orange', 'Purple'];

const DIRECTION_ARROWS: Record<Direction, string> = {
  W: '\u25b6', // broadcast east (from left)
  E: '\u25c0', // broadcast west (from right)
  N: '\u25bc', // broadcast south (from top)
  S: '\u25b2', // broadcast north (from bottom)
};

export default function Signal() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const [state, setState] = useState<SignalState>(() => ({ ...initialState }));
  const [history, setHistory] = useState<SignalState[]>(() => [initialState]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [lastGuessResult, setLastGuessResult] = useState<{
    row: number; col: number; correct: boolean; actualColor: number;
  } | null>(null);

  const solved = isGoal(state);
  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 80, 300);
  const cellSize = Math.floor((maxGrid - (GRID_SIZE - 1) * GAP) / GRID_SIZE);

  /* -- Animations -- */
  const cellScales = useRef(
    Array.from({ length: GRID_SIZE * GRID_SIZE }, () => new Animated.Value(1)),
  ).current;

  const shakeAnims = useRef(
    Array.from({ length: GRID_SIZE * GRID_SIZE }, () => new Animated.Value(0)),
  ).current;

  const animateReveal = useCallback(
    (cells: { row: number; col: number }[]) => {
      const anims = cells.map(({ row, col }) => {
        const idx = row * GRID_SIZE + col;
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
      Animated.stagger(40, anims).start();
    },
    [cellScales],
  );

  const animateShake = useCallback(
    (row: number, col: number) => {
      const idx = row * GRID_SIZE + col;
      Animated.sequence([
        Animated.timing(shakeAnims[idx], { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnims[idx], { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnims[idx], { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnims[idx], { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnims[idx], { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    },
    [shakeAnims],
  );

  /* -- Broadcast handler -- */
  const handleBroadcast = useCallback(
    (direction: Direction, index: number) => {
      if (solved) return;
      const move: Move = { type: 'broadcast', direction, index };
      const key = `${direction}-${index}`;
      if (state.usedBroadcasts.has(key)) return;

      const nextState = applyMove(state, move);

      // Find newly revealed cells
      const newlyKnown: { row: number; col: number }[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (state.known[r][c] === null && nextState.known[r][c] !== null) {
            newlyKnown.push({ row: r, col: c });
          }
        }
      }
      animateReveal(newlyKnown);

      setState(nextState);
      setHistory((h) => [...h, nextState]);
      setSelectedCell(null);
      setLastGuessResult(null);
    },
    [state, solved, animateReveal],
  );

  /* -- Cell tap handler: select cell for guessing -- */
  const handleCellTap = useCallback(
    (row: number, col: number) => {
      if (solved) return;
      if (state.known[row][col] !== null) return; // already known
      if (state.guesses.has(`${row}-${col}`)) return; // already guessed

      setSelectedCell((prev) => {
        if (prev && prev.row === row && prev.col === col) return null; // toggle off
        return { row, col };
      });
      setLastGuessResult(null);
    },
    [state, solved],
  );

  /* -- Guess color for selected cell -- */
  const handleGuessColor = useCallback(
    (color: number) => {
      if (!selectedCell || solved) return;
      const { row, col } = selectedCell;
      const move: Move = { type: 'guess', row, col, color };
      const nextState = applyMove(state, move);

      const actualColor = state.hidden[row][col];
      const isCorrect = color === actualColor;

      if (isCorrect) {
        // Find newly revealed cells (from propagation)
        const newlyKnown: { row: number; col: number }[] = [];
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (state.known[r][c] === null && nextState.known[r][c] !== null) {
              newlyKnown.push({ row: r, col: c });
            }
          }
        }
        animateReveal(newlyKnown);
      } else {
        // Wrong guess: shake + reveal
        animateShake(row, col);
        animateReveal([{ row, col }]);
      }

      setLastGuessResult({ row, col, correct: isCorrect, actualColor });
      setState(nextState);
      setHistory((h) => [...h, nextState]);
      setSelectedCell(null);
    },
    [state, selectedCell, solved, animateReveal, animateShake],
  );

  /* -- Undo -- */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState(prev);
    setHistory((h) => h.slice(0, -1));
    setSelectedCell(null);
    setLastGuessResult(null);
  }, [history, solved]);

  const unknownCount = heuristic(state);
  const totalCells = GRID_SIZE * GRID_SIZE;
  const knownCount = totalCells - unknownCount;

  const isBroadcastUsed = (dir: Direction, idx: number) =>
    state.usedBroadcasts.has(`${dir}-${idx}`);

  const isWrongGuess = (r: number, c: number) =>
    state.wrongGuesses.has(`${r}-${c}`);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Signal</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
      </View>
      <Text style={styles.subtitle}>
        Broadcast to gather clues, then tap cells to guess their colors.
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Budget</Text>
          <Text
            style={[
              styles.infoVal,
              solved && state.broadcastCount <= state.par && styles.infoGood,
            ]}
          >
            {state.broadcastCount}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{state.par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Known</Text>
          <Text style={styles.infoVal}>
            {knownCount}/{totalCells}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Correct</Text>
          <Text style={[styles.infoVal, styles.infoGood]}>
            {state.correctGuesses}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Wrong</Text>
          <Text style={[styles.infoVal, state.wrongGuessCount > 0 && styles.infoBad]}>
            {state.wrongGuessCount}
          </Text>
        </View>
      </View>

      {/* Color legend */}
      <View style={styles.legendRow}>
        {Array.from({ length: state.numColors }, (_, i) => (
          <View key={i} style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: COLOR_PALETTE[i] }]}
            />
            <Text style={styles.legendText}>{i}</Text>
          </View>
        ))}
      </View>

      {/* Grid with edge broadcast buttons */}
      <View style={styles.gridArea}>
        {/* Top edge buttons (N broadcasts) */}
        <View style={[styles.edgeRow, { marginLeft: EDGE_BTN_SIZE + GAP }]}>
          {Array.from({ length: GRID_SIZE }, (_, c) => (
            <Pressable
              key={`N-${c}`}
              style={[
                styles.edgeBtn,
                { width: cellSize },
                isBroadcastUsed('N', c) && styles.edgeBtnUsed,
              ]}
              onPress={() => handleBroadcast('N', c)}
              disabled={isBroadcastUsed('N', c) || solved}
            >
              <Text
                style={[
                  styles.edgeBtnText,
                  isBroadcastUsed('N', c) && styles.edgeBtnTextUsed,
                ]}
              >
                {DIRECTION_ARROWS.N}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Grid rows with left (W) and right (E) buttons */}
        {Array.from({ length: GRID_SIZE }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {/* Left edge button (W) */}
            <Pressable
              style={[
                styles.edgeBtn,
                { width: EDGE_BTN_SIZE, height: cellSize },
                isBroadcastUsed('W', r) && styles.edgeBtnUsed,
              ]}
              onPress={() => handleBroadcast('W', r)}
              disabled={isBroadcastUsed('W', r) || solved}
            >
              <Text
                style={[
                  styles.edgeBtnText,
                  isBroadcastUsed('W', r) && styles.edgeBtnTextUsed,
                ]}
              >
                {DIRECTION_ARROWS.W}
              </Text>
            </Pressable>

            {/* Cells */}
            {Array.from({ length: GRID_SIZE }, (_, c) => {
              const idx = r * GRID_SIZE + c;
              const cellColor = state.known[r][c];
              const isKnown = cellColor !== null;
              const isSelected = selectedCell?.row === r && selectedCell?.col === c;
              const isWrong = isWrongGuess(r, c);
              const isGuessable = !isKnown && !state.guesses.has(`${r}-${c}`) && !solved;

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [
                      { scale: cellScales[idx] },
                      { translateX: shakeAnims[idx] },
                    ],
                  }}
                >
                  <Pressable
                    onPress={() => handleCellTap(r, c)}
                    disabled={!isGuessable}
                  >
                    <View
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: isKnown
                            ? COLOR_PALETTE[cellColor]
                            : '#2a2a3c',
                          borderColor: isSelected
                            ? '#ffffff'
                            : isWrong
                              ? '#ff6b6b'
                              : isKnown
                                ? 'rgba(255,255,255,0.3)'
                                : isGuessable
                                  ? '#4a4a5c'
                                  : '#3a3a4c',
                          borderWidth: isSelected ? 3 : 2,
                        },
                      ]}
                    >
                      {isKnown && (
                        <Text style={styles.cellText}>{cellColor}</Text>
                      )}
                      {!isKnown && (
                        <Text style={[styles.cellUnknown, isGuessable && styles.cellGuessable]}>?</Text>
                      )}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}

            {/* Right edge button (E) */}
            <Pressable
              style={[
                styles.edgeBtn,
                { width: EDGE_BTN_SIZE, height: cellSize },
                isBroadcastUsed('E', r) && styles.edgeBtnUsed,
              ]}
              onPress={() => handleBroadcast('E', r)}
              disabled={isBroadcastUsed('E', r) || solved}
            >
              <Text
                style={[
                  styles.edgeBtnText,
                  isBroadcastUsed('E', r) && styles.edgeBtnTextUsed,
                ]}
              >
                {DIRECTION_ARROWS.E}
              </Text>
            </Pressable>
          </View>
        ))}

        {/* Bottom edge buttons (S broadcasts) */}
        <View style={[styles.edgeRow, { marginLeft: EDGE_BTN_SIZE + GAP }]}>
          {Array.from({ length: GRID_SIZE }, (_, c) => (
            <Pressable
              key={`S-${c}`}
              style={[
                styles.edgeBtn,
                { width: cellSize },
                isBroadcastUsed('S', c) && styles.edgeBtnUsed,
              ]}
              onPress={() => handleBroadcast('S', c)}
              disabled={isBroadcastUsed('S', c) || solved}
            >
              <Text
                style={[
                  styles.edgeBtnText,
                  isBroadcastUsed('S', c) && styles.edgeBtnTextUsed,
                ]}
              >
                {DIRECTION_ARROWS.S}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Color picker for guessing */}
      {selectedCell && !solved && (
        <View style={styles.colorPicker}>
          <Text style={styles.pickerLabel}>
            Guess cell ({selectedCell.row + 1},{selectedCell.col + 1}):
          </Text>
          <View style={styles.pickerRow}>
            {Array.from({ length: state.numColors }, (_, i) => (
              <Pressable
                key={i}
                style={[styles.pickerBtn, { backgroundColor: COLOR_PALETTE[i] }]}
                onPress={() => handleGuessColor(i)}
              >
                <Text style={styles.pickerBtnText}>{i}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.pickerHint}>
            Correct = free. Wrong = costs 1 broadcast + reveals actual color.
          </Text>
        </View>
      )}

      {/* Last guess feedback */}
      {lastGuessResult && !solved && (
        <View style={[
          styles.guessFeedback,
          lastGuessResult.correct ? styles.guessFeedbackCorrect : styles.guessFeedbackWrong,
        ]}>
          <Text style={styles.guessFeedbackText}>
            {lastGuessResult.correct
              ? 'Correct guess!'
              : `Wrong! That cell is ${COLOR_NAMES[lastGuessResult.actualColor]} (${lastGuessResult.actualColor}). -1 broadcast.`}
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
            {state.broadcastCount < state.par
              ? '\ud83c\udf1f'
              : state.broadcastCount === state.par
                ? '\u2b50'
                : '\ud83d\udce1'}
          </Text>
          <Text style={styles.endText}>
            {state.broadcastCount < state.par
              ? `Under par! Budget: ${state.broadcastCount} (par ${state.par})`
              : state.broadcastCount === state.par
                ? `At par! Budget: ${state.broadcastCount}`
                : `Solved! Budget: ${state.broadcastCount} (par ${state.par})`}
          </Text>
          <Text style={styles.endDetail}>
            {state.correctGuesses} correct guesses, {state.wrongGuessCount} wrong
          </Text>
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          A hidden 5x5 color grid waits beneath. You have two actions:{'\n\n'}
          <Text style={{ fontWeight: '700', color: '#3498db' }}>Broadcast</Text> — Tap an
          edge arrow to send a signal. It reveals the FIRST cell of each color
          from that direction. Left and right broadcasts on the same row show
          different info!{'\n\n'}
          <Text style={{ fontWeight: '700', color: '#2ecc71' }}>Guess</Text> — Tap an
          unknown cell, then pick a color. Correct guesses are FREE. Wrong
          guesses cost 1 broadcast AND reveal the actual color.{'\n\n'}
          Beat par ({state.par}) for a star! Budget = broadcasts + wrong guesses.
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
    gap: 14,
    marginBottom: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoBad: { color: '#e74c3c' },
  infoPar: { color: '#818384', fontSize: 20, fontWeight: '800' },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  legendText: {
    color: '#818384',
    fontSize: 12,
    fontWeight: '600',
  },
  gridArea: {
    gap: GAP,
    alignItems: 'center',
  },
  edgeRow: {
    flexDirection: 'row',
    gap: GAP,
  },
  edgeBtn: {
    height: EDGE_BTN_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  edgeBtnUsed: {
    backgroundColor: '#2a2a3c',
    borderColor: '#3a3a4c',
    opacity: 0.4,
  },
  edgeBtnText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '800',
  },
  edgeBtnTextUsed: {
    color: '#555',
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    alignItems: 'center',
  },
  cell: {
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cellUnknown: {
    color: '#555',
    fontSize: 18,
    fontWeight: '600',
  },
  cellGuessable: {
    color: '#6a6a7c',
  },
  colorPicker: {
    marginTop: 16,
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3a3a4c',
  },
  pickerLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pickerBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pickerHint: {
    color: '#818384',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  guessFeedback: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  guessFeedbackCorrect: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  guessFeedbackWrong: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  guessFeedbackText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
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
  endDetail: {
    color: '#818384',
    fontSize: 13,
    marginTop: 4,
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
