import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  canScoutSlot,
  canSealDead,
  canTracePair,
  canTraceSolo,
  createInitialState,
  currentDigit,
  currentPairWindow,
  generatePuzzle,
  getPairContribution,
  getSoloContribution,
  remainingUnsealed,
  scoutCostForSlot,
  sealedSlotCount,
  selectedValue,
  slotIsSealed,
  type GlyphrailDifficulty,
  type GlyphrailState,
} from '../solvers/Glyphrail.solver';

const DIFFICULTIES: GlyphrailDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: GlyphrailDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Glyphrail() {
  const [difficulty, setDifficulty] = useState<GlyphrailDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<GlyphrailState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: GlyphrailDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const selectedSlot = state.selectedSlot;
  const selectedCount = selectedValue(state);
  const soloContribution = getSoloContribution(state, selectedSlot);
  const pairContribution = getPairContribution(state, selectedSlot);
  const canSolo = canTraceSolo(state, selectedSlot);
  const canPair = canTracePair(state, selectedSlot);
  const canDead = canSealDead(state, selectedSlot);
  const canScout = canScoutSlot(state, selectedSlot);
  const scoutCost = scoutCostForSlot(puzzle, selectedSlot);
  const digit = currentDigit(puzzle, selectedSlot);
  const pairWindow = currentPairWindow(puzzle, selectedSlot);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Digits</Text>
          <Text style={styles.summaryValue}>{puzzle.glyphs.length}</Text>
          <Text style={styles.summaryMeta}>glyphs in the ribbon</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Final Routes</Text>
          <Text style={styles.summaryValue}>{state.sealedCounts[puzzle.glyphs.length] ?? '?'}</Text>
          <Text style={styles.summaryMeta}>sealed decoding count</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Sealed</Text>
          <Text style={styles.summaryValue}>{sealedSlotCount(state)}</Text>
          <Text style={styles.summaryMeta}>{remainingUnsealed(state)} prefixes unresolved</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Cipher Ribbon</Text>
        <View style={styles.ribbonStack}>
          {Array.from({ length: puzzle.glyphs.length }, (_, index) => {
            const slot = index + 1;
            const isSelected = slot === selectedSlot;
            const isSealed = slotIsSealed(state, slot);
            const soloReady = canTraceSolo(state, slot);
            const pairReady = canTracePair(state, slot);
            const deadReady = canSealDead(state, slot);
            const digitLabel = currentDigit(puzzle, slot);
            const pairLabel = currentPairWindow(puzzle, slot);
            const pending = state.pendingCounts[slot];

            return (
              <Pressable
                key={`slot-${slot}`}
                onPress={() => setState((current) => applyMove(current, { type: 'select', slot }))}
                style={[
                  styles.slotCard,
                  isSelected && styles.slotCardSelected,
                  isSealed && styles.slotCardSealed,
                  !isSealed && (soloReady || pairReady || deadReady) && styles.slotCardReady,
                ]}
              >
                <View style={styles.slotHeader}>
                  <Text style={styles.slotLabel}>{`Prefix ${slot}`}</Text>
                  <Text style={styles.slotTag}>
                    {isSealed ? 'sealed' : deadReady ? 'dead' : soloReady || pairReady ? 'ready' : 'open'}
                  </Text>
                </View>
                <View style={styles.slotDigitsRow}>
                  <Text style={styles.slotDigit}>{digitLabel}</Text>
                  <Text style={styles.slotPair}>{pairLabel ? `pair ${pairLabel}` : 'pair --'}</Text>
                </View>
                <Text style={styles.slotValue}>{isSealed ? state.sealedCounts[slot] : pending > 0 ? pending : '?'}</Text>
                <Text style={styles.slotMeta}>
                  {isSealed
                    ? `sealed ${state.sealedCounts[slot]}`
                    : pending > 0
                      ? `pending ${pending}`
                      : `scout ${scoutCostForSlot(puzzle, slot)}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Relay Log</Text>
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
            Start on prefix 1. Every live prefix must gather all legal incoming routes before its count is truly sealed.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Relay Rules</Text>
        <Text style={styles.infoLine}>Origin prefix 0 begins pre-sealed at 1 route.</Text>
        <Text style={styles.infoLine}>Trace Solo adds the previous prefix count when the current digit stands alone.</Text>
        <Text style={styles.infoLine}>Trace Pair adds the two-back prefix count when the two-digit window is between 10 and 26.</Text>
        <Text style={styles.infoLine}>Seal Dead marks a prefix at 0 when both gates are shut. Scout Prefix certifies any prefix directly, but burns the full recount tax.</Text>
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.cardTitle}>{`Selected Prefix ${selectedSlot}`}</Text>
        <Text style={styles.selectedValue}>{selectedCount}</Text>
        <Text style={styles.selectedMeta}>
          {slotIsSealed(state, selectedSlot)
            ? 'Already sealed.'
            : canDead
              ? 'Both gates are closed here. Seal this prefix at 0.'
              : `Digit ${digit}${pairWindow ? ` | Pair ${pairWindow}` : ''} | Solo ${
                  soloContribution === null ? 'blocked' : `+${soloContribution}`
                } | Pair ${pairContribution === null ? 'blocked' : `+${pairContribution}`}`}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'solo' }))}
          disabled={!canSolo || Boolean(state.verdict)}
          style={[styles.controlButton, (!canSolo || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlLabel}>
            {soloContribution === null ? 'Trace Solo' : `Trace Solo (+${soloContribution})`}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'pair' }))}
          disabled={!canPair || Boolean(state.verdict)}
          style={[
            styles.controlButton,
            canPair && !state.verdict && styles.primaryButton,
            (!canPair || state.verdict) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={[styles.controlLabel, canPair && !state.verdict ? styles.primaryLabel : null]}>
            {pairContribution === null ? 'Trace Pair' : `Trace Pair (+${pairContribution})`}
          </Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'dead' }))}
          disabled={!canDead || Boolean(state.verdict)}
          style={[styles.controlButton, (!canDead || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlLabel}>Seal Dead</Text>
        </Pressable>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'scout' }))}
          disabled={!canScout || Boolean(state.verdict)}
          style={[styles.controlButton, (!canScout || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlLabel}>{`Scout Prefix (${scoutCost})`}</Text>
        </Pressable>
      </View>

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
      title="Glyphrail"
      emoji="GR"
      subtitle="1D dynamic programming for Decode Ways"
      objective="Seal the full cipher ribbon before the relay clock expires. Each digit prefix inherits every legal decoding route from one slot back, two slots back, both, or neither."
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
          'Glyphrail turns Decode Ways into a route ledger. Each prefix count is the sum of every legal incoming lane: from one slot back when the current digit stands alone, and from two slots back when the last two digits form a legal 10..26 pair.',
        takeaway:
          'The moment a 0 appears, the solo lane closes. The ribbon only stays alive when a legal pair carries the count through that slot.',
      }}
      leetcodeLinks={[
        {
          id: 91,
          title: 'Decode Ways',
          url: 'https://leetcode.com/problems/decode-ways/',
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
    backgroundColor: '#202124',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3c4043',
    padding: 12,
    gap: 4,
  },
  sectionCard: {
    backgroundColor: '#202124',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3c4043',
    padding: 14,
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f3f4',
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  summaryMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: '#9aa0a6',
  },
  ribbonStack: {
    gap: 10,
  },
  slotCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4a4d52',
    padding: 12,
    gap: 6,
    backgroundColor: '#17181b',
  },
  slotCardSelected: {
    borderColor: '#8ab4f8',
    backgroundColor: '#1d2b40',
  },
  slotCardSealed: {
    borderColor: '#3d7f5b',
    backgroundColor: '#173225',
  },
  slotCardReady: {
    borderColor: '#f9ab00',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  slotTag: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#fbbc04',
    letterSpacing: 0.6,
  },
  slotDigitsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  slotDigit: {
    fontSize: 26,
    fontWeight: '900',
    color: '#8ab4f8',
  },
  slotPair: {
    fontSize: 13,
    color: '#bdc1c6',
  },
  slotValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  slotMeta: {
    fontSize: 12,
    color: '#9aa0a6',
  },
  logWrap: {
    gap: 8,
  },
  logChip: {
    borderRadius: 12,
    backgroundColor: '#17181b',
    borderWidth: 1,
    borderColor: '#3c4043',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  logText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#e8eaed',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#bdc1c6',
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#17181b',
    borderWidth: 1,
    borderColor: '#3c4043',
    padding: 12,
    gap: 8,
  },
  infoLine: {
    fontSize: 13,
    lineHeight: 18,
    color: '#d2d6da',
  },
  selectedCard: {
    borderRadius: 16,
    backgroundColor: '#17181b',
    borderWidth: 1,
    borderColor: '#3c4043',
    padding: 12,
    gap: 6,
  },
  selectedValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
  },
  selectedMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: '#bdc1c6',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#5f6368',
    backgroundColor: '#202124',
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: '#8ab4f8',
    borderColor: '#8ab4f8',
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: '#f1f3f4',
  },
  primaryLabel: {
    color: '#10233d',
  },
  resetButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#17181b',
    borderWidth: 1,
    borderColor: '#3c4043',
    paddingHorizontal: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  resetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f1f3f4',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#bdc1c6',
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  winText: {
    color: '#81c995',
  },
  lossText: {
    color: '#f28b82',
  },
});
