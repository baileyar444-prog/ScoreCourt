import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";

// YOUR REAL STRIPE LINKS
const STRIPE_PRO_LINK = "https://buy.stripe.com/test_8x24gz4vQcBh3CKalt0oM01"; 
const STRIPE_CLICKER_LINK = "https://buy.stripe.com/test_7sYfZh8M6eJp2yGeBJ0oM00";

const Store = () => {
  const { user, profile } = useAuth();
  const isPro = profile?.is_pro || false;

  return (
    <div className="sc-store-page">
      <style>{`
        .sc-store-page {
          min-height: calc(100vh - 100px);
          padding: 60px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #ffffff;
        }

        .sc-store-header {
          text-align: center;
          margin-bottom: 50px;
          max-width: 600px;
        }

        .sc-store-title {
          font-size: 42px;
          font-weight: 950;
          letter-spacing: -0.02em;
          margin: 0 0 16px 0;
          background: linear-gradient(135deg, #ffffff, #a0a5b5);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sc-store-subtitle {
          font-size: 18px;
          color: rgba(255,255,255,0.7);
          line-height: 1.6;
          margin: 0;
        }

        /* HARDWARE CLICKER SECTION */
        .sc-hardware-section {
          width: 100%;
          max-width: 900px;
          background: rgba(17, 24, 39, 0.6);
          border: 1px solid rgba(145, 203, 35, 0.3);
          border-radius: 24px;
          padding: 40px;
          display: flex;
          gap: 40px;
          align-items: center;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
          margin-bottom: 60px; /* Pushes the pricing grid down */
        }

        @media (max-width: 768px) {
          .sc-hardware-section { flex-direction: column; text-align: center; padding: 30px 20px; gap: 24px; }
        }

        .sc-hardware-glow {
          position: absolute;
          top: -50px;
          right: -50px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(145, 203, 35, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .sc-hardware-image {
          flex: 0 0 200px;
          height: 200px;
          background: rgba(0,0,0,0.3);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 64px;
        }

        .sc-hardware-content { flex: 1; }
        
        .sc-hardware-kicker {
          color: #91cb23;
          font-weight: 900;
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .sc-hardware-title { font-size: 32px; font-weight: 900; margin: 0 0 12px 0; }
        .sc-hardware-desc { font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.5; margin: 0 0 24px 0; }
        
        .sc-btn-clicker {
          display: inline-block;
          background: #91cb23;
          color: #142760;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 900;
          text-decoration: none;
          transition: transform 0.2s;
        }
        .sc-btn-clicker:hover { transform: translateY(-2px); filter: brightness(1.05); }

        /* SOFTWARE PRICING GRID */
        .sc-pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 30px;
          width: 100%;
          max-width: 900px;
          margin-bottom: 60px;
        }

        .sc-plan-card {
          background: rgba(17, 24, 39, 0.4);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .sc-plan-card.pro {
          background: rgba(20, 39, 96, 0.3);
          border: 1px solid rgba(11, 99, 246, 0.4);
          box-shadow: 0 24px 60px rgba(11, 99, 246, 0.15);
          transform: translateY(-10px);
        }

        .sc-plan-card:hover { transform: translateY(-5px); }
        .sc-plan-card.pro:hover {
          transform: translateY(-15px);
          box-shadow: 0 32px 70px rgba(11, 99, 246, 0.25);
        }

        .sc-pro-badge {
          position: absolute;
          top: 0;
          right: 40px;
          background: linear-gradient(135deg, #f39c12, #d35400);
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          padding: 8px 16px;
          border-radius: 0 0 12px 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .sc-plan-name { font-size: 24px; font-weight: 800; margin: 0 0 8px 0; }
        
        .sc-plan-price {
          font-size: 48px;
          font-weight: 950;
          margin: 0 0 8px 0;
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .sc-plan-currency { font-size: 24px; color: rgba(255,255,255,0.5); }
        .sc-plan-period { font-size: 16px; color: rgba(255,255,255,0.5); font-weight: 600; white-space: nowrap; }
        .sc-plan-desc { font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 0 32px 0; line-height: 1.5; }

        .sc-feature-list {
          list-style: none;
          padding: 0;
          margin: 0 0 40px 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .sc-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 15px;
          color: rgba(255,255,255,0.9);
          line-height: 1.4;
        }

        .sc-feature-icon { color: #91cb23; font-size: 18px; flex-shrink: 0; }
        .sc-feature-icon.pro { color: #0b63f6; }
        .sc-feature-icon.missing { color: rgba(255,255,255,0.2); }

        .sc-btn-store {
          width: 100%;
          text-align: center;
          padding: 18px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .sc-btn-free { background: rgba(255,255,255,0.1); color: #ffffff; border: 1px solid rgba(255,255,255,0.2); }
        .sc-btn-free:hover { background: rgba(255,255,255,0.15); }
        
        .sc-btn-pro { background: linear-gradient(135deg, #0b63f6, #142760); color: #ffffff; box-shadow: 0 8px 20px rgba(11, 99, 246, 0.3); }
        .sc-btn-pro:hover { filter: brightness(1.1); transform: translateY(-2px); }
        
        .sc-btn-disabled { background: rgba(145, 203, 35, 0.15); color: #91cb23; border: 1px solid rgba(145, 203, 35, 0.3); cursor: default; }
      `}</style>

      <div className="sc-store-header">
        <h1 className="sc-store-title">Unlock Full Court Control</h1>
        <p className="sc-store-subtitle">
          Whether you are tracking weekend matches or broadcasting a local tournament, we have the tools for you.
        </p>
      </div>

      {/* HARDWARE SECTION - THE CLICKER (MOVED TO TOP) */}
      <div className="sc-hardware-section">
        <div className="sc-hardware-glow"></div>
        <div className="sc-hardware-image">
          {/* Placeholder for an actual product photo */}
          🔘
        </div>
        <div className="sc-hardware-content">
          <div className="sc-hardware-kicker">Official Hardware</div>
          <h2 className="sc-hardware-title">ScoreCourt Clicker</h2>
          <div className="sc-plan-price" style={{ marginBottom: "16px" }}>
            <span className="sc-plan-currency">$</span>70<span className="sc-plan-period"> AUD one-time</span>
          </div>
          <p className="sc-hardware-desc">
            Keep your phone at the back of the court. Clip this lightweight Bluetooth remote to your shorts or paddle and update the score seamlessly without dropping your momentum. Pairs instantly with the ScoreCourt app.
          </p>
          <a 
            href={user ? `${STRIPE_CLICKER_LINK}?client_reference_id=${user.id}&prefilled_email=${user.email}` : STRIPE_CLICKER_LINK} 
            className="sc-btn-clicker"
          >
            Buy the Clicker
          </a>
        </div>
      </div>

      <div className="sc-pricing-grid">
        {/* FREE PLAN */}
        <div className="sc-plan-card">
          <h2 className="sc-plan-name">ScoreCourt Free</h2>
          <div className="sc-plan-price">
            <span className="sc-plan-currency">$</span>0<span className="sc-plan-period"> AUD /mo</span>
          </div>
          <p className="sc-plan-desc">Everything you need to keep score for casual games on your phone.</p>
          
          <ul className="sc-feature-list">
            <li className="sc-feature-item">
              <span className="sc-feature-icon">✓</span>
              Unlimited local match scoring
            </li>
            <li className="sc-feature-item">
              <span className="sc-feature-icon">✓</span>
              Support for Tennis, Pickleball, Padel & Volleyball
            </li>
            <li className="sc-feature-item">
              <span className="sc-feature-icon">✓</span>
              Export match results to clipboard
            </li>
            <li className="sc-feature-item" style={{ opacity: 0.5 }}>
              <span className="sc-feature-icon missing">✕</span>
              Secondary screen live broadcasting
            </li>
            <li className="sc-feature-item" style={{ opacity: 0.5 }}>
              <span className="sc-feature-icon missing">✕</span>
              Custom Display URL (e.g. /display/your-name)
            </li>
          </ul>

          {user ? (
            <Link to="/app" className="sc-btn-store sc-btn-free">
              {isPro ? "Included" : "Current Plan"}
            </Link>
          ) : (
            <Link to="/auth" className="sc-btn-store sc-btn-free">
              Create Free Account
            </Link>
          )}
        </div>

        {/* PRO PLAN */}
        <div className="sc-plan-card pro">
          <div className="sc-pro-badge">Most Popular</div>
          <h2 className="sc-plan-name">ScoreCourt Pro</h2>
          <div className="sc-plan-price">
            <span className="sc-plan-currency">$</span>9<span className="sc-plan-period"> AUD /mo</span>
          </div>
          <p className="sc-plan-desc">For clubs, tournaments, and serious players who want to broadcast.</p>
          
          <ul className="sc-feature-list">
            <li className="sc-feature-item">
              <span className="sc-feature-icon pro">✓</span>
              Everything in Free, plus:
            </li>
            <li className="sc-feature-item">
              <span className="sc-feature-icon pro">✓</span>
              <strong>Live Display Broadcast:</strong> Cast scores instantly to any iPad, TV, or secondary monitor.
            </li>
            <li className="sc-feature-item">
              <span className="sc-feature-icon pro">✓</span>
              <strong>Custom URL:</strong> Get a dedicated link (scorecourt.com/display/you) for fans to watch.
            </li>
            <li className="sc-feature-item">
              <span className="sc-feature-icon pro">✓</span>
              <strong>Match Logs:</strong> Download detailed CSV rally history for deep analytics.
            </li>
          </ul>

          {!user ? (
            <Link to="/auth" className="sc-btn-store sc-btn-pro">
              Log in to Upgrade
            </Link>
          ) : isPro ? (
            <div className="sc-btn-store sc-btn-disabled">
              ★ Active Pro Member
            </div>
          ) : (
            <a 
              href={`${STRIPE_PRO_LINK}?client_reference_id=${user.id}&prefilled_email=${user.email}`} 
              className="sc-btn-store sc-btn-pro"
            >
              Upgrade to Pro
            </a>
          )}
        </div>
      </div>

    </div>
  );
};

export default Store;