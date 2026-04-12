import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentToken,
  currentTop,
  describeToken,
  generatePuzzle,
  remainingCount,
  tokenColor,
  type ClasplineDifficulty,
  type ClasplineMoveType,
  type ClasplineState,
} from '../solvers/Claspline.solver';

const DIFFICULTIES: ClasplineDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: ClasplineDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function actionTone(action: ClasplineMoveType) {
  if (action === 'flagFault') return styles.dangerButton;
  if (action === 'markClear' || action === 'stow') return styles.primaryButton;
  return styles.neutralButton;
}

function actionLabel(action: ClasplineMoveType) {
  if (action === 'stow') return 'Stow';
  if (action === 'latchTop') return 'Latch Top';
  if (action === 'flagFault') return 'Flag Fault';
  return 'Mark Clear';
}

export default function Claspline() {
  const [difficulty, setDifficulty] = useState<ClasplineDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<ClasplineState>(() => createInitialState(buildPuzzle(1, 0)));

  const token = useMemo(() => currentToken(state), [state]);
  const top = useMemo(() => currentTop(state), [state]);
  const actionsLeft = useMemo(() => remainingCount(state), [state]);

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

  const switchDifficulty = (nextDifficulty: ClasplineDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: ClasplineMoveType) => {
    setState((current) => applyMove(current, { type: move }));
  };

  const activeMoves = state.verdict
    ? []
    : token === null
      ? (['markClear', 'flagFault'] as ClasplineMoveType[])
      : (['stow', 'latchTop', 'flagFault'] as ClasplineMoveType[]);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>{puzzle.label} · {puzzle.title}</Text>
        <Text style={styles.titleText}>Route {puzzle.routeText}</Text>
        <Text style={styles.titleHint}>{puzzle.helper}</Text>
      </View>

      <View style={styles.routeCard}>
        <Text style={styles.cardTitle}>Clasp Route</Text>
        <View style={styles.routeRow}>
          {puzzle.route.map((routeToken, index) => {
            const processed = index < state.index;
            const current = index === state.index && token !== null;
            return (
              <View
                key={`${routeToken}-${index}`}
                style={[
                  styles.routeToken,
                  { borderColor: tokenColor(routeToken) },
                  processed && styles.routeTokenProcessed,
                  current && styles.routeTokenCurrent,
                ]}
              >
                <Text style={styles.routeIndex}>{index + 1}</Text>
                <Text style={[styles.routeValue, { color: tokenColor(routeToken) }]}>{routeToken}</Text>
                <Text style={styles.routeMeta}>{processed ? 'done' : current ? 'live' : 'ahead'}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Incoming Seal</Text>
          <Text style={[styles.summaryValue, token ? { color: tokenColor(token) } : null]}>{token ?? 'end'}</Text>
          <Text style={styles.summaryMeta}>{token ? describeToken(token) : 'The route is fully consumed.'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Vault Top</Text>
          <Text style={[styles.summaryValue, top ? { color: tokenColor(top) } : null]}>{top ?? 'empty'}</Text>
          <Text style={styles.summaryMeta}>{top ? describeToken(top) : 'No opener is currently buried.'}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Vault Depth</Text>
          <Text style={styles.summaryValue}>{state.stack.length}</Text>
          <Text style={styles.summaryMeta}>Only the top seal is reachable.</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Route Left</Text>
          <Text style={styles.summaryValue}>{actionsLeft}</Text>
          <Text style={styles.summaryMeta}>Every token must be handled exactly once.</Text>
        </View>
      </View>

      <View style={styles.vaultCard}>
        <Text style={styles.cardTitle}>Vault Pile</Text>
        {state.stack.length > 0 ? (
          <View style={styles.vaultPile}>
            {[...state.stack].reverse().map((stackToken, index) => (
              <View
                key={`${stackToken}-${index}`}
                style={[
                  styles.vaultChip,
                  { borderColor: tokenColor(stackToken) },
                  index === 0 && styles.vaultChipTop,
                ]}
              >
                <Text style={[styles.vaultValue, { color: tokenColor(stackToken) }]}>{stackToken}</Text>
                <Text style={styles.vaultMeta}>{index === 0 ? 'top' : 'buried'}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>The vault is clear. If a closer arrives now, the route is broken immediately.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Dock Rules</Text>
        <Text style={styles.infoLine}>`Stow` is only correct for openers.</Text>
        <Text style={styles.infoLine}>`Latch Top` is only correct when the closer matches the live vault top.</Text>
        <Text style={styles.infoLine}>`Flag Fault` is correct the moment a closer hits the wrong top or an empty vault.</Text>
        <Text style={styles.infoLine}>When the route ends, use `Mark Clear` only if the vault is empty.</Text>
      </View>

      <View style={styles.actionRow}>
        {activeMoves.map((move) => (
          <Pressable key={move} onPress={() => runMove(move)} style={[styles.controlButton, actionTone(move)]}>
            <Text style={styles.controlLabel}>{actionLabel(move)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetLabel}>Reset Route</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetLabel}>New Route</Text>
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
      title="Claspline"
      emoji="CL"
      subtitle="Pile open seals in one vault and certify whether the route closes in strict top-first order."
      objective="Handle the clasp route from left to right. A closer only ever cares about the live top seal."
      statsLabel={`${puzzle.label} · ${state.index}/${puzzle.route.length}`}
      actions={[
        { label: 'Reset Route', onPress: () => resetPuzzle() },
        { label: 'New Route', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((option) => ({
        label: String(option),
        selected: option === difficulty,
        onPress: () => switchDifficulty(option),
      }))}
      board={board}
      controls={controls}
      helperText="The pile itself is the lesson: a buried opener does not help a closer if the top seal is wrong."
      conceptBridge={
        state.verdict?.correct
          ? {
              title: 'What this teaches',
              summary:
                'You just used a live top-first pile. Each opener is stowed, each closer checks only the current top, and any mismatch means the route is broken immediately.',
              takeaway:
                'That is the stack pattern behind Valid Parentheses: push openers, compare a closer to the top, pop on match, and return false on the first mismatch or leftover opener.',
            }
          : undefined
      }
      leetcodeLinks={[
        {
          id: 20,
          title: 'Valid Parentheses',
          url: 'https://leetcode.com/problems/valid-parentheses/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 12,
  },
  titleCard: {
    backgroundColor: '#131b24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#264158',
    padding: 14,
    gap: 6,
  },
  titleLabel: {
    color: '#8ab7d6',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  titleHint: {
    color: '#d0d6dd',
    fontSize: 13,
    lineHeight: 19,
  },
  routeCard: {
    backgroundColor: '#15171c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c3440',
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  routeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeToken: {
    minWidth: 54,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#0f1115',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  routeTokenProcessed: {
    opacity: 0.45,
  },
  routeTokenCurrent: {
    backgroundColor: '#1e2b38',
    transform: [{ scale: 1.04 }],
  },
  routeIndex: {
    color: '#7f8790',
    fontSize: 10,
    fontWeight: '700',
  },
  routeValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  routeMeta: {
    color: '#c7ccd3',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#15171c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c3440',
    padding: 14,
    gap: 4,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  summaryMeta: {
    color: '#c0c5cd',
    fontSize: 12,
    lineHeight: 18,
  },
  vaultCard: {
    backgroundColor: '#15171c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c3440',
    padding: 14,
    gap: 10,
  },
  vaultPile: {
    gap: 8,
  },
  vaultChip: {
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#0f1115',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vaultChipTop: {
    backgroundColor: '#1d2731',
  },
  vaultValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  vaultMeta: {
    color: '#d0d6dd',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyText: {
    color: '#c0c5cd',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#12161c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a3340',
    padding: 14,
    gap: 6,
  },
  infoLine: {
    color: '#d4d8de',
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  controlButton: {
    flexGrow: 1,
    minWidth: 110,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: '#14324a',
    borderColor: '#2f7cb6',
  },
  neutralButton: {
    backgroundColor: '#232936',
    borderColor: '#495467',
  },
  dangerButton: {
    backgroundColor: '#3a1820',
    borderColor: '#b84a60',
  },
  controlLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  resetButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#495467',
    backgroundColor: '#232936',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  messageText: {
    color: '#d4d8de',
    fontSize: 13,
    lineHeight: 19,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#8ae9ae',
  },
  lossText: {
    color: '#ff889a',
  },
});
