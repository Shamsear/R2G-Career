"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchSeasonsList,
  createSoloSeason,
  toggleSoloSeasonActive,
  deleteSoloSeason,
  updateSoloSeasonDetails
} from "@/utils/solo/serverActions";

export default function SeasonsManager() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create/Edit Season Form States
  const [newSeasonNumber, setNewSeasonNumber] = useState<number | "">("");
  const [makeActive, setMakeActive] = useState<boolean>(true);
  const [carryOver, setCarryOver] = useState<boolean>(true);
  const [hasRws, setHasRws] = useState<boolean>(true);
  const [rwsYear, setRwsYear] = useState<number | "">(2026);
  const [editingSeasonId, setEditingSeasonId] = useState<number | null>(null);

  // Bonus states
  const [startRc, setStartRc] = useState<number>(1500);
  const [startRt, setStartRt] = useState<number>(50);
  const [startVoucher, setStartVoucher] = useState<number>(5);
  const [finaleRc, setFinaleRc] = useState<number>(2000);
  const [finaleRt, setFinaleRt] = useState<number>(80);
  const [finaleVoucher, setFinaleVoucher] = useState<number>(10);

  // Deletion Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadSeasons = async () => {
    try {
      const list = await fetchSeasonsList();
      setSeasons(list);
    } catch (e: any) {
      showToast("❌ Error loading seasons: " + e.message);
    }
  };

  useEffect(() => {
    loadSeasons();
  }, []);

  const handleSaveSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonNumber || isNaN(Number(newSeasonNumber))) {
      showToast("❌ Please enter a valid season number.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingSeasonId !== null) {
          // Edit Season Mode
          await updateSoloSeasonDetails(
            editingSeasonId,
            Number(newSeasonNumber),
            hasRws,
            hasRws ? (rwsYear === "" ? null : Number(rwsYear)) : null,
            startRc,
            startRt,
            startVoucher,
            finaleRc,
            finaleRt,
            finaleVoucher
          );
          showToast(`✅ Updated Season ${newSeasonNumber} successfully!`);
          clearForm();
          await loadSeasons();
        } else {
          // Create Season Mode
          const res = await createSoloSeason(
            Number(newSeasonNumber),
            makeActive,
            carryOver,
            hasRws,
            hasRws ? (rwsYear === "" ? null : Number(rwsYear)) : null,
            startRc,
            startRt,
            startVoucher,
            finaleRc,
            finaleRt,
            finaleVoucher
          );
          if (res.success) {
            showToast(`✅ Created Season ${newSeasonNumber} successfully!`);
            clearForm();
            await loadSeasons();
          }
        }
      } catch (err: any) {
        showToast(`❌ Failed to save season: ${err.message}`);
      }
    });
  };

  const handleEditClick = (season: any) => {
    setEditingSeasonId(season.id);
    setNewSeasonNumber(season.season_number);
    setHasRws(season.has_rws);
    setRwsYear(season.rws_year || "");
    setStartRc(season.start_bonus_rc || 0);
    setStartRt(season.start_bonus_rt || 0);
    setStartVoucher(season.start_bonus_voucher || 0);
    setFinaleRc(season.finale_bonus_rc || 0);
    setFinaleRt(season.finale_bonus_rt || 0);
    setFinaleVoucher(season.finale_bonus_voucher || 0);
    setDeleteConfirmId(null);
  };

  const clearForm = () => {
    setNewSeasonNumber("");
    setMakeActive(true);
    setCarryOver(true);
    setHasRws(true);
    setRwsYear(2026);
    setStartRc(1500);
    setStartRt(50);
    setStartVoucher(5);
    setFinaleRc(2000);
    setFinaleRt(80);
    setFinaleVoucher(10);
    setEditingSeasonId(null);
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    const actionText = currentActive ? "deactivate" : "activate";
    if (currentActive) {
      const activeCount = seasons.filter(s => s.is_active).length;
      if (activeCount <= 1) {
        showToast("⚠️ Cannot deactivate the only active season. Please activate another season instead.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await toggleSoloSeasonActive(id, !currentActive);
        if (res.success) {
          showToast(`✅ Season ${actionText}d successfully.`);
          await loadSeasons();
        }
      } catch (err: any) {
        showToast(`❌ Failed to toggle active status: ${err.message}`);
      }
    });
  };

  const handleDeleteSeason = async (id: number) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }

    startTransition(async () => {
      try {
        const res = await deleteSoloSeason(id);
        if (res.success) {
          showToast("✅ Season deleted successfully.");
          setDeleteConfirmId(null);
          await loadSeasons();
          if (editingSeasonId === id) clearForm();
        }
      } catch (err: any) {
        showToast(`❌ Deletion failed: ${err.message}`);
        setDeleteConfirmId(null);
      }
    });
  };

  const activeSeason = seasons.find((s) => s.is_active);
  const totalSeasonsCount = seasons.length;
  const activeSeasonNum = activeSeason ? `Season ${activeSeason.season_number}` : "None";
  const completedSeasonsCount = seasons.filter((s) => !s.is_active).length;

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && (
        <div className="portal-toast" style={{ zIndex: 9999 }}>
          {toast}
        </div>
      )}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        <div className="portal-header">
          <div className="portal-page-badge">
            <i className="fa-solid fa-calendar-plus" /> Season Controller
          </div>
          <h1 className="portal-title">SEASON MANAGER</h1>
          <p className="portal-subtitle">
            Initialize new seasons, toggle active/completed states, and carry over managers/wallets.
          </p>
        </div>

        {/* Summary Stats Row */}
        <div className="admin-stats-row" style={{ marginBottom: "2rem" }}>
          <div className="admin-stat-card">
            <div className="stat-label">Total Seasons</div>
            <div className="stat-value">{totalSeasonsCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Active Season</div>
            <div className="stat-value" style={{ color: "var(--solo-primary)" }}>{activeSeasonNum}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Completed Seasons</div>
            <div className="stat-value">{completedSeasonsCount}</div>
          </div>
        </div>

        {/* main side-by-side layout */}
        <div className="financial-layout">
          {/* Left Column: Form to create/edit season */}
          <div className="financial-sidebar" style={{ minWidth: "320px" }}>
            <div className="admin-card" style={{ marginTop: 0, padding: "1.5rem" }}>
              <h2 className="admin-card-title">
                <i className={`fa-solid ${editingSeasonId !== null ? 'fa-pen-to-square' : 'fa-folder-plus'}`} style={{ color: "var(--solo-primary)", marginRight: "8px" }} />
                {editingSeasonId !== null ? "Edit Season" : "Create New Season"}
              </h2>
              <form onSubmit={handleSaveSeason}>
                <div className="admin-form-group" style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.5rem", fontWeight: 600 }}>
                    Season Number (e.g. 10)
                  </label>
                  <input
                    type="number"
                    className="admin-input"
                    placeholder="Enter season number"
                    required
                    value={newSeasonNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSeasonNumber(val === "" ? "" : Number(val));
                    }}
                    style={{ width: "100%" }}
                  />
                </div>

                <div className="admin-form-group" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
                  <input
                    type="checkbox"
                    id="hasRws"
                    checked={hasRws}
                    onChange={(e) => setHasRws(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label htmlFor="hasRws" style={{ color: "#f1f5f9", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                    Hosts RWS this season
                  </label>
                </div>

                {hasRws && (
                  <div className="admin-form-group" style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.5rem", fontWeight: 600 }}>
                      RWS Year (e.g. 2026)
                    </label>
                    <input
                      type="number"
                      className="admin-input"
                      placeholder="Enter RWS year"
                      required={hasRws}
                      value={rwsYear}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRwsYear(val === "" ? "" : Number(val));
                      }}
                      style={{ width: "100%" }}
                    />
                  </div>
                )}

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem", marginTop: "1rem" }}>
                  <h3 style={{ fontSize: "0.85rem", color: "#f1f5f9", fontWeight: 600, marginBottom: "0.75rem" }}>
                    Season Starting Bonus
                  </h3>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "1rem" }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <i className="fa-solid fa-coins" style={{ position: "absolute", left: "10px", top: "9px", color: "#eab308", fontSize: "0.8rem" }} />
                      <input
                        type="number"
                        className="admin-input"
                        placeholder="RC"
                        value={startRc}
                        onChange={(e) => setStartRc(parseInt(e.target.value) || 0)}
                        style={{ paddingLeft: "26px", fontSize: "0.8rem", height: "32px", width: "100%" }}
                      />
                    </div>
                    <div style={{ position: "relative", flex: 1 }}>
                      <i className="fa-solid fa-star" style={{ position: "absolute", left: "10px", top: "9px", color: "#3b82f6", fontSize: "0.8rem" }} />
                      <input
                        type="number"
                        className="admin-input"
                        placeholder="RT"
                        value={startRt}
                        onChange={(e) => setStartRt(parseInt(e.target.value) || 0)}
                        style={{ paddingLeft: "26px", fontSize: "0.8rem", height: "32px", width: "100%" }}
                      />
                    </div>
                    <div style={{ position: "relative", flex: 1 }}>
                      <i className="fa-solid fa-ticket" style={{ position: "absolute", left: "10px", top: "9px", color: "#ec4899", fontSize: "0.8rem" }} />
                      <input
                        type="number"
                        className="admin-input"
                        placeholder="V"
                        value={startVoucher}
                        onChange={(e) => setStartVoucher(parseInt(e.target.value) || 0)}
                        style={{ paddingLeft: "26px", fontSize: "0.8rem", height: "32px", width: "100%" }}
                      />
                    </div>
                  </div>

                  <h3 style={{ fontSize: "0.85rem", color: "#f1f5f9", fontWeight: 600, marginBottom: "0.75rem" }}>
                    Season Finale Bonus
                  </h3>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "1rem" }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <i className="fa-solid fa-coins" style={{ position: "absolute", left: "10px", top: "9px", color: "#eab308", fontSize: "0.8rem" }} />
                      <input
                        type="number"
                        className="admin-input"
                        placeholder="RC"
                        value={finaleRc}
                        onChange={(e) => setFinaleRc(parseInt(e.target.value) || 0)}
                        style={{ paddingLeft: "26px", fontSize: "0.8rem", height: "32px", width: "100%" }}
                      />
                    </div>
                    <div style={{ position: "relative", flex: 1 }}>
                      <i className="fa-solid fa-star" style={{ position: "absolute", left: "10px", top: "9px", color: "#3b82f6", fontSize: "0.8rem" }} />
                      <input
                        type="number"
                        className="admin-input"
                        placeholder="RT"
                        value={finaleRt}
                        onChange={(e) => setFinaleRt(parseInt(e.target.value) || 0)}
                        style={{ paddingLeft: "26px", fontSize: "0.8rem", height: "32px", width: "100%" }}
                      />
                    </div>
                    <div style={{ position: "relative", flex: 1 }}>
                      <i className="fa-solid fa-ticket" style={{ position: "absolute", left: "10px", top: "9px", color: "#ec4899", fontSize: "0.8rem" }} />
                      <input
                        type="number"
                        className="admin-input"
                        placeholder="V"
                        value={finaleVoucher}
                        onChange={(e) => setFinaleVoucher(parseInt(e.target.value) || 0)}
                        style={{ paddingLeft: "26px", fontSize: "0.8rem", height: "32px", width: "100%" }}
                      />
                    </div>
                  </div>
                </div>

                {editingSeasonId === null && (
                  <>
                    <div className="admin-form-group" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
                      <input
                        type="checkbox"
                        id="makeActive"
                        checked={makeActive}
                        onChange={(e) => setMakeActive(e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <label htmlFor="makeActive" style={{ color: "#f1f5f9", fontSize: "0.85rem", cursor: "pointer" }}>
                        Make active immediately
                      </label>
                    </div>

                    <div className="admin-form-group" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
                      <input
                        type="checkbox"
                        id="carryOver"
                        checked={carryOver}
                        onChange={(e) => setCarryOver(e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <label htmlFor="carryOver" style={{ color: "#f1f5f9", fontSize: "0.85rem", cursor: "pointer" }}>
                        Carry over wallets & rosters
                      </label>
                    </div>
                  </>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "1rem" }}>
                  <button
                    type="submit"
                    className="portal-btn btn-primary"
                    style={{ width: "100%", justifyContent: "center", height: "42px" }}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "6px" }} />
                        Saving...
                      </>
                    ) : editingSeasonId !== null ? (
                      <>
                        <i className="fa-solid fa-floppy-disk" style={{ marginRight: "6px" }} />
                        Update Season
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-calendar-check" style={{ marginRight: "6px" }} />
                        Create Season
                      </>
                    )}
                  </button>

                  {editingSeasonId !== null && (
                    <button
                      type="button"
                      className="portal-btn btn-secondary"
                      onClick={clearForm}
                      style={{ width: "100%", justifyContent: "center", height: "38px" }}
                      disabled={isPending}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: List of existing seasons */}
          <div className="financial-main">
            <div className="admin-card" style={{ marginTop: 0, padding: "1.5rem" }}>
              <h2 className="admin-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  <i className="fa-solid fa-list-ul" style={{ color: "var(--solo-primary)", marginRight: "8px" }} />
                  Seasons Registry
                </span>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 400 }}>
                  ({seasons.length} records found)
                </span>
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "1rem" }}>
                {seasons.length === 0 ? (
                  <div className="admin-empty">
                    <i className="fa-solid fa-calendar-xmark" />
                    No seasons found in database.
                  </div>
                ) : (
                  seasons.map((season, idx) => {
                    const isDeletingThis = deleteConfirmId === season.id;
                    const isEditingThis = editingSeasonId === season.id;
                    return (
                      <div
                        key={season.id}
                        className="club-select-card"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "1rem 1.25rem",
                          border: isEditingThis 
                            ? "1px solid var(--solo-primary)" 
                            : season.is_active 
                              ? "1px solid rgba(236,72,153,0.3)" 
                              : "1px solid rgba(255,255,255,0.06)",
                          background: isEditingThis
                            ? "rgba(236,72,153,0.05)"
                            : season.is_active 
                              ? "rgba(236,72,153,0.02)" 
                              : "rgba(255,255,255,0.01)",
                          borderRadius: "8px",
                          animationDelay: `${idx * 0.05}s`
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                              Season {season.season_number}
                            </span>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              {season.is_active ? (
                                <span className="badge-active" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px" }}>
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="badge-banned" style={{ background: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.2)", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px" }}>
                                  COMPLETED
                                </span>
                              )}

                              {season.has_rws && season.rws_year && (
                                <span className="badge-active" style={{ background: "rgba(236,72,153,0.1)", color: "#ec4899", border: "1px solid rgba(236,72,153,0.2)", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
                                  🏆 RWS {season.rws_year}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", gap: "12px", fontSize: "0.75rem", color: "#94a3b8", flexWrap: "wrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ color: "#64748b" }}>Start:</span>
                              <span style={{ color: "#eab308" }}><i className="fa-solid fa-coins" /> {season.start_bonus_rc || 0}</span>
                              <span style={{ color: "#3b82f6" }}><i className="fa-solid fa-star" /> {season.start_bonus_rt || 0}</span>
                              <span style={{ color: "#ec4899" }}><i className="fa-solid fa-ticket" /> {season.start_bonus_voucher || 0}</span>
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ color: "#64748b" }}>Finale:</span>
                              <span style={{ color: "#eab308" }}><i className="fa-solid fa-coins" /> {season.finale_bonus_rc || 0}</span>
                              <span style={{ color: "#3b82f6" }}><i className="fa-solid fa-star" /> {season.finale_bonus_rt || 0}</span>
                              <span style={{ color: "#ec4899" }}><i className="fa-solid fa-ticket" /> {season.finale_bonus_voucher || 0}</span>
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEditClick(season)}
                            disabled={isPending}
                            className="portal-btn btn-secondary"
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              height: "32px",
                              background: "rgba(255,255,255,0.06)",
                              color: "#fff"
                            }}
                          >
                            <i className="fa-solid fa-pen-to-square" style={{ marginRight: "4px" }} />
                            Edit
                          </button>

                          <button
                            onClick={() => handleToggleActive(season.id, season.is_active)}
                            disabled={isPending}
                            className={`portal-btn ${season.is_active ? 'btn-secondary' : 'btn-primary'}`}
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              height: "32px",
                              background: season.is_active ? "rgba(255,255,255,0.06)" : "var(--solo-primary)",
                              color: season.is_active ? "#94a3b8" : "#fff"
                            }}
                          >
                            <i className={`fa-solid ${season.is_active ? 'fa-square-check' : 'fa-toggle-on'}`} style={{ marginRight: "4px" }} />
                            {season.is_active ? "Completed" : "Activate"}
                          </button>

                          {!season.is_active && (
                            <button
                              onClick={() => handleDeleteSeason(season.id)}
                              disabled={isPending}
                              className="portal-btn btn-danger"
                              style={{
                                padding: "4px 10px",
                                fontSize: "0.75rem",
                                height: "32px",
                                background: isDeletingThis ? "rgb(239, 68, 68)" : "transparent",
                                borderColor: "rgb(239, 68, 68)",
                                color: isDeletingThis ? "#fff" : "rgb(239, 68, 68)"
                              }}
                            >
                              <i className="fa-solid fa-trash" style={{ marginRight: "4px" }} />
                              {isDeletingThis ? "Confirm" : "Delete"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
