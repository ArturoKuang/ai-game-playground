import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentLeftValue,
  currentMidIndex,
  currentMidValue,
  currentRightValue,
  currentSweepCost,
  currentVisibleIndices,
  generatePuzzle,
  type BandshiftDifficulty,
  type BandshiftState,
} from '../solvers/Bandshift.solver';

const DIFFICULTIES: BandshiftDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: BandshiftDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Bandshift() {
  const [difficulty, setDifficulty] = useState<BandshiftDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<BandshiftState>(() => createInitialState(buildPuzzle(1, 0)));

  const visibleIndices = useMemo(() => new Set(currentVisibleIndices(state)), [state]);
  const leftValue = useMemo(() => currentLeftValue(state), [state]);
  const midValue = useMemo(() => currentMidValue(state), [state]);
  const rightValue = useMemo(() => currentRightValue(state), [state]);
  const sweepCost = useMemo(() => currentSweepCost(state), [state]);
  const midIndex = useMemo(() => currentMidIndex(state), [state]);

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

  const switchDifficulty = (nextDifficulty: BandshiftDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'lockMid' | 'keepLeft' | 'keepRight' | 'bandSweep') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>{puzzle.label}</Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>
          The band plan was rotated. Read the target card against the live left, middle, and right relays before you cut.
        </Text>
      </View>

      <View style={styles.targetCard}>
        <Text style={styles.cardTitle}>Target Frequency</Text>
        <Text style={styles.targetValue}>{puzzle.target}</Text>
        <Text style={styles.targetHint}>
          Some later bands hide no match at all. The ordered half still tells you whether to keep searching.
        </Text>
      </View>

      <View style={styles.rangeCard}>
        <Text style={styles.cardTitle}>Live Relay Chain</Text>
        <View style={styles.rangeRow}>
          {puzzle.values.map((value, index) => {
            const inRange = index >= state.left && index <= state.right;
            const isLeft = state.left <= state.right && index === state.left;
            const isMid = state.left <= state.right && index === midIndex;
            const isRight = state.left <= state.right && index === state.right;
            const visible = visibleIndices.has(index);

            return (
              <View
                key={`${value}-${index}`}
                style={[
                  styles.cell,
                  !inRange && styles.cellDormant,
                  isLeft && styles.cellLeft,
                  isMid && styles.cellMid,
                  isRight && styles.cellRight,
                ]}
              >
                <Text style={styles.cellIndex}>{index + 1}</Text>
                <Text style={styles.cellValue}>{visible ? value : '••'}</Text>
                <Text style={styles.cellMarker}>
                  {isLeft ? 'left' : isMid ? 'mid' : isRight ? 'right' : ' '}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Left Relay</Text>
          <Text style={styles.summaryValue}>{leftValue ?? '—'}</Text>
          <Text style={styles.summaryMeta}>{state.left <= state.right ? `Relay ${state.left + 1}` : 'Search clear'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Mid Relay</Text>
          <Text style={styles.summaryValue}>{midValue ?? '—'}</Text>
          <Text style={styles.summaryMeta}>{state.left <= state.right ? `Relay ${midIndex + 1}` : 'No middle left'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Right Relay</Text>
          <Text style={styles.summaryValue}>{rightValue ?? '—'}</Text>
          <Text style={styles.summaryMeta}>{state.left <= state.right ? `Relay ${state.right + 1}` : 'Search clear'}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Sweep Cost</Text>
          <Text style={styles.summaryValue}>{sweepCost}</Text>
          <Text style={styles.summaryMeta}>Full-band scan</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Span Width</Text>
          <Text style={styles.summaryValue}>{Math.max(0, state.right - state.left + 1)}</Text>
          <Text style={styles.summaryMeta}>Relays still live</Text>
        </View>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.cardTitle}>Search Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.logRow}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.logText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No cuts yet. Start by asking whether the middle relay already matches the target, then which half is still ordered.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Band Rules</Text>
        <Text style={styles.infoLine}>Lock Mid: seal the search immediately if the middle relay matches the target frequency.</Text>
        <Text style={styles.infoLine}>Search Left: keep the relays strictly left of mid when the ordered left band can still hold the target.</Text>
        <Text style={styles.infoLine}>Search Right: keep the relays strictly right of mid when the ordered right band can still hold the target.</Text>
        <Text style={styles.infoLine}>Band Sweep: inspect every live relay at once, but spend one action per relay.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('lockMid')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, styles.lockButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.lockButtonLabel}>Lock Mid</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('keepLeft')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Search Left Span</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('keepRight')}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            styles.primaryButton,
            state.verdict && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Search Right Span</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('bandSweep')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Band Sweep ({sweepCost})</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Band</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Band</Text>
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
      title="Bandshift"
      emoji="BS"
      subtitle="Rotated-array target search via binary search"
      objective="Lock the target frequency inside a rotated relay chain. Check the middle first, then keep only the ordered half that can still contain the target before the drift budget runs out."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Band',
          onPress: rerollPuzzle,
          tone: 'primary',
        },
      ]}
      difficultyOptions={DIFFICULTIES.map((entry) => ({
        label: String(entry),
        selected: entry === difficulty,
        onPress: () => switchDifficulty(entry),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        title: 'What This Teaches',
        summary:
          'This is the rotated-array search loop: check `nums[mid] === target` first. Otherwise find the ordered half and keep it only if the target lies inside that half’s bounds.',
        takeaway:
          'Lock Mid maps to `return mid`. Search Left maps to `right = mid - 1`. Search Right maps to `left = mid + 1`. The expensive band sweep is the discarded O(n) scan.',
      }}
      leetcodeLinks={[
        {
          id: 33,
          title: 'Search in Rotated Sorted Array',
          url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 16,
  },
  titleCard: {
    backgroundColor: '#1f2023',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#32343a',
    padding: 16,
    gap: 6,
  },
  titleLabel: {
    color: '#8de0b9',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  titleHint: {
    color: '#c5cad3',
    fontSize: 13,
    lineHeight: 19,
  },
  targetCard: {
    backgroundColor: '#171d24',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#32506a',
    padding: 16,
    gap: 6,
  },
  targetValue: {
    color: '#f7f9fc',
    fontSize: 32,
    fontWeight: '900',
  },
  targetHint: {
    color: '#aebdca',
    fontSize: 13,
    lineHeight: 18,
  },
  rangeCard: {
    backgroundColor: '#17181b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f3136',
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    color: '#f4f5f6',
    fontSize: 14,
    fontWeight: '700',
  },
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    width: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a3d44',
    backgroundColor: '#23252a',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  cellDormant: {
    opacity: 0.3,
  },
  cellLeft: {
    borderColor: '#69c3ff',
    backgroundColor: '#193244',
  },
  cellMid: {
    borderColor: '#ffd479',
    backgroundColor: '#42331a',
  },
  cellRight: {
    borderColor: '#8de0b9',
    backgroundColor: '#1d3a30',
  },
  cellIndex: {
    color: '#a7acb5',
    fontSize: 11,
    fontWeight: '700',
  },
  cellValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  cellMarker: {
    color: '#d1d5dc',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#17181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2f3136',
    padding: 14,
    gap: 4,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#a7acb5',
    fontSize: 12,
  },
  logCard: {
    backgroundColor: '#17181b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f3136',
    padding: 16,
    gap: 12,
  },
  logRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    borderRadius: 999,
    backgroundColor: '#23252a',
    borderWidth: 1,
    borderColor: '#3a3d44',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logText: {
    color: '#e4e7eb',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#b2b7bf',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#17181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2f3136',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#d0d4db',
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  controlButton: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a3d44',
    backgroundColor: '#23252a',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockButton: {
    backgroundColor: '#2f2b1a',
    borderColor: '#b99a4a',
  },
  primaryButton: {
    backgroundColor: '#1f3b4d',
    borderColor: '#4b89b6',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#f4f5f6',
    fontSize: 14,
    fontWeight: '800',
  },
  lockButtonLabel: {
    color: '#ffe4a3',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButtonLabel: {
    color: '#dff2ff',
    fontSize: 14,
    fontWeight: '800',
  },
  resetButton: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a3d44',
    backgroundColor: '#1b1d22',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonLabel: {
    color: '#d7dadf',
    fontSize: 13,
    fontWeight: '800',
  },
  messageText: {
    color: '#d9dde3',
    fontSize: 14,
    lineHeight: 20,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  winText: {
    color: '#8de0b9',
  },
  lossText: {
    color: '#ff9b9b',
  },
});
