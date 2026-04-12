import Backhaul from './Backhaul';
import Bandshift from './Bandshift';
import Breakline from './Breakline';
import Charterbough from './Charterbough';
import Boughturn from './Boughturn';
import Claspline from './Claspline';
import Chorusbough from './Chorusbough';
import Crestchain from './Crestchain';
import Crownline from './Crownline';
import Crosstide from './Crosstide';
import Echoforge from './Echoforge';
import EchoRun from './EchoRun';
import Flipforge from './Flipforge';
import Foldline from './Foldline';
import { GameMeta } from '../types';
import Graftguard from './Graftguard';
import Glyphrail from './Glyphrail';
import Halo from './Halo';
import Heartspan from './Heartspan';
import Highbough from './Highbough';
import Hollowbough from './Hollowbough';
import Islemark from './Islemark';
import Lacehook from './Lacehook';
import Ledger from './Ledger';
import Lexiforge from './Lexiforge';
import Loopledger from './Loopledger';
import Manifest from './Manifest';
import Mainline from './Mainline';
import Midmoor from './Midmoor';
import Mintpath from './Mintpath';
import Nightledger from './Nightledger';
import PatchParade from './PatchParade';
import Pulseledger from './Pulseledger';
import Rankbough from './Rankbough';
import Roost from './Roost';
import Rootbond from './Rootbond';
import Runepath from './Runepath';
import Seal from './Seal';
import Spellsplice from './Spellsplice';
import Spanbough from './Spanbough';
import Splitbough from './Splitbough';
import Stemvault from './Stemvault';
import Stemweave from './Stemweave';
import Steploom from './Steploom';
import Stillpath from './Stillpath';
import Syllabind from './Syllabind';
import Tidewall from './Tidewall';
import Ticker from './Ticker';
import Towline from './Towline';
import Trailhead from './Trailhead';
import Tracebough from './Tracebough';
import Truce from './Truce';
import Twinbough from './Twinbough';
import Veilvault from './Veilvault';
import Wakeline from './Wakeline';
import Waygrid from './Waygrid';
import Ward from './Ward';

const games: GameMeta[] = [
  {
    id: 'backhaul',
    name: 'Backhaul',
    emoji: 'BH',
    description: 'Clip the next car before you swing the live hitch backward, then march the anchor forward until the whole convoy points home.',
    component: Backhaul,
  },
  {
    id: 'bandshift',
    name: 'Bandshift',
    emoji: 'BS',
    description: 'Check the middle relay, find the ordered half, and keep it only when the target frequency truly fits inside that span.',
    component: Bandshift,
  },
  {
    id: 'boughturn',
    name: 'Boughturn',
    emoji: 'BT',
    description: 'Mirror the branch hub you stand on, then finish one child canopy before crossing to the sibling side.',
    component: Boughturn,
  },
  {
    id: 'breakline',
    name: 'Breakline',
    emoji: 'BL',
    description: 'Compare the middle beacon to the tail sentinel, and cut away only the arc that cannot hide the rotated ridge break.',
    component: Breakline,
  },
  {
    id: 'charterbough',
    name: 'Charterbough',
    emoji: 'CH',
    description: 'Carry the BST floor and ceiling charter downward, seal every legal branch, and catch the first hidden branch that slips outside an older ancestor gate.',
    component: Charterbough,
  },
  {
    id: 'claspline',
    name: 'Claspline',
    emoji: 'CL',
    description: 'Pile each opener onto one live vault, compare every closer to the current top, and reject the route the moment burial breaks the fit.',
    component: Claspline,
  },
  {
    id: 'chorusbough',
    name: 'Chorusbough',
    emoji: 'CB',
    description: 'Finish the live canopy chorus from the front, leave fresh children waiting in the next rail, and swap waves only when the current one is empty.',
    component: Chorusbough,
  },
  {
    id: 'crestchain',
    name: 'Crestchain',
    emoji: 'CC',
    description: 'Seal the best rising badge ending at every ridge marker, and feed each crest only from the strongest earlier lower marker instead of trusting the nearest lower stone.',
    component: Crestchain,
  },
  {
    id: 'crownline',
    name: 'Crownline',
    emoji: 'CR',
    description: 'Keep one live head from every sorted siding on the crown ladder, dispatch the crowned smallest car, and repair the ladder through the lower child.',
    component: Crownline,
  },
  {
    id: 'crosstide',
    name: 'Crosstide',
    emoji: 'CT',
    description: 'Start one reverse tide from each ocean border, climb only uphill or flat, and keep the basins both seas can still reach.',
    component: Crosstide,
  },
  {
    id: 'echoforge',
    name: 'Echoforge',
    emoji: 'EF',
    description: 'Forge one echo the first time you touch a beacon, then reuse that stored echo every time another wire returns to the same place.',
    component: Echoforge,
  },
  {
    id: 'echorun',
    name: 'Echo Run',
    emoji: 'ER',
    description: 'Carry one clean signal band forward, trim left only enough to evict echoes, and avoid costly full retunes.',
    component: EchoRun,
  },
  {
    id: 'flipforge',
    name: 'Flipforge',
    emoji: 'FF',
    description: 'Seal the best and worst live product ending here, because one negative strike can flip yesterday’s worst lane into today’s crown.',
    component: Flipforge,
  },
  {
    id: 'foldline',
    name: 'Foldline',
    emoji: '><',
    description: 'Trim punctuation at the blocking edge, compare only meaningful endpoints, and avoid rebuilding the whole strip.',
    component: Foldline,
  },
  {
    id: 'graftguard',
    name: 'Graftguard',
    emoji: 'GG',
    description: 'Test whether the pattern can start at this host branch, then only clear the branch after both child searches come back empty.',
    component: Graftguard,
  },
  {
    id: 'glyphrail',
    name: 'Glyphrail',
    emoji: 'GR',
    description: 'Seal each digit prefix by tracing every legal one-step and two-step decoding lane, and mark the ribbon dead the moment both gates close.',
    component: Glyphrail,
  },
  {
    id: 'halo',
    name: 'Halo',
    emoji: 'o',
    description: 'Run a dawn sweep and a dusk sweep so each shrine inherits every other factor without costly rebuilds.',
    component: Halo,
  },
  {
    id: 'heartspan',
    name: 'Heartspan',
    emoji: 'HS',
    description: 'Test every rune and seam as a possible heart, pulse outward while the mirror holds, and crown the longest certified span.',
    component: Heartspan,
  },
  {
    id: 'highbough',
    name: 'Highbough',
    emoji: 'HB',
    description: 'Seal each branch only after its child readings are known, then keep the larger height plus one until the crown is certified.',
    component: Highbough,
  },
  {
    id: 'hollowbough',
    name: 'Hollowbough',
    emoji: 'HO',
    description: 'Stamp every live grove slot onto one courier ribbon, including hollow hooks, and bank the right child task first so the left slot stays live next.',
    component: Hollowbough,
  },
  {
    id: 'islemark',
    name: 'Islemark',
    emoji: 'IM',
    description: 'Sweep the storm map once, launch only on fresh land roots, and let the tide chart the whole connected coast before you count again.',
    component: Islemark,
  },
  {
    id: 'lacehook',
    name: 'Lacehook',
    emoji: 'LH',
    description: 'Pace to the true midpoint, reverse the back strand safely, then lace one far lantern after each front lead.',
    component: Lacehook,
  },
  {
    id: 'loopledger',
    name: 'Loopledger',
    emoji: 'LL',
    description: 'Break the alarmed house ring both legal ways, keep a quiet ledger for each cut, then crown the stronger finished total.',
    component: Loopledger,
  },
  {
    id: 'mainline',
    name: 'Mainline',
    emoji: 'ML',
    description: 'Merge two sorted sidings by coupling the smaller live head onto one departure tail, then stitch the untouched remainder in one clean splice.',
    component: Mainline,
  },
  {
    id: 'midmoor',
    name: 'Midmoor',
    emoji: 'MM',
    description: 'Moor each new buoy below or above the live centerline, then ferry only the exposed crown that restores the median split.',
    component: Midmoor,
  },
  {
    id: 'mintpath',
    name: 'Mintpath',
    emoji: 'MP',
    description: 'Seal each amount from a smaller certified total plus one coin, keep only the cheapest lane, and mark the totals no denomination can reach.',
    component: Mintpath,
  },
  {
    id: 'nightledger',
    name: 'Nightledger',
    emoji: 'NL',
    description: 'For each house prefix, keep the better of carrying the prior best haul forward or raiding this house plus the sealed two-back total.',
    component: Nightledger,
  },
  {
    id: 'wakeline',
    name: 'Wakeline',
    emoji: 'WL',
    description: 'Patrol a one-way buoy chain with a drifter and a faster cutter until escape proves open water or collision proves a loop.',
    component: Wakeline,
  },
  {
    id: 'patchparade',
    name: 'Patch Parade',
    emoji: 'PP',
    description: 'Carry the longest banner that can be patched into one emblem, and trim the front only when repaint debt truly overflows.',
    component: PatchParade,
  },
  {
    id: 'pulseledger',
    name: 'Pulseledger',
    emoji: 'PL',
    description: 'Every rune already counts once; pulse each rune heart and seam heart outward to bank every wider mirror exactly once.',
    component: Pulseledger,
  },
  {
    id: 'rankbough',
    name: 'Rankbough',
    emoji: 'RB',
    description: 'Keep the live return lane after every BST bloom, ring the next smallest branch in order, and stop the moment the kth blossom lands.',
    component: Rankbough,
  },
  {
    id: 'roost',
    name: 'Roost',
    emoji: '^',
    description: 'Keep live flock counts and crown the top K busiest roosts before rescue sweeps eat the budget.',
    component: Roost,
  },
  {
    id: 'rootbond',
    name: 'Rootbond',
    emoji: 'RB',
    description: 'Track the crest on each camp, bind only different clans, and reject the charter the moment one rope closes a loop inside a realm.',
    component: Rootbond,
  },
  {
    id: 'runepath',
    name: 'Runepath',
    emoji: 'RP',
    description: 'Trace one live word trail through adjacent runes, never reuse a tile on that trail, and peel back only one step when the branch dies.',
    component: Runepath,
  },
  {
    id: 'seal',
    name: 'Seal',
    emoji: '#',
    description: 'Stamp each word into a reusable mix seal and file it into the right family.',
    component: Seal,
  },
  {
    id: 'spellsplice',
    name: 'Spellsplice',
    emoji: 'SS',
    description: 'Seal each endpoint only when one earlier live cut plus a listed word reaches it exactly, and do not trust the later-looking seam just because it is closer.',
    component: Spellsplice,
  },
  {
    id: 'spanbough',
    name: 'Spanbough',
    emoji: 'SP',
    description: 'Let each branch send up only one helpful route, but keep the best full span that can bend anywhere in the canopy.',
    component: Spanbough,
  },
  {
    id: 'splitbough',
    name: 'Splitbough',
    emoji: 'SB',
    description: 'Keep both target markers on the same side of the BST while you can, then stake the first branch where their routes split.',
    component: Splitbough,
  },
  {
    id: 'stemvault',
    name: 'Stemvault',
    emoji: 'SV',
    description: 'File words through shared stems, seal only true endings, and settle word or stem warrants from the same archive path.',
    component: Stemvault,
  },
  {
    id: 'stemweave',
    name: 'Stemweave',
    emoji: 'SW',
    description: 'Weave only through board trails that still match a shared stem, bank short seals without dropping the live trail, and prune the branch the moment no listed word still fits.',
    component: Stemweave,
  },
  {
    id: 'steploom',
    name: 'Steploom',
    emoji: 'SL',
    description: 'Seal each new stair exactly once from the two sealed stairs beneath it, and avoid paying the exploding scout tax to recount routes from scratch.',
    component: Steploom,
  },
  {
    id: 'stillpath',
    name: 'Stillpath',
    emoji: 'SP',
    description: 'Keep one recipe stack alive, reuse the live herb while it still fits, then retreat one layer and continue from the next heavier shelf slot.',
    component: Stillpath,
  },
  {
    id: 'syllabind',
    name: 'Syllabind',
    emoji: 'SY',
    description: 'Teach only zero-seal courses, peel their outgoing locks, and call the deadlock when the ready rail runs dry before the catalog does.',
    component: Syllabind,
  },
  {
    id: 'veilvault',
    name: 'Veilvault',
    emoji: 'VV',
    description: 'Resolve veiled word warrants by opening one wildcard branch at a time and rewinding only to the last useful veil.',
    component: Veilvault,
  },
  {
    id: 'tidewall',
    name: 'Tidewall',
    emoji: '||',
    description: 'Track the best tide basin seen so far and release only the wall that is limiting the waterline.',
    component: Tidewall,
  },
  {
    id: 'ticker',
    name: 'Ticker',
    emoji: 'TS',
    description: 'Keep the cheapest buy anchor seen so far and compare each later price against it exactly once.',
    component: Ticker,
  },
  {
    id: 'towline',
    name: 'Towline',
    emoji: 'TL',
    description: 'Push one scout n+1 links ahead from the dock, tow both hands together, then cut the next rope when the scout clears.',
    component: Towline,
  },
  {
    id: 'twinbough',
    name: 'Twinbough',
    emoji: 'TB',
    description: 'Compare two groves in lockstep, prove each child lane safe once, and certify the parent only when both sides truly match.',
    component: Twinbough,
  },
  {
    id: 'ledger',
    name: 'Ledger',
    emoji: '=',
    description: 'Balance letter counts across two crates and spot the leftover mismatch.',
    component: Ledger,
  },
  {
    id: 'lexiforge',
    name: 'Lexiforge',
    emoji: 'LX',
    description: 'Read neighboring alien words, forge one rune rule from the first split only, and peel the zero-seal rail into an alphabet.',
    component: Lexiforge,
  },
  {
    id: 'manifest',
    name: 'Manifest',
    emoji: 'MF',
    description: 'Carry the smallest live cargo satchel that still covers every manifest stamp, and shave the left edge the moment the full list is inside.',
    component: Manifest,
  },
  {
    id: 'ward',
    name: 'Ward',
    emoji: '[]',
    description: 'Process each filled Sudoku cell once by filing it into its row, column, and chamber wards.',
    component: Ward,
  },
  {
    id: 'waygrid',
    name: 'Waygrid',
    emoji: 'WG',
    description: 'Seal each street plaza from the certified north and west feeders, and stop burning the audit clock on direct route recounts.',
    component: Waygrid,
  },
  {
    id: 'trailhead',
    name: 'Trailhead',
    emoji: '^^',
    description: 'Stake unsorted mile markers, then only scout from true starts to find the longest ridge run.',
    component: Trailhead,
  },
  {
    id: 'tracebough',
    name: 'Tracebough',
    emoji: 'TR',
    description: 'Seat each next parade crest into the live ledger plot, then bank the right child card first so the left plot stays on top.',
    component: Tracebough,
  },
  {
    id: 'truce',
    name: 'Truce',
    emoji: '0+',
    description: 'Fix one anchor envoy, squeeze the inner pair by sign, and catalog every unique zero-balance trio.',
    component: Truce,
  },
];

export default games;
