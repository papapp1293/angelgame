"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "angel-game-tutorial-seen";

const STEPS = [
  {
    title: "The Angel Problem",
    body: "This is a game based on a famous problem in combinatorial game theory. An Angel sits on an infinite grid. A Devil tries to trap it by blocking cells. Can the Angel escape forever?",
  },
  {
    title: "You Are the Devil",
    body: "Each turn, you click any empty cell to block it. Blocked cells are permanent obstacles the Angel can never land on. Strategy matters \u2014 try to build walls and cut off escape routes.",
  },
  {
    title: "The Angel Flies",
    body: "After you block a cell, the AI Angel jumps to any cell within its power range (Chebyshev distance). A power-2 Angel can reach any cell within a 5\u00d75 area. Higher power means longer jumps.",
  },
  {
    title: "Can You Win?",
    body: "Mathematically, a power-2+ Angel can always escape. But the AI isn\u2019t perfect \u2014 with clever blocking you might trap it. Place blocks to form barriers and corner the Angel. Good luck!",
  },
] as const;

interface TutorialModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function TutorialModal({ forceOpen, onClose }: TutorialModalProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setVisible(true);
      setStep(0);
      return;
    }
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — skip tutorial
    }
  }, [forceOpen]);

  const close = useCallback(() => {
    setVisible(false);
    setStep(0);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    onClose?.();
  }, [onClose]);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="mx-4 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        {/* Step indicator */}
        <div className="mb-4 flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-amber-400" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>

        <h2 className="mb-2 text-lg font-bold text-zinc-100">{current.title}</h2>
        <p className="mb-6 text-sm leading-relaxed text-zinc-400">{current.body}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={close}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500"
              >
                Back
              </button>
            )}
            <button
              onClick={isLast ? close : () => setStep(step + 1)}
              className="rounded bg-amber-500 px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-amber-400"
            >
              {isLast ? "Play" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
