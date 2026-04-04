import { useEffect, useRef } from "react";

export default function useClicker({ onTeamA, onTeamB, onUndo, isLive, isLocked }) {
  const clickTimer = useRef(null);
  const lastKey = useRef(null);
  const lastTime = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Allow normal typing in text boxes
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      // 2. Aggressively intercept EVERY known variation of the volume keys we found in the sniffer
      const isTeamA = ["PageUp", "ArrowLeft", "ArrowUp", "AudioVolumeUp", "VolumeUp"].includes(e.code) || 
                      ["PageUp", "ArrowLeft", "ArrowUp", "AudioVolumeUp", "VolumeUp"].includes(e.key);
                      
      const isTeamB = ["PageDown", "ArrowRight", "ArrowDown", "AudioVolumeDown", "VolumeDown"].includes(e.code) || 
                      ["PageDown", "ArrowRight", "ArrowDown", "AudioVolumeDown", "VolumeDown"].includes(e.key);
                      
      const isUndoBtn = ["Enter", "Backspace"].includes(e.code) || ["Enter", "Backspace"].includes(e.key);

      if (isTeamA || isTeamB || isUndoBtn) {
        
        // Kill the computer's volume/scrolling action instantly
        e.preventDefault();

        // If the match isn't live or the screen is locked, do nothing
        if (!isLive || isLocked) return;

        const now = Date.now();
        const timeSinceLastClick = now - lastTime.current;
        
        // Check if they pressed the same action using either property
        const currentKey = e.code || e.key;
        const isSameKey = lastKey.current === currentKey;

        // SCENARIO A: They pressed a dedicated 3rd Undo button
        if (isUndoBtn) {
          clearTimeout(clickTimer.current);
          onUndo();
          lastTime.current = 0;
          return;
        }

        // SCENARIO B: DOUBLE CLICK DETECTED!
        if (isSameKey && timeSinceLastClick < 350) {
          clearTimeout(clickTimer.current); 
          onUndo(); 
          lastTime.current = 0; 
          return;
        }

        // SCENARIO C: SINGLE CLICK
        lastKey.current = currentKey;
        lastTime.current = now;

        clearTimeout(clickTimer.current);
        
        clickTimer.current = setTimeout(() => {
          // If 300ms passes and no second click happened, award the point!
          if (isTeamA && onTeamA) onTeamA();
          if (isTeamB && onTeamB) onTeamB();
          
          lastTime.current = 0;
        }, 300);
      }
    };

    // passive: false is REQUIRED to allow e.preventDefault() to stop the volume changing
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(clickTimer.current);
    };
  }, [onTeamA, onTeamB, onUndo, isLive, isLocked]);
}