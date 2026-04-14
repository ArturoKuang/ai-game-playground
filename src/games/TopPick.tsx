import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions, Animated, Platform } from 'react-native';
import ShareButton from '../components/ShareButton';
import StatsModal from '../components/StatsModal';
import CelebrationBurst from '../components/CelebrationBurst';
import { getDailySeed, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';
import { generatePuzzle, applyMove, isGoal, type TopPickState, type Move, type Tile } from '../solvers/TopPick.solver';

const BG = '#121213';
const SURFACE = '#1a1a1c';
const ACCENT = '#e8a838';
const ACCENT_BG = 'rgba(232,168,56,0.15)';
const NOM_COLOR = '#2ecc71';
const NOM_BG = 'rgba(46,204,113,0.15)';
const DANGER_COLOR = '#e74c3c';
const MUTED = '#818384';
const TEXT_C = '#ffffff';
const TRACKER_BG = 'rgba(52,152,219,0.12)';
const TRACKER_COLOR = '#3498db';

export default function TopPick() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(() => generatePuzzle(seed, difficulty), [seed, difficulty]);
  const [state, setState] = useState<TopPickState>(() => cloneState(initialState));
  const [history, setHistory] = useState<TopPickState[]>(() => [cloneState(initialState)]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficulty);
  const currentPuzzle = useMemo(
    () => selectedDifficulty === difficulty ? initialState : generatePuzzle(seed, selectedDifficulty),
    [seed, selectedDifficulty, difficulty, initialState]);
  const solved = isGoal(state);
  const verified = state.verified;
  const screenWidth = useWindowDimensions().width;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const doMove = useCallback((move: Move) => {
    if (state.verified) return;
    const next = applyMove(state, move);
    setState(next);
    setHistory(h => [...h, cloneState(next)]);
    if (next.verified && next.won && !gameRecorded) {
      setGameRecorded(true);
      recordGame("toppick", next.movesUsed, next.moveBudget).then(s => { setStats(s); setShowStats(true); });
    }
  }, [state, gameRecorded]);

  const handleFlip = useCallback((index: number) => {
    if (state.verified || state.tiles[index].revealed) return;
    if (state.movesUsed >= state.moveBudget) { shake(); return; }
    doMove({ type: "flip", index });
  }, [state, doMove, shake]);

  const handleNominate = useCallback((emoji: string) => {
    if (state.verified) return;
    if (state.nominations.has(emoji)) doMove({ type: "unnominate", emoji });
    else if (state.nominations.size < state.k) doMove({ type: "nominate", emoji });
    else shake();
  }, [state, doMove, shake]);

  const handleVerify = useCallback(() => {
    if (state.nominations.size !== state.k) { shake(); return; }
    doMove({ type: "verify" });
  }, [state, doMove, shake]);

  const handleUndo = useCallback(() => {
    if (history.length <= 1 || state.verified) return;
    setState(cloneState(history[history.length - 2]));
    setHistory(h => h.slice(0, -1));
  }, [history, state.verified]);

  const handleReset = useCallback(() => {
    const init = cloneState(currentPuzzle);
    setState(init); setHistory([cloneState(init)]); setGameRecorded(false);
  }, [currentPuzzle]);

  const handleDifficultyChange = useCallback((d: number) => {
    setSelectedDifficulty(d);
    const p = d === difficulty ? initialState : generatePuzzle(seed, d);
    const init = cloneState(p);
    setState(init); setHistory([cloneState(init)]); setGameRecorded(false);
  }, [seed, difficulty, initialState]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats("toppick"); setStats(s); setShowStats(true);
  }, []);

  function buildShareText() {
    const eff = state.movesUsed <= state.moveBudget * 0.5 ? "Master Analyst!"
      : state.movesUsed <= state.moveBudget * 0.8 ? "Efficient!" : "Done!";
    return "Top Pick Day #" + puzzleDay + "\n" + "Found top " + state.k + " in " + state.movesUsed + "/" + state.moveBudget + " flips" + "\n" + eff;
  }

  const cols = state.cols;
  const maxBW = Math.min(screenWidth - 48, 460);
  const tileSize = Math.min(56, Math.floor((maxBW - (cols - 1) * 6) / cols));
  const trueFreqsSorted = useMemo(() => [...state.trueFreqs.entries()].sort((a, b) => b[1] - a[1]), [state.trueFreqs]);
  const trackerSorted = useMemo(() => [...state.tracker.entries()].sort((a, b) => b[1] - a[1]), [state.tracker]);
  const budgetExhausted = !state.verified && state.movesUsed >= state.moveBudget;

  return (
    <View style={S.outer}>
      <ScrollView contentContainerStyle={S.container}>
        <View style={S.header}>
          <Text style={S.title}>Top Pick</Text>
          <Text style={S.dayBadge}>{"Day #" + puzzleDay}</Text>
          <Pressable onPress={handleShowStats}><Text style={S.statsIcon}>{"\uD83D\uDCCA"}</Text></Pressable>
        </View>
        <Text style={S.subtitle}>{"Flip tiles, track frequencies, find the top " + state.k}</Text>
        <View style={S.diffRow}>
          {[1,2,3,4,5].map(d => (
            <Pressable key={d} onPress={() => handleDifficultyChange(d)}
              style={[S.diffBtn, d === selectedDifficulty && S.diffBtnActive]}>
              <Text style={[S.diffText, d === selectedDifficulty && S.diffTextActive]}>{d}</Text>
            </Pressable>
          ))}
        </View>
        <View style={S.infoBar}>
          <View style={S.infoItem}><Text style={S.infoLabel}>Flips</Text>
            <Text style={[S.infoVal, state.movesUsed > state.moveBudget*0.8 && !solved && S.infoDanger, solved && state.movesUsed <= state.moveBudget*0.5 && S.infoGood]}>{state.movesUsed}</Text></View>
          <View style={S.infoItem}><Text style={S.infoLabel}>Budget</Text><Text style={S.infoPar}>{state.moveBudget}</Text></View>
          <View style={S.infoItem}><Text style={S.infoLabel}>Find Top</Text><Text style={S.infoVal}>{state.k}</Text></View>
          <View style={S.infoItem}><Text style={S.infoLabel}>Nominated</Text>
            <Text style={[S.infoVal, state.nominations.size === state.k && S.infoGood]}>{state.nominations.size + "/" + state.k}</Text></View>
        </View>
        <Animated.View style={[S.boardWrap, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={[S.tileGrid, { width: cols*(tileSize+6)-6 }]}>
            {state.tiles.map((tile: Tile, i: number) => {
              const rev = tile.revealed, nom = state.nominations.has(tile.emoji);
              let bg = SURFACE, bc = "#333", bw = 1;
              if (verified && rev) { const topK = new Set(trueFreqsSorted.slice(0,state.k).map(([e])=>e));
                if(topK.has(tile.emoji)){bg=NOM_BG;bc=NOM_COLOR;bw=2}else{bg="rgba(231,76,60,0.1)";bc="#555"}}
              else if(rev&&nom){bg=NOM_BG;bc=NOM_COLOR;bw=2}else if(rev){bg=ACCENT_BG;bc=ACCENT}
              return (<Pressable key={i} onPress={()=>handleFlip(i)} disabled={rev||state.verified}
                style={[S.tile,{width:tileSize,height:tileSize,backgroundColor:bg,borderColor:bc,borderWidth:bw}]}
                {...(Platform.OS==="web"?{role:"button" as any,tabIndex:0}:{})}>
                <Text style={[S.tileText,{fontSize:tileSize>40?22:16}]}>{rev||verified?tile.emoji:"?"}</Text>
              </Pressable>);
            })}
          </View>
        </Animated.View>
        <View style={S.trackerPanel}>
          <View style={S.trackerHeader}>
            <Text style={S.trackerTitle}>Frequency Tracker</Text>
            <Text style={S.trackerCount}>{state.tracker.size+" type"+(state.tracker.size!==1?"s":"")+" found"}</Text>
          </View>
          {trackerSorted.length > 0 ? (
            <View style={S.trackerGrid}>
              {trackerSorted.map(([emoji,count]: [string,number]) => {
                const nom = state.nominations.has(emoji);
                const tc = verified ? state.trueFreqs.get(emoji)||0 : null;
                return (<Pressable key={emoji} onPress={()=>handleNominate(emoji)} disabled={state.verified}
                  style={[S.trackerSlot,nom&&S.trackerSlotNom]} {...(Platform.OS==="web"?{role:"button" as any,tabIndex:0}:{})}>
                  <Text style={S.trackerEmoji}>{emoji}</Text>
                  <Text style={[S.trackerVal,nom&&S.trackerValNom]}>{count}</Text>
                  {tc!==null&&<Text style={[S.trueCount,tc===count?S.trueCountOk:S.trueCountBad]}>{"("+tc+")"}</Text>}
                  {nom&&<Text style={S.nomBadge}>{"\u2B50"}</Text>}
                </Pressable>);
              })}
            </View>
          ) : (<Text style={S.trackerEmpty}>Flip tiles to discover types</Text>)}
        </View>
        {!state.verified && state.tracker.size > 0 && (
          <View style={S.actionRow}>
            <Pressable style={[S.verifyBtn,state.nominations.size===state.k?S.verifyReady:S.verifyOff]}
              onPress={handleVerify} disabled={state.nominations.size!==state.k}
              {...(Platform.OS==="web"?{role:"button" as any,tabIndex:0}:{})}>
              <Text style={[S.verifyText,state.nominations.size===state.k&&S.verifyTextReady]}>
                {state.nominations.size===state.k?"Verify Top "+state.k:"Nominate "+(state.k-state.nominations.size)+" more"}
              </Text>
            </Pressable>
          </View>
        )}
        {budgetExhausted && (<View style={S.stuckBanner}>
          <Text style={S.stuckText}>{state.nominations.size===state.k?"Out of flips! Verify now, or undo/reset.":"Out of flips! Undo or reset."}</Text>
        </View>)}
        <CelebrationBurst show={solved} />
        {verified && (<View style={S.endMsg}>
          <Text style={S.endEmoji}>{state.won?(state.movesUsed<=state.moveBudget*0.5?"\uD83C\uDF1F":"\u2B50"):"\u274C"}</Text>
          <Text style={S.endText}>{state.won?(state.movesUsed<=state.moveBudget*0.5?"Master Analyst! "+state.movesUsed+" flips":"Correct! "+state.movesUsed+"/"+state.moveBudget+" flips"):"Wrong picks! True frequencies revealed below."}</Text>
          {state.won && <ShareButton text={buildShareText()} />}
          {!state.won && <Pressable style={S.retryBtn} onPress={handleReset}><Text style={S.retryText}>Try Again</Text></Pressable>}
        </View>)}
        {verified && (<View style={S.revealPanel}>
          <Text style={S.revealTitle}>True Frequencies</Text>
          <View style={S.revealGrid}>
            {trueFreqsSorted.map(([emoji,count]: [string,number], i: number) => {
              const top = i < state.k;
              return (<View key={emoji} style={[S.revealSlot,top&&S.revealSlotTop]}>
                <Text style={S.revealEmoji}>{emoji}</Text>
                <Text style={[S.revealCount,top&&S.revealCountTop]}>{count}</Text>
                {top&&<Text style={S.topBadge}>TOP</Text>}
              </View>);
            })}
          </View>
        </View>)}
        {solved && (<View style={S.algoReveal}>
          <Text style={S.algoTitle}>The Algorithm</Text>
          <Text style={S.algoText}>You just solved Top K Frequent Elements! By flipping tiles and tracking counts, you built a frequency hash map and extracted the top K.</Text>
          <Text style={S.algoLink}>{"LeetCode #347: Top K Frequent Elements -- Count frequencies with a hash map, then return the K most common. The game's frequency tracker mirrors this approach exactly.\n\nLeetCode #692: Top K Frequent Words -- Same pattern. Your nomination strategy of picking the highest-count types is the same greedy extraction step."}</Text>
        </View>)}
        <View style={S.howTo}>
          <Text style={S.howToTitle}>How to play</Text>
          <Text style={S.howToText}>{"Find the most frequent emoji types in the grid.\n\nTap hidden tiles to flip them (costs 1 flip). The frequency tracker auto-counts each type.\n\nTap types in the tracker to nominate your top picks. When nominations are full, hit Verify.\n\nThe trick: sample strategically to identify the most common types with fewer flips!"}</Text>
        </View>
        {!state.verified && state.movesUsed > 0 && <View style={{ height: 72 }} />}
        {showStats && stats && <StatsModal stats={stats} onClose={() => setShowStats(false)} />}
      </ScrollView>
      {!state.verified && state.movesUsed > 0 && (
        <View style={S.bottomBar}>
          {history.length > 1 && <Pressable style={S.undoBtn} onPress={handleUndo}><Text style={S.undoText}>Undo</Text></Pressable>}
          <Pressable style={S.resetBtn} onPress={handleReset}><Text style={S.resetText}>Reset</Text></Pressable>
        </View>
      )}
    </View>
  );
}

function cloneState(s: TopPickState): TopPickState {
  return { ...s, tiles: s.tiles.map(t => ({ ...t })), tracker: new Map(s.tracker),
    nominations: new Set(s.nominations), trueFreqs: s.trueFreqs };
}

const S = StyleSheet.create({
  outer: { flex: 1, backgroundColor: BG },
  container: { flexGrow: 1, alignItems: "center", backgroundColor: BG, paddingVertical: 16, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 28, fontWeight: "800", color: TEXT_C, letterSpacing: 2 },
  dayBadge: { color: "#6aaa64", fontSize: 13, fontWeight: "600" },
  statsIcon: { fontSize: 24 },
  subtitle: { fontSize: 13, color: MUTED, marginTop: 2, marginBottom: 10, textAlign: "center", maxWidth: 300 },
  diffRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  diffBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: SURFACE, borderWidth: 1, borderColor: "#333", alignItems: "center", justifyContent: "center" },
  diffBtnActive: { backgroundColor: ACCENT_BG, borderColor: ACCENT },
  diffText: { color: MUTED, fontSize: 14, fontWeight: "700" },
  diffTextActive: { color: ACCENT },
  infoBar: { flexDirection: "row", gap: 16, marginBottom: 10, alignItems: "center" },
  infoItem: { alignItems: "center" },
  infoLabel: { color: MUTED, fontSize: 11, marginBottom: 2 },
  infoVal: { color: TEXT_C, fontSize: 22, fontWeight: "800" },
  infoGood: { color: NOM_COLOR },
  infoDanger: { color: DANGER_COLOR },
  infoPar: { color: MUTED, fontSize: 22, fontWeight: "800" },
  boardWrap: { marginVertical: 8 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  tile: { borderRadius: 8, alignItems: "center", justifyContent: "center" },
  tileText: { fontWeight: "700" },
  trackerPanel: { width: "100%", maxWidth: 380, backgroundColor: TRACKER_BG, borderWidth: 1, borderColor: TRACKER_COLOR, borderRadius: 16, padding: 12, marginTop: 12, marginBottom: 8 },
  trackerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  trackerTitle: { color: TRACKER_COLOR, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  trackerCount: { color: MUTED, fontSize: 11, fontWeight: "600" },
  trackerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  trackerSlot: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(52,152,219,0.2)", borderWidth: 1, borderColor: "rgba(52,152,219,0.4)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, minWidth: 70 },
  trackerSlotNom: { backgroundColor: NOM_BG, borderColor: NOM_COLOR, borderWidth: 2 },
  trackerEmoji: { fontSize: 18 },
  trackerVal: { color: TRACKER_COLOR, fontSize: 16, fontWeight: "700" },
  trackerValNom: { color: NOM_COLOR },
  trueCount: { fontSize: 11, fontWeight: "600" },
  trueCountOk: { color: NOM_COLOR },
  trueCountBad: { color: DANGER_COLOR },
  nomBadge: { fontSize: 12 },
  trackerEmpty: { color: MUTED, fontSize: 12, fontStyle: "italic" },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 8 },
  verifyBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 24, minWidth: 180, alignItems: "center", borderWidth: 1 },
  verifyReady: { backgroundColor: NOM_BG, borderColor: NOM_COLOR },
  verifyOff: { backgroundColor: SURFACE, borderColor: "#333", opacity: 0.5 },
  verifyText: { color: MUTED, fontWeight: "700", fontSize: 16 },
  verifyTextReady: { color: NOM_COLOR },
  stuckBanner: { marginTop: 10, backgroundColor: "#4a1a1a", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  stuckText: { color: DANGER_COLOR, fontSize: 13, fontWeight: "600" },
  endMsg: { alignItems: "center", marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: { color: TEXT_C, fontSize: 18, fontWeight: "600", marginTop: 8, textAlign: "center" },
  retryBtn: { marginTop: 12, backgroundColor: ACCENT_BG, borderWidth: 1, borderColor: ACCENT, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: ACCENT, fontWeight: "700", fontSize: 14 },
  revealPanel: { width: "100%", maxWidth: 380, backgroundColor: "rgba(46,204,113,0.08)", borderWidth: 1, borderColor: "rgba(46,204,113,0.3)", borderRadius: 16, padding: 12, marginTop: 16 },
  revealTitle: { color: NOM_COLOR, fontSize: 14, fontWeight: "800", marginBottom: 8, letterSpacing: 1 },
  revealGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  revealSlot: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  revealSlotTop: { backgroundColor: NOM_BG, borderWidth: 1, borderColor: NOM_COLOR },
  revealEmoji: { fontSize: 18 },
  revealCount: { color: MUTED, fontSize: 14, fontWeight: "700" },
  revealCountTop: { color: NOM_COLOR },
  topBadge: { color: NOM_COLOR, fontSize: 9, fontWeight: "800" },
  algoReveal: { marginTop: 20, paddingHorizontal: 16, maxWidth: 380, alignItems: "center" },
  algoTitle: { color: ACCENT, fontSize: 16, fontWeight: "800", marginBottom: 8 },
  algoText: { color: MUTED, fontSize: 13, lineHeight: 20, textAlign: "center", marginBottom: 8 },
  algoLink: { color: TRACKER_COLOR, fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 4 },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: { color: TEXT_C, fontSize: 15, fontWeight: "700", marginBottom: 6 },
  howToText: { color: MUTED, fontSize: 13, lineHeight: 20 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: "#333" },
  undoBtn: { backgroundColor: "#3a3a3c", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  undoText: { color: TEXT_C, fontWeight: "600", fontSize: 14 },
  resetBtn: { backgroundColor: "#4a1a1a", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  resetText: { color: DANGER_COLOR, fontWeight: "600", fontSize: 14 },
});
