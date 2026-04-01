import { GameMeta } from '../types';
import FloodFill from './FloodFill';
import BounceOut from './BounceOut';
import LightsOut from './LightsOut';
import ChainPop from './ChainPop';
import PathWeaver from './PathWeaver';
import IceSlide from './IceSlide';
import DropPop from './DropPop';
import BitMap from './BitMap';
import Claim from './Claim';
import Slide from './Slide';
import Loop from './Loop';
import Signal from './Signal';
import Relay from './Relay';
import Herd from './Herd';
import Flock from './Flock';
import Sift from './Sift';
import Split from './Split';
import Fuse from './Fuse';
import Sort from './Sort';
import Fold from './Fold';
import Ferry from './Ferry';
import Etch from './Etch';
import Peel from './Peel';
import Surge from './Surge';
import Thaw from './Thaw';
import Knot from './Knot';
const games: GameMeta[] = [
  {
    id: 'floodfill',
    name: 'FloodFill',
    emoji: '\ud83c\udf0a',
    description: 'Flood the board with one color',
    component: FloodFill,
  },
  {
    id: 'bounceout',
    name: 'BounceOut',
    emoji: '\ud83c\udfb1',
    description: 'Bounce a ball to hit all targets',
    component: BounceOut,
  },
  {
    id: 'lightsout',
    name: 'LightsOut',
    emoji: '\ud83d\udca1',
    description: 'Turn off all the lights',
    component: LightsOut,
  },
  {
    id: 'chainpop',
    name: 'ChainPop',
    emoji: '\ud83d\udca5',
    description: 'One tap, maximum chain reaction',
    component: ChainPop,
  },
  {
    id: 'pathweaver',
    name: 'PathWeaver',
    emoji: '\ud83e\uddf5',
    description: 'Draw a path through every cell',
    component: PathWeaver,
  },
  {
    id: 'iceslide',
    name: 'IceSlide',
    emoji: '\ud83e\uddca',
    description: 'Slide the puck to the star on ice',
    component: IceSlide,
  },
  {
    id: 'droppop',
    name: 'DropPop',
    emoji: '\ud83c\udfae',
    description: 'Pop groups of matching colors to clear the board',
    component: DropPop,
  },
  {
    id: 'bitmap',
    name: 'BitMap',
    emoji: '\ud83d\uddbc\ufe0f',
    description: 'Decode the pattern from row & column clues',
    component: BitMap,
  },
  {
    id: 'claim',
    name: 'Claim',
    emoji: '\uD83C\uDFC6',
    description: 'Pick cells to score — neighbors shrink!',
    component: Claim,
  },
  {
    id: 'slide',
    name: 'Slide',
    emoji: '\ud83e\udde9',
    description: 'Slide tiles into order',
    component: Slide,
  },
  {
    id: 'loop',
    name: 'Loop',
    emoji: '\ud83d\udd04',
    description: 'Rotate interlocking rings to sort tiles',
    component: Loop,
  },
  {
    id: 'signal',
    name: 'Signal',
    emoji: '\ud83d\udce1',
    description: 'Broadcast from edges to deduce the hidden color grid',
    component: Signal,
  },
  {
    id: 'relay',
    name: 'Relay',
    emoji: '\ud83d\udd0c',
    description: 'Activate transmitters to trace hidden wires',
    component: Relay,
  },
  {
    id: 'herd',
    name: 'Herd',
    emoji: '\uD83E\uDD8A',
    description: 'Command animal herds to reach their pens',
    component: Herd,
  },
  {
    id: 'flock',
    name: 'Flock',
    emoji: '\uD83D\uDC26',
    description: 'Slide all birds at once to cluster by color',
    component: Flock,
  },
  {
    id: 'sift',
    name: 'Sift',
    emoji: '\ud83d\udd00',
    description: 'Swap tiles to complete the double Latin square',
    component: Sift,
  },
  {
    id: 'split',
    name: 'Split',
    emoji: '\u2702\uFE0F',
    description: 'Draw lines to partition the grid by color',
    component: Split,
  },
  {
    id: 'fuse',
    name: 'Fuse',
    emoji: '\uD83D\uDCA3',
    description: 'Ignite bombs to trigger chain reactions',
    component: Fuse,
  },
  {
    id: 'sort',
    name: 'Sort',
    emoji: '\uD83D\uDD00',
    description: 'Reverse groups to sort tokens by color',
    component: Sort,
  },
  {
    id: 'fold',
    name: 'Fold',
    emoji: '\uD83D\uDCDC',
    description: 'Fold the grid to stack matching colors',
    component: Fold,
  },
  {
    id: 'ferry',
    name: 'Ferry',
    emoji: '\u26F4\uFE0F',
    description: 'Swap ferries along bridges to reach matching ports',
    component: Ferry,
  },
  {
    id: 'etch',
    name: 'Etch',
    emoji: '\uD83E\uDDF1',
    description: 'Carve a path to match row & column targets',
    component: Etch,
  },
  {
    id: 'peel',
    name: 'Peel',
    emoji: '\uD83D\uDCC4',
    description: 'Peel layers to satisfy row & column color targets',
    component: Peel,
  },
  {
    id: 'surge',
    name: 'Surge',
    emoji: '\uD83C\uDF0B',
    description: 'Tap cells to cascade pressure to target',
    component: Surge,
  },
  {
    id: 'thaw',
    name: 'Thaw',
    emoji: '\u2744\uFE0F',
    description: 'Melt all ice with limited heat taps',
    component: Thaw,
  },
  {
    id: 'knot',
    name: 'Knot',
    emoji: '\uD83E\uDDF6',
    description: 'Draw a loop through cells with hidden constraints',
    component: Knot,
  },
];
export default games;
