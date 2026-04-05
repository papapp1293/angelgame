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

  // Base depth from difficulty setting
  const depthByDifficulty = { easy: 0, medium: 1, hard: 2 } as const;
  const baseDepth = depthByDifficulty[req.difficulty ?? "medium"];

  // Scale down in late game to stay fast
  const blockCount = grid.size;
  const lookaheadDepth = blockCount >= 40 ? Math.min(baseDepth, 0)
    : blockCount >= 15 ? Math.min(baseDepth, 1)
    : baseDepth;

  const { move, reasoning } = computeAngelMove(state, lookaheadDepth);

  const response: WorkerResponse = {
    type: "move-result",
    move,
    reasoning,
  };

  self.postMessage(response);
};
