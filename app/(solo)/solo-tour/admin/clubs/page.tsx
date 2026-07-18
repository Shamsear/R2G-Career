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
  updateManagerProfileOnly,
  updateManagerClubOnly,
  updateManagerWalletAndStatsOnly,
  deleteClubAndManager,
  applyFine,
  fetchRegisteredClubs
} from "@/utils/solo/serverActions";

const countriesList = [
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", name: "Qatar", flag: "🇶🇦" },
  { code: "+965", name: "Kuwait", flag: "🇰🇼" },
  { code: "+968", name: "Oman", flag: "🇴🇲" },
  { code: "+973", name: "Bahrain", flag: "🇧🇭" },
  { code: "+1", name: "United States / Canada", flag: "🇺🇸" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+92", name: "Pakistan", flag: "🇵🇰" },
  { code: "+880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "+60", name: "Malaysia", flag: "🇲🇾" },
  { code: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "+82", name: "South Korea", flag: "🇰🇷" },
  { code: "+86", name: "China", flag: "🇨🇳" },
  { code: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "+27", name: "South Africa", flag: "🇿🇦" }
];

export default function ClubsManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [managers, setManagers] = useState<any[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [selectedCountryCode, setSelectedCountryCode] = useState("+91");
  const [localMobileNo, setLocalMobileNo] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [managerSearchQuery, setManagerSearchQuery] = useState("");

  const [clubForm, setClubForm] = useState({
    id: "",
    clubId: "",
    clubName: "",
    logoPath: "",
    managerName: "",
    r2gId: "",
    avatarPath: "",
    mobNo: "",
    place: "",
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
    } catch (error) {
      console.error(error);
      showToast("Error loading managers!");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearForm = () => {
    setClubForm({
      id: "", clubId: "", clubName: "", logoPath: "", managerName: "", r2gId: "", avatarPath: "",
      mobNo: "", place: "",
      coinBalance: 1500, tokenBalance: 100, voucherBalance: 0, rating: 80, starRating: 3,
      wins: 0, draws: 0, losses: 0, matchesPlayed: 0, goalsFor: 0, goalsAgainst: 0, cleanSheets: 0,
      isBanned: false,
      isActive: true
    });
    setSelectedCountryCode("+91");
    setLocalMobileNo("");
  };

  const getFormForSubmission = () => {
    const combinedMobNo = localMobileNo.trim() ? `${selectedCountryCode}${localMobileNo.trim()}` : "";
    return {
      ...clubForm,
      mobNo: combinedMobNo
    };
  };

  const handleUpdateManagerProfile = () => {
    if (!clubForm.managerName) return showToast("Manager name is required!");
    startTransition(async () => {
      try {
        await updateManagerProfileOnly(getFormForSubmission());
        showToast("Manager profile updated successfully!");
        loadData();
      } catch (err) {
        console.error(err);
        showToast("Error updating manager profile!");
      }
    });
  };

  const handleUpdateManagerClub = () => {
    startTransition(async () => {
      try {
        await updateManagerClubOnly(getFormForSubmission());
        showToast("Club & franchise updated successfully!");
        loadData();
      } catch (err) {
        console.error(err);
        showToast("Error updating club details!");
      }
    });
  };

  const handleUpdateManagerWalletAndStats = () => {
    startTransition(async () => {
      try {
        await updateManagerWalletAndStatsOnly(getFormForSubmission());
        showToast("Wallet & performance stats updated successfully!");
        loadData();
      } catch (err) {
        console.error(err);
        showToast("Error updating wallet & stats!");
      }
    });
  };

  const handleSaveClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubForm.managerName) return showToast("Manager name is required!");
    startTransition(async () => {
      try {
        const submissionData = getFormForSubmission();
        if (clubForm.id) {
          await updateManagerDetails(submissionData);
          showToast("Club & Manager details updated!");
        } else {
          await createClubAndManager(submissionData);
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
    const countryCodes = ["+91", "+971", "+966", "+974", "+965", "+968", "+973", "+1", "+44", "+92", "+880", "+60", "+65", "+61"];
    let matchedCode = "+91";
    let localNum = m.mob_no || "";
    
    if (localNum.startsWith("+")) {
      for (const code of countryCodes) {
        if (localNum.startsWith(code)) {
          matchedCode = code;
          localNum = localNum.slice(code.length).trim();
          break;
        }
      }
    }
    
    setSelectedCountryCode(matchedCode);
    setLocalMobileNo(localNum);

    setClubForm({
      id: m.id.toString(),
      clubId: m.club_id ? m.club_id.toString() : "",
      clubName: m.club || '',
      logoPath: m.club_logo || '',
      managerName: m.name,
      r2gId: m.r2g_id || m.name,
      avatarPath: m.photo || '',
      mobNo: m.mob_no || '',
      place: m.place || '',
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
          <div className="portal-page-badge"><i className="fa-solid fa-shield-halved" /> Managers & Wallets</div>
          <h1 className="portal-title">MANAGERS & WALLETS</h1>
          <p className="portal-subtitle">Register new managers, assign clubs, override wallets, edit season records, and administer season bans.</p>
        </div>

        {/* Summary Stats Row */}
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="stat-label">Total Managers</div>
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
              <i className="fa-solid fa-circle-plus" /> Register New Manager
            </button>
            
            {/* Search Bar */}
            <div style={{ position: "relative", marginBottom: "0.25rem" }}>
              <i 
                className="fa-solid fa-magnifying-glass" 
                style={{ 
                  position: "absolute", 
                  left: "12px", 
                  top: "50%", 
                  transform: "translateY(-50%)", 
                  color: "rgba(255, 255, 255, 0.4)",
                  fontSize: "0.9rem" 
                }} 
              />
              <input
                type="text"
                className="admin-input"
                style={{ paddingLeft: "36px", width: "100%", height: "42px", borderRadius: "8px" }}
                placeholder="Search managers, clubs or IDs..."
                value={managerSearchQuery}
                onChange={(e) => setManagerSearchQuery(e.target.value)}
              />
              {managerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setManagerSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer"
                  }}
                >
                  <i className="fa-solid fa-circle-xmark" />
                </button>
              )}
            </div>

            <div className="clubs-scroll-container">
              {managers.length === 0 ? (
                <div className="admin-empty">
                  <i className="fa-solid fa-building" />
                  No clubs registered yet.
                </div>
              ) : (
                (() => {
                  const filtered = managers.filter(m => {
                    const query = managerSearchQuery.toLowerCase();
                    return (
                      m.name.toLowerCase().includes(query) ||
                      (m.club && m.club.toLowerCase().includes(query)) ||
                      (m.r2g_id && m.r2g_id.toLowerCase().includes(query))
                    );
                  });
                  if (filtered.length === 0) {
                    return (
                      <div className="admin-empty" style={{ padding: "20px 10px" }}>
                        <i className="fa-solid fa-magnifying-glass-slash" style={{ fontSize: "1.5rem" }} />
                        No matching managers found.
                      </div>
                    );
                  }
                  return filtered.map(m => {
                    const isActive = clubForm.id === m.id.toString();
                    return (
                      <div 
                        key={m.id}
                        className={`club-select-card ${isActive ? 'active' : ''}`}
                        onClick={() => handleEditManager(m)}
                        style={{ padding: "0.6rem 0.75rem", gap: "0.25rem" }}
                      >
                        <div className="club-card-meta" style={{ gap: "0.5rem" }}>
                          <div className="club-card-avatar" style={{ width: "32px", height: "32px", minWidth: "32px", borderRadius: "50%", overflow: "hidden" }}>
                            {m.photo ? <img src={m.photo} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <i className="fa-solid fa-user-tie" />}
                          </div>
                          <div className="club-card-details">
                            <h4 style={{ fontSize: "0.85rem", margin: 0, fontWeight: 600 }}>{m.club || "Free Agent"}</h4>
                            <span style={{ fontSize: "0.72rem", opacity: 0.8 }}>{m.name} {m.r2g_id && `(${m.r2g_id})`}</span>
                          </div>
                          <div style={{ marginLeft: "auto" }}>
                            {m.is_banned ? (
                              <span className="badge-banned" style={{ padding: "2px 4px", fontSize: "0.58rem" }}>BANNED</span>
                            ) : m.is_active === false ? (
                              <span style={{ background: "rgba(156, 163, 175, 0.15)", color: "#d1d5db", border: "1px solid rgba(156, 163, 175, 0.3)", borderRadius: "0.25rem", padding: "2px 4px", fontSize: "0.58rem", fontWeight: 800 }}>GUEST</span>
                            ) : (
                              <span className="badge-active" style={{ padding: "2px 4px", fontSize: "0.58rem" }}>ACTIVE</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.65rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", margin: "4px 0" }}>
                          <span><i className="fa-solid fa-coins" style={{ color: "#fbbf24", marginRight: "3px" }} />{parseInt(m.r2g_coin_balance) || 0}</span>
                          <span><i className="fa-solid fa-star" style={{ color: "#38bdf8", marginRight: "3px" }} />{parseInt(m.r2g_token_balance) || 0}</span>
                          <span><i className="fa-solid fa-ticket" style={{ color: "#ec4899", marginRight: "3px" }} />{parseInt(m.r2g_voucher_balance) || 0}</span>
                          <span style={{ marginLeft: "auto", opacity: 0.8 }}>OVR: {m.overall_rating || 80}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px", borderTop: "1px dashed rgba(255,255,255,0.06)", marginTop: "4px" }}>
                          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
                            Record: {m.wins || 0}W-{m.draws || 0}D-{m.losses || 0}L
                          </span>
                          <div style={{ display: "flex", gap: "0.3rem" }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              className={`portal-btn ${m.is_banned ? 'btn-primary' : 'btn-danger'}`}
                              style={{ padding: "1px 6px", fontSize: "0.62rem", height: "20px", borderRadius: "4px" }}
                              onClick={() => toggleBanStatus(m)}
                            >
                              {m.is_banned ? "Unban" : "Ban"}
                            </button>
                            <button 
                              className="portal-btn btn-danger" 
                              style={{ padding: "1px 6px", fontSize: "0.62rem", height: "20px", borderRadius: "4px" }}
                              onClick={() => handleDeleteClub(m.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
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

              {clubForm.id && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                  <button type="button" className="portal-btn btn-secondary" onClick={clearForm}>
                    <i className="fa-solid fa-xmark" /> Cancel Edit & Return to List
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveClub}>
                
                {/* 1. Manager Info Card */}
                <div className="sub-card">
                  <div className="sub-card-title">
                    <i className="fa-solid fa-user-gear" /> 1. Manager Profile Info
                  </div>
                  
                  <div className="admin-form-grid">
                    <div className="admin-form-group">
                      <label>Manager Name</label>
                      <input type="text" className="admin-input" value={clubForm.managerName} onChange={(e) => setClubForm(prev => ({ ...prev, managerName: e.target.value }))} placeholder="e.g. John Doe" />
                    </div>
                    <div className="admin-form-group">
                      <label>R2G ID</label>
                      <input type="text" className="admin-input" value={clubForm.r2gId} onChange={(e) => setClubForm(prev => ({ ...prev, r2gId: e.target.value }))} placeholder="e.g. MAJEE" />
                    </div>
                  </div>

                  <div className="admin-form-grid" style={{ marginTop: "1rem" }}>
                    <div className="admin-form-group" style={{ gridColumn: "span 2" }}>
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

                  <div className="admin-form-grid" style={{ marginTop: "1rem" }}>
                    <div className="admin-form-group">
                      <label>Mobile Number</label>
                      <div style={{ display: "flex", gap: "0.5rem", position: "relative" }}>
                        
                        {/* Custom Searchable Country Code Dropdown */}
                        <div style={{ position: "relative", width: "120px", flexShrink: 0, zIndex: 999 }}>
                          <button
                            type="button"
                            className="admin-input"
                            style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "space-between", 
                              width: "100%", 
                              textAlign: "left",
                              cursor: "pointer",
                              padding: "10px 12px"
                            }}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          >
                            <span>
                              {countriesList.find(c => c.code === selectedCountryCode)?.flag || "🇮🇳"} {selectedCountryCode}
                            </span>
                            <i className="fa-solid fa-chevron-down" style={{ fontSize: "0.7rem", opacity: 0.6 }} />
                          </button>

                          {isDropdownOpen && (
                            <>
                              {/* Fullscreen Backdrop click-outside handle */}
                              <div 
                                style={{ 
                                  position: "fixed", 
                                  top: 0, 
                                  left: 0, 
                                  right: 0, 
                                  bottom: 0, 
                                  zIndex: 998,
                                  background: "transparent"
                                }} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsDropdownOpen(false);
                                  setCountrySearchQuery("");
                                }} 
                              />
                              
                              {/* Dropdown Menu Option list overlay */}
                              <div 
                                style={{ 
                                  position: "absolute", 
                                  top: "calc(100% + 4px)", 
                                  left: 0, 
                                  width: "250px", 
                                  maxHeight: "220px", 
                                  overflowY: "auto", 
                                  background: "#161b22", 
                                  border: "1px solid rgba(255, 255, 255, 0.15)", 
                                  borderRadius: "6px", 
                                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)", 
                                  zIndex: 999,
                                  padding: "6px"
                                }}
                              >
                                {/* Search input */}
                                <input 
                                  type="text" 
                                  className="admin-input"
                                  style={{ 
                                    width: "100%", 
                                    padding: "6px 10px", 
                                    fontSize: "0.8rem", 
                                    marginBottom: "6px",
                                    background: "#0d1117"
                                  }}
                                  placeholder="Search country / code..."
                                  value={countrySearchQuery}
                                  onChange={(e) => setCountrySearchQuery(e.target.value)}
                                  autoFocus
                                />
                                
                                {/* Scrollable List */}
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  {countriesList
                                    .filter(c => 
                                      c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
                                      c.code.includes(countrySearchQuery)
                                    )
                                    .map(c => (
                                      <button
                                        key={c.code + c.name}
                                        type="button"
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          width: "100%",
                                          padding: "8px 10px",
                                          background: "transparent",
                                          border: "none",
                                          borderRadius: "4px",
                                          color: "#fff",
                                          fontSize: "0.82rem",
                                          textAlign: "left",
                                          cursor: "pointer",
                                          transition: "background 0.2s"
                                        }}
                                        onClick={() => {
                                          setSelectedCountryCode(c.code);
                                          setIsDropdownOpen(false);
                                          setCountrySearchQuery("");
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                      >
                                        <span>{c.flag} {c.name}</span>
                                        <span style={{ color: "#a855f7", fontWeight: 600 }}>{c.code}</span>
                                      </button>
                                    ))}
                                  {countriesList.filter(c => 
                                    c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
                                    c.code.includes(countrySearchQuery)
                                  ).length === 0 && (
                                    <div style={{ padding: "10px", fontSize: "0.75rem", color: "#8b949e", textAlign: "center" }}>
                                      No matches found
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        <input 
                          type="text" 
                          className="admin-input" 
                          value={localMobileNo} 
                          onChange={(e) => setLocalMobileNo(e.target.value.replace(/\D/g, ""))}
                          placeholder="e.g. 9876543210" 
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label>Place</label>
                      <input type="text" className="admin-input" value={clubForm.place} onChange={(e) => setClubForm(prev => ({ ...prev, place: e.target.value }))} placeholder="e.g. London, UK" />
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

                  {clubForm.id && (
                    <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
                      <button type="button" className="portal-btn btn-primary" onClick={handleUpdateManagerProfile} disabled={isPending}>
                        {isPending ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</> : <><i className="fa-solid fa-user-pen" /> Update Manager Profile Only</>}
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Club Association */}
                {clubForm.isActive && (
                  <div className="sub-card">
                    <div className="sub-card-title">
                      <i className="fa-solid fa-shield-halved" /> 2. Club Association
                    </div>
                    
                    <div className="admin-form-group" style={{ marginBottom: "1rem" }}>
                      <label>Select Associated Club</label>
                      <select 
                        className="admin-select"
                        value={clubForm.clubId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const selected = allClubs.find(c => c.id.toString() === val);
                          setClubForm(prev => ({
                            ...prev,
                            clubId: val,
                            clubName: selected ? selected.name : "",
                            logoPath: selected ? selected.logo_path : ""
                          }));
                        }}
                      >
                        <option value="">-- No Associated Club --</option>
                        {allClubs.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {clubForm.id && (
                      <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
                        <button type="button" className="portal-btn btn-primary" onClick={handleUpdateManagerClub} disabled={isPending}>
                          {isPending ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</> : <><i className="fa-solid fa-building-circle-check" /> Update Association Only</>}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Wallet & Performance Card */}
                {clubForm.isActive && (
                  <div className="sub-card">
                    <div className="sub-card-title">
                      <i className="fa-solid fa-wallet" /> 3. Wallet & Performance Override
                    </div>
                    
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

                    <div className="admin-form-grid" style={{ marginTop: "1rem" }}>
                      <div className="admin-form-group">
                        <label>Overall Squad Rating (OVR)</label>
                        <input type="number" className="admin-input" min={0} max={99} value={clubForm.rating} onChange={(e) => setClubForm(prev => ({ ...prev, rating: parseInt(e.target.value) || 80 }))} />
                      </div>
                      <div className="admin-form-group">
                        <label>Star Level (1-5★)</label>
                        <input type="number" className="admin-input" min={1} max={5} value={clubForm.starRating} onChange={(e) => setClubForm(prev => ({ ...prev, starRating: parseInt(e.target.value) || 3 }))} />
                      </div>
                    </div>

                    {/* Matches & stats (Edit Mode only) */}
                    {clubForm.id && (
                      <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px dashed rgba(255, 255, 255, 0.08)" }}>
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

                    {clubForm.id && (
                      <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
                        <button type="button" className="portal-btn btn-primary" onClick={handleUpdateManagerWalletAndStats} disabled={isPending}>
                          {isPending ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</> : <><i className="fa-solid fa-wallet" /> Update Wallet & Stats Only</>}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!clubForm.id && (
                  <div className="admin-btn-row">
                    <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                      {isPending ? (
                        <><i className="fa-solid fa-spinner fa-spin" /> Saving...</>
                      ) : clubForm.isActive ? (
                        <><i className="fa-solid fa-plus" /> Save New Club & Franchise</>
                      ) : (
                        <><i className="fa-solid fa-user-plus" /> Save New Manager Profile Only</>
                      )}
                    </button>
                  </div>
                )}

              </form>
              <style>{`
                /* Desktop: wide sidebar list */
                @media (min-width: 1025px) {
                  .financial-layout {
                    grid-template-columns: 420px 1fr !important;
                  }
                  .clubs-scroll-container {
                    max-height: 170vh !important;
                  }
                }

                /* Mobile/Tablet: compact scroll container so form is visible */
                @media (max-width: 1024px) {
                  .clubs-scroll-container {
                    max-height: 280px !important;
                  }
                }
              `}</style>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
