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
  scoutCostForHouse,
  sealedHouseCount,
  selectedTotal,
  selectedTrackHouse,
  trackFinalTotal,
  trackFor,
  type LoopledgerDifficulty,
  type LoopledgerState,
  type LoopledgerTrackId,
} from '../solvers/Loopledger.solver';

const DIFFICULTIES: LoopledgerDifficulty[] = [1, 2, 3, 4, 5];
const TRACK_IDS: LoopledgerTrackId[] = ['skipFirst', 'skipLast'];

function buildPuzzle(difficulty: LoopledgerDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Loopledger() {
  const [difficulty, setDifficulty] = useState<LoopledgerDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<LoopledgerState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: LoopledgerDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const activeTrack = state.activeTrack;
  const track = trackFor(puzzle, activeTrack);
  const selectedHouse = selectedTrackHouse(state, activeTrack);
  const selectedOriginalHouse = track.sourceIndices[selectedHouse] + 1;
  const sealedValue = selectedTotal(state, activeTrack);
  const carryTotal = getCarryTotal(state, activeTrack, selectedHouse);
  const raidTotal = getRaidTotal(state, activeTrack, selectedHouse);
  const canCarry = canCarryHouse(state, activeTrack, selectedHouse);
  const canRaid = canRaidHouse(state, activeTrack, selectedHouse);
  const canScout = canScoutHouse(state, activeTrack, selectedHouse);
  const scoutCost = scoutCostForHouse(puzzle, activeTrack, selectedHouse);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ring</Text>
          <Text style={styles.summaryValue}>{puzzle.ringHouses.length}</Text>
          <Text style={styles.summaryMeta}>houses on the loop</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Skip First</Text>
          <Text style={styles.summaryValue}>{trackFinalTotal(state, 'skipFirst') ?? '?'}</Text>
          <Text style={styles.summaryMeta}>H1 locked out</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Skip Last</Text>
          <Text style={styles.summaryValue}>{trackFinalTotal(state, 'skipLast') ?? '?'}</Text>
          <Text style={styles.summaryMeta}>{`H${puzzle.ringHouses.length} locked out`}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Alarm Ring</Text>
        <Text style={styles.sectionHint}>
          House 1 and House {puzzle.ringHouses.length} share one alarm. Any valid plan must exclude one end house and solve the remaining street as a line.
        </Text>
        <View style={styles.ringRow}>
          {puzzle.ringHouses.map((stash, index) => {
            const isAlarmedEnd = index === 0 || index === puzzle.ringHouses.length - 1;
            return (
              <View
                key={`ring-${index}`}
                style={[styles.ringHouseCard, isAlarmedEnd && styles.ringHouseAlarm]}
              >
                <Text style={styles.houseLabel}>{`House ${index + 1}`}</Text>
                <Text style={styles.stashValue}>{stash}</Text>
                <Text style={styles.houseMeta}>{isAlarmedEnd ? 'alarm edge' : 'interior'}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Dual Ledgers</Text>
        <View style={styles.trackStack}>
          {TRACK_IDS.map((trackId) => {
            const lane = trackFor(puzzle, trackId);
            const laneSelectedHouse = selectedTrackHouse(state, trackId);
            const finalTotal = trackFinalTotal(state, trackId);
            return (
              <Pressable
                key={trackId}
                onPress={() => setState((current) => applyMove(current, { type: 'select_track', trackId }))}
                style={[styles.trackCard, state.activeTrack === trackId && styles.trackCardActive]}
              >
                <View style={styles.trackHeader}>
                  <View>
                    <Text style={styles.trackTitle}>{lane.label}</Text>
                    <Text style={styles.trackMeta}>{`Exclude House ${lane.excludedHouse + 1}`}</Text>
                  </View>
                  <View style={styles.trackBadge}>
                    <Text style={styles.trackBadgeText}>{finalTotal ?? '?'}</Text>
                  </View>
                </View>
                <View style={styles.houseRow}>
                  {lane.houses.map((stash, houseIndex) => {
                    const isSelected = state.activeTrack === trackId && laneSelectedHouse === houseIndex;
                    const sealed = state.sealedTotalsByTrack[trackId][houseIndex] !== null;
                    return (
                      <Pressable
                        key={`${trackId}-${houseIndex}`}
                        onPress={() =>
                          setState((current) =>
                            applyMove(current, { type: 'select_house', trackId, house: houseIndex }),
                          )
                        }
                        style={[
                          styles.trackHouseCard,
                          isSelected && styles.trackHouseCardSelected,
                          sealed && styles.trackHouseCardSealed,
                        ]}
                      >
                        <Text style={styles.houseLabel}>{`H${lane.sourceIndices[houseIndex] + 1}`}</Text>
                        <Text style={styles.stashValue}>{stash}</Text>
                        <Text style={styles.houseMeta}>
                          {sealed
                            ? `sealed ${state.sealedTotalsByTrack[trackId][houseIndex]}`
                            : `scout ${scoutCostForHouse(puzzle, trackId, houseIndex)}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
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
            Start by choosing either legal cut. Within that cut, every prefix still follows the same carry-versus-raid ledger as a straight street.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Loop Rules</Text>
        <Text style={styles.infoLine}>`Skip First` ignores House 1 and certifies the rest as a straight street.</Text>
        <Text style={styles.infoLine}>`Skip Last` ignores the final house and certifies the rest as a straight street.</Text>
        <Text style={styles.infoLine}>Inside either cut, `Carry Forward` keeps the previous cut total and `Raid This House` adds the current stash to the sealed two-back total.</Text>
      </View>

      <View style={styles.switchRow}>
        {TRACK_IDS.map((trackId) => {
          const lane = trackFor(puzzle, trackId);
          return (
            <Pressable
              key={trackId}
              onPress={() => setState((current) => applyMove(current, { type: 'select_track', trackId }))}
              style={[styles.switchChip, activeTrack === trackId && styles.switchChipActive]}
            >
              <Text style={[styles.switchLabel, activeTrack === trackId && styles.switchLabelActive]}>
                {lane.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.cardTitle}>{`${track.label} · Selected H${selectedOriginalHouse}`}</Text>
        <Text style={styles.selectedValue}>{sealedValue ?? track.houses[selectedHouse]}</Text>
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
          style={[styles.controlButton, (!canCarry || state.verdict) && styles.controlButtonDisabled]}
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
          <Text style={styles.resetLabel}>Reset Loop</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetLabel}>New Loop</Text>
        </Pressable>
      </View>

      <Text style={styles.messageText}>{state.message}</Text>
      {state.verdict ? (
        <Text style={[styles.verdictText, state.verdict.correct ? styles.winText : styles.lossText]}>
          {state.verdict.label}
        </Text>
      ) : null}
      <Text style={styles.footerMeta}>
        {`${sealedHouseCount(state)} prefixes sealed · ${remainingUnsealed(state)} still open`}
      </Text>
    </View>
  );

  return (
    <GameScreenTemplate
      title="Loopledger"
      emoji="LL"
      subtitle="1D dynamic programming for House Robber II"
      objective="Break the alarmed ring both legal ways, certify the best quiet haul for each cut, then crown the larger finished cut without blowing the sunrise budget."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Loop', onPress: rerollPuzzle, tone: 'primary' },
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
          'Loopledger turns House Robber II into two linked ledgers. Because the first and last houses are adjacent, you must solve the ring twice: once excluding the first house and once excluding the last, then keep the better finished total.',
        takeaway:
          'The two cut cards map to `max(rob(nums.slice(1)), rob(nums.slice(0, -1)))`, and each cut still uses the House Robber recurrence `dp[i] = max(dp[i - 1], nums[i] + dp[i - 2])`.',
      }}
      leetcodeLinks={[
        {
          id: 213,
          title: 'House Robber II',
          url: 'https://leetcode.com/problems/house-robber-ii/',
        },
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
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 110,
    borderRadius: 18,
    backgroundColor: '#121920',
    borderWidth: 1,
    borderColor: '#2d3945',
    padding: 14,
    gap: 4,
  },
  cardTitle: {
    color: '#e7f0f4',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#9fb2bc',
    fontSize: 12,
    lineHeight: 17,
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#15181d',
    borderWidth: 1,
    borderColor: '#2a3038',
    padding: 14,
    gap: 12,
  },
  sectionHint: {
    color: '#98a6b4',
    fontSize: 13,
    lineHeight: 18,
  },
  ringRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ringHouseCard: {
    minWidth: 80,
    borderRadius: 14,
    backgroundColor: '#1e232b',
    borderWidth: 1,
    borderColor: '#343b45',
    padding: 10,
    gap: 4,
  },
  ringHouseAlarm: {
    borderColor: '#d98a4e',
    backgroundColor: '#2a1f18',
  },
  trackStack: {
    gap: 12,
  },
  trackCard: {
    borderRadius: 16,
    backgroundColor: '#101419',
    borderWidth: 1,
    borderColor: '#2f3843',
    padding: 12,
    gap: 10,
  },
  trackCardActive: {
    borderColor: '#7bdff2',
    backgroundColor: '#0f171d',
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  trackMeta: {
    color: '#9fb2bc',
    fontSize: 12,
    lineHeight: 16,
  },
  trackBadge: {
    minWidth: 44,
    borderRadius: 999,
    backgroundColor: '#1c2530',
    borderWidth: 1,
    borderColor: '#384757',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  trackBadgeText: {
    color: '#dff8ff',
    fontSize: 13,
    fontWeight: '800',
  },
  houseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trackHouseCard: {
    minWidth: 82,
    borderRadius: 14,
    backgroundColor: '#1b2129',
    borderWidth: 1,
    borderColor: '#333c47',
    padding: 10,
    gap: 4,
  },
  trackHouseCardSelected: {
    borderColor: '#7bdff2',
    backgroundColor: '#11212a',
  },
  trackHouseCardSealed: {
    borderColor: '#8bc34a',
    backgroundColor: '#182414',
  },
  houseLabel: {
    color: '#d7e6ee',
    fontSize: 12,
    fontWeight: '700',
  },
  stashValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  houseMeta: {
    color: '#9fb2bc',
    fontSize: 11,
    lineHeight: 15,
  },
  logWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    borderRadius: 999,
    backgroundColor: '#20252d',
    borderWidth: 1,
    borderColor: '#36414d',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  logText: {
    color: '#d7e6ee',
    fontSize: 12,
    lineHeight: 16,
  },
  emptyText: {
    color: '#9fb2bc',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#101820',
    borderWidth: 1,
    borderColor: '#22404d',
    padding: 12,
    gap: 8,
  },
  infoLine: {
    color: '#dceaf0',
    fontSize: 13,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  switchChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3f48',
    backgroundColor: '#242830',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  switchChipActive: {
    backgroundColor: '#7bdff2',
    borderColor: '#7bdff2',
  },
  switchLabel: {
    color: '#dceaf0',
    fontSize: 13,
    fontWeight: '800',
  },
  switchLabelActive: {
    color: '#0f1e24',
  },
  selectedCard: {
    borderRadius: 16,
    backgroundColor: '#151b22',
    borderWidth: 1,
    borderColor: '#303b46',
    padding: 12,
    gap: 6,
  },
  selectedValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  selectedMeta: {
    color: '#9fb2bc',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3b4653',
    backgroundColor: '#222831',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: '#d9f99d',
    borderColor: '#d9f99d',
  },
  controlLabel: {
    color: '#f3f6f8',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryLabel: {
    color: '#162108',
  },
  resetButton: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4a4f59',
    backgroundColor: '#2a2f38',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  messageText: {
    color: '#dceaf0',
    fontSize: 14,
    lineHeight: 20,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#b8f67d',
  },
  lossText: {
    color: '#ff8d8d',
  },
  footerMeta: {
    color: '#8d9aa7',
    fontSize: 12,
    lineHeight: 16,
  },
});
