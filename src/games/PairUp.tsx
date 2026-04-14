import React, { useState, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
} from "../solvers/PairUp.solver";

const ACCENT = accentFor("Hash Map");
const COLORS: Record<TileState, string> = {
  hidden: THEME.borderLight,
  revealed: ACCENT,
  stamped: "#f59e0b",
  paired: "#4ade80",
};
function hideRevealed(state: GameState): GameState {
  return {
    ...state,
    tiles: state.tiles.map((t) =>
      t.state === "revealed" ? { ...t, state: "hidden" as TileState } : t
    ),
  };
}

export default function PairUp() {
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
        if (prev.movesUsed >= prev.moveBudget) return prev;
        const tile = prev.tiles.find((t) => t.id === tileId);
        if (!tile) return prev;

        // FLIP: hidden tile -> revealed (costs a move)
        // First hide any un-stamped revealed tiles
        if (tile.state === "hidden") {
          const cleared = hideRevealed(prev);
          const next = applyMove(cleared, { type: "flip", tileId });
          setMessage("Tap to stamp (save) or flip another tile");
          return next;
        }

        // STAMP: revealed tile -> stamped (adds to registry)
        // Then auto-pair if complement exists
        if (tile.state === "revealed") {
          let next = applyMove(prev, { type: "stamp", tileId });
          const comp = prev.target - tile.value;
          // Check if complement was already in registry BEFORE we stamped
          if (prev.registry.has(comp)) {
            const partnerId = prev.registry.get(comp)!;
            next = applyMove(next, {
              type: "pair",
              tileId1: tileId,
              tileId2: partnerId,
            });
            setMessage("Pair found! " + tile.value + " + " + comp + " = " + prev.target);
            if (isGoal(next)) { setWon(true); setShowOverlay(true); }
          } else {
            setMessage("Stamped " + tile.value + " (saved to registry)");
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
  const cols = game.tiles.length <= 8 ? 4 : game.tiles.length <= 12 ? 4 : 5;

  const board = (
    <View>
      {/* Target display */}
      <View style={s.targetRow}>
        <Text style={s.targetLabel}>Target Sum</Text>
        <Text style={s.targetValue}>{game.target}</Text>
      </View>

      {/* Pairs counter */}
      <View style={s.pairsRow}>
        <Text style={s.pairsLabel}>
          Pairs: {game.pairsFound}/{game.pairsNeeded}
        </Text>
      </View>

      {/* Tile grid */}
      <View style={s.grid}>
        {game.tiles.map((tile) => (
          <Pressable
            key={tile.id}
            onPress={() => handleTilePress(tile.id)}
            disabled={tile.state === "paired" || gameOver || won}
            style={[
              s.tile,
              {
                width: (280 - (cols - 1) * 8) / cols,
                height: (280 - (cols - 1) * 8) / cols,
                backgroundColor: COLORS[tile.state],
                opacity: tile.state === "paired" ? 0.4 : 1,
              },
            ]}
          >
            <Text style={s.tileText}>
              {tile.state === "hidden" ? "?" : String(tile.value)}
            </Text>
            {tile.state === "stamped" ? (
              <Text style={s.stampBadge}>S</Text>
            ) : null}
          </Pressable>
        ))}
      </View>

      {/* Registry display */}
      <View style={s.registryRow}>
        <Text style={s.registryLabel}>Registry:</Text>
        <Text style={s.registryValues}>
          {game.registry.size === 0
            ? "(empty)"
            : Array.from(game.registry.keys()).join(", ")}
        </Text>
      </View>

      {/* Message */}
      {message ? <Text style={s.message}>{message}</Text> : null}
      {gameOver ? (
        <Text style={s.gameOverText}>Out of moves! Tap New Game.</Text>
      ) : null}
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <GameScreenTemplate
        title="Pair Up"
        emoji="🔢"
        subtitle="Find pairs that sum to the target"
        objective={
          `Find ${game.pairsNeeded} pairs of tiles that add up to ${game.target} within ${game.moveBudget} flips.`
        }
        statsLabel={`D${difficulty}`}
        actions={[
          {
            label: "New Game",
            onPress: () => newGame(difficulty),
            tone: "primary",
          },
        ]}
        difficultyOptions={[1, 2, 3, 4, 5].map((d) => ({
          label: `D${d}`,
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
        helperText="Tap to flip. Tap revealed tile to stamp (save). Pairs auto-match."
        conceptBridge={{
          title: "Hash Map (Two Sum)",
          summary:
            "This game teaches the hash map pattern. Stamping tiles into your registry is like inserting into a hash map. " +
            "Checking for a complement when you flip is exactly how the Two Sum algorithm works.",
          takeaway:
            "Trade space for time: store what you have seen so you never re-scan.",
        }}
        leetcodeLinks={[
          {
            id: 1,
            title: "Two Sum",
            url: "https://leetcode.com/problems/two-sum/",
            description:
              "Stamping a tile stores its value; flipping a new tile and checking the registry for its complement is exactly the hash map approach to Two Sum.",
          },
          {
            id: 49,
            title: "Group Anagrams",
            url: "https://leetcode.com/problems/group-anagrams/",
            description:
              "Group Anagrams uses the same hash map pattern — store items by a computed key for instant grouping, just like the registry groups tiles by value.",
          },
          {
            id: 217,
            title: "Contains Duplicate",
            url: "https://leetcode.com/problems/contains-duplicate/",
            description:
              "Contains Duplicate checks if a value was already seen using a hash set — the same registry lookup used every time you stamp a tile.",
          },
        ]}
      />
      <WinOverlay
        show={showOverlay}
        title="Pair Up!"
        score={`${game.pairsFound}/${game.pairsNeeded} pairs`}
        detail={`${game.movesUsed} flips used (budget: ${game.moveBudget})`}
        accentColor={ACCENT}
        onDismiss={() => setShowOverlay(false)}
      />
    </View>
  );
}
const s = StyleSheet.create({
  targetRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  targetLabel: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  targetValue: {
    color: ACCENT,
    fontSize: 32,
    fontWeight: "900",
  },
  pairsRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  pairsLabel: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  tile: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  stampBadge: {
    position: "absolute",
    top: 2,
    right: 4,
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    opacity: 0.7,
  },
  registryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  registryLabel: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  registryValues: {
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: "600",
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