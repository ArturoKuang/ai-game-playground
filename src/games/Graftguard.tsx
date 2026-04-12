import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentAuditLane,
  currentSearchBranch,
  evaluateGraftguard,
  generatePuzzle,
  hostRows,
  isAuditHostNode,
  isAuditPatternNode,
  isClearedHostNode,
  isFailedProbeNode,
  isFocusedHostNode,
  patternRows,
  remainingBranches,
  type GraftguardDifficulty,
  type GraftguardState,
} from '../solvers/Graftguard.solver';

const DIFFICULTIES: GraftguardDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateGraftguard();

function buildPuzzle(difficulty: GraftguardDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function nodeText(label: string | null | undefined) {
  return label ?? 'empty';
}

export default function Graftguard() {
  const [difficulty, setDifficulty] = useState<GraftguardDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<GraftguardState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: GraftguardDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'probe' | 'clear' | 'check' | 'left' | 'right' | 'up') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const search = currentSearchBranch(state);
  const audit = currentAuditLane(state);
  const hostTreeRows = useMemo(() => hostRows(state), [state]);
  const patternTreeRows = useMemo(() => patternRows(state), [state]);
  const branchesLeft = remainingBranches(state);
  const metrics = EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty);
  const inAudit = Boolean(state.audit);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Mode</Text>
          <Text style={styles.summaryValue}>{inAudit ? 'Audit' : 'Search'}</Text>
          <Text style={styles.summaryMeta}>{inAudit ? 'candidate open' : 'host branch sweep'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Bark Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>actions used</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Branches Left</Text>
          <Text style={styles.summaryValue}>{branchesLeft}</Text>
          <Text style={styles.summaryMeta}>uncleared host nodes</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Current Branch</Text>
        <View style={styles.readingRow}>
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>Host Crest</Text>
            <Text style={styles.readingValue}>{nodeText(search.node?.label)}</Text>
            <Text style={styles.readingMeta}>{search.key}</Text>
          </View>
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>Probe Here</Text>
            <Text style={styles.readingValue}>{search.probeFailed ? 'failed' : inAudit ? 'open' : 'live'}</Text>
            <Text style={styles.readingMeta}>
              {search.probeFailed ? 'candidate disproved' : inAudit ? 'paired comparison' : 'not cleared yet'}
            </Text>
          </View>
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>Clear Status</Text>
            <Text style={styles.readingValue}>{search.canClear ? 'ready' : 'wait'}</Text>
            <Text style={styles.readingMeta}>clear after both child searches</Text>
          </View>
        </View>
        <Text style={styles.helperLine}>
          {inAudit
            ? `Candidate root ${audit.anchorPath.length === 0 ? 'root' : audit.anchorPath} is open. Finish the paired proof before drifting away.`
            : `Left branch: ${search.leftStatus}. Right branch: ${search.rightStatus}.`}
        </Text>
      </View>

      {inAudit ? (
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Pair Window</Text>
          <View style={styles.readingRow}>
            <View style={styles.readingCard}>
              <Text style={styles.readingLabel}>Host</Text>
              <Text style={styles.readingValue}>{nodeText(audit.hostNode?.label)}</Text>
              <Text style={styles.readingMeta}>{`${audit.anchorPath}${audit.path}` || 'root'}</Text>
            </View>
            <View style={styles.readingCard}>
              <Text style={styles.readingLabel}>Pattern</Text>
              <Text style={styles.readingValue}>{nodeText(audit.patternNode?.label)}</Text>
              <Text style={styles.readingMeta}>{audit.path || 'root'}</Text>
            </View>
            <View style={styles.readingCard}>
              <Text style={styles.readingLabel}>Check</Text>
              <Text style={styles.readingValue}>{audit.checkStatus}</Text>
              <Text style={styles.readingMeta}>
                {audit.directMismatch ? 'break exposed' : 'finish child lanes first when pending'}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.treeRowWrap}>
        <View style={styles.treeCard}>
          <Text style={styles.cardTitle}>Host Grove</Text>
          <View style={styles.treeStack}>
            {hostTreeRows.map((row, depth) => (
              <View key={`host-${depth}`} style={styles.treeRow}>
                {row.map((nodeId, column) => {
                  if (nodeId === null) {
                    return <View key={`host-empty-${depth}-${column}`} style={styles.nodeSlot} />;
                  }

                  const node = puzzle.hostNodes[nodeId];
                  return (
                    <View
                      key={`host-node-${nodeId}`}
                      style={[
                        styles.nodeSlot,
                        styles.nodeCard,
                        isFocusedHostNode(state, nodeId) && styles.hostNodeFocused,
                        isAuditHostNode(state, nodeId) && styles.auditNodeFocused,
                        isClearedHostNode(state, nodeId) && styles.clearedNode,
                        isFailedProbeNode(state, nodeId) && styles.failedNode,
                      ]}
                    >
                      <Text style={styles.nodeLabel}>{node.label}</Text>
                      <Text style={styles.nodeMeta}>
                        {isClearedHostNode(state, nodeId)
                          ? 'clear'
                          : isFailedProbeNode(state, nodeId)
                            ? 'fail'
                            : `d${node.depth}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.treeCard}>
          <Text style={styles.cardTitle}>Pattern Sprig</Text>
          <View style={styles.treeStack}>
            {patternTreeRows.map((row, depth) => (
              <View key={`pattern-${depth}`} style={styles.treeRow}>
                {row.map((nodeId, column) => {
                  if (nodeId === null) {
                    return <View key={`pattern-empty-${depth}-${column}`} style={styles.nodeSlot} />;
                  }

                  const node = puzzle.patternNodes[nodeId];
                  return (
                    <View
                      key={`pattern-node-${nodeId}`}
                      style={[
                        styles.nodeSlot,
                        styles.nodeCard,
                        isAuditPatternNode(state, nodeId) && styles.auditNodeFocused,
                      ]}
                    >
                      <Text style={styles.nodeLabel}>{node.label}</Text>
                      <Text style={styles.nodeMeta}>{`d${node.depth}`}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
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
            No moves yet. Test the current branch first, then only clear it after both child branches are already ruled out.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>{inAudit ? 'Audit Rules' : 'Search Rules'}</Text>
        {inAudit ? (
          <>
            <Text style={styles.infoLine}>Check Pair exposes the first host-vs-pattern break immediately.</Text>
            <Text style={styles.infoLine}>A matching pair can certify only after both live child lanes are already safe.</Text>
            <Text style={styles.infoLine}>A full root certification wins the run instantly.</Text>
          </>
        ) : (
          <>
            <Text style={styles.infoLine}>Probe Here tests whether the whole pattern can start on the current host branch.</Text>
            <Text style={styles.infoLine}>If the local probe fails, search the left and right child branches before clearing this branch.</Text>
            <Text style={styles.infoLine}>Clearing the crown proves no graft exists anywhere in the host grove.</Text>
          </>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove(inAudit ? 'check' : 'probe')}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            styles.primaryButton,
            state.verdict && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>{inAudit ? 'Check Pair' : 'Probe Here'}</Text>
        </Pressable>
        {!inAudit ? (
          <Pressable
            onPress={() => runMove('clear')}
            disabled={Boolean(state.verdict)}
            style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
          >
            <Text style={styles.controlButtonLabel}>Clear Branch</Text>
          </Pressable>
        ) : null}
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
          <Text style={styles.controlButtonLabel}>{inAudit ? 'Audit Up' : 'Climb Up'}</Text>
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
        <Text style={styles.cardTitle}>Status</Text>
        <Text style={styles.summaryValue}>{state.verdict?.correct ? 'Solved' : state.verdict ? 'Missed' : 'Live'}</Text>
        <Text style={styles.summaryMeta}>{state.verdict?.label ?? state.message}</Text>
      </View>
    </View>
  );

  return (
    <GameScreenTemplate
      title="Graftguard"
      emoji="GG"
      subtitle={puzzle.title}
      objective="Find a full graft match somewhere in the host grove, or clear every branch if no graft fits."
      statsLabel={
        metrics
          ? `D${difficulty} • skill ${Math.round(metrics.skillDepth * 100)}% • alt ${Math.round(metrics.altSolvability * 100)}%`
          : `D${difficulty}`
      }
      actions={[
        { label: 'Reset Grove', onPress: () => resetPuzzle() },
        { label: 'New Grove', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((option) => ({
        label: `D${option}`,
        selected: option === difficulty,
        onPress: () => switchDifficulty(option),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        summary:
          'This game teaches subtree search on binary trees: test whether the full pattern matches at the current branch, and if it does not, recurse into the left and right host branches before clearing the current branch.',
        takeaway:
          'The moment where a failed local probe still leaves child branches to search maps to `same(node, subRoot) || isSubtree(node.left, subRoot) || isSubtree(node.right, subRoot)`.',
      }}
      leetcodeLinks={[
        {
          id: 572,
          title: 'Subtree of Another Tree',
          url: 'https://leetcode.com/problems/subtree-of-another-tree/',
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
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#141b1d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#264148',
    padding: 12,
    gap: 4,
  },
  sectionCard: {
    backgroundColor: '#141b1d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#264148',
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    color: '#8bd0b4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#f1f5f2',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#a2b9b0',
    fontSize: 12,
    lineHeight: 18,
  },
  readingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  readingCard: {
    flex: 1,
    backgroundColor: '#102326',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  readingLabel: {
    color: '#8bd0b4',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  readingValue: {
    color: '#f5faf7',
    fontSize: 20,
    fontWeight: '800',
  },
  readingMeta: {
    color: '#a2b9b0',
    fontSize: 12,
    lineHeight: 17,
  },
  helperLine: {
    color: '#d7ebe1',
    fontSize: 13,
    lineHeight: 19,
  },
  treeRowWrap: {
    gap: 12,
  },
  treeCard: {
    backgroundColor: '#141b1d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#264148',
    padding: 14,
    gap: 10,
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
    width: 54,
    minHeight: 48,
  },
  nodeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#35525a',
    backgroundColor: '#102326',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 2,
  },
  hostNodeFocused: {
    borderColor: '#7ae582',
    backgroundColor: '#193323',
  },
  auditNodeFocused: {
    borderColor: '#ffd166',
    backgroundColor: '#3a2d14',
  },
  clearedNode: {
    borderColor: '#55c1ff',
    backgroundColor: '#143446',
  },
  failedNode: {
    borderColor: '#ff8f70',
    backgroundColor: '#432018',
  },
  nodeLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  nodeMeta: {
    color: '#c8d7d1',
    fontSize: 11,
    fontWeight: '700',
  },
  historyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    borderRadius: 999,
    backgroundColor: '#102326',
    borderWidth: 1,
    borderColor: '#35525a',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyText: {
    color: '#dce7e2',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#c8d7d1',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#102326',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  infoLine: {
    color: '#dce7e2',
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#35525a',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102326',
    paddingHorizontal: 10,
  },
  primaryButton: {
    backgroundColor: '#2c8a57',
    borderColor: '#62d492',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#e7f1ec',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#f7fff9',
    fontSize: 13,
    fontWeight: '800',
  },
});
