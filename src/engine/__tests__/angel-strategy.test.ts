import { describe, it, expect } from "vitest";
import {
  computeEscapeVector,
  scoreCandidate,
  computeAngelMove,
} from "../angel-strategy";
import { createGrid, blockCell } from "../grid";
import { initGame, applyDevilMove } from "../game";
import type { GameState } from "../types";

/** Helper: compute centroid from grid (mirrors internal logic). */
function centroidOf(grid: GameState["grid"]): { x: number; y: number } | null {
  if (grid.size === 0) return null;
  let cx = 0, cy = 0;
  for (const key of grid.keys()) {
    const [x, y] = key.split(",").map(Number);
    cx += x; cy += y;
  }
  return { x: cx / grid.size, y: cy / grid.size };
}

describe("computeEscapeVector", () => {
  it("returns a default direction on an empty grid", () => {
    const vec = computeEscapeVector(null, { x: 0, y: 0 });
    expect(vec.x).toBe(1);
    expect(vec.y).toBe(0);
  });

  it("points away from a single blocked cell", () => {
    let grid = createGrid();
    grid = blockCell(grid, { x: -3, y: 0 }); // block to the left

    const vec = computeEscapeVector(centroidOf(grid), { x: 0, y: 0 });
    // Should point right (away from the block)
    expect(vec.x).toBeGreaterThan(0);
  });

  it("points away from the centroid of multiple blocks", () => {
    let grid = createGrid();
    // Block a cluster below the angel
    grid = blockCell(grid, { x: 0, y: -3 });
    grid = blockCell(grid, { x: 1, y: -3 });
    grid = blockCell(grid, { x: -1, y: -4 });

    const vec = computeEscapeVector(centroidOf(grid), { x: 0, y: 0 });
    // Centroid is below, so escape should point upward (positive y)
    expect(vec.y).toBeGreaterThan(0);
  });

  it("returns a fallback when angel is on the centroid", () => {
    let grid = createGrid();
    // Symmetric blocks that average to (0,0)
    grid = blockCell(grid, { x: 1, y: 0 });
    grid = blockCell(grid, { x: -1, y: 0 });

    const vec = computeEscapeVector(centroidOf(grid), { x: 0, y: 0 });
    // Should return fallback direction, not zero
    expect(vec.x !== 0 || vec.y !== 0).toBe(true);
  });
});

describe("scoreCandidate", () => {
  it("prefers cells aligned with escape vector", () => {
    const grid = createGrid();
    const angelPos = { x: 0, y: 0 };
    const escapeVector = { x: 1, y: 0 }; // escape right
    const ctx = { escapeVector, centroid: null };

    const scoreRight = scoreCandidate(grid, angelPos, { x: 2, y: 0 }, ctx, 2);
    const scoreLeft = scoreCandidate(grid, angelPos, { x: -2, y: 0 }, ctx, 2);

    expect(scoreRight).toBeGreaterThan(scoreLeft);
  });

  it("penalizes cells near blocked clusters", () => {
    let grid = createGrid();
    grid = blockCell(grid, { x: 3, y: 0 });
    grid = blockCell(grid, { x: 3, y: 1 });
    grid = blockCell(grid, { x: 3, y: -1 });

    const angelPos = { x: 0, y: 0 };
    const escapeVector = { x: 0, y: 1 }; // escape up (neutral for left/right)
    const ctx = { escapeVector, centroid: centroidOf(grid) };

    const scoreNearBlocks = scoreCandidate(grid, angelPos, { x: 2, y: 0 }, ctx, 2);
    const scoreFarFromBlocks = scoreCandidate(grid, angelPos, { x: -2, y: 0 }, ctx, 2);

    expect(scoreFarFromBlocks).toBeGreaterThan(scoreNearBlocks);
  });

  it("values freedom (open space) higher", () => {
    let grid = createGrid();
    // Create a partial enclosure on one side
    for (let y = -3; y <= 3; y++) {
      grid = blockCell(grid, { x: 3, y });
    }

    const angelPos = { x: 0, y: 0 };
    const escapeVector = { x: 0, y: 1 };
    const ctx = { escapeVector, centroid: centroidOf(grid) };

    // Moving away from wall vs toward wall
    const awayScore = scoreCandidate(grid, angelPos, { x: -2, y: 0 }, ctx, 2);
    const towardScore = scoreCandidate(grid, angelPos, { x: 2, y: 0 }, ctx, 2);

    expect(awayScore).toBeGreaterThan(towardScore);
  });
});

describe("computeAngelMove", () => {
  it("returns a valid move on a fresh game", () => {
    const state = initGame(2);
    // Need to be in angel-thinking phase
    const afterDevil = applyDevilMove(state, { x: 5, y: 5 });

    const { move, reasoning } = computeAngelMove(afterDevil, 0);

    // Move should be within power
    const dx = Math.abs(move.x - afterDevil.angelPos.x);
    const dy = Math.abs(move.y - afterDevil.angelPos.y);
    expect(Math.max(dx, dy)).toBeLessThanOrEqual(2);
    expect(Math.max(dx, dy)).toBeGreaterThan(0);

    // Reasoning should be populated
    expect(reasoning.escapeVector).toBeDefined();
    expect(reasoning.candidates.length).toBeGreaterThan(0);
    expect(reasoning.dangerMap.length).toBeGreaterThan(0);
    expect(reasoning.computeTimeMs).toBeGreaterThanOrEqual(0);
    expect(reasoning.lookaheadDepth).toBe(0);
  });

  it("flees away from blocked cells", () => {
    let state = initGame(2);
    // Block cells to the right
    state = applyDevilMove(state, { x: 3, y: 0 });
    // Manually set phase for next test moves
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: 3, y: 1 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: 3, y: -1 });

    const { move } = computeAngelMove(state, 0);

    // Angel should prefer moving left (away from the blocked wall)
    expect(move.x).toBeLessThanOrEqual(0);
  });

  it("avoids trapped positions", () => {
    let state = initGame(1); // Power 1 for simplicity
    // Create a near-trap: block all but one exit
    state = applyDevilMove(state, { x: -1, y: -1 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: -1, y: 0 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: -1, y: 1 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: 0, y: -1 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: 0, y: 1 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: 1, y: -1 });
    // Exits: (1,0) and (1,1) remain open

    const { move } = computeAngelMove(state, 0);

    // Should pick one of the open cells
    const isOpen =
      (move.x === 1 && move.y === 0) || (move.x === 1 && move.y === 1);
    expect(isOpen).toBe(true);
  });

  it("works with lookahead depth 1", () => {
    const state = initGame(2);
    const afterDevil = applyDevilMove(state, { x: 5, y: 5 });

    const { move, reasoning } = computeAngelMove(afterDevil, 1);

    expect(reasoning.lookaheadDepth).toBe(1);
    const dx = Math.abs(move.x - afterDevil.angelPos.x);
    const dy = Math.abs(move.y - afterDevil.angelPos.y);
    expect(Math.max(dx, dy)).toBeLessThanOrEqual(2);
    expect(Math.max(dx, dy)).toBeGreaterThan(0);
  });

  it("populates reasoning with candidates and danger map", () => {
    const state = initGame(2);
    const afterDevil = applyDevilMove(state, { x: 3, y: 3 });

    const { reasoning } = computeAngelMove(afterDevil, 0);

    // Candidates should be sorted by score descending
    for (let i = 1; i < reasoning.candidates.length; i++) {
      expect(reasoning.candidates[i - 1].score).toBeGreaterThanOrEqual(
        reasoning.candidates[i].score
      );
    }

    // Danger map should have entries
    expect(reasoning.dangerMap.length).toBeGreaterThan(0);
    for (const entry of reasoning.dangerMap) {
      expect(typeof entry.danger).toBe("number");
    }
  });

  it("throws when no valid moves exist", () => {
    let state = initGame(1);
    // Surround angel completely
    state = applyDevilMove(state, { x: -1, y: -1 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: -1, y: 0 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: -1, y: 1 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: 0, y: -1 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: 0, y: 1 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: 1, y: -1 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: 1, y: 0 });
    state = { ...state, phase: "devil-turn" as const };
    state = applyDevilMove(state, { x: 1, y: 1 });

    // Game should be in devil-wins phase, but if we force angel-thinking:
    const forcedState = { ...state, phase: "angel-thinking" as const };
    expect(() => computeAngelMove(forcedState, 0)).toThrow("No valid moves");
  });
});
