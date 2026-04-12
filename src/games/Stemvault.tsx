import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  buildPuzzle,
  createInitialState,
  currentTask,
  evaluateStemvault,
  groupedNodes,
  hasNextStem,
  nextLetter,
  visibleWords,
  type StemvaultDifficulty,
  type StemvaultTask,
  type StemvaultState,
} from '../solvers/Stemvault.solver';

const DIFFICULTIES: StemvaultDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateStemvault();

function taskVerb(task: StemvaultTask | null) {
  if (!task) return 'Archive complete';
  if (task.kind === 'insert') return 'File word';
  if (task.kind === 'search') return 'Word warrant';
  return 'Stem warrant';
}

function taskSummary(task: StemvaultTask | null) {
  if (!task) return 'No open order.';
  return `${taskVerb(task)}: ${task.text}`;
}

function nodeSizeFor(depth: number) {
  if (depth === 0) return 84;
  if (depth <= 2) return 72;
  return 64;
}

export default function Stemvault() {
  const [difficulty, setDifficulty] = useState<StemvaultDifficulty>(1);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1));
  const [state, setState] = useState<StemvaultState>(() => createInitialState(buildPuzzle(1)));

  const metrics = useMemo(
    () => EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty),
    [difficulty],
  );
  const task = currentTask(state);
  const need = nextLetter(state);
  const grouped = groupedNodes(state);
  const storedWords = visibleWords(state);
  const sharedStemExists = hasNextStem(state);

  const resetPuzzle = (nextPuzzle = puzzle) => {
    setPuzzle(nextPuzzle);
    setState(createInitialState(nextPuzzle));
  };

  const switchDifficulty = (nextDifficulty: StemvaultDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty);
    setDifficulty(nextDifficulty);
    setPuzzle(nextPuzzle);
    setState(createInitialState(nextPuzzle));
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Current Order</Text>
          <Text style={styles.summaryValue}>{task ? task.text : 'Done'}</Text>
          <Text style={styles.summaryMeta}>{taskVerb(task)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Cursor Stem</Text>
          <Text style={styles.summaryValue}>{state.cursorPrefix || 'ROOT'}</Text>
          <Text style={styles.summaryMeta}>
            {need ? `next rune ${need}` : task ? 'order end reached' : 'all orders closed'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Lamp Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>actions used</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Order Queue</Text>
        <View style={styles.queueWrap}>
          {puzzle.tasks.map((entry, index) => (
            <View
              key={`${entry.kind}-${entry.text}-${index}`}
              style={[
                styles.queueChip,
                index < state.taskIndex && styles.queueChipDone,
                index === state.taskIndex && styles.queueChipCurrent,
              ]}
            >
              <Text style={styles.queueText}>{`${index + 1}. ${entry.text}`}</Text>
              <Text style={styles.queueMeta}>{taskVerb(entry)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Vault Map</Text>
        <View style={styles.columnsRow}>
          {grouped.map((group) => (
            <View key={`depth-${group.depth}`} style={styles.column}>
              <Text style={styles.columnTitle}>{group.depth === 0 ? 'Root' : `Depth ${group.depth}`}</Text>
              {group.nodes.map((node) => {
                const isCurrent = node.prefix === state.cursorPrefix;
                const isTarget = Boolean(need) && node.prefix === task?.text.slice(0, state.progress + 1);
                return (
                  <View
                    key={node.prefix || 'root'}
                    style={[
                      styles.nodeCard,
                      { minHeight: nodeSizeFor(group.depth) },
                      isCurrent && styles.nodeCurrent,
                      isTarget && styles.nodeTarget,
                    ]}
                  >
                    <Text style={styles.nodeTitle}>{node.prefix || 'ROOT'}</Text>
                    <Text style={styles.nodeMeta}>
                      {node.terminal ? 'sealed word' : node.children.length > 0 ? `${node.children.length} branches` : 'open tip'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Sealed Words</Text>
        {storedWords.length > 0 ? (
          <View style={styles.wordWrap}>
            {storedWords.map((word) => (
              <View key={word} style={styles.wordChip}>
                <Text style={styles.wordText}>{word}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Nothing is sealed yet.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLine}>{taskSummary(task)}</Text>
        <Text style={styles.infoLine}>
          {task?.kind === 'insert'
            ? sharedStemExists
              ? 'The next letter already has a carved stem. Reuse it instead of carving it twice.'
              : 'The next letter has no carved stem yet. Extend the vault only as far as the new word needs.'
            : sharedStemExists
              ? 'The next letter is already present in the vault. Follow the shared stem before you decide.'
              : 'No branch reaches the next letter. A missing claim may already be justified.'}
        </Text>
        <Text style={styles.infoLine}>
          {task?.kind === 'search'
            ? 'A full traced word is only present if the resting node is sealed.'
            : task?.kind === 'prefix'
              ? 'A stem warrant succeeds as soon as the whole stem is traced, even if the node is not sealed as a word.'
              : 'Seal only the final letter of the word you are filing.'}
        </Text>
      </View>

      {task?.kind === 'insert' ? (
        <>
          <View style={styles.actionRow}>
            <Pressable
              disabled={Boolean(state.verdict)}
              onPress={() => setState((current) => applyMove(current, { type: 'follow' }))}
              style={[styles.controlButton, Boolean(state.verdict) && styles.controlButtonDisabled]}
            >
              <Text style={styles.controlButtonLabel}>Follow Stem</Text>
            </Pressable>
            <Pressable
              disabled={Boolean(state.verdict)}
              onPress={() => setState((current) => applyMove(current, { type: 'carve' }))}
              style={[
                styles.controlButton,
                styles.primaryButton,
                Boolean(state.verdict) && styles.controlButtonDisabled,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>Carve Stem</Text>
            </Pressable>
          </View>
          <Pressable
            disabled={Boolean(state.verdict)}
            onPress={() => setState((current) => applyMove(current, { type: 'seal' }))}
            style={[styles.controlButton, Boolean(state.verdict) && styles.controlButtonDisabled]}
          >
            <Text style={styles.controlButtonLabel}>Seal Word</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.actionRow}>
            <Pressable
              disabled={Boolean(state.verdict)}
              onPress={() => setState((current) => applyMove(current, { type: 'follow' }))}
              style={[styles.controlButton, Boolean(state.verdict) && styles.controlButtonDisabled]}
            >
              <Text style={styles.controlButtonLabel}>Follow Stem</Text>
            </Pressable>
            <Pressable
              disabled={Boolean(state.verdict)}
              onPress={() => setState((current) => applyMove(current, { type: 'claimFound' }))}
              style={[
                styles.controlButton,
                styles.primaryButton,
                Boolean(state.verdict) && styles.controlButtonDisabled,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>Claim Present</Text>
            </Pressable>
          </View>
          <Pressable
            disabled={Boolean(state.verdict)}
            onPress={() => setState((current) => applyMove(current, { type: 'claimMissing' }))}
            style={[styles.controlButton, Boolean(state.verdict) && styles.controlButtonDisabled]}
          >
            <Text style={styles.controlButtonLabel}>Claim Missing</Text>
          </Pressable>
        </>
      )}

      <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
        <Text style={styles.resetButtonLabel}>Reset Archive</Text>
      </Pressable>

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
      title="Stemvault"
      emoji="SV"
      subtitle="File words through shared stems, seal only true endings, and settle word or stem warrants from the same archive."
      objective="Complete every filing order and warrant before the lamp budget runs out."
      statsLabel={`${puzzle.label} • ${metrics ? `${Math.round(metrics.skillDepth * 100)}% depth` : 'shared stems'}`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
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
          'Stemvault teaches trie construction and lookup for Implement Trie: insert walks or creates one child per letter from the root, exact search succeeds only at a terminal word seal, and startsWith succeeds as soon as the whole prefix path exists.',
        takeaway:
          'The moment where several words reuse one carved opening stem maps to shared trie nodes, while the seal on a finished resting point maps to `isEnd = true` for exact-word search.',
      }}
      leetcodeLinks={[
        {
          id: 208,
          title: 'Implement Trie (Prefix Tree)',
          url: 'https://leetcode.com/problems/implement-trie-prefix-tree/',
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
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#171b22',
    borderWidth: 1,
    borderColor: '#2d3642',
    gap: 6,
  },
  cardTitle: {
    color: '#9db1c7',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#f6f8fb',
    fontSize: 20,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#b8c6d8',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    gap: 10,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#171b22',
    borderWidth: 1,
    borderColor: '#2d3642',
  },
  queueWrap: {
    gap: 8,
  },
  queueChip: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#0e1420',
    borderWidth: 1,
    borderColor: '#263244',
  },
  queueChipDone: {
    borderColor: '#1d6f55',
    backgroundColor: '#0f231d',
  },
  queueChipCurrent: {
    borderColor: '#6d5ef6',
    backgroundColor: '#1a1731',
  },
  queueText: {
    color: '#f6f8fb',
    fontSize: 14,
    fontWeight: '700',
  },
  queueMeta: {
    color: '#b8c6d8',
    fontSize: 12,
    marginTop: 2,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  column: {
    flex: 1,
    gap: 8,
  },
  columnTitle: {
    color: '#9db1c7',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  nodeCard: {
    borderRadius: 14,
    padding: 10,
    justifyContent: 'center',
    backgroundColor: '#0e1420',
    borderWidth: 1,
    borderColor: '#263244',
  },
  nodeCurrent: {
    borderColor: '#39c38a',
    backgroundColor: '#10291f',
  },
  nodeTarget: {
    borderColor: '#7fb5ff',
  },
  nodeTitle: {
    color: '#f6f8fb',
    fontSize: 14,
    fontWeight: '800',
  },
  nodeMeta: {
    color: '#b8c6d8',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  wordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0f231d',
    borderWidth: 1,
    borderColor: '#1d6f55',
  },
  wordText: {
    color: '#b8ffd9',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#b8c6d8',
    fontSize: 13,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#101924',
    borderWidth: 1,
    borderColor: '#27364a',
    gap: 6,
  },
  infoLine: {
    color: '#d5deea',
    fontSize: 13,
    lineHeight: 20,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1a2330',
    borderWidth: 1,
    borderColor: '#314257',
  },
  primaryButton: {
    backgroundColor: '#2b2a64',
    borderColor: '#7268ff',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#edf2f8',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  resetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#11161d',
    borderWidth: 1,
    borderColor: '#2a333f',
  },
  resetButtonLabel: {
    color: '#c8d2df',
    fontSize: 14,
    fontWeight: '700',
  },
  messageText: {
    color: '#c9d5e2',
    fontSize: 14,
    lineHeight: 20,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  winText: {
    color: '#8ff0b8',
  },
  lossText: {
    color: '#ff9c9c',
  },
});
