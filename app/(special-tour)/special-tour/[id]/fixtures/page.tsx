"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchTournamentById, fetchFixtures, fetchTournamentStandings } from "@/utils/solo/serverActions";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";
import "../../../../portal.css";
import "../../../../(rws)/rws/rws.css";

export default function SpecialTourFixtures() {
  const params = useParams();
  const tourneyId = parseInt(params.id as string, 10);

  const [tournament, setTournament] = useState<any>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("table");
  const [activeSubTab, setActiveSubTab] = useState<string>("boot");
  const [activeRound, setActiveRound] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        if (isNaN(tourneyId)) {
          setError("Invalid Tournament ID");
          return;
        }

        const [t, f, sData] = await Promise.all([
          fetchTournamentById(tourneyId),
          fetchFixtures(tourneyId),
          fetchTournamentStandings(tourneyId)
        ]);

        if (!t) {
          setError(`No Special Tournament details for ID ${tourneyId}`);
          return;
        }
        setTournament(t);
        setFixtures(f || []);
        setStandings(sData || []);

        if (f && f.length > 0) {
          const firstUnplayed = f.find((m: any) => m.homeScore === null || m.awayScore === null);
          if (firstUnplayed) {
            setActiveRound(firstUnplayed.roundNumber || 1);
          } else {
            const maxR = Math.max(...f.map((m: any) => m.roundNumber || 1));
            setActiveRound(maxR);
          }
        }
      } catch (err) {
        console.error("Error loading tournament details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tourneyId]);

  // Dynamically compute stats lists for Boot, Ball, Glove, and Defender
  const teamStats = useMemo(() => {
    const goalsScored: Record<string, { logo: string; manager: string; value: number }> = {};
    const goalDiff: Record<string, { logo: string; manager: string; value: number }> = {};
    const cleanSheets: Record<string, { logo: string; manager: string; value: number }> = {};
    const defensiveStats: Record<string, { logo: string; manager: string; conceded: number; matches: number; value: number }> = {};

    standings.forEach(row => {
      const name = row.club_name;
      const logo = row.club_logo || "";
      const manager = row.manager || "Unknown";

      goalsScored[name] = { logo, manager, value: row.goals_scored || 0 };
      goalDiff[name] = { logo, manager, value: row.goal_difference || 0 };
      cleanSheets[name] = { logo, manager, value: 0 };
      defensiveStats[name] = { logo, manager, conceded: 0, matches: 0, value: 0 };
    });

    fixtures.forEach(f => {
      const isFinished = f.homeScore !== null && f.awayScore !== null;
      if (isFinished) {
        const hs = f.homeScore || 0;
        const as = f.awayScore || 0;

        // Clean Sheets
        if (hs === 0) {
          if (cleanSheets[f.awayClub]) cleanSheets[f.awayClub].value += 1;
        }
        if (as === 0) {
          if (cleanSheets[f.homeClub]) cleanSheets[f.homeClub].value += 1;
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

    const sortedBall = Object.entries(goalDiff)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);

    const sortedGlove = Object.entries(cleanSheets)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);

    const sortedDefender = Object.values(defensiveStats)
      .map(ds => {
        const name = ds.logo ? Object.keys(defensiveStats).find(k => defensiveStats[k] === ds) || "" : "";
        return { name, ...ds };
      })
      .filter(item => item.name !== "")
      .sort((a, b) => {
        if (a.matches === 0 && b.matches === 0) return 0;
        if (a.matches === 0) return 1;
        if (b.matches === 0) return -1;
        return a.value - b.value;
      });

    return { boot: sortedBoot, ball: sortedBall, glove: sortedGlove, defender: sortedDefender };
  }, [fixtures, standings]);

  // Group fixtures by round
  const fixturesByRound = fixtures.reduce((acc: Record<number, any[]>, fix) => {
    const round = fix.roundNumber || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(fix);
    return acc;
  }, {});

  const rounds = Object.keys(fixturesByRound).map(Number).sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <RwsFullPageLoading text="Loading tournament fixtures" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <div className="portal-breadcrumb" style={{ textAlign: "left" }}>
            <Link href={`/special-tour/${tourneyId}`} className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Tournament Hub
            </Link>
          </div>
          <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Tournament Not Found</h2>
            <p style={{ color: "var(--text-secondary)" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ paddingBottom: "4rem" }}>
        
        {/* Navigation Breadcrumbs */}
        <div className="portal-breadcrumb">
          <Link href={`/special-tour/${tourneyId}`} className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Tournament Hub
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-trophy" />
            Series Portal
          </div>
          <h1 className="rws-hero-title">
            {tournament.name.toUpperCase()} SERIES
          </h1>
          <p className="rws-hero-sub">
            Track points standings, matches calendar, score outcomes, and live tournament results.
          </p>
        </div>

        {/* Segmented Tab Bar & Share Action */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "4px", gap: "4px" }}>
            {[
              { key: "table", icon: "fa-solid fa-list-ol", label: "Standings Table" },
              { key: "fixture", icon: "fa-solid fa-calendar-days", label: "Match Calendar" },
              { key: "stats", icon: "fa-solid fa-chart-line", label: "Stats & Awards" }
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

        {/* TAB 1: STANDINGS TABLE */}
        {activeTab === "table" && (
          standings.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
              <i className="fa-solid fa-folder-open" style={{ fontSize: "3rem", marginBottom: "1rem", display: "block" }} />
              No standings generated. Check back once fixtures kick off!
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: "2rem", animation: "rwsFadeUp 0.4s ease-out both" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.15)", color: "var(--text-secondary)" }}>
                      <th style={{ padding: "0.75rem", width: "50px" }}>Pos</th>
                      <th style={{ padding: "0.75rem" }}>Participant Manager</th>
                      <th style={{ padding: "0.75rem", textAlign: "center" }}>P</th>
                      <th style={{ padding: "0.75rem", textAlign: "center" }}>PTS</th>
                      <th style={{ padding: "0.75rem", textAlign: "center" }}>GD</th>
                      <th style={{ padding: "0.75rem", textAlign: "center" }}>GF</th>
                      <th style={{ padding: "0.75rem", textAlign: "center" }}>GA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, index) => (
                      <tr 
                        key={row.club_id} 
                        style={{ 
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          backgroundColor: index < 1 ? "rgba(45, 212, 191, 0.03)" : "transparent"
                        }}
                      >
                        <td style={{ padding: "1rem 0.75rem", fontWeight: 700, color: index === 0 ? "var(--solo-primary)" : "var(--text-secondary)" }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: "1rem 0.75rem", fontWeight: 600 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            {row.club_logo ? (
                              <img 
                                src={row.club_logo} 
                                alt={row.club_name} 
                                style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.15)" }} 
                              />
                            ) : (
                              <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold" }}>
                                {row.club_name.substring(0, 1)}
                              </div>
                            )}
                            <span>
                              {row.club_name}
                              {row.manager_r2g_id && (
                                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginLeft: "6px", fontWeight: "normal" }}>
                                  ({row.manager_r2g_id})
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "1rem 0.75rem", textAlign: "center", fontWeight: 500 }}>{row.matches_played}</td>
                        <td style={{ padding: "1rem 0.75rem", textAlign: "center", fontWeight: 700, color: "var(--solo-primary)" }}>{row.points}</td>
                        <td style={{ padding: "1rem 0.75rem", textAlign: "center", fontWeight: 500, color: row.goal_difference >= 0 ? "#10b981" : "#ef4444" }}>
                          {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                        </td>
                        <td style={{ padding: "1rem 0.75rem", textAlign: "center", color: "var(--text-secondary)" }}>{row.goals_scored}</td>
                        <td style={{ padding: "1rem 0.75rem", textAlign: "center", color: "var(--text-secondary)" }}>{row.goals_against}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* TAB 2: FIXTURES CALENDAR */}
        {activeTab === "fixture" && (
          rounds.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
              <i className="fa-solid fa-calendar-xmark" style={{ fontSize: "3rem", marginBottom: "1rem", display: "block" }} />
              No matches scheduled for this stage yet.
            </div>
          ) : (
            <div style={{ animation: "rwsFadeUp 0.4s ease-out both" }}>
              {/* Round Filter & Swipe Controls */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "14px",
                padding: "8px 12px",
                marginBottom: "1.5rem"
              }}>
                {/* Prev Round Button */}
                <button
                  type="button"
                  onClick={() => setActiveRound(prev => Math.max(1, prev - 1))}
                  disabled={activeRound <= 1}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: activeRound <= 1 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.08)",
                    color: activeRound <= 1 ? "rgba(255,255,255,0.2)" : "#fff",
                    cursor: activeRound <= 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s ease"
                  }}
                >
                  <i className="fa-solid fa-chevron-left" style={{ fontSize: "0.85rem" }} />
                </button>

                {/* Horizontal Scrollable Round Pills */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  overflowX: "auto",
                  scrollBehavior: "smooth",
                  WebkitOverflowScrolling: "touch",
                  padding: "4px 0",
                  scrollbarWidth: "none"
                }}>
                  {rounds.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setActiveRound(r)}
                      style={{
                        padding: "6px 16px",
                        borderRadius: "8px",
                        border: activeRound === r ? "1px solid rgba(168, 85, 247, 0.5)" : "1px solid transparent",
                        background: activeRound === r ? "linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(124, 58, 237, 0.3))" : "rgba(255, 255, 255, 0.04)",
                        color: activeRound === r ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                        fontSize: "0.8rem",
                        fontWeight: activeRound === r ? 700 : 500,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        transition: "all 0.2s ease"
                      }}
                    >
                      Round {r}
                    </button>
                  ))}
                </div>

                {/* Next Round Button */}
                <button
                  type="button"
                  onClick={() => setActiveRound(prev => Math.min(Math.max(...rounds), prev + 1))}
                  disabled={activeRound >= Math.max(...rounds)}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: activeRound >= Math.max(...rounds) ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.08)",
                    color: activeRound >= Math.max(...rounds) ? "rgba(255,255,255,0.2)" : "#fff",
                    cursor: activeRound >= Math.max(...rounds) ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s ease"
                  }}
                >
                  <i className="fa-solid fa-chevron-right" style={{ fontSize: "0.85rem" }} />
                </button>
              </div>

              {/* Active Round Fixtures List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(!fixturesByRound[activeRound] || fixturesByRound[activeRound].length === 0) ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                    No matches scheduled for Round {activeRound}.
                  </div>
                ) : (
                  fixturesByRound[activeRound].map((match: any) => {
                    const isFinished = match.homeScore !== null && match.awayScore !== null;
                    const homeWon = isFinished && match.homeScore > match.awayScore;
                    const awayWon = isFinished && match.awayScore > match.homeScore;

                    return (
                      <div
                        key={match.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "1rem 1.25rem",
                          background: "rgba(255,255,255,0.02)",
                          backdropFilter: "blur(8px)",
                          borderRadius: "14px",
                          border: "1px solid rgba(255,255,255,0.06)",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                          e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.3)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                        }}
                      >
                        {/* Home Manager */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, overflow: "hidden" }}>
                          {match.homeLogo ? (
                            <img
                              src={match.homeLogo}
                              alt={match.homeClub}
                              style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.15)", flexShrink: 0 }}
                              onError={e => { e.currentTarget.src = "/assets/images/default-avatar.png"; }}
                            />
                          ) : (
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: "bold", flexShrink: 0 }}>
                              {match.homeClub.substring(0, 1)}
                            </div>
                          )}
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span style={{ fontWeight: homeWon ? 800 : 600, color: homeWon ? "#22c55e" : "#ffffff", fontSize: "0.9rem" }}>
                              {match.homeClub}
                            </span>
                          </div>
                        </div>

                        {/* Score Box */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 1rem", minWidth: "90px" }}>
                          {isFinished ? (
                            <span style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "1.1rem",
                              fontWeight: 800,
                              color: "var(--solo-primary)",
                              background: "rgba(168, 85, 247, 0.12)",
                              border: "1px solid rgba(168, 85, 247, 0.25)",
                              padding: "4px 14px",
                              borderRadius: "8px",
                              letterSpacing: "1px"
                            }}>
                              {match.homeScore} - {match.awayScore}
                            </span>
                          ) : (
                            <span style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "rgba(255,255,255,0.5)",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              padding: "3px 12px",
                              borderRadius: "6px"
                            }}>
                              VS
                            </span>
                          )}
                        </div>

                        {/* Away Manager */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, justifyContent: "flex-end", overflow: "hidden" }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                            <span style={{ fontWeight: awayWon ? 800 : 600, color: awayWon ? "#22c55e" : "#ffffff", fontSize: "0.9rem" }}>
                              {match.awayClub}
                            </span>
                          </div>
                          {match.awayLogo ? (
                            <img
                              src={match.awayLogo}
                              alt={match.awayClub}
                              style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.15)", flexShrink: 0 }}
                              onError={e => { e.currentTarget.src = "/assets/images/default-avatar.png"; }}
                            />
                          ) : (
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: "bold", flexShrink: 0 }}>
                              {match.awayClub.substring(0, 1)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )
        )}

        {/* TAB 3: STATS & AWARDS */}
        {activeTab === "stats" && (
          <div style={{ animation: "rwsFadeUp 0.4s ease-out both", width: "100%" }}>
            {/* Sub-Tab Pills */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
              <div style={{ display: "inline-flex", gap: "4px", background: "rgba(0,0,0,0.25)", padding: "3px", borderRadius: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                {[
                  { key: "boot", icon: "fa-solid fa-futbol", label: "Golden Boot", color: "#fbbf24" },
                  { key: "ball", icon: "fa-solid fa-award", label: "Golden Ball", color: "#38bdf8" },
                  { key: "glove", icon: "fa-solid fa-shield-halved", label: "Golden Glove", color: "#c084fc" },
                  { key: "defender", icon: "fa-solid fa-user-shield", label: "Best Defender", color: "#10b981" },
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
                ball: { data: teamStats.ball, color: "#38bdf8", unit: "GD", icon: "fa-solid fa-award", title: "Best Goal Difference" },
                glove: { data: teamStats.glove, color: "#c084fc", unit: "Clean Sheets", icon: "fa-solid fa-shield-halved", title: "Most Clean Sheets" },
                defender: { data: teamStats.defender, color: "#10b981", unit: "GA/Match", icon: "fa-solid fa-user-shield", title: "Best Defender (Lowest GA/Match)" },
              };
              const c = config[activeSubTab] || config.boot;
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
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "1rem", color: idx === 0 ? c.color : "#fff" }}>
                              {activeSubTab === "ball" && s.value > 0 ? `+${s.value}` : s.value}
                            </span>
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
