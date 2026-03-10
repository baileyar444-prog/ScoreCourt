import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const Auth = () => {
  // We swapped isLogin for a mode state: 'login', 'signup', or 'forgot'
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if they actually log in, not if they just ask for a password reset
    if (user && mode !== "forgot") {
      navigate("/app", { replace: true });
    }
  }, [user, navigate, mode]);

  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (mode !== "forgot" && password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters long." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    const timeoutId = setTimeout(() => {
      setLoading(false);
      setMessage({ type: "error", text: "Network timeout. The request took too long. Please try again." });
    }, 8000);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        clearTimeout(timeoutId);
        
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (error) throw error;
        clearTimeout(timeoutId);

      } else if (mode === "forgot") {
        // Fires the password reset email via Supabase
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/app",
        });
        if (error) throw error;
        
        clearTimeout(timeoutId);
        setMessage({ type: "success", text: "Password reset instructions sent to your email!" });
        setLoading(false);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Authentication Error:", error);
      setMessage({ type: "error", text: error.message || "An unexpected error occurred." });
      setLoading(false);
    }
  };

  return (
    <div className="sc-auth-page">
      <style>{`
        .sc-auth-page { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 150px); padding: 20px; color: #ffffff; }
        .sc-auth-card { width: 100%; max-width: 440px; border-radius: 22px; border: 1px solid rgba(255,255,255,.12); background: rgba(17,24,39,.35); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); padding: 40px; box-shadow: 0 18px 45px rgba(0,0,0,.35); display: flex; flex-direction: column; gap: 24px; }
        .sc-auth-title { margin: 0; font-weight: 950; font-size: 28px; text-align: center; }
        .sc-auth-sub { margin: 0; opacity: 0.78; text-align: center; font-size: 15px; font-weight: 500; }
        .sc-form { display: flex; flex-direction: column; gap: 16px; }
        .sc-input-group { display: flex; flex-direction: column; gap: 8px; }
        .sc-label { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8; }
        .sc-input { height: 48px; border-radius: 12px; border: 1px solid rgba(255,255,255,.16); background: rgba(0,0,0,.2); padding: 0 16px; color: #ffffff; font-size: 16px; outline: none; transition: border-color 0.2s; }
        .sc-input:focus { border-color: #0b63f6; background: rgba(0,0,0,.4); }
        .sc-btn-submit { height: 48px; border-radius: 12px; border: none; background: linear-gradient(180deg, #0b63f6, rgba(11,99,246,.72)); color: #ffffff; font-weight: 900; font-size: 16px; cursor: pointer; transition: transform 0.1s; margin-top: 8px; }
        .sc-btn-submit:hover:not(:disabled) { filter: brightness(1.1); }
        .sc-btn-submit:active:not(:disabled) { transform: scale(0.98); }
        .sc-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .sc-forgot-link {
          font-size: 12px;
          color: rgba(255,255,255,0.6);
          text-align: right;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-weight: 600;
          margin-top: -4px;
        }
        .sc-forgot-link:hover { color: #ffffff; text-decoration: underline; }

        .sc-toggle-text { text-align: center; font-size: 14px; opacity: 0.8; margin: 0; }
        .sc-toggle-link { color: #91cb23; font-weight: 800; cursor: pointer; background: none; border: none; padding: 0; font-size: inherit; }
        .sc-toggle-link:hover { text-decoration: underline; }
        
        .sc-msg { padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 600; text-align: center; }
        .sc-msg-error { background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3); color: #ff6b6b; }
        .sc-msg-success { background: rgba(145,203,35,0.1); border: 1px solid rgba(145,203,35,0.3); color: #91cb23; }
      `}</style>

      <div className="sc-auth-card">
        <div>
          <h1 className="sc-auth-title">
            {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
          </h1>
          <p className="sc-auth-sub">
            {mode === "login" ? "Log in to access your ScoreCourt features." 
              : mode === "signup" ? "Join ScoreCourt to track your matches." 
              : "Enter your email to receive a reset link."}
          </p>
        </div>

        {message.text && (
          <div className={`sc-msg sc-msg-${message.type}`}>
            {message.text}
          </div>
        )}

        <form className="sc-form" onSubmit={handleAuth}>
          
          {mode === "signup" && (
            <div className="sc-input-group">
              <label className="sc-label">Full Name</label>
              <input
                type="text"
                className="sc-input"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="sc-input-group">
            <label className="sc-label">Email</label>
            <input
              type="email"
              className="sc-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== "forgot" && (
            <div className="sc-input-group">
              <label className="sc-label">Password</label>
              <input
                type="password"
                className="sc-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {mode === "login" && (
                <button 
                  type="button" 
                  className="sc-forgot-link"
                  onClick={() => {
                    setMode("forgot");
                    setMessage({ type: "", text: "" });
                  }}
                >
                  Forgot Password?
                </button>
              )}
            </div>
          )}
          
          <button type="submit" className="sc-btn-submit" disabled={loading}>
            {loading ? "Processing..." : (mode === "login" ? "Log In" : mode === "signup" ? "Sign Up" : "Send Reset Link")}
          </button>
        </form>

        <p className="sc-toggle-text">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button type="button" className="sc-toggle-link" onClick={() => { setMode("signup"); setMessage({ type: "", text: "" }); }}>
                Sign Up
              </button>
            </>
          ) : (
            <>
              Back to{" "}
              <button type="button" className="sc-toggle-link" onClick={() => { setMode("login"); setMessage({ type: "", text: "" }); }}>
                Log In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Auth;