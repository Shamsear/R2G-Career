"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import "../../solo-tour/admin/admin.css";
import "../../../portal.css";

import {
  fetchActiveReleaseWindow,
  fetchRegisteredClubs,
  fetchClubPlayersWithContracts,
  submitReleaseRequest,
  fetchActiveSeason,
  fetchReleaseRequestsList
} from "@/utils/solo/serverActions";

export default function PublicReleasePage() {
  const [activeWindow, setActiveWindow] = useState<any>(null);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [squadPlayers, setSquadPlayers] = useState<any[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Custom dropdown states
  const [clubDropdownOpen, setClubDropdownOpen] = useState(false);
  const [clubSearch, setClubSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [windowData, seasonData, clubsData] = await Promise.all([
        fetchActiveReleaseWindow(),
        fetchActiveSeason(),
        fetchRegisteredClubs()
      ]);
      setActiveWindow(windowData);
      setActiveSeason(seasonData);
      setClubs(clubsData || []);
    } catch {
      showToast("Error loading release window data!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Click outside listener to close custom dropdown
    const clickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-club-dd]")) {
        setClubDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  // Load squad players & history when club is selected
  const loadSquadAndHistory = async (clubId: string) => {
    if (clubId && activeSeason) {
      setLoadingPlayers(true);
      setSelectedPlayerIds([]);
      try {
        const [playersData, historyData] = await Promise.all([
          fetchClubPlayersWithContracts(parseInt(clubId), activeSeason.id),
          fetchReleaseRequestsList(activeSeason.id)
        ]);
        setSquadPlayers(playersData || []);
        // Filter history for this club
        setHistory((historyData || []).filter((h: any) => String(h.club_id) === clubId));
      } catch {
        showToast("Failed to load team squad and history!");
      } finally {
        setLoadingPlayers(false);
      }
    } else {
      setSquadPlayers([]);
      setSelectedPlayerIds([]);
      setHistory([]);
    }
  };

  useEffect(() => {
    loadSquadAndHistory(selectedClubId);
  }, [selectedClubId, activeSeason]);

  const selectedClub = useMemo(() => {
    return clubs.find(c => String(c.id) === selectedClubId);
  }, [clubs, selectedClubId]);

  const filteredClubs = useMemo(() => {
    return clubs.filter(c =>
      c.name.toLowerCase().includes(clubSearch.toLowerCase())
    );
  }, [clubs, clubSearch]);

  // Compute remaining contract duration and refund values
  const currentSeasonNum = activeSeason ? Number(activeSeason.season_number) : 9.0;
  const timingOffset = activeWindow?.window_type === "mid" ? 0.5 : 0;
  const releaseSeasonNum = currentSeasonNum + timingOffset;

  const squadWithRefunds = useMemo(() => {
    const parseSeasonNum = (val: string) => {
      const cleaned = val.replace(/[^\d.]/g, '');
      return parseFloat(cleaned) || 0.0;
    };

    return squadPlayers.map((p) => {
      const baseValue = Number(p.base_value || p.value) || 0;
      const startSeasonNum = parseSeasonNum(p.start_season || '');
      const expireSeasonNum = parseSeasonNum(p.expire_season || '');
      const remainingDuration = expireSeasonNum - releaseSeasonNum;
      
      const refundAmount = remainingDuration >= 1.0 ? Math.round(baseValue * 0.5) : 0;

      return {
        ...p,
        remainingDuration,
        refundAmount
      };
    });
  }, [squadPlayers, releaseSeasonNum]);

  const handleTogglePlayer = (id: number) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedPlayerIds.length === squadPlayers.length) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(squadPlayers.map(p => p.id));
    }
  };

  const totalRefund = useMemo(() => {
    return selectedPlayerIds.reduce((sum, pId) => {
      const p = squadWithRefunds.find(pl => pl.id === pId);
      return sum + (p ? p.refundAmount : 0);
    }, 0);
  }, [selectedPlayerIds, squadWithRefunds]);

  // Generate shareable WhatsApp copy text
  const shareText = useMemo(() => {
    if (!selectedClub || selectedPlayerIds.length === 0) return "";
    const clubNameStr = selectedClub.name;
    const lines = selectedPlayerIds.map((pId) => {
      const p = squadWithRefunds.find(pl => pl.id === pId);
      return `• *${p?.name}* (${p?.position}, Value: ${p?.value || p?.base_value} Coins) → Refund: *${p?.refundAmount} Coins*`;
    });
    return `*${clubNameStr.toUpperCase()} - PLAYER RELEASE REQUEST*\n\n${lines.join("\n")}\n\n*Total Refund expected:* ${totalRefund} Coins\n*Submitted via R2G Career Portal*`;
  }, [selectedClub, selectedPlayerIds, squadWithRefunds, totalRefund]);

  const handleCopyToClipboard = () => {
    if (!shareText) return;
    navigator.clipboard.writeText(shareText);
    showToast("Release details copied to clipboard!");
  };

  // Copy History List
  const handleCopyHistory = () => {
    if (history.length === 0 || !selectedClub) return;
    const lines = history.map((h: any) => {
      const date = new Date(h.submitted_at).toLocaleDateString();
      return `• [${date}] ${h.player_name} - ${h.refund_amount} Coins [${h.status.toUpperCase()}]`;
    });
    const txt = `*${selectedClub.name.toUpperCase()} - RELEASE HISTORY*\n\n${lines.join("\n")}`;
    navigator.clipboard.writeText(txt);
    showToast("History copied to clipboard!");
  };

  const handleSubmitReleases = async () => {
    if (!activeWindow) return showToast("No active release window open.");
    if (selectedPlayerIds.length === 0) return showToast("Select at least one player to release!");

    startTransition(async () => {
      try {
        let successCount = 0;
        let failMessage = "";

        for (const pId of selectedPlayerIds) {
          const playerObj = squadWithRefunds.find(pl => pl.id === pId);
          const refund = playerObj ? playerObj.refundAmount : 0;
          const res = await submitReleaseRequest(Number(selectedClubId), pId, refund, activeWindow.id);
          if (res.success) {
            successCount++;
          } else {
            failMessage = res.error || "Failed to submit release.";
          }
        }

        if (successCount > 0) {
          showToast(`Successfully submitted ${successCount} release requests for approval!`);
          setSelectedPlayerIds([]);
          loadSquadAndHistory(selectedClubId);
        } else {
          showToast(failMessage || "Failed to submit request.");
        }
      } catch (err) {
        showToast("Error submitting request.");
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
          <i className="fa-solid fa-circle-info" style={{ marginRight: "8px" }} /> {toast}
        </div>
      )}

      <div className="portal-container" style={{ maxWidth: "900px" }}>
        
        {/* Navigation links */}
        <div className="portal-breadcrumb" style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem" }}>
          <Link href="/team/transfers" className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fa-solid fa-receipt" style={{ marginRight: "6px" }} /> Transfers log
          </Link>
          <Link href="/team/transfer-request" className="portal-btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fa-solid fa-arrow-right-arrow-left" style={{ marginRight: "6px" }} /> Transfer/Swap Page
          </Link>
        </div>

        {/* Hero Banner */}
        <div className="rws-page-hero" style={{ marginBottom: "2rem" }}>
          <div className="portal-page-badge" style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}>
            <i className="fa-solid fa-angles-down" />
            Player Release Submissions
          </div>
          <h1 className="rws-hero-title">
            RELEASE SQUAD PLAYER
          </h1>
          <p className="rws-hero-sub">
            Decommit players from your roster in exchange for coin refunds. Refund values are based on remaining contract duration (contracts with 1.0+ seasons remaining receive a 50% refund).
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            Loading release console settings...
          </div>
        ) : !activeWindow ? (
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "16px", padding: "2.5rem", textAlign: "center", color: "#f87171" }}>
            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.8 }} />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Window is Currently Closed</h3>
            <p style={{ fontSize: "0.88rem", opacity: 0.8, maxWidth: "420px", margin: "0 auto" }}>
              No player release windows are currently active for this season. Please check back when administrators open the transfer window.
            </p>
          </div>
        ) : (
          <div>
            {/* Window info header */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>Active Window Stage</span>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                  <span style={{ background: "rgba(168,85,247,0.2)", color: "#a855f7", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "6px", textTransform: "uppercase" }}>
                    {activeWindow.window_type} Season
                  </span>
                  <span>{activeWindow.name}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>Release Limits</span>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#eab308", marginTop: "3px" }}>
                  {activeWindow.is_unlimited ? (
                    <><i className="fa-solid fa-infinity" /> Unlimited Requests</>
                  ) : (
                    `Max ${activeWindow.release_limit} releases per franchise`
                  )}
                </div>
              </div>
            </div>

            {/* Franchise selector custom dropdown */}
            <div style={{ marginBottom: "1.5rem", position: "relative" }} data-club-dd>
              <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: "6px", fontWeight: 600 }}>
                Select Your Team / Club
              </label>
              <div
                style={{
                  padding: "12px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer"
                }}
                onClick={() => setClubDropdownOpen(prev => !prev)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {selectedClub?.logo_path ? (
                    <img src={selectedClub.logo_path} alt="" style={{ width: "22px", height: "22px", objectFit: "contain" }} />
                  ) : (
                    <i className="fa-solid fa-shield-halved" style={{ color: "#a855f7", fontSize: "0.85rem" }} />
                  )}
                  <strong style={{ fontWeight: selectedClubId ? 600 : 400, color: selectedClubId ? "#fff" : "rgba(255,255,255,0.4)" }}>
                    {selectedClub ? selectedClub.name : "-- Choose your club franchise --"}
                  </strong>
                </div>
                <i className={`fa-solid fa-chevron-${clubDropdownOpen ? "up" : "down"}`} style={{ fontSize: "0.75rem", opacity: 0.6 }} />
              </div>

              {clubDropdownOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden", marginTop: "6px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                  <div style={{ padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <input
                      type="text"
                      placeholder="Search club name..."
                      value={clubSearch}
                      onChange={(e) => setClubSearch(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {filteredClubs.map(c => (
                      <div
                        key={c.id}
                        onClick={() => { setSelectedClubId(c.id.toString()); setClubDropdownOpen(false); }}
                        style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.02)", fontSize: "0.82rem" }}
                      >
                        {c.logo_path && <img src={c.logo_path} alt="" style={{ width: "18px", height: "18px", objectFit: "contain" }} />}
                        <span style={{ color: "#fff" }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Players Checklist panel */}
            {selectedClubId && (
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
                
                {/* Checklist column */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ fontSize: "0.95rem", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="fa-solid fa-people-group" style={{ color: "#a855f7" }} />
                      Roster Players ({squadPlayers.length})
                    </h3>

                    {squadPlayers.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        style={{ background: "none", border: "none", color: "#a855f7", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}
                      >
                        {selectedPlayerIds.length === squadPlayers.length ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>

                  {loadingPlayers ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
                      Loading squad roster...
                    </div>
                  ) : squadPlayers.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
                      No players found in this team squad.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {squadWithRefunds.map((p) => {
                        const isChecked = selectedPlayerIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleTogglePlayer(p.id)}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "10px",
                              background: isChecked ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.01)",
                              border: isChecked ? "1px solid rgba(168,85,247,0.3)" : "1px solid rgba(255,255,255,0.04)",
                              cursor: "pointer", transition: "all 0.2s"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // toggled by row click
                                style={{ accentColor: "#a855f7", cursor: "pointer" }}
                              />
                              <div>
                                <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.85rem" }}>{p.name}</div>
                                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                                  {p.position} &bull; Contract remaining: {p.remainingDuration.toFixed(1)} seasons
                                </span>
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", display: "block" }}>
                                Value: {p.value || p.base_value} Coins
                              </span>
                              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: p.refundAmount > 0 ? "#10b981" : "#ef4444" }}>
                                Refund: {p.refundAmount} Coins
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: Live Preview Panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  
                  {/* Transaction Preview Card */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "16px", padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "0.9rem", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "1rem" }}>
                      <i className="fa-solid fa-calculator" style={{ color: "#a855f7" }} />
                      Live Transaction Preview
                    </h3>

                    {selectedPlayerIds.length === 0 ? (
                      <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "1.5rem 0" }}>
                        Select players on the left to see calculated coin refunds and transaction outcomes.
                      </p>
                    ) : (
                      <div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "1rem", marginBottom: "1rem" }}>
                          {selectedPlayerIds.map(pId => {
                            const p = squadWithRefunds.find(pl => pl.id === pId);
                            return (
                              <div key={pId} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                <span style={{ color: "rgba(255,255,255,0.7)" }}>{p?.name} ({p?.position})</span>
                                <span style={{ color: p?.refundAmount && p.refundAmount > 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                                  +{p?.refundAmount} Coins
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                          <span style={{ fontSize: "0.85rem", color: "#fff" }}>Total Coins Credited:</span>
                          <strong style={{ fontSize: "1.2rem", color: "#10b981" }}>+{totalRefund} Coins</strong>
                        </div>

                        <div style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: "10px", padding: "10px 12px", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", lineHeight: "1.4", marginBottom: "1rem" }}>
                          <i className="fa-solid fa-circle-exclamation" style={{ color: "#a855f7", marginRight: "6px" }} />
                          Executing this release will remove these players from your team squad and refund the coins directly to your wallet once approved.
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={handleCopyToClipboard}
                            style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#fff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                          >
                            <i className="fa-brands fa-whatsapp" style={{ marginRight: "5px" }} /> Copy WhatsApp Text
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submission history for this team */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <h3 style={{ fontSize: "0.9rem", color: "#fff", margin: 0 }}>Team Release History</h3>
                      {history.length > 0 && (
                        <button
                          type="button"
                          onClick={handleCopyHistory}
                          style={{ background: "none", border: "none", color: "#a855f7", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}
                        >
                          <i className="fa-solid fa-copy" /> Copy Log
                        </button>
                      )}
                    </div>

                    {history.length === 0 ? (
                      <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "1rem 0" }}>
                        No releases submitted yet this season.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: "180px", overflowY: "auto" }}>
                        {history.map((h: any) => {
                          let badgeBg = "rgba(234,179,8,0.15)";
                          let badgeColor = "#fbbf24";
                          if (h.status === "approved") {
                            badgeBg = "rgba(16,185,129,0.15)";
                            badgeColor = "#34d399";
                          } else if (h.status === "rejected") {
                            badgeBg = "rgba(239,68,68,0.15)";
                            badgeColor = "#f87171";
                          }

                          return (
                            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", background: "rgba(0,0,0,0.15)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.02)", fontSize: "0.75rem" }}>
                              <div>
                                <div style={{ color: "#fff", fontWeight: 600 }}>{h.player_name}</div>
                                <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>Refund: {h.refund_amount} Coins</span>
                              </div>
                              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: badgeBg, color: badgeColor, textTransform: "uppercase" }}>
                                {h.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* Bottom sticky submit row */}
            {selectedPlayerIds.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "16px", padding: "1rem 1.5rem", backdropFilter: "blur(12px)", marginTop: "1.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                    Selected: {selectedPlayerIds.length} players
                  </span>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10b981", marginTop: "2px" }}>
                    Total Refund: {totalRefund} Coins
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitReleases}
                  disabled={isPending}
                  style={{
                    padding: "10px 24px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: 700,
                    background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff", transition: "all 0.2s"
                  }}
                >
                  {isPending ? "Submitting..." : "Submit Release Requests"}
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
