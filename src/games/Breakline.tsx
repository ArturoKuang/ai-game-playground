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
  type BreaklineDifficulty,
  type BreaklineState,
} from '../solvers/Breakline.solver';

const DIFFICULTIES: BreaklineDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: BreaklineDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Breakline() {
  const [difficulty, setDifficulty] = useState<BreaklineDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<BreaklineState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: BreaklineDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'keepLeft' | 'keepRight' | 'lineSweep') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>{puzzle.label}</Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>
          One rotated ridge hides the wrap break. The current middle beacon and tail sentinel are the only clues you need.
        </Text>
      </View>

      <View style={styles.rangeCard}>
        <Text style={styles.cardTitle}>Live Corridor</Text>
        <View style={styles.rangeRow}>
          {puzzle.values.map((value, index) => {
            const inRange = index >= state.left && index <= state.right;
            const isLeft = index === state.left;
            const isMid = index === midIndex;
            const isRight = index === state.right;
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
                  {isLeft ? 'left' : isMid ? 'mid' : isRight ? 'tail' : ' '}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Left Beacon</Text>
          <Text style={styles.summaryValue}>{leftValue ?? '—'}</Text>
          <Text style={styles.summaryMeta}>Tower {state.left + 1}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Mid Beacon</Text>
          <Text style={styles.summaryValue}>{midValue ?? '—'}</Text>
          <Text style={styles.summaryMeta}>Tower {midIndex + 1}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Tail Sentinel</Text>
          <Text style={styles.summaryValue}>{rightValue ?? '—'}</Text>
          <Text style={styles.summaryMeta}>Tower {state.right + 1}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Sweep Cost</Text>
          <Text style={styles.summaryValue}>{sweepCost}</Text>
          <Text style={styles.summaryMeta}>Full corridor scan</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Span Width</Text>
          <Text style={styles.summaryValue}>{state.right - state.left + 1}</Text>
          <Text style={styles.summaryMeta}>Towers still live</Text>
        </View>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.cardTitle}>Cut Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.logRow}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.logText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No cuts yet. Start by reading the middle beacon against the tail sentinel.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Ridge Rules</Text>
        <Text style={styles.infoLine}>Hold Left: keep towers left through middle when the middle beacon is already at or below the tail sentinel.</Text>
        <Text style={styles.infoLine}>Hold Right: keep only the towers right of middle when the middle beacon is still above the tail sentinel.</Text>
        <Text style={styles.infoLine}>Line Sweep: brute-force the whole live corridor, but it spends one action per seam.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('keepLeft')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Hold Left Arc</Text>
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
          <Text style={styles.primaryButtonLabel}>Hold Right Arc</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('lineSweep')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Line Sweep ({sweepCost})</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Ridge</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Ridge</Text>
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
      title="Breakline"
      emoji="BL"
      subtitle="Rotated-array minimum via binary search"
      objective="Secure the dawn marker where the ridge wraps back to its minimum height. Read the middle beacon against the tail sentinel and collapse the live corridor before the alarm budget runs out."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Ridge',
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
          'This is the rotated-array minimum loop: compare `nums[mid]` to `nums[right]`. If the middle value is higher, the minimum must be to the right. Otherwise the minimum is at or left of `mid`.',
        takeaway:
          'Holding the left arc maps to `right = mid`. Holding the right arc maps to `left = mid + 1`. The expensive line sweep is the discarded O(n) fallback.',
      }}
      leetcodeLinks={[
        {
          id: 153,
          title: 'Find Minimum in Rotated Sorted Array',
          url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/',
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
    borderColor: '#343741',
    padding: 16,
    gap: 8,
  },
  titleLabel: {
    color: '#8c91a0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  titleHint: {
    color: '#c3cad7',
    fontSize: 14,
    lineHeight: 20,
  },
  rangeCard: {
    backgroundColor: '#17191d',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f3440',
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    width: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38404c',
    backgroundColor: '#252a34',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  cellDormant: {
    opacity: 0.38,
  },
  cellLeft: {
    borderColor: '#7ed0ff',
    backgroundColor: '#17384a',
  },
  cellMid: {
    borderColor: '#f5d27a',
    backgroundColor: '#463817',
  },
  cellRight: {
    borderColor: '#ff9d9d',
    backgroundColor: '#4a1f25',
  },
  cellIndex: {
    color: '#b4b9c6',
    fontSize: 11,
    fontWeight: '600',
  },
  cellValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  cellMarker: {
    color: '#dfe5f0',
    fontSize: 11,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 96,
    backgroundColor: '#17191d',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f3440',
    padding: 14,
    gap: 6,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#aab2bf',
    fontSize: 12,
    lineHeight: 16,
  },
  logCard: {
    backgroundColor: '#17191d',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f3440',
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
    backgroundColor: '#2a3040',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logText: {
    color: '#eef2ff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#aab2bf',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#17191d',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f3440',
    padding: 16,
    gap: 8,
  },
  infoLine: {
    color: '#d0d6e0',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#394150',
    backgroundColor: '#20242c',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#ffe8a3',
    borderColor: '#ffe8a3',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#eef2ff',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#2b2208',
    fontSize: 14,
    fontWeight: '800',
  },
  resetButton: {
    flex: 1,
    minWidth: 120,
    borderRadius: 14,
    backgroundColor: '#2f3440',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  resetButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  messageText: {
    color: '#d7dde8',
    fontSize: 14,
    lineHeight: 20,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  winText: {
    color: '#97f0aa',
  },
  lossText: {
    color: '#ff9d9d',
  },
});
