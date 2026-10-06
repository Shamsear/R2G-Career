"use client";

import { useEffect, useState, useTransition, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchRegisteredClubs,
  fetchAdminPlayersList,
  primePlayerForTeam,
  removePlayerPrime,
  fetchPrimedPlayersList
} from "@/utils/solo/serverActions";

export default function AdminPrimeManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [primedPlayers, setPrimedPlayers] = useState<any[]>([]);

  // Selected Club State (Custom Dropdown)
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [clubDropdownOpen, setClubDropdownOpen] = useState<boolean>(false);
  const [clubDropdownSearch, setClubDropdownSearch] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [clubPos, setClubPos] = useState({ top: 0, left: 0, width: 280 });
  const clubTriggerRef = useRef<HTMLDivElement>(null);
  const clubMenuRef = useRef<HTMLDivElement>(null);

  const updateClubPosition = () => {
    if (clubTriggerRef.current) {
      const rect = clubTriggerRef.current.getBoundingClientRect();
      const targetWidth = rect.width;
      let left = rect.left;
      if (left + targetWidth > window.innerWidth - 10) {
        left = Math.max(10, window.innerWidth - targetWidth - 10);
      }
      let top = rect.bottom + 6;
      if (top + 260 > window.innerHeight && rect.top > 260) {
        top = Math.max(10, rect.top - 266);
      }
      setClubPos({ top, left, width: targetWidth });
    }
  };

  // Selected Players for Priming (Multi-select)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [playerSearch, setPlayerSearch] = useState<string>("");
  const [rtCost, setRtCost] = useState<number>(50);

  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [season, clubsData, playersData, primedData] = await Promise.all([
        fetchActiveSeason(),
        fetchRegisteredClubs(),
        fetchAdminPlayersList(),
        fetchPrimedPlayersList()
      ]);

      setActiveSeason(season);
      setClubs(clubsData || []);
      setAllPlayers(playersData || []);
      setPrimedPlayers(primedData || []);
    } catch (err) {
      console.error(err);
      showToast("Error loading Prime settings data!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();

    // Close dropdown on click outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        clubTriggerRef.current && !clubTriggerRef.current.contains(target) &&
        clubMenuRef.current && !clubMenuRef.current.contains(target)
      ) {
        setClubDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (clubDropdownOpen) {
      updateClubPosition();
      const handleScroll = (e: Event) => {
        const target = e.target;
        if (target instanceof HTMLElement && target.closest("[data-prime-club-menu]")) return;
        updateClubPosition();
      };
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", updateClubPosition);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", updateClubPosition);
      };
    }
  }, [clubDropdownOpen]);

  const selectedClub = useMemo(() => {
    return clubs.find(c => String(c.id) === selectedClubId);
  }, [clubs, selectedClubId]);

  const filteredClubs = useMemo(() => {
    return clubs.filter(c =>
      c.name.toLowerCase().includes(clubDropdownSearch.toLowerCase())
    );
  }, [clubs, clubDropdownSearch]);

  // Filter players list based on selected club and search input
  const filteredPlayers = useMemo(() => {
    return allPlayers.filter((p) => {
      let matchClub = true;
      if (selectedClubId) {
        matchClub = String(p.clubId) === selectedClubId || p.clubName === selectedClub?.name;
      }
      let matchSearch = true;
      if (playerSearch) {
        const query = playerSearch.toLowerCase();
        matchSearch = p.name.toLowerCase().includes(query) || (p.clubName && p.clubName.toLowerCase().includes(query)) || p.position.toLowerCase().includes(query);
      }
      // Do not list players who are already primed
      const isAlreadyPrimed = primedPlayers.some(pp => pp.id === p.id);
      return matchClub && matchSearch && !isAlreadyPrimed;
    });
  }, [allPlayers, selectedClubId, selectedClub, playerSearch, primedPlayers]);

  const handleTogglePlayer = (playerId: number) => {
    setSelectedPlayerIds(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredPlayers.map(p => p.id);
    const areAllSelected = allFilteredIds.every(id => selectedPlayerIds.includes(id));

    if (areAllSelected) {
      // Unselect all filtered
      setSelectedPlayerIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      // Select all filtered (without duplicating)
      setSelectedPlayerIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handlePrimeSelected = async () => {
    if (selectedPlayerIds.length === 0) return showToast("No players selected!");

    startTransition(async () => {
      try {
        let successCount = 0;
        let lastValidUntil = "1 Season";
        let lastError = "";

        for (const pId of selectedPlayerIds) {
          const res = await primePlayerForTeam(pId, selectedClubId ? Number(selectedClubId) : undefined, rtCost);
          if (res.success) {
            successCount++;
            if (res.validUntil) lastValidUntil = res.validUntil;
          } else if (res.error) {
            lastError = res.error;
          }
        }

        if (successCount > 0) {
          showToast(`Successfully Primed ${successCount} players for 1 Season! (${lastValidUntil})`);
          setSelectedPlayerIds([]);
          loadData();
        } else if (lastError) {
          showToast(`Failed: ${lastError}`);
        } else {
          showToast("Failed to prime selected players.");
        }
      } catch (err: any) {
        console.error(err);
        showToast(err?.message || "Error priming selected players!");
      }
    });
  };

  const handleRemovePrime = async (playerId: number) => {
    if (!confirm("Are you sure you want to remove Prime status from this player?")) return;

    startTransition(async () => {
      try {
        const res = await removePlayerPrime(playerId);
        if (res.success) {
          showToast("Prime status removed!");
          loadData();
        } else {
          showToast(res.error || "Failed to remove prime status.");
        }
      } catch {
        showToast("Error removing prime status!");
      }
    });
  };

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && (
        <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999, background: "rgba(234,179,8,0.95)", color: "#000", padding: "12px 20px", borderRadius: "10px", fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <i className="fa-solid fa-circle-check" style={{ marginRight: "8px" }} /> {toast}
        </div>
      )}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        
        {/* Breadcrumbs */}
        <div className="portal-breadcrumb" style={{ marginBottom: "1rem" }}>
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back to Admin Console
          </Link>
          <Link href="/solo-tour/admin/auction" className="portal-btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px", marginLeft: "8px" }}>
            <i className="fa-solid fa-gavel" style={{ marginRight: "6px" }} /> Auctions & Transfers
          </Link>
        </div>

        {/* Hero Banner */}
        <div className="rws-page-hero" style={{ marginBottom: "2rem" }}>
          <div className="portal-page-badge" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>
            <i className="fa-solid fa-crown" />
            1-Season Player Priming Console
          </div>
          <h1 className="rws-hero-title">
            BULK PRIME MANAGER
          </h1>
          <p className="rws-hero-sub">
            Configure Prime upgrades for multiple team players at once. Select a franchise, choose target players, and commit the Prime status.
          </p>
        </div>

        {/* Console layout */}
        <div className="bulk-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
          
          {/* Left Column: Selector Form & Player Checklist */}
          <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "16px", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.05rem", color: "#fff", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-display)" }}>
              <i className="fa-solid fa-square-plus" style={{ color: "#eab308" }} />
              Prime Player Console
            </h3>

            {/* Step 1: Franchise custom dropdown */}
            <div style={{ marginBottom: "1.25rem", position: "relative" }} data-club-dropdown>
              <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: "6px", fontWeight: 600 }}>
                1. Select franchise / club
              </label>
              <div
                ref={clubTriggerRef}
                style={{
                  padding: "12px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer"
                }}
                onClick={() => {
                  updateClubPosition();
                  setClubDropdownOpen(prev => !prev);
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {selectedClub?.logo_path ? (
                    <img src={selectedClub.logo_path} alt="" style={{ width: "22px", height: "22px", objectFit: "contain" }} />
                  ) : (
                    <i className="fa-solid fa-shield-halved" style={{ color: "#eab308", fontSize: "0.85rem" }} />
                  )}
                  <strong style={{ fontWeight: selectedClubId ? 600 : 400, color: selectedClubId ? "#fff" : "rgba(255,255,255,0.4)" }}>
                    {selectedClub ? selectedClub.name : "-- Choose franchise --"}
                  </strong>
                </div>
                <i className={`fa-solid fa-chevron-${clubDropdownOpen ? "up" : "down"}`} style={{ fontSize: "0.75rem", opacity: 0.6 }} />
              </div>

              {mounted && clubDropdownOpen && createPortal(
                <div
                  ref={clubMenuRef}
                  data-prime-club-menu
                  style={{
                    position: "fixed",
                    top: `${clubPos.top}px`,
                    left: `${clubPos.left}px`,
                    width: `${clubPos.width}px`,
                    zIndex: 999999,
                    background: "#18181b",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    overflow: "hidden",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.75)"
                  }}
                >
                  <div style={{ padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <input
                      type="text"
                      placeholder="Search club name..."
                      value={clubDropdownSearch}
                      onChange={(e) => setClubDropdownSearch(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    <div
                      onClick={() => { setSelectedClubId(""); setClubDropdownOpen(false); setSelectedPlayerIds([]); }}
                      style={{ padding: "10px 14px", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: "0.82rem" }}
                    >
                      All Clubs / All Players
                    </div>
                    {filteredClubs.map(c => (
                      <div
                        key={c.id}
                        onClick={() => { setSelectedClubId(c.id.toString()); setClubDropdownOpen(false); setSelectedPlayerIds([]); }}
                        style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.02)", fontSize: "0.82rem" }}
                      >
                        {c.logo_path && <img src={c.logo_path} alt="" style={{ width: "18px", height: "18px", objectFit: "contain" }} />}
                        <span style={{ color: "#fff" }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* Step 2: Player Selection List with checklist */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                  2. Choose players ({selectedPlayerIds.length} selected)
                </label>
                {filteredPlayers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    style={{ background: "none", border: "none", color: "#eab308", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, padding: 0 }}
                  >
                    {filteredPlayers.every(p => selectedPlayerIds.includes(p.id)) ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>

              {/* Mini Search inside player checklist */}
              <input
                type="text"
                placeholder="Quick search players by name / position..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff", fontSize: "0.82rem", outline: "none", marginBottom: "10px", boxSizing: "border-box" }}
              />

              <div style={{ maxHeight: "300px", overflowY: "auto", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "4px" }}>
                {loading ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>Loading players list...</div>
                ) : filteredPlayers.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>
                    No players matching the filters.
                  </div>
                ) : (
                  filteredPlayers.map((p) => {
                    const isChecked = selectedPlayerIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleTogglePlayer(p.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", cursor: "pointer",
                          background: isChecked ? "rgba(234,179,8,0.05)" : "transparent",
                          borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "all 0.2s"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // toggled by row click
                          style={{ cursor: "pointer", accentColor: "#eab308" }}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                          {p.image_path ? (
                            <img src={p.image_path} alt="" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>
                              {p.name.slice(0,2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.82rem" }}>{p.name}</div>
                            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>{p.position} · {p.clubName || "Free Agent"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 3: RT Cost Configuration */}
            <div style={{ marginBottom: "1.5rem", padding: "12px 14px", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#eab308", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <i className="fa-solid fa-coins" /> 3. RT Deduction Cost Per Player
                </label>
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)" }}>
                  Total: <strong style={{ color: "#eab308" }}>{selectedPlayerIds.length * (Number(rtCost) || 0)} RT</strong>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={rtCost}
                    onChange={(e) => setRtCost(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="Enter RT cost (e.g. 50)"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(234,179,8,0.3)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", fontWeight: 700, color: "#eab308" }}>
                    RT
                  </span>
                </div>
              </div>
              <div style={{ marginTop: "6px", fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>
                Deducted from the manager's R2G Token wallet. Card type and base value remain untouched.
              </div>
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              onClick={handlePrimeSelected}
              disabled={isPending || selectedPlayerIds.length === 0}
              style={{
                width: "100%", padding: "12px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: "0.85rem", fontFamily: "var(--font-display)", textTransform: "uppercase",
                background: "linear-gradient(135deg, #eab308, #ca8a04)", color: "#000",
                opacity: isPending || selectedPlayerIds.length === 0 ? 0.5 : 1, transition: "all 0.25s ease",
                boxShadow: selectedPlayerIds.length > 0 ? "0 4px 20px rgba(234,179,8,0.2)" : "none"
              }}
            >
              <i className="fa-solid fa-crown" style={{ marginRight: "6px" }} /> Prime Selected Players ({selectedPlayerIds.length})
            </button>
          </div>

          {/* Right Column: Active Primed Players List */}
          <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <i className="fa-solid fa-crown" style={{ color: "#eab308", fontSize: "0.95rem" }} />
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "#fff" }}>
                  Active Primed Players ({primedPlayers.length})
                </span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}>
                Duration: 1 Season
              </span>
            </div>

            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
                Loading Primed players...
              </div>
            ) : primedPlayers.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                <i className="fa-solid fa-crown" style={{ fontSize: "2rem", marginBottom: "1rem", display: "block", opacity: 0.2 }} />
                No players are currently Primed.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      <th style={{ padding: "0.75rem 1.25rem", textAlign: "left" }}>Player</th>
                      <th style={{ padding: "0.75rem 0.5rem", textAlign: "left" }}>Position</th>
                      <th style={{ padding: "0.75rem 0.5rem", textAlign: "left" }}>Club / Team</th>
                      <th style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>Prime Duration</th>
                      <th style={{ padding: "0.75rem 1.25rem", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {primedPlayers.map((p) => (
                      <tr key={p.id} style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "0.75rem 1.25rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {p.imagePath ? (
                              <img src={p.imagePath} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(234,179,8,0.2)", color: "#eab308", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                                {p.name.slice(0,2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: "#fff" }}>{p.name}</div>
                              <span style={{ fontSize: "0.62rem", background: "rgba(234,179,8,0.15)", color: "#eab308", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, textTransform: "uppercase" }}>PRIME</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{p.position}</td>
                        <td style={{ padding: "0.75rem 0.5rem" }}>
                          <span style={{ color: p.clubName !== "Free Agent" ? "#fff" : "rgba(255,255,255,0.4)", fontWeight: 600 }}>{p.clubName}</span>
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: "6px", color: "#fbbf24" }}>
                            {p.validUntil}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1.25rem", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => handleRemovePrime(p.id)}
                            disabled={isPending}
                            style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, transition: "all 0.2s" }}
                          >
                            Remove Prime
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
    </div>
  );
}
