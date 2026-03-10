import { useEffect, useRef } from "react";

export default function useClicker({ onTeamA, onTeamB, onUndo, isLive, isLocked }) {
  // We use refs here to remember the timing of the clicks without causing the app to re-render
  const clickTimer = useRef(null);
  const lastKey = useRef(null);
  const lastTime = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Allow normal typing in text boxes
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      // 2. Map standard 2-button and 3-button remote keys
      const isTeamA = e.code === "PageUp" || e.code === "ArrowLeft" || e.code === "ArrowUp";
      const isTeamB = e.code === "PageDown" || e.code === "ArrowRight" || e.code === "ArrowDown";
      const isUndoBtn = e.code === "Enter" || e.code === "Backspace";

      if (isTeamA || isTeamB || isUndoBtn) {
        
        // Kill the page scrolling instantly
        e.preventDefault();

        // If the match isn't live or the screen is locked, do nothing
        if (!isLive || isLocked) return;

        const now = Date.now();
        const timeSinceLastClick = now - lastTime.current;
        const isSameKey = lastKey.current === e.code;

        // SCENARIO A: They pressed a dedicated 3rd Undo button (instant fire)
        if (isUndoBtn) {
          clearTimeout(clickTimer.current); // Cancel any pending points
          onUndo();
          lastTime.current = 0; // Reset the double-click tracker
          return;
        }

        // SCENARIO B: DOUBLE CLICK DETECTED!
        // If they hit the exact same button twice within 350 milliseconds
        if (isSameKey && timeSinceLastClick < 350) {
          clearTimeout(clickTimer.current); // Stop the first click from giving a point
          onUndo(); // Fire the undo action instead!
          lastTime.current = 0; // Reset
          return;
        }

        // SCENARIO C: SINGLE CLICK
        // We log the key they pressed, and wait 300ms to see if they press it again.
        lastKey.current = e.code;
        lastTime.current = now;

        clearTimeout(clickTimer.current);
        
        clickTimer.current = setTimeout(() => {
          // If 300ms passes and no second click happened, award the point!
          if (isTeamA && onTeamA) onTeamA();
          if (isTeamB && onTeamB) onTeamB();
          
          // Reset the tracker
          lastTime.current = 0;
        }, 300);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(clickTimer.current);
    };
  }, [onTeamA, onTeamB, onUndo, isLive, isLocked]);
}