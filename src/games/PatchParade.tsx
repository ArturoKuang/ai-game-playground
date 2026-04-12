import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentFrequencyTable,
  currentLeaderInfo,
  currentPatchDebt,
  currentWindowLength,
  currentWindowSymbols,
  formatRange,
  fullRehangCost,
  generatePuzzle,
  incomingMatchesLeader,
  incomingSymbol,
  projectedLeaderInfo,
  projectedPatchDebt,
  type PatchParadeDifficulty,
  type PatchParadeState,
  upcomingCount,
} from '../solvers/PatchParade.solver';

const DIFFICULTIES: PatchParadeDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: PatchParadeDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function PatchParade() {
  const [difficulty, setDifficulty] = useState<PatchParadeDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<PatchParadeState>(() => createInitialState(buildPuzzle(1, 0)));

  const liveWindow = useMemo(() => currentWindowSymbols(state), [state]);
  const incoming = useMemo(() => incomingSymbol(state), [state]);
  const currentLeader = useMemo(() => currentLeaderInfo(state), [state]);
  const projectedLeader = useMemo(() => projectedLeaderInfo(state), [state]);
  const patchDebt = useMemo(() => currentPatchDebt(state), [state]);
  const projectedDebt = useMemo(() => projectedPatchDebt(state), [state]);
  const rehangCost = useMemo(() => fullRehangCost(state), [state]);
  const bandLength = useMemo(() => currentWindowLength(state), [state]);
  const remaining = useMemo(() => upcomingCount(state), [state]);
  const ledger = useMemo(() => currentFrequencyTable(state), [state]);
  const safeToHang = incoming !== null && projectedDebt <= puzzle.patchLimit;

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

  const switchDifficulty = (nextDifficulty: PatchParadeDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'hangNext' | 'trimLeft' | 'fullRehang') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>
          {puzzle.label} · patch limit {puzzle.patchLimit}
        </Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>
          Keep the longest banner that could still be repainted into one emblem. A few strays are fine; overflow is not.
        </Text>
      </View>

      <View style={styles.streamCard}>
        <Text style={styles.cardTitle}>Parade Row</Text>
        <View style={styles.streamRow}>
          {puzzle.symbols.map((symbol, index) => {
            const isPast = index < state.left;
            const inWindow = index >= state.left && index < state.right;
            const isIncoming = index === state.right && !state.verdict;
            const isBest = state.bestRange ? index >= state.bestRange[0] && index < state.bestRange[1] : false;

            return (
              <View
                key={`${symbol}-${index}`}
                style={[
                  styles.symbolCard,
                  isPast && styles.symbolCardPast,
                  inWindow && styles.symbolCardWindow,
                  isIncoming && styles.symbolCardIncoming,
                  isBest && styles.symbolCardBest,
                ]}
              >
                <Text style={styles.symbolIndex}>{index + 1}</Text>
                <Text style={styles.symbolValue}>{symbol}</Text>
                <Text style={styles.symbolMeta}>
                  {isIncoming ? 'next' : inWindow ? 'live' : isPast ? 'past' : isBest ? 'best' : ' '}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Live Banner</Text>
          <Text style={styles.summaryValue}>{liveWindow.join('') || 'empty'}</Text>
          <Text style={styles.summaryMeta}>Length {bandLength}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Incoming</Text>
          <Text style={styles.summaryValue}>{incoming ?? 'done'}</Text>
          <Text style={styles.summaryMeta}>
            {incoming === null
              ? 'Route complete.'
              : safeToHang
                ? 'Still fits the patch crew.'
                : `Would need ${projectedDebt} patches.`}
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Lead Emblem</Text>
          <Text style={styles.summaryValue}>{currentLeader.symbol ?? '-'}</Text>
          <Text style={styles.summaryMeta}>
            Current {currentLeader.count} · Next {projectedLeader.symbol ?? '-'} x {projectedLeader.count}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Repair Debt</Text>
          <Text style={styles.summaryValue}>
            {patchDebt}/{puzzle.patchLimit}
          </Text>
          <Text style={styles.summaryMeta}>Projected debt {incoming === null ? patchDebt : projectedDebt}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Best Banner</Text>
          <Text style={styles.summaryValue}>{state.bestSpan}</Text>
          <Text style={styles.summaryMeta}>Slots {formatRange(state.bestRange)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Pennants Left</Text>
          <Text style={styles.summaryValue}>{remaining}</Text>
          <Text style={styles.summaryMeta}>Full rehang costs {rehangCost} actions.</Text>
        </View>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.cardTitle}>Lead Ledger</Text>
        {ledger.length > 0 ? (
          <View style={styles.logRow}>
            {ledger.map((entry) => (
              <View
                key={`${entry.symbol}-${entry.count}`}
                style={[
                  styles.ledgerChip,
                  entry.symbol === currentLeader.symbol && styles.ledgerChipLeader,
                ]}
              >
                <Text style={styles.logValue}>{entry.symbol}</Text>
                <Text style={styles.logMeta}>{entry.count} in banner</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Counts appear here once the live banner starts growing.</Text>
        )}
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.cardTitle}>Milestones</Text>
        {state.milestones.length > 0 ? (
          <View style={styles.logRow}>
            {state.milestones.map((milestone) => (
              <View key={`${milestone.span}-${milestone.range[0]}-${milestone.range[1]}`} style={styles.logChip}>
                <Text style={styles.logValue}>{milestone.note}</Text>
                <Text style={styles.logMeta}>
                  {milestone.span} wide · lead {milestone.leader} · debt {milestone.patchDebt}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Your best patchable banner will appear here as soon as it improves.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Crew Desk</Text>
        <Text style={styles.infoLine}>Hang Next: add the incoming pennant if the repaint debt stays within the crew limit.</Text>
        <Text style={styles.infoLine}>Trim Left: remove the oldest pennant from the banner front.</Text>
        <Text style={styles.infoLine}>Full Rehang: clear the whole banner and restart on the incoming pennant. Fast to think, expensive to do.</Text>
      </View>

      {incoming !== null ? (
        <View style={[styles.warningCard, safeToHang ? styles.warningCardCool : styles.warningCardHot]}>
          <Text style={styles.warningTitle}>{safeToHang ? 'Within Budget' : 'Patch Overflow'}</Text>
          <Text style={styles.warningText}>
            {safeToHang
              ? incomingMatchesLeader(state)
                ? `${incoming} matches the current lead. Hanging it strengthens the banner immediately.`
                : `${incoming} is off-emblem, but the crew can still absorb it. Do not trim early just to chase purity.`
              : `Hanging ${incoming} would demand ${projectedDebt} repaints, above the limit of ${puzzle.patchLimit}. Trim from the left until the banner fits again.`}
          </Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('trimLeft')}
          disabled={Boolean(state.verdict) || bandLength === 0}
          style={[
            styles.controlButton,
            (state.verdict || bandLength === 0) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.controlButtonLabel}>Trim Left</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('hangNext')}
          disabled={Boolean(state.verdict) || !safeToHang}
          style={[
            styles.controlButton,
            styles.primaryButton,
            (state.verdict || !safeToHang) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Hang Next</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('fullRehang')}
          disabled={Boolean(state.verdict) || incoming === null}
          style={[styles.controlButton, (state.verdict || incoming === null) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Full Rehang</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Route</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Route</Text>
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
      title="Patch Parade"
      emoji="PP"
      subtitle="Sliding window for Longest Repeating Character Replacement"
      objective="Sweep the parade route left to right, keep the longest banner that could be repainted into one emblem with at most k patches, and avoid wasting actions on full rehangs."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Route',
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
          'This is the longest-repeating-character-replacement sliding window: the banner may keep a few off-emblem pennants as long as window length minus the lead count stays within k.',
        takeaway:
          'Hang Next maps to expanding `right` while `windowSize - maxFrequency <= k`. Trim Left maps to advancing `left` only after the projected repaint debt would overflow the patch budget.',
      }}
      leetcodeLinks={[
        {
          id: 424,
          title: 'Longest Repeating Character Replacement',
          url: 'https://leetcode.com/problems/longest-repeating-character-replacement/',
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
    backgroundColor: '#22191a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#5f4042',
    gap: 6,
  },
  titleLabel: {
    color: '#ffb2a1',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#fff5f2',
    fontSize: 22,
    fontWeight: '800',
  },
  titleHint: {
    color: '#f0cdc7',
    fontSize: 13,
    lineHeight: 18,
  },
  streamCard: {
    backgroundColor: '#181b23',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#313646',
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    color: '#e9eef9',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  streamRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symbolCard: {
    width: 66,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3b4051',
    backgroundColor: '#202634',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  symbolCardPast: {
    opacity: 0.45,
  },
  symbolCardWindow: {
    borderColor: '#79c58b',
    backgroundColor: '#1d3324',
  },
  symbolCardIncoming: {
    borderColor: '#f3c46a',
    backgroundColor: '#3b2d12',
  },
  symbolCardBest: {
    shadowColor: '#79c58b',
    shadowOpacity: 0.32,
    shadowRadius: 8,
  },
  symbolIndex: {
    color: '#9aa7bb',
    fontSize: 11,
    fontWeight: '700',
  },
  symbolValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  symbolMeta: {
    color: '#d8deea',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#181b23',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#313646',
    padding: 14,
    gap: 6,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#d1d7e3',
    fontSize: 12,
    lineHeight: 17,
  },
  historyCard: {
    backgroundColor: '#181b23',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#313646',
    padding: 16,
    gap: 12,
  },
  logRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ledgerChip: {
    borderRadius: 14,
    backgroundColor: '#232a38',
    borderWidth: 1,
    borderColor: '#394156',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
  },
  ledgerChipLeader: {
    backgroundColor: '#2c3923',
    borderColor: '#74bd65',
  },
  logChip: {
    borderRadius: 14,
    backgroundColor: '#2b2021',
    borderWidth: 1,
    borderColor: '#7b4d52',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
  },
  logValue: {
    color: '#fff7f4',
    fontSize: 15,
    fontWeight: '800',
  },
  logMeta: {
    color: '#efcecb',
    fontSize: 11,
  },
  emptyText: {
    color: '#b8c2d1',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#384153',
    backgroundColor: '#191f2b',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#dde5ef',
    fontSize: 13,
    lineHeight: 18,
  },
  warningCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  warningCardHot: {
    backgroundColor: '#3a2122',
    borderColor: '#8b4f52',
  },
  warningCardCool: {
    backgroundColor: '#1d3126',
    borderColor: '#3c7c59',
  },
  warningTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  warningText: {
    color: '#e4ecf5',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#49546a',
    backgroundColor: '#253041',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#ffb2a1',
    borderColor: '#ffb2a1',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlButtonLabel: {
    color: '#f5f8fb',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButtonLabel: {
    color: '#2d1718',
    fontSize: 13,
    fontWeight: '900',
  },
  resetButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#384153',
    backgroundColor: '#191f2b',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonLabel: {
    color: '#dde5ef',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#e2e8f2',
    fontSize: 13,
    lineHeight: 18,
  },
  verdictText: {
    fontSize: 16,
    fontWeight: '900',
  },
  winText: {
    color: '#82e092',
  },
  lossText: {
    color: '#ff9b9b',
  },
});
