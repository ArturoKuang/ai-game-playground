import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  acceptedCount,
  applyMove,
  campDegree,
  clanFor,
  clanSize,
  componentsCount,
  createInitialState,
  currentProposal,
  evaluateRootbond,
  flaggedCount,
  generatePuzzle,
  processedProposalIds,
  type RootbondDifficulty,
  type RootbondState,
} from '../solvers/Rootbond.solver';

const DIFFICULTIES: RootbondDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateRootbond();

function buildPuzzle(difficulty: RootbondDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function crestColor(crest: string) {
  const palette = ['#f97316', '#22c55e', '#38bdf8', '#facc15', '#f472b6', '#a78bfa', '#fb7185', '#34d399', '#fde047'];
  return palette[(crest.charCodeAt(0) - 65) % palette.length]!;
}

export default function Rootbond() {
  const [difficulty, setDifficulty] = useState<RootbondDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<RootbondState>(() => createInitialState(buildPuzzle(1, 0)));

  const metrics = useMemo(
    () => EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty),
    [difficulty],
  );
  const proposal = currentProposal(state);
  const resolved = processedProposalIds(state);

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

  const switchDifficulty = (nextDifficulty: RootbondDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Pending Charter</Text>
          <Text style={styles.summaryValue}>{proposal ? `${proposal.a} - ${proposal.b}` : 'complete'}</Text>
          <Text style={styles.summaryMeta}>
            {proposal ? `${state.currentIndex + 1}/${puzzle.proposals.length} ropes` : 'ready for final call'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Realms Left</Text>
          <Text style={styles.summaryValue}>{componentsCount(state)}</Text>
          <Text style={styles.summaryMeta}>live clan crests</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ropes</Text>
          <Text style={styles.summaryValue}>{`${acceptedCount(state)} / ${flaggedCount(state)}`}</Text>
          <Text style={styles.summaryMeta}>bound / flagged</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Charter Queue</Text>
        <View style={styles.queueWrap}>
          {puzzle.proposals.map((entry, index) => {
            const isCurrent = index === state.currentIndex;
            const wasBound = state.accepted.includes(entry.id);
            const wasFlagged = state.flagged.includes(entry.id);
            return (
              <View
                key={`${entry.id}-${index}`}
                style={[
                  styles.queueChip,
                  isCurrent && styles.queueChipCurrent,
                  wasBound && styles.queueChipBound,
                  wasFlagged && styles.queueChipFlagged,
                ]}
              >
                <Text style={styles.queueText}>{`${entry.a}-${entry.b}`}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.helperLine}>{state.message}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Camp Crests</Text>
        <View style={styles.campGrid}>
          {puzzle.camps.map((camp) => {
            const crest = clanFor(state, camp);
            const degree = campDegree(state, camp);
            return (
              <View key={camp} style={styles.campCard}>
                <View style={styles.campHeader}>
                  <Text style={styles.campLabel}>{camp}</Text>
                  <View style={[styles.crestBadge, { backgroundColor: crestColor(crest) }]}>
                    <Text style={styles.crestText}>{crest}</Text>
                  </View>
                </View>
                <Text style={styles.campMeta}>{`realm size ${clanSize(state, crest)}`}</Text>
                <Text style={styles.campMeta}>{`${degree} bound rope${degree === 1 ? '' : 's'}`}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Rope Ledger</Text>
        <View style={styles.ledgerWrap}>
          {puzzle.proposals.map((entry) => {
            const status = state.accepted.includes(entry.id)
              ? 'bound'
              : state.flagged.includes(entry.id)
                ? 'flagged'
                : resolved.has(entry.id)
                  ? 'done'
                  : 'pending';
            return (
              <View key={`ledger-${entry.id}`} style={styles.ledgerChip}>
                <Text style={styles.ledgerText}>{`${entry.a}-${entry.b} • ${status}`}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Audit Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.logWrap}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.logText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No rulings yet. Start with the current charter rope.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLine}>Bind Charter only when the two camps still show different clan crests.</Text>
        <Text style={styles.infoLine}>Flag Loop only when both camps already live under the same crest.</Text>
        <Text style={styles.infoLine}>At the end, certify only if the full charter leaves one realm and no flagged loop ropes.</Text>
        <Text style={styles.infoLine}>If the charter leaves several realms or ever exposes a loop rope, reject it.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={!proposal || Boolean(state.verdict)}
          onPress={() => setState((current) => applyMove(current, { type: 'bind' }))}
          style={[styles.controlButton, styles.primaryButton, (!proposal || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.primaryButtonLabel}>Bind Charter</Text>
        </Pressable>
        <Pressable
          disabled={!proposal || Boolean(state.verdict)}
          onPress={() => setState((current) => applyMove(current, { type: 'flag' }))}
          style={[styles.controlButton, (!proposal || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Flag Loop</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={Boolean(proposal) || Boolean(state.verdict)}
          onPress={() => setState((current) => applyMove(current, { type: 'certify' }))}
          style={[styles.controlButton, (proposal || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Certify Tree</Text>
        </Pressable>
        <Pressable
          disabled={Boolean(proposal) || Boolean(state.verdict)}
          onPress={() => setState((current) => applyMove(current, { type: 'reject' }))}
          style={[styles.controlButton, (proposal || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Reject Charter</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Audit</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Charter</Text>
        </Pressable>
      </View>

      {state.verdict ? (
        <Text style={[styles.verdictText, state.verdict.correct ? styles.winText : styles.lossText]}>
          {state.verdict.label}
        </Text>
      ) : null}
    </View>
  );

  return (
    <GameScreenTemplate
      title="Rootbond"
      emoji="RB"
      subtitle="Audit one realm charter at a time: merge different clan crests, flag same-crest loops, and certify only one clean crown."
      objective="Process every rope. Bind only different crests, flag loop ropes, then decide whether the full charter forms one valid tree."
      statsLabel={`${puzzle.label} • ${metrics ? `${Math.round(metrics.skillDepth * 100)}% depth` : 'clan audit'}`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Charter', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((entry) => ({
        label: `D${entry}`,
        selected: entry === difficulty,
        onPress: () => switchDifficulty(entry),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        summary:
          'Rootbond teaches union-find through live realm tracking: every camp starts in its own clan, a safe rope unions two different clans, and the Realms Left counter shows how many connected groups still remain after each merge. That same audit also exposes when a same-clan rope would create a cycle.',
        takeaway:
          'The live crest on each camp maps to its current root representative. Binding a different-crest rope maps to `union(a, b)`, the Realms Left counter maps directly to the component count for `#323`, and flagging a same-crest rope plus ending on one realm maps to the cycle-and-connectivity checks for `#261`.',
      }}
      leetcodeLinks={[
        {
          id: 261,
          title: 'Graph Valid Tree',
          url: 'https://leetcode.com/problems/graph-valid-tree/',
        },
        {
          id: 323,
          title: 'Number of Connected Components in an Undirected Graph',
          url: 'https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/',
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
    backgroundColor: '#17191f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#313543',
    padding: 12,
    gap: 6,
  },
  cardTitle: {
    color: '#c8d0dc',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#151720',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2f3c',
    padding: 14,
    gap: 10,
  },
  helperLine: {
    color: '#dbe4ee',
    fontSize: 13,
    lineHeight: 19,
  },
  queueWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  queueChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3a4050',
    backgroundColor: '#1b1f2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  queueChipCurrent: {
    borderColor: '#f59e0b',
    backgroundColor: '#3b2a0e',
  },
  queueChipBound: {
    borderColor: '#22c55e',
    backgroundColor: '#113120',
  },
  queueChipFlagged: {
    borderColor: '#f87171',
    backgroundColor: '#3a1515',
  },
  queueText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  campGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  campCard: {
    width: '31%',
    minWidth: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#353b4d',
    backgroundColor: '#1b1f2a',
    padding: 12,
    gap: 6,
  },
  campHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  campLabel: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  crestBadge: {
    minWidth: 28,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  crestText: {
    color: '#101114',
    fontSize: 12,
    fontWeight: '800',
  },
  campMeta: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  ledgerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ledgerChip: {
    borderRadius: 999,
    backgroundColor: '#222736',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ledgerText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  logWrap: {
    gap: 8,
  },
  logChip: {
    borderRadius: 14,
    backgroundColor: '#202432',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logText: {
    color: '#e5edf7',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#101623',
    borderWidth: 1,
    borderColor: '#293043',
    padding: 12,
    gap: 8,
  },
  infoLine: {
    color: '#d7e0ea',
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#475062',
    backgroundColor: '#1d2330',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  primaryButton: {
    borderColor: '#f59e0b',
    backgroundColor: '#402b05',
  },
  controlButtonLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#fde68a',
    fontSize: 14,
    fontWeight: '800',
  },
  resetButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#2a3140',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  winText: {
    color: '#4ade80',
  },
  lossText: {
    color: '#f87171',
  },
});
