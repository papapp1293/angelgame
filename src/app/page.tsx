import GameCanvas from "@/components/GameCanvas";
import HUD from "@/components/HUD";

export default function Home() {
  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <h1 className="text-lg font-bold tracking-tight">Angel vs Devil</h1>
      </header>
      <HUD />
      <div className="flex-1">
        <GameCanvas />
      </div>
    </div>
  );
}
