"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  fetchSeasonByRwsYear, 
  fetchTournaments, 
  fetchFixtures, 
  fetchTournamentStandings, 
  fetchTournamentClubs 
} from "@/utils/solo/serverActions";
import "../../rws.css";

interface Match {
  id: number;
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  homeScore?: number;
  awayScore?: number;
  roundNumber: number;
  groupName?: string | null;
  status: "live" | "upcoming" | "finished";
  matchEvents?: any[];
}

function RwsFullPageLoading({ text }: { text: string }) {
  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />
      <div className="portal-container" style={{ display: "flex", minHeight: "80vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.01)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          padding: "3rem",
          borderRadius: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
          maxWidth: "320px",
          width: "100%",
          animation: "rwsFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both"
        }}>
          <div style={{ position: "relative", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2.5px solid transparent", borderTopColor: "#a855f7", borderRightColor: "#c084fc", animation: "rwsSpin 1.1s linear infinite" }} />
            <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", animation: "rwsPulse 1.2s infinite alternate" }}>
              <i className="fa-solid fa-trophy" style={{ color: "#c084fc", fontSize: "1rem" }} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", fontWeight: 800, color: "#fff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              R2G // WORLD SERIES
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.4)", letterSpacing: "0.5px" }}>
              {text}...
            </div>
          </div>
          <div style={{ width: "100px", height: "2px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "10px", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", height: "100%", width: "60%", background: "linear-gradient(90deg, #a855f7, #c084fc)", borderRadius: "10px", animation: "rwsLoadingBar 1.6s ease-in-out infinite" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RwsYearTournament() {
  const params = useParams();
  const yearStr = params.year as string;
  const year = parseInt(yearStr, 10);

  const [season, setSeason] = useState<any>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [standings, setStandings] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [tournamentClubs, setTournamentClubs] = useState<any[]>([]);

  // Tab selections
  const [activeTab, setActiveTab] = useState<string>("table");
  const [activeSubTab, setActiveSubTab] = useState<string>("boot");
  
  // Fixtures filtering states
  const [activeRound, setActiveRound] = useState<number>(1);
  const [activeGroup, setActiveGroup] = useState<string>("All");

  useEffect(() => {
    document.title = `RWS ${yearStr} - Series Details`;
    async function loadData() {
      try {
        if (isNaN(year)) {
          setError("Invalid RWS Year");
          setLoading(false);
          return;
        }

        const s = await fetchSeasonByRwsYear(year);
        if (!s) {
          setError(`No R2G World Series scheduled for year ${yearStr}`);
          setLoading(false);
          return;
        }
        setSeason(s);

        const tournaments = await fetchTournaments();
        const rwsTourney = tournaments.find((t: any) => 
          t.tournament_type === "rws" && t.season_number === s.season_number
        );

        if (rwsTourney) {
          setTournament(rwsTourney);
          const [standingsData, fixturesData, clubsData] = await Promise.all([
            fetchTournamentStandings(rwsTourney.id),
            fetchFixtures(rwsTourney.id),
            fetchTournamentClubs(rwsTourney.id)
          ]);
          setStandings(standingsData || []);
          setFixtures(fixturesData || []);
          setTournamentClubs(clubsData || []);
          
          // Determine initial active round
          if (fixturesData && fixturesData.length > 0) {
            const played = fixturesData.filter((f: any) => f.homeScore !== null && f.awayScore !== null);
            if (played.length > 0) {
              const maxPlayedRound = Math.max(...played.map((f: any) => f.roundNumber));
              setActiveRound(maxPlayedRound);
            } else {
              setActiveRound(1);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load RWS data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [year, yearStr]);

  // Unique rounds list
  const roundsList = useMemo(() => {
    const rounds = new Set<number>();
    fixtures.forEach(f => {
      if (f.roundNumber) rounds.add(f.roundNumber);
    });
    return Array.from(rounds).sort((a, b) => a - b);
  }, [fixtures]);

  // Unique groups list from fixtures
  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    fixtures.forEach(f => {
      if (f.groupName) {
        groups.add(f.groupName);
      }
    });
    return Array.from(groups).sort();
  }, [fixtures]);

  // Filtered fixtures based on activeRound and activeGroup
  const filteredFixtures = useMemo(() => {
    return fixtures.filter(f => {
      const matchRound = f.roundNumber === activeRound;
      let matchGroup = true;
      if (activeGroup !== "All") {
        if (activeGroup === "Knockout") {
          matchGroup = !f.groupName;
        } else {
          matchGroup = f.groupName === activeGroup;
        }
      }
      return matchRound && matchGroup;
    });
  }, [fixtures, activeRound, activeGroup]);

  // Group standings by group name if applicable
  const groupedStandings = useMemo(() => {
    if (!standings || standings.length === 0) return {};
    const groups: Record<string, any[]> = {};
    standings.forEach(row => {
      const gName = row.group_name || "A";
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(row);
    });
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key].sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference || b.goals_scored - a.goals_scored);
      return acc;
    }, {} as Record<string, any[]>);
  }, [standings]);

  // Dynamically compute team stats for Boot, Ball, and Glove
  const teamStats = useMemo(() => {
    const goalsScored: Record<string, { logo: string; manager: string; value: number }> = {};
    const winsCount: Record<string, { logo: string; manager: string; value: number }> = {};
    const defensiveStats: Record<string, { logo: string; manager: string; conceded: number; matches: number; value: number }> = {};

    tournamentClubs.forEach(tc => {
      goalsScored[tc.name] = { logo: tc.logo_path || "", manager: tc.manager || "Unknown", value: 0 };
      winsCount[tc.name] = { logo: tc.logo_path || "", manager: tc.manager || "Unknown", value: 0 };
      defensiveStats[tc.name] = { logo: tc.logo_path || "", manager: tc.manager || "Unknown", conceded: 0, matches: 0, value: 0 };
    });

    standings.forEach(row => {
      const name = row.club_name;
      const logo = row.club_logo || "";
      const existing = goalsScored[name];
      goalsScored[name] = { 
        logo, 
        manager: existing?.manager || "Unknown", 
        value: row.goals_scored || 0 
      };
    });

    fixtures.forEach(f => {
      const isFinished = f.homeScore !== null && f.awayScore !== null;
      if (isFinished) {
        const hs = f.homeScore || 0;
        const as = f.awayScore || 0;

        if (hs > as) {
          if (winsCount[f.homeClub]) winsCount[f.homeClub].value += 1;
        } else if (as > hs) {
          if (winsCount[f.awayClub]) winsCount[f.awayClub].value += 1;
        }

        // Conceded and matches count
        if (defensiveStats[f.homeClub]) {
          defensiveStats[f.homeClub].conceded += as;
          defensiveStats[f.homeClub].matches += 1;
        }
        if (defensiveStats[f.awayClub]) {
          defensiveStats[f.awayClub].conceded += hs;
          defensiveStats[f.awayClub].matches += 1;
        }
      }
    });

    // Map defensive stats values (conceded / matches)
    Object.values(defensiveStats).forEach(ds => {
      if (ds.matches > 0) {
        ds.value = Math.round((ds.conceded / ds.matches) * 100) / 100;
      } else {
        ds.value = 0;
      }
    });

    const sortedBoot = Object.entries(goalsScored)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);

    const sortedBall = Object.entries(winsCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);

    const sortedGlove = Object.values(defensiveStats)
      .map(ds => ({
        name: ds.logo ? Object.keys(defensiveStats).find(k => defensiveStats[k] === ds) || "" : "",
        ...ds
      }))
      .filter(item => item.name !== "")
      .sort((a, b) => {
        if (a.matches === 0 && b.matches === 0) return 0;
        if (a.matches === 0) return 1;
        if (b.matches === 0) return -1;
        return a.value - b.value;
      });

    return { boot: sortedBoot, ball: sortedBall, glove: sortedGlove };
  }, [fixtures, standings, tournamentClubs]);

  const handlePrevRound = () => {
    const idx = roundsList.indexOf(activeRound);
    if (idx > 0) setActiveRound(roundsList[idx - 1]);
  };

  const handleNextRound = () => {
    const idx = roundsList.indexOf(activeRound);
    if (idx < roundsList.length - 1) setActiveRound(roundsList[idx + 1]);
  };

  // Dynamic round name helper
  const getRoundName = (rNum: number) => {
    // Check if any match in this round belongs to a group
    const roundMatches = fixtures.filter(f => f.roundNumber === rNum);
    const hasGroupMatch = roundMatches.some(f => f.groupName);
    
    if (hasGroupMatch) {
      return `Round ${rNum}`;
    }
    
    // Knockout rounds naming based on distance to the final round
    const knockoutRounds = roundsList.filter(r => {
      const matches = fixtures.filter(f => f.roundNumber === r);
      return matches.every(f => !f.groupName);
    });
    
    const idx = knockoutRounds.indexOf(rNum);
    if (idx !== -1) {
      const distance = knockoutRounds.length - 1 - idx;
      if (distance === 0) return "Grand Final";
      if (distance === 1) return "Semi-Finals";
      if (distance === 2) return "Quarter-Finals";
    }
    
    return `Round ${rNum}`;
  };

  if (loading) {
    return <RwsFullPageLoading text="Loading series details" />;
  }

  if (error || !season) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <div className="portal-breadcrumb" style={{ textAlign: "left" }}>
            <Link href={`/rws/${yearStr}`} className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to RWS Hub
            </Link>
          </div>
          <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Edition Not Found</h2>
            <p style={{ color: "var(--text-secondary)" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ maxWidth: "960px" }}>
        
        {/* Breadcrumb */}
        <div className="portal-breadcrumb" style={{ marginBottom: "0.5rem" }}>
          <Link href={`/rws/${yearStr}`} className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back to RWS Hub
          </Link>
        </div>

        {/* ═══ Hero ═══ */}
        <div style={{ textAlign: "center", padding: "2rem 0 1.5rem", animation: "rwsFadeUp 0.5s ease-out both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "4px 14px", borderRadius: "20px", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", fontSize: "0.72rem", fontWeight: 600, color: "#c084fc", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            <i className="fa-solid fa-trophy" /> RWS {yearStr}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", fontWeight: 800, color: "#fff", margin: "0 0 0.5rem", letterSpacing: "3px", textTransform: "uppercase", background: "linear-gradient(135deg, #ffffff 0%, #c084fc 50%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            SERIES PORTAL
          </h1>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", maxWidth: "500px", margin: "0 auto", lineHeight: 1.5 }}>
            Standings, fixtures & leaderboard stats
          </p>
        </div>

        {/* ═══ Segmented Tab Bar ═══ */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "4px", gap: "4px" }}>
            {[
              { key: "table", icon: "fa-solid fa-list-ol", label: "Standings" },
              { key: "fixture", icon: "fa-solid fa-calendar-days", label: "Fixtures" },
              { key: "stats", icon: "fa-solid fa-chart-simple", label: "Stats" },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
                  fontSize: "0.82rem", fontWeight: activeTab === tab.key ? 700 : 500, fontFamily: "var(--font-display)",
                  background: activeTab === tab.key ? "linear-gradient(135deg, #a855f7, #7c3aed)" : "transparent",
                  color: activeTab === tab.key ? "#fff" : "rgba(255,255,255,0.45)",
                  boxShadow: activeTab === tab.key ? "0 4px 16px rgba(168,85,247,0.3)" : "none",
                  transition: "all 0.25s ease",
                }}
              >
                <i className={tab.icon} style={{ fontSize: "0.75rem" }} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════ TAB 1 — STANDINGS ═══════════════════════ */}
        {activeTab === "table" && (
          <div style={{ animation: "rwsFadeUp 0.4s ease-out both", width: "100%" }}>
            {standings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <i className="fa-solid fa-chart-bar" style={{ fontSize: "2rem", marginBottom: "1rem", display: "block", opacity: 0.3 }} />
                No standings data available yet.
              </div>
            ) : tournament?.num_groups && tournament.num_groups > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem" }}>
                {Object.entries(groupedStandings).map(([groupName, rows]) => (
                  <div key={groupName} style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
                    <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a855f7" }} />
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "#fff", textTransform: "uppercase", letterSpacing: "1px" }}>Group {groupName}</span>
                    </div>
                    <div style={{ padding: "0.5rem 0" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                        <thead>
                          <tr style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            <th style={{ padding: "0.5rem 1rem", textAlign: "left", width: "36px" }}>#</th>
                            <th style={{ padding: "0.5rem 0.5rem", textAlign: "left" }}>Club</th>
                            <th style={{ padding: "0.5rem 0.5rem", textAlign: "center", width: "36px" }}>MP</th>
                            <th style={{ padding: "0.5rem 0.5rem", textAlign: "center", width: "40px" }}>GD</th>
                            <th style={{ padding: "0.5rem 1rem", textAlign: "center", width: "40px" }}>Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, idx) => (
                            <tr key={row.club_id} style={{ borderTop: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <td style={{ padding: "0.6rem 1rem" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700, background: idx === 0 ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)", color: idx === 0 ? "#c084fc" : "rgba(255,255,255,0.5)" }}>{idx + 1}</span>
                              </td>
                              <td style={{ padding: "0.6rem 0.5rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  {row.club_logo && <img src={row.club_logo} alt="" style={{ width: "20px", height: "20px", objectFit: "contain", borderRadius: "4px" }} />}
                                  <div>
                                    <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.82rem" }}>{row.club_name}</div>
                                    <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>{row.manager || "Unknown"}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "0.6rem 0.5rem" }}>{row.matches_played}</td>
                              <td style={{ textAlign: "center", padding: "0.6rem 0.5rem", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: row.goal_difference > 0 ? "#4ade80" : row.goal_difference < 0 ? "#f87171" : "rgba(255,255,255,0.35)" }}>
                                {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                              </td>
                              <td style={{ textAlign: "center", padding: "0.6rem 1rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#fbbf24", fontSize: "0.85rem" }}>{row.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <i className="fa-solid fa-list-ol" style={{ color: "#a855f7", fontSize: "0.85rem" }} />
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "#fff" }}>League Standings</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      <th style={{ padding: "0.75rem 1.25rem", textAlign: "left", width: "40px" }}>#</th>
                      <th style={{ padding: "0.75rem 0.5rem", textAlign: "left" }}>Club</th>
                      {tournament?.num_groups && <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "70px" }}>Group</th>}
                      <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "44px" }}>MP</th>
                      <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "40px" }}>GF</th>
                      <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "40px" }}>GA</th>
                      <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "44px" }}>GD</th>
                      <th style={{ padding: "0.75rem 1.25rem", textAlign: "center", width: "50px" }}>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, idx) => (
                      <tr key={row.club_id} style={{ borderTop: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "0.7rem 1.25rem" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, background: idx === 0 ? "rgba(168,85,247,0.15)" : idx === 1 ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.04)", color: idx === 0 ? "#c084fc" : idx === 1 ? "#60a5fa" : "rgba(255,255,255,0.5)" }}>{idx + 1}</span>
                        </td>
                        <td style={{ padding: "0.7rem 0.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            {row.club_logo && <img src={row.club_logo} alt="" style={{ width: "22px", height: "22px", objectFit: "contain", borderRadius: "4px" }} />}
                            <div>
                              <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.85rem" }}>{row.club_name}</div>
                              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>{row.manager || "Unknown"}</div>
                            </div>
                          </div>
                        </td>
                        {tournament?.num_groups && (
                          <td style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 600, color: "#fbbf24", padding: "0.7rem 0.5rem" }}>
                            {row.group_name ? `Grp ${row.group_name}` : "—"}
                          </td>
                        )}
                        <td style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "0.7rem 0.5rem", fontSize: "0.82rem" }}>{row.matches_played}</td>
                        <td style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "0.7rem 0.5rem", fontSize: "0.82rem" }}>{row.goals_scored}</td>
                        <td style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "0.7rem 0.5rem", fontSize: "0.82rem" }}>{row.goals_against}</td>
                        <td style={{ textAlign: "center", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: row.goal_difference > 0 ? "#4ade80" : row.goal_difference < 0 ? "#f87171" : "rgba(255,255,255,0.35)", padding: "0.7rem 0.5rem" }}>
                          {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#fbbf24", fontSize: "0.95rem", padding: "0.7rem 1.25rem" }}>{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ TAB 2 — FIXTURES ═══════════════════════ */}
        {activeTab === "fixture" && (
          <div style={{ animation: "rwsFadeUp 0.4s ease-out both", width: "100%" }}>
            
            {/* Round + Group Filter Bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px" }}>
              {/* Round Nav */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button type="button" onClick={handlePrevRound} disabled={roundsList.indexOf(activeRound) === 0}
                  style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: roundsList.indexOf(activeRound) === 0 ? 0.3 : 1, transition: "all 0.2s" }}>
                  <i className="fa-solid fa-chevron-left" style={{ fontSize: "0.65rem" }} />
                </button>
                <div style={{ padding: "0 0.75rem", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "#fff", minWidth: "120px", textAlign: "center" }}>
                  {getRoundName(activeRound)}
                </div>
                <button type="button" onClick={handleNextRound} disabled={roundsList.indexOf(activeRound) === roundsList.length - 1}
                  style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: roundsList.indexOf(activeRound) === roundsList.length - 1 ? 0.3 : 1, transition: "all 0.2s" }}>
                  <i className="fa-solid fa-chevron-right" style={{ fontSize: "0.65rem" }} />
                </button>
              </div>

              {/* Group Tabs */}
              {availableGroups.length > 0 && (
                <div style={{ display: "flex", gap: "3px", background: "rgba(0,0,0,0.25)", padding: "3px", borderRadius: "8px" }}>
                  {[{ key: "All", label: "All" }, ...availableGroups.map(g => ({ key: g, label: `Grp ${g}` })), ...(fixtures.some(f => !f.groupName) ? [{ key: "Knockout", label: "KO" }] : [])].map(g => (
                    <button key={g.key} type="button" onClick={() => setActiveGroup(g.key)}
                      style={{ padding: "4px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: activeGroup === g.key ? 700 : 500, background: activeGroup === g.key ? "rgba(168,85,247,0.85)" : "transparent", color: activeGroup === g.key ? "#fff" : "rgba(255,255,255,0.45)", transition: "all 0.2s" }}>
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Match Cards */}
            {filteredFixtures.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <i className="fa-solid fa-calendar-xmark" style={{ fontSize: "2rem", marginBottom: "1rem", display: "block", opacity: 0.3 }} />
                No matches for this selection.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {filteredFixtures.map((match) => {
                  const isFinished = match.match_status === "finished";
                  const homeWon = isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
                  const awayWon = isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0);
                  return (
                    <div key={match.id} style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "1rem 1.5rem", transition: "all 0.25s ease", cursor: "default" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.25)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.boxShadow = "none"; }}>
                      {/* Meta row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {getRoundName(match.roundNumber)} {match.groupName ? `· Grp ${match.groupName}` : ""}
                        </span>
                        <span style={{ fontSize: "0.62rem", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: "4px", background: isFinished ? "rgba(255,255,255,0.04)" : match.match_status === "live" ? "rgba(34,197,94,0.15)" : "rgba(168,85,247,0.1)", color: isFinished ? "rgba(255,255,255,0.35)" : match.match_status === "live" ? "#4ade80" : "#c084fc" }}>
                          {match.match_status || "upcoming"}
                        </span>
                      </div>
                      {/* Matchup */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {/* Home Team – left aligned */}
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                            {match.homeLogo ? <img src={match.homeLogo} alt="" style={{ width: "24px", height: "24px", objectFit: "contain" }} /> : <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>{match.homeClub.slice(0,2).toUpperCase()}</span>}
                          </div>
                          <div>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: homeWon ? 700 : 600, fontSize: "0.88rem", color: homeWon ? "#fff" : "rgba(255,255,255,0.8)" }}>{match.homeClub}</div>
                            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>{match.homeManager}</div>
                          </div>
                        </div>
                        {/* Score */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 1rem", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", minWidth: "70px", justifyContent: "center" }}>
                          {(!match.match_status || match.match_status === "upcoming") ? (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>vs</span>
                          ) : (
                            <>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 800, color: homeWon ? "#fff" : "rgba(255,255,255,0.6)" }}>{match.homeScore}</span>
                              <span style={{ color: "rgba(255,255,255,0.15)", fontWeight: 300 }}>–</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 800, color: awayWon ? "#fff" : "rgba(255,255,255,0.6)" }}>{match.awayScore}</span>
                            </>
                          )}
                        </div>
                        {/* Away Team – right aligned */}
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem", justifyContent: "flex-end" }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: awayWon ? 700 : 600, fontSize: "0.88rem", color: awayWon ? "#fff" : "rgba(255,255,255,0.8)" }}>{match.awayClub}</div>
                            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>{match.awayManager}</div>
                          </div>
                          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                            {match.awayLogo ? <img src={match.awayLogo} alt="" style={{ width: "24px", height: "24px", objectFit: "contain" }} /> : <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>{match.awayClub.slice(0,2).toUpperCase()}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ TAB 3 — STATS ═══════════════════════ */}
        {activeTab === "stats" && (
          <div style={{ animation: "rwsFadeUp 0.4s ease-out both", width: "100%" }}>
            {/* Sub-Tab Pills */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
              <div style={{ display: "inline-flex", gap: "4px", background: "rgba(0,0,0,0.25)", padding: "3px", borderRadius: "10px" }}>
                {[
                  { key: "boot", icon: "fa-solid fa-futbol", label: "Golden Boot", color: "#fbbf24" },
                  { key: "ball", icon: "fa-solid fa-award", label: "Golden Ball", color: "#38bdf8" },
                  { key: "glove", icon: "fa-solid fa-shield-halved", label: "Golden Glove", color: "#c084fc" },
                ].map(st => (
                  <button key={st.key} type="button" onClick={() => setActiveSubTab(st.key)}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: activeSubTab === st.key ? 700 : 500, background: activeSubTab === st.key ? "rgba(255,255,255,0.08)" : "transparent", color: activeSubTab === st.key ? "#fff" : "rgba(255,255,255,0.4)", transition: "all 0.2s" }}>
                    <i className={st.icon} style={{ fontSize: "0.7rem", color: activeSubTab === st.key ? st.color : "rgba(255,255,255,0.25)" }} /> {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard Cards */}
            {(() => {
              const config: Record<string, { data: typeof teamStats.boot; color: string; unit: string; icon: string; title: string }> = {
                boot: { data: teamStats.boot, color: "#fbbf24", unit: "Goals", icon: "fa-solid fa-futbol", title: "Top Scorers" },
                ball: { data: teamStats.ball, color: "#38bdf8", unit: "Wins", icon: "fa-solid fa-award", title: "Most Victories" },
                glove: { data: teamStats.glove, color: "#c084fc", unit: "GA/Match", icon: "fa-solid fa-shield-halved", title: "Best Defence" },
              };
              const c = config[activeSubTab];
              return (
                <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
                  <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <i className={c.icon} style={{ color: c.color, fontSize: "0.9rem" }} />
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>{c.title}</span>
                  </div>
                  {c.data.length === 0 ? (
                    <div style={{ padding: "3rem 2rem", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.82rem" }}>No data recorded yet.</div>
                  ) : (
                    <div style={{ padding: "0.5rem 0" }}>
                      {c.data.map((s, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 1.5rem", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.03)" : "none", transition: "background 0.2s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700, background: idx === 0 ? `${c.color}22` : "rgba(255,255,255,0.04)", color: idx === 0 ? c.color : "rgba(255,255,255,0.4)" }}>{idx + 1}</span>
                            {s.logo && <img src={s.logo} alt="" style={{ width: "20px", height: "20px", objectFit: "contain", borderRadius: "4px" }} />}
                            <div>
                              <span style={{ fontWeight: 600, color: "#fff", fontSize: "0.85rem" }}>{s.name}</span>
                              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>{s.manager}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "1rem", color: idx === 0 ? c.color : "#fff" }}>{s.value}</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>{c.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
