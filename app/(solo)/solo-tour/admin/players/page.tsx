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
  createPlayerContract,
  applyFine,
  fetchClubPlayers,
  fetchFreeAgents,
  fetchActivePlayerContract,
  releasePlayerContract,
  fetchAdminPlayersList
} from "@/utils/solo/serverActions";

export default function PlayersManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [freeAgents, setFreeAgents] = useState<any[]>([]);
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

  const [releaseModal, setReleaseModal] = useState({
    show: false,
    playerId: "",
    playerName: "",
    clubId: "",
    clubName: "",
    timing: "start" as "start" | "mid",
    refundPercentage: 75,
    contractInfo: null as any,
    loadingContract: false
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

      const agents = await fetchFreeAgents();
      setFreeAgents(agents || []);
    } catch {
      showToast("Error loading players data!");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenReleaseModal = (p: any) => {
    setReleaseModal({
      show: true,
      playerId: p.id.toString(),
      playerName: p.name,
      clubId: p.clubId.toString(),
      clubName: p.clubName,
      timing: "start",
      refundPercentage: 75,
      contractInfo: null,
      loadingContract: true
    });

    startTransition(async () => {
      try {
        const contract = await fetchActivePlayerContract(p.id, activeSeason?.id || 6);
        setReleaseModal(prev => ({
          ...prev,
          contractInfo: contract,
          loadingContract: false
        }));
      } catch {
        showToast("Error loading contract details!");
        setReleaseModal(prev => ({ ...prev, loadingContract: false }));
      }
    });
  };

  const handleConfirmRelease = () => {
    if (!releaseModal.playerId || !activeSeason) return;
    startTransition(async () => {
      try {
        const res = await releasePlayerContract(
          parseInt(releaseModal.playerId),
          activeSeason.id,
          releaseModal.timing,
          releaseModal.refundPercentage
        );
        if (res.success) {
          showToast(`Released ${res.playerName}!`);
          setReleaseModal({
            show: false,
            playerId: "",
            playerName: "",
            clubId: "",
            clubName: "",
            timing: "start",
            refundPercentage: 75,
            contractInfo: null,
            loadingContract: false
          });
          loadData();
        }
      } catch {
        showToast("Error releasing player!");
      }
    });
  };

  const releasePreview = useMemo(() => {
    if (!releaseModal.show || !releaseModal.contractInfo || !activeSeason) return null;

    const contract = releaseModal.contractInfo;
    const signedValue = Number(contract.signed_value) || 0;
    const currentSeasonNum = Number(activeSeason.season_number) || 9;

    const parseSeason = (s: string) => {
      const cleaned = s.replace(/[^\d.]/g, '');
      return parseFloat(cleaned) || 0.0;
    };

    const startSeasonNum = parseSeason(contract.start_season || '');
    const expireSeasonNum = parseSeason(contract.expire_season || '');
    const releaseSeasonNum = currentSeasonNum + (releaseModal.timing === 'mid' ? 0.5 : 0);

    const totalDuration = expireSeasonNum - startSeasonNum;
    const remainingDuration = expireSeasonNum - releaseSeasonNum;
    const elapsedDuration = releaseSeasonNum - startSeasonNum;

    const remainingRatio = totalDuration > 0 
      ? Math.max(0, Math.min(1, remainingDuration / totalDuration))
      : 1.0;

    const remainingValue = signedValue * remainingRatio;
    const refundAmount = Math.round(remainingValue * (releaseModal.refundPercentage / 100));

    return {
      startSeasonNum,
      expireSeasonNum,
      releaseSeasonNum,
      totalDuration,
      elapsedDuration,
      remainingDuration,
      remainingValue,
      refundAmount
    };
  }, [releaseModal.show, releaseModal.contractInfo, releaseModal.timing, releaseModal.refundPercentage, activeSeason]);

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

      {releaseModal.show && (
        <div className="fine-modal-backdrop">
          <div className="fine-modal-content" style={{ maxWidth: "550px" }}>
            <h3><i className="fa-solid fa-file-contract" style={{ color: "#fbbf24", marginRight: "6px" }} /> Release Player Contract</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Releasing <strong>{releaseModal.playerName}</strong> from <strong>{releaseModal.clubName}</strong>.
            </p>

            {releaseModal.loadingContract ? (
              <div style={{ textAlign: "center", padding: "1.5rem" }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "1.5rem", color: "var(--solo-primary)" }} />
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>Loading contract details...</p>
              </div>
            ) : !releaseModal.contractInfo ? (
              <div style={{ textAlign: "center", padding: "1rem", color: "var(--text-secondary)" }}>
                No active contract record found to calculate duration refund.
                <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button className="portal-btn btn-secondary" onClick={() => setReleaseModal(prev => ({ ...prev, show: false }))}>Cancel</button>
                  <button className="portal-btn btn-danger" onClick={handleConfirmRelease}>Confirm Release Anyway</button>
                </div>
              </div>
            ) : (
              <>
                {/* Release Timing Option */}
                <div className="admin-form-group" style={{ marginBottom: "1rem" }}>
                  <label>Release Timing</label>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "4px" }}>
                    <button
                      type="button"
                      className={`portal-btn ${releaseModal.timing === 'start' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: "8px" }}
                      onClick={() => setReleaseModal(prev => ({ ...prev, timing: 'start' }))}
                    >
                      Season Start (Season {activeSeason?.season_number})
                    </button>
                    <button
                      type="button"
                      className={`portal-btn ${releaseModal.timing === 'mid' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: "8px" }}
                      onClick={() => setReleaseModal(prev => ({ ...prev, timing: 'mid' }))}
                    >
                      Mid-Season (Season {activeSeason?.season_number}.5)
                    </button>
                  </div>
                </div>

                {/* Refund percentage slider */}
                <div className="admin-form-group" style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Refund Percentage</span>
                    <strong style={{ color: "var(--solo-primary)" }}>{releaseModal.refundPercentage}%</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    style={{ width: "100%", accentColor: "var(--solo-primary)", marginTop: "4px" }}
                    value={releaseModal.refundPercentage}
                    onChange={(e) => setReleaseModal(prev => ({ ...prev, refundPercentage: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                {/* Calculation preview */}
                {releasePreview && (
                  <div style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    marginBottom: "1.5rem",
                    fontSize: "0.8rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Contract Duration:</span>
                      <span>Season {releasePreview.startSeasonNum} to {releasePreview.expireSeasonNum} ({releasePreview.totalDuration} Season{releasePreview.totalDuration > 1 ? 's' : ''})</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Release Season:</span>
                      <span>Season {releasePreview.releaseSeasonNum} ({releasePreview.elapsedDuration} Season{releasePreview.elapsedDuration !== 1 ? 's' : ''} Elapsed)</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Remaining Contract:</span>
                      <span>{releasePreview.remainingDuration} Season{releasePreview.remainingDuration !== 1 ? 's' : ''} ({Math.round(releasePreview.remainingDuration / releasePreview.totalDuration * 100)}%)</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Original Value:</span>
                      <span>{releaseModal.contractInfo.signed_value} Coins</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed rgba(255, 255, 255, 0.1)", paddingTop: "0.4rem", marginTop: "0.2rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Remaining Contract Value:</span>
                      <span>{Math.round(releasePreview.remainingValue)} Coins</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: "bold" }}>
                      <span style={{ color: "#fbbf24" }}>Calculated Refund Amount:</span>
                      <span style={{ color: "#fbbf24" }}>{releasePreview.refundAmount} Coins <span style={{ fontSize: "0.7rem", fontWeight: "normal", color: "var(--text-secondary)" }}>(disabled)</span></span>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button className="portal-btn btn-secondary" onClick={() => setReleaseModal(prev => ({ ...prev, show: false }))}>Cancel</button>
                  <button className="portal-btn btn-danger" onClick={handleConfirmRelease} disabled={isPending}>
                    {isPending ? <><i className="fa-solid fa-spinner fa-spin" /> Processing...</> : <><i className="fa-solid fa-file-contract" /> Terminate Contract</>}
                  </button>
                </div>
              </>
            )}
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
                    <optgroup label="Free Agents (No Contract)">
                      {players.filter(p => !p.clubId).map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Active Players (Will overwrite existing contract)">
                      {players.filter(p => p.clubId).map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.position} - {p.clubName || 'Unknown Club'})</option>
                      ))}
                    </optgroup>
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
                        {p.clubId && (
                          <button 
                            className="portal-btn"
                            style={{ marginRight: "0.25rem", padding: "3px 10px", fontSize: "0.75rem", background: "#f59e0b", borderColor: "#d97706", color: "#fff" }} 
                            onClick={() => handleOpenReleaseModal(p)}
                          >
                            <i className="fa-solid fa-file-contract" /> Release
                          </button>
                        )}
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
