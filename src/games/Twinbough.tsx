import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentExits,
  currentLane,
  generatePuzzle,
  isFocusedNode,
  isMatchedNode,
  remainingProofs,
  twinRows,
  type TwinboughDifficulty,
  type TwinboughState,
} from '../solvers/Twinbough.solver';

const DIFFICULTIES: TwinboughDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: TwinboughDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function nodeText(label: string | null | undefined) {
  return label ?? 'empty';
}

export default function Twinbough() {
  const [difficulty, setDifficulty] = useState<TwinboughDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<TwinboughState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: TwinboughDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'check' | 'left' | 'right' | 'up') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const lane = currentLane(state);
  const exits = currentExits(state);
  const proofsLeft = remainingProofs(state);
  const { rowsA, rowsB } = useMemo(() => twinRows(state), [state]);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Focus Pair</Text>
          <Text style={styles.summaryValue}>
            {`${nodeText(lane.nodeA?.label)} / ${nodeText(lane.nodeB?.label)}`}
          </Text>
          <Text style={styles.summaryMeta}>{lane.key}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Bark Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>actions used</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Proofs Left</Text>
          <Text style={styles.summaryValue}>{proofsLeft}</Text>
          <Text style={styles.summaryMeta}>live pairs to certify</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Pair Window</Text>
        <View style={styles.pairRow}>
          <View style={styles.pairCard}>
            <Text style={styles.pairSide}>Grove A</Text>
            <Text style={styles.pairValue}>{nodeText(lane.nodeA?.label)}</Text>
          </View>
          <View style={styles.pairCard}>
            <Text style={styles.pairSide}>Lane</Text>
            <Text style={styles.pairValue}>{lane.key}</Text>
          </View>
          <View style={styles.pairCard}>
            <Text style={styles.pairSide}>Grove B</Text>
            <Text style={styles.pairValue}>{nodeText(lane.nodeB?.label)}</Text>
          </View>
        </View>
        <Text style={styles.pairMeta}>
          {lane.checkStatus === 'match'
            ? 'Both child lanes are already safe, so this pair can be certified now.'
            : lane.checkStatus === 'mismatch'
              ? 'This lane is the break: one side is missing or the two crests differ.'
              : lane.checkStatus === 'already'
                ? 'This lane is already certified safe.'
                : 'The current crests match, but at least one child lane still needs proof.'}
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Twin Groves</Text>
        <View style={styles.groveRow}>
          <View style={styles.groveCard}>
            <Text style={styles.groveTitle}>Grove A</Text>
            <View style={styles.treeStack}>
              {rowsA.map((row, depth) => (
                <View key={`a-${depth}`} style={styles.treeRow}>
                  {row.map((nodeId, column) => {
                    if (nodeId === null) {
                      return <View key={`a-empty-${depth}-${column}`} style={styles.nodeSlot} />;
                    }

                    const node = puzzle.nodesA[nodeId];
                    return (
                      <View
                        key={`a-node-${nodeId}`}
                        style={[
                          styles.nodeSlot,
                          styles.nodeCard,
                          isFocusedNode(state, 'A', nodeId) && styles.nodeCardActive,
                          isMatchedNode(state, 'A', nodeId) && styles.nodeCardMatched,
                        ]}
                      >
                        <Text style={styles.nodeLabel}>{node.label}</Text>
                        <Text style={styles.nodeMeta}>{isMatchedNode(state, 'A', nodeId) ? 'safe' : `d${node.depth}`}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.groveCard}>
            <Text style={styles.groveTitle}>Grove B</Text>
            <View style={styles.treeStack}>
              {rowsB.map((row, depth) => (
                <View key={`b-${depth}`} style={styles.treeRow}>
                  {row.map((nodeId, column) => {
                    if (nodeId === null) {
                      return <View key={`b-empty-${depth}-${column}`} style={styles.nodeSlot} />;
                    }

                    const node = puzzle.nodesB[nodeId];
                    return (
                      <View
                        key={`b-node-${nodeId}`}
                        style={[
                          styles.nodeSlot,
                          styles.nodeCard,
                          isFocusedNode(state, 'B', nodeId) && styles.nodeCardActive,
                          isMatchedNode(state, 'B', nodeId) && styles.nodeCardMatched,
                        ]}
                      >
                        <Text style={styles.nodeLabel}>{node.label}</Text>
                        <Text style={styles.nodeMeta}>{isMatchedNode(state, 'B', nodeId) ? 'safe' : `d${node.depth}`}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
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
            No moves yet. Stay in lockstep: compare the current pair, finish live child lanes, then certify the parent.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Twin Rules</Text>
        <Text style={styles.infoLine}>Move Left and Right in lockstep across both groves.</Text>
        <Text style={styles.infoLine}>Check Pair exposes a break immediately when one side is empty or the two crests differ.</Text>
        <Text style={styles.infoLine}>A matching branch pair can certify only after every live child lane beneath it is already safe.</Text>
        <Text style={styles.infoLine}>Win by proving a break or certifying the crown before the bark budget runs out.</Text>
      </View>

      <View style={styles.exitRow}>
        <View style={styles.exitCard}>
          <Text style={styles.exitLabel}>Left Lane</Text>
          <Text style={styles.exitValue}>
            {`${nodeText(exits.left.nodeA?.label)} / ${nodeText(exits.left.nodeB?.label)}`}
          </Text>
          <Text style={styles.exitMeta}>{exits.leftStatus}</Text>
        </View>
        <View style={styles.exitCard}>
          <Text style={styles.exitLabel}>Up</Text>
          <Text style={styles.exitValue}>{exits.parentPath === null ? 'crown' : exits.parentPath}</Text>
          <Text style={styles.exitMeta}>parent lane</Text>
        </View>
        <View style={styles.exitCard}>
          <Text style={styles.exitLabel}>Right Lane</Text>
          <Text style={styles.exitValue}>
            {`${nodeText(exits.right.nodeA?.label)} / ${nodeText(exits.right.nodeB?.label)}`}
          </Text>
          <Text style={styles.exitMeta}>{exits.rightStatus}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('check')}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            styles.primaryButton,
            state.verdict && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Check Pair</Text>
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
        <Text style={styles.cardTitle}>Current Status</Text>
        <Text style={styles.summaryValue}>{state.verdict?.correct ? 'Locked' : 'Live'}</Text>
        <Text style={styles.summaryMeta}>{state.verdict?.label ?? state.message}</Text>
      </View>
    </View>
  );

  return (
    <GameScreenTemplate
      title="Twinbough"
      emoji="TB"
      subtitle="Two side-by-side groves under one bark budget."
      objective="Decide whether the two groves are true twins by checking them in lockstep."
      statsLabel={puzzle.title}
      actions={[
        { label: 'Reset Grove', onPress: () => resetPuzzle(), tone: 'neutral' },
        { label: 'New Grove', onPress: rerollPuzzle, tone: 'primary' },
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
        summary:
          'Twinbough teaches the pairwise Same Tree routine: compare the current nodes, recurse on the left pair and right pair, and only return true when both child results and the current labels all agree.',
        takeaway:
          'The moment you certify a branch after both child lanes are already safe maps to returning `same(leftA, leftB) && same(rightA, rightB)` only after the current values match.',
      }}
      leetcodeLinks={[
        {
          id: 100,
          title: 'Same Tree',
          url: 'https://leetcode.com/problems/same-tree/',
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
    backgroundColor: '#141d1c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d4643',
    padding: 12,
    gap: 4,
  },
  sectionCard: {
    backgroundColor: '#141d1c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d4643',
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    color: '#d6ebe7',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#9bc0b8',
    fontSize: 12,
    lineHeight: 18,
  },
  pairRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pairCard: {
    flex: 1,
    backgroundColor: '#102725',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#28504c',
    padding: 12,
    gap: 6,
    alignItems: 'center',
  },
  pairSide: {
    color: '#9bc0b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pairValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  pairMeta: {
    color: '#c5ddd7',
    fontSize: 13,
    lineHeight: 19,
  },
  groveRow: {
    flexDirection: 'row',
    gap: 12,
  },
  groveCard: {
    flex: 1,
    gap: 8,
  },
  groveTitle: {
    color: '#d6ebe7',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  treeStack: {
    gap: 8,
  },
  treeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  nodeSlot: {
    width: 44,
    height: 44,
  },
  nodeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#365e58',
    backgroundColor: '#122f2b',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  nodeCardActive: {
    borderColor: '#f6c453',
    backgroundColor: '#4d3a13',
  },
  nodeCardMatched: {
    borderColor: '#6ce7c1',
    backgroundColor: '#174338',
  },
  nodeLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  nodeMeta: {
    color: '#9bc0b8',
    fontSize: 10,
    fontWeight: '700',
  },
  historyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    backgroundColor: '#102725',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#28504c',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyText: {
    color: '#d6ebe7',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#c5ddd7',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#102725',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#28504c',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#d6ebe7',
    fontSize: 13,
    lineHeight: 19,
  },
  exitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exitCard: {
    flex: 1,
    backgroundColor: '#102725',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#28504c',
    padding: 12,
    gap: 4,
  },
  exitLabel: {
    color: '#9bc0b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  exitValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  exitMeta: {
    color: '#9bc0b8',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#102725',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#28504c',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#6ce7c1',
    borderColor: '#6ce7c1',
  },
  controlButtonDisabled: {
    opacity: 0.55,
  },
  controlButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButtonLabel: {
    color: '#08362c',
    fontSize: 14,
    fontWeight: '900',
  },
});
