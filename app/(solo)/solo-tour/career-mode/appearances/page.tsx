"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "./appearances.css";
import { 
  fetchRegisteredClubs, 
  fetchClubPlayers, 
  fetchAppearances, 
  saveAppearances,
  fetchActiveSeason
} from "@/utils/solo/serverActions";

interface Club {
  id: string;
  name: string;
  manager: string;
  image: string;
}

interface Player {
  id: string;
  name: string;
  position: string;
  value: number;
  star: string;
  imagePath: string;
  isSuspended?: boolean;
}

export default function AppearancesLedgerPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [appearances, setAppearances] = useState<Record<string, number[]>>({});
  const [season, setSeason] = useState<{ id: any; season_number: number }>({ id: 6, season_number: 9 });
  
  // Admin Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [activeMatchday, setActiveMatchday] = useState<number>(1);
  const [editSelections, setEditSelections] = useState<string[]>([]);
  const [isSaving, startSaving] = useTransition();

  // loading state
  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // List of Matchdays (1 to 10)
  const matchdays = useMemo(() => Array.from({ length: 10 }, (_, i) => i + 1), []);

  // Fetch initial data (clubs and active season)
  useEffect(() => {
    document.title = "Appearances Ledger - Career Mode";
    async function loadInitialData() {
      try {
        const [activeSeasonData, clubsData] = await Promise.all([
          fetchActiveSeason(),
          fetchRegisteredClubs()
        ]);
        
        if (activeSeasonData) {
          setSeason({
            id: activeSeasonData.id,
            season_number: activeSeasonData.season_number
          });
        }
        
        if (clubsData && clubsData.length > 0) {
          setClubs(clubsData);
          setSelectedClubId(clubsData[0].id);
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Fetch players and appearances for the selected club
  useEffect(() => {
    if (!selectedClubId || !season.id) return;
    
    async function loadClubData() {
      setLoadingPlayers(true);
      setIsEditing(false); // cancel edit when changing clubs
      try {
        const [playersData, appearancesData] = await Promise.all([
          fetchClubPlayers(selectedClubId),
          fetchAppearances(selectedClubId, season.id)
        ]);

        setPlayers(playersData);
        
        // Group appearances by player_id
        const appearanceMap: Record<string, number[]> = {};
        playersData.forEach((p: Player) => {
          appearanceMap[p.id] = [];
        });
        
        if (appearancesData) {
          appearancesData.forEach((row: any) => {
            const pid = row.player_id.toString();
            const md = parseInt(row.matchday, 10);
            if (!appearanceMap[pid]) {
              appearanceMap[pid] = [];
            }
            if (!appearanceMap[pid].includes(md)) {
              appearanceMap[pid].push(md);
            }
          });
        }
        
        setAppearances(appearanceMap);
      } catch (err) {
        console.error("Error loading club details:", err);
      } finally {
        setLoadingPlayers(false);
      }
    }
    loadClubData();
  }, [selectedClubId, season.id]);

  // Handle entering edit mode
  const enterEditMode = () => {
    // Populate selections with players who currently have appearance recorded for activeMatchday
    const selected: string[] = [];
    Object.entries(appearances).forEach(([pid, mds]) => {
      if (mds.includes(activeMatchday)) {
        selected.push(pid);
      }
    });
    setEditSelections(selected);
    setIsEditing(true);
  };

  // Handle matchday change during edit mode
  const handleMatchdayChange = (md: number) => {
    setActiveMatchday(md);
    // update selections based on that matchday
    const selected: string[] = [];
    Object.entries(appearances).forEach(([pid, mds]) => {
      if (mds.includes(md)) {
        selected.push(pid);
      }
    });
    setEditSelections(selected);
  };

  // Toggle player selection for the active matchday
  const togglePlayerSelection = (playerId: string) => {
    setEditSelections((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  // Save selected appearances to database
  const handleSave = () => {
    startSaving(async () => {
      try {
        await saveAppearances(selectedClubId, season.id, activeMatchday, editSelections);
        
        // Update local state directly
        setAppearances((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((pid) => {
            // Remove matchday if it exists
            next[pid] = next[pid].filter((m) => m !== activeMatchday);
            // Add matchday if selected
            if (editSelections.includes(pid)) {
              next[pid].push(activeMatchday);
            }
          });
          return next;
        });

        setIsEditing(false);
        showToast(`Saved appearances for Matchday ${activeMatchday}!`);
      } catch (err) {
        console.error(err);
        showToast("Error saving appearances.");
      }
    });
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const activeClub = useMemo(() => {
    return clubs.find(c => c.id === selectedClubId);
  }, [clubs, selectedClubId]);

  // Compute stats metrics
  const activeClubStats = useMemo(() => {
    if (players.length === 0) return { trackedMatchdays: 0, topPlayerName: "None", avgPlayersPerMatch: "0" };
    
    // Find how many unique matchdays have at least one appearance
    const uniqueMatchdays = new Set<number>();
    const matchdayPlayerCounts: Record<number, number> = {};
    
    Object.values(appearances).forEach((mds) => {
      mds.forEach(m => {
        uniqueMatchdays.add(m);
        matchdayPlayerCounts[m] = (matchdayPlayerCounts[m] || 0) + 1;
      });
    });

    // Find top player(s) with most appearances
    let maxApp = 0;
    let topPlayerName = "None";
    players.forEach(p => {
      const count = appearances[p.id]?.length || 0;
      if (count > maxApp) {
        maxApp = count;
        topPlayerName = `${p.name} (${count} matches)`;
      }
    });

    const totalTracked = uniqueMatchdays.size;
    let avgPlayersPerMatch = "0";
    if (totalTracked > 0) {
      const sumCounts = Object.values(matchdayPlayerCounts).reduce((a, b) => a + b, 0);
      avgPlayersPerMatch = (sumCounts / totalTracked).toFixed(1);
    }

    return {
      trackedMatchdays: totalTracked,
      topPlayerName,
      avgPlayersPerMatch
    };
  }, [players, appearances]);

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <div className="portal-glass-card" style={{ padding: "3rem", textAlign: "center" }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2.5rem", color: "#3b82f6", marginBottom: "1rem" }} />
            <h3>Loading Ledger System...</h3>
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

      <div className="portal-container">
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/career-mode" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Career Hub
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge">
            <i className="fa-solid fa-shirt" />
            Squad Appearances
          </div>
          <h1 className="portal-title">APPEARANCES LEDGER</h1>
          <p className="portal-subtitle">
            Monitor match-by-match squad usages, manage matchday lineups, and verify player contribution records for Season {season.season_number}.
          </p>
        </div>

        <div className="appearances-container">
          {/* Teams selector ribbon */}
          <div>
            <h3 className="section-heading" style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Select Team</h3>
            <div className="teams-selector-grid">
              {clubs.map((club) => (
                <div
                  key={club.id}
                  className={`team-select-card ${selectedClubId === club.id ? "active" : ""}`}
                  onClick={() => setSelectedClubId(club.id)}
                >
                  <img 
                    src={club.image || "/assets/images/placeholder.webp"} 
                    alt={club.name} 
                    className="team-select-logo" 
                    onError={(e) => { e.currentTarget.src = "/assets/imgassets/background_blank.png"; }}
                  />
                  <span className="team-select-name">{club.name}</span>
                </div>
              ))}
            </div>
          </div>

          {activeClub && (
            <>
              {/* Squad & Appearance Statistics Cards */}
              <div className="stats-cards-grid">
                <div className="stat-item-card">
                  <div className="stat-icon-wrapper">
                    <i className="fa-solid fa-users" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Squad Size</span>
                    <span className="stat-val">{players.length} Players</span>
                  </div>
                </div>
                <div className="stat-item-card">
                  <div className="stat-icon-wrapper">
                    <i className="fa-solid fa-calendar-check" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Matchdays Used</span>
                    <span className="stat-val">{activeClubStats.trackedMatchdays} / 10</span>
                  </div>
                </div>
                <div className="stat-item-card">
                  <div className="stat-icon-wrapper">
                    <i className="fa-solid fa-chart-line" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Avg. Squad Per Match</span>
                    <span className="stat-val">{activeClubStats.avgPlayersPerMatch}</span>
                  </div>
                </div>
                <div className="stat-item-card">
                  <div className="stat-icon-wrapper">
                    <i className="fa-solid fa-trophy" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Most Appearances</span>
                    <span className="stat-val" style={{ fontSize: "0.95rem", fontWeight: 700, marginTop: "0.25rem" }}>
                      {activeClubStats.topPlayerName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin Editor Control Section */}
              <div className="admin-actions-bar">
                <div className="matchday-picker">
                  <i className="fa-solid fa-user-gear" style={{ color: "#3b82f6", marginRight: "0.25rem" }} />
                  <span style={{ fontWeight: 700 }}>Admin controls:</span>
                  <select
                    className="matchday-select-input"
                    value={activeMatchday}
                    onChange={(e) => handleMatchdayChange(parseInt(e.target.value, 10))}
                    disabled={isSaving}
                  >
                    {matchdays.map((md) => (
                      <option key={md} value={md}>Matchday {md}</option>
                    ))}
                  </select>
                </div>

                {!isEditing ? (
                  <button 
                    onClick={enterEditMode} 
                    className="portal-btn btn-primary"
                    disabled={loadingPlayers}
                  >
                    <i className="fa-solid fa-pen-to-square" /> Edit Matchday {activeMatchday} Players
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button 
                      onClick={handleSave} 
                      className="portal-btn btn-success" 
                      disabled={isSaving}
                      style={{ background: "#10b981", borderColor: "#059669" }}
                    >
                      {isSaving ? (
                        <><i className="fa-solid fa-spinner fa-spin" /> Saving...</>
                      ) : (
                        <><i className="fa-solid fa-check" /> Save Selections</>
                      )}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)} 
                      className="portal-btn btn-secondary"
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Main Ledger Table */}
              <div className="table-panel">
                {loadingPlayers ? (
                  <div style={{ padding: "4rem", textAlign: "center" }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", color: "#3b82f6", marginBottom: "1rem" }} />
                    <p style={{ color: "#9ca3af" }}>Loading {activeClub.name} squad ledger...</p>
                  </div>
                ) : players.length === 0 ? (
                  <div style={{ padding: "4rem", textAlign: "center" }}>
                    <i className="fa-solid fa-user-slash" style={{ fontSize: "2.5rem", color: "#4b5563", marginBottom: "1rem" }} />
                    <h4>No active squad contract</h4>
                    <p style={{ color: "#9ca3af" }}>Ensure players are signed and assigned active contracts for {activeClub.name}.</p>
                  </div>
                ) : (
                  <table className="appearances-table">
                    <thead>
                      <tr>
                        <th>Player</th>
                        {matchdays.map((md) => (
                          <th key={md} style={{ textAlign: "center", width: "7%" }}>
                            {activeMatchday === md && isEditing ? (
                              <span style={{ color: "#3b82f6", borderBottom: "2px solid #3b82f6", paddingBottom: "0.25rem" }}>
                                M{md} *
                              </span>
                            ) : (
                              `M${md}`
                            )}
                          </th>
                        ))}
                        <th style={{ textAlign: "center", width: "10%" }}>Total Played</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player) => {
                        const playerApps = appearances[player.id] || [];
                        const isPlayedInActiveMd = playerApps.includes(activeMatchday);
                        const totalCount = playerApps.length;

                        return (
                          <tr key={player.id}>
                            <td>
                              <div className="player-cell-info">
                                <img
                                  src={player.imagePath}
                                  alt={player.name}
                                  className="player-cell-avatar"
                                  onError={(e) => { e.currentTarget.src = "/assets/images/players/default.webp"; }}
                                />
                                <div>
                                  <div className="player-cell-name">
                                    {player.name}
                                    {player.isSuspended && (
                                      <span style={{
                                        marginLeft: "0.5rem",
                                        background: "rgba(239, 68, 68, 0.2)",
                                        color: "#ef4444",
                                        border: "1px solid rgba(239, 68, 68, 0.4)",
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        fontSize: "0.65rem",
                                        fontWeight: "bold",
                                        textTransform: "uppercase"
                                      }}>
                                        Suspended
                                      </span>
                                    )}
                                  </div>
                                  <span className="player-cell-pos">{player.position}</span>
                                </div>
                              </div>
                            </td>

                            {matchdays.map((md) => {
                              const played = playerApps.includes(md);
                              
                              return (
                                <td key={md} style={{ verticalAlign: "middle" }}>
                                  {isEditing && activeMatchday === md ? (
                                    <div className="editor-checkbox-cell">
                                      <input
                                        type="checkbox"
                                        className="editor-custom-checkbox"
                                        checked={editSelections.includes(player.id)}
                                        onChange={() => togglePlayerSelection(player.id)}
                                        disabled={isSaving}
                                      />
                                    </div>
                                  ) : (
                                    <div className="md-cell-active">
                                      {played ? (
                                        <div className="md-indicator-pill">✓</div>
                                      ) : (
                                        <span className="md-indicator-none">-</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            <td style={{ verticalAlign: "middle" }}>
                              <div className="total-matches-count">
                                👕 {totalCount}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* Guidelines info panel */}
          <div className="glass-panel" style={{ marginTop: "1rem" }}>
            <h3 className="section-heading" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="fa-solid fa-circle-info" style={{ color: "#3b82f6" }} /> 
              Ledger Usage Instructions
            </h3>
            <p className="section-text" style={{ fontSize: "0.85rem", color: "#9ca3af", lineHeight: "1.6" }}>
              1. <strong>Select a club</strong> from the selector ribbon to load its players and historical appearances.<br />
              2. Review team-wise squad contribution per matchday (M1 to M10). Cells displaying <strong>✓</strong> indicate the player participated in that matchday.<br />
              3. As an admin, select the target <strong>Matchday</strong> and click <strong>Edit Matchday Players</strong>.<br />
              4. Toggle the checkboxes to specify which squad players participated in that matchday fixture, then click <strong>Save Selections</strong>.<br />
              5. All matchday entries directly persist to the Career Ledger system, syncing active season statistics.
            </p>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="alert-toast">
            <i className="fa-solid fa-circle-check" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
