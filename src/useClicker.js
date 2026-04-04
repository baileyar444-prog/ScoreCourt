import { useEffect, useRef } from "react";

export default function useClicker({ onTeamA, onTeamB, onUndo, isLive, isLocked }) {
  const lastTime = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Allow normal typing in text boxes
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      // 2. Intercept volume and arrow keys
      const isTeamA = ["PageUp", "ArrowLeft", "ArrowUp", "AudioVolumeUp", "VolumeUp"].includes(e.code) || 
                      ["PageUp", "ArrowLeft", "ArrowUp", "AudioVolumeUp", "VolumeUp"].includes(e.key);
                      
      const isTeamB = ["PageDown", "ArrowRight", "ArrowDown", "AudioVolumeDown", "VolumeDown"].includes(e.code) || 
                      ["PageDown", "ArrowRight", "ArrowDown", "AudioVolumeDown", "VolumeDown"].includes(e.key);
                      
      const isUndoBtn = ["Enter", "Backspace"].includes(e.code) || ["Enter", "Backspace"].includes(e.key);

      if (isTeamA || isTeamB || isUndoBtn) {
        
        // THE KITCHEN SINK: Try to completely nuke the event from propagating to the OS
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.returnValue = false;

        if (!isLive || isLocked) return;

        // A tiny 150ms hardware debounce to prevent accidental double-fires
        const now = Date.now();
        if (now - lastTime.current < 150) return; 
        lastTime.current = now;

        // FIRE INSTANTLY
        if (isUndoBtn) {
          onUndo();
        } else if (isTeamA && onTeamA) {
          onTeamA();
        } else if (isTeamB && onTeamB) {
          onTeamB();
        }
      }
    };

    // 'capture: true' forces the browser to intercept the signal before anything else gets a chance
    window.addEventListener("keydown", handleKeyDown, { passive: false, capture: true });
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [onTeamA, onTeamB, onUndo, isLive, isLocked]);
}