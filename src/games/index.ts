import { GameMeta } from '../types';
import FloodFill from './FloodFill';
import BounceOut from './BounceOut';
import LightsOut from './LightsOut';
import ChainPop from './ChainPop';
import PathWeaver from './PathWeaver';

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
];

export default games;
