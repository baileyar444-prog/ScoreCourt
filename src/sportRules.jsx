// sportRules.jsx
// Event-log based scoring engine using the Strategy Pattern.
// Easily extensible: To add a new sport, just add a new object to SPORT_STRATEGIES.

export const SPORTS = ["Pickleball", "Badminton", "Tennis", "Padel", "Volleyball"];

/* ---------- Global Helpers ---------- */
export function deepCopy(obj) { return JSON.parse(JSON.stringify(obj)); }
function now() { return Date.now(); }
function neededToWinBestOf(bestOf) { return Math.ceil((bestOf || 1) / 2); }

function swapCourtSides(match, team) {
  const pos = match.court[team];
  const tmp = pos.left;
  pos.left = pos.right;
  pos.right = tmp;
}

function updateServePlayerIndex(match) {
  if (match.sport === "Tennis" || match.sport === "Padel") {
    if (match.mode === "doubles") {
      match.serve.playerIndex = match.tennis.serverIndex[match.serve.team] || 0;
    } else {
      match.serve.playerIndex = 0;
    }
    return;
  }
  
  const team = match.serve.team;
  const side = match.serve.side;
  const pos = match.court[team];
  match.serve.playerIndex = side === "R" ? pos.right : pos.left;
}

/* ---------- 1. Pickleball Logic ---------- */
function setServeSideByParityForPickleball(match) {
  const teamScore = match.points[match.serve.team];
  match.serve.side = teamScore % 2 === 0 ? "R" : "L";
  updateServePlayerIndex(match);
}

function applyPickleballRally(match, rallyWinnerTeam) {
  const serving = match.serve.team;
  const receiving = serving === "A" ? "B" : "A";

  if (match.mode === "singles") {
    if (rallyWinnerTeam === serving) {
      match.points[serving] += 1;
      swapCourtSides(match, serving);
      setServeSideByParityForPickleball(match);
    } else {
      match.serve.team = receiving;
      match.serve.serveNumber = 1;
      setServeSideByParityForPickleball(match);
      if (match.pickleball.openingSingleServerActive && serving === match.pickleball.openingTeam) {
        match.pickleball.openingSingleServerActive = false;
      }
    }
    return;
  }

  if (rallyWinnerTeam === serving) {
    match.points[serving] += 1;
    swapCourtSides(match, serving);
    setServeSideByParityForPickleball(match);
    return;
  }

  if (match.serve.serveNumber === 1) {
    match.serve.serveNumber = 2;
    const prevServerIdx = match.serve.playerIndex;
    setServeSideByParityForPickleball(match);
    if (match.serve.playerIndex === prevServerIdx) {
      swapCourtSides(match, serving);
      setServeSideByParityForPickleball(match);
    }
    return;
  }

  match.serve.team = receiving;
  if (match.pickleball.openingSingleServerActive && serving === match.pickleball.openingTeam) {
    match.pickleball.openingSingleServerActive = false;
  }

  if (match.pickleball.openingSingleServerActive && match.serve.team === match.pickleball.openingTeam) {
    match.serve.serveNumber = 2;
  } else {
    match.serve.serveNumber = 1;
  }
  setServeSideByParityForPickleball(match);
}

/* ---------- 2. Badminton Logic ---------- */
function setServeSideByParityForBadmintonSingles(match) {
  const teamScore = match.points[match.serve.team];
  match.serve.badmintonSide = teamScore % 2 === 0 ? "R" : "L";
}

function applyBadmintonRally(match, rallyWinnerTeam) {
  const previousServer = match.serve.team;
  match.points[rallyWinnerTeam] += 1;
  match.serve.team = rallyWinnerTeam;

  if (match.mode === "singles") {
    setServeSideByParityForBadmintonSingles(match);
    match.serve.side = match.serve.badmintonSide;
    updateServePlayerIndex(match);
    return;
  }

  if (rallyWinnerTeam === previousServer) swapCourtSides(match, rallyWinnerTeam);
  const score = match.points[rallyWinnerTeam];
  match.serve.side = score % 2 === 0 ? "R" : "L";
  updateServePlayerIndex(match);
  match.badminton.serverIndex[rallyWinnerTeam] = match.serve.playerIndex;
}

/* ---------- Game Win Helpers (Pickleball/Badminton) ---------- */
function checkPointsGameWinner(match) {
  const { pointsToWin, winBy } = match.format;
  const a = match.points.A;
  const b = match.points.B;
  if (a >= pointsToWin && a - b >= winBy) return "A";
  if (b >= pointsToWin && b - a >= winBy) return "B";
  return null;
}

function handlePointsGameWin(match, sport) {
  const gw = checkPointsGameWinner(match);
  if (!gw) return;

  match.gamesWon[gw] += 1;
  match.points.A = 0;
  match.points.B = 0;
  match.serve.team = gw;

  if (sport === "Pickleball") {
    if (match.mode === "doubles" && match.pickleball.openingSingleServer && match.pickleball.openingSingleServerActive && match.serve.team === match.pickleball.openingTeam) {
      match.serve.serveNumber = 2;
    } else {
      match.serve.serveNumber = 1;
    }
    setServeSideByParityForPickleball(match);
  } else if (sport === "Badminton") {
    match.serve.side = (match.points[match.serve.team] % 2 === 0) ? "R" : "L";
    updateServePlayerIndex(match);
    setServeSideByParityForBadmintonSingles(match);
  }

  const needed = neededToWinBestOf(match.format.bestOf);
  if (match.gamesWon.A >= needed) match.winner = "A";
  if (match.gamesWon.B >= needed) match.winner = "B";
  if (match.winner) match.phase = "finished";
}

/* ---------- 3. Volleyball Logic ---------- */
function applyVolleyballRally(match, rallyWinnerTeam) {
  const previousServer = match.serve.team;
  match.points[rallyWinnerTeam] += 1;

  if (rallyWinnerTeam !== previousServer) {
    match.volley.rotationIndex[rallyWinnerTeam] = (match.volley.rotationIndex[rallyWinnerTeam] + 1) % 6;
  }
  match.serve.team = rallyWinnerTeam;

  const isFinal = match.volley.currentSet === (match.format.bestOf || 5);
  const setTo = isFinal ? (match.format.finalSetTo || 15) : (match.format.pointsToWin || 25);
  const winBy = match.format.winBy || 2;

  const a = match.points.A;
  const b = match.points.B;
  let setWinner = null;
  if (a >= setTo && a - b >= winBy) setWinner = "A";
  if (b >= setTo && b - a >= winBy) setWinner = "B";

  if (setWinner) {
    match.volley.sets[setWinner] += 1;
    match.volley.currentSet += 1;
    match.points.A = 0;
    match.points.B = 0;

    const needed = neededToWinBestOf(match.format.bestOf || 5);
    if (match.volley.sets.A >= needed) match.winner = "A";
    if (match.volley.sets.B >= needed) match.winner = "B";
    if (match.winner) match.phase = "finished";
  }
}

/* ---------- 4. Tennis/Padel Logic ---------- */
function isDeuce(t) { return t.points.A >= 3 && t.points.B >= 3 && t.points.A === t.points.B; }
function wonTiebreak(t, team, to = 7) {
  const other = team === "A" ? "B" : "A";
  return t.tiebreak[team] >= to && t.tiebreak[team] - t.tiebreak[other] >= 2;
}
function wonSet(t, format, team) {
  const other = team === "A" ? "B" : "A";
  return !t.isTiebreak && t.games[team] >= format.gamesToWinSet && t.games[team] - t.games[other] >= 2;
}

function startTiebreakIfNeeded(t, format) {
  if (t.games.A === format.gamesToWinSet && t.games.B === format.gamesToWinSet) {
    t.isTiebreak = true; t.tiebreak.A = 0; t.tiebreak.B = 0; t.points.A = 0; t.points.B = 0; t.adv = null;
  }
}

function rotateServerForNextGame(match) {
  const finishedTeam = match.serve.team;
  match.serve.team = match.serve.team === "A" ? "B" : "A";
  if (match.mode === "doubles") {
    match.tennis.serverIndex[finishedTeam] = match.tennis.serverIndex[finishedTeam] === 0 ? 1 : 0;
  }
  match.serve.side = "R";
  updateServePlayerIndex(match);
}

function applyTennisPoint(match, team) {
  const f = match.format; const t = match.tennis; const other = team === "A" ? "B" : "A";

  if (t.isTiebreak) {
    t.tiebreak[team] += 1;
    const totalTbPoints = t.tiebreak.A + t.tiebreak.B;

    if (wonTiebreak(t, team, f.tiebreakTo)) {
      t.sets[team] += 1; t.games.A = 0; t.games.B = 0; t.isTiebreak = false;
      t.tiebreak.A = 0; t.tiebreak.B = 0; t.points.A = 0; t.points.B = 0; t.adv = null;
      match.serve.team = t.tiebreakFirstServer === "A" ? "B" : "A";
      t.tiebreakFirstServer = null; match.serve.side = "R";
      updateServePlayerIndex(match);

      const needed = neededToWinBestOf(f.bestOf || 3);
      if (t.sets.A >= needed) match.winner = "A";
      if (t.sets.B >= needed) match.winner = "B";
      if (match.winner) match.phase = "finished";
      return;
    }
    if (totalTbPoints % 2 === 1) {
      const finishedTeam = match.serve.team;
      match.serve.team = match.serve.team === "A" ? "B" : "A";
      if (match.mode === "doubles") match.tennis.serverIndex[finishedTeam] = match.tennis.serverIndex[finishedTeam] === 0 ? 1 : 0;
    }
    match.serve.side = totalTbPoints % 2 === 0 ? "R" : "L";
    updateServePlayerIndex(match);
    return;
  }

  // Handle traditional Deuce advantage if not Golden Point
  if (!f.goldenPoint && isDeuce(t)) {
    if (t.adv === null) { t.adv = team; match.serve.side = "L"; updateServePlayerIndex(match); return; }
    if (t.adv !== team) { t.adv = null; match.serve.side = "R"; updateServePlayerIndex(match); return; }
  }

  if (!(isDeuce(t) && !f.goldenPoint && t.adv === team)) t.points[team] += 1;

  // The win margin drops to 1 during a Golden Point
  const winMargin = f.goldenPoint ? 1 : 2;
  const wonGame = (t.points[team] >= 4 && t.points[team] - t.points[other] >= winMargin) || (!f.goldenPoint && isDeuce(t) && t.adv === team);

  if (wonGame) {
    t.games[team] += 1; t.points.A = 0; t.points.B = 0; t.adv = null;
    startTiebreakIfNeeded(t, f);
    if (t.isTiebreak && !t.tiebreakFirstServer) t.tiebreakFirstServer = match.serve.team === "A" ? "B" : "A";
    if (!t.isTiebreak && wonSet(t, f, team)) {
      t.sets[team] += 1; t.games.A = 0; t.games.B = 0; t.points.A = 0; t.points.B = 0; t.adv = null;
    }
    rotateServerForNextGame(match);
    const needed = neededToWinBestOf(f.bestOf || 3);
    if (t.sets.A >= needed) match.winner = "A";
    if (t.sets.B >= needed) match.winner = "B";
    if (match.winner) match.phase = "finished";
    return;
  }

  // Clear advantage safely if they hit exactly 40-40 
  if (!f.goldenPoint && t.points.A >= 3 && t.points.B >= 3 && t.points.A === t.points.B) t.adv = null;

  const totalPoints = t.points.A + t.points.B;
  match.serve.side = totalPoints % 2 === 0 ? "R" : "L";
  updateServePlayerIndex(match);
}

/* ======================================================== */
/* THE STRATEGY DICTIONARY                                  */
/* Everything above this is isolated. Everything below uses */
/* this object to figure out how to handle a specific sport.*/
/* ======================================================== */

const SPORT_STRATEGIES = {
  Pickleball: {
    defaultFormat: () => ({ kind: "points", pointsToWin: 11, winBy: 2, bestOf: 3 }),
    initMatchState: (match) => setServeSideByParityForPickleball(match),
    applyRally: (match, team) => {
      applyPickleballRally(match, team);
      handlePointsGameWin(match, "Pickleball");
    },
    displayScore: (match) => `${match.points.A}–${match.points.B}`,
    getServeExtra: (match) => match.mode === "doubles" ? `Server #${match.serve.serveNumber}` : "",
    getAlert: (match) => {
      const f = match.format;
      const ptsToWin = f.pointsToWin || 11;
      const winBy = f.winBy || 2;
      const wouldWinNextPoint = (pts, opp) => (pts + 1 >= ptsToWin) && ((pts + 1) - opp >= winBy);
      
      const aGamePoint = wouldWinNextPoint(match.points.A, match.points.B);
      const bGamePoint = wouldWinNextPoint(match.points.B, match.points.A);

      if (!aGamePoint && !bGamePoint) return null;

      const needed = neededToWinBestOf(f.bestOf || 1);
      if ((aGamePoint && match.gamesWon.A === needed - 1) || (bGamePoint && match.gamesWon.B === needed - 1)) {
        return "MATCH POINT";
      }
      return "GAME POINT";
    }
  },
  Badminton: {
    defaultFormat: () => ({ kind: "points", pointsToWin: 21, winBy: 2, bestOf: 3 }),
    initMatchState: (match) => {
      match.serve.side = "R";
      updateServePlayerIndex(match);
      setServeSideByParityForBadmintonSingles(match);
    },
    applyRally: (match, team) => {
      applyBadmintonRally(match, team);
      handlePointsGameWin(match, "Badminton");
    },
    displayScore: (match) => `${match.points.A}–${match.points.B}`,
    getServeExtra: (match) => match.mode === "singles" ? `Serve ${match.serve.badmintonSide === "R" ? "Right" : "Left"}` : `Serve ${match.serve.side === "R" ? "Right" : "Left"}`,
    getAlert: (match) => {
      const f = match.format;
      const ptsToWin = f.pointsToWin || 21;
      const winBy = f.winBy || 2;
      const wouldWinNextPoint = (pts, opp) => (pts + 1 >= ptsToWin) && ((pts + 1) - opp >= winBy);
      
      const aGamePoint = wouldWinNextPoint(match.points.A, match.points.B);
      const bGamePoint = wouldWinNextPoint(match.points.B, match.points.A);

      if (!aGamePoint && !bGamePoint) return null;

      const needed = neededToWinBestOf(f.bestOf || 1);
      if ((aGamePoint && match.gamesWon.A === needed - 1) || (bGamePoint && match.gamesWon.B === needed - 1)) {
        return "MATCH POINT";
      }
      return "GAME POINT";
    }
  },
  Volleyball: {
    defaultFormat: () => ({ kind: "sets_points", pointsToWin: 25, winBy: 2, bestOf: 5, finalSetTo: 15 }),
    initMatchState: () => {},
    applyRally: (match, team) => applyVolleyballRally(match, team),
    displayScore: (match) => `${match.points.A}–${match.points.B}`,
    getServeExtra: (match) => `Rotation ${match.volley.rotationIndex?.[match.serve.team] ?? 0}`,
    getAlert: (match) => {
      const f = match.format;
      const bestOf = f.bestOf || 5;
      const playedSets = match.volley.sets.A + match.volley.sets.B;
      const ptsToWin = playedSets >= bestOf - 1 ? (f.finalSetTo || 15) : (f.pointsToWin || 25);
      const winBy = f.winBy || 2;

      const wouldWinNextPoint = (pts, opp) => (pts + 1 >= ptsToWin) && ((pts + 1) - opp >= winBy);
      const aSetPoint = wouldWinNextPoint(match.points.A, match.points.B);
      const bSetPoint = wouldWinNextPoint(match.points.B, match.points.A);

      if (!aSetPoint && !bSetPoint) return null;

      const needed = neededToWinBestOf(bestOf);
      if ((aSetPoint && match.volley.sets.A === needed - 1) || (bSetPoint && match.volley.sets.B === needed - 1)) {
        return "MATCH POINT";
      }
      return "SET POINT";
    }
  },
  Tennis: {
    defaultFormat: () => ({ kind: "tennis", bestOf: 3, gamesToWinSet: 6, tiebreakTo: 7, winBy: 2, goldenPoint: false }),
    initMatchState: () => {},
    applyRally: (match, team) => applyTennisPoint(match, team),
    displayScore: (match) => {
      const t = match.tennis;
      if (t.isTiebreak) return `${t.tiebreak.A}–${t.tiebreak.B}`;
      if (match.format.goldenPoint && t.points.A === 3 && t.points.B === 3) return `40–40`;
      if (t.adv === "A") return `AD–40`;
      if (t.adv === "B") return `40–AD`;
      const map = (p) => (p === 0 ? "0" : p === 1 ? "15" : p === 2 ? "30" : "40");
      return `${map(t.points.A)}–${map(t.points.B)}`;
    },
    getServeExtra: () => "",
    getAlert: (match) => {
      const t = match.tennis;
      const f = match.format;

      const checkPointLevel = (team) => {
        const other = team === "A" ? "B" : "A";
        let wouldWinGame = false;
        
        if (t.isTiebreak) {
           wouldWinGame = (t.tiebreak[team] + 1 >= f.tiebreakTo) && ((t.tiebreak[team] + 1) - t.tiebreak[other] >= 2);
        } else {
           const winMargin = f.goldenPoint ? 1 : 2;
           if (f.goldenPoint && t.points.A === 3 && t.points.B === 3) {
               wouldWinGame = true;
           } else if (!f.goldenPoint && t.adv === team) {
               wouldWinGame = true;
           } else if (!f.goldenPoint && t.points.A === 3 && t.points.B === 3 && t.adv === null) {
               wouldWinGame = false;
           } else {
               wouldWinGame = (t.points[team] + 1 >= 4) && ((t.points[team] + 1) - t.points[other] >= winMargin);
           }
        }

        if (!wouldWinGame) return null;

        let wouldWinSet = false;
        if (t.isTiebreak) {
            wouldWinSet = true;
        } else {
            const nextGames = t.games[team] + 1;
            wouldWinSet = (nextGames >= f.gamesToWinSet) && (nextGames - t.games[other] >= 2);
        }

        if (!wouldWinSet) return "GAME POINT";

        const neededSets = neededToWinBestOf(f.bestOf || 3);
        const nextSets = t.sets[team] + 1;
        if (nextSets >= neededSets) return "MATCH POINT";

        return "SET POINT";
      };

      const aLvl = checkPointLevel("A");
      const bLvl = checkPointLevel("B");

      // Critical match-ending alerts overrule generic states
      if (aLvl === "MATCH POINT" || bLvl === "MATCH POINT") return "MATCH POINT";
      if (aLvl === "SET POINT" || bLvl === "SET POINT") return "SET POINT";

      // Inject the broadcast status for Deuce scenarios
      if (f.goldenPoint && t.points.A === 3 && t.points.B === 3) return "GOLDEN POINT";
      if (!f.goldenPoint && t.adv) return "ADVANTAGE";
      if (!f.goldenPoint && isDeuce(t) && !t.adv) return "DEUCE";

      // Fallback to game point / tiebreak
      if (aLvl === "GAME POINT" || bLvl === "GAME POINT") return "GAME POINT";
      if (t.isTiebreak) return "TIEBREAK ACTIVE";

      return null;
    }
  }
};
// Padel securely uses Tennis rules natively
SPORT_STRATEGIES.Padel = SPORT_STRATEGIES.Tennis;

/* ---------- State factory ---------- */
export function getDefaultFormat(sport) {
  return SPORT_STRATEGIES[sport]?.defaultFormat() || { kind: "points", pointsToWin: 11, winBy: 2, bestOf: 1 };
}

export function makeInitialMatch({ sport = "Pickleball", mode = "singles" } = {}) {
  const fmt = getDefaultFormat(sport);
  const isPB = sport === "Pickleball";
  const isPBDoubles = isPB && mode === "doubles";

  return {
    sport, mode, format: fmt, phase: "setup", winner: null, matchName: "",
    teams: {
      A: { name: "Team A", players: ["Player A1", "Player A2"] },
      B: { name: "Team B", players: ["Player B1", "Player B2"] }
    },
    points: { A: 0, B: 0 },
    gamesWon: { A: 0, B: 0 },
    tennis: {
      sets: { A: 0, B: 0 }, games: { A: 0, B: 0 }, points: { A: 0, B: 0 },
      adv: null, isTiebreak: false, tiebreak: { A: 0, B: 0 }, tiebreakFirstServer: null, serverIndex: { A: 0, B: 0 }
    },
    volley: { sets: { A: 0, B: 0 }, currentSet: 1, rotationIndex: { A: 0, B: 0 } },
    court: { A: { left: 1, right: 0 }, B: { left: 1, right: 0 } },
    serve: { team: "A", side: "R", playerIndex: 0, serveNumber: isPBDoubles ? 2 : 1, badmintonSide: "R" },
    pickleball: { openingTeam: "A", openingSingleServer: isPBDoubles, openingSingleServerActive: isPBDoubles },
    badminton: { serverIndex: { A: 0, B: 0 } },
    events: [],
    updatedAt: now()
  };
}

/* ---------- Event Engine ---------- */
function applyEvent(match, ev) {
  if (match.winner) return;

  if (ev.type === "RALLY") {
    const strategy = SPORT_STRATEGIES[match.sport];
    if (strategy && strategy.applyRally) {
      strategy.applyRally(match, ev.team);
      updateServePlayerIndex(match); // Always update pointers at the end of any rally
    }
  }
}

function recomputeFromEvents(baseMatch) {
  const fresh = deepCopy(baseMatch);
  const sport = fresh.sport;
  const mode = fresh.mode;

  const reset = makeInitialMatch({ sport, mode });
  reset.teams = deepCopy(fresh.teams);
  reset.format = deepCopy(fresh.format);
  reset.phase = fresh.phase;
  reset.matchName = fresh.matchName || "";

  reset.pickleball.openingTeam = fresh.pickleball?.openingTeam || "A";
  reset.pickleball.openingSingleServer = !!(sport === "Pickleball" && mode === "doubles");
  reset.pickleball.openingSingleServerActive = reset.pickleball.openingSingleServer;

  reset.events = Array.isArray(fresh.events) ? deepCopy(fresh.events) : [];
  reset.phase = fresh.phase;

  const strategy = SPORT_STRATEGIES[sport];
  if (strategy && strategy.initMatchState) {
    strategy.initMatchState(reset);
  }

  for (const ev of reset.events) {
    applyEvent(reset, ev);
    if (reset.winner) break;
  }

  reset.updatedAt = now();
  return reset;
}

/* ---------- Public APIs ---------- */
export function startMatch(match) {
  const next = deepCopy(match);
  next.phase = "live"; next.winner = null; next.updatedAt = now();
  return recomputeFromEvents(next);
}

export function resetMatch(match) {
  const { sport, mode } = match;
  const fresh = makeInitialMatch({ sport, mode });
  fresh.phase = "setup";
  return fresh;
}

export function setSport(match, sport) {
  const next = makeInitialMatch({ sport, mode: match.mode });
  next.phase = "setup";
  return next;
}

export function setMode(match, mode) {
  const next = makeInitialMatch({ sport: match.sport, mode });
  next.phase = "setup";
  return next;
}

export function setFormat(match, patch) {
  const next = deepCopy(match);
  next.format = { ...next.format, ...patch };
  return recomputeFromEvents(next);
}

export function addRally(match, team) {
  const next = deepCopy(match);
  if (next.phase !== "live" || next.winner) return next;
  next.events = Array.isArray(next.events) ? next.events : [];
  next.events.push({ type: "RALLY", team, t: now() });
  return recomputeFromEvents(next);
}

export function undoLastRally(match) {
  const next = deepCopy(match);
  next.events = Array.isArray(next.events) ? next.events : [];
  if (next.events.length === 0) return next;
  next.events.pop();
  next.winner = null;
  if (next.phase === "finished") next.phase = "live";
  return recomputeFromEvents(next);
}

export function removeLastPointForTeam(match, team) {
  const next = deepCopy(match);
  if (next.phase !== "live") return next;
  next.events = Array.isArray(next.events) ? next.events : [];
  for (let i = next.events.length - 1; i >= 0; i--) {
    if (next.events[i].type === "RALLY" && next.events[i].team === team) {
      next.events.splice(i, 1);
      break;
    }
  }
  next.winner = null;
  if (next.phase === "finished") next.phase = "live";
  return recomputeFromEvents(next);
}

export function getMatchAlert(match) {
  if (!match || match.phase !== "live" || match.winner) return null;
  const strategy = SPORT_STRATEGIES[match.sport];
  return strategy?.getAlert ? strategy.getAlert(match) : null;
}

export function displayScoreText(match) {
  return SPORT_STRATEGIES[match.sport]?.displayScore(match) || `${match.points.A}–${match.points.B}`;
}

export function getServeDetail(match) {
  const team = match.serve.team;
  const side = match.serve.side;
  const playerIdx = match.serve.playerIndex;

  const teamName = match.teams?.[team]?.name || (team === "A" ? "Team A" : "Team B");
  const playerName = match.mode === "doubles" ? (match.teams?.[team]?.players?.[playerIdx] || `Player ${playerIdx + 1}`) : null;

  const base = { team, teamName, side, playerIdx, playerName };
  const extra = SPORT_STRATEGIES[match.sport]?.getServeExtra(match) || "";

  return { ...base, extra };
}