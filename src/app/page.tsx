"use client";

import { useState } from "react";
import { useGameStore } from "@/store/game-store";
import GameCanvas from "@/components/GameCanvas";
import HUD from "@/components/HUD";
import Sidebar from "@/components/Sidebar";
import HeatmapToggle from "@/components/Heatmap";
import TutorialModal from "@/components/TutorialModal";
import SettingsPanel from "@/components/SettingsPanel";

function LandingHero({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
      <div className="max-w-lg text-center">
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Angel <span className="text-amber-400">vs</span> Devil
        </h1>
        <p className="mb-6 text-lg leading-relaxed text-zinc-400">
          An angel sits on an infinite grid. Each turn, you block one cell.
          The angel leaps to safety. Can you build walls fast enough to trap it?
        </p>
        <button
          onClick={onPlay}
          className="rounded-lg bg-amber-500 px-8 py-3 text-lg font-semibold text-black transition-colors hover:bg-amber-400"
        >
          Play Now
        </button>
      </div>
      <div className="flex max-w-md flex-wrap justify-center gap-4 text-sm text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#8b2020]" />
          You block cells
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-400" />
          Angel jumps to escape
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">&#x221e;</span>
          Infinite grid
        </div>
      </div>
      <p className="max-w-sm text-center text-xs leading-relaxed text-zinc-600">
        Based on Conway&apos;s Angel Problem — a famous puzzle in combinatorial
        game theory. For power &ge; 2, the angel has a proven winning strategy.
      </p>
    </div>
  );
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const resetGame = useGameStore((s) => s.resetGame);

  const handlePlay = () => {
    resetGame();
    setStarted(true);
  };

  if (!started) {
    return (
      <div className="flex h-full flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <span className="text-lg font-bold tracking-tight">
            Angel vs Devil
          </span>
          <a
            href="https://en.wikipedia.org/wiki/Angel_problem"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            What is the Angel Problem?
          </a>
        </header>
        <LandingHero onPlay={handlePlay} />
        <footer className="border-t border-zinc-800 px-4 py-3 text-center text-xs text-zinc-600">
          No server required — runs entirely in your browser.
        </footer>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <h1 className="text-lg font-bold tracking-tight">Angel vs Devil</h1>
        <div className="flex items-center gap-3">
          <HeatmapToggle enabled={showHeatmap} onToggle={setShowHeatmap} />
          <button
            onClick={() => setShowSettings(true)}
            className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            Settings
          </button>
        </div>
      </header>
      <HUD />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <GameCanvas showHeatmap={showHeatmap} />
        </div>
        <Sidebar />
      </div>

      <TutorialModal
        forceOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onShowTutorial={() => setShowTutorial(true)}
      />
    </div>
  );
}
