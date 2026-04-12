import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentNode,
  currentReadings,
  evaluateSpanbough,
  generatePuzzle,
  remainingSeals,
  treeRows,
  type SpanboughDifficulty,
  type SpanboughState,
} from '../solvers/Spanbough.solver';

const DIFFICULTIES: SpanboughDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: SpanboughDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function signed(value: number | null) {
  if (value === null) return '?';
  return value > 0 ? `+${value}` : String(value);
}

function contribution(value: number | null) {
  if (value === null) return '?';
  return value > 0 ? `use ${value}` : 'use 0';
}

export default function Spanbough() {
  const evaluation = useMemo(() => evaluateSpanbough(), []);
  const [difficulty, setDifficulty] = useState<SpanboughDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<SpanboughState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: SpanboughDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'certify' | 'left' | 'right' | 'up') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const rows = useMemo(() => treeRows(state), [state]);
  const activeNode = currentNode(state);
  const readings = currentReadings(state);
  const sealsLeft = remainingSeals(state);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Focus Branch</Text>
          <Text style={styles.summaryValue}>{activeNode.label}</Text>
          <Text style={styles.summaryMeta}>{signed(activeNode.value)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Climb Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>steps used</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Best Span</Text>
          <Text style={styles.summaryValue}>{signed(state.bestSpan)}</Text>
          <Text style={styles.summaryMeta}>{`target ${puzzle.targetBestSpan}`}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Current Readings</Text>
        <View style={styles.readingGrid}>
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>Left Route</Text>
            <Text style={styles.readingValue}>
              {readings.leftId === null ? '0' : signed(readings.leftCarry)}
            </Text>
            <Text style={styles.readingMeta}>
              {readings.leftId === null ? 'no branch' : contribution(readings.leftContribution)}
            </Text>
          </View>
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>Carry Up</Text>
            <Text style={styles.readingValue}>
              {readings.currentCarry !== null
                ? signed(readings.currentCarry)
                : readings.canCertify
                  ? signed(readings.nextCarry)
                  : '?'}
            </Text>
            <Text style={styles.readingMeta}>
              {readings.currentCarry !== null
                ? 'sealed'
                : readings.canCertify
                  ? 'best child or zero'
                  : 'wait for children'}
            </Text>
          </View>
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>Right Route</Text>
            <Text style={styles.readingValue}>
              {readings.rightId === null ? '0' : signed(readings.rightCarry)}
            </Text>
            <Text style={styles.readingMeta}>
              {readings.rightId === null ? 'no branch' : contribution(readings.rightContribution)}
            </Text>
          </View>
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>Span Here</Text>
            <Text style={styles.readingValue}>
              {readings.localSpan !== null ? signed(readings.localSpan) : '?'}
            </Text>
            <Text style={styles.readingMeta}>both helpful sides may count here</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Canopy Map</Text>
        <View style={styles.treeStack}>
          {rows.map((row, depth) => (
            <View key={`depth-${depth}`} style={styles.treeRow}>
              {row.map((nodeId, column) => {
                if (nodeId === null) {
                  return <View key={`empty-${depth}-${column}`} style={styles.nodeSlot} />;
                }

                const node = puzzle.nodes[nodeId];
                const active = nodeId === state.currentId;
                const sealedCarry = state.certifiedCarry[nodeId];
                const leaf = node.leftId === null && node.rightId === null;

                return (
                  <View
                    key={`node-${nodeId}`}
                    style={[
                      styles.nodeSlot,
                      styles.nodeCard,
                      active && styles.nodeCardActive,
                      sealedCarry !== null && styles.nodeCardSealed,
                      leaf && styles.nodeCardLeaf,
                    ]}
                  >
                    <Text style={styles.nodeLabel}>{node.label}</Text>
                    <Text style={styles.nodeValue}>{signed(node.value)}</Text>
                    <Text style={styles.nodeMeta}>{sealedCarry === null ? 'up ?' : `up ${signed(sealedCarry)}`}</Text>
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
            No moves yet. A branch may send only one helpful child route upward, but the best full span can bend anywhere.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Span Rules</Text>
        <Text style={styles.infoLine}>A leaf sends its own value upward.</Text>
        <Text style={styles.infoLine}>A branch can seal only after every existing child branch below it is already sealed.</Text>
        <Text style={styles.infoLine}>When a branch seals, it sends up its value plus the better of the left route, right route, or zero.</Text>
        <Text style={styles.infoLine}>The local span may use both helpful child routes, and the best span can live below the crown.</Text>
      </View>

      <View style={styles.exitRow}>
        <View style={styles.exitCard}>
          <Text style={styles.exitLabel}>Left Exit</Text>
          <Text style={styles.exitValue}>
            {readings.leftId === null ? 'none' : puzzle.nodes[readings.leftId].label}
          </Text>
        </View>
        <View style={styles.exitCard}>
          <Text style={styles.exitLabel}>Up</Text>
          <Text style={styles.exitValue}>
            {readings.parentId === null ? 'crown' : puzzle.nodes[readings.parentId].label}
          </Text>
        </View>
        <View style={styles.exitCard}>
          <Text style={styles.exitLabel}>Right Exit</Text>
          <Text style={styles.exitValue}>
            {readings.rightId === null ? 'none' : puzzle.nodes[readings.rightId].label}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('certify')}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            styles.primaryButton,
            state.verdict && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {readings.currentCarry !== null ? 'Read Seal' : 'Certify Span'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('left')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Go Left</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('up')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Climb Up</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('right')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Go Right</Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Seals Left</Text>
        <Text style={styles.summaryValue}>{sealsLeft}</Text>
        <Text style={styles.summaryMeta}>{state.verdict?.label ?? state.message}</Text>
      </View>
    </View>
  );

  return (
    <GameScreenTemplate
      title="Spanbough"
      emoji="SP"
      subtitle="A branch may carry only one child route upward, but the winning span can bend anywhere in the tree."
      objective="Certify the whole canopy before the climb budget runs out and keep the highest route total seen anywhere."
      statsLabel={`${evaluation.learningMetrics.difficultyBreakpoint} breakpoint`}
      actions={[
        { label: 'Reset Grove', onPress: () => resetPuzzle(), tone: 'neutral' },
        { label: 'New Grove', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((value) => ({
        label: `D${value}`,
        selected: difficulty === value,
        onPress: () => switchDifficulty(value),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        summary:
          'This teaches the split between the one-sided gain each subtree can return upward and the separate best complete path that can bend at any branch.',
        takeaway:
          'In code, that is the difference between returning `node.val + max(0, leftGain, rightGain)` and updating a global answer with `node.val + max(0, leftGain) + max(0, rightGain)`.',
      }}
      leetcodeLinks={[
        {
          id: 124,
          title: 'Binary Tree Maximum Path Sum',
          url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/',
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
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#161a20',
    borderWidth: 1,
    borderColor: '#2d3748',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#8ea0b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#131720',
    borderWidth: 1,
    borderColor: '#253041',
    padding: 14,
    gap: 12,
  },
  readingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  readingCard: {
    minWidth: 132,
    flexGrow: 1,
    borderRadius: 14,
    backgroundColor: '#1a2230',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    gap: 4,
  },
  readingLabel: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
  },
  readingValue: {
    color: '#f8fafc',
    fontSize: 21,
    fontWeight: '800',
  },
  readingMeta: {
    color: '#a8b3c7',
    fontSize: 12,
    lineHeight: 16,
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
    width: 76,
    minHeight: 74,
  },
  nodeCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#18202c',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 2,
  },
  nodeCardActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#2a1d0b',
  },
  nodeCardSealed: {
    borderColor: '#22c55e',
    backgroundColor: '#0f2419',
  },
  nodeCardLeaf: {
    shadowColor: '#94a3b8',
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  nodeLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
  },
  nodeValue: {
    color: '#fde68a',
    fontSize: 14,
    fontWeight: '700',
  },
  nodeMeta: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  historyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    borderRadius: 999,
    backgroundColor: '#1b2330',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyText: {
    color: '#dbe7f5',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#a8b3c7',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 18,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#243041',
    padding: 14,
    gap: 6,
  },
  infoLine: {
    color: '#d6dfed',
    fontSize: 13,
    lineHeight: 18,
  },
  exitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exitCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#141c28',
    borderWidth: 1,
    borderColor: '#2f3d4f',
    padding: 12,
    gap: 4,
  },
  exitLabel: {
    color: '#8ea0b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  exitValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#1b2430',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: '#14532d',
    borderColor: '#22c55e',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#ecfdf5',
    fontSize: 15,
    fontWeight: '800',
  },
});
