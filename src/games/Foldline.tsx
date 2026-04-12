import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  getDisplayPuzzle,
  getLeftChar,
  getRightChar,
  remainingCleaned,
  transcribeCostForWindow,
  type FoldlineDifficulty,
  type FoldlinePuzzle,
  type FoldlineState,
} from '../solvers/Foldline.solver';

const DIFFICULTIES: FoldlineDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: FoldlineDifficulty) {
  return getDisplayPuzzle(difficulty);
}

function displayChar(char: string) {
  return char === ' ' ? '_' : char;
}

function normalizedLabel(char: string | null) {
  if (char === null) return 'none';
  if (!/[a-z0-9]/i.test(char)) return 'noise';
  return char.toLowerCase();
}

export default function Foldline() {
  const [difficulty, setDifficulty] = useState<FoldlineDifficulty>(1);
  const [puzzle, setPuzzle] = useState<FoldlinePuzzle>(() => buildPuzzle(1));
  const [state, setState] = useState<FoldlineState>(() => createInitialState(buildPuzzle(1)));

  const leftChar = useMemo(() => getLeftChar(state), [state]);
  const rightChar = useMemo(() => getRightChar(state), [state]);
  const cleanedWindow = useMemo(() => remainingCleaned(state), [state]);

  const resetPuzzle = (nextPuzzle = puzzle) => {
    setPuzzle(nextPuzzle);
    setState(createInitialState(nextPuzzle));
  };

  const switchDifficulty = (nextDifficulty: FoldlineDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty);
    setDifficulty(nextDifficulty);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (
    move:
      | 'skipLeft'
      | 'skipRight'
      | 'compare'
      | 'transcribe'
      | 'callMirror'
      | 'callBroken',
  ) => {
    setState((current) => applyMove(current, { type: move }));
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.strip}>
        {puzzle.raw.split('').map((char, index) => {
          const skipped = state.skippedIndices.includes(index);
          const compared = state.comparedIndices.includes(index);
          const isLeft = state.left === index && state.left <= state.right;
          const isRight = state.right === index && state.left <= state.right;
          const isCenter = isLeft && isRight;

          return (
            <View
              key={`${index}-${char}`}
              style={[
                styles.token,
                skipped && styles.tokenSkipped,
                compared && styles.tokenCompared,
                isLeft && styles.tokenLeft,
                isRight && styles.tokenRight,
                isCenter && styles.tokenCenter,
              ]}
            >
              <Text style={[styles.tokenIndex, skipped && styles.tokenTextMuted]}>{index}</Text>
              <Text style={[styles.tokenLabel, skipped && styles.tokenTextMuted]}>
                {displayChar(char)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <Text style={styles.legendText}>L = live left edge</Text>
        <Text style={styles.legendText}>R = live right edge</Text>
        <Text style={styles.legendText}>dim = trimmed</Text>
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Active Ends</Text>
        <Text style={styles.infoLine}>
          Left: {leftChar === null ? 'none' : `'${displayChar(leftChar)}'`} {'->'} {normalizedLabel(leftChar)}
        </Text>
        <Text style={styles.infoLine}>
          Right: {rightChar === null ? 'none' : `'${displayChar(rightChar)}'`} {'->'} {normalizedLabel(rightChar)}
        </Text>
        <Text style={styles.infoLine}>
          Remaining cleaned window: {cleanedWindow || '(empty)'}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Archive Options</Text>
        <Text style={styles.infoLine}>Compare live ends: 1 action</Text>
        <Text style={styles.infoLine}>
          Transcribe whole window: {transcribeCostForWindow(state)} actions
        </Text>
        {state.transcriptionHint ? (
          <Text style={styles.infoLine}>
            Last transcription: {state.transcriptionHint.result} ({state.transcriptionHint.cleaned || 'empty'})
          </Text>
        ) : (
          <Text style={styles.infoLine}>No full transcription yet.</Text>
        )}
      </View>

      {state.mismatchFound ? (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>Mismatch Found</Text>
          <Text style={styles.alertText}>{state.mismatchPair ?? 'The active ends do not mirror.'}</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('skipLeft')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Skip Left</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('compare')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, styles.primaryButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.primaryButtonLabel}>Compare</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('skipRight')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Skip Right</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('transcribe')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Transcribe Window</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('callMirror')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Call Mirror</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('callBroken')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Call Broken</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
        <Text style={styles.resetButtonLabel}>Reset Strip</Text>
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
      title="Foldline"
      emoji="><"
      subtitle="Two pointers for Valid Palindrome"
      objective="Shrink the inscription from both ends. Trim punctuation and spacing noise, compare only meaningful endpoints, and decide whether the strip still mirrors once case is ignored."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
      ]}
      difficultyOptions={DIFFICULTIES.map((entry) => ({
        label: String(entry),
        selected: entry === difficulty,
        onPress: () => switchDifficulty(entry),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        title: 'What This Teaches',
        summary:
          'A noisy string does not need a rebuilt copy. Move two live pointers inward, skip non-alphanumeric junk on the side that blocks you, and compare the normalized endpoints only when both sides carry signal.',
        takeaway:
          'This maps directly to the standard `Valid Palindrome` loop: trim while `!isalnum`, compare `tolower(s[left])` to `tolower(s[right])`, then move inward.',
      }}
      leetcodeLinks={[
        {
          id: 125,
          title: 'Valid Palindrome',
          url: 'https://leetcode.com/problems/valid-palindrome/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 14,
  },
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  token: {
    minWidth: 42,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    backgroundColor: '#17181b',
    alignItems: 'center',
  },
  tokenSkipped: {
    opacity: 0.35,
  },
  tokenCompared: {
    borderColor: '#2d8f6f',
    backgroundColor: '#13372c',
  },
  tokenLeft: {
    borderColor: '#e6b422',
  },
  tokenRight: {
    borderColor: '#4f8cff',
  },
  tokenCenter: {
    borderColor: '#d06dd1',
  },
  tokenIndex: {
    color: '#8a8f98',
    fontSize: 10,
    marginBottom: 4,
  },
  tokenLabel: {
    color: '#f4f5f7',
    fontSize: 18,
    fontWeight: '700',
  },
  tokenTextMuted: {
    color: '#757b84',
  },
  legendRow: {
    gap: 4,
  },
  legendText: {
    color: '#9aa1aa',
    fontSize: 12,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2f3136',
    backgroundColor: '#15171a',
    padding: 14,
    gap: 6,
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  infoLine: {
    color: '#c5c9cf',
    fontSize: 13,
    lineHeight: 18,
  },
  alertCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#8f3c4b',
    backgroundColor: '#2a1419',
    padding: 14,
    gap: 6,
  },
  alertTitle: {
    color: '#ffb4c0',
    fontSize: 15,
    fontWeight: '700',
  },
  alertText: {
    color: '#ffd8de',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    backgroundColor: '#17181b',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    borderColor: '#d3b14a',
    backgroundColor: '#3d3211',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#eff2f5',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButtonLabel: {
    color: '#fff5cf',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  resetButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    backgroundColor: '#111214',
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonLabel: {
    color: '#d9dde3',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#c8ccd2',
    fontSize: 13,
    lineHeight: 19,
  },
  verdictText: {
    fontSize: 16,
    fontWeight: '800',
  },
  winText: {
    color: '#7be0af',
  },
  lossText: {
    color: '#ff9da9',
  },
});
