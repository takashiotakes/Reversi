import React, { useState, useEffect, useRef, useCallback } from "react";
import "./OthelloGame.css";
import flipSoundSrc from "./sounds/flip.mp3";

type Player = "black" | "white";
type Cell = Player | null;
type Move = {
  board: Cell[][];
  player: Player; // This player's turn comes after this move
  movePos: [number, number] | null; // Coordinates of the move made, null if pass
  isAIMove: boolean; // Flag to indicate if this move was made by AI or human
};

// Function to initialize the Othello board
const initialBoard = (): Cell[][] => {
  const board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  board[3][3] = "white";
  board[3][4] = "black";
  board[4][3] = "black";
  board[4][4] = "white";
  return board;
};

// Definitions for stone flipping directions (8 directions)
const directions = [
  [0, 1], // Right
  [1, 0], // Down
  [0, -1], // Left
  [-1, 0], // Up
  [1, 1], // Down-right
  [-1, -1], // Up-left
  [1, -1], // Down-left
  [-1, 1], // Up-right
];

// Evaluation values for each cell (used for AI's thinking)
const positionWeights = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [10, -2, -1, -1, -1, -1, -2, 10],
  [5, -2, -1, -1, -1, -1, -2, 5],
  [5, -2, -1, -1, -1, -1, -2, 5],
  [10, -2, -1, -1, -1, -1, -2, 10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10, 5, 5, 10, -20, 100],
];

// Checks if the given coordinates are within the board boundaries
const isOnBoard = (x: number, y: number) => x >= 0 && x < 8 && y >= 0 && y < 8;

// Generates a list of valid moves for the current board and player
const getValidMoves = (board: Cell[][], player: Player): [number, number][] => {
  const opponent: Player = player === "black" ? "white" : "black";
  const moves: [number, number][] = [];

  // Iterate over all cells
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (board[y][x]) continue; // Skip cells that already have a stone
      for (const [dx, dy] of directions) {
        let nx = x + dx,
          ny = y + dy;
        let hasOpponent = false; // Flag to check if there's an opponent's stone in between
        // Continue in the same direction as long as opponent's stones are encountered
        while (isOnBoard(nx, ny) && board[ny][nx] === opponent) {
          nx += dx;
          ny += dy;
          hasOpponent = true;
        }
        // If there were opponent's stones in between and the line ends with the current player's stone, it's a valid move
        if (hasOpponent && isOnBoard(nx, ny) && board[ny][nx] === player) {
          moves.push([x, y]);
          break; // Move to the next cell as this one is a valid move
        }
      }
    }
  }
  return moves;
};

// Applies a move and flips stones on the board
const applyMove = (
  board: Cell[][],
  x: number,
  y: number,
  player: Player,
  audio: HTMLAudioElement | null
): { newBoard: Cell[][]; flippedCoords: [number, number][] } => {
  const newBoard = board.map((row) => row.slice()); // Create a deep copy of the board
  const opponent = player === "black" ? "white" : "black";
  newBoard[y][x] = player; // Place the new stone

  const flippedCoordinates: [number, number][] = []; // To store coordinates of flipped stones

  // Check all 8 directions to find stones to flip
  for (const [dx, dy] of directions) {
    let nx = x + dx,
      ny = y + dy;
    const stonesInLine: [number, number][] = []; // Stones in the current line that might be flipped

    // Traverse in the current direction as long as opponent's stones are encountered
    while (isOnBoard(nx, ny) && newBoard[ny][nx] === opponent) {
      stonesInLine.push([nx, ny]);
      nx += dx;
      ny += dy;
    }

    // If the line ends with the current player's stone, flip the intermediate stones
    if (isOnBoard(nx, ny) && newBoard[ny][nx] === player) {
      for (const [fx, fy] of stonesInLine) {
        newBoard[fy][fx] = player; // Flip the stone
        flippedCoordinates.push([fx, fy]); // Add to the list of flipped coordinates
      }
    }
  }

  // Play sound effect
  if (audio) {
    audio.currentTime = 0; // Rewind to start
    audio.play();
  }
  return { newBoard, flippedCoords: flippedCoordinates };
};

// Evaluates the board and returns a score (for AI)
const evaluateBoard = (board: Cell[][], player: Player): number => {
  const opponent = player === "black" ? "white" : "black";
  let score = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (board[y][x] === player)
        score += positionWeights[y][x]; // Add score for player's stones
      else if (board[y][x] === opponent) score -= positionWeights[y][x]; // Subtract score for opponent's stones
    }
  }
  return score;
};

// AI's thinking logic using Minimax algorithm
const minimax = (
  board: Cell[][],
  depth: number, // Search depth
  maximizing: boolean, // True if current node is a maximizing node, false if minimizing
  player: Player, // Current player's turn
  alpha: number, // Alpha value
  beta: number // Beta value
): [number, number, number] => {
  const validMoves = getValidMoves(board, player);
  // Return evaluation value if search depth is 0 or no valid moves
  if (depth === 0 || validMoves.length === 0) {
    return [-1, -1, evaluateBoard(board, player)];
  }

  let bestMove: [number, number] = [-1, -1];
  let bestScore = maximizing ? -Infinity : Infinity;

  // Recursively search for all valid moves
  for (const [x, y] of validMoves) {
    // applyMove is used here for pure calculation, not triggering sound or animation
    const { newBoard: simulatedBoard } = applyMove(board, x, y, player, null);
    const [, , score] = minimax(
      simulatedBoard,
      depth - 1, // Decrease depth
      !maximizing, // Invert maximizing/minimizing node
      player === "black" ? "white" : "black", // Switch players
      alpha,
      beta
    );

    // Alpha-beta pruning
    if (maximizing) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = [x, y];
      }
      alpha = Math.max(alpha, bestScore);
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = [x, y];
      }
      beta = Math.min(beta, bestScore);
    }
    if (beta <= alpha) break; // Pruning
  }

  return [...bestMove, bestScore];
};

export default function OthelloGame() {
  // Game history management (board state after each move, next player, coordinates of the move, AI move flag)
  const [history, setHistory] = useState<Move[]>([
    { board: initialBoard(), player: "black", movePos: null, isAIMove: false },
  ]);
  // Index of the currently displayed move
  const [currentMove, setCurrentMove] = useState(0);
  // Data for the current move
  const current = history[currentMove];
  // List of valid moves for the current player
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);

  // Mode selection: Type of first and second player (human/AI)
  const [firstPlayerType, setFirstPlayerType] = useState<"human" | "ai">(
    "human"
  ); // 1P (Black)
  const [secondPlayerType, setSecondPlayerType] = useState<"human" | "ai">(
    "ai"
  ); // 2P (White)

  // AI's thinking depth (difficulty)
  const [aiDepth, setAiDepth] = useState(3);
  // Dark mode enabled/disabled
  const [darkMode, setDarkMode] = useState(false);
  // Game result message
  const [gameResult, setGameResult] = useState<string>("");
  // Reference to the Audio element for sound effects
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Flag indicating if AI move is in progress
  const [isProcessingAIMove, setIsProcessingAIMove] = useState(false);
  // State to hold coordinates of stones being flipped for animation
  const [flippedStones, setFlippedStones] = useState<[number, number][]>([]);

  // Hint display related states
  const [showHint, setShowHint] = useState(false);
  const [hintMove, setHintMove] = useState<[number, number] | null>(null);

  // Current player whose turn it is
  const currentPlayer = current.player;
  // Current board state
  const board = current.board;

  // Helper function to get the next player
  const nextPlayer = (p: Player): Player => (p === "black" ? "white" : "black");

  // Function to count stones of a specific color
  const countStones = (color: Player) =>
    board.flat().filter((cell) => cell === color).length;

  // Effect to update valid moves when the board or current player changes
  // Used for displaying UI hints and for AI's next action decision
  useEffect(() => {
    setValidMoves(getValidMoves(board, currentPlayer));
  }, [board, currentPlayer]);

  // Effect to handle AI thinking and automated moves
  // Triggered when game state (board, player, mode, etc.) changes
  useEffect(() => {
    // If game has already ended, do not proceed with AI or pass logic
    if (gameResult) {
      setIsProcessingAIMove(false); // Reset flag just in case
      return;
    }

    // AI should not act if not at the latest point in history (e.g., during undo/redo)
    if (currentMove !== history.length - 1) {
      return;
    }

    const movesForCurrentPlayer = getValidMoves(board, currentPlayer);
    const oppMovesForNextPlayer = getValidMoves(
      board,
      nextPlayer(currentPlayer)
    );

    const isCurrentPlayerAI =
      (currentPlayer === "black" && firstPlayerType === "ai") ||
      (currentPlayer === "white" && secondPlayerType === "ai");
    
    const isNextPlayerAI =
      (nextPlayer(currentPlayer) === "black" && firstPlayerType === "ai") ||
      (nextPlayer(currentPlayer) === "white" && secondPlayerType === "ai");

    // Count stones
    const blackCount = countStones("black");
    const whiteCount = countStones("white");
    const totalStones = blackCount + whiteCount;

    // MARK: Game End Condition Check (Highest priority)
    // Board is full, one player has zero stones, both players pass, or 60 moves reached
    if (
      totalStones === 64 ||
      blackCount === 0 ||
      whiteCount === 0 ||
      (movesForCurrentPlayer.length === 0 &&
        oppMovesForNextPlayer.length === 0) ||
      currentMove === 60
    ) {
      // Game end processing
      const finalBlackCount = countStones("black");
      const finalWhiteCount = countStones("white");

      if (finalBlackCount > finalWhiteCount)
        setGameResult("Black wins"); // Black wins
      else if (finalWhiteCount > finalBlackCount)
        setGameResult("White wins"); // White wins
      else setGameResult("Draw"); // Draw
      setIsProcessingAIMove(false); // Reset AI processing flag
      return; // Game ended, no further actions
    }

    // MARK: Pass handling (if current player has no valid moves)
    if (movesForCurrentPlayer.length === 0) {
      // If current player has no moves, and it's an AI's turn, or if it's a human's turn
      // but they are forced to pass because no moves are available.
      // Important: Only proceed if AI is not already processing
      if (isProcessingAIMove) { // If AI is already processing a move (or previous pass), prevent double processing
          return;
      }
      setIsProcessingAIMove(true); // Indicate that a pass action is being processed
      setTimeout(() => {
        setHistory((prev) => [
          ...prev,
          {
            board,
            player: nextPlayer(currentPlayer),
            movePos: null,
            isAIMove: isCurrentPlayerAI, // Record whether the passing player was AI
          },
        ]);
        setCurrentMove((m) => m + 1);
        setGameResult("");
        setIsProcessingAIMove(false); // Reset after pass is recorded
        setShowHint(false);
        setHintMove(null);
      }, 500); // Small delay for pass effect
      return; // Handled pass, no further AI or human move logic for this turn
    }

    // MARK: AI Action Processing (if it's AI's turn and game not ended, not a pass)
    if (isCurrentPlayerAI) {
      if (isProcessingAIMove) { // If AI is already processing a move, prevent double processing
        return;
      }

      setIsProcessingAIMove(true); // Set flag to indicate AI action in progress
      setShowHint(false);
      setHintMove(null);

      const [x, y] = minimax(
        board,
        aiDepth,
        true, // AI always tries to maximize its own score
        currentPlayer,
        -Infinity,
        Infinity
      );

      if (x !== -1 && y !== -1) {
        setTimeout(() => {
          const { newBoard, flippedCoords } = applyMove(
            board,
            x,
            y,
            currentPlayer,
            audioRef.current
          );
          setFlippedStones(flippedCoords);

          setHistory((prev) => [
            ...prev,
            {
              board: newBoard,
              player: nextPlayer(currentPlayer),
              movePos: [x, y],
              isAIMove: true,
            },
          ]);
          setCurrentMove((m) => m + 1);
          setGameResult("");
          setIsProcessingAIMove(false); // AI move completed, reset flag

          setTimeout(() => setFlippedStones([]), 500);
        }, 500);
      } else {
        // This case should ideally be caught by the `movesForCurrentPlayer.length === 0` check
        // but as a fallback, if minimax somehow fails to find a move, ensure AI processing is reset.
        setIsProcessingAIMove(false);
      }
    }
  }, [
    board,
    currentPlayer,
    currentMove,
    history.length,
    firstPlayerType,
    secondPlayerType,
    aiDepth,
    nextPlayer,
    gameResult,
    // isProcessingAIMove is removed from here
  ]);

  // Handles cell click (for human player)
  const handleClick = (x: number, y: number) => {
    // Determine if it's currently a human player's turn
    const isHumanPlayerTurn =
      (currentPlayer === "black" && firstPlayerType === "human") ||
      (currentPlayer === "white" && secondPlayerType === "human");

    // If not human player's turn, or AI is processing, disable operation
    if (!isHumanPlayerTurn || isProcessingAIMove) return;

    // If clicked position is not a valid move, disable operation
    if (!validMoves.some(([vx, vy]) => vx === x && vy === y)) return;

    // Apply the move and generate new board state
    const { newBoard, flippedCoords } = applyMove(
      board,
      x,
      y,
      currentPlayer,
      audioRef.current
    );
    setFlippedStones(flippedCoords); // Set coordinates of flipped stones for animation

    setHistory((prev) => [
      ...prev.slice(0, currentMove + 1), // Remove history after current move and add new move
      {
        board: newBoard,
        player: nextPlayer(currentPlayer),
        movePos: [x, y],
        isAIMove: false,
      }, // Flag as human move
    ]);
    setCurrentMove((m) => m + 1);
    setGameResult(""); // Reset game result after making a new move
    setIsProcessingAIMove(false); // Reset AI processing flag if human makes a move
    // Clear hint when human makes a move
    setShowHint(false);
    setHintMove(null);

    // Clear flippedStones after animation ends
    setTimeout(() => setFlippedStones([]), 500); // Match CSS animation duration
  };

  // "Undo" button handler
  const handleUndo = useCallback(() => {
    if (currentMove === 0) return; // Cannot go back further than initial board

    // If AI vs AI mode, simply go back one step
    if (firstPlayerType === "ai" && secondPlayerType === "ai") {
      setCurrentMove(currentMove - 1);
    } else {
      let targetMoveIndex = currentMove - 1; // Start from one step before the current displayed move

      // Iterate backward through history to find a state where the next player to move is human
      while (targetMoveIndex >= 0) {
        // history[targetMoveIndex].player indicates the player whose turn it would be at this point in history
        const playerWhoseTurnItIs = history[targetMoveIndex].player;

        // Check if this player is set as 'human' in game settings
        const isThisStateForHumanPlayer =
          (playerWhoseTurnItIs === "black" && firstPlayerType === "human") ||
          (playerWhoseTurnItIs === "white" && secondPlayerType === "human");

        // If it's a human player's turn at this state, or if we've reached the initial state (move 0)
        if (isThisStateForHumanPlayer || targetMoveIndex === 0) {
          setCurrentMove(targetMoveIndex); // Go back to that state
          // Clear hint when navigating history
          setShowHint(false);
          setHintMove(null);
          return; // Found, so exit
        }
        targetMoveIndex--; // Go to the previous move
      }
      // If reached here, no human playable turn was found in history (e.g., initial state)
      setCurrentMove(0);
    }
    setGameResult("");
    setIsProcessingAIMove(false);
    setFlippedStones([]);
  }, [currentMove, history, firstPlayerType, secondPlayerType]); // Update dependencies

  // "Redo" button handler
  const handleRedo = useCallback(() => {
    if (currentMove >= history.length - 1) return; // Cannot go forward further than the end of history

    // If AI vs AI mode, simply go forward one step
    if (firstPlayerType === "ai" && secondPlayerType === "ai") {
      setCurrentMove(currentMove + 1);
    } else {
      let targetMoveIndex = currentMove + 1; // Start searching from the next move after the currently displayed move
      // Iterate forward through history to find the next state where a human player's turn is coming up
      while (targetMoveIndex < history.length) {
        // history[targetMoveIndex].player indicates the player whose turn it would be at this board state.
        // Check if that player is human based on game settings.
        const playerWhoseTurnItIsNext = history[targetMoveIndex].player;
        const isNextPlayerHuman =
          (playerWhoseTurnItIsNext === "black" &&
            firstPlayerType === "human") ||
          (playerWhoseTurnItIsNext === "white" && secondPlayerType === "human");

        if (isNextPlayerHuman) {
          // If the next turn is for a human player, advance to that state.
          // This allows the human to play that turn.
          setCurrentMove(targetMoveIndex);
          // Clear hint when navigating history
          setShowHint(false);
          setHintMove(null);
          break; // Found, so exit
        }
        targetMoveIndex++;
      }
      // If reached here, no human playable turn was found until the end of history (e.g., AI moves continued until the end)
      if (targetMoveIndex >= history.length) {
        setCurrentMove(history.length - 1);
      }
    }
    setGameResult("");
    setIsProcessingAIMove(false);
    setFlippedStones([]);
  }, [currentMove, history.length, firstPlayerType, secondPlayerType]);

  // Keyboard shortcuts (Ctrl+Z: Undo, Ctrl+Y: Redo)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z") {
        handleUndo();
      } else if (e.ctrlKey && e.key === "y") {
        handleRedo();
      }
    },
    [handleUndo, handleRedo]
  );

  // Register and unregister keyboard event listeners
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // "Hint" button handler
  const handleHint = useCallback(() => {
    // Determine if it's currently a human player's turn
    const isHumanPlayerNow =
      (currentPlayer === "black" && firstPlayerType === "human") ||
      (currentPlayer === "white" && secondPlayerType === "human");
    // Disable if not human player's turn, AI is processing, or game has ended
    if (!isHumanPlayerNow || isProcessingAIMove || gameResult !== "") {
      // If hint is currently shown and conditions are not met (e.g., AI's turn), hide hint
      if (showHint) {
        setShowHint(false);
        setHintMove(null);
      }
      return;
    }

    // If hint is already shown, hide it (toggle functionality)
    if (showHint) {
      setShowHint(false);
      setHintMove(null);
      return;
    }

    // Cannot show hint if no valid moves
    if (validMoves.length === 0) {
      // TODO: Replace with custom modal
      alert("No moves available."); // No moves available
      return;
    }

    // Calculate the best move
    const [bestX, bestY] = minimax(
      board,
      aiDepth,
      true, // AI always tries to maximize its own score
      currentPlayer,
      -Infinity,
      Infinity
    );

    if (bestX !== -1 && bestY !== -1) {
      setHintMove([bestX, bestY]);
      setShowHint(true);
      // No automatic hiding
    } else {
      // TODO: Replace with custom modal
      alert("Could not calculate optimal move."); // Could not calculate optimal move
    }
  }, [
    board,
    currentPlayer,
    firstPlayerType,
    secondPlayerType,
    aiDepth,
    validMoves,
    isProcessingAIMove,
    gameResult,
    showHint,
  ]);

  // Function to generate Kifu (game record) data
  const generateKifuData = () => {
    const kifuData: { move: number; player: string; coordinate: string }[] = [];
    // Display kifu up to `currentMove` only
    for (let i = 1; i <= currentMove; i++) {
      const moveRecord = history[i]; // State after the i-th move
      const playerWhoMoved = history[i - 1].player; // Player who made the i-th move

      let symbol = "";
      if (darkMode) {
        symbol = playerWhoMoved === "black" ? "◯" : "●"; // Circle for black in dark mode
      } else {
        symbol = playerWhoMoved === "black" ? "●" : "◯"; // Filled circle for black in light mode
      }

      let playerText = `${symbol} ${playerWhoMoved === "black" ? "Black" : "White"}`; // Black / White
      let coordinateText = "-";

      if (moveRecord.movePos) {
        // If a stone was actually placed
        coordinateText = `${String.fromCharCode(65 + moveRecord.movePos[0])}${
          moveRecord.movePos[1] + 1
        }`;
      } else {
        // If it was a pass
        playerText = `${playerText}(P)`; // Indicate pass with (P)
      }

      kifuData.push({
        move: i,
        player: playerText,
        coordinate: coordinateText,
      });
    }
    return kifuData;
  };

  const kifuData = generateKifuData();
  const blackCount = countStones("black");
  const whiteCount = countStones("white");

  // Determine if the current player is human (for UI hints)
  const isHumanPlayerUI =
    (currentPlayer === "black" && firstPlayerType === "human") ||
    (currentPlayer === "white" && secondPlayerType === "human");

  // Message indicating whose turn it is
  const turnMessage = (() => {
    if (gameResult) return ""; // Do not display message if game has ended
    const playerColor = currentPlayer === "black" ? "Black" : "White"; // Black / White

    if (currentPlayer === "black") {
      return `${
        firstPlayerType === "human" ? "1P" : "AI"
      }'s Turn (${playerColor})`; // 1P's turn (Black) / AI's turn (Black)
    } else {
      return `${
        secondPlayerType === "human" ? "2P" : "AI"
      }'s Turn (${playerColor})`; // 2P's turn (White) / AI's turn (White)
    }
  })();

  return (
    <div className={`othello ${darkMode ? "dark" : "light"}`}>
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%', maxWidth: '800px' }}>
        <h2>Reversi</h2>
        <span style={{ fontSize: '0.9em', marginLeft: 'auto', marginRight: '10px' }}>v1.1</span> {/* Version display change */}
      </div>

      {/* Container for control buttons and mode settings */}
      <div className="controls-container">
        <div className="controls-top-left">
          {" "}
          {/* Left group of controls */}
          <button
            onClick={() => {
              setHistory([
                {
                  board: initialBoard(),
                  player: "black",
                  movePos: null,
                  isAIMove: false,
                },
              ]);
              setCurrentMove(0);
              setGameResult("");
              // Clear hint on reset
              setShowHint(false);
              setHintMove(null);
              setIsProcessingAIMove(false); // Reset AI processing flag on reset
            }}
          >
            Reset
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="dark-mode-button"
          >
            {darkMode ? "Light Mode" : "Dark Mode"}{" "}
            {/* Light mode / Dark mode */}
          </button>
        </div>
        <div className="controls-top-right">
          {" "}
          {/* Right group of controls */}
          <button
            disabled={currentMove <= 0 || isProcessingAIMove} // Disable if at initial board or AI is processing
            onClick={handleUndo}
          >
            Undo {/* Back */}
          </button>
          <button
            disabled={currentMove >= history.length - 1 || isProcessingAIMove} // Disable if at end of history or AI is processing
            onClick={handleRedo}
          >
            Redo {/* Forward */}
          </button>
        </div>
      </div>

      {/* Container for board and info panel */}
      <div className="game-area-container">
        {/* Wrapper for board and coordinates */}
        <div className="board-and-coords-wrapper">
          {/* Top-left empty corner space */}
          <div className="coord-corner-space"></div>
          {/* Horizontal coordinate labels (A-H) */}
          <div className="coord-header-labels">
            {"ABCDEFGH".split("").map((char) => (
              <div key={char} className="coord-axis-label">
                {char}
              </div>
            ))}
          </div>

          {/* Vertical coordinate labels (1-8) and actual board */}
          <div className="coord-side-labels">
            {"12345678".split("").map((num) => (
              <div key={num} className="coord-axis-label">
                {num}
              </div>
            ))}
          </div>

          {/* Entire board grid (thick outer border and shadow) */}
          <div className="board-grid-container">
            {/* Inner padding for board cells */}
            <div className="board-inner-padding">
              {board.map((row, y) => row.map((cell, x) => {
                    // Determine if it's a valid move
                    const isValid = validMoves.some(
                      ([vx, vy]) => vx === x && vy === y
                    );
                    // Determine if the current cell is being animated (flipped)
                    const isFlipping = flippedStones.some(
                      ([fx, fy]) => fx === x && fy === y
                    );
                    // Determine if the current cell is displayed as a hint
                    const isHint =
                      showHint &&
                      hintMove &&
                      hintMove[0] === x && hintMove[1] === y;

                    return (
                      <div
                        key={x}
                        className={`cell ${
                          isValid && isHumanPlayerUI && !isHint
                            ? "valid-move"
                            : ""
                        } ${isHint ? "hint-move" : ""}`}
                        onClick={() => handleClick(x, y)}
                      >
                        {/* Stone display */}
                        {cell && (
                          <div
                            className={`disc ${cell} ${
                              isFlipping ? "flipping" : ""
                            }`}
                          />
                        )}
                        {/* Valid move hint display - only for human player's turn */}
                        {!cell && isValid && isHumanPlayerUI && (
                          <div className="hint" />
                        )}{" "}
                        {/* Adjust to not overlap with hint */}
                      </div>
                    );})
              )}
            </div>
          </div>
        </div>

        {/* Right info panel */}
        <div className="info-panel">
          {/* Mode selection, AI difficulty, Hint button */}
          <div className="game-settings">
            <div className="player-select-group">
              First Player: {/* First player */}
              <select
                value={firstPlayerType}
                onChange={(e) =>
                  setFirstPlayerType(e.target.value as "human" | "ai")
                }
              >
                <option value="human">Human</option> {/* Human */}
                <option value="ai">AI</option>
              </select>
            </div>
            <div className="player-select-group">
              Second Player: {/* Second player */}
              <select
                value={secondPlayerType}
                onChange={(e) =>
                  setSecondPlayerType(e.target.value as "human" | "ai")
                }
              >
                <option value="human">Human</option> {/* Human */}
                <option value="ai">AI</option>
              </select>
            </div>
            {/* Display difficulty only if AI is involved in any mode */}
            {(firstPlayerType === "ai" || secondPlayerType === "ai") && (
              <div className="difficulty-select-group">
                Difficulty: {/* Difficulty */}
                <select
                  value={aiDepth}
                  onChange={(e) => setAiDepth(Number(e.target.value))}
                >
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Hint button moved here */}
            <button
              onClick={handleHint}
              disabled={
                !isHumanPlayerUI || isProcessingAIMove || gameResult !== ""
              } // Disable if not human player's turn, AI processing, or game ended
              className="hint-button"
            >
              Hint {/* Hint */}
            </button>
          </div>
          {/* Stone count display and turn message */}
          <div className="status-display">
            <div className="turn-message">{turnMessage}</div>
            <div className="stone-counts">
              Black: {blackCount} White: {whiteCount}{" "}
              {/* Black: [count] White: [count] */}
            </div>
          </div>
          <audio ref={audioRef} src={flipSoundSrc} /> {/* Sound effect */}
          {/* Kifu title and game result */}
          <h3>Game Record</h3> {/* Kifu */}
          {gameResult && (
            <div className="game-result">
              Result: {gameResult} (White {whiteCount} : Black {blackCount}){" "}
              {/* Result: [result] (White [count] : Black [count]) */}
            </div>
          )}
          {/* Kifu display (single table) */}
          <div className="kifu-container">
            <table className="kifu-table">
              <thead>
                <tr>
                  <th>Move</th> {/* Move */}
                  <th>Player</th> {/* Player */}
                  <th>Coord.</th> {/* Coordinate */}
                </tr>
              </thead>
              <tbody>
                {kifuData.map((entry, idx) => (
                  <tr key={idx}>
                    <td>{entry.move}</td>
                    <td>{entry.player}</td>
                    <td>{entry.coordinate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}