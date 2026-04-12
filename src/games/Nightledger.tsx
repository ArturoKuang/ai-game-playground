import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  canCarryHouse,
  canRaidHouse,
  canScoutHouse,
  createInitialState,
  generatePuzzle,
  getCarryTotal,
  getRaidTotal,
  remainingUnsealed,
  sealedHouseCount,
  scoutCostForHouse,
  selectedTotal,
  type NightledgerDifficulty,
  type NightledgerState,
} from '../solvers/Nightledger.solver';

const DIFFICULTIES: NightledgerDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: NightledgerDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Nightledger() {
  const [difficulty, setDifficulty] = useState<NightledgerDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<NightledgerState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: NightledgerDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const selectedHouse = state.selectedHouse;
  const sealedValue = selectedTotal(state);
  const carryTotal = getCarryTotal(state, selectedHouse);
  const raidTotal = getRaidTotal(state, selectedHouse);
  const canCarry = canCarryHouse(state, selectedHouse);
  const canRaid = canRaidHouse(state, selectedHouse);
  const canScout = canScoutHouse(state, selectedHouse);
  const scoutCost = scoutCostForHouse(puzzle, selectedHouse);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Street</Text>
          <Text style={styles.summaryValue}>{puzzle.houses.length}</Text>
          <Text style={styles.summaryMeta}>houses on the block</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Final Ledger</Text>
          <Text style={styles.summaryValue}>{state.sealedTotals[puzzle.houses.length - 1] ?? '?'}</Text>
          <Text style={styles.summaryMeta}>best safe haul so far</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Sealed</Text>
          <Text style={styles.summaryValue}>{sealedHouseCount(state)}</Text>
          <Text style={styles.summaryMeta}>{remainingUnsealed(state)} unresolved</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Quiet Ledger</Text>
        <View style={styles.houseRow}>
          {puzzle.houses.map((stash, index) => {
            const isSelected = index === selectedHouse;
            const sealed = state.sealedTotals[index] !== null;
            const carryReady = canCarryHouse(state, index);
            const raidReady = canRaidHouse(state, index);

            return (
              <Pressable
                key={`house-${index}`}
                onPress={() => setState((current) => applyMove(current, { type: 'select', house: index }))}
                style={[
                  styles.houseCard,
                  isSelected && styles.houseCardSelected,
                  sealed && styles.houseCardSealed,
                  !sealed && carryReady && raidReady && styles.houseCardReady,
                ]}
              >
                <Text style={styles.houseLabel}>{`House ${index + 1}`}</Text>
                <Text style={styles.stashValue}>{stash}</Text>
                <Text style={styles.houseMeta}>
                  {sealed
                    ? `sealed ${state.sealedTotals[index]}`
                    : `scout ${scoutCostForHouse(puzzle, index)}`}
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
            Select the next house on the block. The scalable plan is to seal each prefix once instead of scouting the whole street from scratch.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Ledger Rules</Text>
        <Text style={styles.infoLine}>Carry Forward copies the best sealed haul from the previous house.</Text>
        <Text style={styles.infoLine}>Raid This House adds this stash to the sealed total from two houses back.</Text>
        <Text style={styles.infoLine}>Scout Prefix computes the best answer directly, but it burns the full brute-force scout tax for this prefix.</Text>
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.cardTitle}>{`Selected House ${selectedHouse + 1}`}</Text>
        <Text style={styles.selectedValue}>{sealedValue ?? puzzle.houses[selectedHouse]}</Text>
        <Text style={styles.selectedMeta}>
          {sealedValue !== null
            ? `Already sealed at ${sealedValue}.`
            : `Carry ${carryTotal ?? 'locked'} | Raid ${raidTotal ?? 'locked'} | Scout ${scoutCost}`}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'carry' }))}
          disabled={!canCarry || Boolean(state.verdict)}
          style={[
            styles.controlButton,
            (!canCarry || state.verdict) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.controlLabel}>
            {carryTotal !== null ? `Carry Forward (${carryTotal})` : 'Carry Forward'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'raid' }))}
          disabled={!canRaid || Boolean(state.verdict)}
          style={[
            styles.controlButton,
            canRaid && !state.verdict && styles.primaryButton,
            (!canRaid || state.verdict) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={[styles.controlLabel, canRaid && !state.verdict ? styles.primaryLabel : null]}>
            {raidTotal !== null ? `Raid This House (${raidTotal})` : 'Raid This House'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'scout' }))}
          disabled={!canScout || Boolean(state.verdict)}
          style={[styles.controlButton, (!canScout || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlLabel}>{`Scout Prefix (${scoutCost})`}</Text>
        </Pressable>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetLabel}>Reset Block</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetLabel}>New Block</Text>
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
      title="Nightledger"
      emoji="NL"
      subtitle="1D dynamic programming for House Robber"
      objective="Seal the best quiet haul for the whole block before sunrise. For each house prefix, either carry the prior best haul forward or raid this house plus the sealed two-back total."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Block', onPress: rerollPuzzle, tone: 'primary' },
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
          'Nightledger turns House Robber into a prefix ledger. Every house is settled by comparing the carry route against the current stash plus the sealed two-back route, instead of trusting local stash size or recomputing the full street.',
        takeaway:
          'Carrying forward maps to `dp[i - 1]`; raiding the current house maps to `nums[i] + dp[i - 2]`; sealing the prefix picks `dp[i] = max(dp[i - 1], nums[i] + dp[i - 2])`.',
      }}
      leetcodeLinks={[
        {
          id: 198,
          title: 'House Robber',
          url: 'https://leetcode.com/problems/house-robber/',
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
    backgroundColor: '#121920',
    borderWidth: 1,
    borderColor: '#2d3945',
    padding: 14,
    gap: 6,
  },
  summaryValue: {
    color: '#f4f1de',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#a9b3bf',
    fontSize: 12,
    lineHeight: 17,
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#15171c',
    borderWidth: 1,
    borderColor: '#2f3138',
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    color: '#f5f7fa',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  houseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  houseCard: {
    width: '31%',
    minWidth: 94,
    borderRadius: 16,
    backgroundColor: '#1d2027',
    borderWidth: 1,
    borderColor: '#343844',
    padding: 12,
    gap: 6,
  },
  houseCardSelected: {
    borderColor: '#f4d35e',
    backgroundColor: '#252018',
  },
  houseCardSealed: {
    borderColor: '#3f7d5c',
    backgroundColor: '#17251f',
  },
  houseCardReady: {
    borderColor: '#4d6fb8',
  },
  houseLabel: {
    color: '#d7dce2',
    fontSize: 12,
    fontWeight: '700',
  },
  stashValue: {
    color: '#f6bd60',
    fontSize: 28,
    fontWeight: '800',
  },
  houseMeta: {
    color: '#aeb7c3',
    fontSize: 12,
  },
  logWrap: {
    gap: 8,
  },
  logChip: {
    borderRadius: 12,
    backgroundColor: '#111319',
    borderWidth: 1,
    borderColor: '#2d323d',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logText: {
    color: '#d5dbe2',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyText: {
    color: '#a9b3bf',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#10151d',
    borderWidth: 1,
    borderColor: '#263244',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#c5ccd6',
    fontSize: 13,
    lineHeight: 19,
  },
  selectedCard: {
    borderRadius: 16,
    backgroundColor: '#201c14',
    borderWidth: 1,
    borderColor: '#5d4b21',
    padding: 14,
    gap: 6,
  },
  selectedValue: {
    color: '#ffe8a3',
    fontSize: 28,
    fontWeight: '800',
  },
  selectedMeta: {
    color: '#dccb9b',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#242833',
    borderWidth: 1,
    borderColor: '#394252',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: '#f0b429',
    borderColor: '#f6c65b',
  },
  controlLabel: {
    color: '#f0f4f8',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryLabel: {
    color: '#2a1f04',
  },
  resetButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#13161d',
    borderWidth: 1,
    borderColor: '#2d3340',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  resetLabel: {
    color: '#cdd4df',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#d3dae4',
    fontSize: 13,
    lineHeight: 19,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#6fe3a1',
  },
  lossText: {
    color: '#ff8b7a',
  },
});
