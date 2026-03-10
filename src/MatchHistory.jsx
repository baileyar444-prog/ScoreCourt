import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { supabase } from "./supabaseClient";

// ==========================================
// HELPERS
// ==========================================
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const formatDuration = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
};

const getScoreLine = (md) => {
  if (!md || !md.winner) return "No score data available";
  const wTeam = md.winner;
  const lTeam = md.winner === "A" ? "B" : "A";
  const wName = md.teams?.[wTeam]?.name || "Winner";
  const lName = md.teams?.[lTeam]?.name || "Loser";

  if (md.sport === "Tennis" || md.sport === "Padel") {
    return `${wName} [${md.tennis?.sets?.[wTeam] || 0}] def. ${lName} [${md.tennis?.sets?.[lTeam] || 0}]`;
  } else if (md.sport === "Volleyball") {
    return `${wName} [${md.volley?.sets?.[wTeam] || 0}] def. ${lName} [${md.volley?.sets?.[lTeam] || 0}]`;
  } else {
    return `${wName} [${md.gamesWon?.[wTeam] || 0}] def. ${lName} [${md.gamesWon?.[lTeam] || 0}]`;
  }
};

// Fixed to respect singles/doubles mode
const getPlayersString = (teamData, mode) => {
  if (!teamData || !teamData.players) return "";
  const playersArr = mode === "singles" ? [teamData.players[0]] : teamData.players;
  const validPlayers = playersArr.filter(p => p && String(p).trim() !== "");
  return validPlayers.join(" & ");
};

// ==========================================
// SVG MOMENTUM GRAPH ENGINE
// ==========================================
const MomentumGraph = ({ events, teamAName, teamBName }) => {
  if (!events || events.length === 0) return (
    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", padding: "20px 0", textAlign: "center" }}>
      Not enough data to draw graph.
    </div>
  );
  
  const width = 400;
  const height = 80;
  
  let currentA = 0;
  let currentB = 0;
  const points = [{x: 0, y: 0}]; 
  
  events.forEach((ev, i) => {
    if(ev.team === 'A') currentA++;
    else currentB++;
    points.push({ x: i + 1, y: currentA - currentB });
  });
  
  const maxX = events.length;
  const maxY = Math.max(...points.map(p => p.y), 1);
  const minY = Math.min(...points.map(p => p.y), -1);
  const rangeY = Math.max(Math.abs(maxY), Math.abs(minY));
  
  const scaleX = width / (maxX === 0 ? 1 : maxX);
  const scaleY = (height / 2) / rangeY;
  
  const pathD = points.map((p, i) => {
    const px = p.x * scaleX;
    const py = (height / 2) - (p.y * scaleY);
    return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
  }).join(' ');

  return (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.6, marginBottom: '8px', textTransform: 'uppercase', fontWeight: 800 }}>
        <span style={{ color: '#0b63f6' }}>{teamAName} Momentum</span>
        <span style={{ color: '#91cb23' }}>{teamBName} Momentum</span>
      </div>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 4" />
        <path d={pathD} fill="none" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => {
           if (i===0) return null;
           const isA = p.y > points[i-1].y;
           const cx = p.x * scaleX;
           const cy = (height / 2) - (p.y * scaleY);
           return <circle key={i} cx={cx} cy={cy} r="4" fill={isA ? '#0b63f6' : '#91cb23'} />
        })}
      </svg>
    </div>
  );
};

// ==========================================
// MATCH CARD COMPONENT
// ==========================================
const MatchCard = ({ matchRow }) => {
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const md = matchRow.match_data;
  
  const teamAPlayers = getPlayersString(md?.teams?.A, md?.mode);
  const teamBPlayers = getPlayersString(md?.teams?.B, md?.mode);

  // NATIVE CANVAS IMAGE EXPORTER WITH LOGO
  const handleDownloadGraphic = () => {
    setIsGenerating(true);
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");

    const drawContent = (img) => {
      // 1. Draw Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
      gradient.addColorStop(0, "#0b63f6"); // Blue top left
      gradient.addColorStop(1, "#070b16"); // Dark bottom right
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1080);

      // 2. Draw ScoreCourt Logo
      if (img) {
        const logoWidth = 450;
        const logoHeight = (img.height / img.width) * logoWidth;
        // Position logo perfectly center at the top
        ctx.drawImage(img, 540 - (logoWidth / 2), 120, logoWidth, logoHeight);
      } else {
        // Fallback if network blocks the image
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 60px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SCORECOURT", 540, 180);
      }

      // 3. Draw Sport Badge
      ctx.fillStyle = "#91cb23"; // Green
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.letterSpacing = "4px";
      ctx.fillText(`FINAL SCORE • ${matchRow.sport.toUpperCase()}`, 540, 360);

      // 4. Draw Winner Name
      const wTeam = md.winner;
      const wName = md.teams?.[wTeam]?.name || "Winner";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 100px sans-serif";
      ctx.fillText(`🏆 ${wName.toUpperCase()} WINS`, 540, 480);

      // 5. Draw Scoreline
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "bold 70px sans-serif";
      ctx.fillText(getScoreLine(md), 540, 620);

      // 6. Draw Players matchup
      const matchupString = `${teamAPlayers || md.teams?.A?.name} vs ${teamBPlayers || md.teams?.B?.name}`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "bold 42px sans-serif";
      ctx.fillText(matchupString, 540, 740);

      // 7. Draw Footer Branding
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "bold 28px sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText("POWERED BY SCORECOURT", 540, 1000);

      // Trigger the local file download
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `ScoreCourt_${matchRow.sport}_Result.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Canvas export error:", err);
        alert("Your browser security blocked the image export. Try right-clicking and saving instead.");
      }
      setIsGenerating(false);
    };

    // Load the logo asynchronously to ensure it stamps correctly
    const logo = new Image();
    logo.crossOrigin = "Anonymous"; // Required to allow canvas export with external images
    logo.src = "https://i.imgur.com/tsQkz9g.png";
    
    logo.onload = () => drawContent(logo);
    logo.onerror = () => drawContent(null); // Continue even if logo fails
  };

  return (
    <div className="card" style={{ padding: '24px', backgroundColor: '#353839', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ backgroundColor: 'rgba(11, 99, 246, 0.15)', color: '#0b63f6', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {matchRow.sport}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: '600' }}>
          {formatDate(matchRow.created_at)}
        </span>
      </div>
      
      <h3 style={{ margin: '0 0 12px', color: '#ffffff', fontSize: '1.2rem', fontWeight: '800' }}>
        {matchRow.match_name || 'ScoreCourt Match'}
      </h3>
      
      <div style={{ color: '#91cb23', fontWeight: '900', marginBottom: '16px', fontSize: '1.1rem' }}>
        🏆 {matchRow.winner} Wins
      </div>
      
      {/* Score Box */}
      <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '1.05rem', color: '#ffffff', fontWeight: '800', marginBottom: (teamAPlayers || teamBPlayers) ? '8px' : '0' }}>
          {getScoreLine(md)}
        </div>
        
        {/* Player Names Display */}
        {(teamAPlayers || teamBPlayers) && (
          <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4', fontWeight: 500 }}>
            {teamAPlayers && <div><span style={{color: '#0b63f6', fontWeight: 700}}>Team A:</span> {teamAPlayers}</div>}
            {teamBPlayers && <div><span style={{color: '#91cb23', fontWeight: 700}}>Team B:</span> {teamBPlayers}</div>}
          </div>
        )}
      </div>

      {/* Momentum Graph Accordion */}
      <button 
        onClick={() => setIsGraphOpen(!isGraphOpen)}
        style={{ background: 'transparent', border: 'none', color: '#0b63f6', fontSize: '0.9rem', fontWeight: 800, textAlign: 'left', padding: '16px 0 0 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        {isGraphOpen ? '− Hide Match Momentum' : '+ Show Match Momentum'}
      </button>

      {isGraphOpen && (
        <MomentumGraph 
          events={md?.events} 
          teamAName={md?.teams?.A?.name || "Team A"}
          teamBName={md?.teams?.B?.name || "Team B"}
        />
      )}
      
      {/* Footer Controls */}
      <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⏱</span> {formatDuration(matchRow.duration_seconds || 0)}
        </div>
        
        <button 
          onClick={handleDownloadGraphic} 
          disabled={isGenerating}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', cursor: isGenerating ? 'wait' : 'pointer', fontWeight: 800, transition: 'background 0.2s', opacity: isGenerating ? 0.7 : 1 }}
          onMouseOver={(e) => { if(!isGenerating) e.target.style.background = 'rgba(255,255,255,0.15)' }}
          onMouseOut={(e) => { if(!isGenerating) e.target.style.background = 'rgba(255,255,255,0.08)' }}
        >
          {isGenerating ? '⏳ Processing...' : '⬇ Download Image'}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
export default function MatchHistory() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchMatches = async () => {
      try {
        const { data, error } = await supabase
          .from('completed_matches')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMatches(data || []);
      } catch (err) {
        console.error('Error fetching matches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user]);

  return (
    <div className="app-wrap" style={{ padding: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#ffffff', margin: 0, fontSize: '2rem', fontWeight: '950', letterSpacing: '-0.02em' }}>
          Match History
        </h1>
        <Link to="/app" className="btn btnPrimary" style={{ backgroundColor: '#0b63f6', color: '#ffffff', border: 'none', fontWeight: 'bold' }}>
          + New Match
        </Link>
      </div>
      
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>Loading your matches...</div>
      ) : matches.length === 0 ? (
        <div className="card soft" style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#353839' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏟️</div>
          <h3 style={{ margin: '0 0 12px', color: '#ffffff', fontSize: '1.5rem', fontWeight: '900' }}>No matches completed yet</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 auto 20px', fontSize: '1.1rem', maxWidth: '400px', lineHeight: '1.5' }}>
            When you finish a match and a winner is declared in the console, the final score will automatically save here.
          </p>
          <Link to="/app" className="btn btnPrimary" style={{ backgroundColor: '#0b63f6', color: '#ffffff', border: 'none', fontWeight: 'bold', padding: '12px 24px' }}>
            Start a Match
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {matches.map(m => (
            <MatchCard key={m.id} matchRow={m} />
          ))}
        </div>
      )}
    </div>
  );
}