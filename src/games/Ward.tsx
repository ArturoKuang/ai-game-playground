import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  getCurrentCell,
  getDisplayPuzzle,
  manualSweepCostForCell,
  type WardDifficulty,
  type WardPuzzle,
  type WardState,
} from '../solvers/Ward.solver';

const DIFFICULTIES: WardDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: WardDifficulty) {
  return getDisplayPuzzle(difficulty);
}

function boxSpan(size: number, boxCols: number) {
  return Math.floor(size / boxCols);
}

function cellSizeFor(size: number) {
  if (size <= 4) return 58;
  if (size <= 6) return 44;
  return 31;
}

function registryCountLabel(label: string, entries: string[]) {
  return `${label} ${entries.length}`;
}

export default function Ward() {
  const [difficulty, setDifficulty] = useState<WardDifficulty>(1);
  const [puzzle, setPuzzle] = useState<WardPuzzle>(() => buildPuzzle(1));
  const [state, setState] = useState<WardState>(() => createInitialState(buildPuzzle(1)));

  const currentCell = useMemo(() => getCurrentCell(state), [state]);
  const currentRow = currentCell ? state.rowSeen[currentCell.row] : [];
  const currentCol = currentCell ? state.colSeen[currentCell.col] : [];
  const currentBox = currentCell ? state.boxSeen[currentCell.boxIndex] : [];

  const resetPuzzle = (nextPuzzle = puzzle) => {
    setPuzzle(nextPuzzle);
    setState(createInitialState(nextPuzzle));
  };

  const switchDifficulty = (nextDifficulty: WardDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty);
    setDifficulty(nextDifficulty);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (
    move: 'register' | 'scan' | 'callValid' | 'callBroken',
  ) => {
    setState((current) => applyMove(current, { type: move }));
  };

  const board = (
    <View style={styles.boardWrapper}>
      <View style={[styles.boardGrid, { width: cellSizeFor(puzzle.size) * puzzle.size + 8 }]}>
        {puzzle.rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.boardRow}>
            {row.split('').map((value, colIndex) => {
              const cellId = `r${rowIndex}c${colIndex}`;
              const processedBy = state.processed[cellId];
              const isCurrent = currentCell?.id === cellId;
              const isFilled = value !== '.';
              const borderRight =
                (colIndex + 1) % puzzle.boxCols === 0 && colIndex < puzzle.size - 1;
              const borderBottom =
                (rowIndex + 1) % puzzle.boxRows === 0 && rowIndex < puzzle.size - 1;

              return (
                <View
                  key={cellId}
                  style={[
                    styles.cell,
                    {
                      width: cellSizeFor(puzzle.size),
                      height: cellSizeFor(puzzle.size),
                    },
                    isFilled && styles.filledCell,
                    processedBy === 'register' && styles.registeredCell,
                    processedBy === 'scan' && styles.scannedCell,
                    isCurrent && styles.currentCell,
                    borderRight && styles.boxRightEdge,
                    borderBottom && styles.boxBottomEdge,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      puzzle.size >= 9 && styles.cellTextCompact,
                      !isFilled && styles.emptyCellText,
                    ]}
                  >
                    {value === '.' ? '·' : value}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendChip}>
          <View style={[styles.legendSwatch, styles.currentCell]} />
          <Text style={styles.legendText}>current</Text>
        </View>
        <View style={styles.legendChip}>
          <View style={[styles.legendSwatch, styles.registeredCell]} />
          <Text style={styles.legendText}>warded</Text>
        </View>
        <View style={styles.legendChip}>
          <View style={[styles.legendSwatch, styles.scannedCell]} />
          <Text style={styles.legendText}>swept</Text>
        </View>
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Current Cell</Text>
        {currentCell ? (
          <>
            <Text style={styles.infoLine}>
              Rune {currentCell.value} at row {currentCell.row + 1}, column {currentCell.col + 1}, chamber{' '}
              {currentCell.boxIndex + 1}
            </Text>
            <Text style={styles.infoLine}>
              Manual sweep cost: {manualSweepCostForCell(currentCell)}
            </Text>
          </>
        ) : (
          <Text style={styles.infoLine}>Patrol complete. Call the verdict.</Text>
        )}
      </View>

      <View style={styles.registryCard}>
        <Text style={styles.infoTitle}>Active Registries</Text>
        {currentCell ? (
          <View style={styles.registryRow}>
            <Text style={styles.registryChip}>
              {registryCountLabel(`Row ${currentCell.row + 1}:`, currentRow)}
            </Text>
            <Text style={styles.registryChip}>
              {registryCountLabel(`Col ${currentCell.col + 1}:`, currentCol)}
            </Text>
            <Text style={styles.registryChip}>
              {registryCountLabel(`Ch ${currentCell.boxIndex + 1}:`, currentBox)}
            </Text>
          </View>
        ) : (
          <Text style={styles.infoLine}>No active cell. The ledgers are ready for a verdict.</Text>
        )}
      </View>

      {state.conflictFound ? (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>Breach Found</Text>
          <Text style={styles.alertText}>{state.conflictLabel}</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          disabled={!currentCell || Boolean(state.verdict)}
          onPress={() => runMove('register')}
          style={[
            styles.controlButton,
            styles.primaryButton,
            (!currentCell || state.verdict) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Ward Cell (+1)</Text>
        </Pressable>
        <Pressable
          disabled={!currentCell || Boolean(state.verdict)}
          onPress={() => runMove('scan')}
          style={[
            styles.controlButton,
            (!currentCell || state.verdict) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.controlButtonLabel}>
            Sweep ({currentCell ? manualSweepCostForCell(currentCell) : 0})
          </Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={Boolean(state.verdict)}
          onPress={() => runMove('callValid')}
          style={[styles.controlButton, Boolean(state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Call Valid</Text>
        </Pressable>
        <Pressable
          disabled={Boolean(state.verdict)}
          onPress={() => runMove('callBroken')}
          style={[styles.controlButton, Boolean(state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Call Broken</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
        <Text style={styles.resetButtonLabel}>Reset Patrol</Text>
      </Pressable>

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
      title="Ward"
      emoji="[]"
      subtitle="Scoped hash registries for Valid Sudoku"
      objective="Process every filled cell. Ward it into row, column, and chamber ledgers, then call whether the board is valid or broken without wasting the patrol budget."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
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
          'Each filled Sudoku cell belongs to three overlapping groups. The strong move is to record the digit in all three groups once, not to rescan the same neighborhoods every time.',
        takeaway:
          'This maps directly to the seen-set solution for Valid Sudoku: row key, column key, and box key.',
      }}
      leetcodeLinks={[
        {
          id: 36,
          title: 'Valid Sudoku',
          url: 'https://leetcode.com/problems/valid-sudoku/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardWrapper: {
    alignItems: 'center',
    gap: 12,
  },
  boardGrid: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3a3a3c',
    backgroundColor: '#0f1418',
  },
  boardRow: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#2d3640',
    backgroundColor: '#101820',
  },
  filledCell: {
    backgroundColor: '#16212c',
  },
  registeredCell: {
    backgroundColor: '#123b2d',
  },
  scannedCell: {
    backgroundColor: '#403019',
  },
  currentCell: {
    backgroundColor: '#244b67',
  },
  boxRightEdge: {
    borderRightWidth: 2,
    borderRightColor: '#8aa0b2',
  },
  boxBottomEdge: {
    borderBottomWidth: 2,
    borderBottomColor: '#8aa0b2',
  },
  cellText: {
    color: '#f4f8fb',
    fontSize: 22,
    fontWeight: '700',
  },
  cellTextCompact: {
    fontSize: 16,
  },
  emptyCellText: {
    color: '#6b7a86',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2f3136',
    backgroundColor: '#17181c',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  legendText: {
    color: '#d7dadc',
    fontSize: 12,
    fontWeight: '600',
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    gap: 6,
    borderRadius: 14,
    backgroundColor: '#17181c',
    borderWidth: 1,
    borderColor: '#2f3136',
    padding: 14,
  },
  registryCard: {
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#17181c',
    borderWidth: 1,
    borderColor: '#2f3136',
    padding: 14,
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  infoLine: {
    color: '#c8d0d8',
    fontSize: 13,
    lineHeight: 19,
  },
  registryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  registryChip: {
    color: '#d7e4ee',
    fontSize: 12,
    fontWeight: '600',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#33526b',
    backgroundColor: '#10202d',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  alertCard: {
    gap: 4,
    borderRadius: 14,
    backgroundColor: '#391515',
    borderWidth: 1,
    borderColor: '#7e2d2d',
    padding: 14,
  },
  alertTitle: {
    color: '#ffdbdb',
    fontSize: 13,
    fontWeight: '700',
  },
  alertText: {
    color: '#ffb7b7',
    fontSize: 13,
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
    borderColor: '#3a3a3c',
    backgroundColor: '#202126',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: '#1f5743',
    borderColor: '#34775c',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#f3f6f8',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#f3fff9',
    fontSize: 13,
    fontWeight: '700',
  },
  resetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#405261',
    backgroundColor: '#13212b',
    paddingVertical: 12,
  },
  resetButtonLabel: {
    color: '#d7e4ee',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#c8d0d8',
    fontSize: 13,
    lineHeight: 19,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '800',
  },
  winText: {
    color: '#9cf0c7',
  },
  lossText: {
    color: '#ffb7b7',
  },
});
