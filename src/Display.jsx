import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { supabase } from "./supabaseClient";
import useClicker from "./useClicker"; 
import { displayScoreText, getServeDetail, getMatchAlert, addRally, undoLastRally } from "./sportRules"; 

const COLORS = {
  white: "#ffffff",
  blue: "#0b63f6",
  darkBlue: "#142760",
  green: "#91cb23",
  charcoal: "#353839",
  black: "#000000",
  red: "#D32F2F",
  gold: "#f39c12"
};

const LOGO_URL = "https://i.imgur.com/tsQkz9g.png";
const STATE_KEY = "scorecourt_state_v1";
const TIMER_KEY = "scorecourt_timer_v1";
const TIMER_ANCHOR_KEY = "scorecourt_timer_anchor_v1";
const TIMER_PAUSED_KEY = "scorecourt_timer_paused_v1";

const StandardFooter = () => (
  <div className="disp-footer-std">
    <img src={LOGO_URL} alt="ScoreCourt Logo" />
    <span>SCORECOURT OFFICIAL BROADCAST</span>
  </div>
);

const AlertFooter = ({ text, textColor, icon }) => (
  <div className="disp-footer-alert" style={{ color: textColor }}>
    <span>{icon}</span>
    <span>{text}</span>
    <span>{icon}</span>
  </div>
);

export default function Display() {
  const { slug } = useParams();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();
  
  // Detect if we are in OBS Livestream mode
  const isOverlayMode = new URLSearchParams(location.search).get("overlay") === "true";
  
  const isCloudMode = Boolean(slug && slug !== 'demo');

  const userSlug = useMemo(() => {
    if (!user?.id) return null;
    return user.id.replace(/\D/g, '').padEnd(6, '0').substring(0, 6);
  }, [user]);

  const isOwnDisplay = !slug || slug === 'demo' || slug === userSlug;

  const [match, setMatch] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("loading");

  const [flashKey, setFlashKey] = useState("");
  const prevMatchRef = useRef(null);

  // ==========================================
  // HYBRID SCORING ENGINE (Display Acts as Console)
  // ==========================================
  
  const syncScoreToCloud = async (nextMatch) => {
    // 1. Save locally to the device
    const localKey = `${STATE_KEY}_${user?.id || "guest"}`;
    localStorage.setItem(localKey, JSON.stringify(nextMatch));
    
    // 2. Beam to the cloud if Pro
    if (isCloudMode && profile?.is_pro && user?.id) {
      try {
        await supabase.from('broadcasts').upsert({
          room_code: slug,
          user_id: user.id,
          match_state: nextMatch,
          elapsed_seconds: elapsedSeconds,
          updated_at: new Date().toISOString()
        }, { onConflict: 'room_code' });
      } catch (err) {
        console.error("Sync error:", err);
      }
    }
  };

  const handleClickerScore = (team) => {
    if (!match || match.phase !== "live" || match.winner) return;
    const nextMatch = addRally(match, team);
    setMatch(nextMatch);
    syncScoreToCloud(nextMatch);
  };

  const handleClickerUndo = () => {
    if (!match || match.phase !== "live" || match.winner) return;
    const nextMatch = undoLastRally(match);
    setMatch(nextMatch);
    syncScoreToCloud(nextMatch);
  };

  // Wire up the hardware clicker directly to this Display page!
  useClicker({
    onTeamA: () => handleClickerScore("A"),
    onTeamB: () => handleClickerScore("B"),
    onUndo: handleClickerUndo,
    isLive: match?.phase === "live" && !match?.winner,
    isLocked: false 
  });

  // ==========================================
  // CLOUD MODE RECEIVER (DUAL-ENGINE)
  // ==========================================
  useEffect(() => {
    if (!isCloudMode || (isOwnDisplay && !profile?.is_pro)) return;

    const fetchBroadcast = async () => {
      try {
        const { data, error } = await supabase
          .from('broadcasts')
          .select('*')
          .eq('room_code', slug)
          .maybeSingle();

        if (error || !data) {
          setCloudStatus("not_found");
        } else {
          setMatch(data.match_state);
          setElapsedSeconds(data.elapsed_seconds || 0);
          setCloudStatus("live");
        }
      } catch (err) {
        console.error("Failed to fetch broadcast", err);
        setCloudStatus("not_found");
      }
    };

    fetchBroadcast();

    const channel = supabase
      .channel(`room_${slug}`)
      .on(
        'broadcast',
        { event: 'score_update' },
        (payload) => {
          if (payload.payload) {
            setMatch(payload.payload.match_state);
            setElapsedSeconds(payload.payload.elapsed_seconds || 0);
            setCloudStatus("live");
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'broadcasts', filter: `room_code=eq.${slug}` },
        (payload) => {
          if (payload.new && payload.new.match_state) {
            setMatch(payload.new.match_state);
            setElapsedSeconds(payload.new.elapsed_seconds || 0);
            setCloudStatus("live");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug, isCloudMode, isOwnDisplay, profile?.is_pro]);

  useEffect(() => {
    let interval;
    if (isCloudMode && match?.phase === "live" && !match?.winner) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCloudMode, match?.phase, match?.winner]);


  // ==========================================
  // LOCAL MODE RECEIVER
  // ==========================================
  useEffect(() => {
    if (isCloudMode) return;

    const handleFsChange = () => {
      setIsFullscreen(
        !!document.fullscreenElement ||
        !!document.webkitFullscreenElement ||
        !!document.mozFullScreenElement ||
        !!document.msFullscreenElement
      );
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);

    const localKey = `${STATE_KEY}_${user?.id || "guest"}`;
    const localTimer = `${TIMER_KEY}_${user?.id || "guest"}`;

    try {
      const rawState = localStorage.getItem(localKey);
      if (rawState) setMatch(JSON.parse(rawState));
      const rawTimer = localStorage.getItem(localTimer);
      if (rawTimer) setElapsedSeconds(parseInt(rawTimer, 10) || 0);
    } catch (e) {
      console.error("Failed to parse initial storage", e);
    }

    const handleStorage = (event) => {
      if (event.key === localKey && event.newValue) {
        setMatch(JSON.parse(event.newValue));
      }
      if (event.key === localTimer && event.newValue) {
        setElapsedSeconds(parseInt(event.newValue, 10) || 0);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [isCloudMode, user]);

  useEffect(() => {
    let interval;
    const anchorKey = `${TIMER_ANCHOR_KEY}_${user?.id || "guest"}`;
    const pausedKey = `${TIMER_PAUSED_KEY}_${user?.id || "guest"}`;

    if (!isCloudMode && match?.phase === "live" && !match?.winner) {
      const isPaused = localStorage.getItem(pausedKey) === "true";
      if (!isPaused) {
        interval = setInterval(() => {
          const anchor = parseInt(localStorage.getItem(anchorKey), 10);
          if (anchor) {
            setElapsedSeconds(Math.floor((Date.now() - anchor) / 1000));
          }
        }, 500);
      }
    }
    return () => clearInterval(interval);
  }, [isCloudMode, match?.phase, match?.winner, user]);

  const triggerFullscreen = () => {
    const elem = document.documentElement;
    const isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    if (!isFs) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((e) => console.error(e));
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen(); 
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen(); 
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen(); 
      } else {
        alert("Fullscreen mode is blocked by this browser (like iOS Safari). Tap the Share button and select 'Add to Home Screen' for a full-screen app experience!");
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  const safeMatch = match || {};
  const sport = safeMatch.sport || "";
  const phase = safeMatch.phase || "setup";
  const isLive = phase === "live";
  const isTennisFamily = sport === "Tennis" || sport === "Padel";
  const serveDetail = getServeDetail && match ? getServeDetail(match) : { team: safeMatch.serve?.team };

  const formatTime = (totalSeconds) => {
    if (!isLive) return "00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const streak = useMemo(() => {
    const evs = Array.isArray(safeMatch.events) ? safeMatch.events : [];
    if (evs.length === 0) return { team: null, count: 0 };

    let i = evs.length - 1;
    const lastTeam = evs[i]?.team;
    if (!lastTeam) return { team: null, count: 0 };

    let count = 0;
    while (i >= 0 && evs[i]?.team === lastTeam) {
      count += 1;
      i -= 1;
    }
    return { team: lastTeam, count };
  }, [safeMatch.events]);

  const hotStreakTeam = streak.count >= 4 ? streak.team : null;
  const hotStreakCount = streak.count >= 4 ? streak.count : 0;

  const computeMoments = useMemo(() => {
    const moments = {
      globalBanner: null,
      teamBadges: { A: [], B: [] },
      isTiebreak: match?.tennis?.isTiebreak || false
    };

    if (!match) return moments;

    if (match.winner) {
      const winnerName = match.teams?.[match.winner]?.name?.toUpperCase() || `TEAM ${match.winner}`;
      moments.globalBanner = { text: `🏆 ${winnerName} WINS 🏆`, tone: "gold", priority: 200, hideBolt: true };
      return moments; 
    }

    if (!isLive) return moments;

    const alertText = getMatchAlert(match);
    let alertTone = "red";
    
    if (alertText) {
      if (alertText === "TIEBREAK ACTIVE" || alertText === "DEUCE" || alertText === "ADVANTAGE" || alertText === "GOLDEN POINT") {
        alertTone = "gold";
      }
      moments.globalBanner = { text: alertText, tone: alertTone, priority: 100 };
    }

    if (!moments.globalBanner && hotStreakTeam && hotStreakCount >= 4) {
      const teamName = match.teams?.[hotStreakTeam]?.name?.toUpperCase() || `TEAM ${hotStreakTeam}`;
      moments.globalBanner = { text: `HOT STREAK (${teamName})`, tone: "blue", priority: 50 };
    }

    return moments;
  }, [match, isLive, hotStreakTeam, hotStreakCount]);

  const activeAlert = useMemo(() => {
    if (match?.winner) {
      const winnerName = match.teams?.[match.winner]?.name?.toUpperCase() || `TEAM ${match.winner}`;
      return { text: `${winnerName} WINS THE MATCH`, type: "win", icon: "🏆" };
    }
    if (!isLive) return null;
    const alertText = getMatchAlert(match);
    if (alertText) return { text: alertText, type: "alert", icon: "🚨" };
    return null;
  }, [isLive, match]);

  useEffect(() => {
    const prev = prevMatchRef.current;
    prevMatchRef.current = match;

    const prevWinner = prev?.winner || null;
    const currWinner = match?.winner || null;

    if (!prevWinner && currWinner) {
      setFlashKey("WIN_" + Date.now());
      return;
    }

    const prevText = prev ? String(displayScoreText(prev) || "") : "";
    const currText = match ? String(displayScoreText(match) || "") : "";
    if (prevText !== currText) setFlashKey("TXT_" + Date.now());
  }, [match]);

  const getScoreString = (teamId) => {
    if (!match) return "0 | 0";

    if (isTennisFamily) {
      const sets = match?.tennis?.sets?.[teamId] || 0;
      const games = match?.tennis?.games?.[teamId] || 0;

      if (match?.tennis?.isTiebreak) {
        const tb = match?.tennis?.tiebreak?.[teamId] ?? 0;
        return `${sets} | ${games} | TB ${tb}`;
      }

      const scoreStr = displayScoreText(match);
      const parts = String(scoreStr || "").split("–");
      const points = (parts[teamId === "A" ? 0 : 1] || "").trim() || "0";
      return `${sets} | ${games} | ${points}`;
    }

    const gamesWon = (sport === "Volleyball" ? match?.volley?.sets?.[teamId] : match?.gamesWon?.[teamId]) || 0;
    return `${gamesWon} | ${match.points?.[teamId] ?? 0}`;
  };

  const accentColor = (teamId) => (teamId === "A" ? COLORS.blue : COLORS.green);

  const getPanelStyle = (active, accent) => ({
    backgroundColor: active ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
    border: `3px solid ${active ? accent : "rgba(255,255,255,0.1)"}`,
    boxShadow: active ? `0 0 0 1px rgba(255,255,255,0.06), 0 18px 44px rgba(0,0,0,.35)` : "none"
  });

  const getBannerStyle = (tone) => {
    const bg = tone === "red" ? COLORS.red : tone === "gold" ? COLORS.gold : tone === "blue" ? COLORS.blue : "rgba(255,255,255,0.12)";
    const color = tone === "gold" ? COLORS.black : COLORS.white;
    const animation = tone === "red" ? "pulse 1.1s infinite" : "none";
    return { background: bg, color, animation };
  };

  const getFooterStyle = (alertType) => ({
    backgroundColor: alertType === "win" ? COLORS.gold : alertType === "alert" ? COLORS.red : COLORS.black,
    borderTop: `4px solid ${alertType === "win" ? COLORS.white : alertType === "alert" ? COLORS.white : COLORS.blue}`
  });

  // ==========================================
  // FULL SCREEN EARLY RETURNS
  // ==========================================
  const fullScreenCenterStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
    padding: '40px',
    boxSizing: 'border-box',
    overflow: 'hidden'
  };

  if (authLoading) {
    return (
      <div style={fullScreenCenterStyle}>
        <h2 style={{ opacity: 0.7 }}>Loading ScoreCourt Broadcast...</h2>
      </div>
    );
  }

  if (isOwnDisplay && (!user || !profile?.is_pro)) {
    return (
      <div style={fullScreenCenterStyle}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '60px',
          maxWidth: '600px',
          textAlign: 'center',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(20px)',
          color: COLORS.white
        }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🔒</span>
          <h1 style={{ margin: '0 0 16px', fontSize: '36px', fontWeight: '950', letterSpacing: '-0.02em' }}>
            Pro Feature Locked
          </h1>
          <p style={{ margin: '0 0 32px', fontSize: '18px', opacity: 0.8, lineHeight: 1.5 }}>
            Broadcasting live scores to a secondary Display is exclusively available to ScoreCourt Pro members. Upgrade your account to unlock full venue capabilities.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {!user && (
              <Link to="/auth" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: COLORS.white, padding: '16px 32px', borderRadius: '12px', fontWeight: '900', textDecoration: 'none', fontSize: '16px' }}>Log In</Link>
            )}
            <Link to="/store" style={{ background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.darkBlue})`, color: COLORS.white, padding: '16px 32px', borderRadius: '12px', fontWeight: '900', textDecoration: 'none', fontSize: '16px' }}>Upgrade to Pro</Link>
            <Link to="/" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: COLORS.white, padding: '16px 32px', borderRadius: '12px', fontWeight: '900', textDecoration: 'none', fontSize: '16px' }}>Return to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (isCloudMode && cloudStatus === "loading") {
    return (
      <div style={fullScreenCenterStyle}>
        <h2 style={{ opacity: 0.7 }}>Connecting to ScoreCourt Broadcast...</h2>
      </div>
    );
  }

  if (isCloudMode && cloudStatus === "not_found") {
    return (
      <div style={fullScreenCenterStyle}>
        <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(211, 47, 47, 0.1)', border: `1px solid ${COLORS.red}`, borderRadius: '20px' }}>
          <h1 style={{ fontSize: '32px', margin: '0 0 16px' }}>Broadcast Not Found</h1>
          <p style={{ opacity: 0.8, fontSize: '18px', margin: 0 }}>The URL is incorrect or the broadcast does not exist.</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN DISPLAY RETURN
  // ==========================================
  return (
    <div className={`disp-wrap ${isOverlayMode ? 'is-overlay' : ''}`} key={flashKey}>
      <style>{`
        .disp-wrap { position: fixed; inset: 0; background-color: #000; background-image: radial-gradient(circle at top right, #142760, #000); color: #fff; font-family: system-ui, sans-serif; display: flex; flex-direction: column; overflow: hidden; }
        
        /* OBS Overlay specific overrides */
        .disp-wrap.is-overlay { background: transparent !important; background-image: none !important; justify-content: flex-end; padding-bottom: 20px; }
        .disp-wrap.is-overlay .disp-header, .disp-wrap.is-overlay .disp-footer, .disp-wrap.is-overlay .disp-history { display: none !important; }
        .disp-wrap.is-overlay .disp-grid { flex: none; height: 35vh; margin-bottom: 20px; }
        .disp-wrap.is-overlay .disp-panel { background: rgba(0,0,0,0.65) !important; backdrop-filter: blur(12px); border-width: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.8) !important; }

        .disp-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: clamp(10px, 2vh, 15px) clamp(15px, 3vw, 50px); background: rgba(0,0,0,0.25); border-bottom: 1px solid rgba(255,255,255,0.1); }
        .disp-header-left { display: flex; align-items: center; gap: clamp(10px, 2vw, 20px); }
        .disp-logo { height: clamp(28px, 6vh, 60px); }
        .disp-sport-wrap { display: flex; flex-direction: column; justify-content: center; }
        .disp-sport { font-size: clamp(0.9rem, 2vw, 1.6rem); font-weight: 900; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        .disp-status { color: #91cb23; font-weight: 800; font-size: clamp(0.7rem, 1.5vw, 1.2rem); margin-top: 2px; }
        .disp-timer { font-size: clamp(1.8rem, 5vw, 3.5rem); font-weight: 900; font-family: monospace; text-align: center; line-height: 1; }
        
        .disp-header-right { display: flex; justify-content: flex-end; align-items: center; }
        .disp-sponsor-logo { height: clamp(28px, 6vh, 50px); max-width: 200px; object-fit: contain; margin-right: 20px; }

        .disp-btn-fs { background: transparent; border: 1px solid rgba(255,255,255,0.5); color: white; padding: clamp(6px, 1vh, 8px) clamp(10px, 2vw, 16px); border-radius: 6px; cursor: pointer; font-weight: bold; font-size: clamp(0.7rem, 1.5vw, 1rem); transition: all 0.2s; white-space: nowrap; }
        .disp-btn-fs:hover { background: rgba(255,255,255,0.1); border-color: white; }
        
        .disp-grid { display: grid; grid-template-columns: 1fr 1fr; flex: 1; margin: clamp(10px, 2vh, 20px) clamp(10px, 3vw, 40px); gap: clamp(10px, 3vw, 30px); position: relative; min-height: 0; }
        
        .disp-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(15px, 4vh, 35px); border-radius: clamp(16px, 4vw, 40px); height: 100%; transition: all 0.35s ease; position: relative; overflow: hidden; padding: clamp(15px, 3vh, 30px); }
        
        .disp-team-name { font-size: clamp(1.2rem, min(4vw, 6vh), 3rem); font-weight: 900; white-space: nowrap; color: #fff; z-index: 2; margin: 0; line-height: 1.2; text-align: center; }
        .disp-score { font-size: clamp(3rem, min(9vw, 18vh), 9.5rem); font-weight: 900; letter-spacing: -2px; white-space: nowrap; line-height: 1.1; z-index: 2; margin: 0; text-align: center; }
        
        .disp-serve-row { display: flex; align-items: center; justify-content: center; gap: clamp(6px, 1.5vw, 15px); z-index: 2; height: clamp(24px, 4vh, 40px); margin: 0; }
        .disp-player { color: #91cb23; font-size: clamp(0.8rem, min(2.5vw, 4vh), 1.8rem); font-weight: 800; text-transform: uppercase; white-space: nowrap; }
        .disp-sidebox { border: 2px solid #91cb23; padding: clamp(2px, 0.5vh, 4px) clamp(6px, 1.5vw, 12px); border-radius: 6px; color: #91cb23; font-size: clamp(0.6rem, min(1.5vw, 2.5vh), 1rem); font-weight: 900; }

        .disp-banner-wrap { position: absolute; top: clamp(-5px, -1.5vh, -15px); left: 50%; transform: translateX(-50%); z-index: 10; pointer-events: none; }
        .disp-banner { display: inline-flex; align-items: center; gap: 8px; padding: clamp(4px, 1vh, 10px) clamp(10px, 2vw, 18px); border-radius: 14px; font-weight: 950; letter-spacing: 0.1em; text-transform: uppercase; box-shadow: 0 18px 44px rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.22); white-space: nowrap; font-size: clamp(0.7rem, 2vw, 1.2rem); }

        .disp-shimmer { position: absolute; inset: 0; background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.06) 18%, transparent 40%); transform: translateX(-120%); animation: shimmer 2.4s ease-in-out infinite; opacity: 0.8; pointer-events: none; }
        
        .disp-history { position: absolute; bottom: clamp(60px, 12vh, 130px); left: 50%; transform: translateX(-50%); display: flex; gap: clamp(10px, 2vw, 20px); align-items: center; background: rgba(0,0,0,0.5); padding: clamp(6px, 1vh, 10px) clamp(15px, 3vw, 30px); border-radius: 40px; border: 1px solid rgba(255,255,255,0.1); }
        .disp-history-title { font-size: clamp(0.7rem, 1.5vw, 0.9rem); font-weight: 900; color: #0b63f6; letter-spacing: 2px; white-space: nowrap; }
        .disp-history-score { font-size: clamp(1rem, 2.5vw, 1.5rem); font-weight: 800; white-space: nowrap; }
        
        .disp-footer { height: clamp(40px, 10vh, 100px); display: flex; align-items: center; justify-content: center; overflow: hidden; transition: background-color 0.3s ease, border-color 0.3s ease; position: relative;}
        .disp-footer-std { display: flex; align-items: center; justify-content: center; gap: clamp(8px, 2vw, 24px); width: 100%; font-size: clamp(0.9rem, 2.5vw, 1.8rem); font-weight: 800; letter-spacing: 2px; }
        .disp-footer-std img { height: clamp(15px, 4vh, 40px); }
        .disp-footer-alert { display: flex; align-items: center; justify-content: center; gap: clamp(8px, 2vw, 24px); width: 100%; font-size: clamp(1rem, 3vw, 2.4rem); font-weight: 900; letter-spacing: 2px; }

        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.06); } 100% { transform: scale(1); } }
        @keyframes shimmer { 0% { transform: translateX(-120%); } 55% { transform: translateX(120%); } 100% { transform: translateX(120%); } }
      `}</style>

      {!match ? (
        <div style={{ flex: 1, backgroundColor: COLORS.black, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <p style={{ opacity: 0.5, fontSize: "1.2rem", fontWeight: "bold" }}>Waiting for match to start...</p>
        </div>
      ) : (
        <>
          <div className="disp-header">
            <div className="disp-header-left">
              <img src={LOGO_URL} alt="Logo" className="disp-logo" />
              <div className="disp-sport-wrap">
                <div className="disp-sport">
                  {sport.toUpperCase()}
                  {match.matchName && (
                    <>
                      <span style={{ opacity: 0.5 }}>•</span>
                      <span>{match.matchName.toUpperCase()}</span>
                    </>
                  )}
                </div>
                <div className="disp-status">
                  {match.winner ? "FINAL" : isLive ? "LIVE" : "SETUP"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <div className="disp-timer" style={{ color: isLive ? COLORS.white : "rgba(255,255,255,0.4)" }}>
                {formatTime(elapsedSeconds)}
              </div>
            </div>

            <div className="disp-header-right">
              {match.sponsorLogo && (
                <img src={match.sponsorLogo} alt="Sponsor" className="disp-sponsor-logo" />
              )}
              {!isFullscreen && !isOverlayMode && (
                <button onClick={triggerFullscreen} className="disp-btn-fs">
                  FULLSCREEN
                </button>
              )}
            </div>
          </div>

          <div className="disp-grid">
            {computeMoments.globalBanner && (
              <div className="disp-banner-wrap" aria-hidden="true">
                <div className="disp-banner" style={getBannerStyle(computeMoments.globalBanner.tone)}>
                  {!computeMoments.globalBanner.hideBolt && "⚡ "}{computeMoments.globalBanner.text}
                </div>
              </div>
            )}

            {["A", "B"].map((id) => {
              const isServing = serveDetail.team === id && !match.winner;
              const showShimmer = !match.winner && hotStreakTeam === id && hotStreakCount >= 4;

              let serverName = "PLAYER";
              if (isServing) {
                if (serveDetail.playerName && serveDetail.playerName.trim() !== "") {
                  serverName = serveDetail.playerName;
                } else {
                  const pIdx = serveDetail.playerIndex !== undefined ? serveDetail.playerIndex : (match.serve?.playerIndex || 0);
                  const pName = match.teams?.[id]?.players?.[pIdx];
                  if (pName && pName.trim() !== "") {
                    serverName = pName;
                  }
                }
              }

              return (
                <div key={id} className="disp-panel" style={getPanelStyle(isServing, accentColor(id))}>
                  {showShimmer && <div className="disp-shimmer" aria-hidden="true" />}

                  <div className="disp-team-name">
                    {showShimmer && <span style={{ color: COLORS.gold, marginRight: "12px" }}>⚡</span>}
                    {match.teams?.[id]?.name || `TEAM ${id}`}
                  </div>

                  <div className="disp-score">{getScoreString(id)}</div>

                  <div className="disp-serve-row" style={{ visibility: isServing ? "visible" : "hidden" }}>
                    <span className="disp-player">{serverName} SERVING</span>
                    {serveDetail.side && (
                      <div className="disp-sidebox">{serveDetail.side === "R" ? "RIGHT" : "LEFT"}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {match.history?.length > 0 && !isOverlayMode && (
            <div className="disp-history">
              <span className="disp-history-title">SET HISTORY</span>
              {match.history.map((h, i) => (
                <div key={i} className="disp-history-score">
                  {h.A}
                  <span style={{ opacity: 0.3, margin: "0 5px" }}>-</span>
                  {h.B}
                </div>
              ))}
            </div>
          )}

          <div className="disp-footer" style={getFooterStyle(activeAlert?.type)}>
            {isOverlayMode && match.sponsorLogo && (
               <img src={match.sponsorLogo} alt="Sponsor" style={{ position: 'absolute', left: '20px', height: '80%', objectFit: 'contain'}} />
            )}
            {activeAlert ? (
              <AlertFooter 
                text={activeAlert.text} 
                textColor={activeAlert.type === "win" ? COLORS.black : COLORS.white} 
                icon={activeAlert.icon} 
              />
            ) : (
              <StandardFooter />
            )}
          </div>
        </>
      )}
    </div>
  );
}