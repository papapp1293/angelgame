import type { WorkerRequest, WorkerResponse, SparseGrid } from "./types";
import { computeAngelMove } from "./angel-strategy";
import type { GameState } from "./types";

/**
 * Web Worker entry point.
 * Receives serialized game state, runs the AI strategy, returns the best move.
 */
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  if (req.type !== "compute-move") return;

  // Reconstruct the sparse grid from serialized entries
  const grid: SparseGrid = new Map(req.grid);

  const state: GameState = {
    grid,
    angelPos: req.angelPos,
    angelPower: req.angelPower,
    turnNumber: req.turnNumber,
    moveHistory: [],
    phase: "angel-thinking",
  };

  // Determine lookahead depth based on turn progression
  // Early game: deeper lookahead is cheap (few blocks).
  // Late game: keep depth low to stay fast.
  const blockCount = grid.size;
  const lookaheadDepth = blockCount < 15 ? 2 : blockCount < 40 ? 1 : 0;

  const { move, reasoning } = computeAngelMove(state, lookaheadDepth);

  const response: WorkerResponse = {
    type: "move-result",
    move,
    reasoning,
  };

  self.postMessage(response);
};
