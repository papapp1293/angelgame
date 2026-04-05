import { describe, it, expect } from "vitest";
import {
  coordKey,
  parseCoordKey,
  chebyshevDistance,
  manhattanDistance,
  coordsInRange,
  addCoords,
  subtractCoords,
  normalizeVector,
  dotProduct,
  magnitude,
  lerpCoord,
} from "../math";

describe("coordKey / parseCoordKey", () => {
  it("converts coord to string and back", () => {
    const coord = { x: 3, y: -7 };
    const key = coordKey(coord);
    expect(key).toBe("3,-7");
    expect(parseCoordKey(key)).toEqual(coord);
  });

  it("handles origin", () => {
    expect(coordKey({ x: 0, y: 0 })).toBe("0,0");
    expect(parseCoordKey("0,0")).toEqual({ x: 0, y: 0 });
  });
});

describe("chebyshevDistance", () => {
  it("returns 0 for same point", () => {
    expect(chebyshevDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it("returns correct distance for diagonal", () => {
    expect(chebyshevDistance({ x: 0, y: 0 }, { x: 2, y: 1 })).toBe(2);
  });

  it("returns correct distance for axis-aligned", () => {
    expect(chebyshevDistance({ x: 0, y: 0 }, { x: 0, y: 5 })).toBe(5);
  });

  it("handles negative coordinates", () => {
    expect(chebyshevDistance({ x: -3, y: -2 }, { x: 1, y: 1 })).toBe(4);
  });
});

describe("manhattanDistance", () => {
  it("returns sum of absolute differences", () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
  });
});

describe("coordsInRange", () => {
  it("returns 1 coord for k=0", () => {
    const coords = coordsInRange({ x: 5, y: 5 }, 0);
    expect(coords).toHaveLength(1);
    expect(coords[0]).toEqual({ x: 5, y: 5 });
  });

  it("returns 9 coords for k=1", () => {
    const coords = coordsInRange({ x: 0, y: 0 }, 1);
    expect(coords).toHaveLength(9);
  });

  it("returns 25 coords for k=2", () => {
    const coords = coordsInRange({ x: 0, y: 0 }, 2);
    expect(coords).toHaveLength(25);
  });

  it("all coords are within chebyshev distance k", () => {
    const center = { x: 3, y: -2 };
    const k = 3;
    const coords = coordsInRange(center, k);
    for (const c of coords) {
      expect(chebyshevDistance(center, c)).toBeLessThanOrEqual(k);
    }
  });

  it("returns (2k+1)^2 coords", () => {
    for (let k = 0; k <= 4; k++) {
      expect(coordsInRange({ x: 0, y: 0 }, k)).toHaveLength((2 * k + 1) ** 2);
    }
  });
});

describe("addCoords / subtractCoords", () => {
  it("adds coordinates", () => {
    expect(addCoords({ x: 1, y: 2 }, { x: 3, y: -1 })).toEqual({
      x: 4,
      y: 1,
    });
  });

  it("subtracts coordinates", () => {
    expect(subtractCoords({ x: 5, y: 3 }, { x: 2, y: 7 })).toEqual({
      x: 3,
      y: -4,
    });
  });
});

describe("normalizeVector", () => {
  it("normalizes to unit length", () => {
    const v = normalizeVector({ x: 3, y: 4 });
    expect(v.x).toBeCloseTo(0.6);
    expect(v.y).toBeCloseTo(0.8);
  });

  it("returns zero for zero vector", () => {
    expect(normalizeVector({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe("dotProduct", () => {
  it("computes dot product", () => {
    expect(dotProduct({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe(11);
  });

  it("returns 0 for perpendicular vectors", () => {
    expect(dotProduct({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
  });
});

describe("magnitude", () => {
  it("computes length", () => {
    expect(magnitude({ x: 3, y: 4 })).toBe(5);
  });

  it("returns 0 for zero vector", () => {
    expect(magnitude({ x: 0, y: 0 })).toBe(0);
  });
});

describe("lerpCoord", () => {
  it("returns start at t=0", () => {
    expect(lerpCoord({ x: 0, y: 0 }, { x: 10, y: 10 }, 0)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("returns end at t=1", () => {
    expect(lerpCoord({ x: 0, y: 0 }, { x: 10, y: 10 }, 1)).toEqual({
      x: 10,
      y: 10,
    });
  });

  it("returns midpoint at t=0.5", () => {
    expect(lerpCoord({ x: 0, y: 0 }, { x: 10, y: 10 }, 0.5)).toEqual({
      x: 5,
      y: 5,
    });
  });
});
