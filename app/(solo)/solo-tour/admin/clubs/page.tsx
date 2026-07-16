"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchManagers,
  createClubAndManager,
  updateManagerDetails,
  deleteClubAndManager,
  applyFine,
  fetchRegisteredClubs
} from "@/utils/solo/serverActions";

export default function ClubsManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [managers, setManagers] = useState<any[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [clubForm, setClubForm] = useState({
    id: "",
    clubId: "",
    clubName: "",
    logoPath: "",
    managerName: "",
    avatarPath: "",
    coinBalance: 1500,
    tokenBalance: 100,
    voucherBalance: 0,
    rating: 80,
    starRating: 3,
    wins: 0, draws: 0, losses: 0, matchesPlayed: 0,
    goalsFor: 0, goalsAgainst: 0, cleanSheets: 0,
    isBanned: false,
    isActive: true
  });

  const [fineModal, setFineModal] = useState({
    show: false,
    targetId: "",
    targetName: "",
    rc: 0,
    rt: 0,
    voucher: 0
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const season = await fetchActiveSeason();
      setActiveSeason(season);
      
      const [mgrs, registeredClubs] = await Promise.all([
        fetchManagers(),
        fetchRegisteredClubs()
      ]);
      
      if (mgrs && !mgrs.error) {
        setManagers(mgrs);
      }
      setAllClubs(registeredClubs || []);
    } catch {
      showToast("Error loading managers!");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearForm = () => {
    setClubForm({
      id: "", clubId: "", clubName: "", logoPath: "", managerName: "", avatarPath: "",
      coinBalance: 1500, tokenBalance: 100, voucherBalance: 0, rating: 80, starRating: 3,
      wins: 0, draws: 0, losses: 0, matchesPlayed: 0, goalsFor: 0, goalsAgainst: 0, cleanSheets: 0,
      isBanned: false,
      isActive: true
    });
  };

  const handleSaveClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubForm.clubName || !clubForm.managerName) return showToast("Club & Manager names required!");
    startTransition(async () => {
      try {
        if (clubForm.id) {
          await updateManagerDetails(clubForm);
          showToast("Club & Manager details updated!");
        } else {
          await createClubAndManager(clubForm);
          showToast("Club & Manager registered successfully!");
        }
        clearForm();
        loadData();
      } catch {
        showToast("Error saving club/manager!");
      }
    });
  };

  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'avatar') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(field);
    try {
      const { uploadImage } = await import("@/lib/imagekit/upload");
      const res = await uploadImage({
        file,
        fileName: `${field}-${Date.now()}-${file.name.replace(/\s+/g, "-")}`,
        folder: field === 'logo' ? '/solo/club-logos' : '/solo/manager-avatars'
      });
      setClubForm(prev => ({
        ...prev,
        [field === 'logo' ? 'logoPath' : 'avatarPath']: res.url
      }));
      showToast(`${field === 'logo' ? 'Logo' : 'Avatar'} uploaded successfully to ImageKit!`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Upload failed");
    } finally {
      setUploadingField(null);
    }
  };

  const handleEditManager = (m: any) => {
    setClubForm({
      id: m.id.toString(),
      clubId: m.club_id ? m.club_id.toString() : "",
      clubName: m.club || '',
      logoPath: m.club_logo || '',
      managerName: m.name,
      avatarPath: m.photo || '',
      coinBalance: parseInt(m.r2g_coin_balance) || 0,
      tokenBalance: parseInt(m.r2g_token_balance) || 0,
      voucherBalance: parseInt(m.r2g_voucher_balance) || 0,
      rating: parseInt(m.overall_rating) || 80,
      starRating: parseInt(m.star_rating) || 3,
      wins: m.wins || 0,
      draws: m.draws || 0,
      losses: m.losses || 0,
      matchesPlayed: m.matches_played || 0,
      goalsFor: m.goals_scored || 0,
      goalsAgainst: m.goals_conceded || 0,
      cleanSheets: m.clean_sheets || 0,
      isBanned: m.is_banned || false,
      isActive: m.is_active !== false
    });
  };

  const handleDeleteClub = (id: number) => {
    if (!confirm("This will permanently delete the club, manager, wallet, and contracts. Continue?")) return;
    startTransition(async () => {
      try {
        await deleteClubAndManager(id);
        showToast("Club and Manager records deleted!");
        clearForm();
        loadData();
      } catch {
        showToast("Error deleting manager!");
      }
    });
  };

  const toggleBanStatus = (m: any) => {
    const nextBanStatus = !m.is_banned;
    if (nextBanStatus) {
      setFineModal({
        show: true,
        targetId: m.id.toString(),
        targetName: m.name,
        rc: 0,
        rt: 0,
        voucher: 0
      });
    } else {
      // Unban directly
      startTransition(async () => {
        try {
          await updateManagerDetails({
            id: m.id,
            clubId: m.club_id ? m.club_id.toString() : "",
            name: m.name,
            photo: m.photo,
            clubName: m.club,
            isBanned: false,
            coinBalance: m.r2g_coin_balance,
            tokenBalance: m.r2g_token_balance,
            voucherBalance: m.r2g_voucher_balance,
            rating: m.overall_rating,
            starRating: m.star_rating,
            wins: m.wins, draws: m.draws, losses: m.losses, matchesPlayed: m.matches_played,
            goalsFor: m.goals_scored, goalsAgainst: m.goals_conceded, cleanSheets: m.clean_sheets
          });
          showToast(`Manager ${m.name} unbanned!`);
          loadData();
        } catch {
          showToast("Error lifting ban!");
        }
      });
    }
  };

  const executeBanWithFine = () => {
    startTransition(async () => {
      try {
        if (fineModal.rc > 0 || fineModal.rt > 0 || fineModal.voucher > 0) {
          await applyFine(parseInt(fineModal.targetId), activeSeason?.id || 6, fineModal.rc, fineModal.rt, fineModal.voucher);
        }
        
        const mgr = managers.find(m => m.id.toString() === fineModal.targetId);
        await updateManagerDetails({
          id: fineModal.targetId,
          clubId: mgr.club_id ? mgr.club_id.toString() : "",
          name: mgr.name,
          photo: mgr.photo,
          clubName: mgr.club,
          isBanned: true,
          coinBalance: mgr.r2g_coin_balance,
          tokenBalance: mgr.r2g_token_balance,
          voucherBalance: mgr.r2g_voucher_balance,
          rating: mgr.overall_rating,
          starRating: mgr.star_rating,
          wins: mgr.wins, draws: mgr.draws, losses: mgr.losses, matchesPlayed: mgr.matches_played,
          goalsFor: mgr.goals_scored, goalsAgainst: mgr.goals_conceded, cleanSheets: mgr.clean_sheets
        });

        showToast(`Manager ${fineModal.targetName} banned & fine applied!`);
        setFineModal({ show: false, targetId: "", targetName: "", rc: 0, rt: 0, voucher: 0 });
        clearForm();
        loadData();
      } catch {
        showToast("Error executing ban!");
      }
    });
  };

  return (
    <div className="portal-root-wrapper" data-module="clubs">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      {fineModal.show && (
        <div className="fine-modal-backdrop">
          <div className="fine-modal-content">
            <h3><i className="fa-solid fa-triangle-exclamation" /> Ban Fine Payout</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Approve ban for <strong>{fineModal.targetName}</strong>. Input fine details to charge wallet:
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
              <button className="portal-btn btn-secondary" onClick={() => setFineModal({ show: false, targetId: "", targetName: "", rc: 0, rt: 0, voucher: 0 })}>Cancel</button>
              <button className="portal-btn btn-danger" onClick={executeBanWithFine} disabled={isPending}>
                {isPending ? <><i className="fa-solid fa-spinner fa-spin" /> Processing...</> : <><i className="fa-solid fa-gavel" /> Confirm & Ban</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        <div className="portal-header">
          <div className="portal-page-badge"><i className="fa-solid fa-shield-halved" /> Clubs & Managers</div>
          <h1 className="portal-title">CLUBS & MANAGERS</h1>
          <p className="portal-subtitle">Register new franchises, override wallets, edit season records, and administer season bans.</p>
        </div>

        {/* Summary Stats Row */}
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="stat-label">Total Clubs</div>
            <div className="stat-value">{managers.length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value">{managers.filter(m => !m.is_banned).length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Banned</div>
            <div className="stat-value">{managers.filter(m => m.is_banned).length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Season</div>
            <div className="stat-value">{activeSeason ? `Season ${activeSeason.season_number}` : "—"}</div>
          </div>
        </div>

        {/* 2-column side-by-side layout */}
        <div className="financial-layout">
          
          {/* Left Column: Clubs list cards */}
          <div className="financial-sidebar">
            <button className="portal-btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={clearForm}>
              <i className="fa-solid fa-circle-plus" /> Register New Club
            </button>
            
            <div className="clubs-scroll-container">
              {managers.length === 0 ? (
                <div className="admin-empty">
                  <i className="fa-solid fa-building" />
                  No clubs registered yet.
                </div>
              ) : (
                managers.map(m => {
                  const isActive = clubForm.id === m.id.toString();
                  return (
                    <div 
                      key={m.id}
                      className={`club-select-card ${isActive ? 'active' : ''}`}
                      onClick={() => handleEditManager(m)}
                    >
                      <div className="club-card-meta">
                        <div className="club-card-avatar">
                          {m.photo ? <img src={m.photo} alt={m.name} /> : <i className="fa-solid fa-user-tie" />}
                        </div>
                        <div className="club-card-details">
                          <h4>{m.club || "Free Agent"}</h4>
                          <span>{m.name} {m.r2g_id && `(${m.r2g_id})`}</span>
                        </div>
                      </div>

                      <div className="club-card-pills">
                        <div className="club-pill-item" style={{ borderColor: "#fbbf24", color: "#fbbf24" }}>
                          <span><i className="fa-solid fa-coins" style={{ marginRight: "4px" }} /> Coins</span>
                          <span>{parseInt(m.r2g_coin_balance) || 0}</span>
                        </div>
                        <div className="club-pill-item" style={{ borderColor: "#38bdf8", color: "#38bdf8" }}>
                          <span><i className="fa-solid fa-star" style={{ marginRight: "4px" }} /> Tokens</span>
                          <span>{parseInt(m.r2g_token_balance) || 0}</span>
                        </div>
                        <div className="club-pill-item" style={{ borderColor: "#ec4899", color: "#ec4899" }}>
                          <span><i className="fa-solid fa-ticket" style={{ marginRight: "4px" }} /> Vouchers</span>
                          <span>{parseInt(m.r2g_voucher_balance) || 0}</span>
                        </div>
                        <div className="club-pill-item">
                          <span><i className="fa-solid fa-chart-line" style={{ marginRight: "4px" }} /> Rating</span>
                          <span>{m.overall_rating || 80} OVR</span>
                        </div>
                      </div>

                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Record: {m.wins || 0}W-{m.draws || 0}D-{m.losses || 0}L</span>
                        <span>
                          {m.is_banned ? (
                            <span className="badge-banned">BANNED</span>
                          ) : m.is_active === false ? (
                            <span style={{ background: "rgba(156, 163, 175, 0.15)", color: "#d1d5db", border: "1px solid rgba(156, 163, 175, 0.3)", borderRadius: "0.25rem", padding: "2px 6px", fontSize: "0.65rem", fontWeight: 800 }}>GUEST/INACTIVE</span>
                          ) : (
                            <span className="badge-active">ACTIVE</span>
                          )}
                        </span>
                      </div>

                      <div className="club-card-footer" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className={`portal-btn ${m.is_banned ? 'btn-primary' : 'btn-danger'}`}
                          style={{ padding: "2px 8px", fontSize: "0.7rem" }}
                          onClick={() => toggleBanStatus(m)}
                        >
                          <i className={`fa-solid ${m.is_banned ? 'fa-lock-open' : 'fa-ban'}`} /> {m.is_banned ? "Unban" : "Ban"}
                        </button>
                        <button 
                          className="portal-btn btn-danger" 
                          style={{ padding: "2px 8px", fontSize: "0.7rem" }}
                          onClick={() => handleDeleteClub(m.id)}
                        >
                          <i className="fa-solid fa-trash" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Profile Editor */}
          <div className="financial-main">
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h2 className="admin-card-title">
                <i className="fa-solid fa-pen-to-square" />
                {clubForm.id ? `Editing Manager: ${clubForm.managerName}` : "Register New Franchise"}
              </h2>

              <form onSubmit={handleSaveClub}>
                
                {/* General Profile Card */}
                <div className="sub-card">
                  <div className="sub-card-title"><i className="fa-solid fa-id-card" /> General Profile</div>
                  
                  {clubForm.id && (
                    <div className="admin-form-group" style={{ marginBottom: "1rem" }}>
                      <label>Club Association (Assign to an existing club)</label>
                      <select 
                        className="admin-select"
                        value={clubForm.clubId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const selected = allClubs.find(c => c.id.toString() === val);
                          setClubForm(prev => ({
                            ...prev,
                            clubId: val,
                            clubName: selected ? selected.name : prev.clubName,
                            logoPath: selected ? selected.logo_path : prev.logoPath
                          }));
                        }}
                      >
                        <option value="">-- Keep Current / Custom Club --</option>
                        {allClubs.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="admin-form-grid">
                    <div className="admin-form-group">
                      <label>Club Name</label>
                      <input type="text" className="admin-input" value={clubForm.clubName} onChange={(e) => setClubForm(prev => ({ ...prev, clubName: e.target.value }))} placeholder="e.g. London FC" />
                    </div>
                    <div className="admin-form-group">
                      <label>Manager Name</label>
                      <input type="text" className="admin-input" value={clubForm.managerName} onChange={(e) => setClubForm(prev => ({ ...prev, managerName: e.target.value }))} placeholder="e.g. John Doe" />
                    </div>
                  </div>
                  <div className="admin-form-grid" style={{ marginTop: "1rem" }}>
                    <div className="admin-form-group">
                      <label>Club Logo Path</label>
                      <input type="text" className="admin-input" value={clubForm.logoPath} onChange={(e) => setClubForm(prev => ({ ...prev, logoPath: e.target.value }))} placeholder="/assets/images/clubs/logo.png" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="club-logo-file-upload"
                        style={{ display: "none" }}
                        onChange={(e) => handleFileUpload(e, 'logo')}
                        disabled={uploadingField !== null}
                      />
                      <label htmlFor="club-logo-file-upload" className="portal-btn btn-secondary" style={{ display: "inline-flex", padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer", marginTop: "4px", width: "fit-content", pointerEvents: uploadingField !== null ? "none" : "auto" }}>
                        {uploadingField === 'logo' ? <><i className="fa-solid fa-spinner fa-spin" /> Uploading...</> : <><i className="fa-solid fa-cloud-arrow-up" /> Upload Logo</>}
                      </label>
                    </div>
                    <div className="admin-form-group">
                      <label>Manager Avatar Path</label>
                      <input type="text" className="admin-input" value={clubForm.avatarPath} onChange={(e) => setClubForm(prev => ({ ...prev, avatarPath: e.target.value }))} placeholder="/assets/images/managers/avatar.png" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="mgr-avatar-file-upload"
                        style={{ display: "none" }}
                        onChange={(e) => handleFileUpload(e, 'avatar')}
                        disabled={uploadingField !== null}
                      />
                      <label htmlFor="mgr-avatar-file-upload" className="portal-btn btn-secondary" style={{ display: "inline-flex", padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer", marginTop: "4px", width: "fit-content", pointerEvents: uploadingField !== null ? "none" : "auto" }}>
                        {uploadingField === 'avatar' ? <><i className="fa-solid fa-spinner fa-spin" /> Uploading...</> : <><i className="fa-solid fa-cloud-arrow-up" /> Upload Avatar</>}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Wallet Balance Card */}
                <div className="sub-card">
                  <div className="sub-card-title"><i className="fa-solid fa-wallet" /> Wallet Balance Overrides</div>
                  <div className="currency-input-container">
                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#fbbf24", fontWeight: 700 }}>Coins Balance (RC)</label>
                      <div className="currency-input-wrapper">
                        <i className="fa-solid fa-coins currency-icon rc" />
                        <input type="number" className="admin-input" value={clubForm.coinBalance} onChange={(e) => setClubForm(prev => ({ ...prev, coinBalance: parseInt(e.target.value) || 0 }))} />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700 }}>Tokens Balance (RT)</label>
                      <div className="currency-input-wrapper">
                        <i className="fa-solid fa-star currency-icon rt" />
                        <input type="number" className="admin-input" value={clubForm.tokenBalance} onChange={(e) => setClubForm(prev => ({ ...prev, tokenBalance: parseInt(e.target.value) || 0 }))} />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#ec4899", fontWeight: 700 }}>Vouchers Balance</label>
                      <div className="currency-input-wrapper">
                        <i className="fa-solid fa-ticket currency-icon voucher" />
                        <input type="number" className="admin-input" value={clubForm.voucherBalance} onChange={(e) => setClubForm(prev => ({ ...prev, voucherBalance: parseInt(e.target.value) || 0 }))} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rating & Rankings */}
                <div className="sub-card">
                  <div className="sub-card-title"><i className="fa-solid fa-arrow-up-right-dots" /> Rating & Star Level</div>
                  <div className="admin-form-grid">
                    <div className="admin-form-group">
                      <label>Overall Squad Rating (OVR)</label>
                      <input type="number" className="admin-input" min={0} max={99} value={clubForm.rating} onChange={(e) => setClubForm(prev => ({ ...prev, rating: parseInt(e.target.value) || 80 }))} />
                    </div>
                    <div className="admin-form-group">
                      <label>Star Level (1-5★)</label>
                      <input type="number" className="admin-input" min={1} max={5} value={clubForm.starRating} onChange={(e) => setClubForm(prev => ({ ...prev, starRating: parseInt(e.target.value) || 3 }))} />
                    </div>
                  </div>
                  
                  <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>
                      <input 
                        type="checkbox" 
                        checked={clubForm.isActive} 
                        onChange={(e) => setClubForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
                      />
                      <span>Active in Career Universe</span>
                    </label>
                    <p style={{ margin: "4px 0 0 1.5rem", fontSize: "0.75rem", color: "#9ca3af", lineHeight: "1.3" }}>
                      Uncheck for guest/relegated teams. Inactive teams are hidden from public rankings and directories, but all historical standings and fixture scores remain preserved.
                    </p>
                  </div>
                </div>

                {/* Matches & stats (Edit Mode only) */}
                {clubForm.id && (
                  <div className="sub-card">
                    <div className="sub-card-title"><i className="fa-solid fa-chart-simple" /> Season Record Overrides</div>
                    <div className="admin-form-grid">
                      <div className="admin-form-group">
                        <label>Matches Played</label>
                        <input type="number" className="admin-input" value={clubForm.matchesPlayed} onChange={(e) => setClubForm(prev => ({ ...prev, matchesPlayed: parseInt(e.target.value) || 0 }))} />
                      </div>
                      <div className="admin-form-group">
                        <label>Wins</label>
                        <input type="number" className="admin-input" value={clubForm.wins} onChange={(e) => setClubForm(prev => ({ ...prev, wins: parseInt(e.target.value) || 0 }))} />
                      </div>
                      <div className="admin-form-group">
                        <label>Draws</label>
                        <input type="number" className="admin-input" value={clubForm.draws} onChange={(e) => setClubForm(prev => ({ ...prev, draws: parseInt(e.target.value) || 0 }))} />
                      </div>
                      <div className="admin-form-group">
                        <label>Losses</label>
                        <input type="number" className="admin-input" value={clubForm.losses} onChange={(e) => setClubForm(prev => ({ ...prev, losses: parseInt(e.target.value) || 0 }))} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="admin-btn-row">
                  <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                    {isPending ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</> : (clubForm.id ? <><i className="fa-solid fa-check" /> Update Club Settings</> : <><i className="fa-solid fa-plus" /> Save New Club</>)}
                  </button>
                  {clubForm.id && (
                    <button type="button" className="portal-btn btn-secondary" onClick={clearForm}>
                      <i className="fa-solid fa-xmark" /> Cancel Edit
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
