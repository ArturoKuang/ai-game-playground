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
  legalMoves,
  type TagState,
  type Move,
} from '../solvers/Tag.solver';

/* ─── Colors ─── */
const BG = '#121213';
const SURFACE = '#1a1a1c';
const STAMP_COLOR = '#6c5ce7';
const STAMP_BG = 'rgba(108,92,231,0.15)';
const TAG_COLOR = '#2ecc71';
const TAG_BG = 'rgba(46,204,113,0.15)';
const SCAN_COLOR = '#f39c12';
const SCAN_BG = 'rgba(243,156,18,0.15)';
const REGISTRY_COLOR = '#3498db';
const REGISTRY_BG = 'rgba(52,152,219,0.12)';
const GLOW_COLOR = '#2ecc71';
const DANGER_COLOR = '#e74c3c';
const MUTED = '#818384';
const TEXT = '#ffffff';

type GamePhase = 'idle' | 'scan-select-1' | 'scan-select-2';

export default function Tag() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const [state, setState] = useState<TagState>(() => cloneState(initialState));
  const [history, setHistory] = useState<TagState[]>(() => [cloneState(initialState)]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [scanFirst, setScanFirst] = useState<number | null>(null);
  const [lastScanResult, setLastScanResult] = useState<{ i: number; j: number; match: boolean } | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficulty);

  // Rebuild puzzle on difficulty change
  const currentPuzzle = useMemo(
    () => selectedDifficulty === difficulty ? initialState : generatePuzzle(seed, selectedDifficulty),
    [seed, selectedDifficulty, difficulty, initialState],
  );

  const solved = isGoal(state);
  const legal = useMemo(() => legalMoves(state), [state]);
  const budgetExhausted = !solved && state.actions >= state.budget;
  const { width: screenWidth } = useWindowDimensions();

  // How many tiles are on the board
  const arrivedCount = state.arrived.length;

  // Compute which arrived tiles have their value in the registry (glow = auto-detect)
  const glowingIndices = useMemo(() => {
    const result = new Set<number>();
    for (let i = 0; i < state.arrived.length; i++) {
      const gi = state.sequence.length - state.incoming.length - state.arrived.length + i;
      if (state.registry.has(state.arrived[i]) && state.duplicateIndices.includes(gi) && !state.tagged.has(gi)) {
        result.add(i);
      }
    }
    return result;
  }, [state]);

  // Tagged indices (local)
  const taggedLocal = useMemo(() => {
    const result = new Set<number>();
    for (let i = 0; i < state.arrived.length; i++) {
      const gi = state.sequence.length - state.incoming.length - state.arrived.length + i;
      if (state.tagged.has(gi)) result.add(i);
    }
    return result;
  }, [state]);

  // Stamped indices (local) — tiles whose value is in the registry
  const stampedLocal = useMemo(() => {
    const result = new Set<number>();
    for (let i = 0; i < state.arrived.length; i++) {
      if (state.registry.has(state.arrived[i])) result.add(i);
    }
    return result;
  }, [state]);

  // How many duplicates found vs total
  const dupsFound = state.tagged.size;
  const dupsTotal = state.duplicateIndices.length;

  /* ─── Animations ─── */
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

  /* ─── Move Handlers ─── */

  const doMove = useCallback(
    (move: Move) => {
      if (solved || budgetExhausted) return;

      const next = applyMove(state, move);
      setState(next);
      setHistory(h => [...h, cloneState(next)]);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('tag', next.actions, next.budget).then(s => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, budgetExhausted, gameRecorded],
  );

  const handleNext = useCallback(() => {
    if (state.incoming.length === 0) return;
    doMove({ type: 'next' });
    setPhase('idle');
    setScanFirst(null);
    setLastScanResult(null);
  }, [state, doMove]);

  const handleStamp = useCallback((tileIndex: number) => {
    const canStamp = legal.some(m => m.type === 'stamp' && m.tileIndex === tileIndex);
    if (!canStamp) {
      shake();
      return;
    }
    doMove({ type: 'stamp', tileIndex });
    setLastScanResult(null);
  }, [legal, doMove, shake]);

  const handleTag = useCallback((tileIndex: number) => {
    const canTag = legal.some(m => m.type === 'tag' && m.tileIndex === tileIndex);
    if (!canTag) {
      shake();
      return;
    }
    doMove({ type: 'tag', tileIndex });
    setLastScanResult(null);
  }, [legal, doMove, shake]);

  const handleScanStart = useCallback(() => {
    setPhase('scan-select-1');
    setScanFirst(null);
    setLastScanResult(null);
  }, []);

  const handleScanSelect = useCallback((tileIndex: number) => {
    if (phase === 'scan-select-1') {
      setScanFirst(tileIndex);
      setPhase('scan-select-2');
    } else if (phase === 'scan-select-2' && scanFirst !== null) {
      if (tileIndex === scanFirst) {
        // Deselect
        setScanFirst(null);
        setPhase('scan-select-1');
        return;
      }
      const i1 = Math.min(scanFirst, tileIndex);
      const i2 = Math.max(scanFirst, tileIndex);
      const canScan = legal.some(
        m => m.type === 'scan' && m.tileIndex1 === i1 && m.tileIndex2 === i2,
      );
      if (!canScan) {
        shake();
        setPhase('idle');
        setScanFirst(null);
        return;
      }
      // Show scan result
      setLastScanResult({
        i: i1, j: i2,
        match: state.arrived[i1] === state.arrived[i2],
      });
      doMove({ type: 'scan', tileIndex1: i1, tileIndex2: i2 });
      setPhase('idle');
      setScanFirst(null);
    }
  }, [phase, scanFirst, legal, state, doMove, shake]);

  const handleTilePress = useCallback((index: number) => {
    if (solved) return;

    // If in scan mode, handle scan selection
    if (phase === 'scan-select-1' || phase === 'scan-select-2') {
      handleScanSelect(index);
      return;
    }

    // If tile is glowing (registry match), tag it
    if (glowingIndices.has(index)) {
      handleTag(index);
      return;
    }

    // If tile is not stamped, stamp it
    if (!stampedLocal.has(index) && !taggedLocal.has(index)) {
      handleStamp(index);
      return;
    }
  }, [solved, phase, glowingIndices, stampedLocal, taggedLocal, handleScanSelect, handleTag, handleStamp]);

  /* ─── Undo / Reset ─── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState(cloneState(prev));
    setHistory(h => h.slice(0, -1));
    setPhase('idle');
    setScanFirst(null);
    setLastScanResult(null);
  }, [history, solved]);

  const handleReset = useCallback(() => {
    const init = cloneState(currentPuzzle);
    setState(init);
    setHistory([cloneState(init)]);
    setPhase('idle');
    setScanFirst(null);
    setLastScanResult(null);
    setGameRecorded(false);
  }, [currentPuzzle]);

  const handleDifficultyChange = useCallback((d: number) => {
    setSelectedDifficulty(d);
    const p = d === difficulty ? initialState : generatePuzzle(seed, d);
    const init = cloneState(p);
    setState(init);
    setHistory([cloneState(init)]);
    setPhase('idle');
    setScanFirst(null);
    setLastScanResult(null);
    setGameRecorded(false);
  }, [seed, difficulty, initialState]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('tag');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── Share Text ─── */
  function buildShareText() {
    const efficiency = state.actions <= state.budget * 0.5 ? 'Hash Master!' :
      state.actions <= state.budget * 0.8 ? 'Efficient!' : 'Done!';
    return [
      `Tag Day #${puzzleDay}`,
      `${dupsFound}/${dupsTotal} duplicates in ${state.actions} actions`,
      `Budget: ${state.actions}/${state.budget}`,
      `Registry: ${state.registry.size} stamps`,
      efficiency,
    ].join('\n');
  }

  /* ─── Tile Sizing ─── */
  const maxBoardWidth = Math.min(screenWidth - 48, 460);
  const tilesPerRow = Math.min(arrivedCount, Math.max(5, Math.floor(maxBoardWidth / 56)));
  const tileSize = Math.min(50, Math.floor((maxBoardWidth - (tilesPerRow - 1) * 6) / tilesPerRow));

  /* ─── Next tile preview ─── */
  const nextTiles = state.incoming.slice(0, 2);

  return (
    <View style={styles.outerContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tag</Text>
          <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
          <Pressable onPress={handleShowStats}>
            <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Stamp numbers to detect duplicates instantly
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
            <Text style={styles.infoLabel}>Actions</Text>
            <Text style={[
              styles.infoVal,
              state.actions > state.budget * 0.8 && !solved && styles.infoDanger,
              solved && state.actions <= state.budget * 0.5 && styles.infoGood,
            ]}>
              {state.actions}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Budget</Text>
            <Text style={styles.infoPar}>{state.budget}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Duplicates</Text>
            <Text style={[styles.infoVal, solved && styles.infoGood]}>
              {dupsFound}/{dupsTotal}
            </Text>
          </View>
        </View>

        {/* Incoming tiles */}
        {nextTiles.length > 0 && !solved && (
          <View style={styles.incomingArea}>
            <Text style={styles.incomingLabel}>
              Next ({state.incoming.length} remaining)
            </Text>
            <View style={styles.incomingRow}>
              {nextTiles.map((val, i) => (
                <View key={i} style={styles.incomingTile}>
                  <Text style={styles.incomingText}>{val}</Text>
                </View>
              ))}
            </View>
            <Pressable
              style={styles.nextBtn}
              onPress={handleNext}
              {...(Platform.OS === 'web' ? { role: 'button' as any, tabIndex: 0 } : {})}
            >
              <Text style={styles.nextBtnText}>Advance Tile</Text>
            </Pressable>
          </View>
        )}

        {/* Board area */}
        <Animated.View
          style={[
            styles.boardContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {arrivedCount === 0 && !solved ? (
            <View style={styles.emptyBoard}>
              <Text style={styles.emptyText}>
                Advance a tile to begin
              </Text>
            </View>
          ) : (
            <View style={[
              styles.tileGrid,
              { maxWidth: maxBoardWidth + 16 },
            ]}>
              {state.arrived.map((val, i) => {
                const isTagged = taggedLocal.has(i);
                const isStamped = stampedLocal.has(i);
                const isGlowing = glowingIndices.has(i);
                const isScanSelected = (phase === 'scan-select-2' && scanFirst === i);
                const isLastScan = lastScanResult &&
                  (lastScanResult.i === i || lastScanResult.j === i);

                let bg = SURFACE;
                let borderColor = '#333';
                let borderWidth = 1;
                let textColor = TEXT;

                if (isTagged) {
                  bg = TAG_BG;
                  borderColor = TAG_COLOR;
                  borderWidth = 2;
                  textColor = TAG_COLOR;
                } else if (isGlowing) {
                  bg = 'rgba(46,204,113,0.25)';
                  borderColor = GLOW_COLOR;
                  borderWidth = 2;
                } else if (isScanSelected) {
                  bg = SCAN_BG;
                  borderColor = SCAN_COLOR;
                  borderWidth = 2;
                } else if (isLastScan && lastScanResult) {
                  bg = lastScanResult.match ? TAG_BG : 'rgba(231,76,60,0.1)';
                  borderColor = lastScanResult.match ? TAG_COLOR : DANGER_COLOR;
                  borderWidth = 2;
                } else if (isStamped) {
                  bg = STAMP_BG;
                  borderColor = STAMP_COLOR;
                  borderWidth = 1;
                }

                const inScanMode = phase === 'scan-select-1' || phase === 'scan-select-2';

                return (
                  <Pressable
                    key={i}
                    onPress={() => handleTilePress(i)}
                    style={({ pressed }) => [
                      styles.tile,
                      {
                        width: tileSize,
                        height: tileSize,
                        backgroundColor: bg,
                        borderColor,
                        borderWidth,
                      },
                      pressed && !isTagged && styles.tilePressed,
                    ]}
                    disabled={isTagged && !inScanMode}
                    {...(Platform.OS === 'web' ? { role: 'button' as any, tabIndex: 0 } : {})}
                  >
                    <Text style={[
                      styles.tileText,
                      { color: textColor },
                      tileSize < 36 && { fontSize: 11 },
                    ]}>
                      {val}
                    </Text>
                    {isStamped && !isTagged && (
                      <View style={styles.stampDot} />
                    )}
                    {isGlowing && (
                      <View style={styles.glowDot} />
                    )}
                    {isTagged && (
                      <Text style={styles.tagMark}>{'\u2713'}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Last scan result */}
        {lastScanResult && !solved && (
          <View style={[
            styles.scanResult,
            lastScanResult.match ? styles.scanResultMatch : styles.scanResultMiss,
          ]}>
            <Text style={styles.scanResultText}>
              {lastScanResult.match
                ? `Match! Tiles ${state.arrived[lastScanResult.i]} = ${state.arrived[lastScanResult.j]}`
                : `No match: ${state.arrived[lastScanResult.i]} != ${state.arrived[lastScanResult.j]}`}
            </Text>
          </View>
        )}

        {/* Registry panel */}
        <View style={styles.registryPanel}>
          <View style={styles.registryHeader}>
            <Text style={styles.registryTitle}>Registry</Text>
            <Text style={styles.registryCapacity}>
              {state.registry.size}
              {state.registryCapacity < Infinity ? `/${state.registryCapacity}` : ''} stamps
            </Text>
          </View>
          {state.registry.size > 0 ? (
            <View style={styles.registryGrid}>
              {Array.from(state.registry).sort((a, b) => a - b).map((val, i) => (
                <View key={i} style={styles.registrySlot}>
                  <Text style={styles.registryVal}>{val}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.registryEmpty}>
              Stamp tiles to add them here
            </Text>
          )}
        </View>

        {/* Action buttons */}
        {!solved && arrivedCount > 0 && (
          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.actionBtn,
                styles.scanBtn,
                (phase === 'scan-select-1' || phase === 'scan-select-2') && styles.scanBtnActive,
                state.actions >= state.budget && styles.actionBtnDisabled,
              ]}
              onPress={() => {
                if (phase === 'scan-select-1' || phase === 'scan-select-2') {
                  setPhase('idle');
                  setScanFirst(null);
                } else {
                  handleScanStart();
                }
              }}
              disabled={state.actions >= state.budget}
              {...(Platform.OS === 'web' ? { role: 'button' as any, tabIndex: 0 } : {})}
            >
              <Text style={[
                styles.actionBtnText,
                (phase === 'scan-select-1' || phase === 'scan-select-2') && styles.scanBtnTextActive,
              ]}>
                {phase === 'scan-select-1' ? 'Select 1st tile...'
                  : phase === 'scan-select-2' ? 'Select 2nd tile...'
                    : 'Scan (1 action)'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Budget exhausted */}
        {budgetExhausted && (
          <View style={styles.stuckBanner}>
            <Text style={styles.stuckText}>
              Out of actions! Undo or reset.
            </Text>
          </View>
        )}

        {/* Phase instruction */}
        {!solved && phase !== 'idle' && (
          <Text style={styles.phaseHint}>
            Tap a tile to {phase === 'scan-select-1' ? 'select the first tile to compare' : 'select the second tile'}
          </Text>
        )}

        <CelebrationBurst show={solved} />

        {solved && (
          <View style={styles.endMsg}>
            <Text style={styles.endEmoji}>
              {state.actions <= state.budget * 0.5
                ? '\uD83C\uDF1F'
                : state.actions <= state.budget * 0.8
                  ? '\u2B50'
                  : '\uD83C\uDFF7\uFE0F'}
            </Text>
            <Text style={styles.endText}>
              {state.actions <= state.budget * 0.5
                ? `Hash Master! ${state.actions} actions`
                : state.actions <= state.budget * 0.8
                  ? `Well done! ${state.actions} actions`
                  : `Solved in ${state.actions} actions`}
            </Text>
            <ShareButton text={buildShareText()} />
          </View>
        )}

        <View style={styles.howTo}>
          <Text style={styles.howToTitle}>How to play</Text>
          <Text style={styles.howToText}>
            Find all duplicate numbers among the tiles.
            {'\n\n'}
            Tap a tile to stamp its number into the registry (costs actions).
            When a new tile arrives with a number already in the registry,
            it glows green -- tap it to tag it as a duplicate for free!
            {'\n\n'}
            You can also use Scan to compare two tiles (costs 1 action each).
            But stamping everything is far more efficient than scanning pairs.
            {'\n\n'}
            The key insight: stamp upfront, detect for free.
          </Text>
        </View>

        {/* Spacer for bottom bar */}
        {!solved && state.actions > 0 && <View style={{ height: 72 }} />}

        {showStats && stats && (
          <StatsModal stats={stats} onClose={() => setShowStats(false)} />
        )}
      </ScrollView>

      {/* Fixed bottom bar for undo/reset */}
      {!solved && state.actions > 0 && (
        <View style={styles.fixedBottomBar}>
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

function cloneState(s: TagState): TagState {
  return {
    ...s,
    arrived: [...s.arrived],
    incoming: [...s.incoming],
    registry: new Set(s.registry),
    tagged: new Set(s.tagged),
    scanConfirmed: new Set(s.scanConfirmed),
    duplicateIndices: s.duplicateIndices,
    sequence: s.sequence,
  };
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: BG,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: 2,
  },
  dayBadge: { color: '#6aaa64', fontSize: 13, fontWeight: '600' },
  statsIcon: { fontSize: 24 },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
    maxWidth: 300,
  },
  diffRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  diffBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffBtnActive: {
    backgroundColor: STAMP_BG,
    borderColor: STAMP_COLOR,
  },
  diffText: { color: MUTED, fontSize: 14, fontWeight: '700' },
  diffTextActive: { color: STAMP_COLOR },
  infoBar: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: MUTED, fontSize: 11, marginBottom: 2 },
  infoVal: { color: TEXT, fontSize: 22, fontWeight: '800' },
  infoGood: { color: TAG_COLOR },
  infoDanger: { color: DANGER_COLOR },
  infoPar: { color: MUTED, fontSize: 22, fontWeight: '800' },
  incomingArea: {
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  incomingLabel: { color: MUTED, fontSize: 11, fontWeight: '600' },
  incomingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  incomingTile: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2c2c3e',
    borderWidth: 1,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingText: { color: TEXT, fontSize: 16, fontWeight: '700' },
  nextBtn: {
    backgroundColor: STAMP_BG,
    borderWidth: 1,
    borderColor: STAMP_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  nextBtnText: { color: STAMP_COLOR, fontWeight: '700', fontSize: 14 },
  boardContainer: {
    marginVertical: 8,
  },
  emptyBoard: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: { color: MUTED, fontSize: 14 },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  tile: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tilePressed: { opacity: 0.7 },
  tileText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stampDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: STAMP_COLOR,
  },
  glowDot: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: GLOW_COLOR,
  },
  tagMark: {
    position: 'absolute',
    bottom: 1,
    right: 3,
    fontSize: 10,
    color: TAG_COLOR,
    fontWeight: '800',
  },
  scanResult: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
  },
  scanResultMatch: {
    backgroundColor: TAG_BG,
    borderColor: TAG_COLOR,
  },
  scanResultMiss: {
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderColor: DANGER_COLOR,
  },
  scanResultText: { color: TEXT, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  registryPanel: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: REGISTRY_BG,
    borderWidth: 1,
    borderColor: REGISTRY_COLOR,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  registryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  registryTitle: {
    color: REGISTRY_COLOR,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  registryCapacity: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
  },
  registryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  registrySlot: {
    backgroundColor: 'rgba(52,152,219,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(52,152,219,0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  registryVal: {
    color: REGISTRY_COLOR,
    fontSize: 14,
    fontWeight: '700',
  },
  registryEmpty: {
    color: MUTED,
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 140,
    alignItems: 'center',
  },
  scanBtn: {
    backgroundColor: SCAN_BG,
    borderWidth: 1,
    borderColor: '#555',
  },
  scanBtnActive: {
    borderColor: SCAN_COLOR,
  },
  actionBtnDisabled: {
    opacity: 0.3,
  },
  actionBtnText: {
    color: TEXT,
    fontWeight: '700',
    fontSize: 14,
  },
  scanBtnTextActive: {
    color: SCAN_COLOR,
  },
  stuckBanner: {
    marginTop: 10,
    backgroundColor: '#4a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  stuckText: { color: DANGER_COLOR, fontSize: 13, fontWeight: '600' },
  phaseHint: {
    color: SCAN_COLOR,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  undoText: { color: TEXT, fontWeight: '600', fontSize: 14 },
  resetBtn: {
    backgroundColor: '#4a1a1a',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetText: { color: DANGER_COLOR, fontWeight: '600', fontSize: 14 },
  endMsg: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: MUTED, fontSize: 13, lineHeight: 20 },
});
