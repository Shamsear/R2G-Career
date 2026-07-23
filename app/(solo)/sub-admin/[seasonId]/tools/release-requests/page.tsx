"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import "../../../../solo-tour/admin/admin.css";
import "../../../../../portal.css";

import CustomSelect from "@/components/ui/CustomSelect";
import {
  fetchReleaseRequestsList,
  fetchReleaseWindows,
  createReleaseWindow,
  updateReleaseWindowStatus,
  approveReleaseRequest,
  rejectReleaseRequest,
  fetchActiveSeason
} from "@/utils/solo/serverActions";

export default function AdminReleaseRequestsPage() {
  const params = useParams();
  const seasonId = parseInt(params.seasonId as string, 10);

  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [windows, setWindows] = useState<any[]>([]);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  // Create window form state
  const [windowName, setWindowName] = useState("");
  const [windowType, setWindowType] = useState<"start" | "mid">("start");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [releaseLimit, setReleaseLimit] = useState(3);
  const [isUnlimited, setIsUnlimited] = useState(false);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [season, reqs, wins] = await Promise.all([
        fetchActiveSeason(),
        fetchReleaseRequestsList(seasonId),
        fetchReleaseWindows(seasonId)
      ]);
      setActiveSeason(season);
      setRequests(reqs || []);
      setWindows(wins || []);
    } catch {
      showToast("Error loading release request details!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [seasonId]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [requests, statusFilter]);

  const handleCreateReleaseWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!windowName) return showToast("Enter window name!");
    if (!startDate || !endDate) return showToast("Set start and end dates!");

    startTransition(async () => {
      try {
        const res = await createReleaseWindow(
          seasonId,
          windowName,
          windowType,
          new Date(startDate).toISOString(),
          new Date(endDate).toISOString(),
          releaseLimit,
          isUnlimited
        );

        if (res.success) {
          showToast("Release window created successfully!");
          setWindowName("");
          setStartDate("");
          setEndDate("");
          loadData();
        } else {
          showToast(res.error || "Failed to create window.");
        }
      } catch {
        showToast("Error creating release window!");
      }
    });
  };

  const handleToggleWindow = async (wId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      try {
        const res = await updateReleaseWindowStatus(wId, nextStatus);
        if (res.success) {
          showToast(`Window status changed to ${nextStatus}!`);
          loadData();
        } else {
          showToast(res.error || "Failed to update window status.");
        }
      } catch {
        showToast("Error toggling status.");
      }
    });
  };

  const handleApprove = async (id: number) => {
    if (!confirm("Are you sure you want to approve this player release? Coins will be refunded to team wallet.")) return;

    startTransition(async () => {
      try {
        const res = await approveReleaseRequest(id);
        if (res.success) {
          showToast(`Release approved! Refund: ${res.refundAmount} Coins.`);
          loadData();
        } else {
          showToast(res.error || "Failed to approve release request.");
        }
      } catch (err: any) {
        showToast(err.message || "Error approving request.");
      }
    });
  };

  const handleReject = async (id: number) => {
    if (!confirm("Are you sure you want to reject this player release?")) return;

    startTransition(async () => {
      try {
        const res = await rejectReleaseRequest(id);
        if (res.success) {
          showToast("Release request rejected.");
          loadData();
        } else {
          showToast(res.error || "Failed to reject request.");
        }
      } catch {
        showToast("Error rejecting request.");
      }
    });
  };

  return (
    <div className="portal-root-wrapper" data-module="tournaments">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, background: "rgba(168,85,247,0.95)", backdropFilter: "blur(12px)", color: "#fff", padding: "12px 24px", borderRadius: "12px", fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: "10px" }}>
          <i className="fa-solid fa-circle-check" style={{ color: "#fbbf24" }} /> {toast}
        </div>
      )}

      <div className="portal-container" style={{ maxWidth: "1600px", width: "100%", margin: "0 auto", padding: "1.5rem 1.5rem" }}>
        
        {/* Navigation Breadcrumbs */}
        <div className="portal-breadcrumb" style={{ marginBottom: "1.25rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "7px 14px", borderRadius: "8px" }}>
            <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back to Admin Console
          </Link>
          <Link href={`/sub-admin/${seasonId}/tools/transfer-requests`} className="portal-btn btn-secondary" style={{ fontSize: "0.8rem", padding: "7px 14px", borderRadius: "8px" }}>
            <i className="fa-solid fa-arrow-right-arrow-left" style={{ marginRight: "6px", color: "#eab308" }} /> Transfers Tool
          </Link>
        </div>

        {/* Hero Banner */}
        <div className="rws-page-hero" style={{ marginBottom: "2rem", padding: "1.75rem 2rem", background: "linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(15,12,27,0.9) 100%)", borderRadius: "16px", border: "1px solid rgba(168,85,247,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
          <div className="portal-page-badge" style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "0.75rem", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700 }}>
            <i className="fa-solid fa-angles-down" />
            Season {activeSeason?.season_number || seasonId} Control Center
          </div>
          <h1 className="rws-hero-title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.5rem)", fontWeight: 900, background: "linear-gradient(135deg, #fff 0%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 0.5rem 0" }}>
            RELEASE REQUESTS TOOL
          </h1>
          <p className="rws-hero-sub" style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.92rem", maxWidth: "900px", margin: 0, lineHeight: 1.5 }}>
            Open or close release window stages (Season Start / Mid-Season), configure quota limits or enable unlimited player releases, and approve or decline manager decommit requests.
          </p>
        </div>

        {/* Responsive 2-Column Responsive Layout Optimized for Large Screens */}
        <div className="admin-tools-grid" style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(400px, 1.35fr)", gap: "2rem", alignItems: "start" }}>
          
          {/* Left Column: Manage Release Windows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Create window form card */}
            <div className="admin-card" style={{ padding: "1.5rem", borderRadius: "16px" }}>
              <h3 className="admin-card-title" style={{ fontSize: "1.05rem", color: "#fff", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.55rem" }}>
                <i className="fa-solid fa-calendar-plus" style={{ color: "#c084fc" }} />
                Create Release Window Stage
              </h3>

              <form onSubmit={handleCreateReleaseWindow} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Window Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Season 9 Start Release Window"
                    value={windowName}
                    onChange={(e) => setWindowName(e.target.value)}
                    className="admin-input"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Window Stage</label>
                    <CustomSelect
                      value={windowType}
                      onChange={(val) => setWindowType(val as any)}
                      options={[
                        { value: "start", label: "Season Start" },
                        { value: "mid", label: "Mid-Season" }
                      ]}
                      buttonStyle={{ width: "100%", justifyContent: "space-between", height: "42px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Request Limits</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "42px" }}>
                      <input
                        type="number"
                        disabled={isUnlimited}
                        value={releaseLimit}
                        onChange={(e) => setReleaseLimit(Math.max(1, parseInt(e.target.value) || 0))}
                        className="admin-input"
                        style={{ width: "65px", padding: "8px 10px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem", textAlign: "center", opacity: isUnlimited ? 0.3 : 1 }}
                      />
                      <label style={{ fontSize: "0.78rem", color: "#fff", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }}>
                        <input type="checkbox" checked={isUnlimited} onChange={(e) => setIsUnlimited(e.target.checked)} style={{ accentColor: "#a855f7", width: "15px", height: "15px" }} />
                        Unlimited
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Start Date</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="admin-input"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.8rem", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>End Date</label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="admin-input"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.8rem", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="portal-btn btn-primary"
                  style={{
                    marginTop: "0.5rem",
                    padding: "12px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
                    fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase",
                    background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff",
                    boxShadow: "0 4px 15px rgba(168, 85, 247, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                  }}
                >
                  <i className="fa-solid fa-plus-circle" /> Create &amp; Activate Window
                </button>
              </form>
            </div>

            {/* Created windows history list */}
            <div className="admin-card" style={{ padding: "1.5rem", borderRadius: "16px" }}>
              <h3 className="admin-card-title" style={{ fontSize: "1.05rem", color: "#fff", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.55rem" }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ color: "#c084fc" }} />
                Release Windows History
              </h3>

              {loading ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "8px" }} /> Loading windows...
                </div>
              ) : windows.length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", background: "rgba(0,0,0,0.2)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
                  <i className="fa-solid fa-calendar-xmark" style={{ display: "block", fontSize: "1.5rem", marginBottom: "8px", opacity: 0.5 }} />
                  No release windows created yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {windows.map(w => {
                    const isActive = w.status === "ACTIVE";
                    return (
                      <div key={w.id} style={{ background: isActive ? "rgba(168,85,247,0.08)" : "rgba(0,0,0,0.25)", border: isActive ? "1px solid rgba(168,85,247,0.3)" : "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px" }}>
                            {w.name}
                          </div>
                          <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.5)", display: "inline-block", marginTop: "2px" }}>
                            Stage: <strong style={{ color: "#c084fc" }}>{w.window_type}</strong> &bull; Quota: <strong style={{ color: "#fbbf24" }}>{w.is_unlimited ? "Unlimited" : `Max ${w.release_limit}`}</strong>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleWindow(w.id, w.status)}
                          style={{
                            padding: "6px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700,
                            background: isActive ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)",
                            color: isActive ? "#34d399" : "rgba(255,255,255,0.5)",
                            boxShadow: isActive ? "0 0 10px rgba(16,185,129,0.2)" : "none",
                            transition: "all 0.2s ease"
                          }}
                        >
                          {isActive ? <i className="fa-solid fa-circle-check" style={{ marginRight: "4px" }} /> : <i className="fa-solid fa-circle-pause" style={{ marginRight: "4px" }} />}
                          {w.status}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Submitted Request List */}
          <div className="admin-card" style={{ padding: "1.5rem", borderRadius: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <h3 className="admin-card-title" style={{ fontSize: "1.05rem", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.55rem" }}>
                <i className="fa-solid fa-list-check" style={{ color: "#c084fc" }} />
                Submitted Release Requests
              </h3>
              
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                options={[
                  { value: "pending", label: "Pending Requests" },
                  { value: "approved", label: "Approved Releases" },
                  { value: "rejected", label: "Rejected Requests" },
                  { value: "all", label: "All Statuses" }
                ]}
                menuWidth={180}
              />
            </div>

            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ display: "block", marginBottom: "12px", color: "#c084fc" }} />
                Loading release requests...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div style={{ padding: "3rem 1.5rem", textAlign: "center", background: "rgba(0,0,0,0.2)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
                <i className="fa-solid fa-folder-open" style={{ display: "block", fontSize: "2rem", marginBottom: "10px", color: "rgba(168,85,247,0.4)" }} />
                No release requests found with status filter: <strong style={{ color: "#fbbf24" }}>{statusFilter}</strong>.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {filteredRequests.map(r => {
                  const isPendingStatus = r.status === "pending";
                  const isApproved = r.status === "approved";
                  return (
                    <div key={r.id} style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.3) 100%)", border: isApproved ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "1.2rem", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {r.club_logo && <img src={r.club_logo} alt="" style={{ width: "22px", height: "22px", objectFit: "contain" }} />}
                          <strong style={{ color: "#fff", fontSize: "0.9rem" }}>{r.club_name}</strong>
                        </div>
                        <span style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: "6px", background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.2)" }}>
                          <i className="fa-solid fa-calendar-days" style={{ marginRight: "4px" }} /> {r.window_name}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", background: "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: "10px" }}>
                        <div>
                          <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.95rem" }}>{r.player_name}</div>
                          <span style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.5)" }}>
                            Stage: <strong style={{ color: "#c084fc" }}>{r.window_type}</strong>
                          </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#34d399", display: "flex", alignItems: "center", gap: "5px", justifyContent: "flex-end" }}>
                            <i className="fa-solid fa-coins" style={{ color: "#fbbf24", fontSize: "0.8rem" }} />
                            +{r.refund_amount} Coins
                          </span>
                          <span style={{ display: "block", fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>Wallet Refund</span>
                        </div>
                      </div>

                      {isPendingStatus ? (
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                          <button
                            type="button"
                            onClick={() => handleReject(r.id)}
                            disabled={isPending}
                            style={{ padding: "7px 16px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.12)", color: "#f87171", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, transition: "all 0.2s ease" }}
                          >
                            <i className="fa-solid fa-xmark" style={{ marginRight: "4px" }} /> Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(r.id)}
                            disabled={isPending}
                            style={{ padding: "7px 16px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#fff", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, boxShadow: "0 4px 12px rgba(16,185,129,0.3)", transition: "all 0.2s ease" }}
                          >
                            <i className="fa-solid fa-check" style={{ marginRight: "4px" }} /> Approve Release
                          </button>
                        </div>
                      ) : (
                        <div style={{ textAlign: "right", marginTop: "6px" }}>
                          <span style={{
                            fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", padding: "3px 10px", borderRadius: "6px",
                            background: r.status === "approved" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                            color: r.status === "approved" ? "#34d399" : "#f87171"
                          }}>
                            {r.status === "approved" ? <i className="fa-solid fa-circle-check" style={{ marginRight: "4px" }} /> : <i className="fa-solid fa-circle-xmark" style={{ marginRight: "4px" }} />}
                            {r.status}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
