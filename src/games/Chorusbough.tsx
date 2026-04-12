import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  displayedRows,
  frontNode,
  generatePuzzle,
  isCurrentQueueNode,
  isDiscoveredNode,
  isFrontNode,
  isNextQueueNode,
  queueNodes,
  remainingBranches,
  treeRows,
  type ChorusboughDifficulty,
  type ChorusboughState,
} from '../solvers/Chorusbough.solver';

const DIFFICULTIES: ChorusboughDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: ChorusboughDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function railLabel(count: number) {
  return `${count} branch${count === 1 ? '' : 'es'}`;
}

export default function Chorusbough() {
  const [difficulty, setDifficulty] = useState<ChorusboughDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<ChorusboughState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: ChorusboughDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'advance' | { type: 'ring'; nodeId: number }) => {
    setState((current) => applyMove(current, move === 'advance' ? { type: 'advance' } : move));
  };

  const rows = useMemo(() => treeRows(state), [state]);
  const liveRail = queueNodes(state, 'current');
  const nextRail = queueNodes(state, 'next');
  const sheets = displayedRows(state);
  const front = frontNode(state);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Live Front</Text>
          <Text style={styles.summaryValue}>{front?.label ?? 'swap'}</Text>
          <Text style={styles.summaryMeta}>
            {front ? `depth ${front.depth}` : nextRail.length > 0 ? 'advance wave' : 'final sheet'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Beat Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>spent</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Rows Filed</Text>
          <Text style={styles.summaryValue}>{`${sheets.length}/${puzzle.targetRows}`}</Text>
          <Text style={styles.summaryMeta}>{`${remainingBranches(state)} left`}</Text>
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

                const node = puzzle.nodes[nodeId];
                const discovered = isDiscoveredNode(state, nodeId);
                const inCurrent = isCurrentQueueNode(state, nodeId);
                const inNext = isNextQueueNode(state, nodeId);
                const frontNodeStyle = isFrontNode(state, nodeId);
                const filed = sheets.some((sheet) => sheet.includes(node.label)) && !inCurrent && !inNext;

                return (
                  <View
                    key={`node-${nodeId}`}
                    style={[
                      styles.nodeSlot,
                      styles.nodeCard,
                      !discovered && styles.nodeCardHidden,
                      discovered && inCurrent && styles.nodeCardCurrent,
                      discovered && inNext && styles.nodeCardNext,
                      discovered && filed && styles.nodeCardFiled,
                      frontNodeStyle && styles.nodeCardFront,
                    ]}
                  >
                    <Text style={styles.nodeLabel}>{discovered ? node.label : '?'}</Text>
                    <Text style={styles.nodeMeta}>
                      {!discovered
                        ? 'fog'
                        : frontNodeStyle
                          ? 'front'
                          : inCurrent
                            ? 'live'
                            : inNext
                              ? 'next'
                              : filed
                                ? 'filed'
                                : `d${node.depth}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Rails</Text>
        <View style={styles.railBlock}>
          <Text style={styles.railTitle}>{`Live Rail · ${railLabel(liveRail.length)}`}</Text>
          <View style={styles.railWrap}>
            {liveRail.length > 0 ? (
              liveRail.map((node, index) => (
                <Pressable
                  key={`live-${node.id}`}
                  onPress={() => runMove({ type: 'ring', nodeId: node.id })}
                  disabled={Boolean(state.verdict)}
                  style={[
                    styles.railChip,
                    styles.liveChip,
                    index === 0 && styles.frontChip,
                    state.verdict && styles.railChipDisabled,
                  ]}
                >
                  <Text style={styles.railChipLabel}>{node.label}</Text>
                  <Text style={styles.railChipMeta}>{index === 0 ? 'front' : 'wait'}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyText}>
                {nextRail.length > 0
                  ? 'This chorus is clear. Swap rails to open the next wave.'
                  : 'No live singers remain.'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.railBlock}>
          <Text style={styles.railTitle}>{`Next Rail · ${railLabel(nextRail.length)}`}</Text>
          <View style={styles.railWrap}>
            {nextRail.length > 0 ? (
              nextRail.map((node) => (
                <Pressable
                  key={`next-${node.id}`}
                  onPress={() => runMove({ type: 'ring', nodeId: node.id })}
                  disabled={Boolean(state.verdict)}
                  style={[styles.railChip, styles.nextChip, state.verdict && styles.railChipDisabled]}
                >
                  <Text style={styles.railChipLabel}>{node.label}</Text>
                  <Text style={styles.railChipMeta}>next</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyText}>Fresh children will queue here after the live front sings.</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Chorus Sheets</Text>
        <View style={styles.sheetStack}>
          {sheets.map((sheet, index) => {
            const active = index === sheets.length - 1 && !state.verdict && liveRail.length > 0;
            return (
              <View key={`sheet-${index}`} style={[styles.sheetCard, active && styles.sheetCardActive]}>
                <Text style={styles.sheetTitle}>{`Wave ${index + 1}`}</Text>
                <View style={styles.sheetRow}>
                  {sheet.map((label) => (
                    <View key={`${index}-${label}`} style={styles.sheetChip}>
                      <Text style={styles.sheetChipLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          {sheets.length === 0 ? (
            <Text style={styles.emptyText}>No chorus sheet filed yet. The crown branch starts the first wave.</Text>
          ) : null}
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
            No moves yet. Ring the live front, let its children wait behind, and only swap rails once the whole wave is clear.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Chorus Rules</Text>
        <Text style={styles.infoLine}>The live rail always sings from the front.</Text>
        <Text style={styles.infoLine}>When a branch sings, any child branches join the back of the next rail.</Text>
        <Text style={styles.infoLine}>A new chorus can open only after the live rail is empty.</Text>
        <Text style={styles.infoLine}>Win by filing the whole canopy into chorus sheets before the beat budget runs out.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('advance')}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            styles.primaryButton,
            state.verdict && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Advance Wave</Text>
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
      title="Chorusbough"
      emoji="CB"
      subtitle="Cue the canopy in level-order waves. Fresh children wait their turn on the next rail."
      statsLabel={puzzle.label}
      objective="Finish the live chorus from the front, keep newly revealed children in the next rail, and file one sheet per tree level."
      helperText={puzzle.helper}
      board={board}
      controls={controls}
      difficultyOptions={DIFFICULTIES.map((option) => ({
        label: `D${option}`,
        selected: option === difficulty,
        onPress: () => switchDifficulty(option),
      }))}
      conceptBridge={{
        summary:
          'This game teaches binary-tree level order traversal with a queue. The live rail is the current frontier, the next rail is where children wait, and each chorus sheet is one completed tree level.',
        takeaway:
          'The key move is leaving a tempting child in the next rail while you finish the rest of the current frontier from the front.',
      }}
      leetcodeLinks={[
        {
          id: 102,
          title: 'Binary Tree Level Order Traversal',
          url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/',
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
    backgroundColor: '#171f23',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2f464d',
    padding: 12,
    gap: 4,
  },
  sectionCard: {
    backgroundColor: '#13191c',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#25353b',
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    color: '#d8e7ea',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#9db2b8',
    fontSize: 12,
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
    minWidth: 56,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#304048',
    backgroundColor: '#1a2328',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  nodeCardHidden: {
    backgroundColor: '#0e1315',
    borderStyle: 'dashed',
    borderColor: '#223036',
  },
  nodeCardCurrent: {
    backgroundColor: '#153241',
    borderColor: '#4ba7d7',
  },
  nodeCardNext: {
    backgroundColor: '#243019',
    borderColor: '#9cc45f',
  },
  nodeCardFiled: {
    backgroundColor: '#2b202c',
    borderColor: '#8b6cb2',
  },
  nodeCardFront: {
    transform: [{ scale: 1.04 }],
  },
  nodeLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  nodeMeta: {
    color: '#b8c8cd',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  railBlock: {
    gap: 8,
  },
  railTitle: {
    color: '#e6f1f3',
    fontSize: 14,
    fontWeight: '700',
  },
  railWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  railChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 74,
    alignItems: 'center',
    gap: 2,
  },
  liveChip: {
    backgroundColor: '#1a2934',
    borderColor: '#4ca6d4',
  },
  nextChip: {
    backgroundColor: '#24321a',
    borderColor: '#9cc45f',
  },
  frontChip: {
    backgroundColor: '#1f4254',
  },
  railChipDisabled: {
    opacity: 0.55,
  },
  railChipLabel: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  railChipMeta: {
    color: '#cad7db',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  sheetStack: {
    gap: 8,
  },
  sheetCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#34464d',
    backgroundColor: '#172024',
    padding: 12,
    gap: 8,
  },
  sheetCardActive: {
    borderColor: '#4ca6d4',
  },
  sheetTitle: {
    color: '#dfecef',
    fontSize: 13,
    fontWeight: '700',
  },
  sheetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetChip: {
    borderRadius: 999,
    backgroundColor: '#223238',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sheetChipLabel: {
    color: '#f5fbfc',
    fontSize: 13,
    fontWeight: '700',
  },
  historyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    borderRadius: 999,
    backgroundColor: '#1f2b30',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyText: {
    color: '#d0dde1',
    fontSize: 12,
  },
  emptyText: {
    color: '#97adb4',
    fontSize: 13,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#152026',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#284149',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#d2e0e4',
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b565f',
    backgroundColor: '#1b252a',
    paddingVertical: 14,
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  primaryButton: {
    backgroundColor: '#24546b',
    borderColor: '#5cb3df',
  },
  controlButtonLabel: {
    color: '#ecf6f8',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  resetButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#40525a',
    backgroundColor: '#182125',
    paddingVertical: 12,
  },
  resetButtonLabel: {
    color: '#dbe7ea',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#d9e6ea',
    fontSize: 13,
    lineHeight: 19,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#7ee2a8',
  },
  lossText: {
    color: '#ff9f94',
  },
});
