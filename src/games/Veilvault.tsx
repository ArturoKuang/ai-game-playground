import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  availableBranchChoices,
  buildPuzzle,
  createInitialState,
  currentTask,
  evaluateVeilvault,
  groupedNodes,
  nextGlyph,
  visibleWords,
  type VeilvaultDifficulty,
  type VeilvaultState,
  type VeilvaultTask,
} from '../solvers/Veilvault.solver';

const DIFFICULTIES: VeilvaultDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateVeilvault();

function taskVerb(task: VeilvaultTask | null) {
  if (!task) return 'Ledger complete';
  return task.kind === 'insert' ? 'File word' : 'Veil warrant';
}

function taskSummary(task: VeilvaultTask | null) {
  if (!task) return 'No open order.';
  return `${taskVerb(task)}: ${task.text}`;
}

function nodeSizeFor(depth: number) {
  if (depth === 0) return 84;
  if (depth <= 2) return 72;
  return 64;
}

function branchLetter(prefix: string) {
  return prefix[prefix.length - 1] ?? 'ROOT';
}

function frameLabel(parentPrefix: string) {
  return parentPrefix || 'ROOT';
}

export default function Veilvault() {
  const [difficulty, setDifficulty] = useState<VeilvaultDifficulty>(1);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1));
  const [state, setState] = useState<VeilvaultState>(() => createInitialState(buildPuzzle(1)));

  const metrics = useMemo(
    () => EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty),
    [difficulty],
  );
  const task = currentTask(state);
  const glyph = nextGlyph(state);
  const grouped = groupedNodes(state);
  const storedWords = visibleWords(state);
  const branchChoices = availableBranchChoices(state);

  const resetPuzzle = (nextPuzzle = puzzle) => {
    setPuzzle(nextPuzzle);
    setState(createInitialState(nextPuzzle));
  };

  const switchDifficulty = (nextDifficulty: VeilvaultDifficulty) => {
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
            {glyph ? `next rune ${glyph}` : task ? 'order end reached' : 'all orders closed'}
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
                const isBranchOpen = branchChoices.includes(node.prefix);
                return (
                  <View
                    key={node.prefix || 'root'}
                    style={[
                      styles.nodeCard,
                      { minHeight: nodeSizeFor(group.depth) },
                      isCurrent && styles.nodeCurrent,
                      isBranchOpen && styles.nodeBranch,
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

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Veil Checkpoints</Text>
        {state.wildcardFrames.length > 0 ? (
          <View style={styles.frameWrap}>
            {state.wildcardFrames.map((frame, index) => {
              const remaining = frame.choices.filter((choice) => !frame.tried.includes(choice));
              return (
                <View key={`${frame.parentPrefix}-${frame.progressBefore}-${index}`} style={styles.frameCard}>
                  <Text style={styles.frameTitle}>{`Veil at ${frameLabel(frame.parentPrefix)}`}</Text>
                  <Text style={styles.frameMeta}>
                    {`tried ${frame.tried.map(branchLetter).join(', ') || 'none'} | open ${
                      remaining.map(branchLetter).join(', ') || 'none'
                    }`}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>No open veil checkpoints.</Text>
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
            ? 'File words by reusing carved stems when they already exist, and seal only the true ending letter.'
            : glyph === '?'
              ? 'The veil mark stands for any single rune. Choose one live child branch now, and backtrack only to this checkpoint if it fails later.'
              : 'Exact runes still demand an exact child branch. If a later seal check fails, reopen only the last useful veil.'}
        </Text>
        <Text style={styles.infoLine}>
          {task?.kind === 'search'
            ? 'A warrant is present only when one full path lands on a sealed word. Missing claims are only safe after every open veil branch is exhausted.'
            : 'Shared stems make filing cheap, but only the final seal turns a path into a stored word.'}
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
          {glyph === '?' && branchChoices.length > 0 ? (
            <View style={styles.branchWrap}>
              {branchChoices.map((choice) => (
                <Pressable
                  key={choice}
                  disabled={Boolean(state.verdict)}
                  onPress={() => setState((current) => applyMove(current, { type: 'branch', prefix: choice }))}
                  style={[
                    styles.branchButton,
                    styles.primaryButton,
                    Boolean(state.verdict) && styles.controlButtonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonLabel}>{`Take ${branchLetter(choice)}`}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Pressable
              disabled={Boolean(state.verdict)}
              onPress={() => setState((current) => applyMove(current, { type: 'follow' }))}
              style={[styles.controlButton, Boolean(state.verdict) && styles.controlButtonDisabled]}
            >
              <Text style={styles.controlButtonLabel}>
                {glyph === '?' ? 'No Veil Branch' : 'Follow Exact Rune'}
              </Text>
            </Pressable>
          )}

          <View style={styles.actionRow}>
            <Pressable
              disabled={Boolean(state.verdict)}
              onPress={() => setState((current) => applyMove(current, { type: 'backtrack' }))}
              style={[styles.controlButton, Boolean(state.verdict) && styles.controlButtonDisabled]}
            >
              <Text style={styles.controlButtonLabel}>Backtrack Veil</Text>
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
      title="Veilvault"
      emoji="VV"
      subtitle="File words through shared stems, then answer veiled warrants by opening one wildcard branch at a time and unwinding only the last veil that still matters."
      objective="Complete every filing order and wildcard warrant before the lamp budget runs out."
      statsLabel={`${puzzle.label} • ${metrics ? `${Math.round(metrics.skillDepth * 100)}% depth` : 'veil search'}`}
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
          'Veilvault teaches trie-backed wildcard search for Design Add and Search Words Data Structure: addWord reuses or carves one child per letter, and search must branch across every child when the query hits a veiled rune.',
        takeaway:
          'The moment where a veil opens one child branch, then reopens only that checkpoint if the branch dies, maps to the DFS that iterates every trie child for `.` and returns true as soon as one recursive branch succeeds.',
      }}
      leetcodeLinks={[
        {
          id: 211,
          title: 'Design Add and Search Words Data Structure',
          url: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/',
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
    borderColor: '#5f88ff',
    backgroundColor: '#131d38',
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
  nodeBranch: {
    borderColor: '#5f88ff',
    backgroundColor: '#12203c',
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
  frameWrap: {
    gap: 8,
  },
  frameCard: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#101924',
    borderWidth: 1,
    borderColor: '#27364a',
    gap: 4,
  },
  frameTitle: {
    color: '#eef3fb',
    fontSize: 13,
    fontWeight: '800',
  },
  frameMeta: {
    color: '#c1cfde',
    fontSize: 12,
    lineHeight: 18,
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
  branchWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  branchButton: {
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: '#1f346b',
    borderColor: '#7ea4ff',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#edf2f8',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
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
