import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentBounds,
  currentExits,
  currentNode,
  generatePuzzle,
  isCurrentNode,
  isCurrentSealed,
  isRevealedNode,
  isSealedNode,
  isViolationNode,
  remainingProofs,
  remainingResin,
  treeRows,
  type CharterboughDifficulty,
  type CharterboughState,
} from '../solvers/Charterbough.solver';

const DIFFICULTIES: CharterboughDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: CharterboughDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function nodeLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return 'open';
  return `B${value}`;
}

function boundsLabel(value: number | null | undefined, side: 'lower' | 'upper') {
  if (value === null || value === undefined) {
    return side === 'lower' ? 'open floor' : 'open sky';
  }
  return nodeLabel(value);
}

export default function Charterbough() {
  const [difficulty, setDifficulty] = useState<CharterboughDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<CharterboughState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: CharterboughDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'seal' | 'breach' | 'left' | 'right' | 'up') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const rows = useMemo(() => treeRows(state), [state]);
  const node = currentNode(state);
  const bounds = currentBounds(state);
  const exits = currentExits(state);
  const proofsLeft = remainingProofs(state);
  const resinLeft = remainingResin(state);
  const currentSealed = isCurrentSealed(state);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Focus Branch</Text>
          <Text style={styles.summaryValue}>{nodeLabel(node.value)}</Text>
          <Text style={styles.summaryMeta}>{node.parentId === null ? 'crown' : `depth ${node.depth}`}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Resin Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>{`${resinLeft} left`}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Proofs Left</Text>
          <Text style={styles.summaryValue}>{proofsLeft}</Text>
          <Text style={styles.summaryMeta}>{puzzle.isValid ? 'seal every branch' : 'or catch one breach'}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Live Charter</Text>
        <View style={styles.charterRow}>
          <View style={styles.charterCard}>
            <Text style={styles.charterLabel}>Floor</Text>
            <Text style={styles.charterValue}>{boundsLabel(bounds.lower, 'lower')}</Text>
          </View>
          <View style={styles.charterCard}>
            <Text style={styles.charterLabel}>Current</Text>
            <Text style={styles.charterValue}>{nodeLabel(node.value)}</Text>
          </View>
          <View style={styles.charterCard}>
            <Text style={styles.charterLabel}>Ceiling</Text>
            <Text style={styles.charterValue}>{boundsLabel(bounds.upper, 'upper')}</Text>
          </View>
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
                const revealed = isRevealedNode(state, nodeId);
                const sealed = isSealedNode(state, nodeId);
                const showViolation = Boolean(state.verdict) && isViolationNode(state, nodeId);

                return (
                  <View
                    key={`node-${nodeId}`}
                    style={[
                      styles.nodeSlot,
                      styles.nodeCard,
                      !revealed && styles.nodeCardHidden,
                      isCurrentNode(state, nodeId) && styles.nodeCardCurrent,
                      sealed && styles.nodeCardSealed,
                      showViolation && styles.nodeCardViolation,
                    ]}
                  >
                    <Text style={styles.nodeLabel}>{revealed ? treeNode.value : '?'}</Text>
                    <Text style={styles.nodeMeta}>
                      {showViolation
                        ? 'breach'
                        : sealed
                          ? 'sealed'
                          : revealed
                            ? `d${treeNode.depth}`
                            : 'hidden'}
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
              {exits.right
                ? isRevealedNode(state, exits.right.id)
                  ? nodeLabel(exits.right.value)
                  : 'hidden'
                : 'none'}
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
            No moves yet. Seal branches that fit the inherited floor and ceiling, and flag the first branch that falls outside them.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Charter Rules</Text>
        <Text style={styles.infoLine}>Seal the current branch only if its crest sits strictly above the floor and strictly below the ceiling.</Text>
        <Text style={styles.infoLine}>Once a branch is sealed, the left child inherits a tighter ceiling and the right child inherits a higher floor.</Text>
        <Text style={styles.infoLine}>If a revealed branch falls outside that live charter, flag the breach immediately instead of sealing it.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('seal')}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            styles.primaryButton,
            state.verdict && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Seal Branch</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('breach')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Flag Breach</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('left')}
          disabled={Boolean(state.verdict) || !currentSealed || !exits.left}
          style={[
            styles.controlButton,
            (state.verdict || !currentSealed || !exits.left) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.controlButtonLabel}>Go Left</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('up')}
          disabled={Boolean(state.verdict) || !exits.up}
          style={[
            styles.controlButton,
            (state.verdict || !exits.up) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.controlButtonLabel}>Climb Up</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('right')}
          disabled={Boolean(state.verdict) || !currentSealed || !exits.right}
          style={[
            styles.controlButton,
            (state.verdict || !currentSealed || !exits.right) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.controlButtonLabel}>Go Right</Text>
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
      title="Charterbough"
      emoji="CH"
      subtitle="Validate a binary search tree"
      objective="Carry the live floor and ceiling charter down the grove. Seal every branch that stays inside its inherited gates, or flag the exact branch that breaks them before the resin runs out."
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
          'Charterbough teaches BST bounds propagation: every branch must stay strictly inside the lower and upper limits inherited from all of its ancestors, the left child tightens the ceiling to the current value, and the right child raises the floor.',
        takeaway:
          'The moment where a branch looks fine beside its parent but still breaks an older ancestor gate maps to the `node.val <= low || node.val >= high` check that makes `Validate Binary Search Tree` require carried bounds instead of local comparisons.',
      }}
      leetcodeLinks={[
        {
          id: 98,
          title: 'Validate Binary Search Tree',
          url: 'https://leetcode.com/problems/validate-binary-search-tree/',
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
    flex: 1,
    minWidth: 140,
    backgroundColor: '#151d1b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27443c',
    padding: 14,
    gap: 4,
  },
  sectionCard: {
    backgroundColor: '#121715',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#24342f',
    padding: 14,
    gap: 12,
  },
  cardTitle: {
    color: '#b9d7c8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#f5fff9',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#9ab6aa',
    fontSize: 12,
    lineHeight: 18,
  },
  charterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  charterCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#102220',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2f6256',
    padding: 14,
    gap: 4,
  },
  charterLabel: {
    color: '#8dc9b1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  charterValue: {
    color: '#f0fff7',
    fontSize: 20,
    fontWeight: '800',
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
    width: 58,
    minHeight: 58,
  },
  nodeCard: {
    backgroundColor: '#18201d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2d3f38',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  nodeCardHidden: {
    backgroundColor: '#101514',
    borderColor: '#1d2a25',
  },
  nodeCardCurrent: {
    borderColor: '#f0c674',
    backgroundColor: '#2b2416',
  },
  nodeCardSealed: {
    borderColor: '#4ab98c',
    backgroundColor: '#132720',
  },
  nodeCardViolation: {
    borderColor: '#ff7c7c',
    backgroundColor: '#331d20',
  },
  nodeLabel: {
    color: '#f6fff9',
    fontSize: 20,
    fontWeight: '800',
  },
  nodeMeta: {
    color: '#99b4a8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  exitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exitCard: {
    flex: 1,
    backgroundColor: '#171d1b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27332f',
    padding: 12,
    gap: 4,
  },
  exitLabel: {
    color: '#97b2a5',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  exitValue: {
    color: '#f5fff9',
    fontSize: 18,
    fontWeight: '800',
  },
  historyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    backgroundColor: '#1a2320',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2a3934',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  historyText: {
    color: '#d8ebe2',
    fontSize: 12,
    lineHeight: 16,
  },
  emptyText: {
    color: '#a3beb2',
    fontSize: 13,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 16,
  },
  infoCard: {
    backgroundColor: '#111714',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#23312c',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#dcefe6',
    fontSize: 13,
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
    backgroundColor: '#1a2320',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a3934',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  primaryButton: {
    backgroundColor: '#2d7b5e',
    borderColor: '#4ab98c',
  },
  controlButtonLabel: {
    color: '#f0fff7',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryButtonLabel: {
    color: '#f9fffc',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  resetButton: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#151d1b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#29423b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  resetButtonLabel: {
    color: '#d8ebe2',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#dcefe6',
    fontSize: 13,
    lineHeight: 20,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#73e2ab',
  },
  lossText: {
    color: '#ff9d9d',
  },
});
