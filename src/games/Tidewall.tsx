import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentCap,
  currentCapacity,
  currentWidth,
  formatPair,
  generatePuzzle,
  limitingSide,
  type TidewallDifficulty,
  type TidewallState,
} from '../solvers/Tidewall.solver';

const DIFFICULTIES: TidewallDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: TidewallDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Tidewall() {
  const [difficulty, setDifficulty] = useState<TidewallDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<TidewallState>(() => createInitialState(buildPuzzle(1, 0)));

  const capacity = useMemo(() => currentCapacity(state), [state]);
  const cap = useMemo(() => currentCap(state), [state]);
  const width = useMemo(() => currentWidth(state), [state]);
  const liveLimit = useMemo(() => limitingSide(state), [state]);

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

  const switchDifficulty = (nextDifficulty: TidewallDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'stepLeft' | 'stepRight' | 'survey' | 'finish') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>{puzzle.label}</Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>Best haul wins, not the tallest single wall.</Text>
      </View>

      <View style={styles.skylineCard}>
        <Text style={styles.cardTitle}>Live Shoreline</Text>
        <View style={styles.skylineRow}>
          {puzzle.walls.map((height, index) => {
            const isLeft = index === state.leftIndex;
            const isRight = index === state.rightIndex;
            const active = !state.surveyed && (isLeft || isRight);

            return (
              <View key={`${height}-${index}`} style={styles.wallSlot}>
                <View
                  style={[
                    styles.wallBar,
                    { height: 24 + height * 12 },
                    isLeft && styles.leftWall,
                    isRight && styles.rightWall,
                    active && styles.activeWall,
                  ]}
                />
                <Text style={styles.wallHeight}>{height}</Text>
                <Text style={styles.wallIndex}>
                  {isLeft ? 'L' : isRight ? 'R' : index + 1}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Live Basin</Text>
          <Text style={styles.summaryValue}>{capacity ?? 'sealed'}</Text>
          <Text style={styles.summaryMeta}>
            {capacity === null
              ? state.surveyed
                ? `Survey locked the winning pair at ${formatPair(state.bestPair)}.`
                : 'The shoreline has fully closed.'
              : `Walls ${formatPair([state.leftIndex, state.rightIndex])}`}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Best Logged</Text>
          <Text style={styles.summaryValue}>{state.bestCapacity}</Text>
          <Text style={styles.summaryMeta}>Walls {formatPair(state.bestPair)}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Cap Height</Text>
          <Text style={styles.summaryValue}>{cap ?? 'done'}</Text>
          <Text style={styles.summaryMeta}>
            {cap === null
              ? 'No live basin.'
              : liveLimit === 'left'
                ? 'Left wall is limiting the tide.'
                : liveLimit === 'right'
                  ? 'Right wall is limiting the tide.'
                  : 'Both walls cap the same height.'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Width</Text>
          <Text style={styles.summaryValue}>{width ?? 0}</Text>
          <Text style={styles.summaryMeta}>
            {width === null ? 'No span left.' : 'Every step burns one unit of width.'}
          </Text>
        </View>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.cardTitle}>Rising Hauls</Text>
        <View style={styles.momentRow}>
          {state.bestMoments.map((moment) => (
            <View key={`${formatPair(moment.pair)}-${moment.capacity}`} style={styles.momentChip}>
              <Text style={styles.momentValue}>{moment.capacity}</Text>
              <Text style={styles.momentMeta}>{formatPair(moment.pair)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Sweep Rules</Text>
        <Text style={styles.infoLine}>Step Left: release the left wall and expose the next one.</Text>
        <Text style={styles.infoLine}>Step Right: release the right wall and expose the next one.</Text>
        <Text style={styles.infoLine}>
          The tide haul is always `cap height x width`, and the lower wall sets the cap.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Fallback</Text>
        <Text style={styles.infoLine}>
          Harbor Survey costs {puzzle.surveyCost} actions and logs the best remaining basin instantly.
        </Text>
        <Text style={styles.infoLine}>Useful early, fatal once the storm clock tightens.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('stepLeft')}
          disabled={Boolean(state.verdict) || capacity === null || state.surveyed}
          style={[
            styles.controlButton,
            (state.verdict || capacity === null || state.surveyed) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.controlButtonLabel}>Step Left</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('stepRight')}
          disabled={Boolean(state.verdict) || capacity === null || state.surveyed}
          style={[
            styles.controlButton,
            (state.verdict || capacity === null || state.surveyed) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.controlButtonLabel}>Step Right</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('survey')}
          disabled={Boolean(state.verdict) || state.surveyed}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Harbor Survey</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('finish')}
          style={[styles.controlButton, styles.finishButton]}
        >
          <Text style={styles.primaryButtonLabel}>Finish Sweep</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Same Shoreline</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Shoreline</Text>
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
      title="Tidewall"
      emoji="||"
      subtitle="Two-pointer harbor sweep for maximum water"
      objective="Log the single biggest tide haul before the storm clock runs out. Each live basin uses the lower wall as its cap, so width alone never tells the full story."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Shoreline',
          onPress: rerollPuzzle,
          tone: 'primary',
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
          'This is the exact Container With Most Water sweep: evaluate the current outer pair, keep the best area seen so far, then move only the shorter wall because it is the one limiting the current basin height.',
        takeaway:
          'The moment where stepping the taller wall wastes width while the lower wall still caps the basin maps directly to the proof behind `if (height[left] <= height[right]) left += 1 else right -= 1`.',
      }}
      leetcodeLinks={[
        {
          id: 11,
          title: 'Container With Most Water',
          url: 'https://leetcode.com/problems/container-with-most-water/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 16,
  },
  titleCard: {
    backgroundColor: '#15202b',
    borderRadius: 18,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#27435c',
  },
  titleLabel: {
    color: '#9dd7ff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  titleHint: {
    color: '#b7cad9',
    fontSize: 13,
    lineHeight: 18,
  },
  skylineCard: {
    backgroundColor: '#101820',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#253746',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  skylineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  wallSlot: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  wallBar: {
    width: '100%',
    minWidth: 18,
    borderRadius: 10,
    backgroundColor: '#59738d',
  },
  leftWall: {
    backgroundColor: '#6ee7b7',
  },
  rightWall: {
    backgroundColor: '#fbbf24',
  },
  activeWall: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  wallHeight: {
    color: '#d9e7f3',
    fontSize: 12,
    fontWeight: '700',
  },
  wallIndex: {
    color: '#8fb1c9',
    fontSize: 11,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#11161d',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#243242',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#aac0d3',
    fontSize: 12,
    lineHeight: 17,
  },
  historyCard: {
    backgroundColor: '#11161d',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#243242',
  },
  momentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  momentChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1f2a36',
    borderWidth: 1,
    borderColor: '#304456',
  },
  momentValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  momentMeta: {
    color: '#aac0d3',
    fontSize: 11,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#11161d',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#243242',
  },
  infoLine: {
    color: '#c1d2df',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#1b2834',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#35506b',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#dcecf8',
    fontSize: 13,
    fontWeight: '700',
  },
  finishButton: {
    backgroundColor: '#0f766e',
    borderColor: '#14b8a6',
  },
  primaryButtonLabel: {
    color: '#f4fffe',
    fontSize: 13,
    fontWeight: '800',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#0f1720',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2b3947',
  },
  resetButtonLabel: {
    color: '#d3e2ee',
    fontSize: 12,
    fontWeight: '700',
  },
  messageText: {
    color: '#c9dae8',
    fontSize: 13,
    lineHeight: 18,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#86efac',
  },
  lossText: {
    color: '#fca5a5',
  },
});
