import type { Coord, GameState } from "./types";
import { createGrid, blockCell, isBlocked } from "./grid";
import { coordKey, chebyshevDistance, coordsInRange } from "@/lib/math";
import { DEFAULT_ANGEL_POWER, GAME } from "@/lib/constants";

export function initGame(angelPower: number = DEFAULT_ANGEL_POWER): GameState {
  return {
    grid: createGrid(),
    angelPos: { x: 0, y: 0 },
    angelPower,
    turnNumber: 0,
    moveHistory: [],
    phase: "devil-turn",
  };
}

export function getValidAngelMoves(state: GameState): Coord[] {
  const candidates = coordsInRange(state.angelPos, state.angelPower);
  return candidates.filter(
    (c) =>
      !isBlocked(state.grid, c) &&
      !(c.x === state.angelPos.x && c.y === state.angelPos.y)
  );
}

export function getValidDevilTargets(state: GameState): (coord: Coord) => boolean {
  return (coord: Coord) => {
    if (isBlocked(state.grid, coord)) return false;
    if (coord.x === state.angelPos.x && coord.y === state.angelPos.y) return false;
    return true;
  };
}

export function applyDevilMove(state: GameState, coord: Coord): GameState {
  if (state.phase !== "devil-turn") {
    throw new Error(`Cannot apply devil move during phase: ${state.phase}`);
  }
  if (isBlocked(state.grid, coord)) {
    throw new Error(`Cell ${coordKey(coord)} is already blocked`);
  }
  if (coord.x === state.angelPos.x && coord.y === state.angelPos.y) {
    throw new Error("Cannot block the angel's cell");
  }

  const newGrid = blockCell(state.grid, coord);
  const nextState: GameState = {
    ...state,
    grid: newGrid,
    phase: "angel-thinking",
  };

  // Check if angel is now trapped
  if (getValidAngelMoves(nextState).length === 0) {
    return {
      ...nextState,
      phase: "devil-wins",
    };
  }

  return nextState;
}

export function applyAngelMove(state: GameState, coord: Coord): GameState {
  if (state.phase !== "angel-thinking" && state.phase !== "angel-moved") {
    throw new Error(`Cannot apply angel move during phase: ${state.phase}`);
  }

  const distance = chebyshevDistance(state.angelPos, coord);
  if (distance === 0) {
    throw new Error("Angel must move to a different cell");
  }
  if (distance > state.angelPower) {
    throw new Error(
      `Move distance ${distance} exceeds angel power ${state.angelPower}`
    );
  }
  if (isBlocked(state.grid, coord)) {
    throw new Error(`Cannot move to blocked cell ${coordKey(coord)}`);
  }

  const nextTurn = state.turnNumber + 1;
  const newHistory = [
    ...state.moveHistory,
    {
      devil: getLastDevilMove(state) ?? { x: 0, y: 0 },
      angel: coord,
    },
  ];

  // Cap history to prevent unbounded growth
  if (newHistory.length > GAME.maxPathRender) {
    newHistory.splice(0, newHistory.length - GAME.maxPathRender);
  }

  // Angel survives turn limit — angel wins
  if (nextTurn >= GAME.defaultTurnLimit) {
    return {
      ...state,
      angelPos: coord,
      turnNumber: nextTurn,
      moveHistory: newHistory,
      phase: "angel-wins",
    };
  }

  return {
    ...state,
    angelPos: coord,
    turnNumber: nextTurn,
    moveHistory: newHistory,
    phase: "devil-turn",
  };
}

function getLastDevilMove(state: GameState): Coord | null {
  // The last blocked cell added is the devil's most recent move
  const blocked = [...state.grid.keys()];
  if (blocked.length === 0) return null;
  const key = blocked[blocked.length - 1];
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

export function checkWinCondition(state: GameState): "devil-wins" | "angel-wins" | null {
  if (state.phase === "devil-wins") return "devil-wins";
  if (state.phase === "angel-wins") return "angel-wins";
  if (
    state.phase === "angel-thinking" &&
    getValidAngelMoves(state).length === 0
  ) {
    return "devil-wins";
  }
  if (state.turnNumber >= GAME.defaultTurnLimit) {
    return "angel-wins";
  }
  return null;
}
