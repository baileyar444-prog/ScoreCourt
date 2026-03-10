import React from "react";
import { Link } from "react-router-dom";

const ClubCourt = () => {
  return (
    <div className="sc-clubcourt-page">
      <style>{`
        .sc-clubcourt-page {
          padding: 20px 20px 80px;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          color: #ffffff;
        }

        /* --- BUTTONS --- */
        .sc-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 48px;
          padding: 0 24px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.16);
          text-decoration: none;
          color: rgba(255,255,255,.92);
          font-weight: 900;
          font-size: 15px;
          background: rgba(255,255,255,.06);
          box-shadow: 0 10px 26px rgba(0,0,0,.25);
          transition: transform .15s ease, filter .15s ease;
          cursor: pointer;
          user-select: none;
        }
        .sc-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .sc-btn:active { transform: translateY(0px) scale(.98); }

        .sc-btnGreen { background: linear-gradient(180deg, #91cb23, rgba(145,203,35,.68)); color: #000000; border-color: transparent; }
        .sc-btnBlue { background: linear-gradient(180deg, #0b63f6, rgba(11,99,246,.72)); border-color: rgba(255,255,255,.18); }
        .sc-btnGhost { background: transparent; border: 1px solid rgba(255,255,255,.3); }
        .sc-btnGhost:hover { background: rgba(255,255,255,.05); border-color: #ffffff; }

        /* --- SECTIONS --- */
        .sc-section {
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(17,24,39,.28);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 40px;
          box-shadow: 0 14px 34px rgba(0,0,0,.25);
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }
        
        /* Subtle green glow for the ClubCourt hero */
        .sc-section-hero::before {
          content: "";
          position: absolute;
          top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle at 50% 0%, rgba(145,203,35,0.08), transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .sc-sectionHeader {
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .sc-sectionLabel {
          font-size: 13px;
          letter-spacing: .15em;
          text-transform: uppercase;
          opacity: 1;
          margin: 0;
          font-weight: 900;
          color: #91cb23;
        }
        .sc-sectionTitle { margin: 0; font-size: clamp(32px, 4vw, 48px); font-weight: 950; line-height: 1.1; letter-spacing: -0.01em; }
        .sc-sectionSub { margin: 0; opacity: .8; line-height: 1.6; font-weight: 500; font-size: 1.15rem; max-width: 800px; }

        /* --- GRIDS & CARDS --- */
        .sc-grid-3 {
          margin-top: 32px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 900px) { .sc-grid-3 { grid-template-columns: 1fr 1fr 1fr; } }
        
        .sc-grid-2 {
          margin-top: 32px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 768px) { .sc-grid-2 { grid-template-columns: 1fr 1fr; } }

        .sc-card {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.2);
          padding: 28px;
          box-shadow: 0 10px 30px rgba(0,0,0,.3);
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .sc-card:hover {
          transform: translateY(-3px);
          border-color: rgba(145,203,35,0.3);
        }
        
        .sc-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .sc-cardTitle { margin: 0; font-weight: 950; font-size: 20px; line-height: 1.2; color: #ffffff; }
        .sc-cardText { margin: 0; opacity: .75; font-weight: 500; line-height: 1.6; font-size: 15px; }

        .sc-bundle {
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,.1);
          background: #142760;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .sc-bundle-premium {
          background: linear-gradient(145deg, #0a3a25 0%, #000000 100%);
          border-color: #91cb23;
        }

        .sc-ul {
          margin: 12px 0 0;
          padding-left: 20px;
          opacity: .85;
          font-weight: 500;
          line-height: 1.6;
          font-size: 15px;
          display: grid;
          gap: 10px;
        }

        /* --- CTA BOX --- */
        .sc-ctaBox {
          margin-top: 40px;
          border-radius: 22px;
          border: 1px solid #91cb23;
          background: rgba(145,203,35,0.05);
          padding: 48px 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
      `}</style>

      {/* HERO SECTION */}
      <div className="sc-section sc-section-hero">
        <div className="sc-sectionHeader">
          <p className="sc-sectionLabel">Enterprise & Facilities</p>
          <h1 className="sc-sectionTitle">Transform your venue with ClubCourt</h1>
          <p className="sc-sectionSub">
            ScoreCourt’s dedicated community for organisations and clubs. Equip your entire facility with commercial-grade hardware, bulk license discounts, and a completely unified scoring solution.
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "16px" }}>
            <button className="sc-btn sc-btnGreen" onClick={() => document.getElementById('quote').scrollIntoView({behavior: 'smooth'})}>
              Request a Quote
            </button>
            <Link className="sc-btn sc-btnGhost" to="/store">View Hardware</Link>
          </div>
        </div>

        <div className="sc-grid-3">
          <div className="sc-card">
            <div className="sc-icon">🏟️</div>
            <h2 className="sc-cardTitle">Elevate the Experience</h2>
            <p className="sc-cardText">
              Replace messy whiteboards and lost scoresheets. Give your members a premium, professional arena feel that keeps them coming back.
            </p>
          </div>
          <div className="sc-card">
            <div className="sc-icon">⚙️</div>
            <h2 className="sc-cardTitle">Streamline Operations</h2>
            <p className="sc-cardText">
              Manage multiple courts seamlessly. Reduce on-court disputes and time-wasting so your sessions and tournaments run exactly to schedule.
            </p>
          </div>
          <div className="sc-card">
            <div className="sc-icon">📦</div>
            <h2 className="sc-cardTitle">Commercial Hardware</h2>
            <p className="sc-cardText">
              Access bulk pricing on our Smart Clickers and verified display monitors. Built tough to withstand constant daily venue use.
            </p>
          </div>
        </div>
      </div>

      

      {/* DEEP DIVE FEATURES */}
      <div className="sc-section">
        <div className="sc-sectionHeader">
          <p className="sc-sectionLabel">Platform Features</p>
          <h2 className="sc-sectionTitle">Built to scale with your club</h2>
          <p className="sc-sectionSub">
            More than just an app. ClubCourt is a comprehensive scoring solution engineered to handle the chaos of peak hours and tournament weekends.
          </p>
        </div>

        <div className="sc-grid-2">
          <div className="sc-card">
            <h2 className="sc-cardTitle" style={{ color: "#0b63f6" }}>Multi-Court Syncing</h2>
            <p className="sc-cardText">
              Run 2 courts or 20. Ensure every display is firing perfectly. Spectators and players always know exactly what the score is, reducing confusion and noise.
            </p>
          </div>
          <div className="sc-card">
            <h2 className="sc-cardTitle" style={{ color: "#0b63f6" }}>Custom Club Branding</h2>
            <p className="sc-cardText">
              Your venue, your brand. Display your club's logo, tournament sponsors, or custom colours directly on the big screens during idle times and match play.
            </p>
          </div>
          <div className="sc-card">
            <h2 className="sc-cardTitle" style={{ color: "#0b63f6" }}>Bulk Member Onboarding</h2>
            <p className="sc-cardText">
              Easily distribute ScoreCourt Pro licenses to your coaches, tournament directors, and premium members through our simplified organisation dashboard.
            </p>
          </div>
          <div className="sc-card">
            <h2 className="sc-cardTitle" style={{ color: "#0b63f6" }}>Priority Technical Support</h2>
            <p className="sc-cardText">
              When you are running a live tournament, you can't wait for an email reply. ClubCourt partners get direct-line support to ensure your events run flawlessly.
            </p>
          </div>
        </div>
      </div>

      {/* BUNDLES */}
      <div className="sc-section">
        <div className="sc-sectionHeader">
          <p className="sc-sectionLabel">Hardware & Licensing</p>
          <h2 className="sc-sectionTitle">Facility Bundles</h2>
          <p className="sc-sectionSub">
            We provide customised quotes based on your exact court count. Here is an idea of how facilities normally equip themselves.
          </p>
        </div>

        <div className="sc-grid-2">
          {/* Starter Bundle */}
          <div className="sc-bundle">
            <h3 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#ffffff" }}>The Starter Setup</h3>
            <p style={{ margin: 0, opacity: 0.8, fontSize: "15px" }}>Ideal for smaller local clubs testing the waters on a few feature courts.</p>
            <ul className="sc-ul">
              <li>4× ScoreCourt Smart Clickers</li>
              <li>4× Annual Pro Licenses (for venue tablets)</li>
              <li>Basic digital setup guide</li>
            </ul>
            <div style={{ marginTop: "auto", paddingTop: "20px" }}>
              <p style={{ margin: 0, fontWeight: 800, color: "#0b63f6" }}>Starting around $350</p>
            </div>
          </div>

          {/* Premium Bundle */}
          <div className="sc-bundle sc-bundle-premium">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#91cb23" }}>Full Facility Rollout</h3>
              <span style={{ background: "#91cb23", color: "#000", padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: 900 }}>Most Popular</span>
            </div>
            <p style={{ margin: 0, opacity: 0.9, fontSize: "15px" }}>The complete scoring solution for massive leagues and permanent facility upgrades.</p>
            <ul className="sc-ul" style={{ color: "#ffffff" }}>
              <li>10+ ScoreCourt Smart Clickers</li>
              <li>Unlimited Venue Pro Licenses</li>
              <li>Custom display branding</li>
              <li>Dedicated onboarding specialist</li>
            </ul>
            <div style={{ marginTop: "auto", paddingTop: "20px" }}>
              <p style={{ margin: 0, fontWeight: 800, color: "#ffffff" }}>Custom Quoted</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA SECTION */}
      <div className="sc-ctaBox" id="quote">
        <h2 style={{ margin: 0, fontSize: "36px", fontWeight: 950, color: "#ffffff" }}>Ready to upgrade your courts?</h2>
        <p style={{ margin: 0, fontSize: "18px", opacity: 0.9, maxWidth: "600px", lineHeight: 1.5 }}>
          Tell us a bit about your organisation, how many courts you operate, and what sports you host. We will build a customised scoring solution tailored to your venue.
        </p>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center", marginTop: "12px" }}>
          <button className="sc-btn sc-btnGreen" style={{ height: "56px", padding: "0 40px", fontSize: "18px" }}>Contact Sales</button>
          <a href="mailto:hello@scorecourt.com" className="sc-btn sc-btnGhost" style={{ height: "56px", padding: "0 40px", fontSize: "18px" }}>Email Us</a>
        </div>
      </div>

    </div>
  );
};

export default ClubCourt;