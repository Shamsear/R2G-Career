"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchTournamentById, fetchFixtures, fetchTournamentStandings } from "@/utils/solo/serverActions";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";

export default function SpecialTourFixtures() {
  const params = useParams();
  const tourneyId = parseInt(params.id as string, 10);

  const [tournament, setTournament] = useState<any>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("table");
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
      } catch (err) {
        console.error("Error loading tournament details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tourneyId]);

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

        {/* Segmented Tab Bar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "4px", gap: "4px" }}>
            {[
              { key: "table", icon: "fa-solid fa-list-ol", label: "Standings Table" },
              { key: "fixture", icon: "fa-solid fa-calendar-days", label: "Match Calendar" }
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
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div 
                              style={{ 
                                width: "24px", 
                                height: "24px", 
                                backgroundSize: "contain", 
                                backgroundPosition: "center", 
                                backgroundRepeat: "no-repeat", 
                                backgroundImage: `url('${row.club_logo || '/assets/images/default-club-logo.png'}'), url('/assets/images/default-club-logo.png')` 
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
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem", animation: "rwsFadeUp 0.4s ease-out both" }}>
              {rounds.map((round) => (
                <div key={round} className="rws-round-section" style={{ background: "rgba(15, 23, 42, 0.4)", borderRadius: "16px", padding: "1.5rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <h2 style={{ fontSize: "1.15rem", color: "#fff", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <i className="fa-solid fa-circle-play" style={{ color: "var(--solo-primary)", fontSize: "0.95rem" }} />
                    Round {round}
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {fixturesByRound[round].map((match) => {
                      const isFinished = match.homeScore !== null && match.awayScore !== null;
                      return (
                        <div 
                          key={match.id} 
                          style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center", 
                            padding: "1rem 1.5rem", 
                            background: "rgba(255,255,255,0.02)", 
                            borderRadius: "10px", 
                            border: "1px solid rgba(255,255,255,0.03)"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                            <div 
                              style={{ 
                                width: "20px", 
                                height: "20px", 
                                backgroundSize: "contain", 
                                backgroundPosition: "center", 
                                backgroundRepeat: "no-repeat", 
                                backgroundImage: `url('${match.homeLogo || '/assets/images/default-club-logo.png'}'), url('/assets/images/default-club-logo.png')` 
                              }}
                            />
                            <span style={{ fontWeight: 600, color: "#fff" }}>{match.homeClub}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", justifyContent: "center", minWidth: "120px" }}>
                            {isFinished ? (
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: 800, color: "var(--solo-primary)", letterSpacing: "1px" }}>
                                {match.homeScore} - {match.awayScore}
                              </span>
                            ) : (
                              <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", fontWeight: "bold" }}>
                                VS
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, justifyContent: "flex-end" }}>
                            <span style={{ fontWeight: 600, color: "#fff" }}>{match.awayClub}</span>
                            <div 
                              style={{ 
                                width: "20px", 
                                height: "20px", 
                                backgroundSize: "contain", 
                                backgroundPosition: "center", 
                                backgroundRepeat: "no-repeat", 
                                backgroundImage: `url('${match.awayLogo || '/assets/images/default-club-logo.png'}'), url('/assets/images/default-club-logo.png')` 
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        )}</div>
    </div>
  );
}
