"use client";

import { useState } from "react";
import GameCanvas from "@/components/GameCanvas";
import HUD from "@/components/HUD";
import Sidebar from "@/components/Sidebar";
import HeatmapToggle from "@/components/Heatmap";
import TutorialModal from "@/components/TutorialModal";
import SettingsPanel from "@/components/SettingsPanel";

export default function Home() {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

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
