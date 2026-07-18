"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchRegisteredClubs,
  createPlayer,
  updatePlayer,
  deletePlayer,
  fetchClubPlayers,
  fetchAdminPlayersList
} from "@/utils/solo/serverActions";

export default function PlayersManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [playerModalShow, setPlayerModalShow] = useState(false);

  const [playerForm, setPlayerForm] = useState({
    id: "",
    name: "",
    position: "FW",
    star: "3-star-standard",
    value: 80,
    imagePath: "",
    isSuspended: false
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const season = await fetchActiveSeason();
      setActiveSeason(season);
      const clubsData = await fetchRegisteredClubs();
      setClubs(clubsData || []);

      const allPlayers = await fetchAdminPlayersList();
      setPlayers(allPlayers || []);
    } catch {
      showToast("Error loading players data!");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPlayers = useMemo(() => {
    return players.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.clubName && p.clubName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [players, searchTerm]);

  const itemsPerPage = 15;
  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);

  const paginatedPlayers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPlayers.slice(start, start + itemsPerPage);
  }, [filteredPlayers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerForm.name) return showToast("Player name required!");
    startTransition(async () => {
      try {
        if (playerForm.id) {
          await updatePlayer(playerForm);
          showToast("Player card updated!");
        } else {
          await createPlayer(playerForm);
          showToast("Player created!");
        }
        setPlayerForm({ id: "", name: "", position: "FW", star: "3-star-standard", value: 80, imagePath: "", isSuspended: false });
        setPlayerModalShow(false);
        loadData();
      } catch {
        showToast("Error saving player!");
      }
    });
  };

  const handleEditPlayer = (p: any) => {
    setPlayerForm({
      id: p.id.toString(),
      name: p.name,
      position: p.position || 'FW',
      star: p.star || '3-star-standard',
      value: p.value || 80,
      imagePath: p.imagePath || '',
      isSuspended: p.isSuspended || false
    });
    setPlayerModalShow(true);
  };

  const handleOpenAddPlayerModal = () => {
    setPlayerForm({
      id: "",
      name: "",
      position: "FW",
      star: "3-star-standard",
      value: 80,
      imagePath: "",
      isSuspended: false
    });
    setPlayerModalShow(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Image size must be under 2MB!");
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setPlayerForm(prev => ({ ...prev, imagePath: uploadEvent.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeletePlayer = (id: number) => {
    if (!confirm("Delete player profile?")) return;
    startTransition(async () => {
      try {
        await deletePlayer(id);
        showToast("Player deleted!");
        loadData();
      } catch {
        showToast("Error deleting player!");
      }
    });
  };



  const getPositionColor = (pos: string) => {
    const colors: Record<string, string> = {
      GK: "#eab308", CB: "#3b82f6", LB: "#3b82f6", RB: "#3b82f6",
      CM: "#10b981", DM: "#14b8a6", AM: "#a855f7",
      RW: "#f97316", LW: "#f97316", ST: "#ef4444", FW: "#ef4444"
    };
    return colors[pos] || "#6b7280";
  };

  return (
    <div className="portal-root-wrapper" data-module="players">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      {playerModalShow && (
        <div className="fine-modal-backdrop" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="fine-modal-content" style={{
            background: "rgba(18, 18, 18, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "500px",
            width: "100%",
            position: "relative",
            overflow: "hidden"
          }}>
            {/* Ambient Background Glow */}
            <div style={{
              position: "absolute",
              top: "-50px",
              right: "-50px",
              width: "150px",
              height: "150px",
              background: "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)",
              zIndex: 0,
              pointerEvents: "none"
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(56, 189, 248, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--solo-primary)"
                }}>
                  <i className="fa-solid fa-user-gear" style={{ fontSize: "1.1rem" }} />
                </div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700", color: "#fff", letterSpacing: "-0.025em" }}>
                  {playerForm.id ? "Edit Player Profile" : "Register Player Card"}
                </h3>
              </div>

              <form onSubmit={handleSavePlayer}>
                {/* Photo Upload Card */}
                <div style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: "12px",
                  padding: "1rem",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem"
                }}>
                  <div style={{ position: "relative" }}>
                    <div style={{
                      width: "70px",
                      height: "70px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "2px solid rgba(56, 189, 248, 0.4)",
                      background: "rgba(0,0,0,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {playerForm.imagePath ? (
                        <img src={playerForm.imagePath} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png' }} />
                      ) : playerForm.id ? (
                        <img src={`/assets/images/players/${playerForm.id}.png`} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png' }} />
                      ) : (
                        <i className="fa-solid fa-user" style={{ fontSize: "1.8rem", color: "rgba(255,255,255,0.2)" }} />
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>Player Photo</span>
                    <label className="portal-btn btn-secondary" style={{
                      padding: "4px 10px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      margin: 0,
                      width: "fit-content"
                    }}>
                      <i className="fa-solid fa-camera" /> Choose Image
                      <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
                    </label>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>PNG or JPG (under 2MB)</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2rem" }}>
                  <div className="admin-form-group">
                    <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>Player Name</label>
                    <input
                      type="text"
                      className="admin-input"
                      style={{ width: "100%", background: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.08)" }}
                      value={playerForm.name}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Marcus Rashford"
                      required
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>Position</label>
                      <select
                        className="admin-select"
                        style={{ width: "100%", background: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.08)" }}
                        value={playerForm.position}
                        onChange={(e) => setPlayerForm(prev => ({ ...prev, position: e.target.value }))}
                      >
                        <option value="GK">GK</option>
                        <option value="CB">CB</option>
                        <option value="LB">LB</option>
                        <option value="RB">RB</option>
                        <option value="CM">CM</option>
                        <option value="DM">DM</option>
                        <option value="AM">AM</option>
                        <option value="RW">RW</option>
                        <option value="LW">LW</option>
                        <option value="ST">ST</option>
                      </select>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>Base Value</label>
                      <input
                        type="number"
                        className="admin-input"
                        style={{ width: "100%", background: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.08)" }}
                        value={playerForm.value}
                        onChange={(e) => setPlayerForm(prev => ({ ...prev, value: parseInt(e.target.value) || 80 }))}
                      />
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>Card Type (Star Tier)</label>
                    <select
                      className="admin-select"
                      style={{ width: "100%", background: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.08)" }}
                      value={playerForm.star}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, star: e.target.value }))}
                    >
                      <option value="three-star-standard">3★ Standard</option>
                      <option value="four-star-standard">4★ Standard</option>
                      <option value="five-star-standard">5★ Standard</option>
                      <option value="five-star-legend">5★ Legend</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "1.25rem" }}>
                  <button
                    type="button"
                    className="portal-btn btn-secondary"
                    style={{ padding: "8px 20px" }}
                    onClick={() => setPlayerModalShow(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="portal-btn btn-primary"
                    style={{ padding: "8px 25px" }}
                    disabled={isPending}
                  >
                    {isPending ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</> : (playerForm.id ? <><i className="fa-solid fa-check" /> Update Profile</> : <><i className="fa-solid fa-plus" /> Create Profile</>)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="portal-container">
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        <div className="portal-header">
          <div className="portal-page-badge"><i className="fa-solid fa-people-group" /> Players & Contracts</div>
          <h1 className="portal-title">PLAYERS & CONTRACTS</h1>
          <p className="portal-subtitle">Configure player card profiles, search and filter the registry, and upload player photos.</p>
        </div>

        {/* Summary Stats Row */}
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="stat-label">Total Players</div>
            <div className="stat-value">{players.length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Available</div>
            <div className="stat-value">{players.filter(p => !p.isSuspended).length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Suspended</div>
            <div className="stat-value">{players.filter(p => p.isSuspended).length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Clubs</div>
            <div className="stat-value">{clubs.length}</div>
          </div>
        </div>



        {/* Player Registry Table */}
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 className="admin-card-title" style={{ marginBottom: 0 }}>
              <i className="fa-solid fa-table-list" />
              Player Registry
            </h2>
            <button
              type="button"
              className="portal-btn btn-primary"
              style={{ padding: "6px 15px", fontSize: "0.8rem" }}
              onClick={handleOpenAddPlayerModal}
            >
              <i className="fa-solid fa-user-plus" /> Register Player
            </button>
          </div>

          {/* Search bar inside the registry card */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div className="admin-form-group" style={{ flex: 1, minWidth: "250px", marginBottom: 0 }}>
              <input
                type="text"
                className="admin-input"
                placeholder="Search players by name, position, or club..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Showing {filteredPlayers.length} of {players.length} players
            </div>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="admin-empty">
              <i className="fa-solid fa-users-slash" />
              {players.length === 0 ? "No players registered yet. Use the form above to add player cards." : "No players match your search criteria."}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="admin-list-table">
                  <thead>
                    <tr>
                      <th>Player Card</th>
                      <th>Position</th>
                      <th>Card Tier</th>
                      <th>Assigned Club</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPlayers.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              overflow: "hidden",
                              border: "1px solid rgba(255,255,255,0.1)",
                              background: "rgba(255,255,255,0.05)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}>
                              {p.imagePath ? (
                                <img src={p.imagePath} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png' }} />
                              ) : (
                                <img src={`/assets/images/players/${p.id}.png`} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png' }} />
                              )}
                            </div>
                            <strong style={{ color: "#fff" }}>{p.name}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="badge-info" style={{ 
                            background: `${getPositionColor(p.position)}18`, 
                            color: getPositionColor(p.position), 
                            borderColor: `${getPositionColor(p.position)}40` 
                          }}>
                            {p.position}
                          </span>
                        </td>
                        <td style={{ textTransform: "capitalize" }}>{p.star.replace(/-/g, " ")}</td>
                        <td>{p.clubName || <em style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>Free Agent</em>}</td>
                        <td style={{ textAlign: "right" }}>
                          <button className="portal-btn btn-secondary" style={{ marginRight: "0.25rem", padding: "3px 10px", fontSize: "0.75rem" }} onClick={() => handleEditPlayer(p)}>
                            <i className="fa-solid fa-pen" /> Edit
                          </button>
                          <button className="portal-btn btn-danger" style={{ padding: "3px 10px", fontSize: "0.75rem" }} onClick={() => handleDeletePlayer(p.id)}>
                            <i className="fa-solid fa-trash" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "1.5rem" }}>
                  <button
                    type="button"
                    className="portal-btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    <i className="fa-solid fa-angle-left" /> Previous
                  </button>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Page <strong>{currentPage}</strong> of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="portal-btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    Next <i className="fa-solid fa-angle-right" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
