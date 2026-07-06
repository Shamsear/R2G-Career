"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchTournaments,
  fetchFixtures,
  autoGenerateFixtures,
  updateFixture,
  deleteFixture
} from "@/utils/solo/serverActions";

export default function FixturesManager() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [legs, setLegs] = useState<string>("1");
  const [activeRound, setActiveRound] = useState<number>(1);
  
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const handleGenerate = () => {
    if (!selectedTournamentId) return showToast("Select a tournament first!");
    startTransition(async () => {
      try {
        const res = await autoGenerateFixtures(parseInt(selectedTournamentId), legs);
        if (res.success) {
          showToast(`Successfully generated ${res.count} fixtures in rounds!`);
          setActiveRound(1);
          loadData();
        }
      } catch (e: any) {
        showToast(e.message || "Error generating fixtures!");
      }
    });
  };

  const handleUpdateFixtureScore = (fixtureId: number, home: string, away: string) => {
    const homeScore = home === "" ? null : parseInt(home);
    const awayScore = away === "" ? null : parseInt(away);
    startTransition(async () => {
      try {
        await updateFixture(fixtureId, homeScore, awayScore);
        showToast("Match score updated!");
        loadData();
      } catch {
        showToast("Error updating score!");
      }
    });
  };

  const handleDeleteFixture = (id: number) => {
    if (!confirm("Delete this fixture?")) return;
    startTransition(async () => {
      try {
        await deleteFixture(id);
        showToast("Fixture deleted!");
        loadData();
      } catch {
        showToast("Error deleting fixture!");
      }
    });
  };

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
          <div className="portal-page-badge"><i className="fa-solid fa-calendar-days" /> Fixtures Cockpit</div>
          <h1 className="portal-title">FIXTURES GENERATOR & RESULTS</h1>
          <p className="portal-subtitle">Auto-generate schedules in rounds for any tournament, and enter match scores.</p>
        </div>

        {/* Side-by-Side 2-column layout */}
        <div className="financial-layout">
          
          {/* Left Column: Select tournament and parameters */}
          <div className="financial-sidebar">
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h3 className="sub-card-title"><i className="fa-solid fa-sitemap" /> Select Tournament</h3>
              
              <div className="admin-form-group" style={{ marginBottom: "1rem" }}>
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

              {selectedTourneyObj && (
                <>
                  <div className="admin-form-group" style={{ marginBottom: "1.25rem" }}>
                    <label>Leg Options</label>
                    <select className="admin-select" value={legs} onChange={(e) => setLegs(e.target.value)}>
                      <option value="1">One-Legged Matchups</option>
                      <option value="2">Two-Legged Matchups (Home & Away)</option>
                    </select>
                  </div>
                  
                  <button 
                    className="portal-btn btn-primary" 
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={handleGenerate}
                    disabled={isPending}
                  >
                    <i className="fa-solid fa-wand-magic-sparkles" /> Auto-Generate Schedule
                  </button>
                </>
              )}
            </div>

            {/* List of generated rounds */}
            {rounds.length > 0 && (
              <div className="admin-card" style={{ marginTop: 0 }}>
                <h3 className="sub-card-title"><i className="fa-solid fa-list-ol" /> Tournament Rounds</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {rounds.map(r => (
                    <button
                      key={r}
                      className={`portal-btn ${activeRound === r ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: "4px 10px", fontSize: "0.8rem", minWidth: "40px" }}
                      onClick={() => setActiveRound(r)}
                    >
                      Round {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Fixtures list grouped in rounds */}
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
                      No matches scheduled. Click <strong>"Auto-Generate Schedule"</strong> on the left to set up pairings!
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                        Displaying {roundFixtures.length} matches scheduled for Round {activeRound}. Edit score and click outside the box to save.
                      </p>
                      
                      <div className="table-responsive" style={{ marginTop: 0 }}>
                        <table className="admin-list-table">
                          <thead>
                            <tr>
                              <th>Matchup (Home vs Away)</th>
                              <th style={{ width: "220px", textAlign: "center" }}>Enter Result Score</th>
                              <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {roundFixtures.map(f => (
                              <tr key={f.id}>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{ fontWeight: 700, color: "#fff" }}>{f.homeClub}</span>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>vs</span>
                                    <span style={{ fontWeight: 700, color: "#fff" }}>{f.awayClub}</span>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", justifyContent: "center" }}>
                                    <input
                                      type="number"
                                      className="admin-input"
                                      style={{ width: "55px", padding: "4px", textAlign: "center", fontWeight: "bold" }}
                                      defaultValue={f.homeScore ?? ""}
                                      onBlur={(e) => handleUpdateFixtureScore(f.id, e.target.value, f.awayScore ?? "")}
                                      placeholder="H"
                                    />
                                    <span style={{ color: "var(--text-secondary)" }}>-</span>
                                    <input
                                      type="number"
                                      className="admin-input"
                                      style={{ width: "55px", padding: "4px", textAlign: "center", fontWeight: "bold" }}
                                      defaultValue={f.awayScore ?? ""}
                                      onBlur={(e) => handleUpdateFixtureScore(f.id, f.homeScore ?? "", e.target.value)}
                                      placeholder="A"
                                    />
                                  </div>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <button className="portal-btn btn-danger" style={{ padding: "2px 8px", fontSize: "0.75rem" }} onClick={() => handleDeleteFixture(f.id)}>
                                    <i className="fa-solid fa-trash" /> Delete
                                  </button>
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
                  Please select a tournament stage from the sidebar to manage rounds and results.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
