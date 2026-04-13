import { GameMeta } from '../types';
import PairUp from './PairUp';
import Tally from './Tally';
import TopPick from './TopPick';
import PowerLine from './PowerLine';

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
    leetcodeProblems: [238],
  },
];
export default games;
