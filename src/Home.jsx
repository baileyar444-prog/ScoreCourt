import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PREFERRED_SPORT_KEY = "scorecourt_preferred_sport_v1";

const Home = () => {
  const navigate = useNavigate();
  const [faqOpen, setFaqOpen] = useState(null);

  const sports = [
    { name: "Pickleball", tone: "blue" },
    { name: "Badminton", tone: "green" },
    { name: "Tennis", tone: "slate" },
    { name: "Padel", tone: "teal" },
    { name: "Volleyball", tone: "navy" },
    { name: "Touch Footy", tone: "orange" }
  ];

  const setPreferredSportAndGo = (sportName) => {
    try {
      localStorage.setItem(PREFERRED_SPORT_KEY, sportName);
      localStorage.setItem("scorecourt_ping", String(Date.now()));
    } catch {}
    navigate("/app");
  };

  const faqs = [
    {
      q: "Do I need hardware to use ScoreCourt?",
      a: "Nope. You can score using your phone (Basic or Pro). Hardware is for the best experience — instant scoring, less distraction, fewer errors, and better venue/tournament reliability."
    },
    {
      q: "Can I run Display Mode on a TV?",
      a: "Yes — anything with a browser works (TV with browser, laptop via HDMI, tablet, venue screen). Open Display on the big screen and keep Use App on a phone or clicker."
    },
    {
      q: "Does this work for live streaming on YouTube or Twitch?",
      a: "Absolutely. Just add ?overlay=true to the end of your Display URL, and it generates a transparent, lower-third graphics package you can drop straight into OBS Studio as a Browser Source."
    },
    {
      q: "Why is this better than a normal scoring app?",
      a: "Because it removes score friction. You get fast point entry, a public scoreboard everyone can see, and rules support that reduces human error — so games stay smooth and disputes drop."
    },
    {
      q: "Is this for social play or competitive matches?",
      a: "Both. Social players love the flow. Competitive players love the clarity and accuracy. Clubs love the pathway into multi-court and onboarding through ClubCourt."
    }
  ];

  return (
    <div className="sc-home">
      <style>{`
        .sc-home {
          padding: 0 0 70px;  
          width: 100%;
          margin: 0;
          color: #ffffff; 
        }

        /* --- ACCESSIBILITY FOCUS --- */
        :focus-visible {
          outline: 2px solid #91cb23;
          outline-offset: 4px;
        }

        /* --- HERO SECTION --- */
        .sc-hero {
          border-radius: 22px;
          padding: 32px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(17,24,39,.35);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 18px 45px rgba(0,0,0,.35);
        }

        .sc-kicker {
          font-size: 12px;
          letter-spacing: .14em;
          text-transform: uppercase;
          opacity: .7;
          margin: 0 0 10px;
          font-weight: 800;
        }

        .sc-title {
          margin: 0;
          font-weight: 950;
          font-size: clamp(32px, 4.2vw, 54px);
          line-height: 1.05;
        }

        .sc-sub {
          margin: 16px 0 0;
          opacity: .78;
          line-height: 1.55;
          max-width: 72ch;
          font-weight: 600;
          font-size: 1.1rem;
        }

        .sc-heroGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          margin-top: 16px;
        }

        @media (min-width: 1024px) {
          .sc-heroGrid {
            grid-template-columns: 1.15fr 0.85fr;
            align-items: start;
          }
        }

        .sc-ctaRow {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .sc-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 48px;
          padding: 0 20px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.16);
          text-decoration: none;
          color: rgba(255,255,255,.92);
          font-weight: 900;
          background: rgba(255,255,255,.06);
          box-shadow: 0 10px 26px rgba(0,0,0,.25);
          transition: transform .15s ease, filter .15s ease, box-shadow .15s ease;
          cursor: pointer;
          user-select: none;
        }
        .sc-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .sc-btn:active { transform: translateY(0px) scale(.98); }

        .sc-btnBlue { 
          background: linear-gradient(180deg, #0b63f6, rgba(11,99,246,.72)); 
          border-color: rgba(255,255,255,.18); 
          box-shadow: 0 6px 20px rgba(11, 99, 246, 0.35);
        }
        .sc-btnGreen { 
          background: linear-gradient(180deg, #91cb23, rgba(145,203,35,.68)); 
          color: #000000; 
          box-shadow: 0 6px 20px rgba(145, 203, 35, 0.35);
        }
        .sc-btnGhost { background: rgba(255,255,255,.06); }

        .sc-panel {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.12); 
          background: rgba(0,0,0,.16);
          padding: 24px;
          display: grid;
          gap: 12px;
          min-height: 220px;
          box-shadow: 0 10px 24px rgba(0,0,0,.22);
        }

        .sc-panelTitle { font-weight: 950; margin: 0; font-size: 18px; color: #ffffff; }
        
        .sc-placeholder {
          border-radius: 12px;
          min-height: 160px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          margin-top: 10px;
          overflow: hidden; 
        }

        .sc-hero-img {
          width: 100%;
          height: auto;
          object-fit: cover;
          border-radius: 12px;
          opacity: 0.95;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }

        .sc-kpiRow {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 24px;
        }
        @media (min-width: 900px) { .sc-kpiRow { grid-template-columns: 1fr 1fr 1fr; } }

        .sc-kpi {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.14);
          padding: 18px;
          box-shadow: 0 10px 24px rgba(0,0,0,.20);
          display: grid;
          gap: 6px;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; 
        }
        .sc-kpi:hover {
          transform: translateY(-4px);
          border-color: rgba(11, 99, 246, 0.4);
          box-shadow: 0 16px 32px rgba(0,0,0,.25);
        }
        .sc-kpi b { font-size: 18px; font-weight: 950; }
        .sc-kpi span { opacity: .75; font-weight: 650; line-height: 1.45; font-size: 14px; }

        /* --- STANDARD SECTIONS --- */
        .sc-section {
          margin-top: 24px;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(17,24,39,.28);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 32px;
          box-shadow: 0 14px 34px rgba(0,0,0,.25);
        }

        /* Custom slight colourful background for the contact section */
        .sc-contactSection {
          background: linear-gradient(135deg, rgba(11, 99, 246, 0.12) 0%, rgba(145, 203, 35, 0.08) 100%), rgba(17, 24, 39, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.16);
        }

        .sc-sectionHeader {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sc-sectionLabel {
          font-size: 12px;
          letter-spacing: .14em;
          text-transform: uppercase;
          opacity: .7;
          margin: 0;
          font-weight: 900;
        }
        .sc-sectionTitle { margin: 0; font-size: 28px; font-weight: 950; line-height: 1.1; }
        .sc-sectionSub { margin: 0; opacity: .78; line-height: 1.55; font-weight: 600; max-width: 800px; }

        .sc-sportGrid {
          margin-top: 24px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 600px) { .sc-sportGrid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .sc-sportGrid { grid-template-columns: repeat(3, 1fr); } }

        .sc-sportCard {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.14);
          min-height: 80px;
          display: grid;
          place-items: center;
          cursor: pointer;
          user-select: none;
          font-weight: 950;
          font-size: 20px;
          box-shadow: 0 10px 24px rgba(0,0,0,.22);
          transition: all .2s ease;
          position: relative;
          overflow: hidden;
        }
        .sc-sportCard:hover {
          transform: translateY(-4px);
          filter: brightness(1.1);
          border-color: rgba(255,255,255,.4);
          box-shadow: 0 14px 28px rgba(0,0,0,.3);
        }
        .tone-blue { background: radial-gradient(600px 220px at 30% 20%, rgba(11,99,246,.42), transparent 62%), rgba(17,24,39,.36); }
        .tone-green { background: radial-gradient(600px 220px at 30% 20%, rgba(145,203,35,.34), transparent 62%), rgba(17,24,39,.36); }
        .tone-slate { background: radial-gradient(600px 220px at 30% 20%, rgba(160,174,192,.28), transparent 62%), rgba(17,24,39,.36); }
        .tone-teal { background: radial-gradient(600px 220px at 30% 20%, rgba(111,204,220,.28), transparent 62%), rgba(17,24,39,.36); }
        .tone-navy { background: radial-gradient(600px 220px at 30% 20%, rgba(69,116,185,.30), transparent 62%), rgba(17,24,39,.36); }
        .tone-orange { background: radial-gradient(600px 220px at 30% 20%, rgba(249,115,22,.34), transparent 62%), rgba(17,24,39,.36); }

        .sc-perfectGrid {
          margin-top: 24px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 768px) { .sc-perfectGrid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .sc-perfectGrid { grid-template-columns: 1fr 1fr 1fr 1fr; } }

        .sc-perfectCard {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.12);
          background: radial-gradient(420px 180px at 20% 15%, rgba(11,99,246,.22), transparent 60%), rgba(0,0,0,.14);
          padding: 18px;
          box-shadow: 0 10px 24px rgba(0,0,0,.18);
          display: grid;
          gap: 8px;
          min-height: 140px;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .sc-perfectCard:hover {
          transform: translateY(-4px);
          border-color: rgba(11, 99, 246, 0.4);
          box-shadow: 0 16px 32px rgba(0,0,0,.25);
        }
        .sc-perfectCard b { font-weight: 950; font-size: 16px; }
        .sc-perfectCard span { opacity: .78; font-weight: 650; line-height: 1.45; font-size: 13.5px; }

        .sc-ul {
          margin: 0;
          padding-left: 20px;
          opacity: .85;
          font-weight: 500;
          line-height: 1.6;
          font-size: 14px;
          display: grid;
          gap: 8px;
        }

        /* --- REDESIGNED 'HOW IT WORKS' GRID --- */
        .sc-stepsGrid {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          position: relative;
        }
        @media (min-width: 900px) { 
          .sc-stepsGrid { 
            grid-template-columns: 1fr 1fr 1fr; 
            gap: 32px; 
          } 
        }

        .sc-stepCard {
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(17,24,39,.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 32px 24px;
          box-shadow: 0 14px 34px rgba(0,0,0,.25);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
          position: relative;
          z-index: 1;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .sc-stepCard:hover {
          transform: translateY(-6px);
          border-color: rgba(145,203,35,0.4);
        }
        
        /* Fixed Circle Rendering */
        .sc-stepNum {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
          font-size: 28px;
          color: #ffffff;
          background: linear-gradient(135deg, #0b63f6, #142760);
          box-shadow: 0 0 24px rgba(11,99,246,0.5); 
          border: 1px solid rgba(255,255,255,0.15);
          margin-top: -68px; 
          box-sizing: border-box;
        }
        .sc-stepCard:nth-child(2) .sc-stepNum { 
          background: linear-gradient(135deg, #0b63f6, #91cb23); 
          box-shadow: 0 0 24px rgba(145,203,35,0.3); 
        }
        .sc-stepCard:nth-child(3) .sc-stepNum { 
          background: linear-gradient(135deg, #91cb23, #0a3a25); 
          box-shadow: 0 0 24px rgba(145,203,35,0.5); 
          color: #000000;
        }

        .sc-cardTitle { font-size: 20px; font-weight: 900; margin: 0; }
        .sc-cardText { margin: 0; opacity: 0.8; line-height: 1.6; font-size: 15px; }

        .sc-ctaBar {
          margin-top: 24px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.12);
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.08));
          padding: 16px 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 14px 34px rgba(0,0,0,.22);
        }
        .sc-ctaBarText { margin: 0; font-weight: 800; opacity: .85; line-height: 1.4; }

        .sc-priceGrid {
          margin-top: 24px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) { .sc-priceGrid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .sc-priceGrid { grid-template-columns: 1fr 1fr 1fr 1fr; } }
        
        .sc-tier {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.14);
          padding: 24px;
          box-shadow: 0 10px 24px rgba(0,0,0,.22);
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 280px;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; 
        }
        .sc-tier:hover {
          transform: translateY(-4px);
          border-color: rgba(11, 99, 246, 0.4);
          box-shadow: 0 16px 32px rgba(0,0,0,.25);
        }

        /* Specific styles for the Pro tier to ensure hover works cleanly */
        .sc-tierPro {
          border-color: rgba(11,99,246,.40);
          background: rgba(11,99,246,.05);
        }
        .sc-tierPro:hover {
          border-color: rgba(11,99,246,.80); 
        }

        .sc-tierHeader {
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 16px;
        }
        .sc-tierName { margin: 0; font-weight: 800; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8; }
        .sc-tierPrice { margin: 0; font-weight: 950; font-size: 36px; line-height: 1; }
        .sc-tierSub { margin: 0; font-size: 13px; opacity: 0.6; font-weight: 600; }
        .sc-tierDesc { margin: 0; opacity: .8; line-height: 1.5; font-weight: 600; font-size: 15px; }

        .sc-faqGrid {
          margin-top: 24px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 900px) { .sc-faqGrid { grid-template-columns: 1fr 1fr; align-items: start; } }

        .sc-faqItem {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.14);
          box-shadow: 0 10px 24px rgba(0,0,0,.18);
          overflow: hidden;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .sc-faqItem:hover {
          transform: translateY(-2px);
          border-color: rgba(11, 99, 246, 0.4);
        }
        .sc-faqBtn {
          width: 100%;
          background: transparent;
          border: 0;
          color: rgba(255,255,255,.92);
          cursor: pointer;
          padding: 16px;
          display: grid;
          grid-template-columns: 1fr 28px;
          gap: 10px;
          align-items: center;
          text-align: left;
          font-weight: 950;
          font-size: 15.5px;
        }
        .sc-faqIcon {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(255,255,255,.06);
          font-weight: 950;
        }
        .sc-faqA {
          padding: 0 16px 16px;
          opacity: .78;
          font-weight: 650;
          line-height: 1.55;
          font-size: 14.5px;
        }
      `}</style>

      {/* --- HERO SECTION --- */}
      <div className="sc-hero">
        <div className="sc-heroGrid">
          
          <div className="sc-heroLeft">
            <div className="sc-kicker">ScoreCourt</div>
            <h1 className="sc-title">The smart scoring solution that keeps the game moving — no debates, no delays.</h1>
            <p className="sc-sub">
              The viral scoring solution taking courts around the world by storm.
              <br /><br />
              Start scoring for free, add the Smart Clicker for effortless scoring, and unlock Pro to connect displays and bring matches to life.
            </p>

            <div className="sc-ctaRow">
              <Link className="sc-btn sc-btnBlue" to="/app">Get Started Free</Link>
              <Link className="sc-btn sc-btnGreen" to="/display">Open Display Mode</Link>
              <Link className="sc-btn sc-btnGhost" to="/store">Shop Hardware</Link>
            </div>
          </div>

          <div className="sc-heroRight">
            <div className="sc-panel">
              <p className="sc-panelTitle">What it solves</p>
              <ul className="sc-ul" style={{ margin: 0 }}>
                <li>Score as you play. Never forget the score.</li>
                <li>No stopping play to check phones.</li>
                <li>No arguing about the score.</li>
                <li>Automatically tracks who is serving and the correct side.</li>
                <li>Display the score on any device.</li>
                <li>An affordable scoring solution for clubs and players.</li>
              </ul>
              <div className="sc-placeholder">
                <img src="https://i.imgur.com/PyIzerP.jpeg" alt="Pickleball player hitting a ball in front of a large digital scoreboard" className="sc-hero-img" />
              </div>
            </div>
          </div>
        </div>

        <div className="sc-kpiRow" role="list" aria-label="Key benefits">
          <div className="sc-kpi" role="listitem">
            <b>Faster games</b>
            <span>Score instantly without stopping rallies or fumbling a phone mid-point.</span>
          </div>
          <div className="sc-kpi" role="listitem">
            <b>Less arguing</b>
            <span>Clear display reduces disputes. Everyone sees the score and what’s next.</span>
          </div>
          <div className="sc-kpi" role="listitem">
            <b>Venue-ready</b>
            <span>Perfect for clubs, tournaments, and multi-court setups with ClubCourt.</span>
          </div>
        </div>
      </div>

      {/* SUPPORTED SPORTS */}
      <div className="sc-section" id="sports">
        <div className="sc-sectionHeader">
          <p className="sc-sectionLabel">Supported Sports</p>
          <h2 className="sc-sectionTitle">Tap a sport to start scoring</h2>
          <p className="sc-sectionSub">One tap → opens Use App with that sport selected.</p>
        </div>

        <div className="sc-sportGrid">
          {sports.map((s) => (
            <div
              key={s.name}
              className={`sc-sportCard tone-${s.tone}`}
              role="button"
              tabIndex={0}
              onClick={() => setPreferredSportAndGo(s.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setPreferredSportAndGo(s.name);
              }}
              aria-label={`Start scoring ${s.name}`}
              title={`Start scoring ${s.name}`}
            >
              {s.name}
            </div>
          ))}
        </div>
      </div>

      {/* PERFECT FOR */}
      <div className="sc-section" id="perfectfor">
        <div className="sc-sectionHeader">
          <p className="sc-sectionLabel">Perfect for</p>
          <h2 className="sc-sectionTitle">Built for every level of play</h2>
          <p className="sc-sectionSub">
            ScoreCourt removes the annoying parts of scoring — making it the perfect scoring solution whether it’s a casual hit or a full comp night.
          </p>
        </div>

        <div className="sc-perfectGrid">
          <div className="sc-perfectCard">
            <b>Social Sessions</b>
            <span>Keep the vibe. No stopping play, no passing phones around, no “what’s the score?” every point.</span>
          </div>
          <div className="sc-perfectCard">
            <b>Competitive Leagues</b>
            <span>Cleaner matches. Public scoreboard reduces disputes and helps everyone stay locked in.</span>
          </div>
          <div className="sc-perfectCard">
            <b>Tournaments</b>
            <span>Faster turnarounds. Less confusion. Scoring that looks and feels professional.</span>
          </div>
          <div className="sc-perfectCard">
            <b>Clubs & Venues</b>
            <span>Run multiple courts, screens, and hardware — with a pathway into ClubCourt.</span>
          </div>
        </div>

        <div className="sc-ctaBar">
          <p className="sc-ctaBarText">
            Tip: clubs get the biggest benefit from Display Mode + clickers.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="sc-btn sc-btnGreen" to="/clubcourt">ClubCourt</Link>
            <Link className="sc-btn sc-btnGhost" to="/store">Hardware</Link>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="sc-section" id="how">
        <div className="sc-sectionHeader">
          <p className="sc-sectionLabel">How it works</p>
          <h2 className="sc-sectionTitle">Fast setup, clean scoring</h2>
          <p className="sc-sectionSub">
            A simple system: one screen controls scoring, one screen displays it. Hardware is optional — but makes it elite.
          </p>
        </div>

        <div className="sc-stepsGrid">
          <div className="sc-stepCard">
            <div className="sc-stepNum">1</div>
            <p className="sc-cardTitle">Pick your sport</p>
            <p className="sc-cardText">
              Tap a sport and ScoreCourt loads the right setup so you can start immediately.
            </p>
          </div>

          <div className="sc-stepCard">
            <div className="sc-stepNum">2</div>
            <p className="sc-cardTitle">Connect your controller</p>
            <p className="sc-cardText">
              Score instantly from your phone or pair the Smart Clicker so you never break rhythm.
            </p>
          </div>

          <div className="sc-stepCard">
            <div className="sc-stepNum">3</div>
            <p className="sc-cardTitle">Open Display</p>
            <p className="sc-cardText">
              Put the scoreboard on a TV, or generate a QR code for spectators to scan on their phones.
            </p>
          </div>
        </div>
      </div>

      {/* THE SYSTEM */}
      <div className="sc-section" id="system">
        <div className="sc-sectionHeader">
          <p className="sc-sectionLabel">The System</p>
          <h2 className="sc-sectionTitle">A dedicated scoring solution</h2>
          <p className="sc-sectionSub">
            Everything you need to run seamless matches, from social hits to club tournaments.
          </p>
        </div>

        <div className="sc-perfectGrid">
          <div className="sc-perfectCard">
            <b>Controller + Display system</b>
            <span>One device scores, one device shows.</span>
          </div>
          <div className="sc-perfectCard">
            <b>Works on big screens</b>
            <span>TV, tablet, laptop, venue screen.</span>
          </div>
          <div className="sc-perfectCard">
            <b>Multi-sport scoring</b>
            <span>Pickleball, badminton, tennis, padel, volleyball, touch footy.</span>
          </div>
          <div className="sc-perfectCard">
            <b>OBS Broadcasting</b>
            <span>Transparent overlays for Twitch and YouTube.</span>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div className="sc-section" id="pricing">
        <div className="sc-sectionHeader">
          <p className="sc-sectionLabel">Pricing</p>
          <h2 className="sc-sectionTitle">Simple options</h2>
          <p className="sc-sectionSub">Choose the plan or hardware that fits your play style.</p>
        </div>

        <div className="sc-priceGrid">
          <div className="sc-tier">
            <div className="sc-tierHeader">
              <p className="sc-tierName">Basic</p>
              <p className="sc-tierPrice">Free</p>
              <p className="sc-tierSub">Forever</p>
            </div>
            <p className="sc-tierDesc">Perfect for casual games and testing out ScoreCourt.</p>
            <ul className="sc-ul">
              <li>Ad-supported experience</li>
              <li>Core scoring limits apply</li>
              <li>Display Mode supported</li>
              <li>Undo + tap lock</li>
            </ul>
            <div style={{ marginTop: "auto", paddingTop: 16 }}>
              <Link className="sc-btn sc-btnGhost" style={{ width: "100%" }} to="/app">Start Free</Link>
            </div>
          </div>

          <div className="sc-tier sc-tierPro">
            <div className="sc-tierHeader">
              <p className="sc-tierName" style={{ color: "#0b63f6" }}>ScoreCourt Pro</p>
              <p className="sc-tierPrice">$10 <span style={{ fontSize: "16px", opacity: 0.7, fontWeight: 600 }}>/ mo</span></p>
              <p className="sc-tierSub">or $100 billed annually</p>
            </div>
            <p className="sc-tierDesc">Unlock the full potential of your matches without interruptions.</p>
            <ul className="sc-ul">
              <li>Zero advertisements</li>
              <li>Unlimited sports</li>
              <li>Cloud Match History Dashboard</li>
              <li>OBS Livestream Overlay support</li>
            </ul>
            <div style={{ marginTop: "auto", paddingTop: 16 }}>
              <Link className="sc-btn sc-btnBlue" style={{ width: "100%" }} to="/app">Get Pro</Link>
            </div>
          </div>

          <div className="sc-tier">
            <div className="sc-tierHeader">
              <p className="sc-tierName">Smart Clicker</p>
              <p className="sc-tierPrice">$70</p>
              <p className="sc-tierSub">One-time purchase</p>
            </div>
            <p className="sc-tierDesc">Pocket-sized remote so you can score without touching your phone.</p>
            <ul className="sc-ul">
              <li><b>Includes 6 months Pro free</b></li>
              <li>Wireless Bluetooth pairing</li>
              <li>Sweat-proof & durable</li>
              <li>Instant point logging</li>
            </ul>
            <div style={{ marginTop: "auto", paddingTop: 16 }}>
              <Link className="sc-btn sc-btnGhost" style={{ width: "100%" }} to="/store">Buy Clicker</Link>
            </div>
          </div>

          <div className="sc-tier">
            <div className="sc-tierHeader">
              <p className="sc-tierName">ClubCourt</p>
              <p className="sc-tierPrice">Custom</p>
              <p className="sc-tierSub">Tailored to your venue</p>
            </div>
            <p className="sc-tierDesc">Built exclusively as the ultimate scoring solution for clubs, tournaments, and large facilities.</p>
            <ul className="sc-ul">
              <li>Multi-court management</li>
              <li>Bulk member onboarding</li>
              <li>Hardware bundle discounts</li>
              <li>Priority technical support</li>
            </ul>
            <div style={{ marginTop: "auto", paddingTop: 16 }}>
              <Link className="sc-btn sc-btnGreen" style={{ width: "100%" }} to="/clubcourt">Enquire Now</Link>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="sc-section" id="faq">
        <div className="sc-sectionHeader">
          <p className="sc-sectionLabel">FAQ</p>
          <h2 className="sc-sectionTitle">Quick answers</h2>
          <p className="sc-sectionSub">
            Click a question to expand the answer.
          </p>
        </div>

        <div className="sc-faqGrid">
          {faqs.map((item, idx) => {
            const open = faqOpen === idx;
            return (
              <div className="sc-faqItem" key={item.q}>
                <button
                  className="sc-faqBtn"
                  onClick={() => setFaqOpen(open ? null : idx)}
                  aria-expanded={open ? "true" : "false"}
                >
                  <span>{item.q}</span>
                  <span className="sc-faqIcon">{open ? "−" : "+"}</span>
                </button>
                {open && <div className="sc-faqA">{item.a}</div>}
              </div>
            );
          })}
        </div>

        <div className="sc-ctaBar" style={{ marginTop: 24 }}>
          <p className="sc-ctaBarText">
            Try it: start a match, then open Display on a second screen.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="sc-btn sc-btnBlue" to="/app">Get Started Free</Link>
            <Link className="sc-btn sc-btnGreen" to="/display">Open Display</Link>
            <Link className="sc-btn sc-btnGhost" to="/store">Shop Hardware</Link>
          </div>
        </div>
      </div>

      {/* NEW CONTACT SECTION WITH SLIGHT COLOURFUL BACKGROUND */}
      <div className="sc-section sc-contactSection" id="contact" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="sc-sectionHeader" style={{ alignItems: "center" }}>
          <p className="sc-sectionLabel">Support & Enquiries</p>
          <h2 className="sc-sectionTitle">Get in Touch</h2>
          <p className="sc-sectionSub" style={{ margin: "0 auto", paddingBottom: "16px" }}>
            Have a question about ScoreCourt, ClubCourt, or our hardware? Drop us an email and our team will get right back to you.
          </p>
        </div>
        <a 
          href="mailto:info@scorecourt.com.au" 
          className="sc-btn sc-btnBlue" 
          style={{ fontSize: "18px", height: "56px", padding: "0 32px" }}
        >
          Email info@scorecourt.com.au
        </a>
      </div>

    </div>
  );
};

export default Home;