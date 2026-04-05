import type { Coord } from "@/engine/types";

/** Convert a coordinate to a string key for Map storage. */
export function coordKey(c: Coord): string {
  return `${c.x},${c.y}`;
}

/** Parse a "x,y" string key back into a Coord. */
export function parseCoordKey(key: string): Coord {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

/** Chebyshev distance (king moves) between two coordinates. */
export function chebyshevDistance(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** Manhattan distance between two coordinates. */
export function manhattanDistance(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** All coordinates within Chebyshev distance k of center (inclusive). */
export function coordsInRange(center: Coord, k: number): Coord[] {
  const coords: Coord[] = [];
  for (let dx = -k; dx <= k; dx++) {
    for (let dy = -k; dy <= k; dy++) {
      coords.push({ x: center.x + dx, y: center.y + dy });
    }
  }
  return coords;
}

export function addCoords(a: Coord, b: Coord): Coord {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtractCoords(a: Coord, b: Coord): Coord {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Normalize a vector to unit length. Returns {0,0} for zero vectors. */
export function normalizeVector(v: Coord): Coord {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

/** Dot product of two coordinate vectors. */
export function dotProduct(a: Coord, b: Coord): number {
  return a.x * b.x + a.y * b.y;
}

/** Euclidean magnitude of a vector. */
export function magnitude(v: Coord): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** Lerp between two coordinates. t=0 returns a, t=1 returns b. */
export function lerpCoord(a: Coord, b: Coord, t: number): Coord {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}
