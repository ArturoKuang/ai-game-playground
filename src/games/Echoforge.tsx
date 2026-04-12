import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  canClaim,
  canReturn,
  cloneCount,
  cloneIdFor,
  cloneNeighborLabels,
  createInitialState,
  currentNodeId,
  edgeId,
  evaluateEchoforge,
  generatePuzzle,
  neighborOptions,
  nodeById,
  resolvedEdgeCount,
  trailLabels,
  type EchoforgeDifficulty,
  type EchoforgeState,
} from '../solvers/Echoforge.solver';

const DIFFICULTIES: EchoforgeDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateEchoforge();

function buildPuzzle(difficulty: EchoforgeDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Echoforge() {
  const [difficulty, setDifficulty] = useState<EchoforgeDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<EchoforgeState>(() => createInitialState(buildPuzzle(1, 0)));

  const metrics = useMemo(
    () => EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty),
    [difficulty],
  );
  const currentId = currentNodeId(state);
  const currentLabel = currentId ? nodeById(puzzle, currentId).label : 'Done';
  const nodeMap = useMemo(
    () => Object.fromEntries(puzzle.graph.nodes.map((node) => [node.id, node])),
    [puzzle.graph.nodes],
  );
  const optionList = neighborOptions(state);
  const resolvedEdges = new Set(state.resolvedEdges);
  const trail = trailLabels(state);

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

  const switchDifficulty = (nextDifficulty: EchoforgeDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Current Beacon</Text>
          <Text style={styles.summaryValue}>{currentLabel}</Text>
          <Text style={styles.summaryMeta}>
            {currentId && cloneIdFor(state, currentId)
              ? `Echo ready: ${nodeMap[currentId]!.label}'`
              : 'Forge this beacon first'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Echoes Forged</Text>
          <Text style={styles.summaryValue}>{`${cloneCount(state)}/${puzzle.graph.nodes.length}`}</Text>
          <Text style={styles.summaryMeta}>one per original beacon</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Wires Closed</Text>
          <Text style={styles.summaryValue}>{`${resolvedEdgeCount(state)}/${puzzle.edgeCount}`}</Text>
          <Text style={styles.summaryMeta}>original edges mirrored</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Traversal Trail</Text>
        <Text style={styles.trailText}>{trail.join(' -> ')}</Text>
        <Text style={styles.helperLine}>{state.message}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Original Network</Text>
        <View style={styles.nodeGrid}>
          {puzzle.graph.nodes.map((node) => {
            const isCurrent = node.id === currentId;
            const hasClone = Boolean(cloneIdFor(state, node.id));
            const unresolvedCount = node.neighbors.filter(
              (neighborId) => !resolvedEdges.has(edgeId(node.id, neighborId)),
            ).length;

            return (
              <View
                key={node.id}
                style={[
                  styles.nodeCard,
                  hasClone && styles.nodeCardForged,
                  isCurrent && styles.nodeCardCurrent,
                ]}
              >
                <Text style={styles.nodeLabel}>{node.label}</Text>
                <Text style={styles.nodeMeta}>{hasClone ? `echo ${node.label}' filed` : 'no echo yet'}</Text>
                <Text style={styles.nodeMeta}>
                  {`${node.neighbors.length} wires • ${unresolvedCount} open`}
                </Text>
                <View style={styles.badgeRow}>
                  {node.neighbors.map((neighborId) => {
                    const neighbor = nodeMap[neighborId]!;
                    const closed = resolvedEdges.has(edgeId(node.id, neighborId));
                    return (
                      <View
                        key={`${node.id}-${neighborId}`}
                        style={[styles.badge, closed ? styles.badgeClosed : styles.badgeOpen]}
                      >
                        <Text style={styles.badgeText}>{neighbor.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Mirror Hall</Text>
        {state.clones.length > 0 ? (
          <View style={styles.nodeGrid}>
            {state.clones.map((clone) => {
              const neighbors = cloneNeighborLabels(state, clone.originalId);
              return (
                <View key={clone.id} style={styles.cloneCard}>
                  <Text style={styles.nodeLabel}>{clone.label}</Text>
                  <Text style={styles.nodeMeta}>{`from ${nodeMap[clone.originalId]!.label}`}</Text>
                  <Text style={styles.nodeMeta}>
                    {neighbors.length > 0 ? `links: ${neighbors.join(', ')}` : 'links: none yet'}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>No echoes forged yet. The registry starts empty.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Forge Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.logWrap}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.logText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No actions yet. Forge the root beacon before you move anywhere else.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLine}>Forge Echo creates the one stored mirror for the current original beacon.</Text>
        <Text style={styles.infoLine}>Descend moves into an unmirrored neighbor so its echo can be forged next.</Text>
        <Text style={styles.infoLine}>Link Existing closes a wire onto a beacon whose echo is already stored.</Text>
        <Text style={styles.infoLine}>Return is legal only after the current beacon has no open wires left.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={!currentId || Boolean(cloneIdFor(state, currentId)) || Boolean(state.verdict)}
          onPress={() => setState((current) => applyMove(current, { type: 'forge' }))}
          style={[
            styles.controlButton,
            styles.primaryButton,
            (!currentId || Boolean(cloneIdFor(state, currentId)) || state.verdict) &&
              styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Forge Echo</Text>
        </Pressable>
      </View>

      <View style={styles.actionWrap}>
        {optionList.length > 0 ? (
          optionList.map((option) => {
            const neighbor = nodeMap[option.neighborId]!;
            const label = option.kind === 'link' ? `Link Existing ${neighbor.label}` : `Descend ${neighbor.label}`;
            return (
              <Pressable
                key={`${option.kind}-${option.neighborId}`}
                disabled={Boolean(state.verdict)}
                onPress={() =>
                  setState((current) => applyMove(current, { type: 'travel', neighborId: option.neighborId }))
                }
                style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
              >
                <Text style={styles.controlButtonLabel}>{label}</Text>
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No open neighbor wires from the current beacon.</Text>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={!canReturn(state) || Boolean(state.verdict)}
          onPress={() => setState((current) => applyMove(current, { type: 'return' }))}
          style={[styles.controlButton, (!canReturn(state) || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Return</Text>
        </Pressable>
        <Pressable
          disabled={!canClaim(state) || Boolean(state.verdict)}
          onPress={() => setState((current) => applyMove(current, { type: 'claim' }))}
          style={[
            styles.controlButton,
            (!canClaim(state) || state.verdict) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.controlButtonLabel}>Seal Copy</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Hall</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Graph</Text>
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
      title="Echoforge"
      emoji="EF"
      subtitle="Forge one echo the first time you touch a beacon, then close every later wire onto that stored echo instead of minting a duplicate."
      objective="Finish with exactly one echoed beacon per original node and one mirrored wire per original edge."
      statsLabel={`${puzzle.label} • ${metrics ? `${Math.round(metrics.skillDepth * 100)}% depth` : 'graph clone'}`}
      difficultyOptions={DIFFICULTIES.map((level) => ({
        label: `D${level}`,
        selected: level === difficulty,
        onPress: () => switchDifficulty(level),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        summary:
          'Echoforge teaches graph cloning with a memo map: first touch creates and stores one clone, and every later revisit reuses that stored node while the traversal closes more edges.',
        takeaway:
          "The move where you link an older beacon's stored echo maps to the `if (copies.has(node)) return copies.get(node)` branch in Clone Graph.",
      }}
      leetcodeLinks={[
        {
          id: 133,
          title: 'Clone Graph',
          url: 'https://leetcode.com/problems/clone-graph/',
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
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 16,
    backgroundColor: '#171d29',
    borderWidth: 1,
    borderColor: '#2f405b',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#97abc8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#f1f6ff',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#bfd0ea',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#131926',
    borderWidth: 1,
    borderColor: '#26354d',
    padding: 14,
    gap: 10,
  },
  helperLine: {
    color: '#d7e4f7',
    fontSize: 14,
    lineHeight: 20,
  },
  trailText: {
    color: '#f1f6ff',
    fontSize: 17,
    fontWeight: '700',
  },
  nodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  nodeCard: {
    width: 148,
    borderRadius: 16,
    padding: 12,
    gap: 6,
    backgroundColor: '#1a2231',
    borderWidth: 1,
    borderColor: '#31425f',
  },
  nodeCardForged: {
    borderColor: '#5e8de2',
    backgroundColor: '#18243d',
  },
  nodeCardCurrent: {
    borderColor: '#e0b24d',
    backgroundColor: '#372a15',
  },
  cloneCard: {
    width: 148,
    borderRadius: 16,
    padding: 12,
    gap: 6,
    backgroundColor: '#1a2533',
    borderWidth: 1,
    borderColor: '#4a678f',
  },
  nodeLabel: {
    color: '#f4f7ff',
    fontSize: 18,
    fontWeight: '800',
  },
  nodeMeta: {
    color: '#c5d4e8',
    fontSize: 13,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeOpen: {
    backgroundColor: '#472b33',
  },
  badgeClosed: {
    backgroundColor: '#214333',
  },
  badgeText: {
    color: '#f4f7ff',
    fontSize: 12,
    fontWeight: '700',
  },
  logWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    borderRadius: 999,
    backgroundColor: '#202c3f',
    borderWidth: 1,
    borderColor: '#3a537a',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logText: {
    color: '#e6eefb',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#c5d4e8',
    fontSize: 14,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#171d29',
    borderWidth: 1,
    borderColor: '#2f405b',
    padding: 12,
    gap: 8,
  },
  infoLine: {
    color: '#d6e4f6',
    fontSize: 14,
    lineHeight: 20,
  },
  actionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlButton: {
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#425b83',
    backgroundColor: '#1d2840',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlButtonLabel: {
    color: '#edf4ff',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#2f5fb4',
    borderColor: '#7ea6ee',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  resetButton: {
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#425b83',
    backgroundColor: '#141c2b',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonLabel: {
    color: '#dbe7f8',
    fontSize: 14,
    fontWeight: '700',
  },
  verdictText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  winText: {
    color: '#73d5a1',
  },
  lossText: {
    color: '#f2a7a7',
  },
});
