"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchRegisteredClubs,
  createPlayer,
  updatePlayer,
  deletePlayer,
  createPlayerContract,
  applyFine,
  fetchClubPlayers
} from "@/utils/solo/serverActions";

export default function PlayersManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [playerForm, setPlayerForm] = useState({
    id: "",
    name: "",
    position: "FW",
    star: "3-star-standard",
    value: 80,
    imagePath: "",
    isSuspended: false
  });

  const [contractForm, setContractForm] = useState({
    playerId: "",
    clubId: "",
    signedValue: 80,
    salary: 20,
    startSeason: "Season 9",
    expireSeason: "Season 10"
  });

  const [fineModal, setFineModal] = useState({
    show: false,
    targetId: "",
    targetName: "",
    rc: 0,
    rt: 0,
    voucher: 0,
    playerObj: null as any
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

      const allPlayers: any[] = [];
      for (const club of (clubsData || [])) {
        const cPlayers = await fetchClubPlayers(club.id);
        allPlayers.push(...cPlayers.map(p => ({ ...p, clubName: club.name, clubId: club.id })));
      }
      setPlayers(allPlayers);
    } catch {
      showToast("Error loading players data!");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const togglePlayerSuspension = (p: any) => {
    const nextSuspendedStatus = !p.isSuspended;
    if (nextSuspendedStatus) {
      setFineModal({
        show: true,
        targetId: p.id.toString(),
        targetName: p.name,
        rc: 0,
        rt: 0,
        voucher: 0,
        playerObj: p
      });
    } else {
      // Unsuspend directly
      startTransition(async () => {
        try {
          await updatePlayer({
            id: p.id,
            name: p.name,
            position: p.position,
            star: p.star,
            value: p.value,
            imagePath: p.imagePath,
            isSuspended: false
          });
          showToast(`Player ${p.name} unsuspended!`);
          loadData();
        } catch {
          showToast("Error toggling suspension!");
        }
      });
    }
  };

  const executeSuspensionWithFine = () => {
    startTransition(async () => {
      try {
        if (fineModal.rc > 0 || fineModal.rt > 0 || fineModal.voucher > 0) {
          // Fine the manager (clubId is managerId in this system)
          const managerId = fineModal.playerObj.clubId;
          if (managerId) {
            await applyFine(managerId, activeSeason?.id || 6, fineModal.rc, fineModal.rt, fineModal.voucher);
          }
        }
        
        await updatePlayer({
          id: fineModal.targetId,
          name: fineModal.playerObj.name,
          position: fineModal.playerObj.position,
          star: fineModal.playerObj.star,
          value: fineModal.playerObj.value,
          imagePath: fineModal.playerObj.imagePath,
          isSuspended: true
        });

        showToast(`Player ${fineModal.targetName} suspended & fine charged!`);
        setFineModal({ show: false, targetId: "", targetName: "", rc: 0, rt: 0, voucher: 0, playerObj: null });
        loadData();
      } catch {
        showToast("Error executing suspension!");
      }
    });
  };

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.playerId || !contractForm.clubId) return showToast("Select Player and Club!");
    startTransition(async () => {
      try {
        await createPlayerContract(contractForm);
        showToast("Contract signed successfully!");
        setContractForm({ playerId: "", clubId: "", signedValue: 80, salary: 20, startSeason: "Season 9", expireSeason: "Season 10" });
        loadData();
      } catch {
        showToast("Error signing contract!");
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

      {fineModal.show && (
        <div className="fine-modal-backdrop">
          <div className="fine-modal-content">
            <h3><i className="fa-solid fa-triangle-exclamation" /> Suspend & Fine Player</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Suspending <strong>{fineModal.targetName}</strong>. Optionally charge a fine to the club&apos;s wallet:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div className="admin-form-group">
                <label><i className="fa-solid fa-coins" style={{ color: "#fbbf24", marginRight: "4px" }} /> Fines (Coins - RC)</label>
                <input type="number" className="admin-input" value={fineModal.rc} onChange={(e) => setFineModal(prev => ({ ...prev, rc: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="admin-form-group">
                <label><i className="fa-solid fa-star" style={{ color: "#38bdf8", marginRight: "4px" }} /> Fines (Tokens - RT)</label>
                <input type="number" className="admin-input" value={fineModal.rt} onChange={(e) => setFineModal(prev => ({ ...prev, rt: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="admin-form-group">
                <label><i className="fa-solid fa-ticket" style={{ color: "#ec4899", marginRight: "4px" }} /> Fines (Vouchers)</label>
                <input type="number" className="admin-input" value={fineModal.voucher} onChange={(e) => setFineModal(prev => ({ ...prev, voucher: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="portal-btn btn-secondary" onClick={() => setFineModal({ show: false, targetId: "", targetName: "", rc: 0, rt: 0, voucher: 0, playerObj: null })}>Cancel</button>
              <button className="portal-btn btn-danger" onClick={executeSuspensionWithFine} disabled={isPending}>
                {isPending ? <><i className="fa-solid fa-spinner fa-spin" /> Processing...</> : <><i className="fa-solid fa-gavel" /> Confirm & Suspend</>}
              </button>
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
          <p className="portal-subtitle">Configure player card profiles, sign active contract terms, and toggle player suspensions.</p>
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

        {/* Player Registration Card */}
        <div className="admin-card">
          <h2 className="admin-card-title">
            <i className="fa-solid fa-user-plus" />
            {playerForm.id ? "Edit Player Profile" : "Register Player Card"}
          </h2>

          <form onSubmit={handleSavePlayer}>
            <div className="sub-card">
              <div className="sub-card-title"><i className="fa-solid fa-id-badge" /> Player Details</div>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Player Name</label>
                  <input type="text" className="admin-input" value={playerForm.name} onChange={(e) => setPlayerForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Marcus Rashford" />
                </div>
                <div className="admin-form-group">
                  <label>Position</label>
                  <select className="admin-select" value={playerForm.position} onChange={(e) => setPlayerForm(prev => ({ ...prev, position: e.target.value }))}>
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
                  <label>Card Type (Star Tier)</label>
                  <select className="admin-select" value={playerForm.star} onChange={(e) => setPlayerForm(prev => ({ ...prev, star: e.target.value }))}>
                    <option value="three-star-standard">3★ Standard</option>
                    <option value="four-star-standard">4★ Standard</option>
                    <option value="five-star-standard">5★ Standard</option>
                    <option value="five-star-legend">5★ Legend</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Base Value</label>
                  <input type="number" className="admin-input" value={playerForm.value} onChange={(e) => setPlayerForm(prev => ({ ...prev, value: parseInt(e.target.value) || 80 }))} />
                </div>
              </div>
            </div>

            <div className="admin-btn-row">
              <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                {isPending ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</> : (playerForm.id ? <><i className="fa-solid fa-check" /> Update Player Card</> : <><i className="fa-solid fa-plus" /> Add Player Card</>)}
              </button>
              {playerForm.id && (
                <button type="button" className="portal-btn btn-secondary" onClick={() => setPlayerForm({ id: "", name: "", position: "FW", star: "3-star-standard", value: 80, imagePath: "", isSuspended: false })}>
                  <i className="fa-solid fa-xmark" /> Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Contract Signing Card */}
        <div className="admin-card">
          <h2 className="admin-card-title">
            <i className="fa-solid fa-file-contract" />
            Sign Player Contract
          </h2>

          <form onSubmit={handleSaveContract}>
            <div className="sub-card">
              <div className="sub-card-title"><i className="fa-solid fa-handshake" /> Contract Terms</div>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Select Player</label>
                  <select className="admin-select" value={contractForm.playerId} onChange={(e) => setContractForm(prev => ({ ...prev, playerId: e.target.value }))}>
                    <option value="">-- Select Player --</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Select Club</label>
                  <select className="admin-select" value={contractForm.clubId} onChange={(e) => setContractForm(prev => ({ ...prev, clubId: e.target.value }))}>
                    <option value="">-- Select Club --</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Signed Value</label>
                  <input type="number" className="admin-input" value={contractForm.signedValue} onChange={(e) => setContractForm(prev => ({ ...prev, signedValue: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="admin-form-group">
                  <label>Salary (Per Appearance)</label>
                  <input type="number" className="admin-input" value={contractForm.salary} onChange={(e) => setContractForm(prev => ({ ...prev, salary: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
            </div>

            <div className="admin-btn-row">
              <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                {isPending ? <><i className="fa-solid fa-spinner fa-spin" /> Processing...</> : <><i className="fa-solid fa-file-signature" /> Sign Contract</>}
              </button>
            </div>
          </form>
        </div>

        {/* Player Registry Table */}
        <div className="admin-card">
          <h2 className="admin-card-title">
            <i className="fa-solid fa-table-list" />
            Player Registry
          </h2>

          {players.length === 0 ? (
            <div className="admin-empty">
              <i className="fa-solid fa-users-slash" />
              No players registered yet. Use the form above to add player cards.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-list-table">
                <thead>
                  <tr>
                    <th>Player Card</th>
                    <th>Position</th>
                    <th>Card Tier</th>
                    <th>Assigned Club</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>
                        <span className="badge-info" style={{ 
                          background: `${getPositionColor(p.position)}18`, 
                          color: getPositionColor(p.position), 
                          borderColor: `${getPositionColor(p.position)}40` 
                        }}>
                          {p.position}
                        </span>
                      </td>
                      <td>{p.star.replace("-", " ")}</td>
                      <td>{p.clubName || <em style={{ color: "rgba(255,255,255,0.3)" }}>Free Agent</em>}</td>
                      <td>
                        {p.isSuspended ? <span className="badge-suspended">SUSPENDED</span> : <span className="badge-active">AVAILABLE</span>}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="portal-btn btn-secondary" style={{ marginRight: "0.25rem", padding: "3px 10px", fontSize: "0.75rem" }} onClick={() => handleEditPlayer(p)}>
                          <i className="fa-solid fa-pen" /> Edit
                        </button>
                        <button 
                          className={`portal-btn ${p.isSuspended ? 'btn-primary' : 'btn-danger'}`}
                          style={{ marginRight: "0.25rem", padding: "3px 10px", fontSize: "0.75rem" }} 
                          onClick={() => togglePlayerSuspension(p)}
                        >
                          <i className={`fa-solid ${p.isSuspended ? 'fa-lock-open' : 'fa-ban'}`} /> {p.isSuspended ? 'Lift' : 'Suspend'}
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
          )}
        </div>
      </div>
    </div>
  );
}
