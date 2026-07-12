"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchTournaments,
  fetchFixtures
} from "@/utils/solo/serverActions";

export default function FixturesManager() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [activeRound, setActiveRound] = useState<number>(1);
  
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const tourneys = await fetchTournaments();
      setTournaments(tourneys || []);
      
      // If a tournament is already selected, reload its fixtures
      if (selectedTournamentId) {
        const matches = await fetchFixtures(parseInt(selectedTournamentId));
        setFixtures(matches || []);
      } else {
        setFixtures([]);
      }
    } catch {
      showToast("Error loading fixtures data!");
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTournamentId]);

  // Find unique rounds available in current fixtures list
  const rounds = Array.from(new Set(fixtures.map(f => f.roundNumber || 1))).sort((a, b) => a - b);
  
  // Filter fixtures belonging to the active round
  const roundFixtures = fixtures.filter(f => (f.roundNumber || 1) === activeRound);

  const selectedTourneyObj = tournaments.find(t => t.id.toString() === selectedTournamentId);

  return (
    <div className="portal-root-wrapper" data-module="fixtures">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge"><i className="fa-solid fa-calendar-days" /> Results Manager</div>
          <h1 className="portal-title">FIXTURES & SCORES</h1>
          <p className="portal-subtitle">Select a tournament to view matches, filter by rounds, and enter match results.</p>
        </div>

        {/* Side-by-Side 2-column layout */}
        <div className="financial-layout">
          
          {/* Left Column: Select tournament and rounds */}
          <div className="financial-sidebar">
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h3 className="sub-card-title"><i className="fa-solid fa-sitemap" /> Select Tournament</h3>
              
              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label>Tournament Stage</label>
                <select 
                  className="admin-select" 
                  value={selectedTournamentId} 
                  onChange={(e) => {
                    setSelectedTournamentId(e.target.value);
                    setActiveRound(1);
                  }}
                >
                  <option value="">-- Select Tournament --</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (S{t.season_number})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of rounds */}
            {rounds.length > 0 && (
              <div className="admin-card" style={{ marginTop: 0 }}>
                <h3 className="sub-card-title"><i className="fa-solid fa-list-ol" /> Filter by Round</h3>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", background: "rgba(0,0,0,0.2)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <button
                    type="button"
                    className="portal-btn btn-secondary"
                    style={{ padding: "6px 12px", minWidth: "40px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", margin: 0 }}
                    onClick={() => setActiveRound(prev => Math.max(1, prev - 1))}
                    disabled={activeRound <= 1}
                  >
                    <i className="fa-solid fa-chevron-left" />
                  </button>

                  <select
                    className="admin-select"
                    style={{ flex: 1, textAlign: "center", fontSize: "0.9rem", padding: "6px 10px", margin: 0, fontWeight: "bold", color: "#fbbf24", cursor: "pointer" }}
                    value={activeRound}
                    onChange={(e) => setActiveRound(parseInt(e.target.value))}
                  >
                    {rounds.map(r => (
                      <option key={r} value={r}>Round {r}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="portal-btn btn-secondary"
                    style={{ padding: "6px 12px", minWidth: "40px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", margin: 0 }}
                    onClick={() => setActiveRound(prev => Math.min(rounds[rounds.length - 1], prev + 1))}
                    disabled={activeRound >= rounds[rounds.length - 1]}
                  >
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Fixtures list */}
          <div className="financial-main">
            <div className="admin-card" style={{ marginTop: 0 }}>
              {selectedTournamentId ? (
                <>
                  <h2 className="admin-card-title">
                    <i className="fa-solid fa-calendar-check" /> 
                    {selectedTourneyObj?.name} - {rounds.length > 0 ? `Round ${activeRound} of ${rounds.length}` : "No Fixtures"}
                  </h2>

                  {fixtures.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                      <i className="fa-solid fa-calendar-xmark" style={{ fontSize: "2rem", marginBottom: "1rem", display: "block" }} />
                      No matches scheduled for this tournament yet.
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                        Displaying {roundFixtures.length} matches in Round {activeRound}. Click "Enter Result" next to a match to input scores and update status.
                      </p>
                      
                      <div className="table-responsive" style={{ marginTop: 0 }}>
                        <table className="admin-list-table">
                          <thead>
                            <tr>
                              <th>Matchup (Home vs Away)</th>
                              <th style={{ width: "120px", textAlign: "center" }}>Result Score</th>
                              <th style={{ width: "150px" }}>Match Status</th>
                              <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {roundFixtures.map(f => (
                              <tr key={f.id}>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    {f.groupName && (
                                      <span style={{ 
                                        fontSize: "0.7rem", 
                                        padding: "2px 6px", 
                                        borderRadius: "4px", 
                                        background: "rgba(251, 191, 36, 0.15)", 
                                        color: "#fbbf24", 
                                        fontWeight: "bold",
                                        marginRight: "6px"
                                      }}>
                                        Group {f.groupName}
                                      </span>
                                    )}
                                    <span style={{ fontWeight: 700, color: "#fff" }}>{f.homeClub}</span>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>vs</span>
                                    <span style={{ fontWeight: 700, color: "#fff" }}>{f.awayClub}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: "center", fontWeight: "bold", fontSize: "1rem", color: "#fff" }}>
                                  {f.homeScore !== null && f.awayScore !== null ? `${f.homeScore} - ${f.awayScore}` : "-"}
                                </td>
                                <td>
                                  <span style={{
                                    fontSize: "0.7rem",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    background: f.match_status === 'void' ? "rgba(239, 68, 68, 0.15)" : f.match_status?.startsWith('wo') ? "rgba(245, 158, 11, 0.15)" : (f.match_status === 'played' || (f.homeScore !== null && f.awayScore !== null)) ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.08)",
                                    color: f.match_status === 'void' ? "#ef4444" : f.match_status?.startsWith('wo') ? "#f59e0b" : (f.match_status === 'played' || (f.homeScore !== null && f.awayScore !== null)) ? "#22c55e" : "var(--text-secondary)",
                                    fontWeight: "bold",
                                    textTransform: "uppercase"
                                  }}>
                                    {f.match_status || (f.homeScore !== null && f.awayScore !== null ? "played" : "scheduled")}
                                  </span>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <Link href={`/solo-tour/admin/fixtures/${f.id}`} className="portal-btn btn-primary" style={{ padding: "4px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <i className="fa-solid fa-pen-to-square" /> Enter Result
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                  <i className="fa-solid fa-hand-pointer" style={{ fontSize: "2.5rem", marginBottom: "1rem", display: "block" }} />
                  Please select a tournament stage from the sidebar to view matches and enter results.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
