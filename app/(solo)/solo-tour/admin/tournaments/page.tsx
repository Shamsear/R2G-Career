"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchTournaments,
  fetchFinancialRules,
  createTournament,
  deleteTournament,
  fetchTournamentTypes,
  createTournamentType,
  deleteTournamentType,
  updateTournamentDetails
} from "@/utils/solo/serverActions";

export default function TournamentsManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [financialRules, setFinancialRules] = useState<any[]>([]);
  const [tournamentTypes, setTournamentTypes] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [tourneyForm, setTourneyForm] = useState({
    id: "",
    name: "",
    formatType: "League",
    financialRuleId: "",
    tournamentType: "solo",
    numGroups: "",
    teamsPerGroup: "",
    qualifiedPerGroup: "",
    numTeams: "",
    divisionTier: "",
    promotionCount: "",
    relegationCount: ""
  });

  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDisplayName, setNewTypeDisplayName] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const season = await fetchActiveSeason();
      setActiveSeason(season);
      const [tourneys, rules, types] = await Promise.all([
        fetchTournaments(),
        fetchFinancialRules(),
        fetchTournamentTypes()
      ]);
      setTournaments(tourneys || []);
      setFinancialRules(rules || []);
      setTournamentTypes(types || []);
    } catch {
      showToast("Error loading tournaments data!");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearForm = () => {
    setTourneyForm({
      id: "",
      name: "",
      formatType: "League",
      financialRuleId: "",
      tournamentType: "solo",
      numGroups: "",
      teamsPerGroup: "",
      qualifiedPerGroup: "",
      numTeams: "",
      divisionTier: "",
      promotionCount: "",
      relegationCount: ""
    });
  };

  const handleEditTournament = (t: any) => {
    setTourneyForm({
      id: t.id.toString(),
      name: t.name,
      formatType: t.format_type,
      financialRuleId: t.financial_rule_id ? t.financial_rule_id.toString() : "",
      tournamentType: t.tournament_type || "solo",
      numGroups: t.num_groups !== null ? t.num_groups.toString() : "",
      teamsPerGroup: t.teams_per_group !== null ? t.teams_per_group.toString() : "",
      qualifiedPerGroup: t.qualified_per_group !== null ? t.qualified_per_group.toString() : "",
      numTeams: t.num_teams !== null ? t.num_teams.toString() : "",
      divisionTier: t.division_tier !== null && t.division_tier !== undefined ? t.division_tier.toString() : "",
      promotionCount: t.promotion_count !== null && t.promotion_count !== undefined ? t.promotion_count.toString() : "",
      relegationCount: t.relegation_count !== null && t.relegation_count !== undefined ? t.relegation_count.toString() : ""
    });
  };

  const handleSaveTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourneyForm.name) return showToast("Tournament name required!");
    startTransition(async () => {
      try {
        // Force no financial rule for RWS and Special Tour
        const isNoFinancialType = tourneyForm.tournamentType === 'rws' || tourneyForm.tournamentType === 'special';
        const ruleId = (!isNoFinancialType && tourneyForm.financialRuleId) ? parseInt(tourneyForm.financialRuleId) : null;
        const groups = tourneyForm.numGroups ? parseInt(tourneyForm.numGroups) : null;
        const totalTeams = tourneyForm.numTeams ? parseInt(tourneyForm.numTeams) : null;
        const divTier = tourneyForm.divisionTier ? parseInt(tourneyForm.divisionTier) : null;
        const promo = tourneyForm.promotionCount ? parseInt(tourneyForm.promotionCount) : 0;
        const releg = tourneyForm.relegationCount ? parseInt(tourneyForm.relegationCount) : 0;
        
        // Auto-calculate teams per group if total teams and groups are defined
        let teams = null;
        if (totalTeams && groups && groups > 0) {
          teams = Math.floor(totalTeams / groups);
        }

        const qualified = tourneyForm.qualifiedPerGroup ? parseInt(tourneyForm.qualifiedPerGroup) : null;

        if (tourneyForm.id) {
          await updateTournamentDetails(
            parseInt(tourneyForm.id),
            tourneyForm.name,
            tourneyForm.formatType,
            ruleId,
            tourneyForm.tournamentType,
            groups,
            teams,
            qualified,
            totalTeams,
            divTier,
            promo,
            releg
          );
          showToast("Tournament updated!");
        } else {
          await createTournament(
            tourneyForm.name,
            tourneyForm.formatType,
            activeSeason?.id || 6,
            ruleId,
            tourneyForm.tournamentType,
            groups,
            teams,
            qualified,
            totalTeams,
            divTier,
            promo,
            releg
          );
          showToast("Tournament created!");
        }
        clearForm();
        loadData();
      } catch {
        showToast("Error saving tournament!");
      }
    });
  };

  const handleDeleteTournament = (id: number) => {
    if (!confirm("Are you sure you want to delete this tournament? This will also delete all referencing fixtures and standings!")) return;
    startTransition(async () => {
      try {
        await deleteTournament(id);
        showToast("Tournament deleted!");
        clearForm();
        loadData();
      } catch {
        showToast("Error deleting tournament!");
      }
    });
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName || !newTypeDisplayName) return showToast("Type code and display name required!");
    const cleanName = newTypeName.toLowerCase().trim().replace(/\s+/g, "_");
    startTransition(async () => {
      try {
        await createTournamentType(cleanName, newTypeDisplayName.trim());
        showToast("Tournament type created!");
        setNewTypeName("");
        setNewTypeDisplayName("");
        loadData();
      } catch (err: any) {
        showToast("Failed to create tournament type: " + (err.message || ""));
      }
    });
  };

  const handleDeleteType = (name: string) => {
    if (["solo", "special", "rws"].includes(name)) {
      return showToast("Cannot delete system default types!");
    }
    if (!confirm(`Are you sure you want to delete the type "${name}"? Any tournaments using this type might error.`)) return;
    startTransition(async () => {
      try {
        await deleteTournamentType(name);
        showToast("Tournament type deleted!");
        loadData();
      } catch (err: any) {
        showToast("Failed to delete tournament type.");
      }
    });
  };

  const leagueCount = tournaments.filter(t => t.format_type === "League").length;
  const knockoutCount = tournaments.filter(t => t.format_type === "Knockout").length;
  const linkedCount = tournaments.filter(t => t.financial_rule_id).length;

  return (
    <div className="portal-root-wrapper" data-module="tournaments">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        <div className="portal-header">
          <div className="portal-page-badge"><i className="fa-solid fa-sitemap" /> Tournaments</div>
          <h1 className="portal-title">TOURNAMENTS</h1>
          <p className="portal-subtitle">Configure tournament stages and dynamically link them to universal financial rule templates.</p>
        </div>

        {/* Stats Overview */}
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="stat-label">Total Tournaments</div>
            <div className="stat-value">{tournaments.length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">League Format</div>
            <div className="stat-value">{leagueCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Knockout Format</div>
            <div className="stat-value">{knockoutCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Linked Templates</div>
            <div className="stat-value">{linkedCount}</div>
          </div>
        </div>

        {/* 2-column side-by-side layout */}
        <div className="financial-layout">
          
          {/* Left Column: Tournaments list cards & Types Manager */}
          <div className="financial-sidebar">
            <button className="portal-btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={clearForm}>
              <i className="fa-solid fa-circle-plus" /> Create New Tournament
            </button>
            
            <div className="clubs-scroll-container">
              {tournaments.length === 0 ? (
                <div className="admin-empty">
                  <i className="fa-solid fa-trophy" />
                  No tournaments created yet. Use the form to create your first tournament stage.
                </div>
              ) : (
                tournaments.map((t, idx) => {
                  const rule = financialRules.find(r => r.id === t.financial_rule_id);
                  const typeObj = tournamentTypes.find(tp => tp.name === t.tournament_type) || { display_name: t.tournament_type || "Solo" };
                  const isActive = tourneyForm.id === t.id.toString();
                  return (
                    <div 
                      key={t.id}
                      className={`club-select-card ${isActive ? 'active' : ''}`}
                      style={{ cursor: "pointer", animationDelay: `${idx * 0.05}s` }}
                      onClick={() => handleEditTournament(t)}
                    >
                      <div className="rule-card-header">
                        <span className="rule-card-title" style={{ fontSize: "0.95rem" }}>{t.name}</span>
                        {!(t.tournament_type === 'rws' || t.tournament_type === 'special') && (
                          <span className="badge-info">
                            Season {t.season_number}
                          </span>
                        )}
                      </div>

                      <div className="rule-card-pills" style={{ marginTop: "0.25rem" }}>
                        <div className="rule-pill">
                          <span>Format:</span>
                          <span style={{ fontWeight: 600, color: "#fff" }}>{t.format_type}</span>
                        </div>
                        <div className="rule-pill">
                          <span>Type:</span>
                          <span style={{ fontWeight: 600, color: "#38bdf8" }}>{typeObj.display_name}</span>
                        </div>
                        {!(t.tournament_type === 'rws' || t.tournament_type === 'special') && (
                        <div className="rule-pill">
                          <span>Rules Template:</span>
                          <span style={{ fontWeight: 600, color: rule ? "#10b981" : "var(--text-secondary)" }}>{rule ? rule.name : "None"}</span>
                        </div>
                        )}
                      </div>

                      <div className="club-card-footer" onClick={(e) => e.stopPropagation()}>
                        <Link 
                          href={`/solo-tour/admin/tournaments/${t.id}`}
                          className="portal-btn btn-primary" 
                          style={{ padding: "2px 8px", fontSize: "0.7rem", textDecoration: "none", flex: 1, justifyContent: "center" }}
                        >
                          <i className="fa-solid fa-eye" /> Details
                        </Link>
                        <button 
                          className="portal-btn btn-danger" 
                          style={{ padding: "2px 8px", fontSize: "0.7rem", flex: 1, justifyContent: "center" }}
                          onClick={() => handleDeleteTournament(t.id)}
                        >
                          <i className="fa-solid fa-trash" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Tournament Types Manager */}
            <div className="admin-card" style={{ marginTop: "1.5rem" }}>
              <h3 className="sub-card-title"><i className="fa-solid fa-gear" /> Manage Tournament Types</h3>
              <form onSubmit={handleCreateType} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                <div className="admin-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Type Code (lowercase, no spaces)</label>
                  <input
                    type="text"
                    placeholder="e.g. special_cup"
                    className="admin-input"
                    style={{ fontSize: "0.8rem", padding: "6px 10px" }}
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                  />
                </div>
                <div className="admin-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Special Cup"
                    className="admin-input"
                    style={{ fontSize: "0.8rem", padding: "6px 10px" }}
                    value={newTypeDisplayName}
                    onChange={(e) => setNewTypeDisplayName(e.target.value)}
                  />
                </div>
                <button type="submit" className="portal-btn btn-primary" style={{ padding: "6px 10px", fontSize: "0.75rem", justifyContent: "center", marginTop: "0.25rem" }} disabled={isPending}>
                  Add Type
                </button>
              </form>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {tournamentTypes.map(t => (
                  <div key={t.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontWeight: 500 }}>{t.display_name} (<code>{t.name}</code>)</span>
                    {!["solo", "special", "rws"].includes(t.name) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteType(t.name)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                        title="Delete type"
                      >
                        <i className="fa-solid fa-trash" style={{ fontSize: "0.7rem" }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Creation / Edition Form */}
          <div className="financial-main">
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h2 className="admin-card-title">
                {tourneyForm.id ? (
                  <><i className="fa-solid fa-pen-to-square" /> Edit Tournament Details</>
                ) : (
                  <><i className="fa-solid fa-plus-circle" /> Create New Tournament Stage</>
                )}
              </h2>

              <form onSubmit={handleSaveTournament}>
                <div className="sub-card">
                  <div className="sub-card-title"><i className="fa-solid fa-gear" /> Tournament Details</div>
                  
                  <div className="admin-form-group" style={{ marginBottom: "1rem" }}>
                    <label>Tournament Name</label>
                    <input 
                      type="text" 
                      className="admin-input" 
                      value={tourneyForm.name} 
                      onChange={(e) => setTourneyForm(prev => ({ ...prev, name: e.target.value }))} 
                      placeholder="e.g. Division One, Champions League" 
                      required
                    />
                  </div>

                  <div className="admin-form-group" style={{ marginBottom: "1rem" }}>
                    <label>Tournament Format</label>
                    <select className="admin-select" value={tourneyForm.formatType} onChange={(e) => setTourneyForm(prev => ({ ...prev, formatType: e.target.value }))}>
                      <option value="League">League Format</option>
                      <option value="Knockout">Knockout Format</option>
                      <option value="Group + Knockout">Group + Knockout Format</option>
                      <option value="League + Knockout">League + Knockout Format</option>
                    </select>
                  </div>

                  {(tourneyForm.formatType === "Group + Knockout" || tourneyForm.formatType === "League + Knockout") && (() => {
                    const computedTeamsPerGroup = tourneyForm.numTeams && tourneyForm.numGroups 
                      ? Math.floor(parseInt(tourneyForm.numTeams) / parseInt(tourneyForm.numGroups)) 
                      : 0;
                    return (
                      <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.8rem", marginBottom: "1rem" }}>
                        <div className="admin-form-group" style={{ marginBottom: 0 }}>
                          <label>Total Teams</label>
                          <input 
                            type="number" 
                            className="admin-input" 
                            min={2} 
                            value={tourneyForm.numTeams} 
                            onChange={(e) => setTourneyForm(prev => ({ ...prev, numTeams: e.target.value }))} 
                            placeholder="e.g. 16" 
                            required
                          />
                        </div>
                        <div className="admin-form-group" style={{ marginBottom: 0 }}>
                          <label>No. of Groups</label>
                          <input 
                            type="number" 
                            className="admin-input" 
                            min={1} 
                            value={tourneyForm.numGroups} 
                            onChange={(e) => setTourneyForm(prev => ({ ...prev, numGroups: e.target.value }))} 
                            placeholder="e.g. 4" 
                            required
                          />
                        </div>
                        <div className="admin-form-group" style={{ marginBottom: 0 }}>
                          <label>Teams / Group</label>
                          <div style={{ padding: "6px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fbbf24", fontWeight: 700, fontSize: "0.85rem", height: "34px", display: "flex", alignItems: "center" }}>
                            {computedTeamsPerGroup || "—"}
                          </div>
                        </div>
                        <div className="admin-form-group" style={{ marginBottom: 0 }}>
                          <label>Qualifying Teams / Gp</label>
                          <select 
                            className="admin-select" 
                            value={tourneyForm.qualifiedPerGroup} 
                            onChange={(e) => setTourneyForm(prev => ({ ...prev, qualifiedPerGroup: e.target.value }))}
                            required
                          >
                            <option value="">-- Choose --</option>
                            {Array.from({ length: computedTeamsPerGroup }, (_, i) => i + 1).map(num => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="admin-form-group" style={{ marginBottom: "1rem" }}>
                    <label>Tournament Type</label>
                    <select className="admin-select" value={tourneyForm.tournamentType} onChange={(e) => setTourneyForm(prev => ({ ...prev, tournamentType: e.target.value }))}>
                      {tournamentTypes.map(t => (
                        <option key={t.name} value={t.name}>{t.display_name}</option>
                      ))}
                    </select>
                  </div>

                   <div className="admin-form-group">
                    <label>Linked Financial Template</label>
                    {(tourneyForm.tournamentType === 'rws' || tourneyForm.tournamentType === 'special') ? (
                      <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <i className="fa-solid fa-ban" style={{ marginRight: '0.4rem', color: '#ef4444' }} />
                        Not applicable — RWS &amp; Special Tour have no financial rewards
                      </div>
                    ) : (
                    <select className="admin-select" value={tourneyForm.financialRuleId} onChange={(e) => setTourneyForm(prev => ({ ...prev, financialRuleId: e.target.value }))}>
                      <option value="">-- Select Rule Template --</option>
                      {financialRules.map(rule => (
                        <option key={rule.id} value={rule.id}>{rule.name}</option>
                      ))}
                    </select>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.25rem", marginTop: "1rem" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "0.75rem" }}>
                      <i className="fa-solid fa-layer-group" style={{ color: "#38bdf8" }} />
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#fff" }}>Division Transition Settings (Optional)</span>
                    </div>
                    <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "0.8rem" }}>
                      <div className="admin-form-group" style={{ marginBottom: 0 }}>
                        <label>Division Tier</label>
                        <input
                          type="number"
                          className="admin-input"
                          min={1}
                          value={tourneyForm.divisionTier}
                          onChange={(e) => setTourneyForm(prev => ({ ...prev, divisionTier: e.target.value }))}
                          placeholder="e.g. 1, 2"
                        />
                      </div>
                      <div className="admin-form-group" style={{ marginBottom: 0 }}>
                        <label>Promotion Count</label>
                        <input
                          type="number"
                          className="admin-input"
                          min={0}
                          value={tourneyForm.promotionCount}
                          onChange={(e) => setTourneyForm(prev => ({ ...prev, promotionCount: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div className="admin-form-group" style={{ marginBottom: 0 }}>
                        <label>Relegation Count</label>
                        <input
                          type="number"
                          className="admin-input"
                          min={0}
                          value={tourneyForm.relegationCount}
                          onChange={(e) => setTourneyForm(prev => ({ ...prev, relegationCount: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sub-card">
                  <div className="sub-card-title"><i className="fa-solid fa-circle-info" /> Configuration Summary</div>
                  <div className="rule-card-pills">
                    <div className="rule-pill">
                      <span>Name:</span>
                      <span style={{ fontWeight: 600, color: tourneyForm.name ? "#fff" : "var(--text-secondary)" }}>
                        {tourneyForm.name || "Not set"}
                      </span>
                    </div>
                    <div className="rule-pill">
                      <span>Format:</span>
                      <span style={{ fontWeight: 600, color: "#a855f7" }}>{tourneyForm.formatType}</span>
                    </div>
                    <div className="rule-pill">
                      <span>Type:</span>
                      <span style={{ fontWeight: 600, color: "#38bdf8" }}>
                        {tournamentTypes.find(t => t.name === tourneyForm.tournamentType)?.display_name || tourneyForm.tournamentType}
                      </span>
                    </div>
                    {!(tourneyForm.tournamentType === 'rws' || tourneyForm.tournamentType === 'special') && (
                    <div className="rule-pill">
                      <span>Financial Template:</span>
                      <span style={{ fontWeight: 600, color: tourneyForm.financialRuleId ? "#10b981" : "var(--text-secondary)" }}>
                        {tourneyForm.financialRuleId 
                          ? financialRules.find(r => r.id.toString() === tourneyForm.financialRuleId)?.name || "Selected"
                          : "None"}
                      </span>
                    </div>
                    )}
                    <div className="rule-pill">
                      <span>Season:</span>
                      <span style={{ fontWeight: 600, color: "#eab308" }}>
                        {activeSeason ? `Season ${activeSeason.season_number}` : "Loading..."}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admin-btn-row">
                  <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                    {isPending ? (
                      <><i className="fa-solid fa-spinner fa-spin" /> Saving...</>
                    ) : tourneyForm.id ? (
                      <><i className="fa-solid fa-floppy-disk" /> Update Tournament Details</>
                    ) : (
                      <><i className="fa-solid fa-rocket" /> Create Tournament Stage</>
                    )}
                  </button>
                  {tourneyForm.id && (
                    <button type="button" className="portal-btn btn-secondary" onClick={clearForm} disabled={isPending}>
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
