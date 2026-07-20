"use client";

import { useEffect, useState, useTransition, useMemo, useCallback } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchAllClubs,
  fetchAdminPlayersList,
  bulkAssignPlayersWithContracts
} from "@/utils/solo/serverActions";

interface PlayerItem {
  id: number;
  name: string;
  position: string;
  value: number;
  star: string;
  imagePath: string;
  isSuspended: boolean;
  clubId?: number | null;
  clubName?: string | null;
}

interface ClubItem {
  id: number;
  name: string;
  logo_path?: string | null;
  image?: string | null;
}

interface ContractRow {
  startSeason: string;
  expireSeason: string;
  signedValue: number;
}

export default function BulkAssignPlayersPage() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [players, setPlayers] = useState<PlayerItem[]>([]);

  // Selected Club State
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [clubDropdownOpen, setClubDropdownOpen] = useState<boolean>(false);
  const [clubDropdownSearch, setClubDropdownSearch] = useState<string>("");

  // Selected Players & Individual Contract Mapping
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [playerContractsMap, setPlayerContractsMap] = useState<Record<number, ContractRow>>({});

  // Global Default Contract Settings (Only numbers for seasons)
  const [globalStartSeason, setGlobalStartSeason] = useState<string>("9");
  const [globalExpireSeason, setGlobalExpireSeason] = useState<string>("11");
  const [globalPrice, setGlobalPrice] = useState<number>(100);

  // Auto-calculated global salary (5% of price, read-only)
  const globalSalary = useMemo(() => {
    const p = Number(globalPrice) || 0;
    return parseFloat((p * 0.05).toFixed(2));
  }, [globalPrice]);

  // Search & Position Filters for Free Agents
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");

  // UI / Action state
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const calculateSalary = (price: number): number => {
    const p = Number(price) || 0;
    return parseFloat((p * 0.05).toFixed(2));
  };

  const getPositionColor = (pos: string) => {
    const colors: Record<string, string> = {
      GK: "#eab308", CB: "#3b82f6", LB: "#3b82f6", RB: "#3b82f6", LWB: "#3b82f6", RWB: "#3b82f6",
      CM: "#10b981", DM: "#14b8a6", AM: "#a855f7", LM: "#10b981", RM: "#10b981", CAM: "#a855f7", CDM: "#14b8a6", MF: "#10b981",
      RW: "#f97316", LW: "#f97316", ST: "#ef4444", CF: "#ef4444", FW: "#ef4444"
    };
    return colors[pos.toUpperCase()] || "#06b6d4";
  };

  const loadData = useCallback(async () => {
    try {
      const season = await fetchActiveSeason();
      setActiveSeason(season);
      if (season) {
        const sNum = season.season_number || 9;
        setGlobalStartSeason(sNum.toString());
        setGlobalExpireSeason((sNum + 2).toString());
      }

      const clubsData = await fetchAllClubs();
      setClubs(clubsData || []);

      const allPlayers = await fetchAdminPlayersList();
      setPlayers(allPlayers || []);
    } catch (err) {
      console.error(err);
      showToast("Error loading system data!");
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-club-dropdown]")) {
        setClubDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [loadData]);

  // Selected Club details
  const selectedClub = useMemo(() => {
    if (!selectedClubId) return null;
    return clubs.find(c => c.id.toString() === selectedClubId.toString()) || null;
  }, [clubs, selectedClubId]);

  // Roster size for selected club
  const selectedClubRosterCount = useMemo(() => {
    if (!selectedClubId) return 0;
    return players.filter(p => p.clubId?.toString() === selectedClubId.toString()).length;
  }, [players, selectedClubId]);

  // Filtered Clubs for custom dropdown
  const filteredClubs = useMemo(() => {
    return clubs.filter(c => c.name.toLowerCase().includes(clubDropdownSearch.toLowerCase()));
  }, [clubs, clubDropdownSearch]);

  // Filtered FREE AGENT Players list (Only unassigned free agents are shown!)
  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      // ONLY free agents are to be shown
      if (p.clubId) return false;

      // Search matching
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.position.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Position Group Filter Logic
      const pos = (p.position || "").toUpperCase();
      if (positionFilter === "FW") {
        if (!["FW", "ST", "RW", "LW", "CF"].includes(pos)) return false;
      } else if (positionFilter === "MF") {
        if (!["MF", "CM", "DM", "AM", "LM", "RM", "CAM", "CDM"].includes(pos)) return false;
      } else if (positionFilter === "DF") {
        if (!["DF", "CB", "LB", "RB", "LWB", "RWB"].includes(pos)) return false;
      } else if (positionFilter === "GK") {
        if (pos !== "GK") return false;
      }

      return true;
    });
  }, [players, searchTerm, positionFilter]);

  // Toggle single player selection
  const toggleSelectPlayer = (id: number) => {
    setSelectedPlayerIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(pId => pId !== id);
      } else {
        if (!playerContractsMap[id]) {
          setPlayerContractsMap(mapPrev => ({
            ...mapPrev,
            [id]: {
              startSeason: globalStartSeason,
              expireSeason: globalExpireSeason,
              signedValue: globalPrice
            }
          }));
        }
        return [...prev, id];
      }
    });
  };

  // Select all filtered free agents
  const handleSelectAllFiltered = () => {
    const filteredIds = filteredPlayers.map(p => p.id);
    const newSelected = Array.from(new Set([...selectedPlayerIds, ...filteredIds]));
    setSelectedPlayerIds(newSelected);

    setPlayerContractsMap(prev => {
      const updated = { ...prev };
      filteredIds.forEach(id => {
        if (!updated[id]) {
          updated[id] = {
            startSeason: globalStartSeason,
            expireSeason: globalExpireSeason,
            signedValue: globalPrice
          };
        }
      });
      return updated;
    });
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedPlayerIds([]);
  };

  // Apply Global Defaults to All Selected Players
  const handleApplyGlobalDefaultsToSelected = () => {
    if (selectedPlayerIds.length === 0) {
      showToast("No players selected to apply defaults!");
      return;
    }
    setPlayerContractsMap(prev => {
      const updated = { ...prev };
      selectedPlayerIds.forEach(id => {
        updated[id] = {
          startSeason: globalStartSeason,
          expireSeason: globalExpireSeason,
          signedValue: globalPrice
        };
      });
      return updated;
    });
    showToast(`Applied defaults to ${selectedPlayerIds.length} selected players!`);
  };

  // Contract row editor handlers (Numbers only for seasons)
  const handleRowStartSeasonChange = (id: number, val: string) => {
    const cleanDigits = val.replace(/\D/g, '');
    setPlayerContractsMap(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {
          startSeason: globalStartSeason,
          expireSeason: globalExpireSeason,
          signedValue: globalPrice
        }),
        startSeason: cleanDigits
      }
    }));
  };

  const handleRowExpireSeasonChange = (id: number, val: string) => {
    const cleanDigits = val.replace(/\D/g, '');
    setPlayerContractsMap(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {
          startSeason: globalStartSeason,
          expireSeason: globalExpireSeason,
          signedValue: globalPrice
        }),
        expireSeason: cleanDigits
      }
    }));
  };

  const handleRowPriceChange = (id: number, val: number) => {
    setPlayerContractsMap(prev => {
      const curr = prev[id] || {
        startSeason: globalStartSeason,
        expireSeason: globalExpireSeason,
        signedValue: globalPrice
      };
      return {
        ...prev,
        [id]: {
          ...curr,
          signedValue: val
        }
      };
    });
  };

  // Selected player objects array
  const selectedPlayersList = useMemo(() => {
    return selectedPlayerIds
      .map(id => players.find(p => p.id === id))
      .filter((p): p is PlayerItem => p !== undefined);
  }, [players, selectedPlayerIds]);

  // Aggregate totals
  const totalContractPrice = useMemo(() => {
    return selectedPlayerIds.reduce((sum, id) => {
      const row = playerContractsMap[id];
      return sum + (row ? Number(row.signedValue) || 0 : globalPrice);
    }, 0);
  }, [selectedPlayerIds, playerContractsMap, globalPrice]);

  const totalPayrollSalary = useMemo(() => {
    return selectedPlayerIds.reduce((sum, id) => {
      const row = playerContractsMap[id];
      const price = row ? Number(row.signedValue) || 0 : globalPrice;
      return sum + calculateSalary(price);
    }, 0);
  }, [selectedPlayerIds, playerContractsMap, globalPrice]);

  // Submit Bulk Assignment
  const handleSubmitAssignments = () => {
    if (!selectedClubId) {
      showToast("Please select a target team first!");
      return;
    }
    if (selectedPlayerIds.length === 0) {
      showToast("Please select at least one player to assign!");
      return;
    }

    const clubName = selectedClub?.name || "the selected team";

    startTransition(async () => {
      try {
        const assignmentsPayload = selectedPlayerIds.map(id => {
          const row = playerContractsMap[id] || {
            startSeason: globalStartSeason,
            expireSeason: globalExpireSeason,
            signedValue: globalPrice
          };
          return {
            playerId: id,
            startSeason: row.startSeason.replace(/\D/g, ''),
            expireSeason: row.expireSeason.replace(/\D/g, ''),
            signedValue: Number(row.signedValue) || 0,
            salary: calculateSalary(Number(row.signedValue) || 0)
          };
        });

        await bulkAssignPlayersWithContracts(selectedClubId, assignmentsPayload);

        setSuccessBanner(`Successfully assigned ${assignmentsPayload.length} players to ${clubName}!`);
        showToast(`Assigned ${assignmentsPayload.length} players to ${clubName}`);

        setSelectedPlayerIds([]);
        setPlayerContractsMap({});
        loadData();
      } catch (err: any) {
        console.error(err);
        showToast(err?.message || "Failed to submit player assignments");
      }
    });
  };

  return (
    <div className="portal-root-wrapper" data-module="players">
      <style jsx global>{`
        .bulk-custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .bulk-custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .bulk-custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        .bulk-custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--admin-accent);
        }
        .player-select-row:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
          transform: translateY(-1px);
        }
        .preset-btn {
          transition: all 0.2s ease;
        }
        .preset-btn:hover {
          background: var(--admin-accent-dim) !important;
          border-color: var(--admin-accent-border) !important;
          color: var(--admin-accent) !important;
        }
        .readonly-salary-input {
          background: rgba(0, 0, 0, 0.35) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          color: #34d399 !important;
          font-weight: 700 !important;
          cursor: not-allowed !important;
        }

        /* Mobile Optimization Rules */
        @media (max-width: 768px) {
          .bulk-grid-2col {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .bulk-team-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .desktop-only-table {
            display: none !important;
          }
          .mobile-only-cards {
            display: flex !important;
          }
          .sticky-bottom-action-bar {
            position: sticky !important;
            bottom: 0.75rem !important;
            z-index: 999 !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.9), 0 0 25px var(--admin-accent-glow) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            flex-direction: column !important;
            gap: 0.75rem !important;
            align-items: stretch !important;
            text-align: center;
          }
          .sticky-bottom-action-bar button {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        @media (min-width: 769px) {
          .desktop-only-table {
            display: block !important;
          }
          .mobile-only-cards {
            display: none !important;
          }
        }
      `}</style>

      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {/* Toast Notification */}
      {toast && (
        <div className="admin-toast" style={{ animation: "toastSlideIn 0.3s ease forwards" }}>
          <i className="fa-solid fa-circle-info" />
          <span>{toast}</span>
        </div>
      )}

      <div className="portal-container" style={{ maxWidth: "1400px" }}>
        {/* Breadcrumb Navigation */}
        <div className="portal-breadcrumb" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Admin Hub
            </Link>
            <Link href="/solo-tour/admin/players" className="portal-btn btn-secondary back-link-btn">
              <i className="fa-solid fa-people-group" /> Players Roster
            </Link>
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Active Season: <strong style={{ color: "var(--solo-primary)" }}>Season {activeSeason?.season_number || 9}</strong>
          </span>
        </div>

        {/* Page Header */}
        <div className="portal-header">
          <div className="portal-page-badge" style={{ borderColor: "var(--admin-accent-border)", color: "var(--admin-accent)" }}>
            <i className="fa-solid fa-file-contract" /> Bulk Squad Assignment
          </div>
          <h1 className="portal-title">BULK PLAYER ASSIGNMENT</h1>
          <p className="portal-subtitle">
            Select one team, choose free agents, set numeric contract terms & prices with auto-calculated salaries.
          </p>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "12px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              animation: "adminFadeIn 0.4s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: "1.25rem" }} />
              <span style={{ fontWeight: 600 }}>{successBanner}</span>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              style={{ background: "none", border: "none", color: "#34d399", cursor: "pointer" }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}

        {/* TOP STATS OVERVIEW ROW */}
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="stat-label">Target Team</div>
            <div className="stat-value" style={{ fontSize: "1.2rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {selectedClub ? selectedClub.name : "None Selected"}
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Selected Players</div>
            <div className="stat-value" style={{ color: "var(--admin-accent)" }}>
              {selectedPlayerIds.length}
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Total Contract Value</div>
            <div className="stat-value" style={{ color: "var(--solo-primary)" }}>
              {totalContractPrice} <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Coins</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Total Salary Payroll (Auto 5%)</div>
            <div className="stat-value" style={{ color: "#34d399" }}>
              {totalPayrollSalary.toFixed(2)} <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Coins</span>
            </div>
          </div>
        </div>

        <div className="admin-wrapper">
          {/* STEP 1: TARGET TEAM SELECTION CARD */}
          <div className="admin-card">
            <h2 className="admin-card-title">
              <i className="fa-solid fa-shield-halved" />
              1. SELECT TARGET TEAM
            </h2>

            <div className="bulk-team-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.5rem", alignItems: "center" }}>
              {/* Custom Searchable Club Dropdown */}
              <div className="admin-form-group" style={{ position: "relative", marginBottom: 0 }} data-club-dropdown="true">
                <label className="admin-form-label" style={{ marginBottom: "6px" }}>Select Target Club</label>
                <div
                  style={{
                    border: "1px solid var(--admin-input-border)",
                    borderRadius: "10px",
                    background: "var(--admin-input-bg)",
                    cursor: "pointer",
                    padding: "11px 14px",
                    fontSize: "0.95rem",
                    color: selectedClubId ? "#fff" : "rgba(255,255,255,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    userSelect: "none"
                  }}
                  onClick={() => setClubDropdownOpen(prev => !prev)}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "10px" }}>
                    {selectedClubId && (() => {
                      const logo = selectedClub?.logo_path || selectedClub?.image;
                      return logo
                        ? <img src={logo} alt="" style={{ width: "24px", height: "24px", objectFit: "contain", borderRadius: "4px", flexShrink: 0 }} />
                        : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.95rem", color: "var(--admin-accent)", flexShrink: 0 }} />;
                    })()}
                    <strong style={{ color: selectedClubId ? "#fff" : "var(--text-secondary)", fontWeight: selectedClubId ? 600 : 400 }}>
                      {selectedClub ? selectedClub.name : "-- Choose Target Team --"}
                    </strong>
                  </span>
                  <i className={`fa-solid fa-chevron-${clubDropdownOpen ? "up" : "down"}`} style={{ fontSize: "0.8rem", opacity: 0.6, flexShrink: 0 }} />
                </div>

                {clubDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      background: "#181d28",
                      border: "1px solid var(--admin-accent-border)",
                      borderRadius: "12px",
                      boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                      overflow: "hidden",
                      marginTop: "6px",
                      animation: "adminFadeIn 0.2s ease"
                    }}
                  >
                    <div style={{ padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search team name..."
                        value={clubDropdownSearch}
                        onChange={(e) => setClubDropdownSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: "100%",
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          fontSize: "0.85rem",
                          color: "#fff",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>

                    <div className="bulk-custom-scrollbar" style={{ maxHeight: "240px", overflowY: "auto" }}>
                      {filteredClubs.map(c => {
                        const logo = c.logo_path || c.image;
                        const isCurrSelected = selectedClubId.toString() === c.id.toString();
                        return (
                          <div
                            key={c.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClubId(c.id.toString());
                              setClubDropdownOpen(false);
                              setClubDropdownSearch("");
                            }}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "10px",
                              background: isCurrSelected ? "var(--admin-accent-dim)" : "transparent",
                              borderLeft: isCurrSelected ? "3px solid var(--admin-accent)" : "3px solid transparent",
                              transition: "background 0.12s ease"
                            }}
                            onMouseEnter={(e) => {
                              if (!isCurrSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                            }}
                            onMouseLeave={(e) => {
                              if (!isCurrSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {logo ? (
                                <img src={logo} alt="" style={{ width: "24px", height: "24px", objectFit: "contain", borderRadius: "3px" }} />
                              ) : (
                                <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }} />
                              )}
                              <span style={{ fontSize: "0.9rem", fontWeight: isCurrSelected ? 700 : 500, color: "#fff" }}>
                                {c.name}
                              </span>
                            </div>
                            {isCurrSelected && (
                              <i className="fa-solid fa-check" style={{ color: "var(--admin-accent)", fontSize: "0.85rem" }} />
                            )}
                          </div>
                        );
                      })}
                      {filteredClubs.length === 0 && (
                        <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" }}>
                          No clubs found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Club Preview Card */}
              {selectedClub ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1.25rem",
                    padding: "0.85rem 1.25rem",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--admin-accent-border)"
                  }}
                >
                  {selectedClub.logo_path || selectedClub.image ? (
                    <img
                      src={selectedClub.logo_path || selectedClub.image || ''}
                      alt={selectedClub.name}
                      style={{ width: "48px", height: "48px", objectFit: "contain" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "var(--admin-accent-dim)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--admin-accent)",
                        fontSize: "1.2rem",
                        fontWeight: 700
                      }}
                    >
                      <i className="fa-solid fa-shield-halved" />
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff" }}>
                      {selectedClub.name}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", gap: "1rem", marginTop: "2px" }}>
                      <span>Current Roster: <strong style={{ color: "#fff" }}>{selectedClubRosterCount} players</strong></span>
                      <span>Targeting: <strong style={{ color: "var(--admin-accent)" }}>+{selectedPlayerIds.length} players</strong></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: "0.85rem 1.25rem",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.015)",
                    border: "1px dashed rgba(255, 255, 255, 0.1)",
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem"
                  }}
                >
                  <i className="fa-solid fa-hand-pointer" style={{ marginRight: "0.5rem", color: "var(--admin-accent)" }} />
                  Select a team from the dropdown to start bulk assigning players.
                </div>
              )}
            </div>
          </div>

          {/* STEP 2 & 3: BULK DEFAULTS & PLAYER SELECTION GRID */}
          <div className="bulk-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* STEP 2: PLAYER SELECTION & SEARCH (ONLY FREE AGENTS) */}
            <div className="admin-card">
              <h2 className="admin-card-title">
                <i className="fa-solid fa-users" />
                2. SELECT FREE AGENT PLAYERS
              </h2>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Available Free Agents: <strong style={{ color: "var(--admin-accent)" }}>{filteredPlayers.length}</strong> (Selected: {selectedPlayerIds.length})
                </span>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={handleSelectAllFiltered}
                    className="portal-btn btn-secondary"
                    style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                  >
                    Select All Free Agents ({filteredPlayers.length})
                  </button>
                  {selectedPlayerIds.length > 0 && (
                    <button
                      onClick={handleDeselectAll}
                      className="portal-btn btn-danger"
                      style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Search & Position Group Filter */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Search free agent by name or position (e.g. ST, CB, CM)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: "2.25rem" }}
                  />
                  <i
                    className="fa-solid fa-magnifying-glass"
                    style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: "0.9rem" }}
                  />
                </div>

                {/* Position Group Filter Buttons */}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Position:</span>
                  {[
                    { key: "ALL", label: "All" },
                    { key: "FW", label: "FW" },
                    { key: "MF", label: "MF" },
                    { key: "DF", label: "DF" },
                    { key: "GK", label: "GK" }
                  ].map(pos => (
                    <button
                      key={pos.key}
                      onClick={() => setPositionFilter(pos.key)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: positionFilter === pos.key ? "1px solid var(--admin-accent)" : "1px solid rgba(255, 255, 255, 0.08)",
                        background: positionFilter === pos.key ? "var(--admin-accent-dim)" : "rgba(0, 0, 0, 0.2)",
                        color: positionFilter === pos.key ? "var(--admin-accent)" : "var(--text-secondary)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Free Agents List */}
              <div
                className="bulk-custom-scrollbar"
                style={{
                  maxHeight: "360px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  paddingRight: "0.25rem"
                }}
              >
                {filteredPlayers.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    No free agents found matching current search/filter.
                  </div>
                ) : (
                  filteredPlayers.map(p => {
                    const isSelected = selectedPlayerIds.includes(p.id);
                    const posColor = getPositionColor(p.position);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleSelectPlayer(p.id)}
                        className="player-select-row"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.65rem 0.85rem",
                          borderRadius: "8px",
                          background: isSelected ? "var(--admin-accent-dim)" : "rgba(255, 255, 255, 0.02)",
                          border: isSelected ? "1px solid var(--admin-accent-border)" : "1px solid rgba(255, 255, 255, 0.05)",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--admin-accent)" }}
                          />
                          <div
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "50%",
                              background: "rgba(0,0,0,0.3)",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid rgba(255,255,255,0.1)"
                            }}
                          >
                            <img
                              src={p.imagePath || `https://ik.imagekit.io/6dbhhctcf/players/${p.id}.png`}
                              alt={p.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e: any) => { e.target.src = "/assets/images/players/placeholder.png"; }}
                            />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#fff" }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <span
                                style={{
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  background: `${posColor}22`,
                                  color: posColor,
                                  border: `1px solid ${posColor}44`
                                }}
                              >
                                {p.position}
                              </span>
                              <span>•</span>
                              <span>Base: {p.value} Coins</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className="badge-active" style={{ fontSize: "0.72rem" }}>
                            Free Agent
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* STEP 3: GLOBAL CONTRACT DEFAULTS */}
            <div className="admin-card">
              <h2 className="admin-card-title">
                <i className="fa-solid fa-wand-magic-sparkles" />
                3. BULK CONTRACT DEFAULTS
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="admin-form-group">
                  <label htmlFor="global-start-season">Start Contract (Number Only)</label>
                  <input
                    id="global-start-season"
                    type="text"
                    className="admin-input"
                    value={globalStartSeason}
                    onChange={(e) => setGlobalStartSeason(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 9"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="global-expire-season">End Contract (Number Only)</label>
                  <input
                    id="global-expire-season"
                    type="text"
                    className="admin-input"
                    value={globalExpireSeason}
                    onChange={(e) => setGlobalExpireSeason(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 11"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="global-price">Default Price (Coins)</label>
                  <input
                    id="global-price"
                    type="number"
                    min="0"
                    className="admin-input"
                    value={globalPrice}
                    onChange={(e) => setGlobalPrice(Number(e.target.value))}
                    placeholder="100"
                  />
                </div>

                <div className="admin-form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="global-salary">Salary (Coins)</label>
                    <span style={{ fontSize: "0.7rem", color: "#34d399", fontWeight: 700 }}>
                      Auto 5% (Read-Only)
                    </span>
                  </div>
                  <input
                    id="global-salary"
                    type="number"
                    readOnly
                    className="admin-input readonly-salary-input"
                    value={globalSalary}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyGlobalDefaultsToSelected}
                className="portal-btn btn-secondary"
                style={{ width: "100%", padding: "0.65rem", justifyContent: "center" }}
                disabled={selectedPlayerIds.length === 0}
              >
                <i className="fa-solid fa-wand-magic-sparkles" /> Apply Defaults to Selected ({selectedPlayerIds.length})
              </button>

              {/* Quick Presets for Price */}
              <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem" }}>
                  Quick Presets for Price:
                </span>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {[50, 100, 150, 200, 300, 500].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setGlobalPrice(val)}
                      className="preset-btn"
                      style={{
                        padding: "3px 10px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        background: "rgba(0,0,0,0.2)",
                        color: "#fff",
                        fontSize: "0.75rem",
                        cursor: "pointer"
                      }}
                    >
                      {val} Coins
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4: CHANGEABLE CONTRACT TABLE (DESKTOP) & STACKED CARDS (MOBILE) */}
          <div className="admin-card">
            <h2 className="admin-card-title">
              <i className="fa-solid fa-list-check" />
              4. CUSTOMIZE CONTRACTS & CONFIRM
            </h2>

            {selectedPlayersList.length === 0 ? (
              <div
                style={{
                  padding: "3rem 1.5rem",
                  textAlign: "center",
                  borderRadius: "12px",
                  background: "rgba(0, 0, 0, 0.2)",
                  border: "1px dashed rgba(255, 255, 255, 0.1)",
                  color: "var(--text-secondary)"
                }}
              >
                <i className="fa-solid fa-users-slash" style={{ fontSize: "2rem", marginBottom: "0.75rem", color: "var(--admin-accent)" }} />
                <div style={{ fontSize: "1rem", fontWeight: 600, color: "#fff" }}>No Players Selected Yet</div>
                <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  Select free agent players from the list above to customize their contract details.
                </p>
              </div>
            ) : (
              <div>
                {/* DESKTOP TABLE VIEW */}
                <div className="desktop-only-table table-responsive" style={{ marginTop: 0, marginBottom: "1.5rem" }}>
                  <table className="admin-list-table">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Current Status</th>
                        <th style={{ textAlign: "center" }}>Start Season</th>
                        <th style={{ textAlign: "center" }}>End Season</th>
                        <th style={{ textAlign: "center" }}>Price (Coins)</th>
                        <th style={{ textAlign: "center" }}>Salary (Auto 5%)</th>
                        <th style={{ textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPlayersList.map(p => {
                        const row = playerContractsMap[p.id] || {
                          startSeason: globalStartSeason,
                          expireSeason: globalExpireSeason,
                          signedValue: globalPrice
                        };
                        const autoCalcSalary = calculateSalary(row.signedValue);
                        const posColor = getPositionColor(p.position);

                        return (
                          <tr key={p.id}>
                            {/* Player Info */}
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <div
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    background: "rgba(0,0,0,0.3)",
                                    overflow: "hidden",
                                    flexShrink: 0,
                                    border: "1px solid rgba(255,255,255,0.1)"
                                  }}
                                >
                                  <img
                                    src={p.imagePath || `https://ik.imagekit.io/6dbhhctcf/players/${p.id}.png`}
                                    alt={p.name}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    onError={(e: any) => { e.target.src = "/assets/images/players/placeholder.png"; }}
                                  />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.9rem" }}>{p.name}</div>
                                  <span
                                    style={{
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      fontSize: "0.68rem",
                                      fontWeight: 700,
                                      background: `${posColor}22`,
                                      color: posColor,
                                      border: `1px solid ${posColor}44`
                                    }}
                                  >
                                    {p.position}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Current Status */}
                            <td>
                              <span className="badge-active" style={{ fontSize: "0.75rem" }}>
                                Free Agent
                              </span>
                            </td>

                            {/* Start Season */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="text"
                                className="admin-input"
                                value={row.startSeason}
                                onChange={(e) => handleRowStartSeasonChange(p.id, e.target.value)}
                                style={{ width: "90px", textAlign: "center" }}
                                placeholder="9"
                              />
                            </td>

                            {/* End Season */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="text"
                                className="admin-input"
                                value={row.expireSeason}
                                onChange={(e) => handleRowExpireSeasonChange(p.id, e.target.value)}
                                style={{ width: "90px", textAlign: "center" }}
                                placeholder="11"
                              />
                            </td>

                            {/* Price / Signed Value */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="number"
                                min="0"
                                className="admin-input"
                                value={row.signedValue}
                                onChange={(e) => handleRowPriceChange(p.id, Number(e.target.value))}
                                style={{ width: "100px", textAlign: "center" }}
                              />
                            </td>

                            {/* Salary (Non-editable, Auto-calculated 5%) */}
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                <input
                                  type="number"
                                  readOnly
                                  className="admin-input readonly-salary-input"
                                  value={autoCalcSalary}
                                  style={{ width: "100px", textAlign: "center" }}
                                />
                                <span style={{ fontSize: "0.68rem", color: "#34d399", fontWeight: 600 }}>
                                  5% Auto
                                </span>
                              </div>
                            </td>

                            {/* Action / Remove */}
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => toggleSelectPlayer(p.id)}
                                className="portal-btn btn-danger"
                                style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                                title="Remove from list"
                              >
                                <i className="fa-solid fa-trash-can" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARD VIEW (STACKED FOR MOBILE SCREENS) */}
                <div className="mobile-only-cards">
                  {selectedPlayersList.map(p => {
                    const row = playerContractsMap[p.id] || {
                      startSeason: globalStartSeason,
                      expireSeason: globalExpireSeason,
                      signedValue: globalPrice
                    };
                    const autoCalcSalary = calculateSalary(row.signedValue);
                    const posColor = getPositionColor(p.position);

                    return (
                      <div
                        key={p.id}
                        style={{
                          padding: "1rem",
                          borderRadius: "12px",
                          background: "rgba(255, 255, 255, 0.025)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem"
                        }}
                      >
                        {/* Header with Player Info + Remove Button */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: "rgba(0,0,0,0.3)",
                                overflow: "hidden",
                                flexShrink: 0,
                                border: "1px solid rgba(255,255,255,0.1)"
                              }}
                            >
                              <img
                                src={p.imagePath || `https://ik.imagekit.io/6dbhhctcf/players/${p.id}.png`}
                                alt={p.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e: any) => { e.target.src = "/assets/images/players/placeholder.png"; }}
                              />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>{p.name}</div>
                              <span
                                style={{
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  background: `${posColor}22`,
                                  color: posColor,
                                  border: `1px solid ${posColor}44`
                                }}
                              >
                                {p.position}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleSelectPlayer(p.id)}
                            className="portal-btn btn-danger"
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          >
                            <i className="fa-solid fa-trash-can" /> Remove
                          </button>
                        </div>

                        {/* Contract Inputs Grid for Mobile */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", background: "rgba(0,0,0,0.2)", padding: "0.75rem", borderRadius: "8px" }}>
                          <div className="admin-form-group">
                            <label style={{ fontSize: "0.7rem" }}>Start Season</label>
                            <input
                              type="text"
                              className="admin-input"
                              value={row.startSeason}
                              onChange={(e) => handleRowStartSeasonChange(p.id, e.target.value)}
                              placeholder="9"
                            />
                          </div>

                          <div className="admin-form-group">
                            <label style={{ fontSize: "0.7rem" }}>End Season</label>
                            <input
                              type="text"
                              className="admin-input"
                              value={row.expireSeason}
                              onChange={(e) => handleRowExpireSeasonChange(p.id, e.target.value)}
                              placeholder="11"
                            />
                          </div>

                          <div className="admin-form-group">
                            <label style={{ fontSize: "0.7rem" }}>Price (Coins)</label>
                            <input
                              type="number"
                              min="0"
                              className="admin-input"
                              value={row.signedValue}
                              onChange={(e) => handleRowPriceChange(p.id, Number(e.target.value))}
                            />
                          </div>

                          <div className="admin-form-group">
                            <label style={{ fontSize: "0.7rem" }}>Salary (Auto 5%)</label>
                            <input
                              type="number"
                              readOnly
                              className="admin-input readonly-salary-input"
                              value={autoCalcSalary}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* SUBMIT ACTION BAR (STICKY ON MOBILE) */}
                <div
                  className="sticky-bottom-action-bar"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1.25rem 1.5rem",
                    borderRadius: "14px",
                    background: "var(--admin-accent-dim)",
                    border: "1px solid var(--admin-accent-border)"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>
                      Assign {selectedPlayerIds.length} free agents to {selectedClub ? selectedClub.name : "target team"}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Total Value: <strong style={{ color: "var(--solo-primary)" }}>{totalContractPrice} Coins</strong> • Payroll: <strong style={{ color: "#34d399" }}>{totalPayrollSalary.toFixed(2)} Coins</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitAssignments}
                    disabled={isPending || !selectedClubId || selectedPlayerIds.length === 0}
                    className="portal-btn btn-primary"
                    style={{ padding: "0.85rem 1.75rem", fontSize: "1rem", fontWeight: 700, gap: "0.75rem" }}
                  >
                    {isPending ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin" /> Processing Assignments...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check-double" /> Confirm & Assign {selectedPlayerIds.length} Free Agents
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
