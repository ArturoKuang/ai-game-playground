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
  type CrateState,
  type Move,
} from '../solvers/Crate.solver';

/* ─── Constants ─── */
const CRATE_SIZE = 48;
const CRATE_GAP = 6;
const CONVEYOR_COLOR = '#e67e22';
const STACK_COLOR = '#9b59b6';
const TRUCK_COLOR = '#2ecc71';
const DISCARD_COLOR = '#95a5a6';

export default function Crate() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const par = useMemo(() => {
    const sol = solve(initialState, 5);
    const buffer = difficulty <= 1 ? 6 : difficulty <= 2 ? 4 : difficulty <= 3 ? 3 : difficulty <= 4 ? 2 : 1;
    return sol ? sol.steps + buffer : initialState.budget;
  }, [initialState, difficulty]);

  const [state, setState] = useState<CrateState>(() => ({
    ...initialState,
    conveyor: [...initialState.conveyor],
    stack: [],
    truck: [],
    discardPile: [],
    nextRequired: 1,
    moves: 0,
  }));
  const [history, setHistory] = useState<CrateState[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const overBudget = state.moves > state.budget;
  const legal = legalMoves(state);
  const { width: screenWidth } = useWindowDimensions();

  /* ── Animations ── */
  const crateScale = useRef(new Animated.Value(1)).current;
  const stackScale = useRef(new Animated.Value(1)).current;
  const truckScale = useRef(new Animated.Value(1)).current;

  const bounce = useCallback((target: Animated.Value) => {
    Animated.sequence([
      Animated.timing(target, {
        toValue: 1.15,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(target, {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /* ── Handlers ── */
  const handleMove = useCallback(
    (move: Move) => {
      if (solved) return;
      if (!legal.includes(move)) return;

      const next = applyMove(state, move);
      setHistory((h) => [...h, state]);
      setState(next);

      if (move === 'push') bounce(stackScale);
      if (move === 'pop') bounce(truckScale);
      if (move === 'discard') bounce(crateScale);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('crate', next.moves, par).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, legal, par, gameRecorded, bounce, crateScale, stackScale, truckScale],
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0 || solved) return;
    setState(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }, [history, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('crate');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const moveEmojis = history.length > 0
      ? history.slice(0, 20).map((_, i) => {
          // Reconstruct moves from state diffs (simplified)
          return '\u2B1C';
        }).join('')
      : '';

    const under = state.moves <= par;
    return [
      `Crate Day #${puzzleDay} \uD83D\uDCE6`,
      `${state.moves}/${par} moves | ${state.truck.length}/${state.totalCrates} loaded`,
      under ? '\u2B50 At or under par!' : `Solved in ${state.moves} moves`,
    ].join('\n');
  }

  /* ── Visible conveyor ── */
  const visibleConveyor = state.conveyor.slice(0, state.visibleCount);
  const hiddenCount = Math.max(0, state.conveyor.length - state.visibleCount);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Crate</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Load the truck in order using your staging area
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text
            style={[
              styles.infoVal,
              solved && state.moves <= par && styles.infoGood,
              overBudget && styles.infoBad,
            ]}
          >
            {state.moves}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Budget</Text>
          <Text style={styles.infoPar}>{state.budget}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Loaded</Text>
          <Text style={styles.infoVal}>
            {state.truck.length}/{state.totalCrates}
          </Text>
        </View>
      </View>

      {/* Conveyor area */}
      <Text style={styles.sectionLabel}>
        {'\uD83D\uDCE6'} CONVEYOR {hiddenCount > 0 ? `(+${hiddenCount} hidden)` : ''}
      </Text>
      <View style={styles.conveyorArea}>
        {visibleConveyor.length === 0 ? (
          <Text style={styles.emptyText}>Empty</Text>
        ) : (
          visibleConveyor.map((crate, i) => (
            <View
              key={`conv-${i}`}
              style={[
                styles.crate,
                styles.conveyorCrate,
                i === 0 && styles.nextCrate,
              ]}
            >
              <Text style={[styles.crateText, i === 0 && styles.nextCrateText]}>
                {crate}
              </Text>
            </View>
          ))
        )}
        {hiddenCount > 0 && (
          <View style={styles.hiddenDots}>
            <Text style={styles.dotsText}>...</Text>
          </View>
        )}
      </View>

      {/* Stack area */}
      <Animated.View style={{ transform: [{ scale: stackScale }] }}>
        <Text style={styles.sectionLabel}>
          {'\uD83D\uDDC3\uFE0F'} STACK ({state.stack.length}/{state.stackCapacity})
        </Text>
        <View style={styles.stackArea}>
          {state.stack.length === 0 ? (
            <Text style={styles.emptyText}>Empty</Text>
          ) : (
            [...state.stack].reverse().map((crate, i) => (
              <View
                key={`stack-${i}`}
                style={[
                  styles.crate,
                  styles.stackCrate,
                  i === 0 && styles.topCrate,
                  i === 0 && crate === state.nextRequired && styles.matchingCrate,
                ]}
              >
                <Text style={[
                  styles.crateText,
                  i === 0 && styles.topCrateText,
                ]}>
                  {crate}
                </Text>
                {i === 0 && (
                  <Text style={styles.topLabel}>TOP</Text>
                )}
              </View>
            ))
          )}
        </View>
      </Animated.View>

      {/* Truck area */}
      <Animated.View style={{ transform: [{ scale: truckScale }] }}>
        <Text style={styles.sectionLabel}>
          {'\uD83D\uDE9A'} TRUCK (needs #{state.nextRequired})
        </Text>
        <View style={styles.truckArea}>
          {state.truck.length === 0 && state.nextRequired <= state.totalCrates ? (
            <Text style={styles.emptyText}>Waiting for crate #{state.nextRequired}</Text>
          ) : null}
          {/* Show last few loaded crates */}
          {state.truck.slice(-6).map((crate, i) => (
            <View
              key={`truck-${i}`}
              style={[styles.crate, styles.truckCrate]}
            >
              <Text style={styles.crateText}>{crate}</Text>
            </View>
          ))}
          {state.truck.length > 6 && (
            <Text style={styles.moreText}>+{state.truck.length - 6} more</Text>
          )}
          {/* Next required slot */}
          {!solved && (
            <View style={[styles.crate, styles.requiredSlot]}>
              <Text style={styles.requiredText}>{state.nextRequired}?</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Discard pile */}
      {state.discardPile.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>
            {'\uD83D\uDDD1\uFE0F'} DISCARDED
          </Text>
          <View style={styles.discardArea}>
            {state.discardPile.map((crate, i) => (
              <View
                key={`disc-${i}`}
                style={[styles.crate, styles.discardCrate]}
              >
                <Text style={[styles.crateText, styles.discardText]}>{crate}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Action buttons */}
      {!solved && (
        <View style={styles.buttonRow}>
          <Pressable
            style={[
              styles.actionBtn,
              styles.pushBtn,
              !legal.includes('push') && styles.disabledBtn,
            ]}
            onPress={() => handleMove('push')}
            disabled={!legal.includes('push')}
          >
            <Text style={styles.btnEmoji}>{'\u2B07\uFE0F'}</Text>
            <Text style={styles.btnText}>Push</Text>
            <Text style={styles.btnCost}>1 move</Text>
          </Pressable>
          <Pressable
            style={[
              styles.actionBtn,
              styles.popBtn,
              !legal.includes('pop') && styles.disabledBtn,
            ]}
            onPress={() => handleMove('pop')}
            disabled={!legal.includes('pop')}
          >
            <Text style={styles.btnEmoji}>{'\uD83D\uDE9A'}</Text>
            <Text style={styles.btnText}>Load</Text>
            <Text style={styles.btnCost}>1 move</Text>
          </Pressable>
          <Pressable
            style={[
              styles.actionBtn,
              styles.discardBtn,
              !legal.includes('discard') && styles.disabledBtn,
            ]}
            onPress={() => handleMove('discard')}
            disabled={!legal.includes('discard')}
          >
            <Text style={styles.btnEmoji}>{'\uD83D\uDDD1\uFE0F'}</Text>
            <Text style={styles.btnText}>Discard</Text>
            <Text style={styles.btnCost}>2 moves</Text>
          </Pressable>
        </View>
      )}

      {/* Undo */}
      {!solved && history.length > 0 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}

      {/* Stuck warning */}
      {!solved && legal.length === 0 && (
        <View style={styles.stuckMsg}>
          <Text style={styles.stuckText}>
            Stuck! No legal moves available. Try undoing.
          </Text>
        </View>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {state.moves < par ? '\uD83C\uDF1F' : state.moves === par ? '\u2B50' : '\uD83D\uDCE6'}
          </Text>
          <Text style={styles.endText}>
            {state.moves < par
              ? `Under par! ${state.moves} moves`
              : state.moves === par
                ? `At par! ${state.moves} moves`
                : `Solved in ${state.moves} moves`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Crates arrive on a conveyor belt. Use the staging stack to reorder
          them, then load the truck in order (1, 2, 3, ...).{'\n\n'}
          {'\u2022'} Push: Move the next conveyor crate onto the stack (1 move)
          {'\n'}{'\u2022'} Load: If the top of stack matches the truck's next
          needed crate, load it (1 move){'\n'}{'\u2022'} Discard: Remove the
          top stack crate to the discard pile (2 moves){'\n\n'}
          Budget: {state.budget} moves. Stack capacity: {state.stackCapacity}.
          {'\n'}You can see the next {state.visibleCount} crate{state.visibleCount > 1 ? 's' : ''} on the conveyor.
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
    maxWidth: 340,
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
  infoBad: { color: '#e74c3c' },
  infoPar: { color: '#818384', fontSize: 22, fontWeight: '800' },
  sectionLabel: {
    color: '#818384',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  /* Conveyor */
  conveyorArea: {
    flexDirection: 'row',
    gap: CRATE_GAP,
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(230,126,34,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(230,126,34,0.3)',
    minHeight: 60,
    justifyContent: 'center',
  },

  /* Stack */
  stackArea: {
    flexDirection: 'row',
    gap: CRATE_GAP,
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(155,89,182,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(155,89,182,0.3)',
    minHeight: 60,
    justifyContent: 'center',
  },

  /* Truck */
  truckArea: {
    flexDirection: 'row',
    gap: CRATE_GAP,
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(46,204,113,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.3)',
    minHeight: 60,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  /* Discard */
  discardArea: {
    flexDirection: 'row',
    gap: CRATE_GAP,
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(149,165,166,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(149,165,166,0.3)',
    minHeight: 50,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  /* Crate base */
  crate: {
    width: CRATE_SIZE,
    height: CRATE_SIZE,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  crateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  /* Conveyor crate */
  conveyorCrate: {
    backgroundColor: '#d35400',
    borderColor: '#e67e22',
  },
  nextCrate: {
    backgroundColor: '#e67e22',
    borderColor: '#f39c12',
    borderWidth: 3,
  },
  nextCrateText: {
    fontSize: 20,
  },

  /* Stack crate */
  stackCrate: {
    backgroundColor: '#7d3c98',
    borderColor: '#9b59b6',
  },
  topCrate: {
    backgroundColor: '#9b59b6',
    borderColor: '#bb8fce',
    borderWidth: 3,
  },
  topCrateText: {
    fontSize: 20,
  },
  topLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 8,
    fontWeight: '700',
    position: 'absolute',
    bottom: 2,
  },
  matchingCrate: {
    backgroundColor: '#27ae60',
    borderColor: '#2ecc71',
  },

  /* Truck crate */
  truckCrate: {
    backgroundColor: '#1e8449',
    borderColor: '#2ecc71',
  },
  requiredSlot: {
    backgroundColor: 'transparent',
    borderColor: '#2ecc71',
    borderStyle: 'dashed',
  },
  requiredText: {
    color: '#2ecc71',
    fontSize: 16,
    fontWeight: '600',
  },
  moreText: {
    color: '#818384',
    fontSize: 11,
    fontWeight: '600',
  },

  /* Discard crate */
  discardCrate: {
    backgroundColor: '#7f8c8d',
    borderColor: '#95a5a6',
    width: 36,
    height: 36,
  },
  discardText: {
    fontSize: 14,
  },

  emptyText: {
    color: '#555',
    fontSize: 13,
    fontStyle: 'italic',
  },
  hiddenDots: {
    paddingHorizontal: 8,
  },
  dotsText: {
    color: '#818384',
    fontSize: 18,
    fontWeight: '800',
  },

  /* Buttons */
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  pushBtn: {
    backgroundColor: '#d35400',
  },
  popBtn: {
    backgroundColor: '#27ae60',
  },
  discardBtn: {
    backgroundColor: '#7f8c8d',
  },
  disabledBtn: {
    opacity: 0.3,
  },
  btnEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnCost: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  /* Undo */
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  undoText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },

  /* Stuck */
  stuckMsg: {
    backgroundColor: 'rgba(231,76,60,0.15)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
  },
  stuckText: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* End */
  endMsg: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },

  /* How to */
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
