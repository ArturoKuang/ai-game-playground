export const EMOJI_TYPES = [
  "\u{1F34E}","\u{1F34A}","\u{1F34B}","\u{1F347}","\u{1FAD0}",
  "\u{1F95D}","\u{1F351}","\u{1F352}","\u{1F336}\uFE0F","\u{1F951}",
];
export type Tile = { emoji: string; revealed: boolean; row: number; col: number; };
export type TopPickState = {
  tiles: Tile[]; tracker: Map<string, number>; nominations: Set<string>;
  movesUsed: number; moveBudget: number; difficulty: number; k: number;
  totalTypes: number; verified: boolean; won: boolean;
  trueFreqs: Map<string, number>; rows: number; cols: number;
};
export type Move =
  | { type: "flip"; index: number }
  | { type: "nominate"; emoji: string }
  | { type: "unnominate"; emoji: string }
  | { type: "verify" };
export type Solution = { moves: Move[]; flips: number; won: boolean; };

function makeRng(seed: number): () => number {
  let s = seed;
  return () => { s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

type DC = { rows: number; cols: number; types: number; k: number; budget: number; topFreq: number; };
function getDiffConfig(d: number): DC {
  switch (d) {
    case 1: return { rows:4,cols:3,types:2,k:1,budget:10,topFreq:11 };
    case 2: return { rows:4,cols:4,types:4,k:2,budget:14,topFreq:7 };
    case 3: return { rows:5,cols:5,types:5,k:2,budget:20,topFreq:9 };
    case 4: return { rows:6,cols:5,types:6,k:3,budget:20,topFreq:8 };
    case 5: return { rows:6,cols:6,types:8,k:3,budget:24,topFreq:9 };
    default: return { rows:3,cols:3,types:3,k:1,budget:8,topFreq:5 };
  }
}

export function generatePuzzle(seed: number, difficulty: number): TopPickState {
  const rng = makeRng(seed);
  const cfg = getDiffConfig(difficulty);
  const { rows, cols, types, k, budget, topFreq } = cfg;
  const total = rows * cols;
  const shuffled = [...EMOJI_TYPES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const emojis = shuffled.slice(0, types);
  // Build frequency array: top K types get topFreq each, rest share remainder
  const freqs: number[] = [];
  let rem = total;
  for (let i = 0; i < k; i++) {
    const f = Math.min(topFreq, rem - (types - i - 1));
    freqs.push(f); rem -= f;
  }
  const nonTop = types - k;
  if (nonTop > 0) {
    const base = Math.floor(rem / nonTop);
    let lo = rem - base * nonTop;
    for (let i = 0; i < nonTop; i++) {
      freqs.push(base + (lo > 0 ? 1 : 0));
      if (lo > 0) lo--;
    }
  }
  // Ensure sum matches
  const sum = freqs.reduce((a,b) => a+b, 0);
  if (sum !== total) freqs[freqs.length-1] += total - sum;
  // Ensure clear cutoff
  if (k < types && freqs[k-1] <= freqs[k]) { freqs[k-1]++; freqs[k]--; }
  const tileArr: string[] = [];
  for (let i = 0; i < types; i++)
    for (let j = 0; j < freqs[i]; j++) tileArr.push(emojis[i]);
  for (let i = tileArr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tileArr[i], tileArr[j]] = [tileArr[j], tileArr[i]];
  }
  const trueFreqs = new Map<string, number>();
  for (const e of tileArr) trueFreqs.set(e, (trueFreqs.get(e) || 0) + 1);
  const tiles: Tile[] = tileArr.map((emoji, idx) => ({
    emoji, revealed: false, row: Math.floor(idx/cols), col: idx%cols }));
  return { tiles, tracker: new Map(), nominations: new Set(), movesUsed: 0,
    moveBudget: budget, difficulty, k, totalTypes: types, verified: false,
    won: false, trueFreqs, rows, cols };
}

export function legalMoves(state: TopPickState): Move[] {
  if (state.verified) return [];
  const moves: Move[] = [];
  if (state.movesUsed < state.moveBudget)
    for (let i = 0; i < state.tiles.length; i++)
      if (!state.tiles[i].revealed) moves.push({ type: "flip", index: i });
  for (const [emoji] of state.tracker)
    if (!state.nominations.has(emoji) && state.nominations.size < state.k)
      moves.push({ type: "nominate", emoji });
  for (const emoji of state.nominations) moves.push({ type: "unnominate", emoji });
  if (state.nominations.size === state.k) moves.push({ type: "verify" });
  return moves;
}

export function applyMove(state: TopPickState, move: Move): TopPickState {
  const next: TopPickState = { ...state, tiles: state.tiles.map(t=>({...t})),
    tracker: new Map(state.tracker), nominations: new Set(state.nominations), trueFreqs: state.trueFreqs };
  switch (move.type) {
    case "flip": { const tile = next.tiles[move.index];
      if (tile.revealed || next.movesUsed >= next.moveBudget) break;
      tile.revealed = true;
      next.tracker.set(tile.emoji, (next.tracker.get(tile.emoji)||0)+1);
      next.movesUsed++; break; }
    case "nominate":
      if (next.nominations.size < next.k && next.tracker.has(move.emoji))
        next.nominations.add(move.emoji); break;
    case "unnominate": next.nominations.delete(move.emoji); break;
    case "verify": {
      if (next.nominations.size !== next.k) break; next.verified = true;
      const st = [...next.trueFreqs.entries()].sort((a,b)=>b[1]-a[1]);
      const topKF = st[next.k-1][1];
      const topK = new Set(st.filter(([,f])=>f>=topKF).map(([e])=>e));
      next.won = [...next.nominations].every(e=>topK.has(e)); break; }
  }
  return next;
}

export function isGoal(s: TopPickState): boolean { return s.verified && s.won; }

export function heuristic(s: TopPickState): number {
  if (s.verified && s.won) return 0;
  const und = s.totalTypes - s.tracker.size;
  const bl = s.moveBudget - s.movesUsed;
  let h = und * 3 - (s.tiles.filter(t=>t.revealed).length/s.tiles.length)*5;
  if (bl < und*2) h += (und*2-bl)*2;
  return Math.max(0, h);
}

export function solve(p: TopPickState, sl: 1|2|3|4|5): Solution|null {
  switch(sl) { case 1: return solveL1(p); case 2: return solveL2(p);
    case 3: return solveL3(p); case 4: return solveL4(p); case 5: return solveL5(p); }
}
function cs(s: TopPickState): TopPickState {
  return {...s,tiles:s.tiles.map(t=>({...t})),tracker:new Map(s.tracker),
    nominations:new Set(s.nominations),trueFreqs:s.trueFreqs};
}
function flipAndNom(state: TopPickState, flips: number, noms: string[]): Solution {
  const ml: Move[] = [];
  for (const e of noms) { ml.push({type:"nominate",emoji:e}); state=applyMove(state,{type:"nominate",emoji:e}); }
  if (state.nominations.size === state.k) { ml.push({type:"verify"}); state=applyMove(state,{type:"verify"}); }
  return { moves: ml, flips, won: state.won };
}

function solveL1(puzzle: TopPickState): Solution|null {
  for (let att=0;att<50;att++) {
    const rng=makeRng(42+att*97);
    let st=cs(puzzle); const ml: Move[]=[]; let fl=0;
    while(st.movesUsed<st.moveBudget) {
      const ur=st.tiles.map((t,i)=>({t,i})).filter(({t})=>!t.revealed);
      if(!ur.length) break;
      const p=ur[Math.floor(rng()*ur.length)];
      ml.push({type:"flip",index:p.i}); st=applyMove(st,{type:"flip",index:p.i}); fl++;
    }
    const d=[...st.tracker.keys()];
    for(let i=d.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
    for(const e of d.slice(0,st.k)){ml.push({type:"nominate",emoji:e});st=applyMove(st,{type:"nominate",emoji:e});}
    if(st.nominations.size===st.k){ml.push({type:"verify"});st=applyMove(st,{type:"verify"});
      if(st.won)return{moves:ml,flips:fl,won:true};}
  } return null;
}

function solveL2(puzzle: TopPickState): Solution|null {
  const rng=makeRng(123);
  let st=cs(puzzle); const ml: Move[]=[]; let fl=0;
  const order: string[]=[];
  while(st.movesUsed<st.moveBudget) {
    const ur=st.tiles.map((t,i)=>({t,i})).filter(({t})=>!t.revealed);
    if(!ur.length) break;
    const p=ur[Math.floor(rng()*ur.length)];
    const em=st.tiles[p.i].emoji;
    ml.push({type:"flip",index:p.i}); st=applyMove(st,{type:"flip",index:p.i}); fl++;
    if(!order.includes(em)) order.push(em);
  }
  for(const e of order.slice(0,st.k)){ml.push({type:"nominate",emoji:e});st=applyMove(st,{type:"nominate",emoji:e});}
  if(st.nominations.size===st.k){ml.push({type:"verify"});st=applyMove(st,{type:"verify"});}
  return{moves:ml,flips:fl,won:st.won};
}

function solveL3(puzzle: TopPickState): Solution|null {
  const rng=makeRng(456);
  let st=cs(puzzle); const ml: Move[]=[]; let fl=0;
  while(st.movesUsed<st.moveBudget) {
    const ur=st.tiles.map((t,i)=>({t,i})).filter(({t})=>!t.revealed);
    if(!ur.length) break;
    const p=ur[Math.floor(rng()*ur.length)];
    ml.push({type:"flip",index:p.i}); st=applyMove(st,{type:"flip",index:p.i}); fl++;
  }
  const sorted=[...st.tracker.entries()].sort((a,b)=>b[1]-a[1]);
  for(const [e] of sorted.slice(0,st.k)){ml.push({type:"nominate",emoji:e});st=applyMove(st,{type:"nominate",emoji:e});}
  if(st.nominations.size===st.k){ml.push({type:"verify"});st=applyMove(st,{type:"verify"});}
  return{moves:ml,flips:fl,won:st.won};
}

function solveL4(puzzle: TopPickState): Solution|null {
  let st=cs(puzzle); const ml: Move[]=[]; let fl=0;
  const {rows,cols}=st; const flipped: number[]=[];
  while(st.movesUsed<st.moveBudget) {
    const ur=st.tiles.map((t,i)=>({t,i})).filter(({t})=>!t.revealed);
    if(!ur.length) break;
    let bi=ur[0].i, bmd=-1;
    if(!flipped.length){
      const cr=Math.floor(rows/2),cc=Math.floor(cols/2); let bd=Infinity;
      for(const {t,i} of ur){const d=Math.abs(t.row-cr)+Math.abs(t.col-cc);if(d<bd){bd=d;bi=i;}}
    } else {
      for(const {t,i} of ur){let md=Infinity;
        for(const fi of flipped){const ft=st.tiles[fi];md=Math.min(md,Math.abs(t.row-ft.row)+Math.abs(t.col-ft.col));}
        if(md>bmd){bmd=md;bi=i;}}
    }
    ml.push({type:"flip",index:bi}); st=applyMove(st,{type:"flip",index:bi}); flipped.push(bi); fl++;
  }
  const sorted=[...st.tracker.entries()].sort((a,b)=>b[1]-a[1]);
  for(const [e] of sorted.slice(0,st.k)){ml.push({type:"nominate",emoji:e});st=applyMove(st,{type:"nominate",emoji:e});}
  if(st.nominations.size===st.k){ml.push({type:"verify"});st=applyMove(st,{type:"verify"});}
  return{moves:ml,flips:fl,won:st.won};
}

function solveL5(puzzle: TopPickState): Solution|null {
  let st=cs(puzzle); const ml: Move[]=[]; let fl=0;
  const {rows,cols,k}=st;
  const sR=Math.max(2,Math.ceil(rows/2)), sC=Math.max(2,Math.ceil(cols/2));
  const sectors: number[][]=Array.from({length:sR*sC},()=>[]);
  for(let i=0;i<st.tiles.length;i++){
    const t=st.tiles[i];
    const sr=Math.min(sR-1,Math.floor((t.row/rows)*sR));
    const sc=Math.min(sC-1,Math.floor((t.col/cols)*sC));
    sectors[sr*sC+sc].push(i);
  }
  let si=0; const off=new Array(sectors.length).fill(0);
  const srng=makeRng(st.moveBudget*1000+st.tiles.length);
  for(const sec of sectors){for(let i=sec.length-1;i>0;i--){const j=Math.floor(srng()*(i+1));[sec[i],sec[j]]=[sec[j],sec[i]];}}
  while(st.movesUsed<st.moveBudget) {
    // Early stop only with very large gap after 70% budget used
    if(st.tracker.size>=st.totalTypes && st.movesUsed>=Math.floor(st.moveBudget*0.5)){
      const s=[...st.tracker.entries()].sort((a,b)=>b[1]-a[1]);
      if(s.length>k && s[k-1][1]-s[k][1]>=2) break;
    }
    let found=false;
    for(let a=0;a<sectors.length;a++){
      const idx=(si+a)%sectors.length; const sec=sectors[idx];
      while(off[idx]<sec.length){
        const ti=sec[off[idx]];
        if(!st.tiles[ti].revealed){
          ml.push({type:"flip",index:ti}); st=applyMove(st,{type:"flip",index:ti});
          fl++; off[idx]++; si=(idx+1)%sectors.length; found=true; break;
        } off[idx]++;
      } if(found) break;
    } if(!found) break;
  }
  const sorted=[...st.tracker.entries()].sort((a,b)=>b[1]-a[1]);
  for(const [e] of sorted.slice(0,st.k)){ml.push({type:"nominate",emoji:e});st=applyMove(st,{type:"nominate",emoji:e});}
  if(st.nominations.size===st.k){ml.push({type:"verify"});st=applyMove(st,{type:"verify"});}
  return{moves:ml,flips:fl,won:st.won};
}
