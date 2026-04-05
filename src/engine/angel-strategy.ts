import type { Coord, GameState, AngelReasoning } from "./types";
import { isBlocked, getBlockedCells, countBlockedInRange } from "./grid";
import { getValidAngelMoves, applyAngelMove, applyDevilMove } from "./game";
import { computeDangerMap, floodFillFreedom } from "./danger-map";
import {
  subtractCoords,
  normalizeVector,
  dotProduct,
  chebyshevDistance,
  magnitude,
} from "@/lib/math";
import { GAME } from "@/lib/constants";

interface ScoredMove {
  coord: Coord;
  score: number;
}

/**
 * Compute the escape vector: direction away from the centroid of all blocked cells.
 * If no cells are blocked, defaults to moving away from origin (or {1,0} as fallback).
 */
export function computeEscapeVector(
  grid: GameState["grid"],
  angelPos: Coord
): Coord {
  const blocked = getBlockedCells(grid);
  if (blocked.length === 0) {
    // No blocks yet — any direction is fine
    return { x: 1, y: 0 };
  }

  // Compute centroid of blocked cells
  let cx = 0;
  let cy = 0;
  for (const b of blocked) {
    cx += b.x;
    cy += b.y;
  }
  cx /= blocked.length;
  cy /= blocked.length;

  const centroid = { x: cx, y: cy };
  const away = subtractCoords(angelPos, centroid);

  // If angel is exactly on the centroid, pick a direction based on closest block
  if (away.x === 0 && away.y === 0) {
    return { x: 1, y: 0 };
  }

  return normalizeVector(away);
}

/**
 * Score a candidate move. Higher score = better for the angel.
 *
 * Factors:
 * 1. Escape alignment: how well the move aligns with the escape vector
 * 2. Freedom: flood-fill reachable cells from destination
 * 3. Low local danger: fewer blocked neighbors
 * 4. Distance from blocked centroid
 */
export function scoreCandidate(
  grid: GameState["grid"],
  angelPos: Coord,
  candidate: Coord,
  escapeVector: Coord,
  angelPower: number
): number {
  // 1. Escape alignment (dot product of move direction with escape vector)
  const moveDir = subtractCoords(candidate, angelPos);
  const moveDirNorm = normalizeVector(moveDir);
  const alignment = dotProduct(moveDirNorm, escapeVector);

  // 2. Freedom score (flood fill within a radius)
  const freedom = floodFillFreedom(grid, candidate, angelPower + 2);
  const maxFreedom = (2 * (angelPower + 2) + 1) ** 2;
  const freedomRatio = freedom / maxFreedom;

  // 3. Local danger (blocked cells in immediate neighborhood)
  const localBlocked = countBlockedInRange(grid, candidate, 1);

  // 4. Distance from blocked centroid
  const blocked = getBlockedCells(grid);
  let centroidDist = 0;
  if (blocked.length > 0) {
    let cx = 0, cy = 0;
    for (const b of blocked) { cx += b.x; cy += b.y; }
    cx /= blocked.length;
    cy /= blocked.length;
    centroidDist = magnitude(subtractCoords(candidate, { x: cx, y: cy }));
  }

  // Weighted combination
  return (
    alignment * 4.0 +
    freedomRatio * 10.0 +
    -localBlocked * 3.0 +
    centroidDist * 0.5
  );
}

/**
 * Minimax lookahead: simulate devil placing the worst block, angel responding optimally.
 * Returns the worst-case score for the angel from this position.
 */
function minimax(
  state: GameState,
  escapeVector: Coord,
  depth: number,
  isDevilTurn: boolean
): number {
  if (depth === 0 || state.phase === "devil-wins") {
    if (state.phase === "devil-wins") return -1000;
    // Evaluate current angel position
    return scoreCandidate(
      state.grid,
      state.angelPos,
      state.angelPos,
      escapeVector,
      state.angelPower
    );
  }

  if (isDevilTurn) {
    // Devil picks the move that minimizes angel's score
    // Only consider nearby cells to keep computation tractable
    const angelMoves = getValidAngelMoves(state);
    if (angelMoves.length === 0) return -1000;

    // Devil blocks near the angel to be strategically relevant
    const devilCandidates: Coord[] = [];
    const r = state.angelPower + 2;
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const coord = { x: state.angelPos.x + dx, y: state.angelPos.y + dy };
        if (!isBlocked(state.grid, coord) &&
            !(coord.x === state.angelPos.x && coord.y === state.angelPos.y)) {
          devilCandidates.push(coord);
        }
      }
    }

    // Sample devil moves to keep it tractable (worst of top threats)
    const sample = devilCandidates.slice(0, 12);
    let worstScore = Infinity;

    for (const devilMove of sample) {
      try {
        const nextState = applyDevilMove(
          { ...state, phase: "devil-turn" },
          devilMove
        );
        const score = minimax(nextState, escapeVector, depth - 1, false);
        worstScore = Math.min(worstScore, score);
      } catch {
        continue; // Invalid move, skip
      }
    }

    return worstScore === Infinity ? 0 : worstScore;
  } else {
    // Angel picks the best move
    const moves = getValidAngelMoves(state);
    if (moves.length === 0) return -1000;

    let bestScore = -Infinity;
    // Only evaluate top 5 candidates by static score
    const scored = moves
      .map((m) => ({
        coord: m,
        score: scoreCandidate(state.grid, state.angelPos, m, escapeVector, state.angelPower),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const { coord } of scored) {
      try {
        const nextState = applyAngelMove(
          { ...state, phase: "angel-thinking" },
          coord
        );
        const score = minimax(nextState, escapeVector, depth - 1, true);
        bestScore = Math.max(bestScore, score);
      } catch {
        continue;
      }
    }

    return bestScore === -Infinity ? 0 : bestScore;
  }
}

/**
 * Main entry point: compute the best angel move given the current game state.
 */
export function computeAngelMove(
  state: GameState,
  lookaheadDepth: number = GAME.lookaheadDepthMedium
): { move: Coord; reasoning: AngelReasoning } {
  const startTime = performance.now();

  const escapeVector = computeEscapeVector(state.grid, state.angelPos);
  const validMoves = getValidAngelMoves(state);

  if (validMoves.length === 0) {
    throw new Error("No valid moves for angel — game should be over");
  }

  // Score all candidates statically
  const scored: ScoredMove[] = validMoves.map((coord) => ({
    coord,
    score: scoreCandidate(
      state.grid,
      state.angelPos,
      coord,
      escapeVector,
      state.angelPower
    ),
  }));

  // Sort by static score descending
  scored.sort((a, b) => b.score - a.score);

  // Apply minimax to top candidates if lookahead > 0
  let finalScored = scored;
  if (lookaheadDepth > 0) {
    const topN = Math.min(5, scored.length);
    const topCandidates = scored.slice(0, topN);

    finalScored = topCandidates.map(({ coord }) => {
      // Simulate angel moving here, then minimax
      try {
        const nextState = applyAngelMove(
          { ...state, phase: "angel-thinking" },
          coord
        );
        const score = minimax(nextState, escapeVector, lookaheadDepth, true);
        return { coord, score };
      } catch {
        return { coord, score: -Infinity };
      }
    });

    finalScored.sort((a, b) => b.score - a.score);
  }

  const bestMove = finalScored[0].coord;

  // Build danger map for visualization
  const dangerMap = computeDangerMap(
    state.grid,
    state.angelPos,
    state.angelPower,
    escapeVector,
    GAME.dangerRadius
  );

  const computeTimeMs = performance.now() - startTime;

  return {
    move: bestMove,
    reasoning: {
      escapeVector,
      candidates: finalScored.slice(0, 10).map(({ coord, score }) => ({
        coord,
        score: Math.round(score * 100) / 100,
      })),
      dangerMap: dangerMap.map(({ coord, danger }) => ({
        coord,
        danger: Math.round(danger * 100) / 100,
      })),
      lookaheadDepth,
      computeTimeMs: Math.round(computeTimeMs * 100) / 100,
    },
  };
}
