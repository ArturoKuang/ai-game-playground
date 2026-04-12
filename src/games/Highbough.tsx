import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentNode,
  currentReadings,
  generatePuzzle,
  remainingSeals,
  treeRows,
  type HighboughDifficulty,
  type HighboughState,
} from '../solvers/Highbough.solver';

const DIFFICULTIES: HighboughDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: HighboughDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function readingText(value: number | null) {
  if (value === null) return '?';
  return String(value);
}

export default function Highbough() {
  const [difficulty, setDifficulty] = useState<HighboughDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<HighboughState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: HighboughDifficulty) => {
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
  const crownHeight = state.certifiedHeights[puzzle.rootId];

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Focus Branch</Text>
          <Text style={styles.summaryValue}>{activeNode.label}</Text>
          <Text style={styles.summaryMeta}>
            {activeNode.leftId === null && activeNode.rightId === null ? 'leaf' : 'branch'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Climb Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>steps used</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Crown Height</Text>
          <Text style={styles.summaryValue}>{readingText(crownHeight)}</Text>
          <Text style={styles.summaryMeta}>{`target ${puzzle.targetHeight}`}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Current Reading</Text>
        <View style={styles.readingRow}>
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>Left</Text>
            <Text style={styles.readingValue}>
              {readings.leftId === null ? '0' : readingText(readings.leftHeight)}
            </Text>
            <Text style={styles.readingMeta}>
              {readings.leftId === null ? 'no branch' : puzzle.nodes[readings.leftId].label}
            </Text>
          </View>
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>Seal Here</Text>
            <Text style={styles.readingValue}>
              {readings.currentHeight !== null
                ? readingText(readings.currentHeight)
                : readings.canCertify
                  ? readingText(readings.certifiableHeight)
                  : '?'}
            </Text>
            <Text style={styles.readingMeta}>
              {readings.currentHeight !== null
                ? 'already sealed'
                : readings.canCertify
                  ? 'larger child + 1'
                  : 'wait for children'}
            </Text>
          </View>
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>Right</Text>
            <Text style={styles.readingValue}>
              {readings.rightId === null ? '0' : readingText(readings.rightHeight)}
            </Text>
            <Text style={styles.readingMeta}>
              {readings.rightId === null ? 'no branch' : puzzle.nodes[readings.rightId].label}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Height Map</Text>
        <View style={styles.treeStack}>
          {rows.map((row, depth) => (
            <View key={`depth-${depth}`} style={styles.treeRow}>
              {row.map((nodeId, column) => {
                if (nodeId === null) {
                  return <View key={`empty-${depth}-${column}`} style={styles.nodeSlot} />;
                }

                const node = puzzle.nodes[nodeId];
                const active = nodeId === state.currentId;
                const sealedHeight = state.certifiedHeights[nodeId];
                const leaf = node.leftId === null && node.rightId === null;

                return (
                  <View
                    key={`node-${nodeId}`}
                    style={[
                      styles.nodeSlot,
                      styles.nodeCard,
                      active && styles.nodeCardActive,
                      sealedHeight !== null && styles.nodeCardSealed,
                      leaf && styles.nodeCardLeaf,
                    ]}
                  >
                    <Text style={styles.nodeLabel}>{node.label}</Text>
                    <Text style={styles.nodeMeta}>{sealedHeight === null ? '?' : `h=${sealedHeight}`}</Text>
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
            No moves yet. Seal the leaves first, then bubble the larger child height upward one branch at a time.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Gauge Rules</Text>
        <Text style={styles.infoLine}>A leaf seals at height 1.</Text>
        <Text style={styles.infoLine}>A branch can seal only after every existing child branch below it is already sealed.</Text>
        <Text style={styles.infoLine}>When a branch seals, it keeps the larger child reading plus one.</Text>
        <Text style={styles.infoLine}>You win when the crown branch is sealed before the climb budget runs out.</Text>
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
            {readings.currentHeight !== null ? 'Read Seal' : 'Certify Height'}
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
      title="Highbough"
      emoji="HB"
      subtitle="Measure a living canopy from the leaves upward until the crown branch knows its true height."
      objective="Seal the crown branch with the correct maximum depth before the climb budget runs out."
      statsLabel={`${puzzle.label} • ${puzzle.title}`}
      actions={[
        { label: 'Reset Canopy', onPress: () => resetPuzzle() },
        { label: 'New Canopy', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((value) => ({
        label: `D${value}`,
        selected: value === difficulty,
        onPress: () => switchDifficulty(value),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        title: 'What this teaches',
        summary:
          'The efficient route is the recursive maximum-depth routine: compute the left subtree height, compute the right subtree height, keep the larger one, and add one for the current node.',
        takeaway:
          'The moment where a branch refuses to seal until its child readings exist maps to `return 1 + Math.max(depth(left), depth(right))`, with missing children contributing 0.',
      }}
      leetcodeLinks={[
        {
          id: 104,
          title: 'Maximum Depth of Binary Tree',
          url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/',
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
    backgroundColor: '#182329',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#30424a',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#a9c3ca',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#f2fafc',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#c6d9de',
    fontSize: 12,
    lineHeight: 17,
  },
  sectionCard: {
    backgroundColor: '#162028',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d414a',
    padding: 14,
    gap: 10,
  },
  readingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  readingCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#10181e',
    borderWidth: 1,
    borderColor: '#2a3b42',
    padding: 10,
    gap: 4,
  },
  readingLabel: {
    color: '#92b3bc',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  readingValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  readingMeta: {
    color: '#b8d0d7',
    fontSize: 11,
    lineHeight: 15,
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
    width: 64,
    minHeight: 60,
  },
  nodeCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0e1419',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27363d',
    paddingVertical: 8,
    gap: 4,
  },
  nodeCardActive: {
    borderColor: '#f3c96a',
    backgroundColor: '#342c16',
  },
  nodeCardSealed: {
    borderColor: '#58b18e',
    backgroundColor: '#11281f',
  },
  nodeCardLeaf: {
    backgroundColor: '#132126',
  },
  nodeLabel: {
    color: '#f5fbfd',
    fontSize: 18,
    fontWeight: '800',
  },
  nodeMeta: {
    color: '#d0e2e8',
    fontSize: 11,
    fontWeight: '600',
  },
  historyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#0f171c',
    borderWidth: 1,
    borderColor: '#2a3c43',
  },
  historyText: {
    color: '#d7e7ec',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#bfd3d8',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 14,
    backgroundColor: '#121b21',
    borderWidth: 1,
    borderColor: '#2a3a42',
    padding: 12,
    gap: 6,
  },
  infoLine: {
    color: '#d2e1e6',
    fontSize: 13,
    lineHeight: 18,
  },
  exitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exitCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#0f171c',
    borderWidth: 1,
    borderColor: '#2a3c43',
    padding: 10,
    gap: 4,
  },
  exitLabel: {
    color: '#90afb8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  exitValue: {
    color: '#f4fafb',
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3c515a',
    backgroundColor: '#182229',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#eef7f9',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#d3b160',
    borderColor: '#f0d484',
  },
  primaryButtonLabel: {
    color: '#2d2205',
    fontSize: 15,
    fontWeight: '800',
  },
});
