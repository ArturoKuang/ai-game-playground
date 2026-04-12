import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  discoveredEdges,
  evaluateLexiforge,
  generatePuzzle,
  readyRunes,
  unresolvedPairIndices,
  type LexiforgeDifficulty,
  type LexiforgeState,
} from '../solvers/Lexiforge.solver';

const DIFFICULTIES: LexiforgeDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateLexiforge();

function buildPuzzle(difficulty: LexiforgeDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Lexiforge() {
  const [difficulty, setDifficulty] = useState<LexiforgeDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<LexiforgeState>(() => createInitialState(buildPuzzle(1, 0)));

  const metrics = EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty);
  const unresolved = unresolvedPairIndices(state);
  const ready = readyRunes(state);
  const discovered = discoveredEdges(state);
  const placed = new Set(state.placed);

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

  const switchDifficulty = (nextDifficulty: LexiforgeDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Pairs Read</Text>
          <Text style={styles.summaryValue}>{`${state.inspectedPairs.length}/${puzzle.pairs.length}`}</Text>
          <Text style={styles.summaryMeta}>adjacent shelf checks</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Runes Placed</Text>
          <Text style={styles.summaryValue}>{`${state.placed.length}/${puzzle.letters.length}`}</Text>
          <Text style={styles.summaryMeta}>alphabet slots sealed</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ready Rail</Text>
          <Text style={styles.summaryValue}>{`${state.ready.length}`}</Text>
          <Text style={styles.summaryMeta}>
            {state.phase === 'compare' ? 'waits for clues' : 'zero-seal runes'}
          </Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Shelf Words</Text>
        <View style={styles.wordRow}>
          {puzzle.words.map((word, index) => (
            <View key={`${word}-${index}`} style={styles.wordChip}>
              <Text style={styles.wordChipText}>{word}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.helperLine}>{state.message}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Adjacent Pairs</Text>
        <View style={styles.pairStack}>
          {puzzle.pairs.map((pair) => {
            const inspected = state.inspectedPairs.includes(pair.index);
            const invalid = state.invalidPairIndex === pair.index;
            return (
              <View
                key={`${pair.leftWord}-${pair.rightWord}-${pair.index}`}
                style={[
                  styles.pairCard,
                  inspected && styles.pairCardInspected,
                  invalid && styles.pairCardInvalid,
                ]}
              >
                <View style={styles.pairHeader}>
                  <Text style={styles.pairTitle}>{`${pair.leftWord} -> ${pair.rightWord}`}</Text>
                  <Text style={styles.pairStatus}>{inspected ? pair.kind.replace('_', ' ') : 'unread'}</Text>
                </View>
                <Text style={styles.pairMeta}>
                  {inspected
                    ? pair.summary
                    : 'Unread: inspect this neighboring pair to reveal whether it adds one rune rule, none, or a prefix breach.'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Rule Ledger</Text>
        {discovered.length > 0 ? (
          <View style={styles.chipWrap}>
            {discovered.map((edge) => (
              <View key={`${edge.before}-${edge.after}`} style={[styles.courseChip, styles.readyChip]}>
                <Text style={styles.courseChipText}>{`${edge.before} < ${edge.after}`}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No rune rules revealed yet.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Rune Rail</Text>
        {state.phase === 'compare' ? (
          <Text style={styles.emptyText}>Finish the shelf comparisons before the rune rail opens.</Text>
        ) : (
          <View style={styles.catalogGrid}>
            {puzzle.runes.map((rune) => {
              const isPlaced = placed.has(rune.id);
              const isReady = state.ready.includes(rune.id);
              return (
                <View
                  key={rune.id}
                  style={[
                    styles.courseCard,
                    isPlaced && styles.courseCardCompleted,
                    isReady && styles.courseCardReady,
                  ]}
                >
                  <View style={styles.courseHeader}>
                    <Text style={styles.courseLabel}>{rune.id}</Text>
                    <Text style={styles.courseStatus}>
                      {isPlaced ? 'placed' : isReady ? 'ready' : `${state.remainingIncoming[rune.id]} seals`}
                    </Text>
                  </View>
                  <Text style={styles.courseMeta}>
                    {rune.incomingIds.length === 0 ? 'Needs: none' : `Needs: ${rune.incomingIds.join(', ')}`}
                  </Text>
                  <Text style={styles.courseMeta}>
                    {rune.outgoingIds.length === 0 ? 'Frees: none' : `Frees: ${rune.outgoingIds.join(', ')}`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
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
          <Text style={styles.emptyText}>No audit actions yet.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLine}>Inspect only adjacent words from the shelf order.</Text>
        <Text style={styles.infoLine}>Each pair can add at most one rune rule: the first split decides it.</Text>
        <Text style={styles.infoLine}>If a longer word stands before its own prefix, declare the shelf invalid.</Text>
        <Text style={styles.infoLine}>After all clues are read, place only ready runes with zero incoming seals.</Text>
      </View>

      {state.phase === 'compare' && state.invalidPairIndex === null ? (
        <View style={styles.actionWrap}>
          {unresolved.map((pairIndex) => {
            const pair = puzzle.pairs[pairIndex]!;
            return (
              <Pressable
                key={`inspect-${pair.index}`}
                disabled={Boolean(state.verdict)}
                onPress={() => setState((current) => applyMove(current, { type: 'inspect_pair', pairIndex: pair.index }))}
                style={[styles.controlButton, styles.primaryButton, state.verdict && styles.controlButtonDisabled]}
              >
                <Text style={styles.primaryButtonLabel}>{`Inspect ${pair.leftWord} / ${pair.rightWord}`}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {state.phase === 'order' ? (
        <View style={styles.actionWrap}>
          {ready.length > 0 ? (
            ready.map((rune) => (
              <Pressable
                key={`place-${rune.id}`}
                disabled={Boolean(state.verdict)}
                onPress={() => setState((current) => applyMove(current, { type: 'place_rune', runeId: rune.id }))}
                style={[styles.controlButton, styles.primaryButton, state.verdict && styles.controlButtonDisabled]}
              >
                <Text style={styles.primaryButtonLabel}>{`Place ${rune.id}`}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>No ready rune remains on the rail.</Text>
          )}
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          disabled={Boolean(state.verdict)}
          onPress={() => setState((current) => applyMove(current, { type: 'declare_invalid' }))}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Declare Invalid</Text>
        </Pressable>
        <Pressable
          disabled={Boolean(state.verdict)}
          onPress={() => setState((current) => applyMove(current, { type: 'declare_cycle' }))}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Call Cycle</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={Boolean(state.verdict)}
          onPress={() => setState((current) => applyMove(current, { type: 'claim' }))}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Seal Alphabet</Text>
        </Pressable>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Shelf</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Shelf</Text>
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
      title="Lexiforge"
      emoji="LX"
      subtitle="Read a sorted alien shelf, forge one rune rule from each neighboring split, and peel the zero-seal rail into an alphabet."
      objective="Compare adjacent words only. Stop at the first split, flag any prefix breach, then place ready runes until the alphabet seals or the rail proves a cycle."
      statsLabel={`${puzzle.label} • ${metrics ? `${Math.round(metrics.skillDepth * 100)}% depth` : 'alien shelf'}`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Shelf', onPress: rerollPuzzle, tone: 'primary' },
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
          'Lexiforge teaches Alien Dictionary directly: compare each adjacent word pair, stop at the first differing rune to add one precedence edge, reject a longer-before-prefix pair immediately, then run Kahn-style zero-indegree peeling over the discovered rune graph.',
        takeaway:
          'Reading one shelf pair maps to the adjacent-word comparison loop. The first split forging one rune rule maps to `break` after the first differing character. Declaring invalid maps to the longer-word-before-prefix check. The ready rail maps to the zero-indegree queue used to produce the alien alphabet or prove a cycle.',
      }}
      leetcodeLinks={[
        {
          id: 269,
          title: 'Alien Dictionary',
          url: 'https://leetcode.com/problems/alien-dictionary/',
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
    backgroundColor: '#17181c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c323e',
    padding: 12,
    gap: 4,
  },
  summaryValue: {
    color: '#f4f7fb',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#97a2b7',
    fontSize: 12,
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: '#17181c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c323e',
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    color: '#eef2f8',
    fontSize: 16,
    fontWeight: '800',
  },
  helperLine: {
    color: '#cbd6ea',
    fontSize: 13,
    lineHeight: 18,
  },
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#243041',
    borderWidth: 1,
    borderColor: '#405471',
  },
  wordChipText: {
    color: '#eef2f8',
    fontSize: 13,
    fontWeight: '700',
  },
  pairStack: {
    gap: 10,
  },
  pairCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#303646',
    backgroundColor: '#1d2027',
    padding: 12,
    gap: 8,
  },
  pairCardInspected: {
    borderColor: '#4b7fd1',
    backgroundColor: '#1d2840',
  },
  pairCardInvalid: {
    borderColor: '#d26a5c',
    backgroundColor: '#3a221f',
  },
  pairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  pairTitle: {
    color: '#eef2f8',
    fontSize: 14,
    fontWeight: '700',
  },
  pairStatus: {
    color: '#a9b4c8',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  pairMeta: {
    color: '#c8d4e8',
    fontSize: 13,
    lineHeight: 18,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  courseChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  readyChip: {
    backgroundColor: '#203d34',
    borderColor: '#3f9272',
  },
  courseChipText: {
    color: '#eef2f8',
    fontSize: 12,
    fontWeight: '700',
  },
  catalogGrid: {
    gap: 10,
  },
  courseCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#303646',
    backgroundColor: '#1d2027',
    padding: 12,
    gap: 6,
  },
  courseCardReady: {
    borderColor: '#4b7fd1',
    backgroundColor: '#1d2840',
  },
  courseCardCompleted: {
    borderColor: '#3f9272',
    backgroundColor: '#1f312d',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  courseLabel: {
    color: '#eef2f8',
    fontSize: 17,
    fontWeight: '800',
  },
  courseStatus: {
    color: '#97a2b7',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  courseMeta: {
    color: '#c8d4e8',
    fontSize: 12,
    lineHeight: 16,
  },
  logWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#202734',
    borderWidth: 1,
    borderColor: '#38455d',
  },
  logText: {
    color: '#d7dfec',
    fontSize: 12,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 14,
    backgroundColor: '#1c2431',
    borderWidth: 1,
    borderColor: '#34455d',
    padding: 12,
    gap: 6,
  },
  infoLine: {
    color: '#dce6f6',
    fontSize: 13,
    lineHeight: 18,
  },
  actionWrap: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  controlButton: {
    flexGrow: 1,
    minWidth: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#455268',
    backgroundColor: '#212632',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#eef2f8',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#355ea8',
    borderColor: '#5f89d6',
  },
  primaryButtonLabel: {
    color: '#f6f8fc',
    fontSize: 13,
    fontWeight: '800',
  },
  resetButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2a313e',
    borderWidth: 1,
    borderColor: '#434f66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonLabel: {
    color: '#eef2f8',
    fontSize: 13,
    fontWeight: '700',
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#79d5ad',
  },
  lossText: {
    color: '#f09c93',
  },
  emptyText: {
    color: '#97a2b7',
    fontSize: 13,
    lineHeight: 18,
  },
});
