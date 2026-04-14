import React, { useState, useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import GameScreenTemplate from "../components/GameScreenTemplate";
import MoveCounter from "../components/MoveCounter";
import WinOverlay from "../components/WinOverlay";
import { accentFor, THEME } from "../utils/colors";
import {
  generatePuzzle,
  applyMove,
  isGoal,
  type GameState,
  type TileData,
  type TileState,
  type TallyResult,
} from "../solvers/Tally.solver";

const ACCENT = accentFor("Hash Map");

const TILE_COLORS: Record<TileState, string> = {
  hidden: THEME.borderLight,
  revealed: ACCENT,
  counted: "#4ade80",
};

export default function Tally() {
  const [difficulty, setDifficulty] = useState(3);
  const [game, setGame] = useState<GameState>(() => generatePuzzle(Date.now(), 3));
  const [won, setWon] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [message, setMessage] = useState("");

  const newGame = useCallback((d: number) => {
    setDifficulty(d);
    setGame(generatePuzzle(Date.now(), d));
    setWon(false);
    setShowOverlay(false);
    setMessage("");
  }, []);

  const handleTilePress = useCallback(
    (tileId: number) => {
      if (won) return;
      setGame((prev) => {
        if (prev.movesUsed >= prev.moveBudget && prev.tiles.find(t => t.id === tileId)?.state !== "revealed") return prev;
        const tile = prev.tiles.find((t) => t.id === tileId);
        if (!tile) return prev;

        // FLIP: hidden tile -> revealed (costs 1 move)
        if (tile.state === "hidden") {
          const next = applyMove(prev, { type: "flip", tileId });
          setMessage("Tap again to tally this type");
          return next;
        }

        // TALLY: revealed tile -> tally all of that type
        if (tile.state === "revealed" && !prev.talliedTypes.has(tile.type)) {
          const next = applyMove(prev, { type: "tally", tileId });
          const result = next.tallyResults.get(tile.type);
          if (result && !result.match) {
            setMessage("Mismatch found! " + tile.type + ": A=" + result.countA + " B=" + result.countB);
            setWon(true);
            setShowOverlay(true);
          } else if (result && result.match) {
            setMessage(tile.type + " matched! A=" + result.countA + " B=" + result.countB);
            if (isGoal(next)) {
              setWon(true);
              setShowOverlay(true);
            }
          }
          return next;
        }

        return prev;
      });
    },
    [won]
  );

  const remaining = game.moveBudget - game.movesUsed;
  const gameOver = !won && remaining <= 0 && !isGoal(game);
  const rowA = game.tiles.filter((t) => t.row === "A");
  const rowB = game.tiles.filter((t) => t.row === "B");
  const tallyEntries = Array.from(game.tallyResults.entries());

  const renderTile = (tile: TileData) => {
    const isCounted = tile.state === "counted";
    const result = isCounted ? game.tallyResults.get(tile.type) : null;
    const isMatch = result?.match ?? true;
    let bg = TILE_COLORS[tile.state];
    if (isCounted) bg = isMatch ? "#166534" : "#991b1b";

    return (
      <Pressable
        key={tile.id}
        onPress={() => handleTilePress(tile.id)}
        disabled={tile.state === "counted" || gameOver || won}
        style={[
          s.tile,
          {
            backgroundColor: bg,
            opacity: isCounted ? 0.7 : 1,
          },
        ]}
      >
        <Text style={s.tileText}>
          {tile.state === "hidden" ? "?" : tile.type}
        </Text>
      </Pressable>
    );
  };

  const board = (
    <View>
      {/* Shelf A */}
      <View style={s.shelfSection}>
        <Text style={s.shelfLabel}>Shelf A</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.shelfRow}>
            {rowA.map(renderTile)}
          </View>
        </ScrollView>
      </View>

      {/* Shelf B */}
      <View style={s.shelfSection}>
        <Text style={s.shelfLabel}>Shelf B</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.shelfRow}>
            {rowB.map(renderTile)}
          </View>
        </ScrollView>
      </View>

      {/* Tally Board */}
      {tallyEntries.length > 0 ? (
        <View style={s.tallyBoard}>
          <Text style={s.tallyTitle}>Tally Board</Text>
          <View style={s.tallyGrid}>
            {tallyEntries.map(([emoji, result]) => (
              <View
                key={emoji}
                style={[
                  s.tallyEntry,
                  { borderColor: result.match ? "#4ade80" : "#ef4444" },
                ]}
              >
                <Text style={s.tallyEmoji}>{emoji}</Text>
                <View style={s.tallyCounts}>
                  <Text style={s.tallyCountLabel}>A: {result.countA}</Text>
                  <Text style={s.tallyCountLabel}>B: {result.countB}</Text>
                </View>
                <Text
                  style={[
                    s.tallyStatus,
                    { color: result.match ? "#4ade80" : "#ef4444" },
                  ]}
                >
                  {result.match ? "Match" : "Mismatch!"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Message */}
      {message ? <Text style={s.message}>{message}</Text> : null}
      {gameOver ? (
        <Text style={s.gameOverText}>Out of flips! Tap New Game.</Text>
      ) : null}
    </View>
  );

  const winTitle = game.mismatchFound ? "Found it!" : "Same inventory!";
  const winScore = game.mismatchFound
    ? "Mismatch detected"
    : "All types matched";

  return (
    <View style={{ flex: 1 }}>
      <GameScreenTemplate
        title="Tally"
        emoji="📊"
        subtitle="Check if two shelves match"
        objective={
          "Verify that both shelves have the same inventory within " + game.moveBudget + " flips."
        }
        statsLabel={"D" + difficulty}
        actions={[
          {
            label: "New Game",
            onPress: () => newGame(difficulty),
            tone: "primary" as const,
          },
        ]}
        difficultyOptions={[1, 2, 3, 4, 5].map((d) => ({
          label: "D" + d,
          selected: d === difficulty,
          onPress: () => newGame(d),
        }))}
        board={board}
        controls={
          <MoveCounter
            remaining={remaining}
            total={game.moveBudget}
            label="Flips"
          />
        }
        helperText="Tap to flip (costs 1 flip). Tap a revealed tile again to tally that type."
        conceptBridge={{
          title: "Hash Map (Frequency Counting)",
          summary:
            "Tallying a type counts all instances at once -- this is exactly building a frequency map. " +
            "Comparing counts across shelves is how Valid Anagram works: count each character, compare counts.",
          takeaway:
            "Group by type and count -- don't scan items one by one.",
        }}
        leetcodeLinks={[
          {
            id: 242,
            title: "Valid Anagram",
            url: "https://leetcode.com/problems/valid-anagram/",
            description:
              "Tallying types on both shelves and comparing counts is exactly how you solve Valid Anagram: build frequency maps for both strings and check if they match.",
          },
          {
            id: 49,
            title: "Group Anagrams",
            url: "https://leetcode.com/problems/group-anagrams/",
            description:
              "Group Anagrams groups strings by their frequency signature -- the same count-by-type pattern you use when tallying items on the shelves.",
          },
        ]}
      />
      <WinOverlay
        show={showOverlay}
        title={winTitle}
        score={winScore}
        detail={game.movesUsed + " flips used (budget: " + game.moveBudget + ")"}
        accentColor={ACCENT}
        onDismiss={() => setShowOverlay(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  shelfSection: {
    marginBottom: 16,
  },
  shelfLabel: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  shelfRow: {
    flexDirection: "row",
    gap: 6,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
  tallyBoard: {
    marginTop: 16,
    gap: 8,
  },
  tallyTitle: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tallyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tallyEntry: {
    backgroundColor: THEME.surface,
    borderRadius: 10,
    borderWidth: 2,
    padding: 8,
    alignItems: "center",
    minWidth: 70,
    gap: 4,
  },
  tallyEmoji: {
    fontSize: 20,
  },
  tallyCounts: {
    flexDirection: "row",
    gap: 8,
  },
  tallyCountLabel: {
    color: THEME.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  tallyStatus: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  message: {
    color: THEME.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  gameOverText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
});
