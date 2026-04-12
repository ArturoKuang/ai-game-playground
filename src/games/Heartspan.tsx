import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  bestSpanText,
  canCrown,
  canPulse,
  canTranscribe,
  centerSummary,
  createInitialState,
  describeCenterPotential,
  exhaustedCenterCount,
  fullCenterExpansionPreview,
  generatePuzzle,
  nextPairLabel,
  selectedCenter,
  threatCount,
  type HeartspanDifficulty,
  type HeartspanState,
} from '../solvers/Heartspan.solver';

const DIFFICULTIES: HeartspanDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: HeartspanDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Heartspan() {
  const [difficulty, setDifficulty] = useState<HeartspanDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<HeartspanState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: HeartspanDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const liveCenter = selectedCenter(state);
  const liveSummary = liveCenter ? centerSummary(liveCenter, puzzle.text) : null;
  const transcribePreview = fullCenterExpansionPreview(state);
  const crownReady = canCrown(state);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ribbon</Text>
          <Text style={styles.ribbonText}>{puzzle.text}</Text>
          <Text style={styles.summaryMeta}>{puzzle.text.length} runes</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Best Found</Text>
          <Text style={styles.summaryValue}>{bestSpanText(state)}</Text>
          <Text style={styles.summaryMeta}>{state.bestLength} runes long</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Threats</Text>
          <Text style={styles.summaryValue}>{threatCount(state)}</Text>
          <Text style={styles.summaryMeta}>{exhaustedCenterCount(state)} centers exhausted</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Centers</Text>
        <View style={styles.centerGrid}>
          {state.centers.map((center) => {
            const isSelected = center.id === state.selectedCenterId;
            const isBest = center.id === state.bestCenterId && center.length === state.bestLength;
            return (
              <Pressable
                key={center.id}
                onPress={() => setState((current) => applyMove(current, { type: 'select', centerId: center.id }))}
                style={[
                  styles.centerCard,
                  isSelected && styles.centerCardSelected,
                  center.exhausted && styles.centerCardExhausted,
                  isBest && styles.centerCardBest,
                ]}
              >
                <View style={styles.centerHeader}>
                  <Text style={styles.centerLabel}>{center.label}</Text>
                  <Text style={styles.centerTag}>{center.kind === 'odd' ? 'rune' : 'seam'}</Text>
                </View>
                <Text style={styles.centerValue}>{describeCenterPotential(state, center.id)}</Text>
                <Text style={styles.centerMeta}>
                  {center.exhausted ? 'exhausted' : center.maxPossibleLength > state.bestLength ? 'still dangerous' : 'cannot beat best'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Audit Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.logWrap}>
            {state.history.slice(0, 8).map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.logText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            Start near the deepest-looking heart, then keep exhausting any center that can still possibly beat your best mirror.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Mirror Rules</Text>
        <Text style={styles.infoLine}>Every palindrome grows from one rune or one seam between runes.</Text>
        <Text style={styles.infoLine}>Pulse Outward compares only the next mirrored pair for 1 action.</Text>
        <Text style={styles.infoLine}>Transcribe Full Span recomputes the whole selected center from scratch at a heavy fixed cost.</Text>
        <Text style={styles.infoLine}>You may crown the current best only when no unresolved center can still beat its length.</Text>
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.cardTitle}>{liveCenter?.label ?? 'Center'}</Text>
        <Text style={styles.selectedValue}>{liveSummary?.value ?? '(none)'}</Text>
        <Text style={styles.selectedMeta}>
          {liveCenter
            ? liveCenter.exhausted
              ? `${liveCenter.label} is exhausted at length ${liveCenter.length}.`
              : `Current span ${liveCenter.length}/${liveCenter.maxPossibleLength}. Next pair: ${nextPairLabel(state)}.`
            : 'Select a center.'}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'pulse' }))}
          disabled={!canPulse(state) || Boolean(state.verdict)}
          style={[styles.controlButton, (!canPulse(state) || state.verdict) && styles.controlButtonDisabled, styles.primaryButton]}
        >
          <Text style={[styles.controlLabel, styles.primaryLabel]}>Pulse Outward</Text>
        </Pressable>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'transcribe' }))}
          disabled={!canTranscribe(state) || Boolean(state.verdict)}
          style={[styles.controlButton, (!canTranscribe(state) || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlLabel}>
            {transcribePreview ? `Transcribe (${transcribePreview.cost})` : 'Transcribe'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'crown' }))}
          disabled={!crownReady || Boolean(state.verdict)}
          style={[styles.controlButton, !crownReady || state.verdict ? styles.controlButtonDisabled : styles.crownButton]}
        >
          <Text style={styles.controlLabel}>Crown Best Span</Text>
        </Pressable>
      </View>

      {transcribePreview ? (
        <Text style={styles.previewText}>
          Full transcription would certify "{transcribePreview.value}" at length {transcribePreview.length}.
        </Text>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetLabel}>Reset Ribbon</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetLabel}>New Ribbon</Text>
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
      title="Heartspan"
      emoji="HS"
      subtitle="Center expansion for Longest Palindromic Substring"
      objective="Find the longest mirrored substring before the audit clock expires. Cheap play grows one rune or seam outward pair by pair; expensive play keeps retranscribing whole centers from scratch."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Ribbon', onPress: rerollPuzzle, tone: 'primary' },
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
          'Heartspan turns longest-palindrome search into center expansion: every rune and every seam is a candidate heart, and the scalable move is to grow that heart outward while keeping the best certified span.',
        takeaway:
          'Pulsing one center outward maps to `expand(left, right)` around either an odd center `(i, i)` or an even center `(i, i + 1)`, then keeping the longest span across every center.',
      }}
      leetcodeLinks={[
        {
          id: 5,
          title: 'Longest Palindromic Substring',
          url: 'https://leetcode.com/problems/longest-palindromic-substring/',
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
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#17181d',
    borderWidth: 1,
    borderColor: '#2c3340',
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: '#dde7f3',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  ribbonText: {
    color: '#fbfdff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  summaryValue: {
    color: '#fbfdff',
    fontSize: 20,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#9cafc5',
    fontSize: 12,
    lineHeight: 16,
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#11151d',
    borderWidth: 1,
    borderColor: '#253041',
    padding: 14,
    gap: 12,
  },
  centerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  centerCard: {
    width: '31%',
    minWidth: 92,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#324156',
    backgroundColor: '#16202d',
    gap: 4,
  },
  centerCardSelected: {
    borderColor: '#9ad1ff',
    backgroundColor: '#203249',
  },
  centerCardExhausted: {
    opacity: 0.8,
  },
  centerCardBest: {
    borderColor: '#ffd36a',
  },
  centerHeader: {
    gap: 2,
  },
  centerLabel: {
    color: '#eff7ff',
    fontSize: 13,
    fontWeight: '700',
  },
  centerTag: {
    color: '#97abc2',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerValue: {
    color: '#fbfdff',
    fontSize: 18,
    fontWeight: '800',
  },
  centerMeta: {
    color: '#9cafc5',
    fontSize: 11,
    lineHeight: 14,
  },
  logWrap: {
    gap: 8,
  },
  logChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#182231',
    borderWidth: 1,
    borderColor: '#2d3a4d',
  },
  logText: {
    color: '#dce6f2',
    fontSize: 12,
    lineHeight: 17,
  },
  emptyText: {
    color: '#a6b7ca',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#121b26',
    borderWidth: 1,
    borderColor: '#263445',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#d5e1ef',
    fontSize: 13,
    lineHeight: 18,
  },
  selectedCard: {
    borderRadius: 16,
    backgroundColor: '#1b1524',
    borderWidth: 1,
    borderColor: '#423158',
    padding: 14,
    gap: 6,
  },
  selectedValue: {
    color: '#fff6d6',
    fontSize: 22,
    fontWeight: '800',
  },
  selectedMeta: {
    color: '#d2c5e8',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334152',
    backgroundColor: '#16202d',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: '#22415f',
    borderColor: '#7fc7ff',
  },
  crownButton: {
    backgroundColor: '#4b3a11',
    borderColor: '#f5d36f',
  },
  controlLabel: {
    color: '#eef6ff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryLabel: {
    color: '#f5fbff',
  },
  previewText: {
    color: '#aebfd4',
    fontSize: 12,
    lineHeight: 17,
  },
  resetButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#111922',
    borderWidth: 1,
    borderColor: '#2c3948',
  },
  resetLabel: {
    color: '#d7e4f4',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#d9e4ef',
    fontSize: 13,
    lineHeight: 18,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#8be59a',
  },
  lossText: {
    color: '#ff8e8e',
  },
});
