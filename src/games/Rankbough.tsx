import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  ancestorLane,
  applyMove,
  createInitialState,
  currentExits,
  currentNode,
  generatePuzzle,
  harvestRibbon,
  isCurrentNode,
  isHarvestedNode,
  isRevealedNode,
  nextBloomNode,
  remainingBlooms,
  remainingDew,
  treeRows,
  type RankboughDifficulty,
  type RankboughState,
} from '../solvers/Rankbough.solver';

const DIFFICULTIES: RankboughDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: RankboughDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function nodeLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return '?';
  return `B${value}`;
}

export default function Rankbough() {
  const [difficulty, setDifficulty] = useState<RankboughDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<RankboughState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: RankboughDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'left' | 'right' | 'up' | 'harvest') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const rows = useMemo(() => treeRows(state), [state]);
  const node = currentNode(state);
  const exits = currentExits(state);
  const lane = ancestorLane(state);
  const nextBloom = nextBloomNode(state);
  const ribbon = harvestRibbon(state);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Focus Branch</Text>
          <Text style={styles.summaryValue}>{nodeLabel(node.value)}</Text>
          <Text style={styles.summaryMeta}>{node.parentId === null ? 'crown' : `depth ${node.depth}`}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Dew Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>{`${remainingDew(state)} left`}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Bloom Count</Text>
          <Text style={styles.summaryValue}>{`${state.harvestedIds.length}/${puzzle.k}`}</Text>
          <Text style={styles.summaryMeta}>{`${remainingBlooms(state)} to go`}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Harvest Ribbon</Text>
        {ribbon.length > 0 ? (
          <View style={styles.ribbonWrap}>
            {ribbon.map((value, index) => (
              <View key={`${value}-${index}`} style={styles.ribbonChip}>
                <Text style={styles.ribbonChipLabel}>{`#${index + 1}`}</Text>
                <Text style={styles.ribbonChipValue}>{nodeLabel(value)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No blooms harvested yet. The first safe bloom is hidden somewhere down the left return lane.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Return Lane</Text>
        {lane.length > 0 ? (
          <View style={styles.ribbonWrap}>
            {lane.map((laneNode, index) => (
              <View key={`${laneNode.id}-${index}`} style={styles.laneChip}>
                <Text style={styles.laneChipLabel}>{nodeLabel(laneNode.value)}</Text>
                <Text style={styles.laneChipMeta}>{index === 0 ? 'next up' : 'higher'}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No saved branches above you. A crown reset from here is pure waste unless the bloom count is already done.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Search Grove</Text>
        <View style={styles.treeStack}>
          {rows.map((row, depth) => (
            <View key={`depth-${depth}`} style={styles.treeRow}>
              {row.map((nodeId, index) => {
                if (nodeId === null) {
                  return <View key={`empty-${depth}-${index}`} style={styles.nodeSlot} />;
                }

                const treeNode = puzzle.nodes[nodeId];
                const revealed = isRevealedNode(state, nodeId);
                const harvested = isHarvestedNode(state, nodeId);
                const active = isCurrentNode(state, nodeId);

                return (
                  <View
                    key={`node-${nodeId}`}
                    style={[
                      styles.nodeSlot,
                      styles.nodeCard,
                      !revealed && styles.nodeCardHidden,
                      revealed && active && styles.nodeCardCurrent,
                      harvested && styles.nodeCardHarvested,
                    ]}
                  >
                    <Text style={styles.nodeLabel}>{revealed ? nodeLabel(treeNode.value) : '?'}</Text>
                    <Text style={styles.nodeMeta}>
                      {harvested ? 'harvested' : active ? 'focus' : revealed ? `d${treeNode.depth}` : 'hidden'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Current Exits</Text>
        <View style={styles.exitRow}>
          <View style={styles.exitCard}>
            <Text style={styles.exitLabel}>Left</Text>
            <Text style={styles.exitValue}>
              {exits.left ? (isRevealedNode(state, exits.left.id) ? nodeLabel(exits.left.value) : 'hidden') : 'none'}
            </Text>
          </View>
          <View style={styles.exitCard}>
            <Text style={styles.exitLabel}>Up</Text>
            <Text style={styles.exitValue}>{exits.up ? nodeLabel(exits.up.value) : 'crown'}</Text>
          </View>
          <View style={styles.exitCard}>
            <Text style={styles.exitLabel}>Right</Text>
            <Text style={styles.exitValue}>
              {exits.right ? (isRevealedNode(state, exits.right.id) ? nodeLabel(exits.right.value) : 'hidden') : 'none'}
            </Text>
          </View>
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
            No moves yet. Chase the earliest unseen bloom, ring it, then keep the live return lane instead of climbing all the way back to the crown.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Orchard Rules</Text>
        <Text style={styles.infoLine}>Left and Right move one branch at a time. Climb Up returns to the parent branch.</Text>
        <Text style={styles.infoLine}>Ring Bloom is only correct when the current branch is the earliest bloom still unpaid by the orchard.</Text>
        <Text style={styles.infoLine}>Win by collecting exactly {puzzle.k} blooms before the dew budget runs out.</Text>
        <Text style={styles.infoLine}>
          {nextBloom
            ? `A next bloom still exists somewhere in the grove.`
            : 'The bloom count is complete.'}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('harvest')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, styles.primaryButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.primaryButtonLabel}>Ring Bloom</Text>
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
    </View>
  );

  return (
    <GameScreenTemplate
      title="Rankbough"
      emoji="RB"
      subtitle={puzzle.title}
      objective={`Harvest the ${puzzle.k}${puzzle.k === 1 ? 'st' : puzzle.k === 2 ? 'nd' : puzzle.k === 3 ? 'rd' : 'th'} smallest bloom without wasting dew on crown resets.`}
      statsLabel={`${puzzle.label} • K${puzzle.k}`}
      actions={[
        { label: 'Reset Grove', onPress: () => resetPuzzle() },
        { label: 'New Grove', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((value) => ({
        label: `D${value}`,
        selected: value === difficulty,
        onPress: () => switchDifficulty(value),
      }))}
      board={board}
      controls={controls}
      helperText={state.verdict?.label ?? state.message}
      conceptBridge={{
        summary:
          'Rankbough teaches BST inorder rank traversal. The stable route is to keep the live return lane, reveal the leftmost unpaid branch, ring it, then open the right spur only when it becomes due.',
        takeaway:
          'This maps directly to `kthSmallest(root, k)`: traverse the BST in inorder order, count nodes as they are visited, and stop the moment the running count reaches `k`.',
      }}
      leetcodeLinks={[
        {
          id: 230,
          title: 'Kth Smallest Element in a BST',
          url: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/',
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
    padding: 12,
    backgroundColor: '#121920',
    borderWidth: 1,
    borderColor: '#273344',
    gap: 6,
  },
  cardTitle: {
    color: '#8db5d8',
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
    color: '#9eb0c3',
    fontSize: 12,
  },
  sectionCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#10161d',
    borderWidth: 1,
    borderColor: '#24313f',
    gap: 10,
  },
  ribbonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ribbonChip: {
    minWidth: 76,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#162431',
    borderWidth: 1,
    borderColor: '#2b455d',
    gap: 4,
  },
  ribbonChipLabel: {
    color: '#8db5d8',
    fontSize: 11,
    fontWeight: '700',
  },
  ribbonChipValue: {
    color: '#f4fbff',
    fontSize: 16,
    fontWeight: '800',
  },
  laneChip: {
    minWidth: 84,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1a2129',
    borderWidth: 1,
    borderColor: '#394858',
    gap: 4,
  },
  laneChipLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
  },
  laneChipMeta: {
    color: '#9eb0c3',
    fontSize: 11,
  },
  treeStack: {
    gap: 8,
  },
  treeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  nodeSlot: {
    minWidth: 62,
    minHeight: 62,
  },
  nodeCard: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#16212b',
    borderWidth: 1,
    borderColor: '#2a3a4c',
    gap: 4,
  },
  nodeCardHidden: {
    backgroundColor: '#0d1319',
    borderColor: '#1b2835',
  },
  nodeCardCurrent: {
    backgroundColor: '#24384b',
    borderColor: '#8db5d8',
  },
  nodeCardHarvested: {
    backgroundColor: '#183228',
    borderColor: '#46b27f',
  },
  nodeLabel: {
    color: '#f4fbff',
    fontSize: 16,
    fontWeight: '800',
  },
  nodeMeta: {
    color: '#a7b7c8',
    fontSize: 11,
  },
  exitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  exitCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#172028',
    borderWidth: 1,
    borderColor: '#2c3946',
    gap: 4,
  },
  exitLabel: {
    color: '#8db5d8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  exitValue: {
    color: '#f4fbff',
    fontSize: 16,
    fontWeight: '800',
  },
  historyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1a2530',
    borderWidth: 1,
    borderColor: '#314153',
  },
  historyText: {
    color: '#dbe8f3',
    fontSize: 12,
  },
  emptyText: {
    color: '#9eb0c3',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#10161d',
    borderWidth: 1,
    borderColor: '#24313f',
    gap: 8,
  },
  infoLine: {
    color: '#d6e3ee',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a232d',
    borderWidth: 1,
    borderColor: '#324253',
  },
  primaryButton: {
    backgroundColor: '#2d7dd2',
    borderColor: '#6da7df',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#f4fbff',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#06131f',
    fontSize: 15,
    fontWeight: '900',
  },
});
