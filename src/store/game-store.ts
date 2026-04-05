import { create } from "zustand";
import type { Coord, GameState, AngelReasoning, Difficulty } from "@/engine/types";
import {
  initGame,
  applyDevilMove,
  applyAngelMove,
  getValidAngelMoves,
} from "@/engine/game";
import { DEFAULT_ANGEL_POWER } from "@/lib/constants";

interface GameStore extends GameState {
  reasoning: AngelReasoning | null;
  difficulty: Difficulty;

  // Actions
  devilMove: (coord: Coord) => void;
  angelMove: (coord: Coord, reasoning?: AngelReasoning) => void;
  resetGame: (angelPower?: number) => void;
  setAngelPower: (k: number) => void;
  setDifficulty: (d: Difficulty) => void;

  // Derived
  getValidAngelMoves: () => Coord[];
  isGameOver: () => boolean;
}

export const useGameStore = create<GameStore>((set, get) => {
  const initial = initGame(DEFAULT_ANGEL_POWER);

  return {
    ...initial,
    reasoning: null,
    difficulty: "medium" as Difficulty,

    devilMove: (coord: Coord) => {
      const state = get();
      const gameState: GameState = {
        grid: state.grid,
        angelPos: state.angelPos,
        angelPower: state.angelPower,
        turnNumber: state.turnNumber,
        moveHistory: state.moveHistory,
        phase: state.phase,
      };
      const next = applyDevilMove(gameState, coord);
      set({
        grid: next.grid,
        angelPos: next.angelPos,
        angelPower: next.angelPower,
        turnNumber: next.turnNumber,
        moveHistory: next.moveHistory,
        phase: next.phase,
      });
    },

    angelMove: (coord: Coord, reasoning?: AngelReasoning) => {
      const state = get();
      const gameState: GameState = {
        grid: state.grid,
        angelPos: state.angelPos,
        angelPower: state.angelPower,
        turnNumber: state.turnNumber,
        moveHistory: state.moveHistory,
        phase: state.phase,
      };
      const next = applyAngelMove(gameState, coord);
      set({
        grid: next.grid,
        angelPos: next.angelPos,
        angelPower: next.angelPower,
        turnNumber: next.turnNumber,
        moveHistory: next.moveHistory,
        phase: next.phase,
        reasoning: reasoning ?? null,
      });
    },

    resetGame: (angelPower?: number) => {
      const next = initGame(angelPower ?? get().angelPower);
      set({
        ...next,
        reasoning: null,
      });
    },

    setAngelPower: (k: number) => {
      const next = initGame(k);
      set({
        ...next,
        reasoning: null,
      });
    },

    setDifficulty: (d: Difficulty) => {
      set({ difficulty: d });
    },

    getValidAngelMoves: () => {
      const state = get();
      return getValidAngelMoves({
        grid: state.grid,
        angelPos: state.angelPos,
        angelPower: state.angelPower,
        turnNumber: state.turnNumber,
        moveHistory: state.moveHistory,
        phase: state.phase,
      });
    },

    isGameOver: () => {
      return get().phase === "devil-wins";
    },
  };
});
