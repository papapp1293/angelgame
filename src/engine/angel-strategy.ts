import type { Coord, GameState, AngelReasoning } from "./types";
import { isBlocked, countBlockedInRange } from "./grid";
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

/** Precomputed context to avoid redundant work across scoreCandidate calls. */
interface ScoringContext {
  escapeVector: Coord;
  centroid: Coord | null;
}

/**
 * Compute the blocked centroid. Returns null if no blocked cells.
 */
function computeBlockedCentroid(grid: GameState["grid"]): Coord | null {
  if (grid.size === 0) return null;
  let cx = 0;
  let cy = 0;
  for (const key of grid.keys()) {
    const comma = key.indexOf(",");
    cx += +key.slice(0, comma);
    cy += +key.slice(comma + 1);
  }
  return { x: cx / grid.size, y: cy / grid.size };
}

/**
 * Compute the escape vector: direction away from the centroid of all blocked cells.
 */
export function computeEscapeVector(
  centroid: Coord | null,
  angelPos: Coord
): Coord {
  if (!centroid) return { x: 1, y: 0 };

  const away = subtractCoords(angelPos, centroid);
  if (away.x === 0 && away.y === 0) return { x: 1, y: 0 };

  return normalizeVector(away);
}

/**
 * Score a candidate move. Higher score = better for the angel.
 */
export function scoreCandidate(
  grid: GameState["grid"],
  angelPos: Coord,
  candidate: Coord,
  ctx: ScoringContext,
  angelPower: number
): number {
  // 1. Escape alignment
  const moveDir = subtractCoords(candidate, angelPos);
  const moveDirNorm = normalizeVector(moveDir);
  const alignment = dotProduct(moveDirNorm, ctx.escapeVector);

  // 2. Freedom score (flood fill within a radius)
  const freedom = floodFillFreedom(grid, candidate, angelPower + 2);
  const maxFreedom = (2 * (angelPower + 2) + 1) ** 2;
  const freedomRatio = freedom / maxFreedom;

  // 3. Local danger (blocked cells in immediate neighborhood)
  const localBlocked = countBlockedInRange(grid, candidate, 1);

  // 4. Distance from blocked centroid
  let centroidDist = 0;
  if (ctx.centroid) {
    centroidDist = magnitude(subtractCoords(candidate, ctx.centroid));
  }

  return (
    alignment * 4.0 +
    freedomRatio * 10.0 +
    -localBlocked * 3.0 +
    centroidDist * 0.5
  );
}

/**
 * Minimax lookahead: simulate devil placing the worst block, angel responding optimally.
 */
function minimax(
  state: GameState,
  ctx: ScoringContext,
  depth: number,
  isDevilTurn: boolean
): number {
  if (depth === 0 || state.phase === "devil-wins") {
    if (state.phase === "devil-wins") return -1000;
    return scoreCandidate(
      state.grid,
      state.angelPos,
      state.angelPos,
      ctx,
      state.angelPower
    );
  }

  if (isDevilTurn) {
    const angelMoves = getValidAngelMoves(state);
    if (angelMoves.length === 0) return -1000;

    // Devil blocks near the angel — score candidates by threat level
    const r = state.angelPower + 2;
    const devilCandidates: { coord: Coord; threat: number }[] = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const coord = { x: state.angelPos.x + dx, y: state.angelPos.y + dy };
        if (!isBlocked(state.grid, coord) &&
            !(coord.x === state.angelPos.x && coord.y === state.angelPos.y)) {
          // Threat = closeness to angel + blocks nearby (walls are good for devil)
          const dist = chebyshevDistance(state.angelPos, coord);
          const nearbyBlocks = countBlockedInRange(state.grid, coord, 1);
          const threat = (r - dist) * 2 + nearbyBlocks * 3;
          devilCandidates.push({ coord, threat });
        }
      }
    }

    // Pick the most threatening devil moves
    devilCandidates.sort((a, b) => b.threat - a.threat);
    const sample = devilCandidates.slice(0, 10);
    let worstScore = Infinity;

    for (const { coord: devilMove } of sample) {
      try {
        const nextState = applyDevilMove(
          { ...state, phase: "devil-turn" },
          devilMove
        );
        const score = minimax(nextState, ctx, depth - 1, false);
        worstScore = Math.min(worstScore, score);
      } catch {
        continue;
      }
    }

    return worstScore === Infinity ? 0 : worstScore;
  } else {
    const moves = getValidAngelMoves(state);
    if (moves.length === 0) return -1000;

    let bestScore = -Infinity;
    const scored = moves
      .map((m) => ({
        coord: m,
        score: scoreCandidate(state.grid, state.angelPos, m, ctx, state.angelPower),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const { coord } of scored) {
      try {
        const nextState = applyAngelMove(
          { ...state, phase: "angel-thinking" },
          coord
        );
        const score = minimax(nextState, ctx, depth - 1, true);
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

  // Precompute shared context once
  const centroid = computeBlockedCentroid(state.grid);
  const escapeVector = computeEscapeVector(centroid, state.angelPos);
  const ctx: ScoringContext = { escapeVector, centroid };

  const validMoves = getValidAngelMoves(state);

  if (validMoves.length === 0) {
    throw new Error("No valid moves for angel — game should be over");
  }

  // Score all candidates statically
  const scored: ScoredMove[] = validMoves.map((coord) => ({
    coord,
    score: scoreCandidate(state.grid, state.angelPos, coord, ctx, state.angelPower),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Apply minimax to top candidates if lookahead > 0
  let finalScored = scored;
  if (lookaheadDepth > 0) {
    const topN = Math.min(5, scored.length);
    const topCandidates = scored.slice(0, topN);

    finalScored = topCandidates.map(({ coord }) => {
      try {
        const nextState = applyAngelMove(
          { ...state, phase: "angel-thinking" },
          coord
        );
        const score = minimax(nextState, ctx, lookaheadDepth, true);
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
