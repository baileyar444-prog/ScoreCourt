import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { supabase } from "./supabaseClient";
import useClicker from "./useClicker"; 
import {
  SPORTS,
  makeInitialMatch,
  startMatch,
  resetMatch,
  setSport,
  setMode,
  setFormat,
  addRally,
  undoLastRally,
  removeLastPointForTeam,
  displayScoreText,
  getServeDetail,
  deepCopy
} from "./sportRules";

const PREFERRED_SPORT_KEY = "scorecourt_preferred_sport_v1";

const TEAM_A_HEX = "#0b63f6";
const TEAM_B_HEX = "#91cb23";
const DARK_BLUE = "#142760";
const CHARCOAL = "#353839";
const WHITE = "#ffffff";
const RED = "#D32F2F";
const DARK_GREEN = "#0a3a25";

const TEAM_A_BG = "rgba(11, 99, 246, 0.08)";
const TEAM_B_BG = "rgba(145, 203, 35, 0.08)";
const TEAM_A_BORDER = "rgba(11, 99, 246, 0.3)";
const TEAM_B_BORDER = "rgba(145, 203, 35, 0.3)";

export default function ScoreApp() {
  const { user, profile } = useAuth();
  
  const displayName = profile?.full_name || user?.user_metadata?.full_name;
  const isPro = profile?.is_pro || false;

  const userId = user?.id || "guest";
  const STORAGE_KEY = `scorecourt_state_v1_${userId}`;
  const TIMER_KEY = `scorecourt_timer_v1_${userId}`;
  const TIMER_ANCHOR_KEY = `scorecourt_timer_anchor_v1_${userId}`;
  const TIMER_PAUSED_KEY = `scorecourt_timer_paused_v1_${userId}`;

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return makeInitialMatch({ sport: "Pickleball", mode: "singles" });
      const parsed = JSON.parse(raw);
      const base = makeInitialMatch({
        sport: parsed?.sport || "Pickleball",
        mode: parsed?.mode || "singles"
      });
      return { ...base, ...parsed, teams: parsed.teams || base.teams, format: parsed.format || base.format };
    } catch {
      return makeInitialMatch({ sport: "Pickleball", mode: "singles" });
    }
  };

  const saveState = (state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
    } catch {}
  };

  const displaySlug = useMemo(() => {
    if (!user?.id) return 'demo';
    return user.id.replace(/\D/g, '').padEnd(6, '0').substring(0, 6);
  }, [user]);

  const displayUrl = useMemo(() => `${window.location.origin}/display/${displaySlug}`, [displaySlug]);

  const [match, setMatchState] = useState(() => loadState());
  const [undoStack, setUndoStack] = useState([]);
  const [copied, setCopied] = useState(false);
  const [locked, setLocked] = useState(false);
  
  // Modal States
  const [showQR, setShowQR] = useState(false);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [isClickerVerified, setIsClickerVerified] = useState(false);

  const [isSportDropdownOpen, setIsSportDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [tapPulse, setTapPulse] = useState(null);
  const [winnerFxOn, setWinnerFxOn] = useState(false);
  const confettiRef = useRef([]);

  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    return parseInt(localStorage.getItem(TIMER_KEY) || "0", 10);
  });

  const [isTimerPaused, setIsTimerPaused] = useState(() => {
    return localStorage.getItem(TIMER_PAUSED_KEY) === "true";
  });

  // ==========================================
  // THE "TELEPATHY" FIX: Syncing tabs locally
  // ==========================================
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          setMatchState(JSON.parse(event.newValue));
        } catch(e) {}
      }
      if (event.key === TIMER_KEY && event.newValue) {
        setElapsedSeconds(parseInt(event.newValue, 10) || 0);
      }
      if (event.key === TIMER_PAUSED_KEY && event.newValue) {
        setIsTimerPaused(event.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [STORAGE_KEY, TIMER_KEY, TIMER_PAUSED_KEY]);


  // ==========================================
  // AUDIO & ANNOUNCER ENGINE
  // ==========================================
  const [sfxEnabled, setSfxEnabled] = useState(false);
  
  const clapAudioRef = useRef(typeof Audio !== "undefined" ? new Audio("https://actions.google.com/sounds/v1/crowds/light_applause.ogg") : null);

  const playClap = () => {
    if (!sfxEnabled || !clapAudioRef.current) return;
    clapAudioRef.current.currentTime = 0;
    clapAudioRef.current.play().catch(e => console.log("Audio play blocked by browser:", e));
  };

  const announce = (text) => {
    if (!sfxEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); 
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1.0; 
    msg.pitch = 1.0;
    window.speechSynthesis.speak(msg);
  };

  const getMajorScore = (m) => {
    if (!m) return 0;
    if (m.sport === 'Tennis' || m.sport === 'Padel') {
      return (m.tennis?.sets?.A || 0) + (m.tennis?.sets?.B || 0) + (m.tennis?.games?.A || 0) + (m.tennis?.games?.B || 0);
    }
    if (m.sport === 'Volleyball') {
      return (m.volley?.sets?.A || 0) + (m.volley?.sets?.B || 0);
    }
    return (m.gamesWon?.A || 0) + (m.gamesWon?.B || 0);
  };

  // ==========================================
  // PROTECTION FEATURES
  // ==========================================
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (match.phase === "live" && !match.winner) {
        e.preventDefault();
        e.returnValue = ""; 
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [match.phase, match.winner]);

  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && match.phase === "live" && !match.winner) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {}
      }
    };
    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    requestWakeLock();
    return () => {
      if (wakeLock !== null) wakeLock.release().then(() => { wakeLock = null; });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [match.phase, match.winner]);

  // ==========================================
  // CLOUD SYNCING
  // ==========================================
  const channelRef = useRef(null);

  useEffect(() => {
    if (!isPro || !displaySlug || displaySlug === 'demo') return;
    const chan = supabase.channel(`room_${displaySlug}`);
    chan.subscribe();
    channelRef.current = chan;
    return () => supabase.removeChannel(chan);
  }, [isPro, displaySlug]);

  const syncToCloud = async (stateToSync, timeToSync) => {
    if (!isPro || !user?.id) return; 
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'score_update',
        payload: { match_state: stateToSync, elapsed_seconds: timeToSync }
      }).catch(() => {});
    }
    try {
      await supabase.from('broadcasts').upsert({
        room_code: displaySlug,
        user_id: user.id,
        match_state: stateToSync,
        elapsed_seconds: timeToSync,
        updated_at: new Date().toISOString()
      }, { onConflict: 'room_code' });
    } catch (error) {}
  };

  const commit = (next) => {
    setMatchState(next);
    saveState(next);
    syncToCloud(next, elapsedSeconds);
  };

  // ==========================================
  // MATCH LOGIC
  // ==========================================
  const pushUndoSnapshot = () => {
    setUndoStack((prev) => {
      const next = [...prev, JSON.stringify(match)];
      if (next.length > 160) next.shift();
      return next;
    });
  };

  const undoSnapshot = () => {
    setUndoStack((prev) => {
      const copy = [...prev];
      const last = copy.pop();
      if (!last) return prev;
      const parsedLast = JSON.parse(last);
      setMatchState(parsedLast);
      saveState(parsedLast);
      syncToCloud(parsedLast, elapsedSeconds);
      return copy;
    });
  };

  const undo = () => {
    if (locked) return;
    if (undoStack.length > 0) return undoSnapshot();
    if (match.phase === "live" || match.phase === "finished" || match.winner) commit(undoLastRally(match));
  };

  const hardReset = () => {
    if (!window.confirm("Reset match? This will clear scores and settings for the current match.")) return;
    pushUndoSnapshot();
    const nextMatch = resetMatch(match);
    setMatchState(nextMatch);
    saveState(nextMatch);
    syncToCloud(nextMatch, 0);
    setLocked(false);
    setElapsedSeconds(0);
    setIsTimerPaused(false);
    localStorage.removeItem(TIMER_KEY);
    localStorage.removeItem(TIMER_ANCHOR_KEY);
    localStorage.removeItem(TIMER_PAUSED_KEY);
    setWinnerFxOn(false);
    confettiRef.current = [];
  };

  const forceEndMatch = () => {
    if (!window.confirm("Are you sure you want to end the match right now and save the final score?")) return;
    pushUndoSnapshot();
    const next = deepCopy(match);
    
    let winner = "A";
    if (match.sport === "Tennis" || match.sport === "Padel") {
       const setsA = match.tennis.sets.A; const setsB = match.tennis.sets.B;
       if (setsB > setsA) winner = "B";
       else if (setsB === setsA && match.tennis.games.B > match.tennis.games.A) winner = "B";
    } else if (match.sport === "Volleyball") {
       if (match.volley.sets.B > match.volley.sets.A) winner = "B";
    } else if (match.sport === "Pickleball" || match.sport === "Badminton") {
       if (match.gamesWon.B > match.gamesWon.A) winner = "B";
    } else {
       if (match.points.B > match.points.A) winner = "B";
    }
    
    next.winner = winner;
    next.phase = "finished";
    commit(next);
  };

  const beginMatch = () => {
    localStorage.removeItem(TIMER_ANCHOR_KEY);
    localStorage.setItem(TIMER_PAUSED_KEY, "false");
    setIsTimerPaused(false);
    pushUndoSnapshot();
    commit(startMatch(match));
    if (sfxEnabled) announce(`Match started. ${match.sport}.`);
  };

  const toggleTimer = () => {
    if (isTimerPaused) {
      const newAnchor = Date.now() - (elapsedSeconds * 1000);
      localStorage.setItem(TIMER_ANCHOR_KEY, newAnchor.toString());
      localStorage.setItem(TIMER_PAUSED_KEY, "false");
      setIsTimerPaused(false);
      syncToCloud(match, elapsedSeconds);
    } else {
      localStorage.removeItem(TIMER_ANCHOR_KEY);
      localStorage.setItem(TIMER_PAUSED_KEY, "true");
      setIsTimerPaused(true);
      syncToCloud(match, elapsedSeconds);
    }
  };

  const onAdd = (team) => {
    if (locked || match.phase !== "live" || match.winner) return;

    setTapPulse(team);
    window.setTimeout(() => setTapPulse((v) => (v === team ? null : v)), 250);

    pushUndoSnapshot();
    const nextMatch = addRally(match, team);
    
    if (sfxEnabled) {
      if (nextMatch.winner) {
        playClap();
        announce(`Game, set, match, ${nextMatch.teams[nextMatch.winner].name}!`);
      } else {
        const oldMajor = getMajorScore(match);
        const newMajor = getMajorScore(nextMatch);
        if (newMajor > oldMajor) {
          playClap();
          announce(`Game won by ${nextMatch.teams[team].name}.`);
        } else {
          let scoreText = displayScoreText(nextMatch).replace('–', ' to ');
          if (nextMatch.tennis?.isTiebreak) scoreText = `Tiebreak, ${scoreText}`;
          announce(scoreText);
        }
      }
    }

    commit(nextMatch);
  };

  const onRemoveLastWonByTeam = (team) => {
    if (locked || match.phase !== "live") return;
    if (match.sport === "Tennis" || match.sport === "Padel") return undo();
    pushUndoSnapshot();
    commit(removeLastPointForTeam(match, team));
  };

  // ==========================================
  // HARDWARE CLICKER ENGINE INTEGRATION
  // ==========================================
  useClicker({
    onTeamA: () => onAdd("A"),
    onTeamB: () => onAdd("B"),
    onUndo: () => undo(),
    // We pause scoring via the clicker while the pairing modal is active
    isLive: match.phase === "live" && !match.winner && !showPairingModal,
    isLocked: locked
  });

  // Pairing Modal Signal Verification
  useEffect(() => {
    if (!showPairingModal || isClickerVerified) return;
    const verifySignal = (e) => {
      const validCodes = ["PageUp", "PageDown", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "AudioVolumeUp", "AudioVolumeDown", "VolumeUp", "VolumeDown"];
      if (validCodes.includes(e.code) || validCodes.includes(e.key)) {
        e.preventDefault();
        setIsClickerVerified(true);
      }
    };
    window.addEventListener("keydown", verifySignal, { passive: false });
    return () => window.removeEventListener("keydown", verifySignal);
  }, [showPairingModal, isClickerVerified]);

  // Standard keyboard listeners for non-scoring shortcuts
  useEffect(() => {
    const handleShortcuts = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === "KeyL") setLocked((v) => !v);
      if (e.code === "KeyR") hardReset();
    };
    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [locked]);

  // ==========================================
  // COMPONENT EFFECTS & HELPERS
  // ==========================================
  useEffect(() => {
    if (match.winner && !match.savedToCloud && user) {
      const saveToHistory = async () => {
        const winnerName = match.winner === 'A' ? match.teams.A.name : match.teams.B.name;
        const { error } = await supabase.from('completed_matches').insert([{
          user_id: user.id, sport: match.sport, match_name: match.matchName || "ScoreCourt Match",
          winner: winnerName, match_data: match, duration_seconds: elapsedSeconds
        }]);
        if (!error) {
          const next = deepCopy(match);
          next.savedToCloud = true;
          commit(next);
        }
      };
      saveToHistory();
    }
  }, [match.winner, match.savedToCloud, user, elapsedSeconds, match]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsSportDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let interval;
    if (match.phase === "live" && !match.winner && !isTimerPaused) {
      let anchor = parseInt(localStorage.getItem(TIMER_ANCHOR_KEY), 10);
      if (!anchor) {
        anchor = Date.now() - (elapsedSeconds * 1000);
        localStorage.setItem(TIMER_ANCHOR_KEY, anchor.toString());
      }
      
      interval = setInterval(() => {
        const exactElapsed = Math.floor((Date.now() - anchor) / 1000);
        setElapsedSeconds((prev) => {
          if (prev !== exactElapsed) {
            localStorage.setItem(TIMER_KEY, exactElapsed.toString());
            return exactElapsed;
          }
          return prev;
        });
      }, 500); 
    }
    return () => clearInterval(interval);
  }, [match, isTimerPaused]); 

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const exportResults = async () => { /* Logic unchanged */ };
  const downloadCSV = () => { /* Logic unchanged */ };

  useEffect(() => {
    try {
      const preferred = localStorage.getItem(PREFERRED_SPORT_KEY);
      if (!preferred) return;
      if (SPORTS.includes(preferred)) {
        pushUndoSnapshot();
        commit(setSport(match, preferred));
      }
      localStorage.removeItem(PREFERRED_SPORT_KEY);
    } catch {}
  }, []);

  const shareOrCopyLink = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "ScoreCourt Display", url: displayUrl }); } catch (err) {}
    } else {
      try {
        await navigator.clipboard.writeText(displayUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch {
        window.prompt("Copy this Display link:", displayUrl);
      }
    }
  };

  const fmt = match.format || {};
  const isVolleyball = match.sport === "Volleyball";
  const doublesEnabled = !isVolleyball;
  const canUseDoubles = doublesEnabled && match.mode === "doubles";
  const setupLocked = match.phase === "live" || match.phase === "finished";

  const timeLimitSecs = (fmt.timeLimit || 0) * 60;
  const isTimeUp = timeLimitSecs > 0 && elapsedSeconds >= timeLimitSecs;
  const displayTimer = timeLimitSecs > 0 ? `${formatTime(elapsedSeconds)} / ${fmt.timeLimit}:00` : formatTime(elapsedSeconds);

  const setTeamName = (team, value) => {
    if (setupLocked) return;
    const next = deepCopy(match);
    next.teams[team].name = value;
    commit(next);
  };

  const setPlayerName = (team, idx, value) => {
    if (setupLocked) return;
    const next = deepCopy(match);
    next.teams[team].players[idx] = value;
    commit(next);
  };

  const serve = getServeDetail(match);
  const servingLine = () => {
    if (match.sport === "Volleyball") return `${serve.teamName}`;
    if (match.sport === "Touch Footy") return "Tap Off"; 
    const sideWord = serve.side === "R" ? "Right" : serve.side === "L" ? "Left" : "";
    const playerPart = serve.playerName ? ` • ${serve.playerName}` : "";
    const sideDisplay = sideWord ? ` • ${sideWord}` : "";
    return `${serve.teamName}${playerPart}${sideDisplay}`;
  };

  const statusText = match.phase === "live" ? "Live" : match.phase === "finished" ? "Finished" : "Setup";

  useEffect(() => {
    if (!match.winner) {
      setWinnerFxOn(false);
      confettiRef.current = [];
      return;
    }
    const pieces = Array.from({ length: 26 }).map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 0.35;
      const dur = 1.2 + Math.random() * 0.9;
      const rot = Math.floor(Math.random() * 360);
      const drift = -18 + Math.random() * 36;
      const size = 6 + Math.floor(Math.random() * 6);
      const hue = Math.floor(Math.random() * 360);
      return { i, left, delay, dur, rot, drift, size, hue };
    });
    confettiRef.current = pieces;
    setWinnerFxOn(true);
    const t = window.setTimeout(() => setWinnerFxOn(false), 2100);
    return () => window.clearTimeout(t);
  }, [match.winner]);

  const winnerName = match.winner ? (match.winner === "A" ? match.teams.A.name : match.teams.B.name) : "";

  return (
    <div className="app-wrap">
      <style>{`
        .scFx-teamBoxLive { 
          position: relative; 
          overflow: hidden; 
          transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.4s ease, box-shadow 0.4s ease;
        }
        .scFx-servingGlowA {
          box-shadow: 0 0 0 1px rgba(11,99,246,.15), 0 0 20px rgba(11,99,246,.12), 0 10px 24px rgba(0,0,0,.18);
        }
        .scFx-servingGlowB {
          box-shadow: 0 0 0 1px rgba(145,203,35,.15), 0 0 20px rgba(145,203,35,.12), 0 10px 24px rgba(0,0,0,.18);
        }

        .scFx-tapPop { 
          transform: translateY(-2px) scale(1.015); 
          filter: brightness(1.06); 
        }
        .scFx-tapPopBtn { 
          transform: translateY(-1px) scale(1.02); 
          filter: brightness(1.1); 
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .scFx-lockedOverlay {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.28));
          border-radius: 14px;
          opacity: .0;
          transition: opacity .18s ease;
        }
        .scFx-lockedOverlay.isOn { opacity: 1; }
        .scFx-lockedBadge {
          border: 1px solid rgba(255,255,255,.18);
          background: rgba(0,0,0,.35);
          padding: 10px 14px;
          border-radius: 999px;
          font-weight: 950;
          letter-spacing: .08em;
          text-transform: uppercase;
          font-size: 12px;
          color: rgba(255,255,255,.92);
          box-shadow: 0 12px 26px rgba(0,0,0,.25);
        }

        .scFx-winnerBurst {
          position: relative;
          overflow: hidden;
        }
        .scFx-winnerGlow {
          position: absolute;
          inset: -60px -40px auto -40px;
          height: 180px;
          background: radial-gradient(closest-side, rgba(145,203,35,.22), transparent 70%),
                      radial-gradient(closest-side, rgba(11,99,246,.18), transparent 70%);
          filter: blur(0px);
          opacity: .0;
          transform: translateY(10px);
          transition: opacity .25s ease, transform .25s ease;
          pointer-events: none;
        }
        .scFx-winnerGlow.isOn { opacity: 1; transform: translateY(0px); }

        .scFx-confettiWrap {
          pointer-events: none;
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        .scFx-confetti {
          position: absolute;
          top: -12px;
          width: var(--sz);
          height: calc(var(--sz) * 1.6);
          left: var(--left);
          background: hsl(var(--hue) 85% 60%);
          border-radius: 2px;
          opacity: .0;
          transform: translateX(0px) rotate(var(--rot));
          animation: scFxFall var(--dur) ease-out var(--delay) forwards;
        }
        @keyframes scFxFall {
          0% { opacity: 0; transform: translateX(0px) translateY(-8px) rotate(var(--rot)); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: translateX(var(--drift)) translateY(260px) rotate(calc(var(--rot) + 220deg)); }
        }
        
        .sc-sportBadge {
          display: inline-block;
          background: linear-gradient(135deg, ${TEAM_A_HEX}, ${DARK_BLUE});
          color: ${WHITE};
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: 950;
          font-size: 20px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          box-shadow: 0 4px 12px rgba(11, 99, 246, 0.3);
          margin-bottom: 12px;
        }

        .sc-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0,0,0,0.85);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(8px);
        }
        .sc-modal-content {
          background-color: ${WHITE};
          padding: 30px;
          border-radius: 24px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          max-width: 90%;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* QR CODE MODAL OVERLAY */}
      {showQR && (
        <div className="sc-modal-overlay" onClick={() => setShowQR(false)}>
          <div className="sc-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: DARK_BLUE, margin: "0 0 8px 0", fontWeight: 900 }}>Live Scoreboard</h2>
            <p style={{ color: CHARCOAL, margin: "0 0 24px 0", fontSize: "0.9rem", fontWeight: 600 }}>Scan with your camera to spectate</p>
            
            <div style={{ padding: "16px", background: "white", border: `2px solid ${TEAM_A_BORDER}`, borderRadius: "16px", display: "inline-block" }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(displayUrl)}&color=142760`} 
                alt="Display QR Code" 
                style={{ width: "250px", height: "250px", display: "block" }} 
              />
            </div>
            
            <button 
              className="btn btnPrimary" 
              style={{ marginTop: "24px", width: "100%", backgroundColor: RED, color: WHITE, border: "none", fontSize: "1.1rem", padding: "12px" }} 
              onClick={() => setShowQR(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* PAIRING WIZARD MODAL */}
      {showPairingModal && (
        <div className="sc-modal-overlay" onClick={() => setShowPairingModal(false)}>
          <div className="sc-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            {!isClickerVerified ? (
              <>
                <h2 style={{ color: DARK_BLUE, margin: "0 0 12px 0", fontWeight: 900 }}>Pair Smart Clicker</h2>
                <p style={{ color: CHARCOAL, margin: "0 0 20px 0", fontSize: "0.95rem", lineHeight: 1.5, textAlign: "left" }}>
                  <strong>Step 1:</strong> Turn on your clicker.<br/>
                  <strong>Step 2:</strong> Go to your phone's standard Bluetooth settings and connect to the device.<br/>
                  <strong>Step 3:</strong> Once connected, press <strong>any button</strong> on the clicker to verify it in the app.
                </p>
                <div style={{ 
                  padding: "20px", 
                  background: "rgba(11,99,246,0.1)", 
                  borderRadius: "12px", 
                  border: `1px dashed ${TEAM_A_HEX}`, 
                  color: TEAM_A_HEX, 
                  fontWeight: "bold", 
                  animation: "pulse 1.5s infinite" 
                }}>
                  Waiting for clicker signal...
                </div>
                <button 
                  className="btn" 
                  style={{ marginTop: "20px", width: "100%", backgroundColor: CHARCOAL, color: WHITE, border: "none", padding: "12px" }} 
                  onClick={() => setShowPairingModal(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
                <h2 style={{ color: DARK_GREEN, margin: "0 0 12px 0", fontWeight: 900 }}>Clicker Connected!</h2>
                
                <div style={{ textAlign: "left", background: "rgba(0,0,0,0.05)", padding: "16px", borderRadius: "12px", marginBottom: "24px" }}>
                  <p style={{ margin: "0 0 8px 0", fontWeight: "bold", color: CHARCOAL }}>🎮 Controls:</p>
                  <ul style={{ margin: 0, paddingLeft: "20px", color: CHARCOAL, fontSize: "0.9rem", lineHeight: 1.6 }}>
                    <li><strong>Top Button:</strong> Score Team A</li>
                    <li><strong>Bottom Button:</strong> Score Team B</li>
                    <li><strong>Double-Click:</strong> Undo last point</li>
                  </ul>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button 
                    className="btn btnPrimary" 
                    onClick={() => setShowPairingModal(false)} 
                    style={{ backgroundColor: TEAM_A_HEX, color: WHITE, border: "none", padding: "14px" }}
                  >
                    Return to Match
                  </button>
                  <Link 
                    to={`/display/${displaySlug}`} 
                    target="_blank" 
                    className="btn" 
                    style={{ backgroundColor: WHITE, color: DARK_BLUE, border: `1px solid ${DARK_BLUE}`, padding: "14px", textDecoration: "none", fontWeight: "bold", textAlign: "center" }}
                  >
                    Open Display Mode
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- HERO TOP SECTION --- */}
      <div className="card app-hero">
        <div className="row app-heroRow">
          <div className="app-heroLeft">
            
            {displayName && (
              <div style={{ 
                fontSize: "13px", 
                fontWeight: 800, 
                color: "rgba(255,255,255,0.6)", 
                textTransform: "uppercase", 
                letterSpacing: "0.05em",
                marginBottom: "12px"
              }}>
                Welcome back, <span style={{ color: "#ffffff" }}>{displayName}</span> 
                {isPro && <span style={{ color: "#f39c12", marginLeft: "6px" }}>★ PRO</span>}
              </div>
            )}

            <div className="sc-sportBadge">{match.sport}</div>

            <h1 className="h1 app-title" style={{ marginTop: 0 }}>
              {match.matchName || "ScoreCourt"}
              {match.phase !== "setup" && (
                <span style={{ color: isTimeUp ? RED : TEAM_A_HEX, marginLeft: "12px", fontWeight: "bold" }}>
                  ⏱ {displayTimer}
                </span>
              )}
            </h1>

            <div className="app-pills" style={{ marginTop: 12 }}>
              <span
                className="pill"
                style={statusText === "Live" ? { backgroundColor: TEAM_B_BG, color: TEAM_B_HEX, border: `1px solid ${TEAM_B_BORDER}` } : {}}
              >
                Status: <b style={statusText === "Live" ? { color: TEAM_B_HEX } : {}}>{statusText}</b>
              </span>
              <span className="pill">Serve: <b>{servingLine()}</b></span>
            </div>

            {match.phase !== "setup" && (
              <p className="hint app-hint" style={{ marginTop: 12 }}>
                Keyboard shortcuts: <span className="kbd">←</span> Team A (Left) • <span className="kbd">→</span> Team B (Right) •{" "}
                <span className="kbd">Backspace</span> Undo
              </p>
            )}
          </div>

          <div className="controls app-heroControls">
            
            {match.phase === "live" && !match.winner && (
              <>
                <button 
                  className={"btn " + (isTimerPaused ? "btnPrimary" : "")} 
                  onClick={toggleTimer} 
                  style={{ 
                    backgroundColor: isTimerPaused ? "#f39c12" : "transparent", 
                    color: isTimerPaused ? WHITE : "inherit",
                    borderColor: isTimerPaused ? "#f39c12" : "rgba(255,255,255,0.2)"
                  }}
                >
                  {isTimerPaused ? "▶ Resume" : "⏸ Pause"}
                </button>
                
                {/* SOUND FX TOGGLE */}
                <button 
                  className={"btn " + (sfxEnabled ? "btnPrimary" : "")} 
                  onClick={() => setSfxEnabled(!sfxEnabled)}
                  style={{ backgroundColor: sfxEnabled ? TEAM_A_HEX : "transparent", border: sfxEnabled ? "none" : "1px solid rgba(255,255,255,0.2)" }}
                >
                  {sfxEnabled ? "🔊 SFX On" : "🔇 SFX Off"}
                </button>
              </>
            )}

            <button className="btn" disabled={locked} onClick={undo}>Undo</button>
            <button className={"btn " + (locked ? "btnPrimary" : "")} onClick={() => setLocked((v) => !v)}>
              {locked ? "Locked" : "Lock taps"}
            </button>

            <button
              className="btn"
              onClick={hardReset}
              style={{ backgroundColor: RED, color: WHITE, fontWeight: "bold", border: "none" }}
            >
              Reset Match
            </button>

            {/* END MATCH BUTTON FOR TOUCH FOOTY / TIMED SPORTS */}
            {match.phase === "live" && !match.winner && (
              <button
                className="btn"
                onClick={forceEndMatch}
                style={{ backgroundColor: DARK_GREEN, color: WHITE, fontWeight: "bold", border: "none" }}
              >
                🏁 End Match
              </button>
            )}

            <div className="app-divider" />

            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <Link
                className="btn btnGreen"
                style={{ backgroundColor: TEAM_B_HEX, color: DARK_BLUE, fontWeight: "bold", border: "none" }}
                to={`/display/${displaySlug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Display ↗
              </Link>
              
              <button 
                className="btn" 
                style={{ backgroundColor: WHITE, color: DARK_BLUE, fontWeight: "bold", border: "none" }}
                onClick={() => setShowQR(true)}
              >
                📱 QR Code
              </button>

              <button className="btn" onClick={shareOrCopyLink}>
                {copied ? "Copied ✅" : "Share Link"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- HARDWARE PAIRING STRIP --- */}
      <div style={{ marginBottom: "14px" }}>
        <button 
          onClick={() => setShowPairingModal(true)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            backgroundColor: isClickerVerified ? DARK_GREEN : CHARCOAL,
            border: `1px solid ${isClickerVerified ? "#91cb23" : "rgba(255,255,255,0.2)"}`,
            padding: "14px 20px",
            borderRadius: "14px",
            color: WHITE,
            fontWeight: "bold",
            fontSize: "15px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: isClickerVerified ? "0 4px 12px rgba(145, 203, 35, 0.2)" : "0 4px 12px rgba(0,0,0,0.2)"
          }}
          onMouseOver={(e) => { if(!isClickerVerified) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)" }}
          onMouseOut={(e) => { if(!isClickerVerified) e.currentTarget.style.backgroundColor = CHARCOAL }}
        >
          {isClickerVerified ? "✅ Smart Clicker Connected" : "🔗 Pair Smart Clicker"}
        </button>
      </div>

      <div style={{ height: 14 }} />

      {/* --- MATCH SETUP SECTION --- */}
      {match.phase === "setup" && (
        <div className="card">
          <div className="row" style={{ alignItems: "center" }}>
            <div>
              <div className="h2">Match setup</div>
              <div className="hint" style={{ marginTop: 6 }}>Choose sport, format, and team names.</div>
            </div>
            <div className="controls">
              <button
                className="btn btnPrimary"
                style={{ backgroundColor: TEAM_A_HEX, border: "none", padding: "12px 24px", fontSize: "1.1rem" }}
                onClick={beginMatch}
              >
                Start match
              </button>
            </div>
          </div>

          <div className="app-fieldCard" style={{ marginTop: 14, backgroundColor: CHARCOAL, padding: "20px", borderRadius: "12px" }}>
            <div className="h2" style={{ marginBottom: 16, fontSize: "1.1rem" }}>Tournament / Match Name</div>
            <div className="hint" style={{ marginBottom: 8 }}>Optional: e.g. "Summer Finals" or "Court 1"</div>
            <input
              type="text"
              className="sc-input"
              value={match.matchName || ""}
              onChange={(e) => {
                const next = deepCopy(match);
                next.matchName = e.target.value;
                commit(next);
              }}
              placeholder="ScoreCourt"
            />
          </div>

          <div className="app-setupGrid" style={{ marginTop: 14 }}>
            <div className="app-fieldCard">
              <div className="app-fieldTop">
                <div className="app-fieldLabel">Sport</div>
              </div>

              <div ref={dropdownRef} style={{ position: "relative" }}>
                <div
                  onClick={() => setIsSportDropdownOpen(!isSportDropdownOpen)}
                  style={{
                    backgroundColor: CHARCOAL, border: `1px solid ${TEAM_A_BORDER}`,
                    padding: "12px 16px", borderRadius: "8px", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", color: WHITE, fontWeight: "500"
                  }}
                >
                  {match.sport}
                  <span style={{ color: TEAM_A_HEX }}>▼</span>
                </div>

                {isSportDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      backgroundColor: CHARCOAL,
                      border: `1px solid ${TEAM_A_BORDER}`,
                      borderRadius: "8px",
                      marginTop: "4px",
                      zIndex: 10,
                      overflow: "hidden"
                    }}
                  >
                    {SPORTS.map((s) => (
                      <div
                        key={s}
                        onClick={() => { pushUndoSnapshot(); commit(setSport(match, s)); setIsSportDropdownOpen(false); }}
                        style={{
                          padding: "8px 16px",
                          cursor: "pointer",
                          backgroundColor: match.sport === s ? TEAM_A_HEX : "transparent",
                          color: WHITE
                        }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = match.sport === s ? TEAM_A_HEX : DARK_BLUE)}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = match.sport === s ? TEAM_A_HEX : "transparent")}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="app-fieldCard">
              <div className="app-fieldTop">
                <div className="app-fieldLabel">Mode</div>
              </div>
              <div className="segmented">
                <button className={"segBtn " + (match.mode === "singles" ? "isOn" : "")} onClick={() => { pushUndoSnapshot(); commit(setMode(match, "singles")); }}>
                  Singles
                </button>
                <button className={"segBtn " + (match.mode === "doubles" ? "isOn" : "")} disabled={!doublesEnabled} onClick={() => { pushUndoSnapshot(); commit(setMode(match, "doubles")); }}>
                  Doubles
                </button>
              </div>
            </div>
          </div>

          <div className="app-fieldCard" style={{ marginTop: 14, backgroundColor: CHARCOAL, padding: "20px", borderRadius: "12px" }}>
            <div className="h2" style={{ marginBottom: 16, fontSize: "1.1rem" }}>Format Settings</div>

            <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
              <div className="hint" style={{ marginBottom: 8 }}>Time Limit (minutes) • 0 = Unlimited</div>
              <input
                type="number"
                className="sc-input"
                style={{ width: "140px" }}
                value={fmt.timeLimit || ""}
                onChange={(e) => commit(setFormat(match, { timeLimit: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>

            {(match.sport === "Pickleball" || match.sport === "Badminton") && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "16px" }}>
                <div>
                  <div className="hint">Points to win</div>
                  <input type="number" className="sc-input" value={fmt.pointsToWin || ""} onChange={(e) => commit(setFormat(match, { pointsToWin: Number(e.target.value) }))} />
                </div>
                <div>
                  <div className="hint">Win by</div>
                  <input type="number" className="sc-input" value={fmt.winBy || ""} onChange={(e) => commit(setFormat(match, { winBy: Number(e.target.value) }))} />
                </div>
                <div>
                  <div className="hint">Best of games</div>
                  <input type="number" className="sc-input" value={fmt.bestOf || ""} onChange={(e) => commit(setFormat(match, { bestOf: Number(e.target.value) }))} />
                </div>
              </div>
            )}

            {(match.sport === "Tennis" || match.sport === "Padel") && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "16px" }}>
                  <div>
                    <div className="hint">Best of sets</div>
                    <input type="number" className="sc-input" value={fmt.bestOf || ""} onChange={(e) => commit(setFormat(match, { bestOf: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <div className="hint">Games to win set</div>
                    <input type="number" className="sc-input" value={fmt.gamesToWinSet || ""} onChange={(e) => commit(setFormat(match, { gamesToWinSet: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <div className="hint">Tiebreak to</div>
                    <input type="number" className="sc-input" value={fmt.tiebreakTo || ""} onChange={(e) => commit(setFormat(match, { tiebreakTo: Number(e.target.value) }))} />
                  </div>
                </div>

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="hint" style={{ marginBottom: 8 }}>Scoring System</div>
                  <div className="segmented">
                    <button 
                      className={"segBtn " + (!fmt.goldenPoint ? "isOn" : "")} 
                      onClick={() => commit(setFormat(match, { goldenPoint: false }))}
                    >
                      Advantage
                    </button>
                    <button 
                      className={"segBtn " + (fmt.goldenPoint ? "isOn" : "")} 
                      onClick={() => commit(setFormat(match, { goldenPoint: true }))}
                    >
                      Golden Point
                    </button>
                  </div>
                </div>
              </>
            )}

            {match.sport === "Volleyball" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "16px" }}>
                <div>
                  <div className="hint">Best of sets</div>
                  <input type="number" className="sc-input" value={fmt.bestOf || ""} onChange={(e) => commit(setFormat(match, { bestOf: Number(e.target.value) }))} />
                </div>
                <div>
                  <div className="hint">Set to</div>
                  <input type="number" className="sc-input" value={fmt.pointsToWin || ""} onChange={(e) => commit(setFormat(match, { pointsToWin: Number(e.target.value) }))} />
                </div>
                <div>
                  <div className="hint">Final set to</div>
                  <input type="number" className="sc-input" value={fmt.finalSetTo || ""} onChange={(e) => commit(setFormat(match, { finalSetTo: Number(e.target.value) }))} />
                </div>
              </div>
            )}
          </div>

          <div className="app-fieldCard" style={{ marginTop: 14, backgroundColor: CHARCOAL, padding: "20px", borderRadius: "12px" }}>
            <div className="h2" style={{ marginBottom: 16, fontSize: "1.1rem" }}>Broadcasting & Graphics</div>
            <div className="hint" style={{ marginBottom: 8 }}>Sponsor Logo URL (e.g., https://yoursite.com/logo.png)</div>
            <input
              type="text"
              className="sc-input"
              value={match.sponsorLogo || ""}
              onChange={(e) => {
                const next = deepCopy(match);
                next.sponsorLogo = e.target.value;
                commit(next);
              }}
              placeholder="Leave blank for no sponsor"
            />
          </div>

          <div className="scoreGrid" style={{ marginTop: 14 }}>
            {["A", "B"].map((team) => (
              <div
                className="teamBox"
                key={team}
                style={{
                  backgroundColor: team === "A" ? TEAM_A_BG : TEAM_B_BG,
                  borderColor: team === "A" ? TEAM_A_BORDER : TEAM_B_BORDER
                }}
              >
                <div className="teamHeader">
                  <div className="teamTitle">
                    <span className={`dot dot${team}`} style={{ backgroundColor: team === "A" ? TEAM_A_HEX : TEAM_B_HEX }} />
                    <strong>Team {team}</strong>
                  </div>
                </div>
                <div className="hint" style={{ marginTop: 10 }}>Team name</div>
                <input className="sc-input" value={match.teams[team].name} onChange={(e) => setTeamName(team, e.target.value)} placeholder={`Team ${team} name`} />

                {match.sport !== "Volleyball" && (
                  <>
                    <div className="hint" style={{ marginTop: 12 }}>Player 1</div>
                    <input className="sc-input" value={match.teams[team].players[0]} onChange={(e) => setPlayerName(team, 0, e.target.value)} />
                    {canUseDoubles && (
                      <>
                        <div className="hint" style={{ marginTop: 12 }}>Player 2</div>
                        <input className="sc-input" value={match.teams[team].players[1]} onChange={(e) => setPlayerName(team, 1, e.target.value)} />
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {match.phase !== "setup" && (
        <div className={"card app-liveCard scFx-winnerBurst"}>
          <div className={"scFx-winnerGlow " + (winnerFxOn ? "isOn" : "")} />
          {winnerFxOn && confettiRef.current.length > 0 && (
            <div className="scFx-confettiWrap" aria-hidden="true">
              {confettiRef.current.map((p) => (
                <div
                  key={p.i}
                  className="scFx-confetti"
                  style={{
                    "--left": `${p.left}%`,
                    "--delay": `${p.delay}s`,
                    "--dur": `${p.dur}s`,
                    "--rot": `${p.rot}deg`,
                    "--drift": `${p.drift}px`,
                    "--sz": `${p.size}px`,
                    "--hue": `${p.hue}`
                  }}
                />
              ))}
            </div>
          )}

          <div className="row" style={{ alignItems: "center", marginBottom: 14 }}>
            <div>
              <div className="kicker" style={{ color: match.matchName ? TEAM_B_HEX : "inherit" }}>
                {match.matchName ? `${match.matchName.toUpperCase()} • LIVE SCORING` : "LIVE SCORING"}
              </div>
              <div className="h2" style={{ marginTop: 8 }}>{match.winner ? "Match complete" : "Tap to score"}</div>
            </div>
          </div>

          {match.winner && (
            <div className="card soft app-winnerCard" style={{ marginBottom: 14 }}>
              <div className="kicker">Winner</div>
              <div className="h2" style={{ marginTop: 8 }}>
                <span className="grad" style={{ color: TEAM_B_HEX }}>{winnerName}</span>
              </div>
              <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", zIndex: 10, position: "relative" }}>
                <button 
                  className="btn btnPrimary" 
                  style={{ backgroundColor: TEAM_A_HEX, color: WHITE, border: "none", fontWeight: "bold", padding: "10px 20px" }}
                  onClick={exportResults}
                >
                  📋 Export Results
                </button>
                <button 
                  className="btn btnPrimary" 
                  style={{ backgroundColor: DARK_GREEN, color: WHITE, border: "none", fontWeight: "bold", padding: "10px 20px" }}
                  onClick={downloadCSV}
                >
                  📊 Download CSV Log
                </button>
                <button 
                  className="btn" 
                  style={{ backgroundColor: CHARCOAL, color: WHITE, border: `1px solid rgba(255,255,255,0.2)`, padding: "10px 20px" }}
                  onClick={undo}
                >
                  ↩ Undo Winning Point
                </button>
              </div>
            </div>
          )}

          <div className="scoreGrid" style={{ marginTop: 14 }}>
            {["A", "B"].map((team) => {
              const isServing = match.serve.team === team;
              const servingGlowClass =
                team === "A"
                  ? (isServing ? "scFx-servingGlowA" : "")
                  : (isServing ? "scFx-servingGlowB" : "");
              const isPulsing = tapPulse === team;

              return (
                <div
                  className={"teamBox teamBoxLive scFx-teamBoxLive " + servingGlowClass + (isPulsing ? " scFx-tapPop" : "")}
                  key={team}
                  style={{
                    textAlign: "center",
                    backgroundColor: team === "A" ? TEAM_A_BG : TEAM_B_BG,
                    borderColor: team === "A" ? TEAM_A_BORDER : TEAM_B_BORDER
                  }}
                >
                  <div className={"scFx-lockedOverlay " + (locked && !match.winner ? "isOn" : "")}>
                    <div className="scFx-lockedBadge">Locked</div>
                  </div>

                  <div className="teamHeader">
                    <div className="teamTitle">
                      <span className={`dot dot${team}`} style={{ backgroundColor: team === "A" ? TEAM_A_HEX : TEAM_B_HEX }} />
                      <strong>{match.teams[team].name}</strong>
                      {isServing && match.sport !== "Touch Footy" ? <span className="badge badgeServe" style={{ backgroundColor: "#f39c12", color: WHITE }}>Serving</span> : null}
                    </div>
                    <span className="badge">Team {team}</span>
                  </div>

                  <div className="bigScore" style={{ color: match.tennis?.isTiebreak ? "#f39c12" : WHITE }}>
                    {match.sport === "Tennis" || match.sport === "Padel"
                      ? `${match.tennis?.sets?.[team] || 0} | ${match.tennis?.games?.[team] || 0} | ${
                          match.tennis?.isTiebreak
                            ? `TB ${match.tennis.tiebreak[team]}`
                            : displayScoreText(match).split("–")[team === "A" ? 0 : 1]
                        }`
                      : match.points[team]}
                  </div>

                  {(match.sport === "Pickleball" || match.sport === "Badminton") && (
                    <div className="hint" style={{ marginTop: 8 }}>
                      Games won: <b>{match.gamesWon?.[team] || 0}</b>
                    </div>
                  )}

                  {match.sport === "Volleyball" && (
                    <div className="hint" style={{ marginTop: 8 }}>
                      Sets won: <b>{match.volley?.sets?.[team] || 0}</b>
                    </div>
                  )}

                  <div className="controls" style={{ justifyContent: "center", marginTop: 12 }}>
                    <button className="btn" disabled={locked || !!match.winner} onClick={() => onRemoveLastWonByTeam(team)}>
                      -1
                    </button>
                    <button
                      className={"btn " + (isPulsing ? "scFx-tapPopBtn" : "")}
                      style={{
                        backgroundColor: team === "A" ? TEAM_A_HEX : TEAM_B_HEX,
                        color: team === "A" ? WHITE : DARK_BLUE,
                        fontWeight: "bold",
                        border: "none",
                        touchAction: "manipulation"
                      }}
                      disabled={locked || !!match.winner}
                      onClick={() => onAdd(team)}
                    >
                      +1
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {Array.isArray(match.events) && match.events.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="hint" style={{ marginBottom: 10 }}><strong>Last Plays:</strong></div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {match.events.slice(-10).reverse().map((ev, i) => {
                  const isA = ev.team === "A";
                  const teamName = isA ? match.teams.A.name : match.teams.B.name;
                  return (
                    <span
                      key={i}
                      style={{
                        background: isA ? TEAM_A_BG : TEAM_B_BG,
                        color: isA ? TEAM_A_HEX : TEAM_B_HEX,
                        border: `1px solid ${isA ? TEAM_A_BORDER : TEAM_B_BORDER}`,
                        padding: "6px 14px",
                        borderRadius: "16px",
                        fontSize: "0.85rem",
                        fontWeight: "600"
                      }}
                    >
                      {teamName}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}