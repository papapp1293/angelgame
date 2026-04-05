# Angel vs Devil

A browser game based on [Conway's Angel Problem](https://en.wikipedia.org/wiki/Angel_problem) — a famous puzzle in combinatorial game theory.

The angel sits at the origin of an infinite 2D grid. Each turn you (the Devil) block one cell. The angel then leaps to any unblocked cell within its power range (Chebyshev distance). For power ≥ 2, the angel has a mathematically proven winning strategy — but can you outsmart the algorithm?

## Play

Visit the hosted version or run locally:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

- **You are the Devil.** Click any empty cell to block it permanently.
- **The Angel is automated.** After each block, the angel computes an escape move using heuristic scoring, danger maps, and minimax lookahead — all running in a Web Worker.
- **Infinite grid.** Pan (drag) and zoom (scroll) freely. Only blocked cells use memory.
- **Win condition.** If the angel has no valid moves, you win. If it survives 200 turns, it wins.

## Features

- Hybrid strategy engine: escape vectors, flood-fill freedom scoring, minimax lookahead
- Danger heatmap overlay showing evaluated cell scores
- Strategy reasoning sidebar with move candidates and compute time
- Smooth canvas animations (angel lerp, block flash, glow pulse)
- Configurable angel power (1–4) and difficulty (easy/medium/hard)
- Tutorial walkthrough for first-time visitors
- Fully client-side — no server, no API calls

## Static Export

The game exports as a static site:

```bash
npm run build
```

Output goes to `out/`. Serve it with any static file server or embed it into an existing site.

## Stack

- **Next.js 15** (App Router, static export)
- **TypeScript** (strict)
- **HTML5 Canvas** (grid rendering, animations)
- **Zustand** (state management)
- **Web Worker** (angel computation off main thread)
- **Tailwind CSS** (UI styling)
- **Vitest** (testing)

## Tests

```bash
npm test
```

Covers grid operations, game logic, angel strategy, and danger map evaluation.

## Project Structure

```
src/
├── app/           # Next.js pages and layout
├── components/    # Canvas, HUD, sidebar, tutorial, settings
├── engine/        # Game logic, angel strategy, danger maps, worker
├── store/         # Zustand game store
├── hooks/         # Canvas, game loop, worker lifecycle
└── lib/           # Constants, math utilities
```
