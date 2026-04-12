import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  anchorPrice,
  applyMove,
  createInitialState,
  currentPrice,
  currentScanCost,
  currentSpread,
  formatPair,
  generatePuzzle,
  upcomingCount,
  type TickerDifficulty,
  type TickerState,
} from '../solvers/Ticker.solver';

const DIFFICULTIES: TickerDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: TickerDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Ticker() {
  const [difficulty, setDifficulty] = useState<TickerDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<TickerState>(() => createInitialState(buildPuzzle(1, 0)));

  const livePrice = useMemo(() => currentPrice(state), [state]);
  const buyPrice = useMemo(() => anchorPrice(state), [state]);
  const spread = useMemo(() => currentSpread(state), [state]);
  const scanCost = useMemo(() => currentScanCost(state), [state]);
  const daysLeft = useMemo(() => upcomingCount(state), [state]);

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

  const switchDifficulty = (nextDifficulty: TickerDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'lowerAnchor' | 'logSale' | 'historyScan') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>{puzzle.label}</Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>Every later sale only cares about the cheapest buy you have seen so far.</Text>
      </View>

      <View style={styles.tapeCard}>
        <Text style={styles.cardTitle}>Price Tape</Text>
        <View style={styles.tapeRow}>
          {puzzle.prices.map((price, index) => {
            const isPast = index < state.dayIndex;
            const isCurrent = index === state.dayIndex && !state.verdict;
            const isAnchor = index === state.buyIndex;
            const isBestBuy = state.bestPair ? index === state.bestPair[0] : false;
            const isBestSell = state.bestPair ? index === state.bestPair[1] : false;

            return (
              <View
                key={`${price}-${index}`}
                style={[
                  styles.priceCard,
                  isPast && styles.priceCardPast,
                  isCurrent && styles.priceCardCurrent,
                  isAnchor && styles.priceCardAnchor,
                  isBestBuy && styles.priceCardBestBuy,
                  isBestSell && styles.priceCardBestSell,
                ]}
              >
                <Text style={styles.dayLabel}>D{index + 1}</Text>
                <Text style={styles.priceValue}>{price}</Text>
                <Text style={styles.markerLabel}>
                  {isAnchor ? 'anchor' : isCurrent ? 'live' : isBestBuy ? 'buy' : isBestSell ? 'sell' : ' '}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Live Anchor</Text>
          <Text style={styles.summaryValue}>{buyPrice ?? 'done'}</Text>
          <Text style={styles.summaryMeta}>Day {state.buyIndex + 1}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Today</Text>
          <Text style={styles.summaryValue}>{livePrice ?? 'closed'}</Text>
          <Text style={styles.summaryMeta}>
            {livePrice === null ? 'No days left.' : `Spread now ${spread ?? 0}`}
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Best Logged</Text>
          <Text style={styles.summaryValue}>{state.bestProfit}</Text>
          <Text style={styles.summaryMeta}>
            {state.bestPair ? `Days ${formatPair(state.bestPair)}` : 'No profitable trade yet.'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Tape Left</Text>
          <Text style={styles.summaryValue}>{daysLeft}</Text>
          <Text style={styles.summaryMeta}>Scan costs {scanCost} actions right now.</Text>
        </View>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.cardTitle}>Logged Upgrades</Text>
        {state.tradeLog.length > 0 ? (
          <View style={styles.logRow}>
            {state.tradeLog.map((trade) => (
              <View
                key={`${trade.buyIndex}-${trade.sellIndex}-${trade.profit}-${trade.source}`}
                style={styles.logChip}
              >
                <Text style={styles.logValue}>{trade.profit}</Text>
                <Text style={styles.logMeta}>
                  {formatPair([trade.buyIndex, trade.sellIndex])} {trade.source === 'scan' ? 'scan' : 'live'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Best spread stays at zero until a later day beats the anchor.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Desk Rules</Text>
        <Text style={styles.infoLine}>Lower Anchor: move the live buy marker to today if this is the new floor.</Text>
        <Text style={styles.infoLine}>Log Today: compare today against the current anchor and keep the best spread seen.</Text>
        <Text style={styles.infoLine}>History Scan: brute-force the seen tape for today, but it burns extra actions.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('lowerAnchor')}
          disabled={Boolean(state.verdict) || livePrice === null}
          style={[styles.controlButton, (state.verdict || livePrice === null) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Lower Anchor</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('logSale')}
          disabled={Boolean(state.verdict) || livePrice === null}
          style={[
            styles.controlButton,
            styles.primaryButton,
            (state.verdict || livePrice === null) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Log Today</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('historyScan')}
          disabled={Boolean(state.verdict) || livePrice === null}
          style={[styles.controlButton, (state.verdict || livePrice === null) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>History Scan</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Tape</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Tape</Text>
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
      title="Ticker"
      emoji="TS"
      subtitle="Rolling minimum for Best Time to Buy and Sell Stock"
      objective="Walk the tape from left to right. Keep one live buy anchor at the cheapest price seen so far, and log the single best later sale before the action budget runs out."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Tape',
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
          'This is the one-pass stock-profit loop: keep the cheapest price seen so far as the live buy anchor, and on every later day compare today against that anchor to update the best profit.',
        takeaway:
          'Lowering the anchor maps to `minPrice = Math.min(minPrice, price)`. Logging today maps to `maxProfit = Math.max(maxProfit, price - minPrice)`.',
      }}
      leetcodeLinks={[
        {
          id: 121,
          title: 'Best Time to Buy and Sell Stock',
          url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',
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
    backgroundColor: '#162028',
    borderRadius: 18,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#27404f',
  },
  titleLabel: {
    color: '#78b7ff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  titleText: {
    color: '#f4f7fb',
    fontSize: 22,
    fontWeight: '800',
  },
  titleHint: {
    color: '#b2c1ce',
    fontSize: 13,
    lineHeight: 18,
  },
  tapeCard: {
    backgroundColor: '#13181e',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2c3640',
  },
  cardTitle: {
    color: '#f3f5f7',
    fontSize: 15,
    fontWeight: '700',
  },
  tapeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  priceCard: {
    minWidth: 62,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a424d',
    backgroundColor: '#1a2129',
    alignItems: 'center',
    gap: 4,
  },
  priceCardPast: {
    opacity: 0.84,
  },
  priceCardCurrent: {
    borderColor: '#f0b54a',
    backgroundColor: '#312311',
  },
  priceCardAnchor: {
    borderColor: '#4cc38a',
    backgroundColor: '#143024',
  },
  priceCardBestBuy: {
    borderColor: '#4b86ff',
  },
  priceCardBestSell: {
    borderColor: '#d86868',
  },
  dayLabel: {
    color: '#93a0ad',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  priceValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  markerLabel: {
    color: '#b8c0c8',
    fontSize: 10,
    minHeight: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#14191f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e363f',
    padding: 14,
    gap: 6,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#a1acb7',
    fontSize: 12,
    lineHeight: 17,
  },
  historyCard: {
    backgroundColor: '#14191f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e363f',
    padding: 14,
    gap: 10,
  },
  logRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    backgroundColor: '#20262d',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#33404a',
    gap: 2,
  },
  logValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  logMeta: {
    color: '#9fa9b3',
    fontSize: 10,
    textAlign: 'center',
  },
  emptyText: {
    color: '#9fa9b3',
    fontSize: 12,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#14191f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e363f',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#c1c9d1',
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
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#242c35',
    borderWidth: 1,
    borderColor: '#394450',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#eef3f6',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#2962ff',
    borderColor: '#2962ff',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  resetButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171c23',
    borderWidth: 1,
    borderColor: '#303944',
  },
  resetButtonLabel: {
    color: '#d2dae1',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#b8c2cb',
    fontSize: 13,
    lineHeight: 18,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#54d69b',
  },
  lossText: {
    color: '#ff7e7e',
  },
});
