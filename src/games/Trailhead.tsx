import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  generatePuzzle,
  getCurrentMarker,
  type TrailheadDifficulty,
  type TrailheadPuzzle,
  type TrailheadState,
} from '../solvers/Trailhead.solver';

const DIFFICULTIES: TrailheadDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: TrailheadDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function isTrailheadValue(stakedValues: number[], value: number) {
  return !stakedValues.includes(value - 1);
}

function remainingMarkers(puzzle: TrailheadPuzzle, queueIndex: number) {
  return puzzle.arrivals.slice(queueIndex, queueIndex + 6);
}

export default function Trailhead() {
  const [difficulty, setDifficulty] = useState<TrailheadDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState<TrailheadPuzzle>(() => buildPuzzle(1, 0));
  const [state, setState] = useState<TrailheadState>(() => createInitialState(buildPuzzle(1, 0)));

  const currentMarker = useMemo(() => getCurrentMarker(state), [state]);
  const preview = useMemo(
    () => remainingMarkers(puzzle, state.queueIndex),
    [puzzle, state.queueIndex],
  );

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

  const switchDifficulty = (nextDifficulty: TrailheadDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: { type: 'stake' | 'skip' | 'claim' } | { type: 'survey'; value: number }) => {
    setState((current) => applyMove(current, move));
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.phaseCard}>
        <Text style={styles.phaseLabel}>
          {state.phase === 'intake' ? 'Phase 1: Intake' : 'Phase 2: Survey'}
        </Text>
        <Text style={styles.phaseText}>
          {state.phase === 'intake'
            ? 'Stake arrivals into the ridge map before they pass by.'
            : 'Tap markers to send scouts. Interior starts rewalk suffixes and burn budget.'}
        </Text>
      </View>

      <View style={styles.currentCard}>
        <Text style={styles.cardTitle}>Current Marker</Text>
        <Text style={styles.currentMarkerText}>
          {currentMarker !== null ? currentMarker : 'Intake complete'}
        </Text>
        <Text style={styles.currentSubtext}>
          {currentMarker !== null
            ? `${state.queueIndex + 1} of ${puzzle.arrivals.length}`
            : 'All arrivals are now resolved into your ridge map or loose pile.'}
        </Text>
      </View>

      <View style={styles.previewCard}>
        <Text style={styles.cardTitle}>Queue Preview</Text>
        <View style={styles.previewRow}>
          {preview.length > 0 ? (
            preview.map((value, index) => (
              <View
                key={`${value}-${index}-${state.queueIndex}`}
                style={[styles.markerChip, index === 0 && styles.previewActiveChip]}
              >
                <Text style={styles.markerText}>{value}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No markers left in the intake queue.</Text>
          )}
        </View>
      </View>

      <View style={styles.mapCard}>
        <Text style={styles.cardTitle}>Ridge Map</Text>
        <View style={styles.markerGrid}>
          {state.stakedValues.length > 0 ? (
            state.stakedValues.map((value) => {
              const trailhead = isTrailheadValue(state.stakedValues, value);
              const surveyed = state.surveyedStarts.includes(value);
              const best = state.bestStart === value;
              const disabled = state.phase !== 'survey' || surveyed || Boolean(state.verdict);
              return (
                <Pressable
                  key={value}
                  disabled={disabled}
                  onPress={() => runMove({ type: 'survey', value })}
                  style={[
                    styles.markerChip,
                    trailhead && styles.trailheadChip,
                    surveyed && styles.surveyedChip,
                    best && styles.bestChip,
                    disabled && state.phase === 'survey' && styles.disabledChip,
                  ]}
                >
                  <Text style={styles.markerText}>{value}</Text>
                  <Text style={styles.markerMeta}>{trailhead ? 'start' : 'inside'}</Text>
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No markers staked yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.previewCard}>
        <Text style={styles.cardTitle}>Loose Markers</Text>
        <View style={styles.previewRow}>
          {state.skippedValues.length > 0 ? (
            state.skippedValues.map((value, index) => (
              <View key={`${value}-skip-${index}`} style={[styles.markerChip, styles.skippedChip]}>
                <Text style={styles.markerText}>{value}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Nothing left loose.</Text>
          )}
        </View>
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{state.bestRun}</Text>
          <Text style={styles.summaryLabel}>best run</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{state.surveyedStarts.length}</Text>
          <Text style={styles.summaryLabel}>surveyed starts</Text>
        </View>
      </View>

      {state.phase === 'intake' ? (
        <View style={styles.actionRow}>
          <Pressable
            disabled={currentMarker === null || Boolean(state.verdict)}
            onPress={() => runMove({ type: 'stake' })}
            style={[
              styles.controlButton,
              styles.primaryButton,
              (currentMarker === null || state.verdict) && styles.controlButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonLabel}>Stake (+1)</Text>
          </Pressable>
          <Pressable
            disabled={currentMarker === null || Boolean(state.verdict)}
            onPress={() => runMove({ type: 'skip' })}
            style={[
              styles.controlButton,
              (currentMarker === null || state.verdict) && styles.controlButtonDisabled,
            ]}
          >
            <Text style={styles.controlButtonLabel}>Leave Loose</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.controlsStack}>
          <Text style={styles.instructionsText}>
            Surveyed starts stay dimmed. Crown the answer once you trust your best run.
          </Text>
          <Pressable
            disabled={Boolean(state.verdict)}
            onPress={() => runMove({ type: 'claim' })}
            style={[styles.controlButton, styles.primaryButton, state.verdict && styles.controlButtonDisabled]}
          >
            <Text style={styles.primaryButtonLabel}>Crown Best Run</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Same Ridge</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Ridge</Text>
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
      title="Trailhead"
      emoji="^^"
      subtitle="Longest Consecutive Sequence through ridge starts"
      objective="Register the unsorted mile markers, then only scout the starts that are not already inside a longer trail. Find the true longest ridge before the budget runs out."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Ridge',
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
          'Staking markers is the set-building pass. A chip marked as a true start means its predecessor is absent, so scouting from it is the same move as starting a consecutive-count loop in code.',
        takeaway:
          'This maps directly to Longest Consecutive Sequence: fill a set once, then grow runs only from numbers where `num - 1` is missing.',
      }}
      leetcodeLinks={[
        {
          id: 128,
          title: 'Longest Consecutive Sequence',
          url: 'https://leetcode.com/problems/longest-consecutive-sequence/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 12,
  },
  phaseCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#31424d',
    backgroundColor: '#11202a',
    padding: 14,
    gap: 6,
  },
  phaseLabel: {
    color: '#f1f7fb',
    fontSize: 15,
    fontWeight: '800',
  },
  phaseText: {
    color: '#b9cad6',
    fontSize: 13,
    lineHeight: 18,
  },
  currentCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#425462',
    backgroundColor: '#0f1a23',
    padding: 18,
    gap: 8,
  },
  currentMarkerText: {
    color: '#f7fbff',
    fontSize: 40,
    fontWeight: '900',
  },
  currentSubtext: {
    color: '#a8b6c2',
    fontSize: 13,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2f3941',
    backgroundColor: '#161d22',
    padding: 14,
    gap: 10,
  },
  mapCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#36434b',
    backgroundColor: '#12181d',
    padding: 14,
    gap: 12,
  },
  cardTitle: {
    color: '#eef6fb',
    fontSize: 14,
    fontWeight: '800',
  },
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  markerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  markerChip: {
    minWidth: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#43505a',
    backgroundColor: '#20303b',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  previewActiveChip: {
    backgroundColor: '#3e4f5a',
    borderColor: '#8396a5',
  },
  trailheadChip: {
    backgroundColor: '#1b4a32',
    borderColor: '#5cb57b',
  },
  surveyedChip: {
    backgroundColor: '#2a2637',
    borderColor: '#7f73a9',
  },
  bestChip: {
    backgroundColor: '#7b4e16',
    borderColor: '#f1b861',
  },
  disabledChip: {
    opacity: 0.7,
  },
  skippedChip: {
    backgroundColor: '#33252a',
    borderColor: '#8f6674',
  },
  markerText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  markerMeta: {
    color: '#d2dde6',
    fontSize: 11,
    textAlign: 'center',
  },
  emptyText: {
    color: '#8f9ba5',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#37424a',
    backgroundColor: '#161b20',
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#aab4bc',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#425462',
    backgroundColor: '#1c252c',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: '#21553f',
    borderColor: '#54a979',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#f2f6f9',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#f6fff8',
    fontSize: 14,
    fontWeight: '800',
  },
  resetButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#39444d',
    backgroundColor: '#171d22',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  resetButtonLabel: {
    color: '#dce7ef',
    fontSize: 13,
    fontWeight: '700',
  },
  instructionsText: {
    color: '#acbbc5',
    fontSize: 13,
    lineHeight: 18,
  },
  messageText: {
    color: '#cdd9e2',
    fontSize: 13,
    lineHeight: 18,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '800',
  },
  winText: {
    color: '#7ce6a4',
  },
  lossText: {
    color: '#ff9da6',
  },
});
