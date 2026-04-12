import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentMedian as solverCurrentMedian,
  evaluateMidmoor,
  generatePuzzle,
  type MidmoorDifficulty,
  type MidmoorState,
} from '../solvers/Midmoor.solver';

const DIFFICULTIES: MidmoorDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: MidmoorDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function formatMedian(value: number | null) {
  if (value === null) return '—';
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function nextArrival(state: MidmoorState) {
  if (state.streamIndex >= state.puzzle.stream.length) return null;
  if (state.medians.length < state.streamIndex) return null;
  return state.puzzle.stream[state.streamIndex];
}

function crownValue(values: number[]) {
  return values[0] ?? null;
}

function dockSubtitle(label: string, crown: number | null, size: number) {
  return `${label} crown ${crown === null ? '—' : crown} • ${size} moored`;
}

export default function Midmoor() {
  const [difficulty, setDifficulty] = useState<MidmoorDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<MidmoorState>(() => createInitialState(buildPuzzle(1, 0)));
  const evaluation = useMemo(() => evaluateMidmoor(), []);

  const resetPuzzle = (nextPuzzle = puzzle) => {
    setPuzzle(nextPuzzle);
    setState(createInitialState(nextPuzzle));
  };

  const rerollPuzzle = () => {
    const nextSeed = seed + 1;
    const nextPuzzle = buildPuzzle(difficulty, nextSeed);
    setSeed(nextSeed);
    resetPuzzle(nextPuzzle);
  };

  const switchDifficulty = (nextDifficulty: MidmoorDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (
    move: 'berthLower' | 'berthUpper' | 'ferryLowerUp' | 'ferryUpperDown',
  ) => {
    setState((current) => applyMove(current, { type: move }));
  };

  const arrival = nextArrival(state);
  const median = solverCurrentMedian(state);
  const lowerCrown = crownValue(state.lower);
  const upperCrown = crownValue(state.upper);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Next Buoy</Text>
          <Text style={styles.summaryValue}>{arrival === null ? 'Settled' : arrival}</Text>
          <Text style={styles.summaryMeta}>
            {arrival === null
              ? state.streamIndex === state.puzzle.stream.length
                ? 'stream complete'
                : 'repair the harbor first'
              : `arrival ${state.streamIndex + 1} of ${state.puzzle.stream.length}`}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Median Line</Text>
          <Text style={styles.summaryValue}>{formatMedian(median)}</Text>
          <Text style={styles.summaryMeta}>sealed only when both docks settle</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Tide Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>harbor moves used</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Deep Dock</Text>
          <Text style={styles.summaryValue}>{lowerCrown ?? '—'}</Text>
          <Text style={styles.summaryMeta}>{dockSubtitle('max', lowerCrown, state.lower.length)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Sky Dock</Text>
          <Text style={styles.summaryValue}>{upperCrown ?? '—'}</Text>
          <Text style={styles.summaryMeta}>{dockSubtitle('min', upperCrown, state.upper.length)}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Arrival Stream</Text>
        <View style={styles.chipRow}>
          {puzzle.stream.map((value, index) => {
            const sealed = index < state.medians.length;
            const pending = index === state.streamIndex && arrival !== null;
            const queued = index > state.streamIndex || (index === state.streamIndex && arrival === null);
            return (
              <View
                key={`stream-${index}`}
                style={[
                  styles.streamChip,
                  sealed && styles.sealedChip,
                  pending && styles.pendingChip,
                  queued && styles.queuedChip,
                ]}
              >
                <Text style={styles.streamValue}>{value}</Text>
                <Text style={styles.streamMeta}>
                  {sealed ? `m${formatMedian(state.medians[index])}` : pending ? 'live' : 'queued'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.docksRow}>
        <View style={[styles.sectionCard, styles.dockCard]}>
          <Text style={styles.cardTitle}>Deep Dock</Text>
          <Text style={styles.dockHint}>lower half, crowned by the largest low buoy</Text>
          <View style={styles.chipRow}>
            {state.lower.length > 0 ? (
              state.lower.map((value, index) => (
                <View
                  key={`lower-${index}-${value}`}
                  style={[styles.dockChip, index === 0 && styles.deepCrownChip]}
                >
                  <Text style={styles.dockValue}>{value}</Text>
                  <Text style={styles.dockMeta}>{index === 0 ? 'crown' : 'moored'}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No deep buoys yet.</Text>
            )}
          </View>
        </View>

        <View style={[styles.sectionCard, styles.dockCard]}>
          <Text style={styles.cardTitle}>Sky Dock</Text>
          <Text style={styles.dockHint}>upper half, crowned by the smallest high buoy</Text>
          <View style={styles.chipRow}>
            {state.upper.length > 0 ? (
              state.upper.map((value, index) => (
                <View
                  key={`upper-${index}-${value}`}
                  style={[styles.dockChip, index === 0 && styles.skyCrownChip]}
                >
                  <Text style={styles.dockValue}>{value}</Text>
                  <Text style={styles.dockMeta}>{index === 0 ? 'crown' : 'moored'}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No sky buoys yet.</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Median Ledger</Text>
        {state.medians.length > 0 ? (
          <View style={styles.chipRow}>
            {state.medians.map((value, index) => (
              <View key={`median-${index}`} style={styles.medianChip}>
                <Text style={styles.medianStep}>{`#${index + 1}`}</Text>
                <Text style={styles.medianValue}>{formatMedian(value)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No medians sealed yet. Settle both docks after the first berth.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Harbor Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.chipRow}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.logText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            The stream starts empty. Berth the first buoy into either dock to expose the first median crown.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Harbor Rules</Text>
        <Text style={styles.infoLine}>Berth Lower: moor the live buoy into the deep dock.</Text>
        <Text style={styles.infoLine}>Berth Upper: moor the live buoy into the sky dock.</Text>
        <Text style={styles.infoLine}>Ferry Deep Crown Up: move the largest lower buoy into the sky dock.</Text>
        <Text style={styles.infoLine}>Ferry Sky Crown Down: move the smallest upper buoy into the deep dock.</Text>
        <Text style={styles.infoLine}>The next buoy does not arrive until the two docks are settled again.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('berthLower')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Berth Lower</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('berthUpper')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Berth Upper</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('ferryLowerUp')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Ferry Deep Crown Up</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('ferryUpperDown')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Ferry Sky Crown Down</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Harbor</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Tide</Text>
        </Pressable>
      </View>

      <Text style={styles.messageText}>{state.message}</Text>
      {state.verdict ? (
        <Text style={[styles.verdictText, state.verdict.correct ? styles.winText : styles.lossText]}>
          {state.verdict.label}
        </Text>
      ) : null}
    </View>
  );

  return (
    <GameScreenTemplate
      title="Midmoor"
      emoji="MM"
      subtitle="Keep the lower half under one deep crown, the upper half under one sky crown, and ferry only the exposed crown when the live median line drifts."
      objective="Settle the full data stream before the tide budget runs out, sealing the correct median after every arrival."
      statsLabel={`${puzzle.label} • break ${evaluation.learningMetrics.difficultyBreakpoint}`}
      actions={[
        { label: 'Reset Harbor', onPress: () => resetPuzzle() },
        { label: 'New Tide', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((value) => ({
        label: `D${value}`,
        selected: difficulty === value,
        onPress: () => switchDifficulty(value),
      }))}
      helperText={puzzle.helper}
      board={board}
      controls={controls}
      conceptBridge={{
        title: 'What this teaches',
        summary:
          'Midmoor teaches the two-heap median-stream routine: keep the lower half in a max-priority structure, the upper half in a min-priority structure, rebalance when the sizes drift by more than one, and read the median from the exposed crowns.',
        takeaway:
          'The deep crown is the max-heap root, the sky crown is the min-heap root, and the crown ferries are the rebalance pops and pushes that restore the split after each add.',
      }}
      leetcodeLinks={[
        {
          id: 295,
          title: 'Find Median from Data Stream',
          url: 'https://leetcode.com/problems/find-median-from-data-stream/',
        },
      ]}
      footer={
        <Text style={styles.footerText}>
          {`Best-alt gap ${(evaluation.learningMetrics.bestAlternativeGap * 100).toFixed(1)}%, invariant pressure ${(evaluation.learningMetrics.invariantPressure * 100).toFixed(1)}%, LeetCode fit ${(evaluation.learningMetrics.leetCodeFit * 100).toFixed(1)}%.`}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 120,
    backgroundColor: '#151a23',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2f435c',
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: '#9fb8da',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#f4f8ff',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#c1d3eb',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#101521',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#223149',
    padding: 16,
    gap: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  streamChip: {
    minWidth: 60,
    backgroundColor: '#1b2332',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#394c6f',
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: 'center',
    gap: 2,
  },
  sealedChip: {
    backgroundColor: '#163122',
    borderColor: '#356850',
  },
  pendingChip: {
    backgroundColor: '#352512',
    borderColor: '#9c6d2e',
  },
  queuedChip: {
    opacity: 0.75,
  },
  streamValue: {
    color: '#f4f8ff',
    fontSize: 16,
    fontWeight: '800',
  },
  streamMeta: {
    color: '#c1d3eb',
    fontSize: 11,
  },
  docksRow: {
    gap: 12,
  },
  dockCard: {
    flex: 1,
  },
  dockHint: {
    color: '#bfd0e6',
    fontSize: 12,
    lineHeight: 18,
  },
  dockChip: {
    minWidth: 68,
    backgroundColor: '#1d2634',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#425470',
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: 'center',
    gap: 2,
  },
  deepCrownChip: {
    backgroundColor: '#1a2d4a',
    borderColor: '#5f95df',
  },
  skyCrownChip: {
    backgroundColor: '#2b2145',
    borderColor: '#9c7ee8',
  },
  dockValue: {
    color: '#f4f8ff',
    fontSize: 16,
    fontWeight: '800',
  },
  dockMeta: {
    color: '#c5d5ea',
    fontSize: 11,
  },
  medianChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16212d',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4c698a',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  medianStep: {
    color: '#8cb5eb',
    fontSize: 11,
    fontWeight: '800',
  },
  medianValue: {
    color: '#f4f8ff',
    fontSize: 15,
    fontWeight: '800',
  },
  logChip: {
    backgroundColor: '#1e2836',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#405670',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  logText: {
    color: '#d8e4f2',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#bfd0e6',
    fontSize: 13,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#131a26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e3d57',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#d7e3f1',
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    minWidth: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#506884',
    backgroundColor: '#1b2432',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#f4f8ff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  resetButton: {
    flex: 1,
    minWidth: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3f5067',
    backgroundColor: '#141a24',
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonLabel: {
    color: '#d7e3f1',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#d2ddef',
    fontSize: 13,
    lineHeight: 20,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
  },
  winText: {
    color: '#72d39b',
  },
  lossText: {
    color: '#ef8d8d',
  },
  footerText: {
    color: '#c7d7ee',
    fontSize: 13,
    lineHeight: 20,
  },
});
