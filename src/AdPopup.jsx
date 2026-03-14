import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

// 🔴 CHANGE THIS TO FALSE BEFORE YOU PUSH TO VERCEL 🔴
const DEBUG_MODE = true; 

const ads = [
  { 
    id: 1, 
    title: "Tired of touching your phone?", 
    text: "Get the ScoreCourt Smart Clicker for seamless, uninterrupted scoring.", 
    cta: "Shop Hardware", 
    link: "/store", 
    type: "internal" 
  },
  { 
    id: 2, 
    title: "Take your game to the next level.", 
    text: "Upgrade to ScoreCourt Pro for ad-free scoring and cloud match history.", 
    cta: "Upgrade to Pro", 
    link: "/app", 
    type: "internal" 
  },
  { 
    id: 3, 
    title: "Play more than just Pickleball?", 
    text: "ScoreCourt supports Tennis, Padel, Badminton, and Volleyball.", 
    cta: "View Sports", 
    link: "/", 
    type: "internal" 
  },
  { 
    id: 4, 
    title: "Broadcast your match.", 
    text: "Cast the live scoreboard to a TV or share a QR code with spectators.", 
    cta: "Open Display Mode", 
    link: "/display", 
    type: "internal" 
  },
  { 
    id: 5, 
    title: "Running a club or tournament?", 
    text: "Organise a bulk hardware purchase and get priority technical support.", 
    cta: "Contact Us", 
    link: "mailto:info@scorecourt.com.au", 
    type: "external" 
  },
  { 
    id: 6, 
    title: "Want to reach active players?", 
    text: "Enquire about displaying your brand's advertisement right here.", 
    cta: "Enquire Now", 
    link: "mailto:info@scorecourt.com.au", 
    type: "external" 
  }
];

const AdPopup = () => {
  const { profile, loading } = useAuth();
  
  const [isVisible, setIsVisible] = useState(false);
  const [canDismiss, setCanDismiss] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [adIndex, setAdIndex] = useState(0);

  const autoCloseTimer = useRef(null);
  const nextAdTimer = useRef(null);
  const countdownTimer = useRef(null);

  const AD_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes
  const AD_DURATION_MS = 30 * 1000;     // 30 seconds

  const closeAd = () => {
    setIsVisible(false);
    localStorage.setItem('sc_last_ad_time', Date.now().toString());
    
    clearTimeout(autoCloseTimer.current);
    clearInterval(countdownTimer.current);

    if (DEBUG_MODE) {
      console.log("[AdPopup] Ad closed. DEBUG_MODE is on, bypassing 3-minute cooldown.");
      nextAdTimer.current = setTimeout(triggerAd, 5000); // Pops up again in 5 seconds for testing
    } else {
      console.log("[AdPopup] Ad closed. Next ad scheduled in 3 minutes.");
      nextAdTimer.current = setTimeout(triggerAd, AD_COOLDOWN_MS);
    }
  };

  const triggerAd = () => {
    // Safely get the next ad index, falling back to 0 if local storage is corrupted
    let nextIdx = parseInt(localStorage.getItem('sc_ad_index'), 10);
    if (isNaN(nextIdx) || nextIdx >= ads.length || nextIdx < 0) {
      nextIdx = 0;
    }
    
    setAdIndex(nextIdx);
    localStorage.setItem('sc_ad_index', ((nextIdx + 1) % ads.length).toString());

    console.log(`[AdPopup] Triggering Ad #${nextIdx + 1}: ${ads[nextIdx].title}`);

    setIsVisible(true);
    setCanDismiss(false);
    setCountdown(5);

    let ticks = 5;
    countdownTimer.current = setInterval(() => {
      ticks -= 1;
      setCountdown(ticks);
      if (ticks <= 0) {
        clearInterval(countdownTimer.current);
        setCanDismiss(true);
      }
    }, 1000);

    autoCloseTimer.current = setTimeout(() => {
      console.log("[AdPopup] 30 seconds reached. Auto-closing ad.");
      closeAd();
    }, AD_DURATION_MS);
  };

  useEffect(() => {
    if (loading) return; // Wait until AuthContext figures out who the user is

    if (DEBUG_MODE) {
      console.log("[AdPopup] DEBUG_MODE is ON. Bypassing Pro checks and forcing ad to show instantly.");
      nextAdTimer.current = setTimeout(triggerAd, 0);
      return () => {
        clearTimeout(autoCloseTimer.current);
        clearTimeout(nextAdTimer.current);
        clearInterval(countdownTimer.current);
      };
    }

    if (profile?.is_pro) {
      console.log("[AdPopup] User is PRO. Ad sequence aborted completely.");
      setIsVisible(false);
      return;
    }

    let lastAdTime = parseInt(localStorage.getItem('sc_last_ad_time'), 10);
    if (isNaN(lastAdTime)) lastAdTime = 0;

    const timeSinceLastAd = Date.now() - lastAdTime;

    if (timeSinceLastAd > AD_COOLDOWN_MS) {
      console.log("[AdPopup] Cooldown expired. Triggering ad instantly.");
      nextAdTimer.current = setTimeout(triggerAd, 0);
    } else {
      const timeRemaining = AD_COOLDOWN_MS - timeSinceLastAd;
      console.log(`[AdPopup] Ad is in cooldown. Next ad will appear in ${Math.round(timeRemaining / 1000)} seconds.`);
      nextAdTimer.current = setTimeout(triggerAd, timeRemaining);
    }

    return () => {
      clearTimeout(autoCloseTimer.current);
      clearTimeout(nextAdTimer.current);
      clearInterval(countdownTimer.current);
    };
  }, [loading, profile]);

  if (!isVisible || !ads[adIndex]) return null;

  const currentAd = ads[adIndex];

  return (
    <>
      <style>{`
        .sc-ad-popup {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 420px;
          background: rgba(17,24,39, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6);
          z-index: 9999;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: slideUpAd 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          color: #ffffff;
        }

        @keyframes slideUpAd {
          from { transform: translate(-50%, 120%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }

        .sc-ad-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .sc-ad-badge {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          background: rgba(255,255,255,0.1);
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 800;
          color: rgba(255,255,255,0.7);
        }

        .sc-ad-close {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          color: #ffffff;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sc-ad-close:hover:not(:disabled) {
          background: rgba(255,255,255,0.15);
        }

        .sc-ad-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sc-ad-title {
          margin: 4px 0 0;
          font-size: 18px;
          font-weight: 900;
          line-height: 1.2;
        }

        .sc-ad-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          opacity: 0.8;
        }

        .sc-ad-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #0b63f6, #142760);
          color: #ffffff;
          text-decoration: none;
          padding: 12px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 15px;
          transition: transform 0.15s ease, filter 0.15s ease;
        }

        .sc-ad-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-2px);
        }
      `}</style>

      <div className="sc-ad-popup">
        <div className="sc-ad-header">
          <div>
            <span className="sc-ad-badge">Sponsored</span>
            <h3 className="sc-ad-title">{currentAd.title}</h3>
          </div>
          <button 
            className="sc-ad-close" 
            onClick={closeAd} 
            disabled={!canDismiss}
            aria-label="Close Advertisement"
          >
            {canDismiss ? "✕" : countdown}
          </button>
        </div>

        <p className="sc-ad-text">{currentAd.text}</p>

        {currentAd.type === "internal" ? (
          <Link to={currentAd.link} className="sc-ad-btn" onClick={closeAd}>
            {currentAd.cta}
          </Link>
        ) : (
          <a href={currentAd.link} className="sc-ad-btn" onClick={closeAd}>
            {currentAd.cta}
          </a>
        )}
      </div>
    </>
  );
};

export default AdPopup;