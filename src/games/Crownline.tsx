import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  generatePuzzle,
  type CrownlineDifficulty,
  type CrownlineHeapNode,
  type CrownlineState,
} from '../solvers/Crownline.solver';

const DIFFICULTIES: CrownlineDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: CrownlineDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function laneTag(laneIndex: number) {
  return `L${laneIndex + 1}`;
}

function nodeTitle(node: CrownlineHeapNode | null) {
  if (!node) return 'Open';
  return `${laneTag(node.laneIndex)}:${node.value}`;
}

function nodeMeta(node: CrownlineHeapNode | null) {
  if (!node) return 'empty';
  return `head ${node.lanePosition + 1}`;
}

function heapRows(heap: CrownlineHeapNode[]) {
  return [
    [heap[0] ?? null],
    [heap[1] ?? null, heap[2] ?? null],
    [heap[3] ?? null, heap[4] ?? null, heap[5] ?? null, heap[6] ?? null],
  ];
}

export default function Crownline() {
  const [difficulty, setDifficulty] = useState<CrownlineDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<CrownlineState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: CrownlineDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'dispatchCrown' | 'swapLeft' | 'swapRight') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const crownNode = state.heap[0] ?? null;
  const repairNode = state.repairIndex === null ? null : state.heap[state.repairIndex] ?? null;
  const crownRows = useMemo(() => heapRows(state.heap), [state.heap]);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Crown</Text>
          <Text style={styles.summaryValue}>{nodeTitle(crownNode)}</Text>
          <Text style={styles.summaryMeta}>{nodeMeta(crownNode)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Repair Slot</Text>
          <Text style={styles.summaryValue}>{repairNode ? `${state.repairIndex! + 1}` : 'Ready'}</Text>
          <Text style={styles.summaryMeta}>
            {repairNode ? `${laneTag(repairNode.laneIndex)}:${repairNode.value}` : 'Ladder ordered'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Horn Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>crown moves used</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Merged Rail</Text>
          <Text style={styles.summaryValue}>{state.merged.length}</Text>
          <Text style={styles.summaryMeta}>cars sent</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Live Lanes</Text>
          <Text style={styles.summaryValue}>{state.heap.length}</Text>
          <Text style={styles.summaryMeta}>heads still on ladder</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Sorted Sidings</Text>
        <View style={styles.laneStack}>
          {puzzle.lanes.map((lane, laneIndex) => {
            const nextPosition = state.nextPositions[laneIndex];
            return (
              <View key={`lane-${laneIndex}`} style={styles.laneCard}>
                <Text style={styles.laneTitle}>{laneTag(laneIndex)}</Text>
                <View style={styles.chipRow}>
                  {lane.map((value, lanePosition) => {
                    const sent = state.merged.some(
                      (node) =>
                        node.laneIndex === laneIndex && node.lanePosition === lanePosition,
                    );
                    const live = state.heap.some(
                      (node) =>
                        node.laneIndex === laneIndex && node.lanePosition === lanePosition,
                    );
                    const next = !sent && !live && lanePosition === nextPosition;
                    return (
                      <View
                        key={`${laneIndex}-${lanePosition}`}
                        style={[
                          styles.valueChip,
                          sent && styles.sentChip,
                          live && styles.liveChip,
                          next && styles.nextChip,
                        ]}
                      >
                        <Text style={styles.valueText}>{value}</Text>
                        <Text style={styles.valueMeta}>
                          {sent ? 'sent' : live ? 'head' : next ? 'next' : 'queued'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Crown Ladder</Text>
        <View style={styles.heapStack}>
          {crownRows.map((row, rowIndex) => (
            <View key={`heap-row-${rowIndex}`} style={styles.heapRow}>
              {row.map((node, columnIndex) => {
                const flatIndex = (1 << rowIndex) - 1 + columnIndex;
                const highlighted = flatIndex === state.repairIndex;
                const crowned = flatIndex === 0 && node;
                return (
                  <View
                    key={`heap-slot-${flatIndex}`}
                    style={[
                      styles.heapCard,
                      !node && styles.heapCardEmpty,
                      highlighted && styles.heapCardRepair,
                      crowned && styles.heapCardRoot,
                    ]}
                  >
                    <Text style={styles.heapSlot}>Slot {flatIndex + 1}</Text>
                    <Text style={styles.heapValue}>{nodeTitle(node)}</Text>
                    <Text style={styles.heapMeta}>{nodeMeta(node)}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Outbound Rail</Text>
        {state.merged.length > 0 ? (
          <View style={styles.chipRow}>
            {state.merged.map((node, index) => (
              <View key={`merged-${index}`} style={styles.mergeChip}>
                <Text style={styles.mergeSource}>{laneTag(node.laneIndex)}</Text>
                <Text style={styles.mergeValue}>{node.value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No cars dispatched yet. The clean route is always to send the crowned smallest live head.
          </Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Crew Log</Text>
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
            No moves yet. Dispatch the crown only when the ladder is ordered, then repair from the marked slot.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Yard Rules</Text>
        <Text style={styles.infoLine}>Dispatch Crown: send the crowned smallest live head onto the merged rail.</Text>
        <Text style={styles.infoLine}>Swap Left: trade the marked repair slot with its lower left child.</Text>
        <Text style={styles.infoLine}>Swap Right: trade the marked repair slot with its lower right child.</Text>
        <Text style={styles.infoLine}>Only one live head from each non-empty lane belongs on the ladder at a time.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('dispatchCrown')}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            styles.primaryButton,
            state.verdict && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Dispatch Crown</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('swapLeft')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Swap Left</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('swapRight')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Swap Right</Text>
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
      title="Crownline"
      emoji="CR"
      subtitle="Keep one live head from every siding on the crown ladder, dispatch the crowned smallest car, and repair the ladder with the lower child before the merger horn."
      objective="Assemble one outbound rail from several already-sorted sidings before the horn budget runs out."
      statsLabel={`${puzzle.label} • ${puzzle.budget} moves`}
      actions={[
        { label: 'Reset Yard', onPress: () => resetPuzzle() },
        { label: 'New Yard', onPress: rerollPuzzle, tone: 'primary' },
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
          'Crownline teaches the heap-backed k-way merge loop for Merge k Sorted Lists: keep one live head from each non-empty list in a min-heap, pop the smallest, append it to the output tail, and push only the next node from the list that just popped.',
        takeaway:
          'The crown ladder is the heap, Dispatch Crown is heap-pop plus append-to-tail, and the refill from the same lane is the push of the next node from that list.',
      }}
      leetcodeLinks={[
        {
          id: 23,
          title: 'Merge k Sorted Lists',
          url: 'https://leetcode.com/problems/merge-k-sorted-lists/',
        },
        {
          id: 295,
          title: 'Find Median from Data Stream',
          url: 'https://leetcode.com/problems/find-median-from-data-stream/',
        },
      ]}
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
    backgroundColor: '#131c22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#315166',
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: '#9fc0d1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#f4fbff',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#bdd5e2',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#11181d',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#243843',
    padding: 16,
    gap: 12,
  },
  laneStack: {
    gap: 12,
  },
  laneCard: {
    gap: 8,
  },
  laneTitle: {
    color: '#f4fbff',
    fontSize: 15,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  valueChip: {
    minWidth: 58,
    backgroundColor: '#1b262e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334c59',
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: 'center',
    gap: 2,
  },
  sentChip: {
    backgroundColor: '#17311e',
    borderColor: '#356746',
  },
  liveChip: {
    backgroundColor: '#122f3d',
    borderColor: '#4a9ec0',
  },
  nextChip: {
    backgroundColor: '#2a2016',
    borderColor: '#8f6a43',
  },
  valueText: {
    color: '#f4fbff',
    fontSize: 16,
    fontWeight: '800',
  },
  valueMeta: {
    color: '#a7c0ce',
    fontSize: 11,
  },
  heapStack: {
    gap: 10,
  },
  heapRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  heapCard: {
    width: 96,
    backgroundColor: '#162127',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#39505d',
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  heapCardEmpty: {
    opacity: 0.4,
  },
  heapCardRepair: {
    borderColor: '#d98d2b',
    backgroundColor: '#2d2112',
  },
  heapCardRoot: {
    borderColor: '#58badc',
    backgroundColor: '#112d37',
  },
  heapSlot: {
    color: '#8eb4c6',
    fontSize: 11,
    fontWeight: '700',
  },
  heapValue: {
    color: '#f4fbff',
    fontSize: 16,
    fontWeight: '800',
  },
  heapMeta: {
    color: '#adc5d1',
    fontSize: 11,
  },
  mergeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#14272f',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3e697a',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mergeSource: {
    color: '#78c7e5',
    fontSize: 11,
    fontWeight: '800',
  },
  mergeValue: {
    color: '#f4fbff',
    fontSize: 15,
    fontWeight: '800',
  },
  logChip: {
    backgroundColor: '#202c33',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#405964',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  logText: {
    color: '#d6e5ed',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#b5c9d4',
    fontSize: 13,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#121c22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#31424d',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#d4e1e8',
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
    borderColor: '#45616f',
    backgroundColor: '#172228',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#1e667c',
    borderColor: '#57b9d9',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#ebf4f8',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#f8fdff',
    fontSize: 14,
    fontWeight: '800',
  },
  resetButton: {
    flex: 1,
    minWidth: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#405964',
    backgroundColor: '#1a252b',
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonLabel: {
    color: '#deebf2',
    fontSize: 14,
    fontWeight: '700',
  },
  messageText: {
    color: '#d8e8ef',
    fontSize: 13,
    lineHeight: 20,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#79d889',
  },
  lossText: {
    color: '#ff8d8d',
  },
});
