import React, { useState, useCallback, useRef, useEffect } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import GameScreenTemplate from "../components/GameScreenTemplate";
import MoveCounter from "../components/MoveCounter";
import WinOverlay from "../components/WinOverlay";
import { accentFor, THEME } from "../utils/colors";
import {
  generatePuzzle,
  applyMove,
  isGoal,
  isGameOver,
  type GameState,
  type TileData,
} from "../solvers/Reflect.solver";

const ACCENT = accentFor("Two Pointers");

export default function Reflect() {
  const [difficulty, setDifficulty] = useState(3);
  const [game, setGame] = useState<GameState>(() => generatePuzzle(Date.now(), 3));
  const [won, setWon] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [message, setMessage] = useState("");
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const newGame = useCallback((d: number) => {
    setDifficulty(d);
    setGame(generatePuzzle(Date.now(), d));
    setWon(false);
    setShowOverlay(false);
    setMessage("");
    setFlashColor(null);
  }, []);

  const doShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 3, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -3, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 3, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleTilePress = useCallback((tileIndex: number) => {
    if (won) return;
    setGame((prev) => {
      if (prev.energyUsed >= prev.energyBudget) return prev;
      if (prev.currentRound >= prev.rounds.length) return prev;
      const tile = prev.rounds[prev.currentRound].tiles[tileIndex];
      if (tile.state !== "hidden") return prev;
      const next = applyMove(prev, { type: "reveal", roundIndex: prev.currentRound, tileIndex });
      return next;
    });
  }, [won]);

  const handleClassify = useCallback((classification: "palindrome" | "not-palindrome") => {
    if (won) return;
    setGame((prev) => {
      if (prev.currentRound >= prev.rounds.length) return prev;
      const next = applyMove(prev, { type: "classify", roundIndex: prev.currentRound, classification });
      const wasCorrect = next.roundResults[prev.currentRound] === "correct";
      if (wasCorrect) {
        setFlashColor("#4ade80");
        setMessage("Correct!");
        setTimeout(() => setFlashColor(null), 300);
      } else {
        setFlashColor("#ef4444");
        setMessage("Wrong! -3 energy");
        doShake();
        setTimeout(() => setFlashColor(null), 300);
      }
      if (isGoal(next)) {
        setWon(true);
        setTimeout(() => setShowOverlay(true), 400);
      }
      return next;
    });
  }, [won, doShake]);
  const energyRemaining = game.energyBudget - game.energyUsed;
  const gameOver = !won && isGameOver(game);
  const currentRound = game.currentRound < game.rounds.length ? game.rounds[game.currentRound] : null;

  const renderTile = (tile: TileData, index: number) => {
    const isHidden = tile.state === "hidden";
    const isNoise = tile.tileType === "noise" && tile.state === "revealed";
    const isValue = tile.tileType === "value" && tile.state === "revealed";
    const tileSize = currentRound && currentRound.tiles.length > 9 ? 36 : currentRound && currentRound.tiles.length > 7 ? 40 : 48;

    return (
      <Pressable
        key={tile.id}
        onPress={() => handleTilePress(index)}
        disabled={!isHidden || gameOver || won || energyRemaining <= 0}
        style={[
          s.tile,
          {
            width: tileSize,
            height: tileSize,
            backgroundColor: isHidden ? THEME.borderLight : isNoise ? "#1a1a1e" : THEME.surface,
            borderColor: isHidden ? THEME.border : isNoise ? "#333" : ACCENT,
            opacity: isHidden && energyRemaining <= 0 ? 0.4 : 1,
          },
        ]}
      >
        <Text style={[s.tileText, { fontSize: tileSize > 40 ? 22 : 18, color: isNoise ? "#666" : "#fff" }]}>
          {isHidden ? "?" : tile.value}
        </Text>
      </Pressable>
    );
  };

  const board = (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
      {/* Round counter */}
      <View style={s.roundRow}>
        <Text style={s.roundLabel}>
          {game.currentRound < game.rounds.length
            ? "Round " + (game.currentRound + 1) + " of " + game.rounds.length
            : "All rounds complete"}
        </Text>
      </View>

      {/* Round result indicators */}
      <View style={s.indicatorRow}>
        {game.roundResults.map((result, i) => (
          <View
            key={i}
            style={[
              s.indicator,
              {
                backgroundColor:
                  result === "correct" ? "#4ade80" :
                  result === "wrong" ? "#ef4444" :
                  i === game.currentRound ? ACCENT :
                  THEME.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Flash overlay */}
      {flashColor ? (
        <View style={[s.flash, { backgroundColor: flashColor }]} />
      ) : null}

      {/* Current round tiles */}
      {currentRound ? (
        <View style={s.tileRow}>
          {currentRound.tiles.map((tile, i) => renderTile(tile, i))}
        </View>
      ) : null}

      {/* Classification buttons */}
      {currentRound && !gameOver && !won ? (
        <View style={s.classifyRow}>
          <Pressable
            onPress={() => handleClassify("palindrome")}
            style={[s.classifyBtn, { borderColor: ACCENT }]}
          >
            <Text style={[s.classifyLabel, { color: ACCENT }]}>Mirror</Text>
          </Pressable>
          <Pressable
            onPress={() => handleClassify("not-palindrome")}
            style={[s.classifyBtn, { borderColor: "#ef4444" }]}
          >
            <Text style={[s.classifyLabel, { color: "#ef4444" }]}>Break</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Message */}
      {message ? <Text style={s.message}>{message}</Text> : null}
      {gameOver ? <Text style={s.gameOverText}>Out of energy! Tap New Game.</Text> : null}
    </Animated.View>
  );
  return (
    <View style={{ flex: 1 }}>
      <GameScreenTemplate
        title="Reflect"
        emoji="🪞"
        subtitle="Palindrome detection with limited energy"
        objective={
          "Reveal tiles and classify each row as Mirror (palindrome) or Break (not palindrome) within " + game.energyBudget + " energy."
        }
        statsLabel={"D" + difficulty}
        actions={[
          {
            label: "New Game",
            onPress: () => newGame(difficulty),
            tone: "primary",
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
            remaining={energyRemaining}
            total={game.energyBudget}
            label="Energy"
          />
        }
        helperText="Tap tiles to reveal (1 energy each). Classify as Mirror or Break. Wrong guess costs 3 energy."
        conceptBridge={won ? {
          title: "Two Pointers (Palindrome Check)",
          summary:
            "You just used the two-pointer technique! Checking from both ends and converging inward is exactly how " +
            "the optimal palindrome check algorithm works. Early-exiting on the first mismatch saves O(n) vs O(n²) comparisons.",
          takeaway:
            "Two pointers converging from ends: O(n) palindrome check with early exit on mismatch.",
        } : undefined}
        leetcodeLinks={won ? [
          {
            id: 125,
            title: "Valid Palindrome",
            url: "https://leetcode.com/problems/valid-palindrome/",
            description:
              "Revealing from both ends and skipping noise tiles mirrors the two-pointer approach that skips non-alphanumeric characters in Valid Palindrome.",
          },
          {
            id: 15,
            title: "3Sum",
            url: "https://leetcode.com/problems/3sum/",
            description:
              "3Sum uses the same converging two-pointer technique inside a loop to find triplets that sum to zero.",
          },
          {
            id: 11,
            title: "Container With Most Water",
            url: "https://leetcode.com/problems/container-with-most-water/",
            description:
              "Container With Most Water uses two pointers from both ends, moving the shorter side inward -- the same converge-from-ends strategy.",
          },
        ] : []}
      />
      <WinOverlay
        show={showOverlay}
        title="Reflect!"
        score={game.roundResults.filter(r => r === "correct").length + "/" + game.rounds.length + " correct"}
        detail={game.energyUsed + " energy used (budget: " + game.energyBudget + ")"}
        accentColor={ACCENT}
        onDismiss={() => setShowOverlay(false)}
      />
    </View>
  );
}
const s = StyleSheet.create({
  roundRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  roundLabel: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  indicatorRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 12,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  flash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
    borderRadius: 12,
    zIndex: 10,
  },
  tileRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  tile: {
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: {
    fontWeight: "800",
  },
  classifyRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 8,
  },
  classifyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: THEME.surface,
  },
  classifyLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  message: {
    color: THEME.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  gameOverText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
});