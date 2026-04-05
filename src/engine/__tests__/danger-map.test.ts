import { describe, it, expect } from "vitest";
import { cellDanger, computeDangerMap, floodFillFreedom } from "../danger-map";
import { createGrid, blockCell } from "../grid";

describe("cellDanger", () => {
  it("returns zero danger for a cell on an empty grid", () => {
    const grid = createGrid();
    const danger = cellDanger(grid, { x: 3, y: 3 }, { x: 1, y: 0 }, 4);
    expect(danger).toBe(0);
  });

  it("increases danger with adjacent blocked cells", () => {
    let grid = createGrid();
    const cell = { x: 5, y: 5 };

    const dangerBefore = cellDanger(grid, cell, { x: 1, y: 0 }, 4);

    // Block 3 neighbors
    grid = blockCell(grid, { x: 4, y: 5 });
    grid = blockCell(grid, { x: 5, y: 4 });
    grid = blockCell(grid, { x: 6, y: 5 });

    const dangerAfter = cellDanger(grid, cell, { x: 1, y: 0 }, 4);
    expect(dangerAfter).toBeGreaterThan(dangerBefore);
  });

  it("penalizes cells moving opposite to escape vector", () => {
    const grid = createGrid();
    // Escape vector points right (+x)
    const escapeVec = { x: 1, y: 0 };

    // Cell to the left (opposite escape direction)
    const dangerLeft = cellDanger(grid, { x: -3, y: 0 }, escapeVec, 4);
    // Cell to the right (aligned with escape)
    const dangerRight = cellDanger(grid, { x: 3, y: 0 }, escapeVec, 4);

    // Left should have higher danger (anti-escape penalty)
    expect(dangerLeft).toBeGreaterThan(dangerRight);
  });
});

describe("computeDangerMap", () => {
  it("returns entries for all reachable non-blocked cells", () => {
    const grid = createGrid();
    const angelPos = { x: 0, y: 0 };
    const power = 2;

    const map = computeDangerMap(grid, angelPos, power, { x: 1, y: 0 }, 4);

    // Power 2: 5x5 grid minus center = 24 cells
    expect(map.length).toBe(24);
  });

  it("excludes blocked cells from the danger map", () => {
    let grid = createGrid();
    grid = blockCell(grid, { x: 1, y: 0 });
    grid = blockCell(grid, { x: -1, y: 0 });

    const map = computeDangerMap(grid, { x: 0, y: 0 }, 2, { x: 1, y: 0 }, 4);

    // 24 - 2 blocked = 22
    expect(map.length).toBe(22);

    const coords = map.map((e) => `${e.coord.x},${e.coord.y}`);
    expect(coords).not.toContain("1,0");
    expect(coords).not.toContain("-1,0");
  });

  it("assigns higher danger to cells near blocked clusters", () => {
    let grid = createGrid();
    // Block a cluster near (2, 0)
    grid = blockCell(grid, { x: 2, y: 1 });
    grid = blockCell(grid, { x: 2, y: -1 });
    grid = blockCell(grid, { x: 1, y: 1 });

    const map = computeDangerMap(grid, { x: 0, y: 0 }, 2, { x: -1, y: 0 }, 4);

    const nearCluster = map.find((e) => e.coord.x === 1 && e.coord.y === 0);
    const farFromCluster = map.find((e) => e.coord.x === -2 && e.coord.y === 0);

    expect(nearCluster).toBeDefined();
    expect(farFromCluster).toBeDefined();
    expect(nearCluster!.danger).toBeGreaterThan(farFromCluster!.danger);
  });
});

describe("floodFillFreedom", () => {
  it("counts all cells in an empty grid within radius", () => {
    const grid = createGrid();
    const freedom = floodFillFreedom(grid, { x: 0, y: 0 }, 2);
    // 5x5 = 25 cells
    expect(freedom).toBe(25);
  });

  it("reduces count when cells are blocked", () => {
    let grid = createGrid();
    // Create a partial wall
    grid = blockCell(grid, { x: 1, y: -1 });
    grid = blockCell(grid, { x: 1, y: 0 });
    grid = blockCell(grid, { x: 1, y: 1 });

    const freedom = floodFillFreedom(grid, { x: 0, y: 0 }, 2);
    // Wall blocks 3 cells, and also cuts off some cells behind it
    expect(freedom).toBeLessThan(25);
  });

  it("returns 1 when completely surrounded", () => {
    let grid = createGrid();
    // Surround (0,0) completely
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        grid = blockCell(grid, { x: dx, y: dy });
      }
    }

    const freedom = floodFillFreedom(grid, { x: 0, y: 0 }, 3);
    expect(freedom).toBe(1); // Only the start cell
  });

  it("handles offset starting positions", () => {
    const grid = createGrid();
    const freedom = floodFillFreedom(grid, { x: 100, y: -50 }, 1);
    // 3x3 = 9 cells
    expect(freedom).toBe(9);
  });
});
