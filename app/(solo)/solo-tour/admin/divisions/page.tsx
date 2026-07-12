"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchDivisionStandings,
  saveDivisionTransition,
  fetchRegisteredClubs
} from "@/utils/solo/serverActions";

export default function DivisionsManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [divisionsData, setDivisionsData] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Proposed next season assignments state: Record<clubId, divisionTier>
  const [proposedAssignments, setProposedAssignments] = useState<Record<number, number>>({});

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const season = await fetchActiveSeason();
      setActiveSeason(season);

      if (season) {
        const [divStandings, clubsList] = await Promise.all([
          fetchDivisionStandings(season.id),
          fetchRegisteredClubs()
        ]);
        setDivisionsData(divStandings || []);
        setClubs(clubsList || []);

        // Load existing transition plan if saved
        const transition = season.division_transition;
        const initialMap: Record<number, number> = {};

        if (transition && Array.isArray(transition)) {
          transition.forEach((item: any) => {
            initialMap[item.clubId] = item.divisionTier;
          });
          setProposedAssignments(initialMap);
        } else {
          // Generate auto proposed plan based on current standings
          calculateAutoProposal(divStandings);
        }
      }
    } catch (e: any) {
      console.error(e);
      showToast("❌ Error loading division data: " + e.message);
    }
  };

  const calculateAutoProposal = (divs: any[]) => {
    const newMap: Record<number, number> = {};
    if (divs.length === 0) return;

    // First assign all teams to their current divisions as fallback
    divs.forEach(d => {
      d.standings.forEach((team: any) => {
        newMap[team.club_id] = d.division_tier;
      });
    });

    // Process promotion and relegations
    // divs is sorted by tier ASC (e.g. Div 1, Div 2, Div 3)
    divs.forEach((d, index) => {
      const tier = d.division_tier;
      const promoCount = d.promotion_count || 0;
      const relegCount = d.relegation_count || 0;
      const standings = d.standings;

      // Relegate bottom N from this division (if a lower division exists)
      if (relegCount > 0 && index < divs.length - 1) {
        const lowerTier = divs[index + 1].division_tier;
        const startIdx = Math.max(0, standings.length - relegCount);
        for (let i = startIdx; i < standings.length; i++) {
          newMap[standings[i].club_id] = lowerTier;
        }
      }

      // Promote top N from this division (if an upper division exists)
      if (promoCount > 0 && index > 0) {
        const upperTier = divs[index - 1].division_tier;
        const count = Math.min(promoCount, standings.length);
        for (let i = 0; i < count; i++) {
          newMap[standings[i].club_id] = upperTier;
        }
      }
    });

    setProposedAssignments(newMap);
  };

  useEffect(() => {
    loadData();
    document.title = "Admin - Divisions & Season Transition Setup";
  }, []);

  const handleManualAssignmentChange = (clubId: number, tier: number) => {
    setProposedAssignments(prev => ({
      ...prev,
      [clubId]: tier
    }));
  };

  const handleSaveTransitionPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeason) return showToast("⚠️ No active season!");

    // Convert map to array format
    const transitionArr = Object.entries(proposedAssignments).map(([clubIdStr, tier]) => ({
      clubId: parseInt(clubIdStr, 10),
      divisionTier: tier
    }));

    startTransition(async () => {
      try {
        await saveDivisionTransition(activeSeason.id, transitionArr);
        showToast("✅ Season transition plan saved successfully!");
        loadData();
      } catch (err: any) {
        showToast("❌ Error saving transition plan: " + err.message);
      }
    });
  };

  return (
    <div className="portal-root-wrapper" data-module="divisions">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup">{toast}</div>}

      <div className="portal-container" style={{ maxWidth: "1240px" }}>
        
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge"><i className="fa-solid fa-layer-group" /> Division Setup</div>
          <h1 className="portal-title">DIVISIONS & SEASON TRANSITIONS</h1>
          <p className="portal-subtitle">
            Configure promotion and relegation counts for each division tier, review standings outcome, and customize team placements for the next season.
          </p>
        </div>

        {divisionsData.length === 0 ? (
          <div className="admin-card" style={{ padding: "4rem", textAlign: "center" }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: "3rem", color: "var(--text-secondary)", marginBottom: "1rem", display: "block" }} />
            <h3>No Division Tournaments Configured</h3>
            <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 1.5rem" }}>
              To use the division system, ensure you set a non-null "Division Tier" value (e.g. 1 for Division 1, 2 for Division 2) in your tournament stage settings.
            </p>
            <Link href="/solo-tour/admin/tournaments" className="portal-btn btn-primary">
              Go to Tournaments Setup
            </Link>
          </div>
        ) : (
          <div className="financial-layout" style={{ display: "grid", gridTemplateColumns: "1fr 450px", gap: "1.5rem", alignItems: "start" }}>
            
            {/* Left side: Current Standings for Divisions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {divisionsData.map((d: any) => (
                <div className="admin-card" key={d.id} style={{ marginTop: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h2 className="admin-card-title" style={{ margin: 0 }}>
                      <i className="fa-solid fa-trophy" style={{ color: "#fbbf24" }} /> {d.name} (Tier {d.division_tier})
                    </h2>
                    <div style={{ display: "flex", gap: "12px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <span>Promote: <strong style={{ color: "#10b981" }}>{d.promotion_count}</strong></span>
                      <span>Relegate: <strong style={{ color: "#ef4444" }}>{d.relegation_count}</strong></span>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="admin-list-table">
                      <thead>
                        <tr>
                          <th style={{ width: "60px" }}>Pos</th>
                          <th>Club / Manager</th>
                          <th style={{ textAlign: "center" }}>Pld</th>
                          <th style={{ textAlign: "center" }}>GD</th>
                          <th style={{ textAlign: "center" }}>Pts</th>
                          <th style={{ width: "160px", textAlign: "right" }}>Fate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.standings.map((team: any, index: number) => {
                          const isPromoting = index < d.promotion_count && d.division_tier > 1;
                          const isRelegating = index >= d.standings.length - d.relegation_count && d.relegation_count > 0;
                          let fateText = "Stay";
                          let fateColor = "rgba(255,255,255,0.2)";
                          
                          if (isPromoting) {
                            fateText = "Promote Up";
                            fateColor = "#10b981";
                          } else if (isRelegating) {
                            fateText = "Relegate Down";
                            fateColor = "#ef4444";
                          }

                          return (
                            <tr key={team.club_id}>
                              <td style={{ fontWeight: "bold" }}>{index + 1}</td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  {team.logo_path && <img src={team.logo_path} style={{ width: "20px", height: "20px", objectFit: "contain" }} alt="" />}
                                  <span>{team.name}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: "center" }}>{team.matches_played}</td>
                              <td style={{ textAlign: "center", color: team.goal_difference > 0 ? "#10b981" : team.goal_difference < 0 ? "#ef4444" : "inherit" }}>
                                {team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}
                              </td>
                              <td style={{ textAlign: "center", fontWeight: "bold" }}>{team.points}</td>
                              <td style={{ textAlign: "right" }}>
                                <span style={{
                                  fontSize: "0.75rem",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontWeight: "bold",
                                  border: `1px solid ${fateColor}`,
                                  color: fateColor,
                                  background: isPromoting ? "rgba(16, 185, 129, 0.05)" : isRelegating ? "rgba(239, 68, 68, 0.05)" : "transparent"
                                }}>
                                  {fateText}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {/* Right side: Placements Preview & Manual Adjustment form */}
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h3 className="sub-card-title"><i className="fa-solid fa-map-location-dot" /> Next Season Planner</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
                Preview where each team will land in the next season. You can manually adjust tiers to override placements before generating the next season.
              </p>

              <form onSubmit={handleSaveTransitionPlan}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "400px", overflowY: "auto", paddingRight: "4px", marginBottom: "1.25rem" }}>
                  {clubs.map((c: any) => {
                    const currentTier = proposedAssignments[c.id] || 1;
                    return (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {c.logo_path && <img src={c.logo_path} style={{ width: "20px", height: "20px", objectFit: "contain" }} alt="" />}
                          <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#fff" }}>{c.name}</span>
                        </div>
                        
                        <select
                          className="admin-select"
                          style={{ width: "160px", padding: "4px 8px", fontSize: "0.8rem", margin: 0 }}
                          value={currentTier}
                          onChange={(e) => handleManualAssignmentChange(c.id, parseInt(e.target.value, 10))}
                        >
                          {divisionsData.map(d => (
                            <option key={d.division_tier} value={d.division_tier}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="submit"
                    className="portal-btn btn-primary"
                    style={{ flex: 1, height: "42px", justifyContent: "center" }}
                    disabled={isPending}
                  >
                    {isPending ? "Saving configuration..." : "Confirm placements"}
                  </button>
                  <button
                    type="button"
                    className="portal-btn btn-secondary"
                    onClick={() => calculateAutoProposal(divisionsData)}
                    style={{ padding: "0 12px" }}
                  >
                    Reset Auto
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
