import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';

type DifficultyId = 'easy' | 'medium' | 'hard';
type Phase = 'dawn' | 'dusk' | 'done';

type Puzzle = {
  id: DifficultyId;
  label: string;
  title: string;
  values: number[];
  budget: number;
  helper: string;
};

type ShrineState = {
  id: string;
  value: number;
  dawnCache: number | null;
  finalValue: number | null;
  solvedBy: 'sweep' | 'hand' | null;
};

type VerdictState = {
  correct: boolean;
  label: string;
};

type HaloState = {
  shrines: ShrineState[];
  phase: Phase;
  cursor: number;
  dawnCarry: number;
  duskCarry: number;
  actionsUsed: number;
  handForgeCount: number;
  message: string;
  verdict: VerdictState | null;
};

const PUZZLES: Puzzle[] = [
  {
    id: 'easy',
    label: 'Easy',
    title: 'Short Arc',
    values: [2, 3, 4, 5],
    budget: 17,
    helper: 'Hand-forging a few halos is survivable here, but the two-pass route is already cleaner.',
  },
  {
    id: 'medium',
    label: 'Medium',
    title: 'Crowded Ring',
    values: [3, 1, 2, 5, 4],
    budget: 16,
    helper: 'The row is long enough that rebuilding each halo from scratch wastes most of the budget.',
  },
  {
    id: 'hard',
    label: 'Hard',
    title: 'Zero Eclipse',
    values: [4, 0, 2, 3, 1, 5],
    budget: 15,
    helper: 'The zero breaks any division instinct. A dawn pass and a dusk pass still work cleanly.',
  },
];

function buildInitialState(puzzle: Puzzle): HaloState {
  return {
    shrines: puzzle.values.map((value, index) => ({
      id: `shrine-${index}`,
      value,
      dawnCache: null,
      finalValue: null,
      solvedBy: null,
    })),
    phase: 'dawn',
    cursor: 0,
    dawnCarry: 1,
    duskCarry: 1,
    actionsUsed: 0,
    handForgeCount: 0,
    message:
      'At dawn, either bank the carry before this shrine or hand-forge its halo from scratch. At dusk, fuse the reverse carry on the way back.',
    verdict: null,
  };
}

function computeTargets(values: number[]) {
  return values.map((_, index) =>
    values.reduce((product, value, valueIndex) => {
      if (valueIndex === index) return product;
      return product * value;
    }, 1),
  );
}

function formatNumber(value: number | null) {
  if (value === null) return '—';
  return String(value);
}

function finalizeRun(
  shrines: ShrineState[],
  actionsUsed: number,
  budget: number,
  targets: number[],
) {
  const matches = shrines.every(
    (shrine, index) => shrine.finalValue === targets[index],
  );
  const withinBudget = actionsUsed <= budget;
  const correct = matches && withinBudget;

  if (correct) {
    return {
      verdict: { correct: true, label: 'Budget kept' },
      message:
        'Every halo now holds the product of the other shrines, and the sweep stayed inside the budget.',
    };
  }

  if (!matches) {
    return {
      verdict: { correct: false, label: 'Wrong halo' },
      message:
        'One or more halos are wrong. The stable pattern is to bank the carry before the current shrine, then fuse a reverse carry later.',
    };
  }

  return {
    verdict: { correct: false, label: 'Over budget' },
    message:
      'The halo values are right, but too much hand-forging burned the budget. Reusable dawn and dusk carries are cheaper.',
  };
}

export default function Halo() {
  const [difficultyId, setDifficultyId] = useState<DifficultyId>('easy');
  const puzzle = useMemo(
    () => PUZZLES.find((entry) => entry.id === difficultyId) ?? PUZZLES[0],
    [difficultyId],
  );
  const targets = useMemo(() => computeTargets(puzzle.values), [puzzle.values]);
  const [state, setState] = useState<HaloState>(() => buildInitialState(puzzle));

  const resetPuzzle = (nextPuzzle = puzzle) => {
    setState(buildInitialState(nextPuzzle));
  };

  const switchDifficulty = (nextId: DifficultyId) => {
    const nextPuzzle = PUZZLES.find((entry) => entry.id === nextId) ?? PUZZLES[0];
    setDifficultyId(nextId);
    setState(buildInitialState(nextPuzzle));
  };

  const bankDawn = () => {
    setState((current) => {
      if (current.phase !== 'dawn') {
        return {
          ...current,
          message: 'The dawn sweep is over. Walk back from the right and fuse the reverse carry.',
        };
      }

      const shrine = current.shrines[current.cursor];
      if (!shrine) return current;

      const nextShrines = current.shrines.map((entry, index) =>
        index === current.cursor
          ? { ...entry, dawnCache: current.dawnCarry }
          : entry,
      );
      const nextCarry = current.dawnCarry * shrine.value;
      const nextCursor = current.cursor + 1;

      if (nextCursor >= nextShrines.length) {
        return {
          ...current,
          shrines: nextShrines,
          phase: 'dusk',
          cursor: nextShrines.length - 1,
          dawnCarry: nextCarry,
          duskCarry: 1,
          actionsUsed: current.actionsUsed + 1,
          verdict: null,
          message:
            'Dawn caches are in place. Reset the carry to 1 and walk back from the right to finish each halo.',
        };
      }

      return {
        ...current,
        shrines: nextShrines,
        cursor: nextCursor,
        dawnCarry: nextCarry,
        actionsUsed: current.actionsUsed + 1,
        verdict: null,
        message: `Banked ${formatNumber(current.dawnCarry)} before shrine ${current.cursor + 1}.`,
      };
    });
  };

  const handForge = () => {
    setState((current) => {
      if (current.phase !== 'dawn') {
        return {
          ...current,
          message: 'Hand-forging only happens during the outward pass. The return pass is for fusion.',
        };
      }

      const shrine = current.shrines[current.cursor];
      if (!shrine) return current;

      const forgedValue = targets[current.cursor];
      const nextShrines: ShrineState[] = current.shrines.map((entry, index) =>
        index === current.cursor
          ? { ...entry, finalValue: forgedValue, solvedBy: 'hand' }
          : entry,
      );
      const nextCarry = current.dawnCarry * shrine.value;
      const nextCursor = current.cursor + 1;
      const actionCost = puzzle.values.length - 1;
      const nextActionsUsed = current.actionsUsed + actionCost;

      if (nextCursor >= nextShrines.length) {
        return {
          ...current,
          shrines: nextShrines,
          phase: 'dusk',
          cursor: nextShrines.length - 1,
          dawnCarry: nextCarry,
          duskCarry: 1,
          actionsUsed: nextActionsUsed,
          handForgeCount: current.handForgeCount + 1,
          verdict: null,
          message:
            'You forged the last halo by hand. It works, but that cost would be brutal on longer rows. Start the dusk return now.',
        };
      }

      return {
        ...current,
        shrines: nextShrines,
        cursor: nextCursor,
        dawnCarry: nextCarry,
        actionsUsed: nextActionsUsed,
        handForgeCount: current.handForgeCount + 1,
        verdict: null,
        message: `Hand-forged shrine ${current.cursor + 1} for ${forgedValue}. Correct, but expensive.`,
      };
    });
  };

  const fuseDusk = () => {
    setState((current) => {
      if (current.phase !== 'dusk') {
        return {
          ...current,
          message: 'Finish the outward sweep before you start fusing the reverse carry.',
        };
      }

      const shrine = current.shrines[current.cursor];
      if (!shrine) return current;

      const nextFinalValue =
        shrine.finalValue ?? (shrine.dawnCache ?? 1) * current.duskCarry;
      const nextSolvedBy: ShrineState['solvedBy'] = shrine.solvedBy ?? 'sweep';
      const nextShrines = current.shrines.map((entry, index) =>
        index === current.cursor
          ? {
              ...entry,
              finalValue: nextFinalValue,
              solvedBy: nextSolvedBy,
            }
          : entry,
      );
      const nextCarry = current.duskCarry * shrine.value;
      const nextActionsUsed = current.actionsUsed + 1;
      const nextCursor = current.cursor - 1;

      if (nextCursor < 0) {
        const outcome = finalizeRun(
          nextShrines,
          nextActionsUsed,
          puzzle.budget,
          targets,
        );

        return {
          ...current,
          shrines: nextShrines,
          phase: 'done',
          cursor: 0,
          duskCarry: nextCarry,
          actionsUsed: nextActionsUsed,
          verdict: outcome.verdict,
          message: outcome.message,
        };
      }

      return {
        ...current,
        shrines: nextShrines,
        cursor: nextCursor,
        duskCarry: nextCarry,
        actionsUsed: nextActionsUsed,
        verdict: null,
        message:
          shrine.solvedBy === 'hand'
            ? `Shrine ${current.cursor + 1} was already hand-forged. The dusk carry still moves past it.`
            : `Fused shrine ${current.cursor + 1} into ${nextFinalValue}. Keep carrying the right-side product leftward.`,
      };
    });
  };

  const currentTarget =
    state.phase === 'dawn' || state.phase === 'dusk'
      ? puzzle.values[state.cursor]
      : null;
  const statsLabel = `${state.actionsUsed}/${puzzle.budget} actions`;

  const difficultyOptions = PUZZLES.map((entry) => ({
    label: entry.label,
    selected: entry.id === difficultyId,
    onPress: () => switchDifficulty(entry.id),
  }));

  const board = (
    <View style={styles.board}>
      <View style={styles.phaseRow}>
        <View style={[styles.phaseBadge, state.phase === 'dawn' && styles.phaseBadgeActive]}>
          <Text style={styles.phaseLabel}>Dawn Carry {state.dawnCarry}</Text>
        </View>
        <View style={[styles.phaseBadge, state.phase === 'dusk' && styles.phaseBadgeActive]}>
          <Text style={styles.phaseLabel}>Dusk Carry {state.duskCarry}</Text>
        </View>
        <View style={[styles.phaseBadge, state.phase === 'done' && styles.phaseBadgeActive]}>
          <Text style={styles.phaseLabel}>Complete</Text>
        </View>
      </View>

      <View style={styles.shrineRow}>
        {state.shrines.map((shrine, index) => {
          const isCurrent =
            state.phase !== 'done' && index === state.cursor;
          return (
            <View
              key={shrine.id}
              style={[styles.shrineCard, isCurrent && styles.shrineCardCurrent]}
            >
              <Text style={styles.shrineIndex}>Shrine {index + 1}</Text>
              <Text style={styles.shrineValue}>Factor {shrine.value}</Text>
              <View style={styles.readoutBlock}>
                <Text style={styles.readoutLabel}>Dawn</Text>
                <Text style={styles.readoutValue}>
                  {formatNumber(shrine.dawnCache)}
                </Text>
              </View>
              <View style={styles.readoutBlock}>
                <Text style={styles.readoutLabel}>Halo</Text>
                <Text style={styles.readoutValue}>
                  {formatNumber(shrine.finalValue)}
                </Text>
              </View>
              <Text style={styles.shrineMeta}>
                {shrine.solvedBy === 'hand'
                  ? 'hand-forged'
                  : shrine.solvedBy === 'sweep'
                    ? 'two-pass'
                    : 'pending'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controls}>
      <Text style={styles.controlText}>
        Current shrine: {state.phase === 'done' ? 'finished' : state.cursor + 1}
      </Text>
      <Text style={styles.controlText}>
        Current factor: {currentTarget === null ? '—' : currentTarget}
      </Text>
      <Text style={styles.controlText}>{state.message}</Text>

      <View style={styles.buttonGrid}>
        <Pressable
          style={[
            styles.controlButton,
            state.phase !== 'dawn' && styles.controlButtonDisabled,
          ]}
          disabled={state.phase !== 'dawn'}
          onPress={bankDawn}
        >
          <Text style={styles.controlButtonLabel}>Bank Dawn</Text>
          <Text style={styles.controlButtonHint}>
            Store carry, then absorb this shrine
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.controlButton,
            styles.controlButtonDanger,
            state.phase !== 'dawn' && styles.controlButtonDisabled,
          ]}
          disabled={state.phase !== 'dawn'}
          onPress={handForge}
        >
          <Text style={styles.controlButtonLabel}>Hand Forge</Text>
          <Text style={styles.controlButtonHint}>
            Solve this one from scratch for {puzzle.values.length - 1} actions
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.controlButton,
            state.phase !== 'dusk' && styles.controlButtonDisabled,
          ]}
          disabled={state.phase !== 'dusk'}
          onPress={fuseDusk}
        >
          <Text style={styles.controlButtonLabel}>Fuse Dusk</Text>
          <Text style={styles.controlButtonHint}>
            Multiply the stored dawn value by the reverse carry
          </Text>
        </Pressable>
      </View>

      {state.verdict ? (
        <View
          style={[
            styles.verdictCard,
            state.verdict.correct ? styles.verdictSuccess : styles.verdictFail,
          ]}
        >
          <Text style={styles.verdictLabel}>{state.verdict.label}</Text>
          <Text style={styles.verdictText}>{state.message}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <GameScreenTemplate
      title="Halo"
      emoji="o"
      subtitle="Build each shrine's halo from every other factor without dividing or rebuilding the whole ring."
      objective="Complete the outward dawn sweep and the return dusk sweep inside the action budget. Hand-forging works, but it should feel too expensive once the row gets longer."
      statsLabel={statsLabel}
      actions={[
        {
          label: 'Reset Puzzle',
          onPress: () => resetPuzzle(),
        },
      ]}
      difficultyOptions={difficultyOptions}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        summary:
          'The dawn sweep stores the product of everything to the left of each shrine. The dusk sweep carries the product of everything to the right and multiplies it into that stored value.',
        takeaway:
          'The first shrine banking a 1 is the same code move as `answer[i] = prefix` before `prefix *= nums[i]`.',
      }}
      leetcodeLinks={[
        {
          id: 238,
          title: 'Product of Array Except Self',
          url: 'https://leetcode.com/problems/product-of-array-except-self/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  board: {
    gap: 12,
  },
  phaseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  phaseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#161d25',
    borderWidth: 1,
    borderColor: '#2f4a5f',
  },
  phaseBadgeActive: {
    backgroundColor: '#11324d',
    borderColor: '#75c2ff',
  },
  phaseLabel: {
    color: '#d7ecff',
    fontSize: 12,
    fontWeight: '700',
  },
  shrineRow: {
    gap: 10,
  },
  shrineCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e3c4a',
    backgroundColor: '#11171d',
    padding: 14,
    gap: 8,
  },
  shrineCardCurrent: {
    borderColor: '#9cd7ff',
    backgroundColor: '#162733',
  },
  shrineIndex: {
    color: '#9eb8cd',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  shrineValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  readoutBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readoutLabel: {
    color: '#a4b3bf',
    fontSize: 13,
  },
  readoutValue: {
    color: '#f4f8fb',
    fontSize: 18,
    fontWeight: '700',
  },
  shrineMeta: {
    color: '#79b9e8',
    fontSize: 12,
    fontWeight: '700',
  },
  controls: {
    gap: 12,
  },
  controlText: {
    color: '#d7dadc',
    fontSize: 14,
    lineHeight: 20,
  },
  buttonGrid: {
    gap: 10,
  },
  controlButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2f5874',
    backgroundColor: '#173a4f',
    padding: 14,
    gap: 4,
  },
  controlButtonDanger: {
    borderColor: '#7b5330',
    backgroundColor: '#4b2e17',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlButtonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  controlButtonHint: {
    color: '#d0e9ff',
    fontSize: 12,
    lineHeight: 18,
  },
  verdictCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  verdictSuccess: {
    backgroundColor: '#123222',
    borderColor: '#4db67b',
  },
  verdictFail: {
    backgroundColor: '#3a1a1e',
    borderColor: '#cf6d77',
  },
  verdictLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  verdictText: {
    color: '#f3f4f6',
    fontSize: 13,
    lineHeight: 19,
  },
});
