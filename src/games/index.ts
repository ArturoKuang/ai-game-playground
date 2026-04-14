import { GameMeta } from '../types';
import PairUp from './PairUp';
import Tally from './Tally';
import TopPick from './TopPick';
import PowerLine from './PowerLine';
import SpotCheck from './SpotCheck';
import Reflect from './Reflect';

const games: GameMeta[] = [
  {
    id: 'pair-up',
    name: 'Pair Up',
    emoji: '🔢',
    description: 'Find pairs that sum to a target using a registry',
    component: PairUp,
    algorithm: 'Hash Map',
    tier: 1,
    leetcodeProblems: [1, 49, 217],
  },
  {
    id: 'tally',
    name: 'Tally',
    emoji: '📊',
    description: 'Check if two shelves have the same inventory by counting types',
    component: Tally,
    algorithm: 'Hash Map',
    tier: 1,
    leetcodeProblems: [242, 49],
  },
  {
    id: 'top-pick',
    name: 'Top Pick',
    emoji: '🎯',
    description: 'Flip tiles, track frequencies, crown the most common types',
    component: TopPick,
    algorithm: 'Hash Map',
    tier: 1,
    leetcodeProblems: [347, 692],
  },
  {
    id: 'power-line',
    name: 'Power Line',
    emoji: '⚡',
    description: 'Scan power cells from both ends to map their combined output',
    component: PowerLine,
    algorithm: 'Prefix/Suffix Products',
    tier: 1,
    leetcodeProblems: [238],  },
  {
    id: 'spot-check',
    name: 'Spot Check',
    emoji: '📡',
    description: 'Scan a grid of hidden radio towers to find interfering frequencies. Reveal towers, track values per row/column/sector, and flag all duplicate clashes before energy runs out. Teaches Hash Set Membership (LC #36 Valid Sudoku, LC #128 Longest Consecutive Sequence) -- the same set.has() pattern used to validate Sudoku boards in O(n) per group.',
    component: SpotCheck,
    algorithm: 'Hash Set',
    tier: 1,
    leetcodeProblems: [36, 128],
  },
  {
    id: 'reflect',
    name: 'Reflect',
    emoji: '🪞',
    description: 'Reveal face-down tiles to check if each row is a palindrome — but energy is limited across all rounds. Checking from both ends lets you bail early on mismatches. Teaches Two Pointers (LC #125 Valid Palindrome) — the same converging-pointer technique used to check palindromes in O(n).',
    component: Reflect,
    algorithm: 'Two Pointers',
    tier: 1,
    leetcodeProblems: [125, 15, 11],
  },
];

export default games;
