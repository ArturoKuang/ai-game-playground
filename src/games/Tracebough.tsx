import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentFrame,
  evaluateTracebough,
  frameLabel,
  frameValues,
  generatePuzzle,
  isSeatedNode,
  nextParadeValue,
  remainingRope,
  remainingSeats,
  stackTopFirst,
  treeRows,
  type TraceboughDifficulty,
  type TraceboughState,
} from '../solvers/Tracebough.solver';

const DIFFICULTIES: TraceboughDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: TraceboughDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function nodeLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return '?';
  return `B${value}`;
}

export default function Tracebough() {
  const evaluation = useMemo(() => evaluateTracebough(), []);
  const [difficulty, setDifficulty] = useState<TraceboughDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<TraceboughState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: TraceboughDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (type: 'seat' | 'bank_right_left' | 'bank_left_right' | 'swap_top') => {
    setState((current) => applyMove(current, { type }));
  };

  const frame = currentFrame(state);
  const nextValue = nextParadeValue(state);
  const stack = stackTopFirst(state);
  const rows = useMemo(() => treeRows(state), [state]);
  const currentSpan = new Set(frame ? puzzle.inorder.slice(frame.start, frame.end + 1) : []);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Next Crest</Text>
          <Text style={styles.summaryValue}>{nodeLabel(nextValue)}</Text>
          <Text style={styles.summaryMeta}>{nextValue === null ? 'done' : `${remainingSeats(state)} seats left`}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Rope Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>{`${remainingRope(state)} left`}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Stack</Text>
          <Text style={styles.summaryValue}>{state.pendingChoice ? 'split' : String(state.stack.length)}</Text>
          <Text style={styles.summaryMeta}>{state.pendingChoice ? 'choose order' : `${state.seatedIds.length} seated`}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Parade Ribbon</Text>
        <View style={styles.ribbonWrap}>
          {puzzle.preorder.map((value, index) => {
            const seated = index < state.nextPreorderIndex;
            const active = index === state.nextPreorderIndex;
            return (
              <View
                key={`pre-${value}-${index}`}
                style={[
                  styles.ribbonChip,
                  seated && styles.ribbonChipDone,
                  active && styles.ribbonChipActive,
                ]}
              >
                <Text style={styles.ribbonChipStep}>{`#${index + 1}`}</Text>
                <Text style={styles.ribbonChipValue}>{nodeLabel(value)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Ledger Ribbon</Text>
        <View style={styles.ribbonWrap}>
          {puzzle.inorder.map((value, index) => (
            <View
              key={`in-${value}-${index}`}
              style={[
                styles.ledgerChip,
                currentSpan.has(value) && styles.ledgerChipCurrent,
                state.pendingChoice && styles.ledgerChipChoice,
              ]}
            >
              <Text style={styles.ledgerIndex}>{index}</Text>
              <Text style={styles.ledgerValue}>{nodeLabel(value)}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.helperLine}>
          {state.pendingChoice
            ? `${nodeLabel(state.pendingChoice.rootValue)} split the live plot. Bank the right card first if you want the left plot to stay on top.`
            : frameLabel(puzzle, frame)}
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Work Stack</Text>
        {state.pendingChoice ? (
          <View style={styles.choiceRow}>
            <View style={styles.choiceCard}>
              <Text style={styles.choiceTitle}>Left child card</Text>
              <Text style={styles.choiceBody}>
                {frameValues(puzzle, state.pendingChoice.leftFrame).map(nodeLabel).join(', ')}
              </Text>
            </View>
            <View style={styles.choiceCard}>
              <Text style={styles.choiceTitle}>Right child card</Text>
              <Text style={styles.choiceBody}>
                {frameValues(puzzle, state.pendingChoice.rightFrame).map(nodeLabel).join(', ')}
              </Text>
            </View>
          </View>
        ) : stack.length > 0 ? (
          <View style={styles.stackList}>
            {stack.map((item, index) => (
              <View
                key={item.id}
                style={[styles.stackCard, index === 0 && styles.stackCardTop]}
              >
                <Text style={styles.stackDepth}>{index === 0 ? 'top' : `depth ${index}`}</Text>
                <Text style={styles.stackBody}>{frameValues(puzzle, item).map(nodeLabel).join(', ')}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No work cards remain. Seat the last crest to finish the grove.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Assembly Grove</Text>
        <View style={styles.treeStack}>
          {rows.map((row, depth) => (
            <View key={`depth-${depth}`} style={styles.treeRow}>
              {row.map((nodeId, index) => {
                if (nodeId === null) {
                  return <View key={`empty-${depth}-${index}`} style={styles.nodeSlot} />;
                }

                const node = puzzle.nodes[nodeId];
                const seated = isSeatedNode(state, nodeId);
                return (
                  <View
                    key={`node-${nodeId}`}
                    style={[
                      styles.nodeSlot,
                      styles.nodeCard,
                      seated ? styles.nodeCardSeated : styles.nodeCardHidden,
                    ]}
                  >
                    <Text style={styles.nodeLabel}>{seated ? nodeLabel(node.value) : '?'}</Text>
                    <Text style={styles.nodeMeta}>{seated ? 'seated' : `i${node.inorderIndex}`}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Route Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.historyWrap}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.historyChip}>
                <Text style={styles.historyText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No moves yet. The next parade crest always roots the live ledger plot.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Trace Rules</Text>
        <Text style={styles.infoLine}>Seat Root uses the next parade crest on the top ledger plot.</Text>
        <Text style={styles.infoLine}>If that plot splits in two, bank the child cards onto the work stack before continuing.</Text>
        <Text style={styles.infoLine}>Swap Top Pair rescues a bad banking order, but it still spends rope.</Text>
        <Text style={styles.infoLine}>Win by seating every crest before the rope budget runs out.</Text>
      </View>

      <View style={styles.actionGrid}>
        <Pressable
          onPress={() => runMove('seat')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, styles.primaryButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.primaryButtonLabel}>Seat Root</Text>
        </Pressable>

        <Pressable
          onPress={() => runMove('bank_right_left')}
          disabled={Boolean(state.verdict) || !state.pendingChoice}
          style={[
            styles.controlButton,
            styles.secondaryButton,
            (state.verdict || !state.pendingChoice) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>Bank Right Then Left</Text>
        </Pressable>

        <Pressable
          onPress={() => runMove('bank_left_right')}
          disabled={Boolean(state.verdict) || !state.pendingChoice}
          style={[
            styles.controlButton,
            styles.secondaryButton,
            (state.verdict || !state.pendingChoice) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>Bank Left Then Right</Text>
        </Pressable>

        <Pressable
          onPress={() => runMove('swap_top')}
          disabled={Boolean(state.verdict) || state.pendingChoice === null && state.stack.length < 2}
          style={[
            styles.controlButton,
            styles.secondaryButton,
            (state.verdict || (state.pendingChoice === null && state.stack.length < 2)) &&
              styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>Swap Top Pair</Text>
        </Pressable>
      </View>

      <View style={styles.metricCard}>
        <Text style={styles.cardTitle}>Measured Loop</Text>
        <Text style={styles.metricLine}>
          {`Best-alt gap ${(evaluation.learningMetrics.bestAlternativeGap * 100).toFixed(1)}%, invariant pressure ${(evaluation.learningMetrics.invariantPressure * 100).toFixed(1)}%, breakpoint ${evaluation.learningMetrics.difficultyBreakpoint}.`}
        </Text>
        <Text style={styles.metricLine}>{evaluation.interpretation.strongestAlternative}</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusText}>{state.message}</Text>
        {state.verdict ? (
          <Text style={[styles.statusVerdict, state.verdict.correct ? styles.statusWin : styles.statusLose]}>
            {state.verdict.label}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <GameScreenTemplate
      title="Tracebough"
      emoji="TB"
      subtitle={puzzle.title}
      objective="Rebuild the grove from two trace ribbons by seating each next parade crest into the live ledger plot."
      statsLabel={`${puzzle.label}  Rope ${puzzle.budget}`}
      actions={[
        { label: 'Reset Grove', onPress: () => resetPuzzle() },
        { label: 'New Grove', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((level) => ({
        label: `D${level}`,
        selected: difficulty === level,
        onPress: () => switchDifficulty(level),
      }))}
      helperText={puzzle.helper}
      board={board}
      controls={controls}
      conceptBridge={{
        title: 'Traversal Reconstruction',
        summary:
          'The next preorder crest always becomes the root of the current inorder plot. Finding that crest in the ledger tells you exactly how many nodes belong to the left subtree and right subtree.',
        takeaway:
          'When a split creates both child plots, bank the right plot first so the left plot stays on top of the work stack for the next preorder crest.',
      }}
      leetcodeLinks={[
        {
          id: 105,
          title: 'Construct Binary Tree from Preorder and Inorder Traversal',
          url: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#191c21',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#8aa1b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: '#f2f4f8',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#9eb0c0',
    fontSize: 12,
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#171a1f',
    padding: 14,
    gap: 10,
  },
  ribbonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ribbonChip: {
    minWidth: 60,
    borderRadius: 12,
    backgroundColor: '#222833',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  ribbonChipDone: {
    backgroundColor: '#1e3a33',
  },
  ribbonChipActive: {
    backgroundColor: '#4f3321',
  },
  ribbonChipStep: {
    color: '#88a0b8',
    fontSize: 11,
    fontWeight: '700',
  },
  ribbonChipValue: {
    color: '#f4f6fb',
    fontSize: 16,
    fontWeight: '800',
  },
  ledgerChip: {
    borderRadius: 12,
    backgroundColor: '#212630',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 56,
  },
  ledgerChipCurrent: {
    backgroundColor: '#2f3f58',
  },
  ledgerChipChoice: {
    borderWidth: 1,
    borderColor: '#7a91ab',
  },
  ledgerIndex: {
    color: '#94a7bb',
    fontSize: 11,
    fontWeight: '700',
  },
  ledgerValue: {
    color: '#f2f4f8',
    fontSize: 16,
    fontWeight: '800',
  },
  helperLine: {
    color: '#cad5df',
    fontSize: 13,
    lineHeight: 18,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  choiceCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#232934',
    padding: 12,
    gap: 6,
  },
  choiceTitle: {
    color: '#8ba0b5',
    fontSize: 12,
    fontWeight: '700',
  },
  choiceBody: {
    color: '#f1f3f7',
    fontSize: 15,
    fontWeight: '700',
  },
  stackList: {
    gap: 8,
  },
  stackCard: {
    borderRadius: 14,
    backgroundColor: '#242a34',
    padding: 12,
    gap: 4,
  },
  stackCardTop: {
    backgroundColor: '#334258',
  },
  stackDepth: {
    color: '#8ea4bb',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stackBody: {
    color: '#f2f4f8',
    fontSize: 15,
    fontWeight: '700',
  },
  treeStack: {
    gap: 10,
  },
  treeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  nodeSlot: {
    minWidth: 48,
  },
  nodeCard: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  nodeCardHidden: {
    backgroundColor: '#212630',
  },
  nodeCardSeated: {
    backgroundColor: '#284037',
  },
  nodeLabel: {
    color: '#f4f6fb',
    fontSize: 14,
    fontWeight: '800',
  },
  nodeMeta: {
    color: '#9cb0c3',
    fontSize: 10,
    fontWeight: '700',
  },
  historyWrap: {
    gap: 6,
  },
  historyChip: {
    borderRadius: 12,
    backgroundColor: '#232934',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  historyText: {
    color: '#d9e0e7',
    fontSize: 12,
    lineHeight: 17,
  },
  emptyText: {
    color: '#a4b2bf',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#171b21',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#d2d9e0',
    fontSize: 13,
    lineHeight: 18,
  },
  actionGrid: {
    gap: 10,
  },
  controlButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  primaryButton: {
    backgroundColor: '#d67634',
  },
  secondaryButton: {
    backgroundColor: '#25313f',
  },
  primaryButtonLabel: {
    color: '#131517',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButtonLabel: {
    color: '#eef2f6',
    fontSize: 14,
    fontWeight: '700',
  },
  metricCard: {
    borderRadius: 16,
    backgroundColor: '#181d23',
    padding: 14,
    gap: 8,
  },
  metricLine: {
    color: '#d4dce4',
    fontSize: 13,
    lineHeight: 18,
  },
  statusCard: {
    borderRadius: 16,
    backgroundColor: '#11151a',
    padding: 14,
    gap: 8,
  },
  statusText: {
    color: '#eff3f7',
    fontSize: 14,
    lineHeight: 19,
  },
  statusVerdict: {
    fontSize: 14,
    fontWeight: '800',
  },
  statusWin: {
    color: '#86dfa8',
  },
  statusLose: {
    color: '#ff988f',
  },
});
