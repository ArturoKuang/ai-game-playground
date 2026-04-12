import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentExits,
  currentNode,
  currentTargets,
  generatePuzzle,
  isClaimNode,
  isCurrentNode,
  isTargetNode,
  remainingBark,
  treeRows,
  type SplitboughDifficulty,
  type SplitboughState,
} from '../solvers/Splitbough.solver';

const DIFFICULTIES: SplitboughDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: SplitboughDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function nodeLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return 'none';
  return `B${value}`;
}

export default function Splitbough() {
  const [difficulty, setDifficulty] = useState<SplitboughDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<SplitboughState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: SplitboughDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'claim' | 'left' | 'right' | 'up') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const rows = useMemo(() => treeRows(state), [state]);
  const node = currentNode(state);
  const exits = currentExits(state);
  const targets = currentTargets(state);
  const barkLeft = remainingBark(state);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Focus Branch</Text>
          <Text style={styles.summaryValue}>{nodeLabel(node.value)}</Text>
          <Text style={styles.summaryMeta}>{node.parentId === null ? 'crown' : `depth ${node.depth}`}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Bark Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>{`${barkLeft} left`}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Shared Markers</Text>
          <Text style={styles.summaryValue}>{`${targets.low} · ${targets.high}`}</Text>
          <Text style={styles.summaryMeta}>two target values</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Canopy</Text>
        <View style={styles.treeStack}>
          {rows.map((row, depth) => (
            <View key={`depth-${depth}`} style={styles.treeRow}>
              {row.map((nodeId, index) => {
                if (nodeId === null) {
                  return <View key={`empty-${depth}-${index}`} style={styles.nodeSlot} />;
                }

                const treeNode = puzzle.nodes[nodeId];
                return (
                  <View
                    key={`node-${nodeId}`}
                    style={[
                      styles.nodeSlot,
                      styles.nodeCard,
                      isCurrentNode(state, nodeId) && styles.nodeCardCurrent,
                      isTargetNode(state, nodeId) && styles.nodeCardTarget,
                      isClaimNode(state, nodeId) && styles.nodeCardClaim,
                    ]}
                  >
                    <Text style={styles.nodeLabel}>{treeNode.value}</Text>
                    <Text style={styles.nodeMeta}>
                      {isClaimNode(state, nodeId)
                        ? 'fork'
                        : isTargetNode(state, nodeId)
                          ? 'target'
                          : `d${treeNode.depth}`}
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
            <Text style={styles.exitValue}>{nodeLabel(exits.left?.value)}</Text>
          </View>
          <View style={styles.exitCard}>
            <Text style={styles.exitLabel}>Up</Text>
            <Text style={styles.exitValue}>{nodeLabel(exits.up?.value)}</Text>
          </View>
          <View style={styles.exitCard}>
            <Text style={styles.exitLabel}>Right</Text>
            <Text style={styles.exitValue}>{nodeLabel(exits.right?.value)}</Text>
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
            No moves yet. Keep both target markers together while they still fall on one side of the current branch.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Fork Rules</Text>
        <Text style={styles.infoLine}>Both targets smaller than the current branch means the patrol should keep left.</Text>
        <Text style={styles.infoLine}>Both targets larger than the current branch means the patrol should keep right.</Text>
        <Text style={styles.infoLine}>When the two targets stop sharing one side, claim this branch immediately instead of chasing either target farther.</Text>
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
          onPress={() => runMove('claim')}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            styles.primaryButton,
            state.verdict && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Claim Shared Fork</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('right')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Go Right</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('up')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Climb Up</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Grove</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Grove</Text>
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
      title="Splitbough"
      emoji="SB"
      subtitle="Lowest common ancestor in a binary search tree"
      objective="Find the lowest branch shared by both target routes. Keep descending only while both targets still lie on the same side, then stop at the first fork before the bark budget runs out."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Grove', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((entry) => ({
        label: `D${entry}`,
        selected: difficulty === entry,
        onPress: () => switchDifficulty(entry),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        title: 'What This Teaches',
        summary:
          'Splitbough teaches the BST lowest-common-ancestor rule: keep walking left while both target values are smaller, keep walking right while both are larger, and return the first branch where they split or where the current branch already equals one of them.',
        takeaway:
          'The moment where you stop at a branch before reaching either target maps to returning the current BST node immediately instead of tracing both full target paths.',
      }}
      leetcodeLinks={[
        {
          id: 235,
          title: 'Lowest Common Ancestor of a Binary Search Tree',
          url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/',
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
    backgroundColor: '#1a1f1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#314532',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#cddcc5',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#f5f1de',
    fontSize: 19,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#96a88f',
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: '#141915',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#29382b',
    padding: 12,
    gap: 10,
  },
  treeStack: {
    gap: 10,
  },
  treeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 6,
  },
  nodeSlot: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCard: {
    maxWidth: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3b4d3d',
    backgroundColor: '#212b22',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 4,
  },
  nodeCardCurrent: {
    backgroundColor: '#715c2d',
    borderColor: '#f0c46a',
  },
  nodeCardTarget: {
    backgroundColor: '#1f3a2c',
    borderColor: '#6fd19a',
  },
  nodeCardClaim: {
    backgroundColor: '#4b2740',
    borderColor: '#ff8fd7',
  },
  nodeLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  nodeMeta: {
    color: '#c7d2c3',
    fontSize: 11,
  },
  exitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exitCard: {
    flex: 1,
    backgroundColor: '#202721',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#314131',
    padding: 10,
    gap: 4,
  },
  exitLabel: {
    color: '#98b294',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  exitValue: {
    color: '#f5f1de',
    fontSize: 17,
    fontWeight: '800',
  },
  historyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    backgroundColor: '#232c24',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3a4a3c',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyText: {
    color: '#d7e1d1',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#aab9a5',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#171f18',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#314231',
    padding: 12,
    gap: 8,
  },
  infoLine: {
    color: '#d6dfcf',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#506251',
    backgroundColor: '#29352b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  primaryButton: {
    backgroundColor: '#866335',
    borderColor: '#f0c46a',
  },
  controlButtonLabel: {
    color: '#edf3e9',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButtonLabel: {
    color: '#fff7df',
    fontSize: 13,
    fontWeight: '900',
  },
  resetButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#405143',
    backgroundColor: '#1d251e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonLabel: {
    color: '#dce6d7',
    fontSize: 13,
    fontWeight: '800',
  },
  messageText: {
    color: '#d8e3d3',
    fontSize: 13,
    lineHeight: 19,
  },
  verdictText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  winText: {
    color: '#88e3a5',
  },
  lossText: {
    color: '#ff9c9c',
  },
});
