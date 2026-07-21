"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import "../../../../solo-tour/admin/admin.css";
import "../../../../portal.css";

import {
  fetchTransferRequestsList,
  fetchTransferWindows,
  createTransferWindow,
  updateTransferWindowStatus,
  approveTransferRequest,
  rejectTransferRequest,
  fetchActiveSeason
} from "@/utils/solo/serverActions";

export default function AdminTransferRequestsPage() {
  const params = useParams();
  const seasonId = parseInt(params.seasonId as string, 10);

  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [windows, setWindows] = useState<any[]>([]);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"pending" | "accepted" | "approved" | "rejected" | "all">("accepted");
  const [typeFilter, setTypeFilter] = useState<"sale" | "swap" | "all">("all");

  // Create window form state
  const [windowName, setWindowName] = useState("");
  const [windowType, setWindowType] = useState<"start" | "mid">("start");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transferLimit, setTransferLimit] = useState(5);
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
        fetchTransferRequestsList(seasonId),
        fetchTransferWindows(seasonId)
      ]);
      setActiveSeason(season);
      setRequests(reqs || []);
      setWindows(wins || []);
    } catch {
      showToast("Error loading transfer requests details!");
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
      if (typeFilter !== "all" && r.request_type !== typeFilter) return false;
      return true;
    });
  }, [requests, statusFilter, typeFilter]);

  const handleCreateTransferWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!windowName) return showToast("Enter window name!");
    if (!startDate || !endDate) return showToast("Set start and end dates!");

    startTransition(async () => {
      try {
        const res = await createTransferWindow(
          seasonId,
          windowName,
          windowType,
          new Date(startDate).toISOString(),
          new Date(endDate).toISOString(),
          transferLimit,
          isUnlimited
        );

        if (res.success) {
          showToast("Transfer window created successfully!");
          setWindowName("");
          setStartDate("");
          setEndDate("");
          loadData();
        } else {
          showToast(res.error || "Failed to create window.");
        }
      } catch {
        showToast("Error creating transfer window!");
      }
    });
  };

  const handleToggleWindow = async (wId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      try {
        const res = await updateTransferWindowStatus(wId, nextStatus);
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
    if (!confirm("Are you sure you want to approve this transfer/swap request? contracts and coin balances will update.")) return;

    startTransition(async () => {
      try {
        const res = await approveTransferRequest(id);
        if (res.success) {
          showToast("Transfer request approved and processed successfully!");
          loadData();
        } else {
          showToast(res.error || "Failed to approve request.");
        }
      } catch (err: any) {
        showToast(err.message || "Error approving request.");
      }
    });
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;

    startTransition(async () => {
      try {
        const res = await rejectTransferRequest(id, reason || "Rejected by administrator");
        if (res.success) {
          showToast("Transfer request rejected.");
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
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, background: "rgba(234,179,8,0.95)", color: "#000", padding: "12px 24px", borderRadius: "12px", fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <i className="fa-solid fa-circle-check" style={{ marginRight: "8px" }} /> {toast}
        </div>
      )}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        
        {/* Breadcrumb Navigation */}
        <div className="portal-breadcrumb" style={{ marginBottom: "1rem" }}>
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back to Admin Console
          </Link>
          <Link href={`/sub-admin/${seasonId}/tools/release-requests`} className="portal-btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px", marginLeft: "8px" }}>
            <i className="fa-solid fa-angles-down" style={{ marginRight: "6px" }} /> Releases Tool
          </Link>
        </div>

        {/* Hero Banner */}
        <div className="rws-page-hero" style={{ marginBottom: "2rem" }}>
          <div className="portal-page-badge" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>
            <i className="fa-solid fa-arrow-right-arrow-left" />
            Admin Transfer & Swap Console
          </div>
          <h1 className="rws-hero-title">
            TRANSFER REQUESTS TOOL
          </h1>
          <p className="rws-hero-sub">
            Manage transfer windows for player sales and swaps. Review counterpart-accepted deals and execute value swaps or direct transfer sales.
          </p>
        </div>

        <div className="bulk-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "2rem", alignItems: "start" }}>
          
          {/* Left Column: Manage Windows */}
          <div>
            <div className="admin-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", color: "#fff", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <i className="fa-solid fa-calendar-plus" style={{ color: "#eab308" }} />
                Create Transfer Window Stage
              </h3>

              <form onSubmit={handleCreateTransferWindow} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Window Name</label>
                  <input
                    type="text"
                    placeholder="e.g. S9 Mid-Season Transfer Window"
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
                    <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Transaction Limits</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="number"
                        disabled={isUnlimited}
                        value={transferLimit}
                        onChange={(e) => setTransferLimit(Math.max(1, parseInt(e.target.value) || 0))}
                        style={{ width: "60px", padding: "9px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.85rem", opacity: isUnlimited ? 0.3 : 1 }}
                      />
                      <label style={{ fontSize: "0.75rem", color: "#fff", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                        <input type="checkbox" checked={isUnlimited} onChange={(e) => setIsUnlimited(e.target.checked)} style={{ accentColor: "#eab308" }} />
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
                    background: "linear-gradient(135deg, #eab308, #ca8a04)", color: "#000"
                  }}
                >
                  Create & Activate Window
                </button>
              </form>
            </div>

            <div className="admin-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", color: "#fff", marginBottom: "1rem" }}>Created Transfer Windows</h3>

              {loading ? (
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>Loading...</div>
              ) : windows.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>No transfer windows created.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {windows.map(w => {
                    const isActive = w.status === "ACTIVE";
                    return (
                      <div key={w.id} style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.85rem" }}>{w.name}</div>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                            Stage: {w.window_type} &bull; Limits: {w.is_unlimited ? "Unlimited" : `Max ${w.transfer_limit}`}
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

          {/* Right Column: Submitted Requests */}
          <div className="admin-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <h3 style={{ fontSize: "1rem", color: "#fff", margin: 0 }}>Roster Transfer Requests</h3>

              <div style={{ display: "flex", gap: "6px" }}>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  style={{ padding: "6px 12px", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.78rem" }}
                >
                  <option value="all">All Types</option>
                  <option value="sale">Sales</option>
                  <option value="swap">Swaps</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{ padding: "6px 12px", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.78rem" }}
                >
                  <option value="accepted">Accepted (Ready)</option>
                  <option value="pending">Pending Counterpart</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Loading transfer requests...</div>
            ) : filteredRequests.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
                No transfer requests found with status: {statusFilter}.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {filteredRequests.map(r => {
                  const isAccepted = r.status === "accepted";
                  return (
                    <div key={r.id} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "12px", padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "0.5rem" }}>
                        <span style={{
                          fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", padding: "2px 6px", borderRadius: "4px",
                          background: r.request_type === "sale" ? "rgba(59,130,246,0.15)" : "rgba(234,179,8,0.15)",
                          color: r.request_type === "sale" ? "#60a5fa" : "#fbbf24"
                        }}>
                          {r.request_type}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}>
                          Window: {r.window_name}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.85)", marginBottom: "12px" }}>
                        {r.request_type === "sale" ? (
                          <div>
                            Selling <strong>{r.players[0]?.playerName}</strong> from <strong>{r.requesting_team_name}</strong> &rarr; <strong>{r.target_team_name}</strong> for <strong style={{ color: "#fbbf24" }}>{r.price} Coins</strong>.
                          </div>
                        ) : (
                          <div>
                            Swap Deal: <strong>{r.requesting_team_name}</strong> &amp; <strong>{r.target_team_name}</strong>.
                            <ul style={{ listStyleType: "circle", paddingLeft: "1.25rem", margin: "4px 0" }}>
                              {r.players.map((p: any, idx: number) => (
                                <li key={idx}>
                                  {p.playerName} ({p.playerValue} Coins) moves {p.fromTeamId === r.requesting_team_id ? "A &rarr; B" : "B &rarr; A"}
                                </li>
                              ))}
                            </ul>
                            {Number(r.price) !== 0 && (
                              <div style={{ color: "#fbbf24", fontWeight: 600 }}>
                                Cash adjustment: {Number(r.price) > 0 ? `${r.requesting_team_name} pays ${r.price} Coins` : `${r.target_team_name} pays ${Math.abs(Number(r.price))} Coins`}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {isAccepted && (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => handleReject(r.id)}
                            disabled={isPending}
                            style={{ padding: "5px 12px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: "#f87171", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                          >
                            Decline Deal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(r.id)}
                            disabled={isPending}
                            style={{ padding: "5px 12px", borderRadius: "6px", border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.08)", color: "#34d399", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                          >
                            Approve Trade
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
