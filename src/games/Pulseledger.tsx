import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  canPulse,
  canSeal,
  canTranscribe,
  centerSummary,
  createInitialState,
  describeCenterPotential,
  fullCenterCountPreview,
  generatePuzzle,
  nextPairLabel,
  pendingCenterCount,
  pendingMirrorCount,
  selectedCenter,
  totalCountText,
  type PulseledgerDifficulty,
  type PulseledgerState,
} from '../solvers/Pulseledger.solver';

const DIFFICULTIES: PulseledgerDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: PulseledgerDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Pulseledger() {
  const [difficulty, setDifficulty] = useState<PulseledgerDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<PulseledgerState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: PulseledgerDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const liveCenter = selectedCenter(state);
  const liveSummary = liveCenter ? centerSummary(liveCenter, puzzle.text) : null;
  const transcribePreview = fullCenterCountPreview(state);
  const sealReady = canSeal(state);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ribbon</Text>
          <Text style={styles.ribbonText}>{puzzle.text}</Text>
          <Text style={styles.summaryMeta}>{puzzle.text.length} runes</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ledger</Text>
          <Text style={styles.summaryValue}>{totalCountText(state)}</Text>
          <Text style={styles.summaryMeta}>{state.totalBankedCount} mirrors banked</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Pending</Text>
          <Text style={styles.summaryValue}>{pendingMirrorCount(state)}</Text>
          <Text style={styles.summaryMeta}>{pendingCenterCount(state)} centers still live</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Centers</Text>
        <View style={styles.centerGrid}>
          {state.centers.map((center) => {
            const isSelected = center.id === state.selectedCenterId;
            return (
              <Pressable
                key={center.id}
                onPress={() => setState((current) => applyMove(current, { type: 'select', centerId: center.id }))}
                style={[
                  styles.centerCard,
                  isSelected && styles.centerCardSelected,
                  center.exhausted && styles.centerCardExhausted,
                ]}
              >
                <View style={styles.centerHeader}>
                  <Text style={styles.centerLabel}>{center.label}</Text>
                  <Text style={styles.centerTag}>{center.kind === 'odd' ? 'rune' : 'seam'}</Text>
                </View>
                <Text style={styles.centerValue}>{describeCenterPotential(state, center.id)}</Text>
                <Text style={styles.centerMeta}>
                  {center.exhausted
                    ? 'settled'
                    : center.maxPossibleCount > center.bankedCount
                      ? 'can still hide mirrors'
                      : 'fully tallied'}
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
            Every rune already counts once. The hidden work is to harvest each wider mirror from its own rune heart or seam heart.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Ledger Rules</Text>
        <Text style={styles.infoLine}>Every rune already contributes one one-rune mirror.</Text>
        <Text style={styles.infoLine}>Every rune center and every seam between adjacent runes can still hide wider mirrors.</Text>
        <Text style={styles.infoLine}>Pulse Outward compares only the next mirrored pair for 1 action and banks one more palindrome if it matches.</Text>
        <Text style={styles.infoLine}>Transcribe Center recounts the whole center from scratch at a heavy fixed cost.</Text>
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.cardTitle}>{liveCenter?.label ?? 'Center'}</Text>
        <Text style={styles.selectedValue}>{liveSummary?.value ?? '(none)'}</Text>
        <Text style={styles.selectedMeta}>
          {liveCenter
            ? liveCenter.exhausted
              ? `${liveCenter.label} is settled with ${liveCenter.bankedCount} mirrors banked here.`
              : `Banked ${liveCenter.bankedCount}/${liveCenter.maxPossibleCount}. Next pair: ${nextPairLabel(state)}.`
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
          onPress={() => setState((current) => applyMove(current, { type: 'seal' }))}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            state.verdict && styles.controlButtonDisabled,
            sealReady ? styles.crownButton : styles.warningButton,
          ]}
        >
          <Text style={styles.controlLabel}>{sealReady ? 'Seal Ledger' : 'Seal Early'}</Text>
        </Pressable>
      </View>

      {transcribePreview ? (
        <Text style={styles.previewText}>
          Full transcription would bank {transcribePreview.additionalCount} more mirrors and finish on "{transcribePreview.value}".
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
      title="Pulseledger"
      emoji="PL"
      subtitle="Center expansion for Palindromic Substrings"
      objective="Count every palindromic substring before the audit clock expires. Every rune already counts once; the scalable move is to expand each rune heart and seam heart outward, one matched pair at a time."
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
          'Pulseledger turns palindromic-substring counting into center expansion: every rune and every seam is a separate heart, and each successful outward layer adds exactly one more palindrome to the final tally.',
        takeaway:
          'The auto-banked rune singles map to the base count for odd centers, and each Pulse Outward maps to one successful `expand(left, right)` step that increments the running palindrome count.',
      }}
      leetcodeLinks={[
        {
          id: 647,
          title: 'Palindromic Substrings',
          url: 'https://leetcode.com/problems/palindromic-substrings/',
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
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  ribbonText: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#94a3b8',
    fontSize: 12,
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#111318',
    borderWidth: 1,
    borderColor: '#293142',
    padding: 16,
    gap: 12,
  },
  centerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  centerCard: {
    width: '31%',
    minWidth: 120,
    borderRadius: 14,
    backgroundColor: '#1a202b',
    borderWidth: 1,
    borderColor: '#2a3445',
    padding: 12,
    gap: 6,
  },
  centerCardSelected: {
    borderColor: '#f59e0b',
    backgroundColor: '#2b1f12',
  },
  centerCardExhausted: {
    opacity: 0.68,
  },
  centerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  centerLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  centerTag: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  centerValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
  },
  centerMeta: {
    color: '#94a3b8',
    fontSize: 12,
  },
  logWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#182131',
    borderWidth: 1,
    borderColor: '#28374c',
    maxWidth: '100%',
  },
  logText: {
    color: '#dbe8f6',
    fontSize: 12,
  },
  emptyText: {
    color: '#a9b6c7',
    fontSize: 14,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#0f1722',
    borderWidth: 1,
    borderColor: '#293447',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#d7dee9',
    fontSize: 13,
    lineHeight: 18,
  },
  selectedCard: {
    borderRadius: 16,
    backgroundColor: '#141a24',
    borderWidth: 1,
    borderColor: '#303d53',
    padding: 14,
    gap: 6,
  },
  selectedValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  selectedMeta: {
    color: '#9fb0c6',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1d2531',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  crownButton: {
    backgroundColor: '#14532d',
    borderColor: '#22c55e',
  },
  warningButton: {
    backgroundColor: '#3f1d1d',
    borderColor: '#b45309',
  },
  controlLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryLabel: {
    color: '#1f1300',
  },
  previewText: {
    color: '#c6d4e5',
    fontSize: 13,
    lineHeight: 18,
  },
  resetButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetLabel: {
    color: '#d9e4f1',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#d6e0ec',
    fontSize: 14,
    lineHeight: 20,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '800',
  },
  winText: {
    color: '#4ade80',
  },
  lossText: {
    color: '#f87171',
  },
});
