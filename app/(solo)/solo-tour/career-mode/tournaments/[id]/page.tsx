"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import "../../../../../portal.css";
import { fetchTournamentById, fetchTournamentStandings, fetchFixtures } from "@/utils/solo/serverActions";

interface Tournament {
  id: number;
  name: string;
  format_type: string;
  season_number: number;
}

interface Standing {
  club_id: number;
  club_name: string;
  club_logo: string;
  matches_played: number;
  points: number;
  goals_scored: number;
  goals_against: number;
  goal_difference: number;
}

interface Fixture {
  id: number;
  tournamentId: number;
  tournamentName: string;
  homeClub: string;
  homeLogo: string;
  awayClub: string;
  awayLogo: string;
  homeScore: number | null;
  awayScore: number | null;
  matchEvents: any[];
}

export default function TournamentDetailPage() {
  const params = useParams();
  const tournamentId = parseInt(params.id as string, 10);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [activeTab, setActiveTab] = useState<"overall" | "table" | "fixture" | "stats">("overall");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        if (isNaN(tournamentId)) {
          setError("Invalid Tournament ID");
          return;
        }

        const [tData, sData, fData] = await Promise.all([
          fetchTournamentById(tournamentId),
          fetchTournamentStandings(tournamentId),
          fetchFixtures(tournamentId)
        ]);

        if (!tData) {
          setError(`Tournament #${tournamentId} not found`);
          return;
        }

        setTournament(tData);
        setStandings(sData);
        setFixtures(fData);
        document.title = `${tData.name} - Tournament Dashboard`;
      } catch (err: any) {
        console.error("Error loading tournament details:", err);
        setError("Failed to load tournament data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [tournamentId]);

  // Dynamically compute stats from match events
  const stats = useMemo(() => {
    const goalScorers: Record<string, number> = {};
    const playmakers: Record<string, number> = {};
    const discipline: Record<string, { yellow: number; red: number }> = {};

    fixtures.forEach(f => {
      if (f.matchEvents && Array.isArray(f.matchEvents)) {
        f.matchEvents.forEach(evt => {
          if (evt.type === 'goal') {
            if (evt.player) {
              goalScorers[evt.player] = (goalScorers[evt.player] || 0) + 1;
            }
            if (evt.detail && evt.detail.toLowerCase().includes("assist by ")) {
              const idx = evt.detail.toLowerCase().indexOf("assist by ");
              const assistPart = evt.detail.substring(idx + 10).trim();
              if (assistPart) {
                playmakers[assistPart] = (playmakers[assistPart] || 0) + 1;
              }
            }
          } else if (evt.type === 'yellow_card') {
            if (evt.player) {
              if (!discipline[evt.player]) discipline[evt.player] = { yellow: 0, red: 0 };
              discipline[evt.player].yellow += 1;
            }
          } else if (evt.type === 'red_card') {
            if (evt.player) {
              if (!discipline[evt.player]) discipline[evt.player] = { yellow: 0, red: 0 };
              discipline[evt.player].red += 1;
            }
          }
        });
      }
    });

    const sortedScorers = Object.entries(goalScorers)
      .map(([player, goals]) => ({ player, goals }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5);

    const sortedPlaymakers = Object.entries(playmakers)
      .map(([player, assists]) => ({ player, assists }))
      .sort((a, b) => b.assists - a.assists)
      .slice(0, 5);

    const sortedDiscipline = Object.entries(discipline)
      .map(([player, cards]) => ({ player, ...cards }))
      .sort((a, b) => (b.red * 3 + b.yellow) - (a.red * 3 + a.yellow))
      .slice(0, 5);

    return { scorers: sortedScorers, playmakers: sortedPlaymakers, cards: sortedDiscipline };
  }, [fixtures]);

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container">
          <div className="portal-breadcrumb">
            <Link href="/solo-tour/career-mode/tournaments" className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Tournaments
            </Link>
          </div>
          <div className="glass-panel skeleton" style={{ height: "250px", width: "100%", marginTop: "1rem" }} />
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container">
          <div className="portal-breadcrumb">
            <Link href="/solo-tour/career-mode/tournaments" className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Tournaments
            </Link>
          </div>
          <div className="no-results-message" style={{ borderStyle: "solid", borderColor: "rgba(239, 68, 68, 0.2)", marginTop: "1rem" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: "#ef4444" }} />
            <h3>Error Loading Tournament</h3>
            <p>{error || "Tournament data could not be found."}</p>
            <Link href="/solo-tour/career-mode/tournaments" className="portal-btn btn-secondary" style={{ marginTop: "1rem" }}>
              Return to Tournaments List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const finishedMatches = fixtures.filter(f => f.homeScore !== null && f.awayScore !== null);
  const totalGoals = finishedMatches.reduce((acc, f) => acc + (f.homeScore || 0) + (f.awayScore || 0), 0);

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/career-mode/tournaments" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Tournaments
          </Link>
        </div>

        {/* Hero Banner Header */}
        <div className="glass-panel" style={{ width: "100%", padding: "1.75rem 2rem", marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <span className="portal-card-badge" style={{ margin: "0", padding: "0.25rem 0.5rem" }}>
              SEASON {tournament.season_number}
            </span>
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", textTransform: "uppercase" }}>
              Format: {tournament.format_type}
            </span>
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "800", color: "#ffffff", margin: "0.5rem 0 0", fontFamily: "var(--font-display)" }}>
            {tournament.name}
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0" }}>
            Full management console for matchdays, standings, score sheets, and top scorers.
          </p>
        </div>

        {/* Tab Selector Links */}
        <div className="tabs-filter" style={{ margin: "1.5rem 0", display: "flex", gap: "0.5rem" }}>
          <button className={`tab-btn ${activeTab === "overall" ? "active" : ""}`} onClick={() => setActiveTab("overall")}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: "0.35rem" }} />
            Overall
          </button>
          <button className={`tab-btn ${activeTab === "table" ? "active" : ""}`} onClick={() => setActiveTab("table")}>
            <i className="fa-solid fa-list-ol" style={{ marginRight: "0.35rem" }} />
            Standings Table
          </button>
          <button className={`tab-btn ${activeTab === "fixture" ? "active" : ""}`} onClick={() => setActiveTab("fixture")}>
            <i className="fa-solid fa-calendar-days" style={{ marginRight: "0.35rem" }} />
            Fixtures
          </button>
          <button className={`tab-btn ${activeTab === "stats" ? "active" : ""}`} onClick={() => setActiveTab("stats")}>
            <i className="fa-solid fa-chart-simple" style={{ marginRight: "0.35rem" }} />
            Player Stats
          </button>
        </div>

        {/* TAB CONTENTS */}
        
        {/* Tab 1: Overall Summary */}
        {activeTab === "overall" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
            <div className="portal-grid cols-3" style={{ gap: "1.5rem" }}>
              <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                <i className="fa-solid fa-circle-play" style={{ fontSize: "2rem", color: "var(--rose-light)", marginBottom: "0.75rem" }} />
                <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#ffffff", fontFamily: "var(--font-mono)" }}>
                  {fixtures.length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Scheduled Matches</div>
              </div>

              <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                <i className="fa-solid fa-circle-check" style={{ fontSize: "2rem", color: "#4ade80", marginBottom: "0.75rem" }} />
                <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#ffffff", fontFamily: "var(--font-mono)" }}>
                  {finishedMatches.length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Matches Completed</div>
              </div>

              <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                <i className="fa-solid fa-futbol" style={{ fontSize: "2rem", color: "#fbbf24", marginBottom: "0.75rem" }} />
                <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#ffffff", fontFamily: "var(--font-mono)" }}>
                  {totalGoals}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Goals Scored</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h2 className="section-heading" style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
                Tournament Status Briefing
              </h2>
              <p className="section-text" style={{ margin: "0 0 1rem 0" }}>
                The S{tournament.season_number} campaign for {tournament.name} is currently active and processing matchdays. 
                {standings.length > 0 && ` Currently, ${standings[0].club_name} leads the table with ${standings[0].points} points.`}
              </p>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button className="portal-btn btn-secondary" onClick={() => setActiveTab("table")}>
                  View Full Standings Table
                </button>
                <button className="portal-btn btn-secondary" onClick={() => setActiveTab("fixture")}>
                  View Upcoming Matches
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Standings Table */}
        {activeTab === "table" && (
          <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto", width: "100%" }}>
            {standings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
                <p>No standings data available for this tournament.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px dashed rgba(255,255,255,0.08)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 0.5rem", width: "50px" }}>POS</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>CLUB</th>
                    <th style={{ padding: "0.75rem 0.5rem", width: "60px", textAlign: "center" }}>MP</th>
                    <th style={{ padding: "0.75rem 0.5rem", width: "60px", textAlign: "center" }}>PTS</th>
                    <th style={{ padding: "0.75rem 0.5rem", width: "50px", textAlign: "center" }}>GF</th>
                    <th style={{ padding: "0.75rem 0.5rem", width: "50px", textAlign: "center" }}>GA</th>
                    <th style={{ padding: "0.75rem 0.5rem", width: "50px", textAlign: "center" }}>GD</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, idx) => (
                    <tr key={row.club_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", color: "#ffffff", fontWeight: idx === 0 ? "700" : "400" }}>
                      <td style={{ padding: "1rem 0.5rem", fontFamily: "var(--font-mono)", color: idx === 0 ? "var(--rose-light)" : "var(--text-muted)" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "1rem 0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "var(--rose-light)", fontWeight: "700" }}>
                          {row.club_name.substring(0, 2).toUpperCase()}
                        </div>
                        {row.club_name}
                      </td>
                      <td style={{ padding: "1rem 0.5rem", textAlign: "center", fontFamily: "var(--font-mono)" }}>{row.matches_played}</td>
                      <td style={{ padding: "1rem 0.5rem", textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: "700", color: idx === 0 ? "#4ade80" : "#ffffff" }}>
                        {row.points}
                      </td>
                      <td style={{ padding: "1rem 0.5rem", textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{row.goals_scored}</td>
                      <td style={{ padding: "1rem 0.5rem", textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{row.goals_against}</td>
                      <td style={{ padding: "1rem 0.5rem", textAlign: "center", fontFamily: "var(--font-mono)", color: row.goal_difference > 0 ? "#4ade80" : row.goal_difference < 0 ? "#ef4444" : "var(--text-secondary)" }}>
                        {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Fixtures List */}
        {activeTab === "fixture" && (
          <div className="portal-grid cols-2" style={{ gap: "1.25rem", width: "100%" }}>
            {fixtures.length === 0 ? (
              <div className="no-results-message" style={{ gridColumn: "span 2" }}>
                <i className="fa-solid fa-calendar-xmark" />
                <h3>No fixtures scheduled</h3>
                <p>There are no matches currently scheduled for this tournament.</p>
              </div>
            ) : (
              fixtures.map((fixture) => {
                const isFinished = fixture.homeScore !== null && fixture.awayScore !== null;
                
                return (
                  <div key={fixture.id} className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      <span>MATCHDAY #{fixture.id}</span>
                      <span style={{
                        padding: "0.15rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.65rem",
                        fontWeight: "700",
                        background: isFinished ? "rgba(255,255,255,0.05)" : "rgba(244, 63, 94, 0.15)",
                        color: isFinished ? "var(--text-muted)" : "var(--rose-light)"
                      }}>
                        {isFinished ? "FINISHED" : "UPCOMING"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0" }}>
                      {/* Home */}
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem", textAlign: "right" }}>
                        <span style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.9rem" }}>{fixture.homeClub}</span>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "var(--rose-light)", fontWeight: "700" }}>
                          {fixture.homeClub.substring(0, 2).toUpperCase()}
                        </div>
                      </div>

                      {/* Score Box */}
                      <div style={{
                        margin: "0 1rem",
                        background: "rgba(8, 11, 17, 0.5)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "8px",
                        padding: "0.25rem 0.75rem",
                        fontFamily: "var(--font-mono)",
                        fontSize: "1rem",
                        fontWeight: "800",
                        color: "#ffffff",
                        minWidth: "65px",
                        textAlign: "center"
                      }}>
                        {isFinished ? `${fixture.homeScore} - ${fixture.awayScore}` : "VS"}
                      </div>

                      {/* Away */}
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "0.75rem", textAlign: "left" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "var(--rose-light)", fontWeight: "700" }}>
                          {fixture.awayClub.substring(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.9rem" }}>{fixture.awayClub}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.75rem" }}>
                      <Link
                        href={`/solo-tour/career-mode/fixtures/${fixture.id}`}
                        className="portal-btn btn-secondary"
                        style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                      >
                        Match Center <i className="fas fa-arrow-right" style={{ marginLeft: "0.25rem" }} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 4: Player Statistics */}
        {activeTab === "stats" && (
          <div className="portal-grid cols-3" style={{ gap: "1.5rem", width: "100%" }}>
            
            {/* Top Goals */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h2 className="section-heading" style={{ fontSize: "1rem", marginBottom: "1rem" }}>
                <i className="fa-solid fa-futbol" style={{ marginRight: "0.5rem", color: "#fbbf24" }} />
                TOP GOALS
              </h2>
              {stats.scorers.length === 0 ? (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "1rem 0" }}>No goals recorded yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {stats.scorers.map((s, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", fontSize: "0.85rem" }}>
                      <span style={{ fontWeight: "600", color: "#ffffff" }}>
                        {idx + 1}. {s.player}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "#fbbf24" }}>
                        {s.goals} G
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Playmakers */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h2 className="section-heading" style={{ fontSize: "1rem", marginBottom: "1rem" }}>
                <i className="fa-solid fa-handshake" style={{ marginRight: "0.5rem", color: "var(--rose-light)" }} />
                TOP ASSISTS
              </h2>
              {stats.playmakers.length === 0 ? (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "1rem 0" }}>No assists recorded yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {stats.playmakers.map((s, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", fontSize: "0.85rem" }}>
                      <span style={{ fontWeight: "600", color: "#ffffff" }}>
                        {idx + 1}. {s.player}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--rose-light)" }}>
                        {s.assists} A
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card Leaders */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h2 className="section-heading" style={{ fontSize: "1rem", marginBottom: "1rem" }}>
                <i className="fa-solid fa-square" style={{ marginRight: "0.5rem", color: "#ef4444" }} />
                DISCIPLINE
              </h2>
              {stats.cards.length === 0 ? (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "1rem 0" }}>No cards recorded yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {stats.cards.map((s, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", fontSize: "0.85rem" }}>
                      <span style={{ fontWeight: "600", color: "#ffffff" }}>
                        {idx + 1}. {s.player}
                      </span>
                      <div style={{ display: "flex", gap: "0.5rem", fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: "700" }}>
                        {s.yellow > 0 && <span style={{ color: "#fbbf24" }}>{s.yellow}Y</span>}
                        {s.red > 0 && <span style={{ color: "#ef4444" }}>{s.red}R</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
