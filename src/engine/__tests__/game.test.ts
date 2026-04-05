import { describe, it, expect } from "vitest";
import {
  initGame,
  applyDevilMove,
  applyAngelMove,
  getValidAngelMoves,
  checkWinCondition,
} from "../game";
import { blockCell } from "../grid";
import type { GameState } from "../types";

describe("initGame", () => {
  it("creates initial state at origin", () => {
    const state = initGame(2);
    expect(state.angelPos).toEqual({ x: 0, y: 0 });
    expect(state.angelPower).toBe(2);
    expect(state.turnNumber).toBe(0);
    expect(state.phase).toBe("devil-turn");
    expect(state.grid.size).toBe(0);
    expect(state.moveHistory).toHaveLength(0);
  });
});

describe("applyDevilMove", () => {
  it("blocks a cell and transitions to angel-thinking", () => {
    const state = initGame(2);
    const next = applyDevilMove(state, { x: 3, y: 3 });
    expect(next.phase).toBe("angel-thinking");
    expect(next.grid.size).toBe(1);
  });

  it("throws if blocking angel's cell", () => {
    const state = initGame(2);
    expect(() => applyDevilMove(state, { x: 0, y: 0 })).toThrow(
      "Cannot block the angel's cell"
    );
  });

  it("throws if cell already blocked", () => {
    const state = initGame(2);
    const next = applyDevilMove(state, { x: 1, y: 1 });
    const afterAngel = applyAngelMove(next, { x: 1, y: 0 });
    expect(() => applyDevilMove(afterAngel, { x: 1, y: 1 })).toThrow(
      "already blocked"
    );
  });

  it("throws during wrong phase", () => {
    const state = initGame(2);
    const next = applyDevilMove(state, { x: 1, y: 1 });
    expect(() => applyDevilMove(next, { x: 2, y: 2 })).toThrow(
      "Cannot apply devil move during phase"
    );
  });
});

describe("applyAngelMove", () => {
  it("moves angel within power range", () => {
    const state = initGame(2);
    const afterDevil = applyDevilMove(state, { x: 5, y: 5 });
    const next = applyAngelMove(afterDevil, { x: 2, y: 1 });
    expect(next.angelPos).toEqual({ x: 2, y: 1 });
    expect(next.phase).toBe("devil-turn");
    expect(next.turnNumber).toBe(1);
    expect(next.moveHistory).toHaveLength(1);
  });

  it("throws if move exceeds power", () => {
    const state = initGame(2);
    const afterDevil = applyDevilMove(state, { x: 5, y: 5 });
    expect(() => applyAngelMove(afterDevil, { x: 3, y: 3 })).toThrow(
      "exceeds angel power"
    );
  });

  it("throws if moving to blocked cell", () => {
    const state = initGame(2);
    const afterDevil = applyDevilMove(state, { x: 1, y: 1 });
    expect(() => applyAngelMove(afterDevil, { x: 1, y: 1 })).toThrow(
      "blocked cell"
    );
  });

  it("throws if angel stays in same cell", () => {
    const state = initGame(2);
    const afterDevil = applyDevilMove(state, { x: 5, y: 5 });
    expect(() => applyAngelMove(afterDevil, { x: 0, y: 0 })).toThrow(
      "must move to a different cell"
    );
  });
});

describe("getValidAngelMoves", () => {
  it("returns all reachable non-blocked cells excluding current", () => {
    const state = initGame(1);
    const moves = getValidAngelMoves(state);
    // k=1: 9 cells in range minus the angel's own cell = 8
    expect(moves).toHaveLength(8);
  });

  it("excludes blocked cells", () => {
    let state = initGame(1);
    state = applyDevilMove(state, { x: 1, y: 0 });
    const moves = getValidAngelMoves(state);
    expect(moves).toHaveLength(7);
    expect(moves).not.toContainEqual({ x: 1, y: 0 });
  });
});

describe("checkWinCondition / devil wins by trapping k=1 angel", () => {
  it("detects devil win when angel is fully surrounded", () => {
    let state = initGame(1);

    // Surround the angel at origin — block all 8 neighbors
    // We need to alternate devil/angel moves, moving angel away then resetting
    // Simpler: manually build a trapped state
    const neighbors = [
      { x: -1, y: -1 },
      { x: -1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: 1, y: -1 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];

    // Build state with all neighbors blocked manually
    let grid = state.grid;
    for (const n of neighbors) {
      grid = blockCell(grid, n);
    }

    const trappedState: GameState = {
      ...state,
      grid,
      phase: "angel-thinking",
    };

    expect(getValidAngelMoves(trappedState)).toHaveLength(0);
    expect(checkWinCondition(trappedState)).toBe("devil-wins");
  });

  it("returns null when angel has moves", () => {
    const state = initGame(2);
    expect(checkWinCondition(state)).toBeNull();
  });

  it("devil wins via applyDevilMove when last move traps angel", () => {
    let state = initGame(1);

    // Block 7 of 8 neighbors manually
    const neighbors = [
      { x: -1, y: -1 },
      { x: -1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: 1, y: -1 },
      { x: 1, y: 0 },
      // { x: 1, y: 1 } — leave one open
    ];

    let grid = state.grid;
    for (const n of neighbors) {
      grid = blockCell(grid, n);
    }

    const almostTrapped: GameState = {
      ...state,
      grid,
      phase: "devil-turn",
    };

    // Block the last neighbor
    const result = applyDevilMove(almostTrapped, { x: 1, y: 1 });
    expect(result.phase).toBe("devil-wins");
  });
});

describe("multi-turn game flow", () => {
  it("plays through 3 turns", () => {
    let state = initGame(2);
    expect(state.phase).toBe("devil-turn");

    // Turn 1
    state = applyDevilMove(state, { x: 3, y: 3 });
    expect(state.phase).toBe("angel-thinking");
    state = applyAngelMove(state, { x: 1, y: 1 });
    expect(state.phase).toBe("devil-turn");
    expect(state.turnNumber).toBe(1);

    // Turn 2
    state = applyDevilMove(state, { x: -2, y: -2 });
    state = applyAngelMove(state, { x: 2, y: 2 });
    expect(state.turnNumber).toBe(2);

    // Turn 3
    state = applyDevilMove(state, { x: 0, y: 0 });
    state = applyAngelMove(state, { x: 4, y: 3 });
    expect(state.turnNumber).toBe(3);
    expect(state.moveHistory).toHaveLength(3);
  });
});
