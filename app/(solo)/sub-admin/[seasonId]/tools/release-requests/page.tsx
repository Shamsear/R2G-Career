"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import "../../../../solo-tour/admin/admin.css";
import "../../../../portal.css";

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
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, background: "rgba(168,85,247,0.95)", color: "#fff", padding: "12px 24px", borderRadius: "12px", fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <i className="fa-solid fa-circle-check" style={{ marginRight: "8px" }} /> {toast}
        </div>
      )}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        
        {/* Navigation Breadcrumbs */}
        <div className="portal-breadcrumb" style={{ marginBottom: "1rem" }}>
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back to Admin Console
          </Link>
          <Link href={`/sub-admin/${seasonId}/tools/swap-requests`} className="portal-btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px", marginLeft: "8px" }}>
            <i className="fa-solid fa-arrow-right-arrow-left" style={{ marginRight: "6px" }} /> Swaps Tool
          </Link>
        </div>

        {/* Hero Banner */}
        <div className="rws-page-hero" style={{ marginBottom: "2rem" }}>
          <div className="portal-page-badge" style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}>
            <i className="fa-solid fa-angles-down" />
            Admin Release Control Center
          </div>
          <h1 className="rws-hero-title">
            RELEASE REQUESTS TOOL
          </h1>
          <p className="rws-hero-sub">
            Open or close release window stages (Start/Mid-Season), configure request limits or unlimited status, and approve/decline player decommit requests.
          </p>
        </div>

        <div className="bulk-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "2rem", alignItems: "start" }}>
          
          {/* Left Column: Manage Release Windows */}
          <div>
            {/* Create window form */}
            <div className="admin-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", color: "#fff", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <i className="fa-solid fa-calendar-plus" style={{ color: "#a855f7" }} />
                Create Release Window Stage
              </h3>

              <form onSubmit={handleCreateReleaseWindow} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Window Name</label>
                  <input
                    type="text"
                    placeholder="e.g. S9 Start Release Window"
                    value={windowName}
                    onChange={(e) => setWindowName(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Window Stage</label>
                    <select
                      value={windowType}
                      onChange={(e) => setWindowType(e.target.value as any)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.85rem" }}
                    >
                      <option value="start">Season Start</option>
                      <option value="mid">Mid-Season</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Request Limits</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="number"
                        disabled={isUnlimited}
                        value={releaseLimit}
                        onChange={(e) => setReleaseLimit(Math.max(1, parseInt(e.target.value) || 0))}
                        style={{ width: "60px", padding: "9px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.85rem", opacity: isUnlimited ? 0.3 : 1 }}
                      />
                      <label style={{ fontSize: "0.75rem", color: "#fff", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                        <input type="checkbox" checked={isUnlimited} onChange={(e) => setIsUnlimited(e.target.checked)} style={{ accentColor: "#a855f7" }} />
                        Unlimited
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Start Date</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.8rem", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>End Date</label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.8rem", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    padding: "11px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
                    fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase",
                    background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff"
                  }}
                >
                  Create & Activate Window
                </button>
              </form>
            </div>

            {/* Created windows history list */}
            <div className="admin-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", color: "#fff", marginBottom: "1rem" }}>Created Release Windows</h3>

              {loading ? (
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>Loading...</div>
              ) : windows.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>No release windows have been created.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {windows.map(w => {
                    const isActive = w.status === "ACTIVE";
                    return (
                      <div key={w.id} style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.85rem" }}>{w.name}</div>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                            Stage: {w.window_type} &bull; Limits: {w.is_unlimited ? "Unlimited" : `Max ${w.release_limit}`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleWindow(w.id, w.status)}
                          style={{
                            padding: "4px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700,
                            background: isActive ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
                            color: isActive ? "#34d399" : "rgba(255,255,255,0.4)"
                          }}
                        >
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
          <div className="admin-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <h3 style={{ fontSize: "1rem", color: "#fff", margin: 0 }}>Submitted Release Requests</h3>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{ padding: "6px 12px", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.78rem" }}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Requests</option>
              </select>
            </div>

            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Loading requests...</div>
            ) : filteredRequests.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
                No release requests found with status: {statusFilter}.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {filteredRequests.map(r => {
                  const isPendingStatus = r.status === "pending";
                  return (
                    <div key={r.id} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "12px", padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {r.club_logo && <img src={r.club_logo} alt="" style={{ width: "16px", height: "16px", objectFit: "contain" }} />}
                          <strong style={{ color: "#fff", fontSize: "0.82rem" }}>{r.club_name}</strong>
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}>
                          Window: {r.window_name}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.88rem" }}>{r.player_name}</div>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                            Stage: {r.window_type}
                          </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#34d399" }}>
                            {r.refund_amount} Coins
                          </span>
                          <span style={{ display: "block", fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>Refund Amount</span>
                        </div>
                      </div>

                      {isPendingStatus && (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => handleReject(r.id)}
                            disabled={isPending}
                            style={{ padding: "5px 12px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: "#f87171", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(r.id)}
                            disabled={isPending}
                            style={{ padding: "5px 12px", borderRadius: "6px", border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.08)", color: "#34d399", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                          >
                            Approve Release
                          </button>
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
