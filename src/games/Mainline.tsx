import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  generatePuzzle,
  type MainlineDifficulty,
  type MainlineMergedCar,
  type MainlineState,
} from '../solvers/Mainline.solver';

const DIFFICULTIES: MainlineDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: MainlineDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function sourceBadge(source: MainlineMergedCar['source']) {
  return source === 'left' ? 'L' : 'R';
}

export default function Mainline() {
  const [difficulty, setDifficulty] = useState<MainlineDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<MainlineState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: MainlineDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'coupleLeft' | 'coupleRight' | 'latchRemainder') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const leftHead = useMemo(() => puzzle.left[state.leftIndex] ?? null, [puzzle.left, state.leftIndex]);
  const rightHead = useMemo(() => puzzle.right[state.rightIndex] ?? null, [puzzle.right, state.rightIndex]);
  const tailValue = useMemo(
    () => state.merged[state.merged.length - 1]?.value ?? 'Dock',
    [state.merged],
  );
  const remainingLeft = puzzle.left.length - state.leftIndex;
  const remainingRight = puzzle.right.length - state.rightIndex;
  const canLatch =
    (remainingLeft === 0 && remainingRight > 0) || (remainingRight === 0 && remainingLeft > 0);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>{puzzle.label}</Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>
          Two sorted sidings feed one departure rail. Couple only the smaller live head, then stitch the untouched remainder once one side clears.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Left Head</Text>
          <Text style={styles.summaryValue}>{leftHead ?? 'Clear'}</Text>
          <Text style={styles.summaryMeta}>
            {leftHead === null ? 'No cars left on left siding' : `${remainingLeft} car${remainingLeft === 1 ? '' : 's'} remain`}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Right Head</Text>
          <Text style={styles.summaryValue}>{rightHead ?? 'Clear'}</Text>
          <Text style={styles.summaryMeta}>
            {rightHead === null ? 'No cars left on right siding' : `${remainingRight} car${remainingRight === 1 ? '' : 's'} remain`}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Departure Tail</Text>
          <Text style={styles.summaryValue}>{tailValue}</Text>
          <Text style={styles.summaryMeta}>
            {state.merged.length === 0 ? 'Dummy dock is still live' : `${state.merged.length} car${state.merged.length === 1 ? '' : 's'} merged`}
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Remainder Stitch</Text>
          <Text style={styles.summaryValue}>{canLatch ? 'Ready' : 'Wait'}</Text>
          <Text style={styles.summaryMeta}>
            {canLatch
              ? 'One siding is empty, so the untouched chain can be latched in one move.'
              : 'Keep comparing the two live heads.'}
          </Text>
        </View>
      </View>

      <View style={styles.railCard}>
        <Text style={styles.cardTitle}>Inbound Sidings</Text>
        <View style={styles.laneGrid}>
          <View style={styles.laneCard}>
            <Text style={styles.laneTitle}>Left</Text>
            <View style={styles.carRow}>
              {puzzle.left.map((value, index) => {
                const merged = index < state.leftIndex;
                const head = index === state.leftIndex && leftHead !== null;
                return (
                  <View
                    key={`left-${value}-${index}`}
                    style={[styles.carChip, merged && styles.carMerged, head && styles.carHead]}
                  >
                    <Text style={styles.carValue}>{value}</Text>
                    <Text style={styles.carMeta}>{merged ? 'sent' : head ? 'head' : 'queued'}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.laneCard}>
            <Text style={styles.laneTitle}>Right</Text>
            <View style={styles.carRow}>
              {puzzle.right.map((value, index) => {
                const merged = index < state.rightIndex;
                const head = index === state.rightIndex && rightHead !== null;
                return (
                  <View
                    key={`right-${value}-${index}`}
                    style={[styles.carChip, merged && styles.carMerged, head && styles.carHeadAlt]}
                  >
                    <Text style={styles.carValue}>{value}</Text>
                    <Text style={styles.carMeta}>{merged ? 'sent' : head ? 'head' : 'queued'}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.railCard}>
        <Text style={styles.cardTitle}>Departure Rail</Text>
        {state.merged.length > 0 ? (
          <View style={styles.carRow}>
            {state.merged.map((entry, index) => (
              <View key={`${entry.source}-${entry.sourceIndex}-${index}`} style={styles.departureChip}>
                <Text style={styles.departureSource}>{sourceBadge(entry.source)}</Text>
                <Text style={styles.departureValue}>{entry.value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No cars coupled yet. The dock tail is waiting for the first smaller live head.</Text>
        )}
      </View>

      <View style={styles.logCard}>
        <Text style={styles.cardTitle}>Dispatcher Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.logRow}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.logText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Compare the two live heads. Couple the smaller one, and do not stitch the remainder until one siding is empty.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Yard Rules</Text>
        <Text style={styles.infoLine}>Couple Left: attach the left siding&apos;s live head car onto the departure tail.</Text>
        <Text style={styles.infoLine}>Couple Right: attach the right siding&apos;s live head car onto the departure tail.</Text>
        <Text style={styles.infoLine}>Latch Remainder: once one siding is empty, stitch the untouched chain onto the tail in one move.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('coupleLeft')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Couple Left</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('coupleRight')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, styles.primaryButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.primaryButtonLabel}>Couple Right</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('latchRemainder')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, styles.stitchButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.stitchButtonLabel}>Latch Remainder</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Yard</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Yard</Text>
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
      title="Mainline"
      emoji="ML"
      subtitle="Merge two sorted sidings into one departure chain"
      objective="Keep one live departure tail. Compare only the two front cars, couple the smaller one, and when one siding clears stitch the untouched remainder in one splice before the budget runs out."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Yard',
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
          'This is the iterative merge-two-sorted-lists loop: compare `list1.val` and `list2.val`, attach the smaller node to `tail.next`, advance that source pointer, move `tail`, and finally stitch `list1 ?? list2` when one side empties.',
        takeaway:
          'Couple Left and Couple Right each map to `tail.next = chosen; chosen = chosen.next; tail = tail.next`. Latch Remainder maps to the final `tail.next = list1 ?? list2` splice.',
      }}
      leetcodeLinks={[
        {
          id: 21,
          title: 'Merge Two Sorted Lists',
          url: 'https://leetcode.com/problems/merge-two-sorted-lists/',
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
    backgroundColor: '#16201d',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2d5e53',
    padding: 16,
    gap: 8,
  },
  titleLabel: {
    color: '#7ad2b8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#f1fff9',
    fontSize: 22,
    fontWeight: '800',
  },
  titleHint: {
    color: '#cce7dd',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#151617',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30343a',
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: '#f2f4f7',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#b8bec7',
    fontSize: 12,
    lineHeight: 18,
  },
  railCard: {
    backgroundColor: '#111315',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f353c',
    padding: 16,
    gap: 12,
  },
  laneGrid: {
    gap: 12,
  },
  laneCard: {
    backgroundColor: '#171b1d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2b3337',
    padding: 12,
    gap: 10,
  },
  laneTitle: {
    color: '#dbe7eb',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  carRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  carChip: {
    minWidth: 62,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#1d2328',
    borderWidth: 1,
    borderColor: '#37404a',
    alignItems: 'center',
    gap: 2,
  },
  carMerged: {
    backgroundColor: '#1b2a1f',
    borderColor: '#3f7d55',
    opacity: 0.65,
  },
  carHead: {
    backgroundColor: '#243546',
    borderColor: '#6b9fd6',
  },
  carHeadAlt: {
    backgroundColor: '#392819',
    borderColor: '#ce8446',
  },
  carValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  carMeta: {
    color: '#d2d9e1',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  departureChip: {
    minWidth: 62,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#1f2b24',
    borderWidth: 1,
    borderColor: '#3f6f59',
    alignItems: 'center',
    gap: 2,
  },
  departureSource: {
    color: '#90e2bf',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  departureValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  logCard: {
    backgroundColor: '#151617',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2d3137',
    padding: 16,
    gap: 12,
  },
  logRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#23262b',
    borderWidth: 1,
    borderColor: '#383d45',
  },
  logText: {
    color: '#ecf0f5',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#c0c7d0',
    fontSize: 14,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#17191c',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#30343b',
    padding: 16,
    gap: 10,
  },
  infoLine: {
    color: '#d4dae2',
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    minWidth: 130,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#44505d',
    backgroundColor: '#20252b',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#f4f7fa',
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#8f5634',
    borderColor: '#d5925a',
  },
  primaryButtonLabel: {
    color: '#fff8ef',
    fontSize: 15,
    fontWeight: '900',
  },
  stitchButton: {
    backgroundColor: '#225448',
    borderColor: '#58b19a',
  },
  stitchButtonLabel: {
    color: '#effff8',
    fontSize: 15,
    fontWeight: '900',
  },
  resetButton: {
    flex: 1,
    minWidth: 130,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#31363d',
    backgroundColor: '#171a1f',
    paddingVertical: 13,
    alignItems: 'center',
  },
  resetButtonLabel: {
    color: '#e5ebf3',
    fontSize: 14,
    fontWeight: '800',
  },
  messageText: {
    color: '#d7dee7',
    fontSize: 14,
    lineHeight: 20,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 22,
  },
  winText: {
    color: '#79d39d',
  },
  lossText: {
    color: '#ff9090',
  },
});
