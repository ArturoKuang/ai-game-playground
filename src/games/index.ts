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
];
export default games;
