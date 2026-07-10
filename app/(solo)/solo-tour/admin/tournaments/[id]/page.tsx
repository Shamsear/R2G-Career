"use client";
import { useEffect, useState, useTransition, use } from "react";
import Link from "next/link";
import "../../../../../portal.css";
import "../../admin.css";

import {
  fetchTournamentById,
  fetchFinancialRules,
  fetchFixtures,
  fetchRegisteredClubs,
  createFixture,
  updateFixture,
  deleteFixture,
  fetchTournamentTypes,
  updateTournamentDetails,
  fetchTournamentClubs,
  addClubToTournament,
  removeClubFromTournament,
  autoGenerateFixtures
} from "@/utils/solo/serverActions";

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const tournamentId = parseInt(resolvedParams.id);

  const [tournament, setTournament] = useState<any>(null);
  const [financialRules, setFinancialRules] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [tournamentTypes, setTournamentTypes] = useState<any[]>([]);
  
  // Participating clubs
  const [tournamentClubs, setTournamentClubs] = useState<any[]>([]);
  const [selectedClubToAdd, setSelectedClubToAdd] = useState("");
  const [generateLegs, setGenerateLegs] = useState("single");

  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editFormatType, setEditFormatType] = useState("League");
  const [editFinancialRuleId, setEditFinancialRuleId] = useState("");
  const [editTournamentType, setEditTournamentType] = useState("solo");

  const [fixtureForm, setFixtureForm] = useState({
    homeClubId: "",
    awayClubId: "",
    homeScore: "",
    awayScore: "",
    roundNumber: "1"
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const [tourney, rules, matches, clubsData, types, tourneyClubs] = await Promise.all([
        fetchTournamentById(tournamentId),
        fetchFinancialRules(),
        fetchFixtures(tournamentId),
        fetchRegisteredClubs(),
        fetchTournamentTypes(),
        fetchTournamentClubs(tournamentId)
      ]);
      setTournament(tourney);
      setFinancialRules(rules || []);
      setFixtures(matches || []);
      setClubs(clubsData || []);
      setTournamentTypes(types || []);
      setTournamentClubs(tourneyClubs || []);

      if (tourney) {
        setEditName(tourney.name);
        setEditFormatType(tourney.format_type);
        setEditFinancialRuleId(tourney.financial_rule_id ? tourney.financial_rule_id.toString() : "");
        setEditTournamentType(tourney.tournament_type || "solo");
      }
    } catch {
      showToast("Error loading tournament details!");
    }
  };

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const handleUpdateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName) return showToast("Tournament name required!");
    startTransition(async () => {
      try {
        const ruleId = editFinancialRuleId ? parseInt(editFinancialRuleId) : null;
        await updateTournamentDetails(
          tournamentId,
          editName,
          editFormatType,
          ruleId,
          editTournamentType
        );
        showToast("Tournament details updated!");
        setIsEditing(false);
        loadData();
      } catch (error: any) {
        showToast("Failed to update tournament details!");
      }
    });
  };

  const handleSaveFixture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixtureForm.homeClubId || !fixtureForm.awayClubId) {
      return showToast("Select Home and Away clubs!");
    }
    if (fixtureForm.homeClubId === fixtureForm.awayClubId) {
      return showToast("Home and Away clubs cannot be the same!");
    }
    startTransition(async () => {
      try {
        const payload = {
          tournamentId: tournamentId,
          homeClubId: parseInt(fixtureForm.homeClubId),
          awayClubId: parseInt(fixtureForm.awayClubId),
          homeScore: fixtureForm.homeScore ? parseInt(fixtureForm.homeScore) : null,
          awayScore: fixtureForm.awayScore ? parseInt(fixtureForm.awayScore) : null,
          roundNumber: parseInt(fixtureForm.roundNumber) || 1
        };
        await createFixture(payload);
        showToast("Fixture scheduled!");
        setFixtureForm({ homeClubId: "", awayClubId: "", homeScore: "", awayScore: "", roundNumber: "1" });
        loadData();
      } catch {
        showToast("Error scheduling match!");
      }
    });
  };

  const handleUpdateFixtureScore = (fixtureId: number, home: string | number, away: string | number, status: string = 'played') => {
    const homeScore = home === "" ? null : parseInt(home.toString());
    const awayScore = away === "" ? null : parseInt(away.toString());
    startTransition(async () => {
      try {
        await updateFixture(fixtureId, homeScore, awayScore, status);
        showToast("Match status and score updated!");
        loadData();
      } catch {
        showToast("Error updating match!");
      }
    });
  };

  const handleDeleteFixture = (id: number) => {
    if (!confirm("Are you sure you want to delete this match?")) return;
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

  const handleAddClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubToAdd) return showToast("Select a team to add!");
    startTransition(async () => {
      try {
        await addClubToTournament(tournamentId, parseInt(selectedClubToAdd));
        showToast("Team added to tournament!");
        setSelectedClubToAdd("");
        loadData();
      } catch {
        showToast("Error adding team!");
      }
    });
  };

  const handleRemoveClub = (clubId: number) => {
    if (!confirm("Are you sure you want to remove this team from the tournament? This deletes their standing record.")) return;
    startTransition(async () => {
      try {
        await removeClubFromTournament(tournamentId, clubId);
        showToast("Team removed from tournament!");
        loadData();
      } catch {
        showToast("Error removing team!");
      }
    });
  };

  const handleAutoGenerate = () => {
    if (tournamentClubs.length < 2) {
      return showToast("Need at least 2 participating teams to generate matchups!");
    }
    if (!confirm(`Are you sure you want to auto-generate fixtures for this tournament? This will clear all existing matches for this stage!`)) return;
    startTransition(async () => {
      try {
        const res = await autoGenerateFixtures(tournamentId, generateLegs);
        showToast(`Generated ${res.count} matchups successfully!`);
        loadData();
      } catch (err: any) {
        showToast(err.message || "Error generating matchups!");
      }
    });
  };

  if (!tournament) {
    return (
      <div className="portal-root-wrapper" data-module="tournaments" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div style={{ color: "#fff", fontSize: "1.2rem" }}>Loading tournament details...</div>
      </div>
    );
  }

  const linkedRule = financialRules.find(r => r.id === tournament.financial_rule_id);

  return (
    <div className="portal-root-wrapper" data-module="tournaments">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin/tournaments" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Tournaments
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge">
            <i className="fa-solid fa-sitemap" />
            Tournament Console
          </div>
          <h1 className="portal-title">{tournament.name}</h1>
          <p className="portal-subtitle">
            Format: <strong>{tournament.format_type}</strong> | Active Season: <strong>Season {tournament.season_number}</strong>
          </p>
        </div>

        {/* Side-by-Side 2-column Detail Panel */}
        <div className="financial-layout">

          {/* Left Column: Tournament Info & Rules Template */}
          <div className="financial-sidebar">
            
            {/* Overview Card */}
            <div className="admin-card" style={{ marginTop: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 className="sub-card-title" style={{ margin: 0 }}><i className="fa-solid fa-circle-info" /> Overview</h3>
                <button 
                  type="button" 
                  className="portal-btn btn-secondary" 
                  style={{ padding: "2px 8px", fontSize: "0.7rem", minHeight: "auto", height: "auto" }} 
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateTournament} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Tournament Name</label>
                    <input 
                      type="text" 
                      className="admin-input" 
                      style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Format</label>
                    <select 
                      className="admin-select" 
                      style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                      value={editFormatType} 
                      onChange={(e) => setEditFormatType(e.target.value)}
                    >
                      <option value="League">League</option>
                      <option value="Knockout">Knockout</option>
                      <option value="GSL Group">GSL Group</option>
                    </select>
                  </div>
                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Type</label>
                    <select 
                      className="admin-select" 
                      style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                      value={editTournamentType} 
                      onChange={(e) => setEditTournamentType(e.target.value)}
                    >
                      {tournamentTypes.map(t => (
                        <option key={t.name} value={t.name}>{t.display_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Financial Template</label>
                    <select 
                      className="admin-select" 
                      style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                      value={editFinancialRuleId} 
                      onChange={(e) => setEditFinancialRuleId(e.target.value)}
                    >
                      <option value="">-- Select Rule Template --</option>
                      {financialRules.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="portal-btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "6px", fontSize: "0.8rem", marginTop: "0.25rem" }} disabled={isPending}>
                    Save Changes
                  </button>
                </form>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  <div>Name: <strong style={{ color: "#fff" }}>{tournament.name}</strong></div>
                  <div>Format: <strong style={{ color: "#fff" }}>{tournament.format_type}</strong></div>
                  <div>Type: <strong style={{ color: "#38bdf8" }}>{tournamentTypes.find(tp => tp.name === tournament.tournament_type)?.display_name || tournament.tournament_type || "solo"}</strong></div>
                  <div>Season: <strong style={{ color: "#fff" }}>Season {tournament.season_number}</strong></div>
                </div>
              )}
            </div>

            {/* Participating Teams Card */}
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h3 className="sub-card-title">
                <i className="fa-solid fa-users" /> Participating Teams ({tournamentClubs.length})
              </h3>
              
              {tournamentClubs.length === 0 ? (
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  No teams added yet. Add teams to generate fixtures.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" }}>
                  {tournamentClubs.map(tc => (
                    <div key={tc.club_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {tc.logo_path && (
                          <img src={tc.logo_path} alt={tc.name} style={{ width: "16px", height: "16px", objectFit: "contain" }} />
                        )}
                        <strong style={{ color: "#fff" }}>{tc.name}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveClub(tc.club_id)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                        title="Remove team"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddClub} style={{ display: "flex", gap: "0.4rem" }}>
                <select 
                  className="admin-select" 
                  style={{ fontSize: "0.8rem", padding: "6px 10px", flex: 1 }}
                  value={selectedClubToAdd}
                  onChange={(e) => setSelectedClubToAdd(e.target.value)}
                >
                  <option value="">-- Add Team --</option>
                  {clubs
                    .filter(c => !tournamentClubs.some(tc => tc.club_id === c.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  }
                </select>
                <button type="submit" className="portal-btn btn-primary" style={{ padding: "6px 12px", fontSize: "0.8rem", minHeight: "auto", height: "auto" }} disabled={isPending}>
                  Add
                </button>
              </form>
            </div>

            {/* Financial Rules Card */}
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h3 className="sub-card-title">
                <i className="fa-solid fa-scale-balanced" /> Linked Rules Template
              </h3>
              {linkedRule ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#fff", fontWeight: 700 }}>
                    {linkedRule.name}
                  </h4>
                  <div className="rule-card-pills">
                    <div className="rule-pill">
                      <span>Match Bonus:</span>
                      <span style={{ color: "#fbbf24", fontWeight: 700 }}>{linkedRule.match_bonus_rc} / {linkedRule.match_bonus_rt} / {linkedRule.match_bonus_voucher}</span>
                    </div>
                    <div className="rule-pill">
                      <span>Winner Bonus:</span>
                      <span style={{ color: "#38bdf8", fontWeight: 700 }}>{linkedRule.tournament_bonus_rc} / {linkedRule.tournament_bonus_rt} / {linkedRule.tournament_bonus_voucher}</span>
                    </div>
                    <div className="rule-pill">
                      <span>Walkover Fine:</span>
                      <span style={{ color: "#ef4444", fontWeight: 700 }}>{linkedRule.walkover_fine_rc} / {linkedRule.walkover_fine_rt} / {linkedRule.walkover_fine_voucher}</span>
                    </div>
                    <div className="rule-pill">
                      <span>Extension Fee:</span>
                      <span style={{ color: "#ec4899", fontWeight: 700 }}>{linkedRule.match_extension_fee_rc} / {linkedRule.match_extension_fee_rt} / {linkedRule.match_extension_fee_voucher}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  No financial template linked. Payouts will not be templates-calculated.
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Fixtures list & scheduling */}
          <div className="financial-main">
            
            {/* Auto-Fixture Generation Card */}
            <div className="admin-card" style={{ marginTop: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h3 className="sub-card-title" style={{ marginBottom: "0.15rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "#a855f7" }} /> Auto-Generate Matchups
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Schedules a Round Robin fixture list for all participating teams.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <select 
                    className="admin-select" 
                    style={{ fontSize: "0.8rem", padding: "6px 10px", width: "130px" }}
                    value={generateLegs}
                    onChange={(e) => setGenerateLegs(e.target.value)}
                  >
                    <option value="single">Single Leg (1x)</option>
                    <option value="double">Double Leg (2x)</option>
                  </select>
                  <button 
                    type="button" 
                    className="portal-btn btn-primary" 
                    style={{ padding: "6px 12px", fontSize: "0.8rem", minHeight: "auto", height: "auto", display: "flex", alignItems: "center", gap: "0.3rem" }} 
                    onClick={handleAutoGenerate}
                    disabled={isPending || tournamentClubs.length < 2}
                  >
                    <i className="fa-solid fa-bolt" /> Generate Fixtures
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Fixture scheduling */}
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h3 className="sub-card-title"><i className="fa-solid fa-calendar-plus" /> Schedule Match</h3>
              <form onSubmit={handleSaveFixture}>
                <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr 1fr 100px" }}>
                  <div className="admin-form-group">
                    <label>Home Club</label>
                    <select className="admin-select" value={fixtureForm.homeClubId} onChange={(e) => setFixtureForm(prev => ({ ...prev, homeClubId: e.target.value }))}>
                      <option value="">-- Select Home --</option>
                      {tournamentClubs.map(c => (
                        <option key={c.club_id} value={c.club_id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Away Club</label>
                    <select className="admin-select" value={fixtureForm.awayClubId} onChange={(e) => setFixtureForm(prev => ({ ...prev, awayClubId: e.target.value }))}>
                      <option value="">-- Select Away --</option>
                      {tournamentClubs.map(c => (
                        <option key={c.club_id} value={c.club_id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Round</label>
                    <input type="number" className="admin-input" min={1} value={fixtureForm.roundNumber} onChange={(e) => setFixtureForm(prev => ({ ...prev, roundNumber: e.target.value }))} />
                  </div>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                    Schedule Matchup
                  </button>
                </div>
              </form>
            </div>

            {/* Match list */}
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h3 className="sub-card-title"><i className="fa-solid fa-calendar-days" /> Scheduled Fixtures</h3>
              
              {fixtures.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  No matches scheduled for this tournament yet.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-list-table">
                    <thead>
                      <tr>
                        <th>Round</th>
                        <th>Matchup</th>
                        <th style={{ width: "120px", textAlign: "center" }}>Result Score</th>
                        <th style={{ width: "150px" }}>Match Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fixtures.map(f => (
                        <tr key={f.id}>
                          <td><strong>Round {f.roundNumber || 1}</strong></td>
                          <td>
                            <strong>{f.homeClub}</strong> vs <strong>{f.awayClub}</strong>
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "bold", fontSize: "1rem", color: "#fff" }}>
                            {f.homeScore !== null && f.awayScore !== null ? `${f.homeScore} - ${f.awayScore}` : "-"}
                          </td>
                          <td>
                            <span style={{
                              fontSize: "0.7rem",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: f.match_status === 'void' ? "rgba(239, 68, 68, 0.15)" : f.match_status?.startsWith('wo') ? "rgba(245, 158, 11, 0.15)" : "rgba(34, 197, 94, 0.15)",
                              color: f.match_status === 'void' ? "#ef4444" : f.match_status?.startsWith('wo') ? "#f59e0b" : "#22c55e",
                              fontWeight: "bold",
                              textTransform: "uppercase"
                            }}>
                              {f.match_status || "played"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                              <Link href={`/solo-tour/admin/fixtures/${f.id}`} className="portal-btn btn-primary" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>
                                <i className="fa-solid fa-scale-balanced" style={{ marginRight: "4px" }} /> Manage
                              </Link>
                              <button className="portal-btn btn-danger" style={{ padding: "2px 8px", fontSize: "0.75rem" }} onClick={() => handleDeleteFixture(f.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
