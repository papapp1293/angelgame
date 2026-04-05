export type Coord = {
  x: number;
  y: number;
};

export type CellState = "blocked";

/** Sparse grid: only blocked cells are stored. Keys are "x,y" strings. */
export type SparseGrid = Map<string, CellState>;

export type GamePhase =
  | "idle"
  | "devil-turn"
  | "angel-thinking"
  | "angel-moved"
  | "devil-wins"
  | "angel-wins";

export interface MoveRecord {
  angel: Coord;
  devil: Coord;
}

export interface GameState {
  grid: SparseGrid;
  angelPos: Coord;
  angelPower: number;
  turnNumber: number;
  moveHistory: MoveRecord[];
  phase: GamePhase;
}

export interface AngelReasoning {
  escapeVector: Coord;
  candidates: { coord: Coord; score: number }[];
  dangerMap: { coord: Coord; danger: number }[];
  lookaheadDepth: number;
  computeTimeMs: number;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface WorkerRequest {
  type: "compute-move";
  grid: [string, CellState][];
  angelPos: Coord;
  angelPower: number;
  turnNumber: number;
  difficulty: Difficulty;
}

export interface WorkerResponse {
  type: "move-result";
  move: Coord;
  reasoning: AngelReasoning;
}
