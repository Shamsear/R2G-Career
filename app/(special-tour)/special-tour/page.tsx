"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchActiveSeason, fetchTournamentsByType, fetchTournamentStandings, fetchFixtures } from "@/utils/solo/serverActions";

export default function SpecialTourDashboard() {
  const [seasonNum, setSeasonNum] = useState<number>(7);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTourneyId, setSelectedTourneyId] = useState<number | null>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    document.title = "Special Tour Hub | R2G";
    async function loadData() {
      try {
        const season = await fetchActiveSeason();
        if (season && season.season_number) {
          setSeasonNum(season.season_number);
        }

        const tourneys = await fetchTournamentsByType("special");
        setTournaments(tourneys || []);
        if (tourneys && tourneys.length > 0) {
          setSelectedTourneyId(tourneys[0].id);
        }
      } catch (e) {
        console.error("Failed to load special tournaments:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedTourneyId) return;
    async function loadTourneyDetails() {
      setLoadingDetails(true);
      try {
        const [standingsData, fixturesData] = await Promise.all([
          fetchTournamentStandings(selectedTourneyId),
          fetchFixtures(selectedTourneyId)
        ]);
        setStandings(standingsData || []);
        setFixtures(fixturesData || []);
      } catch (e) {
        console.error("Error loading tournament details:", e);
      } finally {
        setLoadingDetails(false);
      }
    }
    loadTourneyDetails();
  }, [selectedTourneyId]);

  // Group fixtures by round
  const fixturesByRound = fixtures.reduce((acc: Record<number, any[]>, fix) => {
    const round = fix.round_number || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(fix);
    return acc;
  }, {});

  const rounds = Object.keys(fixturesByRound).map(Number).sort((a, b) => a - b);

  return (
    <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ paddingBottom: "4rem" }}>
        
        {/* Navigation Breadcrumbs */}
        <div className="portal-breadcrumb" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Link href="/" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Portal
          </Link>
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn" style={{ borderColor: "rgba(16, 185, 129, 0.25)", color: "#10b981" }}>
            <i className="fa-solid fa-user-gear" /> Admin Console
          </Link>
        </div>

        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div className="portal-page-badge" style={{ margin: "0 auto 1rem auto" }}>
            <i className="fa-solid fa-wand-magic-sparkles" />
            Season {seasonNum} Invitational
          </div>
          <h1 className="portal-title" style={{ fontSize: "2.5rem", letterSpacing: "3px" }}>SPECIAL TOUR</h1>
          <p className="portal-subtitle" style={{ fontSize: "0.95rem", maxWidth: "600px", margin: "0.5rem auto 0 auto" }}>
            Invitational tournaments featuring tailored financial regulations, custom matchday multipliers, and elite manager lineups.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "3rem" }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", marginBottom: "1rem" }} />
            <p>Loading tournaments list...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: "center", padding: "3.5rem 2rem", maxWidth: "650px", margin: "0 auto" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "2.5rem", color: "#eab308", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.3rem", color: "#fff", marginBottom: "0.5rem" }}>No Special Tournaments Active</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              There are currently no tournaments classified under the "Special Tour" type in Season {seasonNum}. 
              Please navigate to the Admin Console to register a new tournament stage and select "Special Tour" as its type.
            </p>
            <Link href="/solo-tour/admin/tournaments" className="portal-btn btn-primary" style={{ display: "inline-flex", margin: "0 auto" }}>
              <i className="fa-solid fa-plus" style={{ marginRight: "6px" }} /> Create Special Stage
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            
            {/* Tournament Selector Tab Area */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
              {tournaments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTourneyId(t.id)}
                  className={`portal-btn ${selectedTourneyId === t.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "12px",
                    fontWeight: 600,
                    letterSpacing: "1px",
                    fontSize: "0.85rem"
                  }}
                >
                  <i className="fa-solid fa-trophy" style={{ marginRight: "8px" }} />
                  {t.name}
                </button>
              ))}
            </div>

            {loadingDetails ? (
              <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "3rem" }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }} />
                <p>Loading standings and fixtures...</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2.5rem" }}>
                
                {/* Standings Table Card */}
                {standings.length > 0 && (
                  <div className="glass-panel" style={{ padding: "2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.75rem" }}>
                      <i className="fa-solid fa-list-ol" style={{ color: "var(--solo-primary)", fontSize: "1.2rem" }} />
                      <h2 style={{ fontSize: "1.25rem", color: "#fff" }}>Standings Table</h2>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.15)", color: "var(--text-secondary)" }}>
                            <th style={{ padding: "0.75rem", width: "50px" }}>Pos</th>
                            <th style={{ padding: "0.75rem" }}>Club</th>
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
                              key={row.id} 
                              style={{ 
                                borderBottom: "1px solid rgba(255,255,255,0.05)",
                                backgroundColor: index < 1 ? "rgba(45, 212, 191, 0.03)" : "transparent"
                              }}
                            >
                              <td style={{ padding: "1rem 0.75rem", fontWeight: 700, color: index === 0 ? "var(--solo-primary)" : "var(--text-secondary)" }}>
                                {index + 1}
                              </td>
                              <td style={{ padding: "1rem 0.75rem", fontWeight: 600 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <div 
                                    style={{ 
                                      width: "24px", 
                                      height: "24px", 
                                      backgroundSize: "contain", 
                                      backgroundPosition: "center", 
                                      backgroundRepeat: "no-repeat", 
                                      backgroundImage: `url('/assets/images/club-logos/${encodeURIComponent(row.club_name.replace(/\s+/g, '-'))}.webp'), url('/assets/images/default-club-logo.png')` 
                                    }}
                                  />
                                  {row.club_name}
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
                )}

                {/* Fixtures Section */}
                <div className="glass-panel" style={{ padding: "2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.75rem" }}>
                    <i className="fa-solid fa-calendar-days" style={{ color: "var(--solo-primary)", fontSize: "1.2rem" }} />
                    <h2 style={{ fontSize: "1.25rem", color: "#fff" }}>Match Fixtures &amp; Calendar</h2>
                  </div>

                  {rounds.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                      No fixtures generated for this tournament stage yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                      {rounds.map((round) => (
                        <div key={round}>
                          <h3 style={{ fontSize: "0.95rem", color: "var(--text-secondary)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "1rem", borderLeft: "2px solid var(--solo-primary)", paddingLeft: "8px" }}>
                            Round {round} Matches
                          </h3>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}>
                            {fixturesByRound[round].map((fix) => {
                              const hasPlayed = fix.home_score !== null && fix.away_score !== null;
                              return (
                                <div 
                                  key={fix.id} 
                                  style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    justifyContent: "space-between", 
                                    padding: "1rem", 
                                    background: "rgba(255, 255, 255, 0.02)", 
                                    border: "1px solid rgba(255, 255, 255, 0.05)", 
                                    borderRadius: "12px",
                                    gap: "1rem"
                                  }}
                                >
                                  {/* Home Team */}
                                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem", justifyContent: "flex-end" }}>
                                    <span style={{ fontWeight: 600, fontSize: "0.85rem", textAlign: "right" }}>{fix.home_club_name}</span>
                                    <div 
                                      style={{ 
                                        width: "24px", 
                                        height: "24px", 
                                        backgroundSize: "contain", 
                                        backgroundPosition: "center", 
                                        backgroundRepeat: "no-repeat", 
                                        backgroundImage: `url('/assets/images/club-logos/${encodeURIComponent(fix.home_club_name.replace(/\s+/g, '-'))}.webp'), url('/assets/images/default-club-logo.png')` 
                                      }}
                                    />
                                  </div>

                                  {/* Score / VS Badge */}
                                  <div 
                                    style={{ 
                                      background: "rgba(255, 255, 255, 0.04)", 
                                      padding: "0.35rem 1rem", 
                                      borderRadius: "8px", 
                                      minWidth: "70px", 
                                      textAlign: "center", 
                                      fontFamily: "monospace", 
                                      fontSize: "0.9rem",
                                      fontWeight: 700,
                                      border: "1px solid rgba(255,255,255,0.08)"
                                    }}
                                  >
                                    {hasPlayed ? (
                                      <span style={{ color: "var(--solo-primary)" }}>{fix.home_score} - {fix.away_score}</span>
                                    ) : (
                                      <span style={{ color: "var(--text-secondary)" }}>VS</span>
                                    )}
                                  </div>

                                  {/* Away Team */}
                                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                    <div 
                                      style={{ 
                                        width: "24px", 
                                        height: "24px", 
                                        backgroundSize: "contain", 
                                        backgroundPosition: "center", 
                                        backgroundRepeat: "no-repeat", 
                                        backgroundImage: `url('/assets/images/club-logos/${encodeURIComponent(fix.away_club_name.replace(/\s+/g, '-'))}.webp'), url('/assets/images/default-club-logo.png')` 
                                      }}
                                    />
                                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{fix.away_club_name}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
