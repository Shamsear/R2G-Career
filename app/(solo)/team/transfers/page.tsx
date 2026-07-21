"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import "../../solo-tour/admin/admin.css";
import "../../portal.css";

import {
  fetchReleaseRequestsList,
  fetchTransferRequestsList,
  respondToTransferRequest,
  fetchRegisteredClubs,
  fetchActiveSeason
} from "@/utils/solo/serverActions";

export default function PublicTransfersLogPage() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);

  // Filter states
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [stageFilter, setStageFilter] = useState<"all" | "start" | "mid">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "release" | "sale" | "swap">("all");

  // Custom dropdown
  const [clubDDOpen, setClubDDOpen] = useState(false);
  const [clubSearch, setClubSearch] = useState("");

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
      const [season, clubsData, releaseData, transferData] = await Promise.all([
        fetchActiveSeason(),
        fetchRegisteredClubs(),
        fetchReleaseRequestsList(),
        fetchTransferRequestsList()
      ]);
      setActiveSeason(season);
      setClubs(clubsData || []);
      setReleases(releaseData || []);
      setTransfers(transferData || []);
    } catch {
      showToast("Error loading transfer log details!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const clickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-club-dd]")) {
        setClubDDOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const selectedClubObj = useMemo(() => clubs.find(c => String(c.id) === selectedClubId), [clubs, selectedClubId]);
  const filteredDropdownClubs = useMemo(() => clubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase())), [clubs, clubSearch]);

  // Filtered lists
  const filteredReleases = useMemo(() => {
    return releases.filter(r => {
      if (selectedClubId && String(r.club_id) !== selectedClubId) return false;
      if (stageFilter !== "all" && r.window_type !== stageFilter) return false;
      return true;
    });
  }, [releases, selectedClubId, stageFilter]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      if (selectedClubId) {
        if (String(t.requesting_team_id) !== selectedClubId && String(t.target_team_id) !== selectedClubId) return false;
      }
      if (stageFilter !== "all" && t.window_type !== stageFilter) return false;
      if (typeFilter !== "all" && t.request_type !== typeFilter) return false;
      return true;
    });
  }, [transfers, selectedClubId, stageFilter, typeFilter]);

  // Incoming pending requests targeting the selected club
  const incomingPendingRequests = useMemo(() => {
    if (!selectedClubId) return [];
    return transfers.filter(t =>
      String(t.target_team_id) === selectedClubId && t.status === "pending"
    );
  }, [transfers, selectedClubId]);

  const handleRespond = (requestId: number, action: "accepted" | "rejected") => {
    let reason = "";
    if (action === "rejected") {
      const input = prompt("Enter reason for declining the trade request:");
      if (input === null) return; // cancelled prompt
      reason = input || "Declined by counterpart team manager";
    }

    startTransition(async () => {
      try {
        const res = await respondToTransferRequest(requestId, action, reason);
        if (res.success) {
          showToast(`Trade request successfully ${action}!`);
          loadData();
        } else {
          showToast(res.error || "Failed to submit response.");
        }
      } catch {
        showToast("Error submitting trade response.");
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

      <div className="portal-container" style={{ maxWidth: "1000px" }}>
        
        {/* Navigation Breadcrumbs */}
        <div className="portal-breadcrumb" style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem" }}>
          <Link href="/team/release-request" className="portal-btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fa-solid fa-angles-down" style={{ marginRight: "6px" }} /> Submit Release
          </Link>
          <Link href="/team/transfer-request" className="portal-btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fa-solid fa-arrow-right-arrow-left" style={{ marginRight: "6px" }} /> Submit Transfer/Swap
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero" style={{ marginBottom: "2rem" }}>
          <div className="portal-page-badge" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
            <i className="fa-solid fa-receipt" />
            Public Completed & Pending Transfers
          </div>
          <h1 className="rws-hero-title">
            TRANSFERS & SWAPS LOG
          </h1>
          <p className="rws-hero-sub">
            Track and monitor completed releases, swaps, and transfers. Counterpart team managers can also review and accept trade requests.
          </p>
        </div>

        {/* Interactive filters card */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.9rem", color: "#fff", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Filter Transactions</h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            {/* Custom dropdown: Choose club */}
            <div style={{ position: "relative" }} data-club-dd>
              <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Filter by Club</label>
              <div
                style={{
                  padding: "10px 12px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#fff", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer"
                }}
                onClick={() => setClubDDOpen(prev => !prev)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {selectedClubObj?.logo_path && <img src={selectedClubObj.logo_path} alt="" style={{ width: "16px", height: "16px", objectFit: "contain" }} />}
                  <span style={{ color: selectedClubId ? "#fff" : "rgba(255,255,255,0.4)" }}>
                    {selectedClubObj ? selectedClubObj.name : "All Clubs"}
                  </span>
                </div>
                <i className={`fa-solid fa-chevron-${clubDDOpen ? "up" : "down"}`} style={{ fontSize: "0.7rem", opacity: 0.6 }} />
              </div>

              {clubDDOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 12, background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden", marginTop: "6px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                  <div style={{ padding: "6px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <input
                      type="text"
                      placeholder="Search club..."
                      value={clubSearch}
                      onChange={(e) => setClubSearch(e.target.value)}
                      style={{ width: "100%", padding: "6px 10px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "#fff", fontSize: "0.78rem", outline: "none", boxSizing: "border-box" }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div style={{ maxHeight: "160px", overflowY: "auto" }}>
                    <div
                      onClick={() => { setSelectedClubId(""); setClubDDOpen(false); }}
                      style={{ padding: "8px 12px", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}
                    >
                      All Clubs
                    </div>
                    {filteredDropdownClubs.map(c => (
                      <div
                        key={c.id}
                        onClick={() => { setSelectedClubId(c.id.toString()); setClubDDOpen(false); }}
                        style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid rgba(255,255,255,0.02)", fontSize: "0.8rem" }}
                      >
                        {c.logo_path && <img src={c.logo_path} alt="" style={{ width: "14px", height: "14px", objectFit: "contain" }} />}
                        <span style={{ color: "#fff" }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stage filter */}
            <div>
              <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Season Stage</label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as any)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.82rem" }}
              >
                <option value="all">All Stages</option>
                <option value="start">Season Start</option>
                <option value="mid">Mid-Season</option>
              </select>
            </div>

            {/* Type filter */}
            <div>
              <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Transaction Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.82rem" }}
              >
                <option value="all">All Types</option>
                <option value="release">Releases</option>
                <option value="sale">Transfer Sales</option>
                <option value="swap">Swaps</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION: Pending Action requests targeting your team */}
        {selectedClubId && incomingPendingRequests.length > 0 && (
          <div style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", color: "#fbbf24", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
              <i className="fa-solid fa-circle-exclamation animate-pulse" />
              Incoming Action Trade Requests ({incomingPendingRequests.length})
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {incomingPendingRequests.map((t) => (
                <div key={t.id} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#fbbf24", fontWeight: 700, textTransform: "uppercase", background: "rgba(234,179,8,0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                      Incoming {t.request_type}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                      From: {t.requesting_team_name}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.8)", marginBottom: "12px" }}>
                    {t.request_type === "sale" ? (
                      <span>
                        Request to buy your player <strong>{t.players[0]?.playerName}</strong> for <strong>{t.price} Coins</strong>.
                      </span>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 600 }}>Swap Configuration:</div>
                        <ul style={{ listStyleType: "circle", paddingLeft: "1.25rem", margin: "4px 0" }}>
                          {t.players.map((p: any, idx: number) => (
                            <li key={idx}>
                              {p.playerName} moving from <strong>{p.fromTeamId === t.requesting_team_id ? t.requesting_team_name : "Your Team"}</strong> &rarr; <strong>{p.toTeamId === t.target_team_id ? "Your Team" : t.requesting_team_name}</strong>
                            </li>
                          ))}
                        </ul>
                        {Number(t.price) !== 0 && (
                          <div style={{ color: "#fbbf24", fontWeight: 600, marginTop: "4px" }}>
                            Cash adjustment: {Number(t.price) > 0 ? `${t.requesting_team_name} pays you ${t.price} Coins` : `You pay ${Math.abs(Number(t.price))} Coins`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => handleRespond(t.id, "rejected")}
                      style={{ padding: "6px 14px", background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespond(t.id, "accepted")}
                      style={{ padding: "6px 14px", background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                    >
                      Accept Trade
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRANSACTION LOG TABLES */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "1.5rem", overflowX: "auto" }}>
          
          <h3 style={{ fontSize: "1rem", color: "#fff", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <i className="fa-solid fa-list-check" style={{ color: "#10b981" }} />
            Completed & Processed Transactions
          </h3>

          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Loading transactions log...</div>
          ) : (
            <div>
              {/* Combine releases and transfers into a unified timeline sorted by date */}
              {(() => {
                const combinedList = [
                  ...filteredReleases.map(r => ({ ...r, unifiedType: "release" })),
                  ...filteredTransfers.map(t => ({ ...t, unifiedType: t.request_type }))
                ].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

                const filteredCombined = combinedList.filter(item => {
                  if (typeFilter !== "all" && item.unifiedType !== typeFilter) return false;
                  return true;
                });

                if (filteredCombined.length === 0) {
                  return (
                    <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                      No transfer log records found matching the filters.
                    </div>
                  );
                }

                return (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ color: "var(--text-secondary)", fontSize: "0.68rem", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Date</th>
                        <th style={{ padding: "0.75rem 0.5rem", textAlign: "left" }}>Type</th>
                        <th style={{ padding: "0.75rem 0.5rem", textAlign: "left" }}>Details</th>
                        <th style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>Stage</th>
                        <th style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>Cost/Refund</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCombined.map((item: any) => {
                        const dateStr = new Date(item.submitted_at).toLocaleDateString();
                        const isApproved = item.status === "approved";
                        const isRejected = item.status === "rejected" || item.status === "declined";

                        let statusColor = "#fbbf24"; // pending
                        if (isApproved) statusColor = "#34d399";
                        if (isRejected) statusColor = "#f87171";

                        return (
                          <tr key={item.id + "-" + item.unifiedType} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", color: "rgba(255,255,255,0.5)" }}>
                              {dateStr}
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem" }}>
                              <span style={{
                                fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", padding: "2px 6px", borderRadius: "4px",
                                background: item.unifiedType === "release" ? "rgba(168,85,247,0.15)" : item.unifiedType === "sale" ? "rgba(59,130,246,0.15)" : "rgba(234,179,8,0.15)",
                                color: item.unifiedType === "release" ? "#c084fc" : item.unifiedType === "sale" ? "#60a5fa" : "#fbbf24"
                              }}>
                                {item.unifiedType}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem" }}>
                              {item.unifiedType === "release" ? (
                                <div>
                                  Released <strong>{item.player_name}</strong> from <strong>{item.club_name}</strong>
                                </div>
                              ) : item.unifiedType === "sale" ? (
                                <div>
                                  Sold <strong>{item.players[0]?.playerName}</strong> &bull; <strong>{item.requesting_team_name}</strong> &rarr; <strong>{item.target_team_name}</strong>
                                </div>
                              ) : (
                                <div>
                                  Swap: <strong>{item.requesting_team_name}</strong> &amp; <strong>{item.target_team_name}</strong>
                                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                                    Players: {item.players.map((p: any) => p.playerName).join(" &harr; ")}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", textTransform: "capitalize", color: "rgba(255,255,255,0.7)" }}>
                              {item.window_type}
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", fontWeight: 700, color: item.unifiedType === "release" ? "#34d399" : "#fbbf24" }}>
                              {item.unifiedType === "release" ? "+" : ""}{item.refund_amount || item.price} Coins
                            </td>
                            <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: statusColor, textTransform: "uppercase" }}>
                              {item.status}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
