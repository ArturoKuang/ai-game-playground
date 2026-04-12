import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  canMintWithCoin,
  canScoutAmount,
  canSealBlocked,
  candidateCountForCoin,
  createInitialState,
  generatePuzzle,
  remainingUnsealed,
  scoutCostForAmount,
  sealedAmountCount,
  selectedSeal,
  type MintpathDifficulty,
  type MintpathState,
} from '../solvers/Mintpath.solver';

const DIFFICULTIES: MintpathDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: MintpathDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function formatSeal(value: number | 'blocked' | null) {
  if (value === null) return '?';
  return value === 'blocked' ? 'blocked' : String(value);
}

export default function Mintpath() {
  const [difficulty, setDifficulty] = useState<MintpathDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<MintpathState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: MintpathDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const selectedAmount = state.selectedAmount;
  const selectedValue = selectedSeal(state);
  const canBlock = canSealBlocked(state, selectedAmount);
  const canScout = canScoutAmount(state, selectedAmount);
  const scoutCost = scoutCostForAmount(puzzle, selectedAmount);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Target</Text>
          <Text style={styles.summaryValue}>{puzzle.target}</Text>
          <Text style={styles.summaryMeta}>amount to certify</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Final Ledger</Text>
          <Text style={styles.summaryValue}>{formatSeal(state.sealedCounts[puzzle.target])}</Text>
          <Text style={styles.summaryMeta}>fewest coins so far</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Sealed</Text>
          <Text style={styles.summaryValue}>{sealedAmountCount(state)}</Text>
          <Text style={styles.summaryMeta}>{remainingUnsealed(state)} unresolved</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Coin Rack</Text>
        <View style={styles.coinRow}>
          {puzzle.coins.map((coin) => (
            <View key={`coin-${coin}`} style={styles.coinChip}>
              <Text style={styles.coinValue}>{coin}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Amount Ledger</Text>
        <View style={styles.amountRow}>
          {state.sealedCounts.map((seal, amount) => {
            const isSelected = amount === selectedAmount;
            const isBase = amount === 0;
            const isSealed = seal !== null;

            return (
              <Pressable
                key={`amount-${amount}`}
                onPress={() => setState((current) => applyMove(current, { type: 'select', amount }))}
                style={[
                  styles.amountCard,
                  isSelected && styles.amountCardSelected,
                  isSealed && !isBase && styles.amountCardSealed,
                  isSealed && seal === 'blocked' && styles.amountCardBlocked,
                  isBase && styles.amountCardBase,
                ]}
              >
                <Text style={styles.amountLabel}>{`Amt ${amount}`}</Text>
                <Text style={styles.amountValue}>{formatSeal(seal)}</Text>
                <Text style={styles.amountMeta}>
                  {isBase
                    ? 'base'
                    : isSealed
                      ? 'sealed'
                      : `scout ${scoutCostForAmount(puzzle, amount)}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Ledger Notes</Text>
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
            Amount 0 is already sealed at 0. The scalable plan is to settle each higher amount once from a smaller sealed amount plus one coin.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Ledger Rules</Text>
        <Text style={styles.infoLine}>Mint with one coin only if the smaller amount behind it is already sealed.</Text>
        <Text style={styles.infoLine}>Seal Blocked only when no denomination can reach the selected amount from any sealed predecessor.</Text>
        <Text style={styles.infoLine}>Scout Amount computes the true answer directly, but it burns the full brute-force scout tax for that amount.</Text>
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.cardTitle}>{`Selected Amount ${selectedAmount}`}</Text>
        <Text style={styles.selectedValue}>{formatSeal(selectedValue)}</Text>
        <Text style={styles.selectedMeta}>
          {selectedAmount === 0
            ? 'Base seal: amount 0 costs 0 coins.'
            : selectedValue !== null
              ? `Already sealed at ${formatSeal(selectedValue)}.`
              : `Scout costs ${scoutCost}. Pick the cheapest reachable coin lane or certify that this amount is blocked.`}
        </Text>
      </View>

      <View style={styles.actionWrap}>
        {puzzle.coins.map((coin) => {
          const candidate = candidateCountForCoin(state, selectedAmount, coin);
          const canMint = canMintWithCoin(state, selectedAmount, coin);

          return (
            <Pressable
              key={`mint-${coin}`}
              onPress={() => setState((current) => applyMove(current, { type: 'mint', coin }))}
              disabled={!canMint || Boolean(state.verdict)}
              style={[
                styles.controlButton,
                canMint && !state.verdict && styles.primaryButton,
                (!canMint || state.verdict) && styles.controlButtonDisabled,
              ]}
            >
              <Text style={[styles.controlLabel, canMint && !state.verdict ? styles.primaryLabel : null]}>
                {candidate === null ? `Mint ${coin}` : `Mint ${coin} (${candidate})`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'block' }))}
          disabled={!canBlock || Boolean(state.verdict)}
          style={[styles.controlButton, (!canBlock || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlLabel}>Seal Blocked</Text>
        </Pressable>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'scout' }))}
          disabled={!canScout || Boolean(state.verdict)}
          style={[styles.controlButton, (!canScout || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlLabel}>{`Scout Amount (${scoutCost})`}</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetLabel}>Reset Rack</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetLabel}>New Rack</Text>
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
      title="Mintpath"
      emoji="MP"
      subtitle="1D dynamic programming for Coin Change"
      objective="Seal the fewest-coin plan for every amount from 1 up to the target. For each amount, test every reachable denomination lane from smaller sealed amounts, or mark it blocked if no lane exists."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Rack', onPress: rerollPuzzle, tone: 'primary' },
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
          'Mintpath turns Coin Change into an amount ledger. Every total is settled by checking all reachable denomination lanes from smaller amounts, adding one coin, and keeping only the cheapest certified result.',
        takeaway:
          'Minting with denomination `c` maps to `dp[amount - c] + 1`; sealing the amount keeps the minimum over every reachable coin; sealing blocked maps to returning `-1` when no denomination can reach the target.',
      }}
      leetcodeLinks={[
        {
          id: 322,
          title: 'Coin Change',
          url: 'https://leetcode.com/problems/coin-change/',
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
    borderRadius: 18,
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#31374a',
    padding: 14,
    gap: 6,
  },
  summaryValue: {
    color: '#f4f1de',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#b6becc',
    fontSize: 12,
    lineHeight: 17,
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#2d3344',
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  coinRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  coinChip: {
    minWidth: 58,
    borderRadius: 999,
    backgroundColor: '#27202f',
    borderWidth: 1,
    borderColor: '#514062',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  coinValue: {
    color: '#f7c8ff',
    fontSize: 18,
    fontWeight: '800',
  },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amountCard: {
    width: '30%',
    minWidth: 88,
    borderRadius: 16,
    backgroundColor: '#1c202b',
    borderWidth: 1,
    borderColor: '#364057',
    padding: 12,
    gap: 6,
  },
  amountCardSelected: {
    borderColor: '#f5d76e',
    backgroundColor: '#27210f',
  },
  amountCardSealed: {
    borderColor: '#4d8b68',
    backgroundColor: '#16231d',
  },
  amountCardBlocked: {
    borderColor: '#935b63',
    backgroundColor: '#28181c',
  },
  amountCardBase: {
    borderColor: '#5d6c89',
    backgroundColor: '#18202c',
  },
  amountLabel: {
    color: '#dbe2ec',
    fontSize: 12,
    fontWeight: '700',
  },
  amountValue: {
    color: '#ffe6a7',
    fontSize: 24,
    fontWeight: '800',
  },
  amountMeta: {
    color: '#aeb7c6',
    fontSize: 12,
  },
  logWrap: {
    gap: 8,
  },
  logChip: {
    borderRadius: 12,
    backgroundColor: '#11141d',
    borderWidth: 1,
    borderColor: '#2b3242',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logText: {
    color: '#d5dbe6',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyText: {
    color: '#aeb6c4',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#101621',
    borderWidth: 1,
    borderColor: '#2a3650',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#c9d0dc',
    fontSize: 13,
    lineHeight: 19,
  },
  selectedCard: {
    borderRadius: 16,
    backgroundColor: '#201b12',
    borderWidth: 1,
    borderColor: '#6e5821',
    padding: 14,
    gap: 6,
  },
  selectedValue: {
    color: '#ffe7a0',
    fontSize: 28,
    fontWeight: '800',
  },
  selectedMeta: {
    color: '#e0cca0',
    fontSize: 13,
    lineHeight: 18,
  },
  actionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flexGrow: 1,
    minWidth: 112,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#242a39',
    borderWidth: 1,
    borderColor: '#3f4a62',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: '#f2bf49',
    borderColor: '#f8d06f',
  },
  controlLabel: {
    color: '#f0f4fb',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryLabel: {
    color: '#2d2104',
  },
  resetButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#131824',
    borderWidth: 1,
    borderColor: '#2d3547',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  resetLabel: {
    color: '#d1d8e3',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#d3dae5',
    fontSize: 13,
    lineHeight: 19,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#70e4a3',
  },
  lossText: {
    color: '#ff8c78',
  },
});
