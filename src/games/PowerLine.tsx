import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  type PowerLineState,
  type Move,
} from '../solvers/PowerLine.solver';

/* Colors */
const BG = '#0a0a0b';
const SURFACE = '#141416';
const ACCENT = '#f97316';
const ACCENT_BG = 'rgba(249,115,22,0.15)';
const PREFIX_COLOR = '#3b82f6';
const SUFFIX_COLOR = '#a855f7';
const BYPASS_COLOR = '#22c55e';
const BYPASS_BG = 'rgba(34,197,94,0.15)';
const PROBE_COLOR = '#eab308';
const DANGER_COLOR = '#ef4444';
const MUTED = '#818384';
const TEXT = '#ffffff';

type GameMode = 'idle' | 'probe';

export default function PowerLine() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const [state, setState] = useState<PowerLineState>(() => cloneState(initialState));
  const [history, setHistory] = useState<PowerLineState[]>(() => [cloneState(initialState)]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);
  const [mode, setMode] = useState<GameMode>('idle');
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficulty);
  const [sweepAnims] = useState(() => new Array(9).fill(0).map(() => new Animated.Value(0)));
  const [bypassPulse] = useState(() => new Animated.Value(0));
  const [showConceptBridge, setShowConceptBridge] = useState(false);

  const solved = isGoal(state);
  const legal = useMemo(() => legalMoves(state), [state]);
  const outOfEnergy = !solved && legal.length === 0;
  const { width: screenWidth } = useWindowDimensions();

  const currentPuzzle = useMemo(
    () => selectedDifficulty === difficulty ? initialState : generatePuzzle(seed, selectedDifficulty),
    [seed, selectedDifficulty, difficulty, initialState],
  );

  /* Animations */
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

  const animateSweep = useCallback((direction: 'left' | 'right') => {
    const n = state.cellCount;
    const anims = sweepAnims.slice(0, n).map((anim, i) => {
      anim.setValue(0);
      const delay = direction === 'left' ? i * 60 : (n - 1 - i) * 60;
      return Animated.sequence([
        Animated.delay(delay),
        Animated.spring(anim, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      ]);
    });
    Animated.parallel(anims).start();
  }, [state.cellCount, sweepAnims]);

  const animateBypassPulse = useCallback(() => {
    bypassPulse.setValue(0);
    Animated.sequence([
      Animated.timing(bypassPulse, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(bypassPulse, { toValue: 0.7, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [bypassPulse]);

  /* Move Handlers */
  const doMove = useCallback(
    (move: Move) => {
      if (solved || outOfEnergy) return;
      const next = applyMove(state, move);
      setState(next);
      setHistory(h => [...h, cloneState(next)]);

      if (move.type === 'scan-left') animateSweep('left');
      if (move.type === 'scan-right') animateSweep('right');

      // Check if auto-derive happened
      const newBypasses = next.bypass.filter((b, i) => b !== null && state.bypass[i] === null).length;
      if (newBypasses > 1) animateBypassPulse();

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('power-line', next.energyUsed, next.energyBudget).then(s => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, outOfEnergy, gameRecorded, animateSweep, animateBypassPulse],
  );

  const handleScanLeft = useCallback(() => {
    if (!legal.some(m => m.type === 'scan-left')) { shake(); return; }
    doMove({ type: 'scan-left' });
    setMode('idle');
  }, [legal, doMove, shake]);

  const handleScanRight = useCallback(() => {
    if (!legal.some(m => m.type === 'scan-right')) { shake(); return; }
    doMove({ type: 'scan-right' });
    setMode('idle');
  }, [legal, doMove, shake]);

  const handleProbe = useCallback((index: number) => {
    if (!legal.some(m => m.type === 'probe' && m.index === index)) { shake(); return; }
    doMove({ type: 'probe', index });
    setMode('idle');
  }, [legal, doMove, shake]);

  const handleCellPress = useCallback((index: number) => {
    if (solved) return;
    if (mode === 'probe') {
      handleProbe(index);
    }
  }, [solved, mode, handleProbe]);

  /* Undo / Reset */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState(cloneState(prev));
    setHistory(h => h.slice(0, -1));
    setMode('idle');
  }, [history, solved]);

  const handleReset = useCallback(() => {
    const init = cloneState(currentPuzzle);
    setState(init);
    setHistory([cloneState(init)]);
    setMode('idle');
    setGameRecorded(false);
  }, [currentPuzzle]);

  const handleDifficultyChange = useCallback((d: number) => {
    setSelectedDifficulty(d);
    const p = d === difficulty ? initialState : generatePuzzle(seed, d);
    const init = cloneState(p);
    setState(init);
    setHistory([cloneState(init)]);
    setMode('idle');
    setGameRecorded(false);
  }, [seed, difficulty, initialState]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('power-line');
    setStats(s);
    setShowStats(true);
  }, []);

  /* Share Text */
  function buildShareText() {
    const eff = state.energyUsed <= 4 ? 'Prefix/Suffix Master!' : 'Done!';
    return [
      'Power Line Day #' + puzzleDay,
      state.cellCount + ' cells solved in ' + state.energyUsed + ' energy',
      'Budget: ' + state.energyUsed + '/' + state.energyBudget,
      eff,
    ].join('\n');
  }

  /* Cell Sizing */
  const maxBoardWidth = Math.min(screenWidth - 48, 500);
  const cellSize = Math.min(64, Math.floor((maxBoardWidth - (state.cellCount - 1) * 8) / state.cellCount));

  /* Energy bar color */
  const energyPct = state.energy / state.energyBudget;
  const energyColor = energyPct > 0.6 ? '#22c55e' : energyPct > 0.3 ? '#eab308' : '#ef4444';

  const bypassCount = state.bypass.filter(b => b !== null).length;

  return (
    <View style={styles.outerContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Power Line</Text>
          <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
          <Pressable onPress={handleShowStats}>
            <Text style={styles.statsIcon}>{"📊"}</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Fire scanning beams through hidden power cells to map their combined output
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
            <Text style={[styles.infoVal, { color: energyColor }]}>
              {state.energy}/{state.energyBudget}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Bypass</Text>
            <Text style={[styles.infoVal, solved && styles.infoGood]}>
              {bypassCount}/{state.cellCount}
            </Text>
          </View>
        </View>

        {/* Energy bar */}
        <View style={styles.energyBarOuter}>
          <View style={[styles.energyBarInner, { width: (energyPct * 100 + '%') as any, backgroundColor: energyColor }]} />
        </View>

        {/* Board */}
        <Animated.View
          style={[
            styles.boardContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          <View style={[styles.cellRow, { maxWidth: maxBoardWidth }]}>
            {state.cells.map((_, i) => {
              const prefix = state.prefix[i];
              const suffix = state.suffix[i];
              const bypass = state.bypass[i];
              const isProbed = state.probed[i];
              const hasBypass = bypass !== null;
              const canProbe = mode === 'probe' && legal.some(m => m.type === 'probe' && m.index === i);

              let cellBg = SURFACE;
              let cellBorder = '#333';
              if (hasBypass && !isProbed) { cellBg = BYPASS_BG; cellBorder = BYPASS_COLOR; }
              else if (isProbed) { cellBg = 'rgba(234,179,8,0.15)'; cellBorder = PROBE_COLOR; }
              else if (canProbe) { cellBg = ACCENT_BG; cellBorder = ACCENT; }

              return (
                <View key={i} style={styles.cellWrapper}>
                  {/* Prefix value above */}
                  <View style={styles.prefixSlot}>
                    {prefix !== null && (
                      <Animated.Text style={[
                        styles.prefixText,
                        { opacity: sweepAnims[i] || 1, transform: [{ scale: sweepAnims[i] || 1 }] },
                      ]}>
                        {prefix}
                      </Animated.Text>
                    )}
                  </View>

                  {/* Cell */}
                  <Pressable
                    onPress={() => handleCellPress(i)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: cellBg,
                        borderColor: cellBorder,
                      },
                    ]}
                    disabled={!canProbe}
                    {...(Platform.OS === 'web' ? { role: 'button' as any, tabIndex: 0 } : {})}
                  >
                    <Text style={[
                      styles.cellText,
                      hasBypass && styles.cellTextBypass,
                    ]}>
                      {hasBypass ? bypass : '?'}
                    </Text>
                    {isProbed && (
                      <View style={styles.probeDot} />
                    )}
                  </Pressable>

                  {/* Suffix value below */}
                  <View style={styles.suffixSlot}>
                    {suffix !== null && (
                      <Animated.Text style={[
                        styles.suffixText,
                        { opacity: sweepAnims[i] || 1, transform: [{ scale: sweepAnims[i] || 1 }] },
                      ]}>
                        {suffix}
                      </Animated.Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Action buttons */}
        {!solved && (
          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.actionBtn, styles.scanLeftBtn,
                state.scannedLeft && styles.actionBtnDisabled,
              ]}
              onPress={handleScanLeft}
              disabled={state.scannedLeft || state.energy < 2}
            >
              <Text style={styles.actionBtnText}>{"←"} Scan (2)</Text>
            </Pressable>

            <Pressable
              style={[
                styles.actionBtn, styles.probeBtn,
                mode === 'probe' && styles.probeBtnActive,
                state.energy < 1 && styles.actionBtnDisabled,
              ]}
              onPress={() => setMode(mode === 'probe' ? 'idle' : 'probe')}
              disabled={state.energy < 1}
            >
              <Text style={[styles.actionBtnText, mode === 'probe' && styles.probeBtnTextActive]}>
                {mode === 'probe' ? 'Tap a cell...' : 'Probe (1)'}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.actionBtn, styles.scanRightBtn,
                state.scannedRight && styles.actionBtnDisabled,
              ]}
              onPress={handleScanRight}
              disabled={state.scannedRight || state.energy < 2}
            >
              <Text style={styles.actionBtnText}>Scan (2) {"→"}</Text>
            </Pressable>
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

        {solved && (
          <View style={styles.endMsg}>
            <Text style={styles.endEmoji}>
              {state.energyUsed <= 4 ? '🌟' : state.energyUsed <= state.energyBudget * 0.8 ? '⭐' : '⚡'}
            </Text>
            <Text style={styles.endText}>
              {state.energyUsed <= 4
                ? 'Prefix/Suffix Master! ' + state.energyUsed + ' energy'
                : 'Solved in ' + state.energyUsed + ' energy'}
            </Text>
            <ShareButton text={buildShareText()} />

            <Pressable
              style={styles.conceptBtn}
              onPress={() => setShowConceptBridge(!showConceptBridge)}
            >
              <Text style={styles.conceptBtnText}>
                {showConceptBridge ? 'Hide Concept' : 'What did I just learn?'}
              </Text>
            </Pressable>

            {showConceptBridge && (
              <View style={styles.conceptBridge}>
                <Text style={styles.conceptTitle}>Prefix/Suffix Products</Text>
                <Text style={styles.conceptText}>
                  You just solved LeetCode #238 "Product of Array Except Self"!
                </Text>
                <Text style={styles.conceptText}>
                  Scanning left then right mirrors building prefix and suffix product
                  arrays. Each cell's bypass power is prefix x suffix -- the exact O(n)
                  solution that avoids division.
                </Text>
                <View style={styles.lcLink}>
                  <Text style={styles.lcNum}>#238</Text>
                  <Text style={styles.lcTitle}>Product of Array Except Self</Text>
                </View>
                <Text style={styles.lcDesc}>
                  Scanning left then right mirrors building prefix and suffix product arrays.
                  Each cell's bypass power is prefix x suffix -- the exact O(n) solution.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.howTo}>
          <Text style={styles.howToTitle}>How to play</Text>
          <Text style={styles.howToText}>
            Determine every cell's bypass power (product of all other cells).{"\n\n"}Scan Left/Right (2 energy each): reveals prefix or suffix products. When both are known at a cell, bypass = prefix x suffix auto-computes!{"\n\n"}Probe (1 energy): reveals one cell's bypass directly.{"\n\n"}The key insight: two scans (4 energy) solve everything.
          </Text>
        </View>

        {!solved && state.energyUsed > 0 && <View style={{ height: 72 }} />}

        {showStats && stats && (
          <StatsModal stats={stats} onClose={() => setShowStats(false)} />
        )}
      </ScrollView>

      {/* Fixed bottom bar for undo/reset */}
      {!solved && state.energyUsed > 0 && (
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

function cloneState(s: PowerLineState): PowerLineState {
  return {
    ...s,
    prefix: [...s.prefix],
    suffix: [...s.suffix],
    bypass: [...s.bypass],
    probed: [...s.probed],
    moveHistory: [...s.moveHistory],
  };
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#0a0a0b' },
  container: { flexGrow: 1, alignItems: 'center', backgroundColor: '#0a0a0b', paddingVertical: 16, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  dayBadge: { color: '#f97316', fontSize: 13, fontWeight: '600' },
  statsIcon: { fontSize: 24 },
  subtitle: { fontSize: 13, color: '#818384', marginTop: 2, marginBottom: 10, textAlign: 'center', maxWidth: 340 },
  diffRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  diffBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#141416', borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  diffBtnActive: { backgroundColor: 'rgba(249,115,22,0.15)', borderColor: '#f97316' },
  diffText: { color: '#818384', fontSize: 14, fontWeight: '700' },
  diffTextActive: { color: '#f97316' },
  infoBar: { flexDirection: 'row', gap: 24, marginBottom: 8, alignItems: 'center' },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#fff', fontSize: 22, fontWeight: '800' },
  infoGood: { color: '#22c55e' },
  energyBarOuter: { width: '80%', maxWidth: 300, height: 6, backgroundColor: '#333', borderRadius: 3, marginBottom: 16 },
  energyBarInner: { height: 6, borderRadius: 3 },
  boardContainer: { marginVertical: 8 },
  cellRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  cellWrapper: { alignItems: 'center', gap: 2 },
  prefixSlot: { height: 18, justifyContent: 'center', alignItems: 'center' },
  prefixText: { color: '#3b82f6', fontSize: 11, fontWeight: '700' },
  suffixSlot: { height: 18, justifyContent: 'center', alignItems: 'center' },
  suffixText: { color: '#a855f7', fontSize: 11, fontWeight: '700' },
  cell: { borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cellText: { color: '#818384', fontSize: 16, fontWeight: '700' },
  cellTextBypass: { color: '#22c55e' },
  probeDot: { position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: 4, backgroundColor: '#eab308' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'center' },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, minWidth: 90, alignItems: 'center' },
  scanLeftBtn: { backgroundColor: 'rgba(59,130,246,0.12)', borderColor: '#3b82f6' },
  scanRightBtn: { backgroundColor: 'rgba(168,85,247,0.12)', borderColor: '#a855f7' },
  probeBtn: { backgroundColor: 'rgba(234,179,8,0.12)', borderColor: '#555' },
  probeBtnActive: { borderColor: '#eab308' },
  actionBtnDisabled: { opacity: 0.3 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  probeBtnTextActive: { color: '#eab308' },
  stuckBanner: { marginTop: 10, backgroundColor: '#4a1a1a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  stuckText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  fixedBottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#141416', borderTopWidth: 1, borderTopColor: '#333' },
  undoBtn: { backgroundColor: '#3a3a3c', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  undoText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  resetBtn: { backgroundColor: '#4a1a1a', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  resetText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  endMsg: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 8 },
  conceptBtn: { marginTop: 16, backgroundColor: 'rgba(249,115,22,0.15)', borderWidth: 1, borderColor: '#f97316', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  conceptBtnText: { color: '#f97316', fontWeight: '700', fontSize: 14 },
  conceptBridge: { marginTop: 16, backgroundColor: '#141416', borderWidth: 1, borderColor: '#333', borderRadius: 16, padding: 16, maxWidth: 360 },
  conceptTitle: { color: '#f97316', fontSize: 16, fontWeight: '800', marginBottom: 8 },
  conceptText: { color: '#ccc', fontSize: 13, lineHeight: 20, marginBottom: 8 },
  lcLink: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  lcNum: { color: '#f97316', fontSize: 14, fontWeight: '800' },
  lcTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  lcDesc: { color: '#818384', fontSize: 12, lineHeight: 18 },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
