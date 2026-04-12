import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentExits,
  currentNode,
  generatePuzzle,
  leafRibbon,
  remainingHubs,
  treeRows,
  type BoughturnDifficulty,
  type BoughturnState,
} from '../solvers/Boughturn.solver';

const DIFFICULTIES: BoughturnDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: BoughturnDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Boughturn() {
  const [difficulty, setDifficulty] = useState<BoughturnDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<BoughturnState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: BoughturnDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'mirror' | 'left' | 'right' | 'up') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const rows = useMemo(() => treeRows(state), [state]);
  const activeNode = currentNode(state);
  const exits = currentExits(state);
  const ribbon = leafRibbon(state);
  const hubsLeft = remainingHubs(state);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Focus Hub</Text>
          <Text style={styles.summaryValue}>{activeNode.label}</Text>
          <Text style={styles.summaryMeta}>
            {activeNode.leftId === null && activeNode.rightId === null ? 'leaf charm' : state.mirrored[activeNode.id] ? 'mirrored' : 'unmirrored'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Lantern Oil</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>steps used</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Hubs Left</Text>
          <Text style={styles.summaryValue}>{hubsLeft}</Text>
          <Text style={styles.summaryMeta}>branch hubs to mirror</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Leaf Ribbon</Text>
        <View style={styles.ribbonBlock}>
          <View style={styles.ribbonRow}>
            <Text style={styles.ribbonLabel}>Current</Text>
            <Text style={styles.ribbonValue}>{ribbon.join('  ')}</Text>
          </View>
          <View style={styles.ribbonRow}>
            <Text style={styles.ribbonLabel}>Target</Text>
            <Text style={styles.ribbonValue}>{puzzle.targetLeafRibbon.join('  ')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Mirror Canopy</Text>
        <View style={styles.treeStack}>
          {rows.map((row, depth) => (
            <View key={`depth-${depth}`} style={styles.treeRow}>
              {row.map((nodeId, column) => {
                if (nodeId === null) {
                  return <View key={`empty-${depth}-${column}`} style={styles.nodeSlot} />;
                }

                const node = puzzle.nodes[nodeId];
                const active = nodeId === state.currentId;
                const mirrored = state.mirrored[nodeId];
                const leaf = node.leftId === null && node.rightId === null;

                return (
                  <View
                    key={`node-${nodeId}`}
                    style={[
                      styles.nodeSlot,
                      styles.nodeCard,
                      active && styles.nodeCardActive,
                      mirrored && styles.nodeCardMirrored,
                      leaf && styles.nodeCardLeaf,
                    ]}
                  >
                    <Text style={styles.nodeLabel}>{node.label}</Text>
                    <Text style={styles.nodeMeta}>
                      {leaf ? node.leafToken : mirrored ? 'mirrored' : 'branch'}
                    </Text>
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
            No moves yet. Mirror the crown hub first, then stay inside one child branch until it is done before crossing.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Climber Rules</Text>
        <Text style={styles.infoLine}>Mirror Branch swaps the two child boughs under your current hub.</Text>
        <Text style={styles.infoLine}>Left and Right follow the current bough layout after any swap.</Text>
        <Text style={styles.infoLine}>Climb Up returns to the parent hub.</Text>
        <Text style={styles.infoLine}>Every branching hub must end mirrored before the lantern oil runs out.</Text>
      </View>

      <View style={styles.exitRow}>
        <View style={styles.exitCard}>
          <Text style={styles.exitLabel}>Left Exit</Text>
          <Text style={styles.exitValue}>{exits.leftId === null ? 'none' : puzzle.nodes[exits.leftId].label}</Text>
        </View>
        <View style={styles.exitCard}>
          <Text style={styles.exitLabel}>Up</Text>
          <Text style={styles.exitValue}>{exits.parentId === null ? 'root' : puzzle.nodes[exits.parentId].label}</Text>
        </View>
        <View style={styles.exitCard}>
          <Text style={styles.exitLabel}>Right Exit</Text>
          <Text style={styles.exitValue}>{exits.rightId === null ? 'none' : puzzle.nodes[exits.rightId].label}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('mirror')}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            styles.primaryButton,
            state.verdict && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {activeNode.leftId === null && activeNode.rightId === null
              ? 'Tap Leaf'
              : state.mirrored[activeNode.id]
                ? 'Restore Branch'
                : 'Mirror Branch'}
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

      <View style={styles.statusCard}>
        <Text style={styles.statusText}>{state.verdict?.label ?? state.message}</Text>
      </View>
    </View>
  );

  return (
    <GameScreenTemplate
      title="Boughturn"
      emoji="BT"
      subtitle="Mirror each branch hub once, and make the whole canopy swing into its reflected shape."
      objective="Finish with every branching hub mirrored before the lantern oil runs out."
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
          'The efficient route is the recursive tree ritual for inversion: swap the current node’s left and right children, then fully clear one child subtree before crossing to the sibling subtree.',
        takeaway:
          'The moment where a mirrored hub changes which side each child hangs on maps to `swap(node.left, node.right)` before the recursive calls on those two child pointers.',
      }}
      leetcodeLinks={[
        {
          id: 226,
          title: 'Invert Binary Tree',
          url: 'https://leetcode.com/problems/invert-binary-tree/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#151a1d',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2e3d43',
  },
  cardTitle: {
    color: '#8db8c4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#f4fbfd',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  summaryMeta: {
    color: '#9db0b6',
    fontSize: 12,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#151a1d',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2e3d43',
    gap: 10,
  },
  ribbonBlock: {
    gap: 8,
  },
  ribbonRow: {
    gap: 4,
  },
  ribbonLabel: {
    color: '#8db8c4',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ribbonValue: {
    color: '#f4fbfd',
    fontSize: 13,
    lineHeight: 20,
  },
  treeStack: {
    gap: 12,
  },
  treeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  nodeSlot: {
    flex: 1,
    minHeight: 60,
  },
  nodeCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#22333b',
    borderWidth: 1,
    borderColor: '#3f5963',
    paddingHorizontal: 4,
  },
  nodeCardActive: {
    borderColor: '#f7b267',
    backgroundColor: '#3b2a16',
  },
  nodeCardMirrored: {
    borderColor: '#57cc99',
    backgroundColor: '#17332b',
  },
  nodeCardLeaf: {
    backgroundColor: '#1c2429',
    borderColor: '#39474d',
  },
  nodeLabel: {
    color: '#f4fbfd',
    fontSize: 16,
    fontWeight: '800',
  },
  nodeMeta: {
    color: '#c0d4da',
    fontSize: 10,
    marginTop: 4,
  },
  historyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    backgroundColor: '#22333b',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyText: {
    color: '#d8ecf1',
    fontSize: 12,
  },
  emptyText: {
    color: '#b8c7cc',
    fontSize: 13,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#151a1d',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2e3d43',
    gap: 8,
  },
  infoLine: {
    color: '#d0dce0',
    fontSize: 13,
    lineHeight: 19,
  },
  exitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exitCard: {
    flex: 1,
    backgroundColor: '#151a1d',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2e3d43',
  },
  exitLabel: {
    color: '#8db8c4',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  exitValue: {
    color: '#f4fbfd',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
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
    borderWidth: 1,
    borderColor: '#44606a',
    backgroundColor: '#22333b',
    paddingHorizontal: 10,
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: '#f7b267',
    borderColor: '#f7b267',
  },
  controlButtonLabel: {
    color: '#eef6f8',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#1e170f',
    fontSize: 14,
    fontWeight: '800',
  },
  statusCard: {
    backgroundColor: '#151a1d',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2e3d43',
  },
  statusText: {
    color: '#f4fbfd',
    fontSize: 14,
    lineHeight: 21,
  },
});
