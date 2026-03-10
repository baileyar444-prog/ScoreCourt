import React, { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useParams,
  Navigate
} from "react-router-dom";
import "./App.css";

// Auth Context
import { AuthProvider, useAuth } from "./AuthContext";

import Home from "./Home";
import ScoreApp from "./ScoreApp";
import Display from "./Display";
import Store from "./Store";
import Auth from "./Auth";
import MatchHistory from "./MatchHistory";

const LOGO_URL = "https://i.imgur.com/tsQkz9g.png";
const PREFERRED_SPORT_KEY = "scorecourt_preferred_sport_v1";

/* ============================= */
/* SPORT PRESELECT (ROUTE WRAPPER) */
/* ============================= */

const normalizeSport = (s) => String(s || "").trim().toLowerCase();

const writeSportEverywhere = (sportKey) => {
  const val = normalizeSport(sportKey);
  if (!val) return;
  try {
    localStorage.setItem(PREFERRED_SPORT_KEY, val);
  } catch (e) {
    console.error("Failed to save preferred sport", e);
  }
};

const AppRoutePreselect = ({ children }) => {
  const location = useLocation();
  const params = useParams();

  const chosenSport = useMemo(() => {
    let fromParam = "";
    if (params && params.sport) fromParam = params.sport;

    let fromQuery = new URLSearchParams(location.search).get("sport");

    let fromState = "";
    if (location && location.state && location.state.sport) {
      fromState = location.state.sport;
    }

    return normalizeSport(fromParam || fromQuery || fromState);
  }, [params, location.search, location.state]);

  useEffect(() => {
    if (chosenSport) writeSportEverywhere(chosenSport);
  }, [chosenSport]);

  const childWithProps = useMemo(() => {
    return React.cloneElement(children, {
      initialSport: chosenSport || undefined,
      key: chosenSport || "nosport"
    });
  }, [children, chosenSport]);

  return childWithProps;
};

/* ============================= */
/* PROTECTED ROUTE BOUNCER       */
/* ============================= */

const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', backgroundColor: '#070b16' }}>
        <h2 style={{ fontFamily: 'sans-serif' }}>Loading ScoreCourt...</h2>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

/* ============================= */
/* NAVBAR WITH HOVER DROPDOWN    */
/* ============================= */

const NavigationBar = () => {
  const { user, profile, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu automatically when the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "My Account";
  const isPro = profile?.is_pro || false;
  const email = user?.email || "";

  const navDisplaySlug = user?.id 
    ? user.id.replace(/\D/g, '').padEnd(6, '0').substring(0, 6) 
    : 'demo';

  return (
    <>
      <nav className="main-nav">
        <style>{`
          /* FLOATING PILL NAVBAR DESIGN */
          .main-nav {
            position: sticky;
            top: 15px; 
            margin: 15px auto; 
            max-width: 1200px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 24px;
            background: rgba(20, 25, 45, 0.85); 
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 20px; 
            z-index: 1000;
            box-shadow: 0 10px 40px rgba(0,0,0,0.4);
          }

          @media (max-width: 1240px) {
            .main-nav {
              margin: 15px 20px;
            }
          }

          .nav-left, .nav-right {
            display: flex;
            align-items: center;
          }

          .nav-links {
            display: flex;
            gap: 28px;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
          }

          .nav-links a {
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            transition: color 0.2s;
            white-space: nowrap; 
          }

          .nav-links a:hover {
            color: #ffffff;
          }

          .mobile-menu-btn {
            display: none;
            background: transparent;
            border: none;
            color: #ffffff;
            font-size: 28px;
            cursor: pointer;
            padding: 0 10px;
          }

          .desktop-auth-container {
            display: flex;
            align-items: center;
          }

          .mobile-nav-panel {
            display: none;
            position: absolute;
            top: calc(100% + 10px);
            left: 0;
            right: 0;
            background: rgba(20, 25, 45, 0.98);
            backdrop-filter: blur(24px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 20px;
            flex-direction: column;
            gap: 16px;
            z-index: 999;
            box-shadow: 0 20px 50px rgba(0,0,0,0.6);
          }
          .mobile-nav-panel.open {
            display: flex;
          }
          .mobile-nav-panel a {
            color: #ffffff;
            text-decoration: none;
            font-size: 18px;
            font-weight: 800;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
          }

          .user-menu-container { position: relative; display: inline-block; }
          .user-menu-btn { background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.15) !important; cursor: default; display: flex; align-items: center; gap: 8px; }
          .user-dropdown {
            position: absolute; top: 100%; right: 0; margin-top: 12px; width: 240px;
            background: rgba(20, 25, 45, 0.95); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.12);
            border-radius: 16px; padding: 16px; box-shadow: 0 18px 45px rgba(0,0,0,0.4);
            opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.2s; z-index: 9999;
            display: flex; flex-direction: column; gap: 12px;
          }
          .user-menu-container:hover .user-dropdown { opacity: 1; visibility: visible; transform: translateY(0); }
          .user-menu-container::after { content: ""; position: absolute; top: 100%; left: 0; width: 100%; height: 15px; }

          .dropdown-info { display: flex; flex-direction: column; gap: 4px; }
          .dropdown-info strong { color: #ffffff; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .dropdown-email { color: rgba(255,255,255,0.6); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .dropdown-status { margin-top: 8px; font-size: 11px; font-weight: 900; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; width: max-content; gap: 6px; }
          .dropdown-status.pro { background: rgba(243, 156, 18, 0.15); color: #f39c12; border: 1px solid rgba(243, 156, 18, 0.3); }
          .dropdown-status.free { background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.8); border: 1px solid rgba(255, 255, 255, 0.15); }
          .dropdown-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 4px 0; }
          .dropdown-logout { background: transparent; border: none; color: #ff6b6b; font-weight: 800; font-size: 14px; text-align: left; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
          .dropdown-logout:hover { background: rgba(255, 107, 107, 0.1); color: #ff4757; }
          .dropdown-warning { font-size: 11px; color: rgba(255, 107, 107, 0.8); line-height: 1.3; padding: 0 12px; margin-top: -6px; font-weight: 500; }

          @media (max-width: 900px) {
            .nav-links { display: none; }
            .desktop-auth-container { display: none; }
            .mobile-menu-btn { display: block; }
            
            .main-nav {
              margin: 10px;
              top: 10px;
              padding: 10px 20px;
            }
          }
        `}</style>

        <div className="nav-left">
          <Link to="/" className="brand">
            <img
              src={LOGO_URL}
              alt="ScoreCourt"
              style={{ height: 38, width: "auto", display: "block" }}
            />
          </Link>
        </div>

        {/* Desktop Links */}
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/app">Use App</Link>
          <Link to={user ? `/display/${navDisplaySlug}` : "/display/demo"}>Display</Link>
          <Link to="/history">History</Link>
          <Link to="/store">Store</Link>
        </div>

        <div className="nav-right">
          {/* Desktop Account Menu */}
          <div className="desktop-auth-container">
            {user ? (
              <div className="user-menu-container">
                <div className="cta user-menu-btn">
                  {displayName} 
                  {isPro && <span style={{ color: '#f39c12', fontSize: '14px' }}>★</span>}
                </div>
                
                <div className="user-dropdown">
                  <div className="dropdown-info">
                    <strong>{displayName}</strong>
                    <span className="dropdown-email">{email}</span>
                    <span className={`dropdown-status ${isPro ? 'pro' : 'free'}`}>
                      {isPro ? '★ PRO PLAN' : 'FREE PLAN'}
                    </span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button onClick={signOut} className="dropdown-logout">
                    Log Out
                  </button>
                  <div className="dropdown-warning">
                    If you are in the middle of a live match, your local score data will not save.
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/auth" className="cta">
                Login or Signup
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Icon */}
          <button 
            className="mobile-menu-btn" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            ☰
          </button>
        </div>

        {/* Mobile Dropdown Panel */}
        <div className={`mobile-nav-panel ${isMobileMenuOpen ? 'open' : ''}`}>
          <Link to="/">Home</Link>
          <Link to="/app">Use App</Link>
          <Link to={user ? `/display/${navDisplaySlug}` : "/display/demo"}>Display</Link>
          <Link to="/history">History</Link>
          <Link to="/store">Store</Link>
          
          <div className="dropdown-divider" style={{ margin: '10px 0' }}></div>
          
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="dropdown-info" style={{ marginBottom: '8px' }}>
                <strong style={{ fontSize: '18px' }}>{displayName}</strong>
                <span className="dropdown-email" style={{ fontSize: '14px', marginBottom: '8px', display: 'block' }}>{email}</span>
                <span className={`dropdown-status ${isPro ? 'pro' : 'free'}`} style={{ fontSize: '12px', padding: '6px 12px' }}>
                  {isPro ? '★ PRO PLAN' : 'FREE PLAN'}
                </span>
              </div>
              
              <button 
                onClick={signOut} 
                style={{ 
                  background: 'rgba(255, 107, 107, 0.15)', 
                  color: '#ff4757', 
                  border: '1px solid rgba(255, 107, 107, 0.3)', 
                  padding: '14px', 
                  borderRadius: '10px', 
                  fontSize: '16px', 
                  fontWeight: '800', 
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '4px'
                }}
              >
                Log Out
              </button>

              <div style={{ 
                fontSize: '13px', 
                color: 'rgba(255, 107, 107, 0.9)', 
                lineHeight: '1.4', 
                textAlign: 'center', 
                marginTop: '4px',
                fontWeight: '500'
              }}>
                If you are in the middle of a live match, your local score data will not save.
              </div>
            </div>
          ) : (
            <Link 
              to="/auth" 
              style={{ background: '#0b63f6', color: '#fff', textAlign: 'center', padding: '14px', borderRadius: '10px', fontSize: '16px', fontWeight: '800' }}
            >
              Login or Signup
            </Link>
          )}
        </div>
      </nav>
    </>
  );
};

/* ============================= */
/* FOOTER */
/* ============================= */

const Footer = () => {
  return (
    <footer className="footer">
      <img
        src={LOGO_URL}
        alt="ScoreCourt"
        style={{ height: 48, marginBottom: 10, display: "block", marginLeft: "auto", marginRight: "auto" }}
      />
    </footer>
  );
};

/* ============================= */
/* APP SHELL (CAN HIDE NAV/FOOTER) */
/* ============================= */

const AppShell = () => {
  const location = useLocation();
  let hideChrome = false;
  if (location && location.pathname.startsWith("/display")) hideChrome = true;

  // 🔥 GLOBAL HARDWARE BLOCKER 🔥
  // This constantly monitors the entire app and stops the clicker from scrolling pages.
  useEffect(() => {
    const blockClickerScrolling = (e) => {
      if (e.code === "PageUp" || e.code === "PageDown") {
        e.preventDefault(); // Kills the scroll action immediately
      }
    };

    // 'passive: false' is required to allow preventDefault to stop scrolling
    window.addEventListener("keydown", blockClickerScrolling, { passive: false });
    
    return () => {
      window.removeEventListener("keydown", blockClickerScrolling);
    };
  }, []);

  return (
    <div>
      {hideChrome ? null : <NavigationBar />}

      <div className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppRoutePreselect>
                  <ScoreApp />
                </AppRoutePreselect>
              </RequireAuth>
            }
          />
          <Route
            path="/app/:sport"
            element={
              <RequireAuth>
                <AppRoutePreselect>
                  <ScoreApp />
                </AppRoutePreselect>
              </RequireAuth>
            }
          />
          
          <Route 
            path="/history" 
            element={
              <RequireAuth>
                <MatchHistory />
              </RequireAuth>
            } 
          />

          <Route path="/display/:slug" element={<Display />} />
          <Route path="/display" element={<Display />} />
          <Route path="/store" element={<Store />} />
        </Routes>
      </div>

      {hideChrome ? null : <Footer />}
    </div>
  );
};

/* ============================= */
/* MAIN APP */
/* ============================= */

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;