"use client";

import { useEffect, useState, useTransition, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchRegisteredClubs,
  fetchFreeAgents,
  fetchClubPlayers,
  executeTransferBuy,
  executeBulkTransfers,
  executeBulkSwaps,
  releaseExpiredContractsForSeason,
  releaseMidSeasonContracts,
  releasePlayerContract,
  releaseBulkPlayerContracts,
  fetchClubPlayersWithContracts,
  fetchPlayersToBeReleased,
  primePlayerForTeam,
  transferPlayerPrime,
  removePlayerPrime,
  updatePlayerPrimeValidity,
  formatPrimeValidity,
  parsePrimeDurationInfo,
  fetchPrimedPlayersList,
  fetchAdminPlayersList,
  fetchRecentReversibleOperations,
  revertSoloOperation,
  fetchPrimeFeeConfig,
  updatePrimeFeeConfig,
  type PrimeFeeConfig
} from "@/utils/solo/serverActions";

function AdminClubDropdown({
  clubs,
  selectedClubId,
  onSelect,
  placeholder = "-- Select Club --",
  excludeClubId,
  showAllOption = false,
  allOptionLabel = "All Clubs",
  style
}: {
  clubs: any[];
  selectedClubId: string;
  onSelect: (clubId: string) => void;
  placeholder?: string;
  excludeClubId?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const placementRef = useRef<"bottom" | "top">("bottom");

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updatePosition = (isInitial = false) => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const targetWidth = Math.min(window.innerWidth - 20, Math.max(rect.width, 220));
      let left = Math.max(10, Math.min(rect.left, window.innerWidth - targetWidth - 10));

      if (isInitial) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 220 && spaceAbove > spaceBelow) {
          placementRef.current = "top";
        } else {
          placementRef.current = "bottom";
        }
      }

      let top = 0;
      if (placementRef.current === "top") {
        top = Math.max(10, rect.top - 246);
      } else {
        top = rect.bottom + 4;
      }
      setPos({ top, left, width: targetWidth });
    }
  };

  useEffect(() => {
    if (open) {
      updatePosition(true);
      const handleScroll = (e: Event) => {
        const target = e.target;
        if (target instanceof HTMLElement && target.closest("[data-portal-menu]")) return;
        updatePosition(false);
      };
      window.addEventListener("scroll", handleScroll, true);
      const handleResize = () => updatePosition(false);
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [open]);

  const selectedClub = clubs.find(c => c.id.toString() === selectedClubId);
  const filteredClubs = clubs
    .filter(c => !excludeClubId || c.id.toString() !== excludeClubId)
    .filter(c => search === "" || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: "relative", width: "100%", ...style }}>
      <div
        ref={triggerRef}
        onClick={() => {
          if (!open) {
            updatePosition(true);
            setSearch("");
          }
          setOpen(prev => !prev);
        }}
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "8px",
          background: "rgba(255,255,255,0.04)",
          cursor: "pointer",
          padding: "9px 12px",
          fontSize: "0.85rem",
          color: selectedClubId ? "#fff" : "rgba(255,255,255,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          userSelect: "none"
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedClub && (
            (selectedClub.image || selectedClub.logo_path)
              ? <img src={selectedClub.image || selectedClub.logo_path} alt="" style={{ width: "18px", height: "18px", objectFit: "contain", borderRadius: "2px", flexShrink: 0 }} />
              : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }} />
          )}
          <span>{selectedClub ? selectedClub.name : placeholder}</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {selectedClub && (
            <span style={{ fontSize: "0.72rem", color: "#eab308", background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)", padding: "1px 6px", borderRadius: "4px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
              🪙 {Number(selectedClub.coins || 0).toLocaleString()} | 🟡 {selectedClub.tokens || 0} RT
            </span>
          )}
          <i className={`fa-solid fa-chevron-${open ? "up" : "down"}`} style={{ fontSize: "0.7rem", opacity: 0.6 }} />
        </div>
      </div>

      {mounted && open && createPortal(
        <div
          ref={menuRef}
          data-portal-menu="true"
          style={{
            position: "fixed",
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            width: `${pos.width}px`,
            maxHeight: "240px",
            background: "#161b22",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "10px",
            boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
            overflow: "hidden",
            zIndex: 999999,
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0d1117" }}>
            <input
              autoFocus
              type="text"
              placeholder="Search club..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "0.8rem",
                color: "#fff",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
          <div style={{ maxHeight: "190px", overflowY: "auto" }}>
            {showAllOption && (
              <div
                onClick={() => {
                  onSelect("");
                  setOpen(false);
                  setSearch("");
                }}
                style={{
                  padding: "9px 14px",
                  cursor: "pointer",
                  color: selectedClubId === "" ? "#0066ff" : "rgba(255,255,255,0.7)",
                  fontSize: "0.85rem",
                  borderBottom: "1px solid rgba(255,255,255,0.05)"
                }}
              >
                {allOptionLabel}
              </div>
            )}
            {filteredClubs.map(c => {
              const isSelected = selectedClubId === c.id.toString();
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelect(c.id.toString());
                    setOpen(false);
                    setSearch("");
                  }}
                  style={{
                    padding: "9px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    background: isSelected ? "rgba(0,102,255,0.12)" : "transparent",
                    borderLeft: isSelected ? "3px solid #0066ff" : "3px solid transparent",
                    fontSize: "0.85rem",
                    color: isSelected ? "#0066ff" : "#fff",
                    transition: "background 0.12s"
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0, overflow: "hidden" }}>
                    {(c.image || c.logo_path) ? (
                      <img src={c.image || c.logo_path} alt="" style={{ width: "20px", height: "20px", objectFit: "contain", borderRadius: "3px", flexShrink: 0 }} />
                    ) : (
                      <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
                    )}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.name}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.7rem", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                    <span style={{ color: "#eab308", background: "rgba(234,179,8,0.1)", padding: "1px 5px", borderRadius: "4px" }}>
                      🪙 {Number(c.coins || 0).toLocaleString()}
                    </span>
                    <span style={{ color: "#38bdf8", background: "rgba(56,189,248,0.1)", padding: "1px 5px", borderRadius: "4px" }}>
                      🟡 {c.tokens || 0} RT
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredClubs.length === 0 && (
              <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>
                No clubs found
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function AdminPlayerAuctionDropdown({
  freeAgents,
  selectedPlayerId,
  onSelect,
  getPositionColor
}: {
  freeAgents: any[];
  selectedPlayerId: string;
  onSelect: (playerId: string) => void;
  getPositionColor: (pos: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const placementRef = useRef<"bottom" | "top">("bottom");

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updatePosition = (isInitial = false) => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const targetWidth = Math.min(window.innerWidth - 20, Math.max(rect.width, 280));
      let left = Math.max(10, Math.min(rect.left, window.innerWidth - targetWidth - 10));

      if (isInitial) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 260 && spaceAbove > spaceBelow) {
          placementRef.current = "top";
        } else {
          placementRef.current = "bottom";
        }
      }

      let top = 0;
      if (placementRef.current === "top") {
        top = Math.max(10, rect.top - 286);
      } else {
        top = rect.bottom + 4;
      }
      setPos({ top, left, width: targetWidth });
    }
  };

  useEffect(() => {
    if (open) {
      updatePosition(true);
      const handleScroll = (e: Event) => {
        const target = e.target;
        if (target instanceof HTMLElement && target.closest("[data-portal-menu]")) return;
        updatePosition(false);
      };
      window.addEventListener("scroll", handleScroll, true);
      const handleResize = () => updatePosition(false);
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [open]);

  const selectedPlayer = freeAgents.find(x => x.id.toString() === selectedPlayerId);
  const filteredPlayers = freeAgents.filter(p =>
    (posFilter === "ALL" || p.position === posFilter) &&
    (search === "" || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        ref={triggerRef}
        onClick={() => {
          if (!open) {
            updatePosition(true);
            setSearch("");
          }
          setOpen(prev => !prev);
        }}
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "8px",
          background: "rgba(255,255,255,0.04)",
          cursor: "pointer",
          padding: "9px 12px",
          fontSize: "0.85rem",
          color: selectedPlayerId ? "#fff" : "rgba(255,255,255,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          userSelect: "none"
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}>
          {selectedPlayer ? (
            <>
              <span>{selectedPlayer.name} ({selectedPlayer.position})</span>
              {selectedPlayer.isPrime && (
                <span
                  style={{
                    background: "linear-gradient(135deg, rgba(234, 179, 8, 0.28) 0%, rgba(245, 158, 11, 0.16) 100%)",
                    color: "#fbbf24",
                    border: "1px solid rgba(251, 191, 36, 0.5)",
                    padding: "1px 5px",
                    borderRadius: "4px",
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px"
                  }}
                >
                  <i className="fa-solid fa-crown" style={{ fontSize: "0.55rem" }} /> PRIME
                </span>
              )}
            </>
          ) : "-- Choose Player --"}
        </span>
        <i className={`fa-solid fa-chevron-${open ? "up" : "down"}`} style={{ fontSize: "0.7rem", opacity: 0.6, flexShrink: 0 }} />
      </div>

      {mounted && open && createPortal(
        <div
          ref={menuRef}
          data-portal-menu="true"
          style={{
            position: "fixed",
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            width: `${pos.width}px`,
            maxHeight: "300px",
            background: "#161b22",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "10px",
            boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
            overflow: "hidden",
            zIndex: 999999,
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Position filter chips */}
          <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", flexWrap: "wrap", gap: "5px", background: "#0d1117" }}>
            {["ALL", "GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST", "FW"].map(pos => (
              <button
                key={pos}
                type="button"
                onClick={(e) => { e.stopPropagation(); setPosFilter(pos); }}
                style={{
                  padding: "2px 7px",
                  borderRadius: "16px",
                  fontSize: "0.68rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  border: `1px solid ${posFilter === pos ? getPositionColor(pos === "ALL" ? "CM" : pos) : "rgba(255,255,255,0.15)"}`,
                  background: posFilter === pos ? `${getPositionColor(pos === "ALL" ? "CM" : pos)}22` : "transparent",
                  color: posFilter === pos ? getPositionColor(pos === "ALL" ? "CM" : pos) : "rgba(255,255,255,0.5)",
                  transition: "all 0.15s ease"
                }}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0d1117" }}>
            <input
              type="text"
              autoFocus
              placeholder="Search player name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "0.8rem",
                color: "#fff",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Player list */}
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {filteredPlayers.map(p => {
              const isSelected = selectedPlayerId === p.id.toString();
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelect(p.id.toString());
                    setOpen(false);
                    setSearch("");
                  }}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: isSelected ? "rgba(0,102,255,0.12)" : "transparent",
                    borderLeft: isSelected ? "3px solid #0066ff" : "3px solid transparent",
                    transition: "background 0.12s ease"
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: "32px",
                      textAlign: "center",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "0.68rem",
                      fontWeight: "700",
                      background: `${getPositionColor(p.position)}22`,
                      color: getPositionColor(p.position),
                      border: `1px solid ${getPositionColor(p.position)}44`
                    }}
                  >
                    {p.position}
                  </span>
                  <span style={{ flex: 1, fontSize: "0.85rem", color: isSelected ? "#0066ff" : "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{p.name}</span>
                    {p.isPrime && (
                      <span
                        style={{
                          background: "linear-gradient(135deg, rgba(234, 179, 8, 0.28) 0%, rgba(245, 158, 11, 0.16) 100%)",
                          color: "#fbbf24",
                          border: "1px solid rgba(251, 191, 36, 0.5)",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          fontSize: "0.62rem",
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px"
                        }}
                      >
                        <i className="fa-solid fa-crown" style={{ fontSize: "0.55rem" }} /> PRIME
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>
                    {p.star ? p.star.replace("-", " ") : ""}
                  </span>
                </div>
              );
            })}
            {filteredPlayers.length === 0 && (
              <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>
                No players found
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function AuctionManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [freeAgents, setFreeAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"auction" | "sell" | "release" | "swap" | "window" | "prime" | "history">("auction");
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Reversible operations & history state
  const [lastOpBanner, setLastOpBanner] = useState<{ id: number; title: string; description?: string } | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [revertingId, setRevertingId] = useState<number | null>(null);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const ops = await fetchRecentReversibleOperations(undefined, 60);
      setHistoryList(ops || []);
    } catch {
      showToast("Error loading operation history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  const handleRevert = async (opId: number, title?: string) => {
    if (!confirm(`Are you sure you want to revert "${title || 'this operation'}"? This will restore players and club balances to their prior state.`)) {
      return;
    }
    setRevertingId(opId);
    try {
      const res = await revertSoloOperation(opId);
      if (res.success) {
        showToast("Operation reverted successfully!");
        if (lastOpBanner?.id === opId) {
          setLastOpBanner(null);
        }
        await loadData();
        if (activeTab === "history") {
          await loadHistory();
        }
        if (sellClubId && activeSeason) {
          fetchClubPlayersWithContracts(parseInt(sellClubId), activeSeason.id).then(setSellClubPlayers).catch(() => {});
        }
        if (releaseClubId && activeSeason) {
          fetchClubPlayersWithContracts(parseInt(releaseClubId), activeSeason.id).then(setReleaseClubPlayers).catch(() => {});
        }
        if (swapClubAId && activeSeason) {
          fetchClubPlayersWithContracts(parseInt(swapClubAId), activeSeason.id).then(setSwapClubAPlayers).catch(() => {});
        }
        if (swapClubBId && activeSeason) {
          fetchClubPlayersWithContracts(parseInt(swapClubBId), activeSeason.id).then(setSwapClubBPlayers).catch(() => {});
        }
      } else {
        showToast(`Failed to revert: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to revert'}`);
    } finally {
      setRevertingId(null);
    }
  };

  // Auction State
  const [auctionTiming, setAuctionTiming] = useState<"start" | "mid">("start");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [winningClubId, setWinningClubId] = useState<string>("");
  const [bidAmount, setBidAmount] = useState<number>(80);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Custom player dropdown state
  const [playerDropdownOpen, setPlayerDropdownOpen] = useState<boolean>(false);
  const [playerDropdownSearch, setPlayerDropdownSearch] = useState<string>("");
  const [playerPositionFilter, setPlayerPositionFilter] = useState<string>("ALL");

  // Custom club dropdown state (auction tab)
  const [clubDropdownOpen, setClubDropdownOpen] = useState<boolean>(false);
  const [clubDropdownSearch, setClubDropdownSearch] = useState<string>("");

  // Custom club dropdown state (sell/release/swap tabs)
  const [sellClubDDOpen, setSellClubDDOpen] = useState(false);
  const [sellClubDDSearch, setSellClubDDSearch] = useState("");
  const [releaseClubDDOpen, setReleaseClubDDOpen] = useState(false);
  const [releaseClubDDSearch, setReleaseClubDDSearch] = useState("");
  const [swapAClubDDOpen, setSwapAClubDDOpen] = useState(false);
  const [swapAClubDDSearch, setSwapAClubDDSearch] = useState("");
  const [swapBClubDDOpen, setSwapBClubDDOpen] = useState(false);
  const [swapBClubDDSearch, setSwapBClubDDSearch] = useState("");
  // sell buying-club dropdown
  const [sellBuyingDDOpen, setSellBuyingDDOpen] = useState(false);
  const [sellBuyingDDSearch, setSellBuyingDDSearch] = useState("");

  // Sell state
  const [sellClubId, setSellClubId] = useState<string>("");
  const [sellClubPlayers, setSellClubPlayers] = useState<any[]>([]);
  const [sellSelectedPlayer, setSellSelectedPlayer] = useState<any>(null);
  const [sellBuyingClubId, setSellBuyingClubId] = useState<string>("");
  const [sellBuyingClubDDOpen, setSellBuyingClubDDOpen] = useState(false);
  const [sellBuyingClubDDSearch, setSellBuyingClubDDSearch] = useState("");
  const [sellPrice, setSellPrice] = useState<number>(80);
  const [sellSearchTerm, setSellSearchTerm] = useState<string>("");
  const [loadingSellPlayers, setLoadingSellPlayers] = useState<boolean>(false);
  const [bulkTransfers, setBulkTransfers] = useState<any[]>([]);

  // Release state
  const [releaseClubId, setReleaseClubId] = useState<string>("");
  const [releaseClubPlayers, setReleaseClubPlayers] = useState<any[]>([]);
  const [releaseSelectedIds, setReleaseSelectedIds] = useState<number[]>([]);
  const [releaseSearchTerm, setReleaseSearchTerm] = useState<string>("");
  const [releaseTiming, setReleaseTiming] = useState<"start" | "mid">("start");
  const [loadingReleasePlayers, setLoadingReleasePlayers] = useState<boolean>(false);
  const [bulkReleases, setBulkReleases] = useState<any[]>([]);

  // Swap state
  const [swapClubAId, setSwapClubAId] = useState<string>("");
  const [swapClubBId, setSwapClubBId] = useState<string>("");
  const [swapClubAPlayers, setSwapClubAPlayers] = useState<any[]>([]);
  const [swapClubBPlayers, setSwapClubBPlayers] = useState<any[]>([]);
  const [swapPlayerAId, setSwapPlayerAId] = useState<string>("");
  const [swapPlayerBId, setSwapPlayerBId] = useState<string>("");
  const [swapAdjustmentAtoB, setSwapAdjustmentAtoB] = useState<number>(0);
  const [bulkSwaps, setBulkSwaps] = useState<any[]>([]);

  // Prime tab state
  const [primeActiveMode, setPrimeActiveMode] = useState<"assign" | "transfer">("assign");
  const [primeClubId, setPrimeClubId] = useState<string>("");
  const [primeSelectedPlayerIds, setPrimeSelectedPlayerIds] = useState<number[]>([]);
  const [primeSearchQuery, setPrimeSearchQuery] = useState<string>("");
  const [primeRtCost, setPrimeRtCost] = useState<number>(50);
  const [primeAssignValidity, setPrimeAssignValidity] = useState<string>("1.0");
  const [primeAssignCustomValidity, setPrimeAssignCustomValidity] = useState<string>("");
  const [primeTransferSourceId, setPrimeTransferSourceId] = useState<string>("");
  const [primeTransferDestId, setPrimeTransferDestId] = useState<string>("");
  const [primeTransferRtCost, setPrimeTransferRtCost] = useState<number>(50);
  const [primeTransferValidity, setPrimeTransferValidity] = useState<string>("keep");
  const [primeTransferCustomValidity, setPrimeTransferCustomValidity] = useState<string>("");
  const [editingPrimePlayer, setEditingPrimePlayer] = useState<any | null>(null);
  const [editPrimeValidity, setEditPrimeValidity] = useState<string>("1.0");
  const [editPrimeCustomValidity, setEditPrimeCustomValidity] = useState<string>("");
  const [isSavingEditPrime, setIsSavingEditPrime] = useState<boolean>(false);
  const [primeClubDDOpen, setPrimeClubDDOpen] = useState<boolean>(false);
  const [primeClubDDSearch, setPrimeClubDDSearch] = useState<string>("");
  const [primedPlayers, setPrimedPlayers] = useState<any[]>([]);
  const [primeAllPlayers, setPrimeAllPlayers] = useState<any[]>([]);
  const [loadingPrimeData, setLoadingPrimeData] = useState<boolean>(false);

  // Configurable Prime Fee State
  const [primeFeeConfig, setPrimeFeeConfig] = useState<PrimeFeeConfig>({
    upgradeRtCost: 50,
    upgradeRcCost: 0,
    transferRtCost: 50,
    transferRcCost: 0
  });
  const [configPrimeUpgradeRt, setConfigPrimeUpgradeRt] = useState<number>(50);
  const [configPrimeTransferRt, setConfigPrimeTransferRt] = useState<number>(50);
  const [isSavingPrimeFees, setIsSavingPrimeFees] = useState<boolean>(false);

  const loadPrimeData = async () => {
    setLoadingPrimeData(true);
    try {
      const [primedList, allList, feeConfig] = await Promise.all([
        fetchPrimedPlayersList(),
        fetchAdminPlayersList(),
        fetchPrimeFeeConfig()
      ]);
      setPrimedPlayers(primedList || []);
      setPrimeAllPlayers(allList || []);
      if (feeConfig) {
        setPrimeFeeConfig(feeConfig);
        setConfigPrimeUpgradeRt(feeConfig.upgradeRtCost);
        setConfigPrimeTransferRt(feeConfig.transferRtCost);
        setPrimeRtCost(feeConfig.upgradeRtCost);
        setPrimeTransferRtCost(feeConfig.transferRtCost);
      }
    } catch {
      showToast("Error loading Prime settings data!");
    } finally {
      setLoadingPrimeData(false);
    }
  };

  // Active Primed Players Table Search & Pagination (Prime Tab)
  const [primeTabSearch, setPrimeTabSearch] = useState<string>("");
  const [primeTabClubFilter, setPrimeTabClubFilter] = useState<string>("all");
  const [primeTabPage, setPrimeTabPage] = useState<number>(1);
  const [primeTabPageSize, setPrimeTabPageSize] = useState<number>(10);

  const filteredPrimeTabPlayers = useMemo(() => {
    return primedPlayers.filter(p => {
      if (primeTabClubFilter !== "all") {
        if (String(p.clubId) !== primeTabClubFilter && p.clubName !== primeTabClubFilter) return false;
      }
      if (primeTabSearch.trim()) {
        const q = primeTabSearch.toLowerCase().trim();
        const matchName = (p.name || "").toLowerCase().includes(q);
        const matchClub = (p.clubName || "").toLowerCase().includes(q);
        const matchPos = (p.position || "").toLowerCase().includes(q);
        const matchDur = (p.durationLabel || p.validUntil || "").toLowerCase().includes(q);
        const matchExp = (p.expiryLabel || "").toLowerCase().includes(q);
        return matchName || matchClub || matchPos || matchDur || matchExp;
      }
      return true;
    });
  }, [primedPlayers, primeTabClubFilter, primeTabSearch]);

  const totalPrimeTabPages = primeTabPageSize === -1 ? 1 : Math.ceil(filteredPrimeTabPlayers.length / primeTabPageSize) || 1;
  const paginatedPrimeTabPlayers = useMemo(() => {
    if (primeTabPageSize === -1) return filteredPrimeTabPlayers;
    const start = (primeTabPage - 1) * primeTabPageSize;
    return filteredPrimeTabPlayers.slice(start, start + primeTabPageSize);
  }, [filteredPrimeTabPlayers, primeTabPage, primeTabPageSize]);

  const renderPrimeDurationBadge = (p: any) => {
    const durInfo = parsePrimeDurationInfo(
      p.validUntil,
      activeSeason?.season_number || p.seasonNumber || 9,
      !!activeSeason?.is_mid_season
    );

    const isPermanent = durInfo.durationLabel.toLowerCase().includes("permanent");
    const isHalf = durInfo.durationLabel.includes("0.5") || durInfo.durationLabel.toLowerCase().includes("half");
    const isMulti = durInfo.durationLabel.includes("2") || durInfo.durationLabel.includes("3");

    const badgeBg = isPermanent
      ? "rgba(168, 85, 247, 0.15)"
      : isHalf
      ? "rgba(56, 189, 248, 0.15)"
      : isMulti
      ? "rgba(34, 197, 94, 0.15)"
      : "rgba(234, 179, 8, 0.15)";

    const badgeColor = isPermanent
      ? "#c084fc"
      : isHalf
      ? "#38bdf8"
      : isMulti
      ? "#4ade80"
      : "#facc15";

    const badgeBorder = isPermanent
      ? "rgba(168, 85, 247, 0.3)"
      : isHalf
      ? "rgba(56, 189, 248, 0.3)"
      : isMulti
      ? "rgba(34, 197, 94, 0.3)"
      : "rgba(234, 179, 8, 0.3)";

    return (
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 6px",
            borderRadius: "5px",
            background: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
            fontSize: "0.72rem",
            fontWeight: 700,
            whiteSpace: "nowrap"
          }}
        >
          <i
            className={
              isPermanent
                ? "fa-solid fa-infinity"
                : isHalf
                ? "fa-solid fa-bolt"
                : "fa-solid fa-hourglass-half"
            }
            style={{ fontSize: "0.6rem" }}
          />
          {durInfo.durationLabel}
        </span>
        {durInfo.expiryLabel && (
          <span
            style={{
              fontSize: "0.65rem",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "var(--font-mono)",
              whiteSpace: "nowrap"
            }}
          >
            {durInfo.expiryLabel}
          </span>
        )}
      </div>
    );
  };

  const handleSavePrimeDefaultFees = async () => {
    try {
      setIsSavingPrimeFees(true);
      const res = await updatePrimeFeeConfig({
        upgradeRtCost: configPrimeUpgradeRt,
        transferRtCost: configPrimeTransferRt
      });
      if (res.success) {
        setPrimeFeeConfig(prev => ({
          ...prev,
          upgradeRtCost: configPrimeUpgradeRt,
          transferRtCost: configPrimeTransferRt
        }));
        showToast("Default Prime fees saved successfully!");
      } else {
        showToast(res.error || "Failed to update Prime fee configuration.");
      }
    } catch (err: any) {
      showToast(err?.message || "Error updating Prime fees.");
    } finally {
      setIsSavingPrimeFees(false);
    }
  };

  const handleSavePrimeUpgradeAsDefault = async () => {
    try {
      const res = await updatePrimeFeeConfig({ upgradeRtCost: primeRtCost });
      if (res.success) {
        setPrimeFeeConfig(prev => ({ ...prev, upgradeRtCost: primeRtCost }));
        setConfigPrimeUpgradeRt(primeRtCost);
        showToast(`Default Prime Upgrade fee saved as ${primeRtCost} RT!`);
      } else {
        showToast(res.error || "Failed to update default fee.");
      }
    } catch (err: any) {
      showToast(err?.message || "Error updating default fee.");
    }
  };

  const handleSavePrimeTransferAsDefault = async () => {
    try {
      const res = await updatePrimeFeeConfig({ transferRtCost: primeTransferRtCost });
      if (res.success) {
        setPrimeFeeConfig(prev => ({ ...prev, transferRtCost: primeTransferRtCost }));
        setConfigPrimeTransferRt(primeTransferRtCost);
        showToast(`Default Prime Transfer fee saved as ${primeTransferRtCost} RT!`);
      } else {
        showToast(res.error || "Failed to update default fee.");
      }
    } catch (err: any) {
      showToast(err?.message || "Error updating default fee.");
    }
  };

  const computePrimePreview = (val: string, customText: string) => {
    if (val === "keep") return "Keep source player's existing validity";
    if (val === "custom") return customText.trim() ? customText.trim() : "(Enter custom text)";
    const curNum = activeSeason?.season_number || 9;
    const isMid = !!activeSeason?.is_mid_season;
    return formatPrimeValidity(val, curNum, isMid);
  };

  const handleOpenEditPrimeValidity = (p: any) => {
    setEditingPrimePlayer(p);
    const vStr = String(p.validUntil || "").toLowerCase();
    if (vStr.includes("0.5") || vStr.includes("half") || vStr.endsWith("9.5")) {
      setEditPrimeValidity("0.5");
      setEditPrimeCustomValidity("");
    } else if (vStr.includes("1.5") || vStr.endsWith("10.5")) {
      setEditPrimeValidity("1.5");
      setEditPrimeCustomValidity("");
    } else if (vStr.includes("2 season") || vStr.includes("2.0") || vStr.endsWith("11.0")) {
      setEditPrimeValidity("2.0");
      setEditPrimeCustomValidity("");
    } else if (vStr.includes("3 season") || vStr.includes("3.0") || vStr.endsWith("12.0")) {
      setEditPrimeValidity("3.0");
      setEditPrimeCustomValidity("");
    } else if (vStr.includes("permanent")) {
      setEditPrimeValidity("permanent");
      setEditPrimeCustomValidity("");
    } else if (vStr.includes("1 season") || vStr.includes("1.0") || vStr.endsWith("10.0") || vStr === "1") {
      setEditPrimeValidity("1.0");
      setEditPrimeCustomValidity("");
    } else {
      setEditPrimeValidity("custom");
      setEditPrimeCustomValidity(p.validUntil || "");
    }
  };

  const handleSaveEditPrimeValidity = async () => {
    if (!editingPrimePlayer) return;
    const finalVal = editPrimeValidity === "custom" ? editPrimeCustomValidity.trim() : editPrimeValidity;
    if (editPrimeValidity === "custom" && !finalVal) {
      return showToast("Please enter a valid validity text!");
    }

    try {
      setIsSavingEditPrime(true);
      const res = await updatePlayerPrimeValidity(editingPrimePlayer.id, finalVal);
      if (res.success) {
        showToast(`Updated Prime validity for ${editingPrimePlayer.name}: ${res.validUntil}`);
        setEditingPrimePlayer(null);
        loadPrimeData();
      } else {
        showToast(res.error || "Failed to update validity.");
      }
    } catch (err: any) {
      showToast(err?.message || "Error updating Prime validity.");
    } finally {
      setIsSavingEditPrime(false);
    }
  };

  useEffect(() => {
    if (activeTab === "prime") {
      loadPrimeData();
    }
  }, [activeTab]);

  const cleanSeason = (s: string) => s.replace(/[^\d.]/g, '');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const getPositionColor = (pos: string) => {
    const colors: Record<string, string> = {
      GK: "#eab308", CB: "#3b82f6", LB: "#3b82f6", RB: "#3b82f6",
      CM: "#10b981", DM: "#14b8a6", AM: "#a855f7",
      RW: "#f97316", LW: "#f97316", ST: "#ef4444", FW: "#ef4444"
    };
    return colors[pos] || "#6b7280";
  };

  const loadData = async () => {
    try {
      const season = await fetchActiveSeason();
      setActiveSeason(season);
      
      const clubsData = await fetchRegisteredClubs();
      setClubs(clubsData || []);

      const agents = await fetchFreeAgents();
      setFreeAgents(agents || []);
    } catch {
      showToast("Error loading portal data!");
    }
  };

  useEffect(() => {
    loadData();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);

    // Close all custom dropdowns on outside click
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-player-dropdown]")) setPlayerDropdownOpen(false);
      if (!target.closest("[data-club-dropdown]")) setClubDropdownOpen(false);
      if (!target.closest("[data-sell-club-dd]")) setSellClubDDOpen(false);
      if (!target.closest("[data-release-club-dd]")) setReleaseClubDDOpen(false);
      if (!target.closest("[data-swapa-club-dd]")) setSwapAClubDDOpen(false);
      if (!target.closest("[data-swapb-club-dd]")) setSwapBClubDDOpen(false);
      if (!target.closest("[data-prime-club-dd]")) setPrimeClubDDOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup sell details when sellClubId changes
  useEffect(() => {
    if (sellClubId && activeSeason) {
      setLoadingSellPlayers(true);
      fetchClubPlayersWithContracts(parseInt(sellClubId), activeSeason.id)
        .then((data) => {
          setSellClubPlayers(data || []);
          setSellSelectedPlayer(null);
          setSellBuyingClubId("");
          setSellPrice(80);
          setLoadingSellPlayers(false);
        })
        .catch(() => {
          showToast("Error loading squad roster");
          setLoadingSellPlayers(false);
        });
    } else {
      setSellClubPlayers([]);
      setSellSelectedPlayer(null);
      setSellBuyingClubId("");
      setSellPrice(80);
    }
  }, [sellClubId, activeSeason]);

  // Loading release squad players
  useEffect(() => {
    if (releaseClubId && activeSeason) {
      setLoadingReleasePlayers(true);
      fetchClubPlayersWithContracts(parseInt(releaseClubId), activeSeason.id)
        .then((data) => {
          setReleaseClubPlayers(data || []);
          setReleaseSelectedIds([]);
          setLoadingReleasePlayers(false);
        })
        .catch(() => {
          showToast("Error loading club players");
          setLoadingReleasePlayers(false);
        });
    } else {
      setReleaseClubPlayers([]);
      setReleaseSelectedIds([]);
    }
  }, [releaseClubId, activeSeason]);

  // Loading swap club A squad players
  useEffect(() => {
    if (swapClubAId && activeSeason) {
      fetchClubPlayersWithContracts(parseInt(swapClubAId), activeSeason.id)
        .then(setSwapClubAPlayers)
        .catch(() => showToast("Error loading Club A players"));
      setSwapPlayerAId("");
    } else {
      setSwapClubAPlayers([]);
    }
  }, [swapClubAId, activeSeason]);

  // Loading swap club B squad players
  useEffect(() => {
    if (swapClubBId && activeSeason) {
      fetchClubPlayersWithContracts(parseInt(swapClubBId), activeSeason.id)
        .then(setSwapClubBPlayers)
        .catch(() => showToast("Error loading Club B players"));
      setSwapPlayerBId("");
    } else {
      setSwapClubBPlayers([]);
    }
  }, [swapClubBId, activeSeason]);

  // Batch release state
  const [batchPreviewPlayers, setBatchPreviewPlayers] = useState<any[]>([]);
  const [batchPreviewOpen, setBatchPreviewOpen] = useState(false);
  const [batchReleasedPlayers, setBatchReleasedPlayers] = useState<any[]>([]);
  const [batchReleasedOpen, setBatchReleasedOpen] = useState(false);
  const [batchLoadingPreview, setBatchLoadingPreview] = useState(false);

  const loadBatchPreview = async () => {
    if (!activeSeason) return;
    setBatchLoadingPreview(true);
    try {
      const res = await fetchPlayersToBeReleased(activeSeason.season_number);
      setBatchPreviewPlayers(res.players);
      setBatchPreviewOpen(true);
      setBatchReleasedPlayers([]);
      setBatchReleasedOpen(false);
    } catch {
      showToast("Error loading preview!");
    } finally {
      setBatchLoadingPreview(false);
    }
  };

  const copyBatchList = (players: any[], title: string) => {
    const lines = [`*${title}*`, ""];
    let lastClub = "";
    for (const p of players) {
      if (p.club_name !== lastClub) {
        if (lastClub !== "") lines.push("");
        lines.push(`*${p.club_name || "Free Agent"}*`);
        lastClub = p.club_name;
      }
      const typeLabel = p.contract_type === 'mid' ? '[Mid]' : '[Start]';
      lines.push(`  * ${p.player_name} (${p.position}) ${typeLabel} -- Contract: ${cleanSeason(p.start_season)}-${cleanSeason(p.expire_season)}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
    showToast("Copied to clipboard!");
  };

  const filteredSellPlayers = useMemo(() => {
    return sellClubPlayers.filter(p =>
      p.name.toLowerCase().includes(sellSearchTerm.toLowerCase()) ||
      p.position.toLowerCase().includes(sellSearchTerm.toLowerCase())
    );
  }, [sellClubPlayers, sellSearchTerm]);

  // Compute release calculations for squad players
  const releasePlayersWithRefunds = useMemo(() => {
    if (!activeSeason) return [];
    
    const currentSeasonNum = Number(activeSeason.season_number) || 9;
    const releaseSeasonNum = currentSeasonNum + (releaseTiming === 'mid' ? 0.5 : 0);

    const parseSeason = (s: string) => {
      const cleaned = s.replace(/[^\d.]/g, '');
      return parseFloat(cleaned) || 0.0;
    };

    return releaseClubPlayers.map(p => {
      const signedValue = Number(p.signedValue) || 0;
      const baseValue = Number(p.value) || 0;
      const startSeasonNum = parseSeason(p.startSeason || '');
      const expireSeasonNum = parseSeason(p.expireSeason || '');

      const totalDuration = expireSeasonNum - startSeasonNum;
      const remainingDuration = expireSeasonNum - releaseSeasonNum;
      const elapsedDuration = releaseSeasonNum - startSeasonNum;

      let refundAmount = 0;
      if (remainingDuration >= 1.0) {
        refundAmount = Math.round(baseValue * 0.5);
      } else {
        refundAmount = 0;
      }

      return {
        ...p,
        totalDuration,
        elapsedDuration,
        remainingDuration,
        remainingValue: baseValue,
        refundAmount
      };
    });
  }, [releaseClubPlayers, releaseTiming, activeSeason]);

  // Roster filtering via search input (Release tab)
  const filteredReleasePlayers = useMemo(() => {
    return releasePlayersWithRefunds.filter(p => 
      p.name.toLowerCase().includes(releaseSearchTerm.toLowerCase()) ||
      p.position.toLowerCase().includes(releaseSearchTerm.toLowerCase())
    );
  }, [releasePlayersWithRefunds, releaseSearchTerm]);

  // Filter free agents based on search query (Auction tab)
  const filteredFreeAgents = freeAgents.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Transfer queue: add one deal at a time
  const handleAddTransfer = () => {
    if (!sellClubId) return showToast("Select a selling club!");
    if (!sellSelectedPlayer) return showToast("Select a player!");
    if (!sellBuyingClubId) return showToast("Select a buying club!");
    if (sellPrice <= 0) return showToast("Enter a valid transfer price!");
    if (sellBuyingClubId === sellClubId) return showToast("Buying club cannot be the same as selling club!");
    if (sellPrice % 2 !== 0) return showToast(`Price must be an even number!`);
    const prevValue = Number(sellSelectedPlayer.signedValue) || 0;
    const minPrice = 0.5 * prevValue;
    const maxPrice = 2.0 * prevValue;
    if (prevValue > 0 && (sellPrice < minPrice || sellPrice > maxPrice)) {
      return showToast(`Price must be between ${minPrice} and ${maxPrice} Coins (50%-200% of ${prevValue})`);
    }
    const alreadyQueued = bulkTransfers.some(t => t.playerId === sellSelectedPlayer.id);
    if (alreadyQueued) return showToast(`${sellSelectedPlayer.name} is already in the queue!`);
    const sellingClub = clubs.find(c => c.id.toString() === sellClubId);
    const buyingClub = clubs.find(c => c.id.toString() === sellBuyingClubId);
    setBulkTransfers(prev => [...prev, {
      sellingClubId: parseInt(sellClubId),
      sellingClubName: sellingClub?.name || "",
      sellingClubLogo: sellingClub?.image || "",
      playerId: sellSelectedPlayer.id,
      playerName: sellSelectedPlayer.name,
      playerPosition: sellSelectedPlayer.position,
      playerImage: sellSelectedPlayer.imagePath,
      playerValue: prevValue,
      buyingClubId: parseInt(sellBuyingClubId),
      buyingClubName: buyingClub?.name || "",
      buyingClubLogo: buyingClub?.image || "",
      price: sellPrice,
      expireSeason: sellSelectedPlayer.expireSeason,
    }]);
    showToast(`${sellSelectedPlayer.name} â-- ${buyingClub?.name} added to queue!`);
    // Reset player + buying club but keep selling club so user can add another from same club
    setSellSelectedPlayer(null);
    setSellBuyingClubId("");
    setSellPrice(80);
    setSellBuyingDDOpen(false);
    setSellBuyingDDSearch("");
  };

  const handleExecuteBulkTransfers = () => {
    if (bulkTransfers.length === 0) return showToast("No transfers queued!");
    if (!confirm(`Execute ${bulkTransfers.length} transfer(s)?`)) return;
    startTransition(async () => {
      try {
        const payload = bulkTransfers.map(t => ({
          sellingClubId: t.sellingClubId,
          playerId: t.playerId,
          price: t.price,
          buyingClubId: t.buyingClubId,
        }));
        const res = await executeBulkTransfers(payload);
        showToast("All transfers executed successfully!");
        if (res?.operationId) {
          setLastOpBanner({
            id: res.operationId,
            title: `Bulk Transfer (${bulkTransfers.length} player${bulkTransfers.length > 1 ? 's' : ''})`,
            description: bulkTransfers.map(t => `${t.playerName} -> ${t.buyingClubName}`).slice(0, 3).join(', ') + (bulkTransfers.length > 3 ? '...' : '')
          });
        }
        setBulkTransfers([]);
        setSellSelectedPlayer(null);
        setSellClubId("");
        setSellBuyingClubId("");
        setSellPrice(80);
        loadData();
      } catch (err: any) {
        showToast(`Transfer failed: ${err.message || "Check balances or parameters"}`);
      }
    });
  };

  const handleSelectAuctionPlayer = (id: string) => {
    setSelectedPlayerId(id);
    const p = freeAgents.find(x => x.id.toString() === id);
    if (p && p.value !== undefined && p.value !== null) {
      setBidAmount(Number(p.value) || 80);
    }
  };

  // WhatsApp Auction Handler
  const handleRapidAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) return showToast("Select a player!");
    if (!winningClubId) return showToast("Select winning club!");
    if (bidAmount <= 0) return showToast("Enter a valid bid amount!");

    startTransition(async () => {
      try {
        const res = await executeTransferBuy(
          parseInt(winningClubId),
          parseInt(selectedPlayerId),
          bidAmount,
          auctionTiming
        );
        
        const playerObj = freeAgents.find(p => p.id.toString() === selectedPlayerId);
        const winningClub = clubs.find(c => c.id.toString() === winningClubId);
        showToast(`Assigned ${playerObj?.name || 'Player'} to club successfully!`);

        if (res?.operationId) {
          setLastOpBanner({
            id: res.operationId,
            title: `Auction Sign: ${playerObj?.name || 'Player'} to ${winningClub?.name || 'Club'}`,
            description: `Signed for ${bidAmount} Coins (${auctionTiming === 'mid' ? 'Mid-Season' : 'Season Start'})`
          });
        }
        
        setSelectedPlayerId("");
        setWinningClubId("");
        setBidAmount(80);
        loadData();
      } catch (err: any) {
        showToast(`Assignment failed: ${err.message || "Insufficient balance"}`);
      }
    });
  };

  // Release queue: add multiple checked players from the selected team
  const handleAddRelease = () => {
    if (!releaseClubId) return showToast("Select a club!");
    if (releaseSelectedIds.length === 0) return showToast("Select at least one player!");

    const club = clubs.find(c => c.id.toString() === releaseClubId);
    let addedCount = 0;

    const parseSeason = (s: string) => {
      const cleaned = s.replace(/[^\d.]/g, '');
      return parseFloat(cleaned) || 0.0;
    };

    setBulkReleases(prev => {
      const nextQueue = [...prev];
      for (const playerId of releaseSelectedIds) {
        const player = releaseClubPlayers.find(p => p.id === playerId);
        if (!player) continue;
        
        const alreadyQueued = nextQueue.some(r => r.playerId === playerId);
        if (alreadyQueued) continue;

        // Calculate refund
        const signedValue = Number(player.signedValue) || 0;
        const baseValue = Number(player.value) || 0;
        const startSeasonNum = parseSeason(player.startSeason || '');
        const expireSeasonNum = parseSeason(player.expireSeason || '');
        const totalDuration = expireSeasonNum - startSeasonNum;
        
        let refund = 0;
        if (totalDuration > 0 && activeSeason) {
          const currentSeasonNum = Number(activeSeason.season_number) || 9;
          const releaseSeasonNum = currentSeasonNum + (releaseTiming === 'mid' ? 0.5 : 0);
          const remainingDuration = expireSeasonNum - releaseSeasonNum;
          if (remainingDuration > 0) {
            const valueRatio = signedValue / baseValue;
            const refundFactor = valueRatio > 1.25 ? 0.5 : 0.75;
            const baseRefund = (remainingDuration / totalDuration) * baseValue;
            refund = Math.round(baseRefund * refundFactor);
          }
        }

        nextQueue.push({
          clubId: parseInt(releaseClubId),
          clubName: club?.name || "",
          clubLogo: club?.image || "",
          playerId: player.id,
          playerName: player.name,
          playerPosition: player.position,
          playerImage: player.imagePath,
          expireSeason: player.expireSeason,
          refundAmount: refund,
          giveRefund: refund > 0,
        });
        addedCount++;
      }
      return nextQueue;
    });

    if (addedCount > 0) {
      showToast(`Added ${addedCount} player(s) to release queue!`);
    } else {
      showToast("All selected players were already in the queue!");
    }
    setReleaseSelectedIds([]);
  };

  const handleExecuteBulkReleases = () => {
    if (bulkReleases.length === 0) return showToast("No releases queued!");
    const totalRefundEst = bulkReleases.reduce((sum, r) => sum + (r.giveRefund ? (r.refundAmount || 0) : 0), 0);
    if (!confirm(`Are you sure you want to release all ${bulkReleases.length} queued player(s)? Total refund: ${totalRefundEst} Coins.`)) return;

    startTransition(async () => {
      try {
        const releasePayload = bulkReleases.map(r => ({
          playerId: r.playerId,
          giveRefund: r.giveRefund !== false,
          refundAmount: r.giveRefund ? r.refundAmount : 0
        }));
        const res = await releaseBulkPlayerContracts(
          releasePayload,
          activeSeason.id,
          releaseTiming
        );
        showToast(`Successfully released ${res.count || bulkReleases.length} player(s)!`);
        if (res?.operationId) {
          setLastOpBanner({
            id: res.operationId,
            title: `Bulk Release (${bulkReleases.length} player${bulkReleases.length > 1 ? 's' : ''})`,
            description: `Refunded total ${res.totalRefund || 0} Coins`
          });
        }
        setBulkReleases([]);
        setReleaseSelectedIds([]);
        setReleaseClubId("");
        loadData();
      } catch (err: any) {
        showToast(`Operation failed: ${err.message || "Failed to execute"}`);
      }
    });
  };

  // Swap deal handlers
  const addSwapToQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapClubAId || !swapClubBId || !swapPlayerAId || !swapPlayerBId) {
      return showToast("Please select all clubs and players for swap!");
    }
    if (swapClubAId === swapClubBId) {
      return showToast("Cannot swap players within the same club!");
    }

    const clubAObj = clubs.find(c => c.id.toString() === swapClubAId);
    const clubBObj = clubs.find(c => c.id.toString() === swapClubBId);
    const playerAObj = swapClubAPlayers.find(p => p.id.toString() === swapPlayerAId);
    const playerBObj = swapClubBPlayers.find(p => p.id.toString() === swapPlayerBId);

    const valA = playerAObj ? Number(playerAObj.signedValue) || 0 : 0;
    const valB = playerBObj ? Number(playerBObj.signedValue) || 0 : 0;
    const swapValue = Math.max(valA, valB);

    const newDeal = {
      clubAId: parseInt(swapClubAId),
      clubBId: parseInt(swapClubBId),
      playerAId: parseInt(swapPlayerAId),
      playerBId: parseInt(swapPlayerBId),
      clubAName: clubAObj ? clubAObj.name : `Club #${swapClubAId}`,
      clubBName: clubBObj ? clubBObj.name : `Club #${swapClubBId}`,
      playerAName: playerAObj ? playerAObj.name : `Player #${swapPlayerAId}`,
      playerBName: playerBObj ? playerBObj.name : `Player #${swapPlayerBId}`,
      cashAdjustmentAtoB: swapAdjustmentAtoB,
      newValue: swapValue
    };

    const isPlayerADuplicated = bulkSwaps.some(s => s.playerAId === newDeal.playerAId || s.playerBId === newDeal.playerAId || s.playerAId === newDeal.playerBId || s.playerBId === newDeal.playerBId);
    const isPlayerBDuplicated = bulkSwaps.some(s => s.playerAId === newDeal.playerBId || s.playerBId === newDeal.playerBId || s.playerAId === newDeal.playerAId || s.playerBId === newDeal.playerAId);
    if (isPlayerADuplicated || isPlayerBDuplicated) {
      return showToast("One or both players are already included in a queued swap deal!");
    }

    setBulkSwaps(prev => [...prev, newDeal]);
    showToast("Swap deal added to queue!");

    setSwapPlayerAId("");
    setSwapPlayerBId("");
    setSwapAdjustmentAtoB(0);
  };

  const handleExecuteBulkSwaps = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkSwaps.length === 0) {
      return showToast("No swap deals in queue!");
    }

    if (!confirm(`Are you sure you want to execute all ${bulkSwaps.length} queued swap deal(s)?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const payload = bulkSwaps.map(s => ({
          clubAId: s.clubAId,
          playerAId: s.playerAId,
          clubBId: s.clubBId,
          playerBId: s.playerBId,
          cashAdjustmentAtoB: s.cashAdjustmentAtoB
        }));

        const res = await executeBulkSwaps(payload);
        showToast("All swap deals executed successfully!");
        if (res?.operationId) {
          setLastOpBanner({
            id: res.operationId,
            title: `Bulk Swap (${bulkSwaps.length} deal${bulkSwaps.length > 1 ? 's' : ''})`,
            description: bulkSwaps.map(s => `${s.playerAName} <-> ${s.playerBName}`).slice(0, 3).join(', ') + (bulkSwaps.length > 3 ? '...' : '')
          });
        }
        setBulkSwaps([]);
        loadData();
      } catch (err: any) {
        showToast(`Bulk swap failed: ${err.message || "Verify parameters or balances"}`);
      }
    });
  };

  const triggerSeasonStartReleases = () => {
    if (!activeSeason) return;
    if (batchPreviewPlayers.length === 0) {
      showToast("Load the preview list first before releasing.");
      return;
    }
    if (!confirm(`Release ${batchPreviewPlayers.length} players whose contracts expired at Season ${activeSeason.season_number}?`)) return;
    startTransition(async () => {
      try {
        const res = await releaseExpiredContractsForSeason(activeSeason.season_number);
        showToast(`Released ${res.releasedCount} players whose contracts expired.`);
        setBatchReleasedPlayers(batchPreviewPlayers);
        setBatchReleasedOpen(true);
        setBatchPreviewPlayers([]);
        setBatchPreviewOpen(false);
        loadData();
      } catch {
        showToast("Error triggering releases!");
      }
    });
  };

  return (
    <div className="portal-root-wrapper" style={{ overflowX: "hidden" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      <div className="portal-container">
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        <div className="portal-header">
          <div className="portal-page-badge"><i className="fa-solid fa-arrow-right-arrow-left" /> Transfer & Auction Hub</div>
          <h1 className="portal-title">SQUAD MANAGEMENT CENTER</h1>
          <p className="portal-subtitle">
            Sign auction free agents. Process transfer sales, swaps, and releases between franchise wallets.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="tab-menu" style={{ display: "flex", gap: "8px", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "8px", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          <button className={`portal-btn ${activeTab === 'auction' ? 'btn-primary' : 'btn-secondary'}`} style={{ flexShrink: 0, whiteSpace: "nowrap" }} onClick={() => setActiveTab('auction')}>
            <i className="fa-solid fa-gavel" /> Player Auction
          </button>
          <button className={`portal-btn ${activeTab === 'sell' ? 'btn-primary' : 'btn-secondary'}`} style={{ flexShrink: 0, whiteSpace: "nowrap" }} onClick={() => setActiveTab('sell')}>
            <i className="fa-solid fa-shuffle" /> Transfer Squad Players
          </button>
          <button className={`portal-btn ${activeTab === 'release' ? 'btn-primary' : 'btn-secondary'}`} style={{ flexShrink: 0, whiteSpace: "nowrap" }} onClick={() => setActiveTab('release')}>
            <i className="fa-solid fa-file-contract" /> Bulk Release
          </button>
          <button className={`portal-btn ${activeTab === 'swap' ? 'btn-primary' : 'btn-secondary'}`} style={{ flexShrink: 0, whiteSpace: "nowrap" }} onClick={() => setActiveTab('swap')}>
            <i className="fa-solid fa-rotate" /> Swap Deal
          </button>
          <button className={`portal-btn ${activeTab === 'window' ? 'btn-primary' : 'btn-secondary'}`} style={{ flexShrink: 0, whiteSpace: "nowrap" }} onClick={() => setActiveTab('window')}>
            <i className="fa-solid fa-calendar-minus" /> Season Releases
          </button>
          <button className={`portal-btn ${activeTab === 'prime' ? 'btn-primary' : 'btn-secondary'}`} style={{ flexShrink: 0, whiteSpace: "nowrap" }} onClick={() => setActiveTab('prime')}>
            <i className="fa-solid fa-crown" /> Prime Player (1 Season)
          </button>
          <button className={`portal-btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} style={{ flexShrink: 0, whiteSpace: "nowrap" }} onClick={() => setActiveTab('history')}>
            <i className="fa-solid fa-clock-rotate-left" /> History & Revert
          </button>
        </div>

        {/* Instant Undo / Revert Banner */}
        {lastOpBanner && (
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
              flexWrap: "wrap",
              gap: "0.75rem",
              animation: "adminFadeIn 0.3s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: "1.25rem" }} />
              <div>
                <span style={{ fontWeight: 700, color: "#fff" }}>{lastOpBanner.title}</span>
                {lastOpBanner.description && (
                  <span style={{ fontSize: "0.85rem", opacity: 0.85, marginLeft: "8px" }}>
                    ({lastOpBanner.description})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRevert(lastOpBanner.id, lastOpBanner.title)}
                disabled={revertingId === lastOpBanner.id}
                style={{
                  padding: "4px 12px",
                  borderRadius: "6px",
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.45)",
                  color: "#fca5a5",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginLeft: "0.5rem"
                }}
              >
                <i className={`fa-solid ${revertingId === lastOpBanner.id ? 'fa-spinner fa-spin' : 'fa-rotate-left'}`} />
                {revertingId === lastOpBanner.id ? 'Reverting...' : 'Undo / Revert This Action'}
              </button>
            </div>
            <button
              onClick={() => setLastOpBanner(null)}
              style={{ background: "none", border: "none", color: "#34d399", cursor: "pointer", fontSize: "1.1rem" }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}

        {/* Tab 1: Player Auction */}
        {activeTab === 'auction' && (
          <div>
            {/* Config Timing Bar */}
            <div className="admin-card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Active Season: </span>
                  <strong style={{ color: "#fff" }}>Season {activeSeason?.season_number || "9"}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Auction Window:</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button 
                      type="button" 
                      className={`portal-btn ${auctionTiming === 'start' ? 'btn-primary' : 'btn-secondary'}`} 
                      onClick={() => setAuctionTiming('start')}
                      style={{ padding: "4px 12px", fontSize: "0.75rem", height: "30px" }}
                    >
                      Season Start
                    </button>
                    <button 
                      type="button" 
                      className={`portal-btn ${auctionTiming === 'mid' ? 'btn-primary' : 'btn-secondary'}`} 
                      onClick={() => setAuctionTiming('mid')}
                      style={{ padding: "4px 12px", fontSize: "0.75rem", height: "30px" }}
                    >
                      Mid-Season
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="financial-layout">
              {/* Left Form: Assign winner */}
              <div className="financial-sidebar">
                <div className="admin-card" style={{ marginTop: 0, padding: "1.5rem" }}>
                  <h2 className="admin-card-title">
                    <i className="fa-solid fa-file-signature" style={{ color: "var(--solo-primary)", marginRight: "8px" }} />
                    Assign Auction Winner
                  </h2>
                  <form onSubmit={handleRapidAssign}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                      <div className="admin-form-group">
                        <label>Select Player</label>
                        <AdminPlayerAuctionDropdown
                          freeAgents={freeAgents}
                          selectedPlayerId={selectedPlayerId}
                          onSelect={(id) => handleSelectAuctionPlayer(id)}
                          getPositionColor={getPositionColor}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label>Select Bidding Club</label>
                        <AdminClubDropdown
                          clubs={clubs}
                          selectedClubId={winningClubId}
                          onSelect={(id) => setWinningClubId(id)}
                          placeholder="-- Select Winner --"
                        />
                      </div>

                      {(() => {
                        const selPlayer = freeAgents.find(p => p.id.toString() === selectedPlayerId);
                        const selClub = clubs.find(c => c.id.toString() === winningClubId);
                        const isLegend = Boolean(
                          selPlayer &&
                          ((selPlayer.star || '').toLowerCase() === 'legend' || (selPlayer.card_type || '').toLowerCase() === 'legend')
                        );
                        return (
                          <>
                            {selClub && (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px 12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  {(selClub.image || selClub.logo_path) ? (
                                    <img src={selClub.image || selClub.logo_path} alt="" style={{ width: "22px", height: "22px", objectFit: "contain" }} />
                                  ) : (
                                    <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }} />
                                  )}
                                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>{selClub.name}</span>
                                </div>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                  <span style={{ fontSize: "0.72rem", color: "#eab308", background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.25)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                                    🪙 {Number(selClub.coins || 0).toLocaleString()}
                                  </span>
                                  <span style={{ fontSize: "0.72rem", color: "#38bdf8", background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.25)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                                    🟡 {selClub.tokens || 0} RT
                                  </span>
                                </div>
                              </div>
                            )}
                            {isLegend && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px", background: "rgba(234, 179, 8, 0.08)", border: "1px solid rgba(234, 179, 8, 0.25)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.78rem", color: "#eab308" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <i className="fa-solid fa-crown" />
                                  <span><strong>Legend Player:</strong> 10 RT fee will be deducted from club wallet upon signing.</span>
                                </div>
                                {selClub && (selClub.tokens || 0) < 10 && (
                                  <div style={{ color: "#ef4444", fontWeight: 600, marginTop: "2px" }}>
                                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "4px" }} />
                                    Club only has {selClub.tokens || 0} RT (requires 10 RT).
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      <div className="admin-form-group">
                        <label>Winning Bid Amount (Coins)</label>
                        <input 
                          type="number" 
                          className="admin-input" 
                          value={bidAmount} 
                          onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)} 
                          required 
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                          <span>Salary (5%): <strong>{(bidAmount * 0.05).toFixed(1)} Coins</strong></span>
                          <span>Contract: <strong>
                            {(() => {
                              const num = activeSeason?.season_number;
                              if (!num) return "2 Seasons";
                              const start = auctionTiming === "mid" ? num + 0.5 : num;
                              const end = start + 2;
                              const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
                              return `${fmt(start)}-${fmt(end)}`;
                            })()}
                          </strong></span>
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="portal-btn btn-primary" 
                        style={{ width: "100%", justifyContent: "center", height: "40px", fontSize: "0.9rem" }}
                        disabled={isPending}
                      >
                        {isPending ? "Assigning..." : "Assign Player & Deduct Wallet"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right List: Free agent directory (Hides when player is selected) */}
              {!selectedPlayerId && (
                <div className="financial-main">
                  <div className="admin-card" style={{ marginTop: 0, padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "10px" }}>
                      <h2 className="admin-card-title" style={{ margin: 0 }}>
                        <i className="fa-solid fa-users" style={{ color: "var(--solo-primary)", marginRight: "8px" }} />
                        Free Agents ({filteredFreeAgents.length})
                      </h2>
                      <input 
                        type="text" 
                        className="admin-input" 
                        placeholder="Search player or position..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ maxWidth: "220px", height: "32px", fontSize: "0.8rem" }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem", maxHeight: "550px", overflowY: "auto", paddingRight: "4px" }}>
                      {filteredFreeAgents.map(p => {
                        const isSelected = selectedPlayerId === p.id.toString();
                        return (
                          <div
                            key={p.id}
                            style={{
                              background: isSelected ? "rgba(0, 102, 255, 0.08)" : "rgba(255, 255, 255, 0.02)",
                              border: isSelected ? "1.5px solid rgba(0, 102, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)",
                              borderRadius: "12px",
                              padding: "1rem",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                              transition: "all 0.15s ease",
                              boxShadow: isSelected ? "0 4px 20px rgba(0,102,255,0.15)" : "none"
                            }}
                            onClick={() => handleSelectAuctionPlayer(p.id.toString())}
                            onMouseEnter={e => { if(!isSelected) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)"; }}
                            onMouseLeave={e => { if(!isSelected) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)"; }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <img
                                src={p.imagePath || '/assets/images/players/default.png'}
                                alt=""
                                style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.1)" }}
                                onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <strong style={{ color: "#fff", display: "block", fontSize: "0.9rem", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{p.name}</strong>
                                  {p.isPrime && (
                                    <span
                                      style={{
                                        background: "linear-gradient(135deg, rgba(234, 179, 8, 0.28) 0%, rgba(245, 158, 11, 0.16) 100%)",
                                        color: "#fbbf24",
                                        border: "1px solid rgba(251, 191, 36, 0.5)",
                                        padding: "1px 5px",
                                        borderRadius: "4px",
                                        fontSize: "0.62rem",
                                        fontWeight: 800,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "3px"
                                      }}
                                    >
                                      <i className="fa-solid fa-crown" style={{ fontSize: "0.55rem" }} /> PRIME
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "3px" }}>
                                  <span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.65rem", padding: "1px 5px", fontWeight: 700 }}>{p.position}</span>
                                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>
                                    {p.isPrime ? <strong style={{ color: "#fbbf24" }}>Prime Tier</strong> : p.star.replace("-", " ")}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px", marginTop: "2px" }}>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Base Value:</span>
                              <strong style={{ fontSize: "0.85rem", color: "#f59e0b" }}>{p.value} Coins</strong>
                            </div>
                          </div>
                        );
                      })}
                      {filteredFreeAgents.length === 0 && (
                        <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                          No free agents found matching your query.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Sell */}
        {activeTab === 'sell' && (
          <div className="admin-card" style={{ overflow: "visible" }}>
            <h2 className="admin-card-title"><i className="fa-solid fa-shuffle" /> Transfer Squad Players</h2>

            {/* â-€â-€ Selling Club â-€â-€ */}
            <div className="sub-card" style={{ marginBottom: "1rem", overflow: "visible" }}>
              <div className="sub-card-title">Selling Club</div>
              <div className="admin-form-group">
                <label>Select Club to Sell From</label>
                <AdminClubDropdown
                  clubs={clubs}
                  selectedClubId={sellClubId}
                  onSelect={(id) => {
                    setSellClubId(id);
                    setSellSelectedPlayer(null);
                    setSellBuyingClubId("");
                  }}
                  placeholder="-- Select Club --"
                />
              </div>

              {/* Player table -- appears after club selected */}
              {sellClubId && (
                sellSelectedPlayer ? (
                  // Selected player chip
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", background: "rgba(0,102,255,0.08)", border: "1.5px solid rgba(0,102,255,0.3)", borderRadius: "10px", padding: "10px 14px" }}>
                    <img src={sellSelectedPlayer.imagePath} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong style={{ color: "#fff", display: "block", fontSize: "0.9rem" }}>{sellSelectedPlayer.name}</strong>
                        {sellSelectedPlayer.isPrime && (
                          <span
                            style={{
                              background: "linear-gradient(135deg, rgba(234, 179, 8, 0.28) 0%, rgba(245, 158, 11, 0.16) 100%)",
                              color: "#fbbf24",
                              border: "1px solid rgba(251, 191, 36, 0.5)",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              fontSize: "0.62rem",
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px"
                            }}
                          >
                            <i className="fa-solid fa-crown" style={{ fontSize: "0.55rem" }} /> PRIME
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "3px", flexWrap: "wrap" }}>
                        <span style={{ background: `${getPositionColor(sellSelectedPlayer.position)}18`, color: getPositionColor(sellSelectedPlayer.position), border: `1px solid ${getPositionColor(sellSelectedPlayer.position)}40`, borderRadius: "4px", fontSize: "0.65rem", padding: "1px 5px", fontWeight: 700 }}>{sellSelectedPlayer.position}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{cleanSeason(sellSelectedPlayer.startSeason)}-{cleanSeason(sellSelectedPlayer.expireSeason)}</span>
                        <span style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: 600 }}>{sellSelectedPlayer.signedValue}c</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setSellSelectedPlayer(null)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", padding: "4px 10px", cursor: "pointer", flexShrink: 0 }}>
                      <i className="fa-solid fa-rotate-left" style={{ marginRight: "4px" }} />Change
                    </button>
                  </div>
                ) : (
                  // Player table
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "12px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>Select Player to Transfer</label>
                      <input type="text" className="admin-input" style={{ maxWidth: "220px", fontSize: "0.78rem", padding: "5px 10px" }} placeholder="Search name / position..." value={sellSearchTerm} onChange={e => setSellSearchTerm(e.target.value)} />
                    </div>
                    {loadingSellPlayers ? (
                      <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-secondary)" }}><i className="fa-solid fa-spinner fa-spin" /> Loading...</div>
                    ) : (
                      isMobile ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          {sellClubPlayers.filter(p => sellSearchTerm === "" || p.name.toLowerCase().includes(sellSearchTerm.toLowerCase()) || p.position.toLowerCase().includes(sellSearchTerm.toLowerCase())).map(p => (
                            <div key={p.id} onClick={() => { setSellSelectedPlayer(p); setSellPrice(Number(p.signedValue) || 80); setSellSearchTerm(""); }}
                              style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px", cursor: "pointer", transition: "all 0.15s ease" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                <img src={p.imagePath} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} />
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <strong style={{ color: "#fff", display: "block", fontSize: "0.85rem" }}>{p.name}</strong>
                                    {p.isPrime && (
                                      <span
                                        style={{
                                          background: "linear-gradient(135deg, rgba(234, 179, 8, 0.28) 0%, rgba(245, 158, 11, 0.16) 100%)",
                                          color: "#fbbf24",
                                          border: "1px solid rgba(251, 191, 36, 0.5)",
                                          padding: "1px 4px",
                                          borderRadius: "4px",
                                          fontSize: "0.58rem",
                                          fontWeight: 800
                                        }}
                                      >
                                        👑 PRIME
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.65rem", padding: "1px 5px", fontWeight: 700 }}>{p.position}</span>
                                </div>
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Contract:</span><span style={{ color: "#fff" }}>{cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}</span></div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Value:</span><span style={{ color: "#f59e0b", fontWeight: 600 }}>{p.signedValue}c</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="admin-list-table" style={{ fontSize: "0.85rem" }}>
                            <thead><tr><th>Player</th><th>Pos</th><th>Contract</th><th style={{ textAlign: "right" }}>Value</th></tr></thead>
                            <tbody>
                              {sellClubPlayers.filter(p => sellSearchTerm === "" || p.name.toLowerCase().includes(sellSearchTerm.toLowerCase()) || p.position.toLowerCase().includes(sellSearchTerm.toLowerCase())).map(p => (
                                <tr key={p.id} onClick={() => { setSellSelectedPlayer(p); setSellPrice(Number(p.signedValue) || 80); setSellSearchTerm(""); }} style={{ cursor: "pointer", borderLeft: "3px solid transparent", transition: "background 0.12s" }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                  <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <img src={p.imagePath} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} />
                                      <strong style={{ color: "#fff" }}>{p.name}</strong>
                                      {p.isPrime && (
                                        <span
                                          style={{
                                            background: "linear-gradient(135deg, rgba(234, 179, 8, 0.28) 0%, rgba(245, 158, 11, 0.16) 100%)",
                                            color: "#fbbf24",
                                            border: "1px solid rgba(251, 191, 36, 0.5)",
                                            padding: "1px 4px",
                                            borderRadius: "4px",
                                            fontSize: "0.6rem",
                                            fontWeight: 800
                                          }}
                                        >
                                          👑 PRIME
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td><span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.7rem", padding: "2px 6px", fontWeight: 700 }}>{p.position}</span></td>
                                  <td style={{ color: "var(--text-secondary)" }}>{cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}</td>
                                  <td style={{ textAlign: "right", color: "#f59e0b", fontWeight: 600 }}>{p.signedValue}c</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}
                    {sellClubPlayers.length === 0 && !loadingSellPlayers && <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem", padding: "16px" }}>No players found for this club</div>}
                  </>
                )
              )}
            </div>

            {/* â-€â-€ Deal Builder (shows only when player is selected) â-€â-€ */}
            {sellSelectedPlayer && (
              <div className="sub-card" style={{ marginBottom: "1rem", overflow: "visible" }}>
                <div className="sub-card-title">Buying Club &amp; Price</div>

                {/* Buying Club Dropdown */}
                <div className="admin-form-group" style={{ marginBottom: "1rem" }}>
                  <label>Buying Club</label>
                  <AdminClubDropdown
                    clubs={clubs}
                    selectedClubId={sellBuyingClubId}
                    excludeClubId={sellClubId}
                    onSelect={(id) => setSellBuyingClubId(id)}
                    placeholder="-- Select Buying Club --"
                  />
                </div>

                {/* Price */}
                <div className="admin-form-group" style={{ marginBottom: "1rem" }}>
                  <label>Transfer Price (Coins)</label>
                  <input type="number" className="admin-input" value={sellPrice} onChange={e => setSellPrice(parseInt(e.target.value) || 0)} />
                  {sellSelectedPlayer && (() => {
                    const v = Number(sellSelectedPlayer.signedValue) || 0;
                    return v > 0 ? (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "5px" }}>
                        <span>Range: <strong style={{ color: "#fff" }}>{v * 0.5}-{v * 2} Coins</strong></span>
                        <span>Current value: <strong style={{ color: "#f59e0b" }}>{v}c</strong></span>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Deal summary */}
                {sellBuyingClubId && (() => {
                  const sellingClub = clubs.find(c => c.id.toString() === sellClubId);
                  const buyingClub = clubs.find(c => c.id.toString() === sellBuyingClubId);
                  return (
                    <div style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "8px", padding: "10px 14px", marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Deal Summary</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "0.88rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {sellingClub?.image ? <img src={sellingClub.image} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }} />}
                          <strong>{sellingClub?.name}</strong>
                        </div>
                        <i className="fa-solid fa-arrow-right" style={{ color: "#0066ff" }} />
                        <strong style={{ color: "#fff" }}>{sellSelectedPlayer.name}</strong>
                        <i className="fa-solid fa-arrow-right" style={{ color: "#0066ff" }} />
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {buyingClub?.image ? <img src={buyingClub.image} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }} />}
                          <strong>{buyingClub?.name}</strong>
                        </div>
                        <span style={{ marginLeft: "auto", color: "#22c55e", fontWeight: 700 }}>{sellPrice} Coins</span>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                        Contract carried over  expires Season {cleanSeason(sellSelectedPlayer.expireSeason)}
                      </div>
                    </div>
                  );
                })()}

                <div className="admin-btn-row">
                  <button type="button" className="portal-btn btn-primary" onClick={handleAddTransfer} disabled={isPending}>
                    <i className="fa-solid fa-plus" /> Add Transfer to Queue
                  </button>
                </div>
              </div>
            )}

            {/* â-€â-€ Transfer Queue â-€â-€ */}
            {bulkTransfers.length > 0 && (
              <div style={{ marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff", marginBottom: "1.25rem" }}>
                  Queued Transfers ({bulkTransfers.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                  {bulkTransfers.map((t, idx) => (
                    <div key={idx} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "0.9rem", marginBottom: "5px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {t.sellingClubLogo ? <img src={t.sellingClubLogo} alt="" style={{ width: "18px", height: "18px", objectFit: "contain" }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }} />}
                            <strong>{t.sellingClubName}</strong>
                          </div>
                          <i className="fa-solid fa-arrow-right" style={{ color: "#0066ff", fontSize: "0.85rem" }} />
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ background: `${getPositionColor(t.playerPosition)}18`, color: getPositionColor(t.playerPosition), border: `1px solid ${getPositionColor(t.playerPosition)}40`, borderRadius: "4px", fontSize: "0.65rem", padding: "1px 5px", fontWeight: 700 }}>{t.playerPosition}</span>
                            <strong style={{ color: "#fff" }}>{t.playerName}</strong>
                          </div>
                          <i className="fa-solid fa-arrow-right" style={{ color: "#0066ff", fontSize: "0.85rem" }} />
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {t.buyingClubLogo ? <img src={t.buyingClubLogo} alt="" style={{ width: "18px", height: "18px", objectFit: "contain" }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }} />}
                            <strong>{t.buyingClubName}</strong>
                          </div>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          Price: <strong style={{ color: "#22c55e" }}>{t.price} Coins</strong>
                          <span style={{ marginLeft: "10px" }}></span>
                          <span style={{ marginLeft: "10px" }}>Contract expires Season {cleanSeason(t.expireSeason)}</span>
                        </div>
                      </div>
                      <button type="button" className="portal-btn btn-secondary" style={{ padding: "4px 10px", fontSize: "0.8rem", color: "#ef4444", borderColor: "#ef4444", flexShrink: 0 }}
                        onClick={() => setBulkTransfers(prev => prev.filter((_, i) => i !== idx))}>
                        <i className="fa-solid fa-trash" /> Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="admin-btn-row">
                  <button type="button" className="portal-btn btn-primary" onClick={handleExecuteBulkTransfers} disabled={isPending}>
                    <i className="fa-solid fa-check" /> Execute All {bulkTransfers.length} Transfer{bulkTransfers.length > 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Release */}
        {activeTab === 'release' && (
          <div className="admin-card" style={{ overflow: "visible" }}>
            <h2 className="admin-card-title"><i className="fa-solid fa-file-contract" /> Bulk Release Squad Players</h2>

            {/* Timing & Club Selector */}
            <div className="sub-card" style={{ marginBottom: "1rem", overflow: "visible" }}>
              <div className="sub-card-title">Release Setup</div>
              
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                <div style={{ flex: 1, minWidth: "220px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Release Timing</label>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button type="button" className={`portal-btn ${releaseTiming === 'start' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setReleaseTiming('start')} style={{ flex: 1, height: "36px" }}>
                      Season Start
                    </button>
                    <button type="button" className={`portal-btn ${releaseTiming === 'mid' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setReleaseTiming('mid')} style={{ flex: 1, height: "36px" }}>
                      Mid-Season
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1.5, minWidth: "220px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Select Club</label>
                  <AdminClubDropdown
                    clubs={clubs}
                    selectedClubId={releaseClubId}
                    onSelect={(id) => {
                      setReleaseClubId(id);
                      setReleaseSelectedIds([]);
                    }}
                    placeholder="-- Select Club --"
                  />
                </div>
              </div>

              {/* Roster selection display */}
              {releaseClubId && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "12px", marginBottom: "8px", flexWrap: "wrap" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>Select Players to Release</label>
                    <input type="text" className="admin-input" style={{ maxWidth: "220px", fontSize: "0.78rem", padding: "5px 10px" }} placeholder="Search name / position..." value={releaseSearchTerm} onChange={e => setReleaseSearchTerm(e.target.value)} />
                  </div>

                  {loadingReleasePlayers ? (
                    <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-secondary)" }}><i className="fa-solid fa-spinner fa-spin" /> Loading...</div>
                  ) : (
                    <>
                      {isMobile ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          {releaseClubPlayers.filter(p => releaseSearchTerm === "" || p.name.toLowerCase().includes(releaseSearchTerm.toLowerCase()) || p.position.toLowerCase().includes(releaseSearchTerm.toLowerCase())).map(p => {
                            const isChecked = releaseSelectedIds.includes(p.id);
                            return (
                              <div key={p.id} onClick={() => {
                                setReleaseSelectedIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                              }}
                                style={{ background: isChecked ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)", border: isChecked ? "1.5px solid rgba(239,68,68,0.3)" : "1.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px", cursor: "pointer", transition: "all 0.15s ease" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                  <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ pointerEvents: "none" }} />
                                  <img src={p.imagePath} alt="" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} />
                                  <div style={{ minWidth: 0 }}>
                                    <strong style={{ color: "#fff", display: "block", fontSize: "0.82rem", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{p.name}</strong>
                                    <span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.6rem", padding: "0 4px", fontWeight: 700 }}>{p.position}</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Contract:</span><span style={{ color: "#fff" }}>{cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}</span></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Value:</span><span style={{ color: "#f59e0b", fontWeight: 600 }}>{p.signedValue}c</span></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="admin-list-table" style={{ fontSize: "0.85rem" }}>
                            <thead>
                              <tr>
                                <th style={{ width: "40px", textAlign: "center" }}>
                                  <input type="checkbox" checked={releaseClubPlayers.length > 0 && releaseClubPlayers.every(p => releaseSelectedIds.includes(p.id))}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setReleaseSelectedIds(releaseClubPlayers.map(p => p.id));
                                      } else {
                                        setReleaseSelectedIds([]);
                                      }
                                    }}
                                  />
                                </th>
                                <th>Player</th>
                                <th>Pos</th>
                                <th>Contract</th>
                                <th style={{ textAlign: "right" }}>Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {releaseClubPlayers.filter(p => releaseSearchTerm === "" || p.name.toLowerCase().includes(releaseSearchTerm.toLowerCase()) || p.position.toLowerCase().includes(releaseSearchTerm.toLowerCase())).map(p => {
                                const isChecked = releaseSelectedIds.includes(p.id);
                                return (
                                  <tr key={p.id} onClick={() => {
                                    setReleaseSelectedIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                                  }} style={{ cursor: "pointer", background: isChecked ? "rgba(239,68,68,0.04)" : "transparent", borderLeft: isChecked ? "3px solid #ef4444" : "3px solid transparent", transition: "background 0.12s" }}
                                    onMouseEnter={e => { if(!isChecked) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }} onMouseLeave={e => { if(!isChecked) e.currentTarget.style.background = "transparent"; }}>
                                    <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                      <input type="checkbox" checked={isChecked} onChange={() => {
                                        setReleaseSelectedIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                                      }} />
                                    </td>
                                    <td><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><img src={p.imagePath} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} /><strong style={{ color: "#fff" }}>{p.name}</strong></div></td>
                                    <td><span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.7rem", padding: "2px 6px", fontWeight: 700 }}>{p.position}</span></td>
                                    <td style={{ color: "var(--text-secondary)" }}>{cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}</td>
                                    <td style={{ textAlign: "right", color: "#f59e0b", fontWeight: 600 }}>{p.signedValue}c</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Add button block */}
                      {releaseSelectedIds.length > 0 && (
                        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            Selected <strong>{releaseSelectedIds.length}</strong> player(s) to release.
                          </span>
                          <button type="button" className="portal-btn btn-danger" onClick={handleAddRelease} disabled={isPending}>
                            <i className="fa-solid fa-plus" /> Add Selected to Queue
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {releaseClubPlayers.length === 0 && !loadingReleasePlayers && <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem", padding: "16px" }}>No players found for this club</div>}
                </>
              )}
            </div>

            {/* Staged Release Queue */}
            {bulkReleases.length > 0 && (
              <div style={{ marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff", margin: "0 0 4px 0" }}>
                      Queued Releases ({bulkReleases.length})
                    </h3>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                      Total Refund: <strong style={{ color: "#34d399" }}>{bulkReleases.reduce((sum, r) => sum + (r.giveRefund ? (r.refundAmount || 0) : 0), 0)} Coins</strong>
                      <span style={{ margin: "0 8px", opacity: 0.3 }}>&bull;</span>
                      Releasing with refund: <strong style={{ color: "#fff" }}>{bulkReleases.filter(r => r.giveRefund).length}</strong>
                      <span style={{ margin: "0 8px", opacity: 0.3 }}>&bull;</span>
                      Without refund: <strong style={{ color: "#f87171" }}>{bulkReleases.filter(r => !r.giveRefund).length}</strong>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="portal-btn btn-secondary"
                      style={{ padding: "5px 12px", fontSize: "0.75rem", borderRadius: "8px" }}
                      onClick={() => setBulkReleases(prev => prev.map(r => ({ ...r, giveRefund: true })))}
                      title="Set all queued players to receive refund"
                    >
                      <i className="fa-solid fa-coins" style={{ color: "#34d399", marginRight: "5px" }} /> All: With Refund
                    </button>
                    <button
                      type="button"
                      className="portal-btn btn-secondary"
                      style={{ padding: "5px 12px", fontSize: "0.75rem", borderRadius: "8px" }}
                      onClick={() => setBulkReleases(prev => prev.map(r => ({ ...r, giveRefund: false })))}
                      title="Set all queued players to receive 0 refund"
                    >
                      <i className="fa-solid fa-ban" style={{ color: "#f87171", marginRight: "5px" }} /> All: No Refund
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                  {bulkReleases.map((r, idx) => (
                    <div key={idx} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "0.9rem", marginBottom: "5px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {r.clubLogo ? <img src={r.clubLogo} alt="" style={{ width: "18px", height: "18px", objectFit: "contain" }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }} />}
                            <strong>{r.clubName}</strong>
                          </div>
                          <i className="fa-solid fa-user-minus" style={{ color: "#ef4444", fontSize: "0.85rem" }} />
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ background: `${getPositionColor(r.playerPosition)}18`, color: getPositionColor(r.playerPosition), border: `1px solid ${getPositionColor(r.playerPosition)}40`, borderRadius: "4px", fontSize: "0.65rem", padding: "1px 5px", fontWeight: 700 }}>{r.playerPosition}</span>
                            <strong style={{ color: "#fff" }}>{r.playerName}</strong>
                          </div>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                          <span>
                            Est. Refund: <strong style={{ color: r.giveRefund ? "#34d399" : "rgba(255,255,255,0.4)" }}>{r.giveRefund ? `${r.refundAmount} Coins` : "0 Coins (Disabled)"}</strong>
                          </span>
                          <span>Contract expires Season {cleanSeason(r.expireSeason)}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setBulkReleases(prev => prev.map((item, i) => i === idx ? { ...item, giveRefund: !item.giveRefund } : item))}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            border: r.giveRefund ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(239,68,68,0.4)",
                            background: r.giveRefund ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                            color: r.giveRefund ? "#34d399" : "#f87171",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                          title={r.giveRefund ? "Click to disable refund for this release" : "Click to give refund for this release"}
                        >
                          {r.giveRefund ? (
                            <>
                              <i className="fa-solid fa-coins" /> Refund: {r.refundAmount}c
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-ban" /> No Refund (0c)
                            </>
                          )}
                        </button>
                        <button type="button" className="portal-btn btn-secondary" style={{ padding: "4px 10px", fontSize: "0.8rem", color: "#ef4444", borderColor: "#ef4444", flexShrink: 0 }}
                          onClick={() => setBulkReleases(prev => prev.filter((_, i) => i !== idx))}>
                          <i className="fa-solid fa-trash" /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="admin-btn-row">
                  <button type="button" className="portal-btn btn-danger" onClick={handleExecuteBulkReleases} disabled={isPending}>
                    <i className="fa-solid fa-user-minus" /> Execute All {bulkReleases.length} Release{bulkReleases.length > 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Swap */}
        {activeTab === 'swap' && (
          <div className="admin-card" style={{ overflow: "visible" }}>
            <h2 className="admin-card-title"><i className="fa-solid fa-rotate" /> Execute Player Swap Deal</h2>
            <form onSubmit={addSwapToQueue}>
              <div className="sub-card" style={{ marginBottom: "1rem", overflow: "visible" }}>
                <div className="sub-card-title">Club A Setup</div>
                <div className="admin-form-group">
                  <label>Club A</label>
                  <AdminClubDropdown
                    clubs={clubs}
                    selectedClubId={swapClubAId}
                    excludeClubId={swapClubBId}
                    onSelect={(id) => setSwapClubAId(id)}
                    placeholder="-- Select Club --"
                  />
                </div>
                {swapClubAPlayers.length > 0 && (
                  <>
                    {swapPlayerAId ? (
                      // Selected player chip
                      (() => {
                        const p = swapClubAPlayers.find(x => x.id.toString() === swapPlayerAId);
                        if (!p) return null;
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", background: "rgba(0,102,255,0.08)", border: "1.5px solid rgba(0,102,255,0.3)", borderRadius: "10px", padding: "10px 14px" }}>
                            <img src={p.imagePath} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                              onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} />
                            <div style={{ flex: 1 }}>
                              <strong style={{ color: "#fff", display: "block", fontSize: "0.9rem" }}>{p.name}</strong>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "3px", flexWrap: "wrap" }}>
                                <span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.65rem", padding: "1px 5px", fontWeight: 700 }}>{p.position}</span>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}</span>
                                <span style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: 600 }}>{p.signedValue}c</span>
                              </div>
                            </div>
                            <button type="button" onClick={() => setSwapPlayerAId("")} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", padding: "4px 10px", cursor: "pointer", flexShrink: 0 }}>
                              <i className="fa-solid fa-rotate-left" style={{ marginRight: "4px" }} />Change
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      // Player table / cards
                      <>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "8px", marginTop: "12px" }}>Select Player from Club A</label>
                        {isMobile ? (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {swapClubAPlayers.map(p => (
                              <div key={p.id} onClick={() => setSwapPlayerAId(p.id.toString())} style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px", cursor: "pointer", transition: "all 0.15s ease" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                  <img src={p.imagePath} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} />
                                  <div>
                                    <strong style={{ color: "#fff", display: "block", fontSize: "0.85rem" }}>{p.name}</strong>
                                    <span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.65rem", padding: "1px 5px", fontWeight: 700 }}>{p.position}</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Contract:</span><span style={{ color: "#fff" }}>{cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}</span></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Value:</span><span style={{ color: "#f59e0b", fontWeight: 600 }}>{p.signedValue}c</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="admin-list-table" style={{ fontSize: "0.85rem" }}>
                              <thead><tr><th>Player</th><th>Pos</th><th>Contract</th><th style={{ textAlign: "right" }}>Value</th></tr></thead>
                              <tbody>
                                {swapClubAPlayers.map(p => (
                                  <tr key={p.id} onClick={() => setSwapPlayerAId(p.id.toString())} style={{ cursor: "pointer", borderLeft: "3px solid transparent", transition: "background 0.12s" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                    <td><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><img src={p.imagePath} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} /><strong style={{ color: "#fff" }}>{p.name}</strong></div></td>
                                    <td><span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.7rem", padding: "2px 6px", fontWeight: 700 }}>{p.position}</span></td>
                                    <td style={{ color: "var(--text-secondary)" }}>{cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}</td>
                                    <td style={{ textAlign: "right", color: "#f59e0b", fontWeight: 600 }}>{p.signedValue}c</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                {swapClubAId && swapClubAPlayers.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem", padding: "16px" }}>No players found for this club</div>
                )}
              </div>

              <div className="sub-card" style={{ marginBottom: "1rem", overflow: "visible" }}>
                <div className="sub-card-title">Club B Setup</div>
                <div className="admin-form-group">
                  <label>Club B</label>
                  <AdminClubDropdown
                    clubs={clubs}
                    selectedClubId={swapClubBId}
                    excludeClubId={swapClubAId}
                    onSelect={(id) => setSwapClubBId(id)}
                    placeholder="-- Select Club --"
                  />
                </div>
                {swapClubBPlayers.length > 0 && (
                  <>
                    {swapPlayerBId ? (
                      // Selected player chip
                      (() => {
                        const p = swapClubBPlayers.find(x => x.id.toString() === swapPlayerBId);
                        if (!p) return null;
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", background: "rgba(0,102,255,0.08)", border: "1.5px solid rgba(0,102,255,0.3)", borderRadius: "10px", padding: "10px 14px" }}>
                            <img src={p.imagePath} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                              onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} />
                            <div style={{ flex: 1 }}>
                              <strong style={{ color: "#fff", display: "block", fontSize: "0.9rem" }}>{p.name}</strong>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "3px", flexWrap: "wrap" }}>
                                <span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.65rem", padding: "1px 5px", fontWeight: 700 }}>{p.position}</span>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}</span>
                                <span style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: 600 }}>{p.signedValue}c</span>
                              </div>
                            </div>
                            <button type="button" onClick={() => setSwapPlayerBId("")} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", padding: "4px 10px", cursor: "pointer", flexShrink: 0 }}>
                              <i className="fa-solid fa-rotate-left" style={{ marginRight: "4px" }} />Change
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      // Player table / cards
                      <>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "8px", marginTop: "12px" }}>Select Player from Club B</label>
                        {isMobile ? (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {swapClubBPlayers.map(p => (
                              <div key={p.id} onClick={() => setSwapPlayerBId(p.id.toString())} style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px", cursor: "pointer", transition: "all 0.15s ease" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                  <img src={p.imagePath} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} />
                                  <div>
                                    <strong style={{ color: "#fff", display: "block", fontSize: "0.85rem" }}>{p.name}</strong>
                                    <span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.65rem", padding: "1px 5px", fontWeight: 700 }}>{p.position}</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Contract:</span><span style={{ color: "#fff" }}>{cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}</span></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Value:</span><span style={{ color: "#f59e0b", fontWeight: 600 }}>{p.signedValue}c</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="admin-list-table" style={{ fontSize: "0.85rem" }}>
                              <thead><tr><th>Player</th><th>Pos</th><th>Contract</th><th style={{ textAlign: "right" }}>Value</th></tr></thead>
                              <tbody>
                                {swapClubBPlayers.map(p => (
                                  <tr key={p.id} onClick={() => setSwapPlayerBId(p.id.toString())} style={{ cursor: "pointer", borderLeft: "3px solid transparent", transition: "background 0.12s" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                    <td><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><img src={p.imagePath} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} /><strong style={{ color: "#fff" }}>{p.name}</strong></div></td>
                                    <td><span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.7rem", padding: "2px 6px", fontWeight: 700 }}>{p.position}</span></td>
                                    <td style={{ color: "var(--text-secondary)" }}>{cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}</td>
                                    <td style={{ textAlign: "right", color: "#f59e0b", fontWeight: 600 }}>{p.signedValue}c</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                {swapClubBId && swapClubBPlayers.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem", padding: "16px" }}>No players found for this club</div>
                )}
              </div>

              {swapPlayerAId && swapPlayerBId && (() => {
                const playerAObj = swapClubAPlayers.find(p => p.id.toString() === swapPlayerAId);
                const playerBObj = swapClubBPlayers.find(p => p.id.toString() === swapPlayerBId);
                const clubAObj = clubs.find(c => c.id.toString() === swapClubAId);
                const clubBObj = clubs.find(c => c.id.toString() === swapClubBId);
                if (!playerAObj || !playerBObj) return null;
                const valA = Number(playerAObj.signedValue) || 0;
                const valB = Number(playerBObj.signedValue) || 0;
                const swapValue = Math.max(valA, valB);
                const newStart = activeSeason?.season_number ?? "?";
                const newEnd = typeof newStart === "number" ? newStart + 2 : "?";

                const PlayerRow = ({ player, fromClub, toClub }: { player: any; fromClub: any; toClub: any }) => (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {/* Player */}
                    <img src={player.imagePath} alt="" style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <strong style={{ color: "#fff", fontSize: "0.9rem" }}>{player.name}</strong>
                        <span style={{ background: `${getPositionColor(player.position)}18`, color: getPositionColor(player.position), border: `1px solid ${getPositionColor(player.position)}40`, borderRadius: "4px", fontSize: "0.65rem", padding: "1px 5px", fontWeight: 700 }}>{player.position}</span>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        <span>Current contract: <strong style={{ color: "#fff" }}>{cleanSeason(player.startSeason)}-{cleanSeason(player.expireSeason)}</strong></span>
                        <span>Current value: <strong style={{ color: "#f59e0b" }}>{valA === Number(player.signedValue) ? valA : valB}c</strong></span>
                      </div>
                    </div>
                    {/* Arrow + clubs */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.72rem" }}>
                        {fromClub?.image
                          ? <img src={fromClub.image} alt="" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
                          : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }} />}
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>{fromClub?.name}</span>
                      </div>
                      <i className="fa-solid fa-arrow-down" style={{ color: "#0066ff", fontSize: "0.75rem" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.72rem" }}>
                        {toClub?.image
                          ? <img src={toClub.image} alt="" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
                          : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }} />}
                        <span style={{ color: "#fff", fontWeight: 600 }}>{toClub?.name}</span>
                      </div>
                    </div>
                  </div>
                );

                return (
                  <div className="sub-card" style={{ marginBottom: "1rem" }}>
                    <div className="sub-card-title">Deal Summary</div>

                    {/* Both player movements */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                      <PlayerRow player={playerAObj} fromClub={clubAObj} toClub={clubBObj} />
                      <PlayerRow player={playerBObj} fromClub={clubBObj} toClub={clubAObj} />
                    </div>

                    {/* New contract terms banner */}
                    <div style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "8px", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>New Terms After Swap</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
                        <div style={{ fontSize: "0.85rem" }}>
                          <span style={{ color: "var(--text-secondary)" }}>New Value: </span>
                          <strong style={{ color: "#22c55e" }}>{swapValue} Coins</strong>
                          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", marginLeft: "6px" }}>
                            (highest of {valA}c &amp; {valB}c)
                          </span>
                        </div>
                        <div style={{ fontSize: "0.85rem" }}>
                          <span style={{ color: "var(--text-secondary)" }}>New Contract: </span>
                          <strong style={{ color: "#22c55e" }}>{newStart}-{newEnd}</strong>
                          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", marginLeft: "6px" }}>(2 season reset)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="sub-card" style={{ marginBottom: "1rem" }}>
                <div className="sub-card-title">Cash Adjustment</div>
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>Adjustment: Club A pays Club B (use negative for B pays A)</label>
                    <input type="number" className="admin-input" value={swapAdjustmentAtoB} onChange={(e) => setSwapAdjustmentAtoB(parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              <div className="admin-btn-row">
                <button type="submit" className="portal-btn btn-primary">
                  <i className="fa-solid fa-plus" /> Add Swap Deal to Queue
                </button>
              </div>
            </form>

            {bulkSwaps.length > 0 && (
              <div style={{ marginTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#fff", marginBottom: "1.25rem" }}>
                  Queued Swap Deals ({bulkSwaps.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                  {bulkSwaps.map((deal, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "10px",
                        padding: "1rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "15px"
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "0.9rem" }}>
                          <strong>{deal.clubAName}</strong> ({deal.playerAName})
                          <i className="fa-solid fa-right-left" style={{ color: "#0066ff" }} />
                          <strong>{deal.clubBName}</strong> ({deal.playerBName})
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                          New Value: <strong style={{ color: "#22c55e" }}>{deal.newValue} Coins</strong>
                          {deal.cashAdjustmentAtoB !== 0 && (
                            <>
                              {" | "}Cash Adjustment: <strong>{deal.cashAdjustmentAtoB > 0 ? `${deal.clubAName} pays ${deal.clubBName} ${deal.cashAdjustmentAtoB} Coins` : `${deal.clubBName} pays ${deal.clubAName} ${Math.abs(deal.cashAdjustmentAtoB)} Coins`}</strong>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="portal-btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.8rem", color: "#ef4444", borderColor: "#ef4444" }}
                        onClick={() => setBulkSwaps(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <i className="fa-solid fa-trash" /> Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="admin-btn-row">
                  <button type="button" className="portal-btn btn-primary" onClick={handleExecuteBulkSwaps} disabled={isPending}>
                    Execute All Swap Deals
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'window' && (
          <div className="admin-card">
            <h2 className="admin-card-title"><i className="fa-solid fa-calendar-minus" /> Batch Contract Release Controls</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

              {/* Load Preview Button */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  className="portal-btn btn-secondary"
                  onClick={loadBatchPreview}
                  disabled={batchLoadingPreview || isPending}
                >
                  {batchLoadingPreview
                    ? <><i className="fa-solid fa-spinner fa-spin" /> Loading...</>
                    : <><i className="fa-solid fa-eye" /> Preview All Expiring Contracts</>}
                </button>
                {batchPreviewPlayers.length > 0 && (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    <strong style={{ color: "#fbbf24" }}>{batchPreviewPlayers.filter(p => p.contract_type === 'start').length}</strong> start &nbsp;·&nbsp;
                    <strong style={{ color: "#60a5fa" }}>{batchPreviewPlayers.filter(p => p.contract_type === 'mid').length}</strong> mid-season contracts expiring
                  </span>
                )}
              </div>

              {/* Season Start Sub-section */}
              {(() => {
                const startPlayers = batchPreviewPlayers.filter(p => p.contract_type === 'start');
                if (!batchPreviewOpen && !batchReleasedOpen) return null;
                return (
                  <div className="sub-card" style={{ overflow: "visible" }}>
                    <div className="sub-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span><i className="fa-solid fa-calendar-day" /> Season {activeSeason?.season_number} -- Start Contracts</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#fbbf24" }}>{startPlayers.length} players</span>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                      Contracts expiring at or before Season <strong>{activeSeason?.season_number}</strong>.
                    </p>

                    {batchPreviewOpen && startPlayers.length > 0 && (
                      <>
                        {/* Player list */}
                        <div style={{ border: "1px solid rgba(255,200,0,0.2)", background: "rgba(255,200,0,0.03)", borderRadius: "10px", overflow: "hidden", marginBottom: "10px" }}>
                          <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                            {(() => {
                              let lastClub = "";
                              return startPlayers.map((p, i) => {
                                const showHeader = p.club_name !== lastClub;
                                lastClub = p.club_name;
                                return (
                                  <div key={i}>
                                    {showHeader && (
                                      <div style={{ padding: "7px 14px", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "8px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                                        {p.club_logo ? <img src={p.club_logo} alt="" style={{ width: "16px", height: "16px", objectFit: "contain" }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }} />}
                                        <strong style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)" }}>{p.club_name || "Free Agent"}</strong>
                                      </div>
                                    )}
                                    <div style={{ padding: "6px 14px 6px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.03)", fontSize: "0.82rem" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.62rem", padding: "1px 5px", fontWeight: 700 }}>{p.position}</span>
                                        <span style={{ color: "#fff" }}>{p.player_name}</span>
                                      </div>
                                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{cleanSeason(p.start_season)}-{cleanSeason(p.expire_season)}</span>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                        {/* Actions */}
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button className="portal-btn btn-danger" onClick={triggerSeasonStartReleases} disabled={isPending}>
                            <i className="fa-solid fa-circle-xmark" /> Release {startPlayers.length} Players
                          </button>
                          <button className="portal-btn btn-secondary" onClick={() => copyBatchList(startPlayers, `Season ${activeSeason?.season_number} Start -- Players to be Released`)}>
                            <i className="fa-brands fa-whatsapp" /> Copy List
                          </button>
                        </div>
                      </>
                    )}

                    {/* Released result */}
                    {batchReleasedOpen && batchReleasedPlayers.filter(p => p.contract_type === 'start').length > 0 && (
                      <div style={{ border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.04)", borderRadius: "10px", overflow: "hidden" }}>
                        <div style={{ padding: "9px 14px", borderBottom: "1px solid rgba(34,197,94,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#22c55e" }}><i className="fa-solid fa-circle-check" style={{ marginRight: "5px" }} />{batchReleasedPlayers.filter(p => p.contract_type === 'start').length} released</span>
                          <button className="portal-btn btn-secondary" style={{ fontSize: "0.72rem", padding: "3px 9px" }} onClick={() => copyBatchList(batchReleasedPlayers.filter(p => p.contract_type === 'start'), `Season ${activeSeason?.season_number} Start -- Released Players`)}>
                            <i className="fa-brands fa-whatsapp" /> Copy
                          </button>
                        </div>
                        <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                          {(() => {
                            let lastClub = "";
                            return batchReleasedPlayers.filter(p => p.contract_type === 'start').map((p, i) => {
                              const showHeader = p.club_name !== lastClub;
                              lastClub = p.club_name;
                              return (
                                <div key={i}>
                                  {showHeader && <div style={{ padding: "7px 14px", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "8px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{p.club_logo ? <img src={p.club_logo} alt="" style={{ width: "16px", height: "16px", objectFit: "contain" }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }} />}<strong style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)" }}>{p.club_name || "Free Agent"}</strong></div>}
                                  <div style={{ padding: "6px 14px 6px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.03)", fontSize: "0.82rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.62rem", padding: "1px 5px", fontWeight: 700 }}>{p.position}</span><span style={{ color: "#fff" }}>{p.player_name}</span></div>
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{cleanSeason(p.start_season)}-{cleanSeason(p.expire_season)}</span>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {batchPreviewOpen && startPlayers.length === 0 && (
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>No start-of-season contracts expiring.</p>
                    )}
                  </div>
                );
              })()}

              {/* Mid-Season Sub-section */}
              {(() => {
                const midPlayers = batchPreviewPlayers.filter(p => p.contract_type === 'mid');
                if (!batchPreviewOpen && !batchReleasedOpen) return null;
                return (
                  <div className="sub-card" style={{ overflow: "visible" }}>
                    <div className="sub-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span><i className="fa-solid fa-calendar-half" style={{ fontSize: "0.85em" }} /> Season {activeSeason?.season_number}.5 -- Mid-Season Contracts</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#60a5fa" }}>{midPlayers.length} players</span>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                      Contracts expiring at mid-Season <strong>{activeSeason?.season_number}.5</strong>.
                    </p>

                    {batchPreviewOpen && midPlayers.length > 0 && (
                      <>
                        <div style={{ border: "1px solid rgba(96,165,250,0.2)", background: "rgba(96,165,250,0.03)", borderRadius: "10px", overflow: "hidden", marginBottom: "10px" }}>
                          <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                            {(() => {
                              let lastClub = "";
                              return midPlayers.map((p, i) => {
                                const showHeader = p.club_name !== lastClub;
                                lastClub = p.club_name;
                                return (
                                  <div key={i}>
                                    {showHeader && (
                                      <div style={{ padding: "7px 14px", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "8px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                                        {p.club_logo ? <img src={p.club_logo} alt="" style={{ width: "16px", height: "16px", objectFit: "contain" }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }} />}
                                        <strong style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)" }}>{p.club_name || "Free Agent"}</strong>
                                      </div>
                                    )}
                                    <div style={{ padding: "6px 14px 6px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.03)", fontSize: "0.82rem" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.62rem", padding: "1px 5px", fontWeight: 700 }}>{p.position}</span>
                                        <span style={{ color: "#fff" }}>{p.player_name}</span>
                                      </div>
                                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{cleanSeason(p.start_season)}-{cleanSeason(p.expire_season)}</span>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button className="portal-btn btn-danger" onClick={() => {
                            if (!activeSeason) return;
                            if (!confirm(`Release ${midPlayers.length} mid-season contracts for Season ${activeSeason.season_number}.5?`)) return;
                            startTransition(async () => {
                              try {
                                const res = await releaseMidSeasonContracts(activeSeason.season_number);
                                showToast(`Released ${res.releasedCount} mid-season contracts.`);
                                setBatchReleasedPlayers(prev => [...prev, ...midPlayers]);
                                setBatchReleasedOpen(true);
                                setBatchPreviewPlayers(prev => prev.filter(p => p.contract_type !== 'mid'));
                                loadData();
                              } catch { showToast("Error releasing mid-season contracts!"); }
                            });
                          }} disabled={isPending}>
                            <i className="fa-solid fa-circle-xmark" /> Release {midPlayers.length} Mid-Season Players
                          </button>
                          <button className="portal-btn btn-secondary" onClick={() => copyBatchList(midPlayers, `Season ${activeSeason?.season_number}.5 Mid -- Players to be Released`)}>
                            <i className="fa-brands fa-whatsapp" /> Copy List
                          </button>
                        </div>
                      </>
                    )}

                    {/* Released result */}
                    {batchReleasedOpen && batchReleasedPlayers.filter(p => p.contract_type === 'mid').length > 0 && (
                      <div style={{ border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.04)", borderRadius: "10px", overflow: "hidden" }}>
                        <div style={{ padding: "9px 14px", borderBottom: "1px solid rgba(34,197,94,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#22c55e" }}><i className="fa-solid fa-circle-check" style={{ marginRight: "5px" }} />{batchReleasedPlayers.filter(p => p.contract_type === 'mid').length} released</span>
                          <button className="portal-btn btn-secondary" style={{ fontSize: "0.72rem", padding: "3px 9px" }} onClick={() => copyBatchList(batchReleasedPlayers.filter(p => p.contract_type === 'mid'), `Season ${activeSeason?.season_number}.5 Mid -- Released Players`)}>
                            <i className="fa-brands fa-whatsapp" /> Copy
                          </button>
                        </div>
                        <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                          {(() => {
                            let lastClub = "";
                            return batchReleasedPlayers.filter(p => p.contract_type === 'mid').map((p, i) => {
                              const showHeader = p.club_name !== lastClub;
                              lastClub = p.club_name;
                              return (
                                <div key={i}>
                                  {showHeader && <div style={{ padding: "7px 14px", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "8px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{p.club_logo ? <img src={p.club_logo} alt="" style={{ width: "16px", height: "16px", objectFit: "contain" }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }} />}<strong style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)" }}>{p.club_name || "Free Agent"}</strong></div>}
                                  <div style={{ padding: "6px 14px 6px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.03)", fontSize: "0.82rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.62rem", padding: "1px 5px", fontWeight: 700 }}>{p.position}</span><span style={{ color: "#fff" }}>{p.player_name}</span></div>
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{cleanSeason(p.start_season)}-{cleanSeason(p.expire_season)}</span>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {batchPreviewOpen && midPlayers.length === 0 && (
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>No mid-season contracts expiring.</p>
                    )}
                  </div>
                );
              })()}

              {!batchPreviewOpen && !batchReleasedOpen && (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "-0.5rem" }}>Click <strong>Preview All Expiring Contracts</strong> to see start and mid-season contracts before releasing.</p>
              )}

            </div>
          </div>
        )}
        {activeTab === 'prime' && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Prime Fee Configuration Card */}
            <div style={{
              background: "rgba(255, 255, 255, 0.02)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(234, 179, 8, 0.25)",
              borderRadius: "14px",
              padding: "1rem 1.4rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "rgba(234, 179, 8, 0.15)",
                  border: "1px solid rgba(234, 179, 8, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#eab308",
                  fontSize: "1.05rem"
                }}>
                  <i className="fa-solid fa-sliders" />
                </div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    Prime Fee Configuration
                    <span style={{ fontSize: "0.68rem", color: "#eab308", background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.25)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                      SAVED IN DB
                    </span>
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                    Configure persistent default fees for Prime Upgrades and Transfers across all admin pages.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>Default Upgrade:</span>
                  <div style={{ position: "relative", width: "95px" }}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={configPrimeUpgradeRt}
                      onChange={(e) => setConfigPrimeUpgradeRt(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{
                        width: "100%",
                        padding: "7px 28px 7px 10px",
                        background: "rgba(0,0,0,0.4)",
                        border: "1px solid rgba(234, 179, 8, 0.3)",
                        borderRadius: "6px",
                        color: "#eab308",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                    <span style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "0.68rem", color: "#eab308", fontWeight: 700 }}>
                      RT
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>Default Transfer:</span>
                  <div style={{ position: "relative", width: "95px" }}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={configPrimeTransferRt}
                      onChange={(e) => setConfigPrimeTransferRt(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{
                        width: "100%",
                        padding: "7px 28px 7px 10px",
                        background: "rgba(0,0,0,0.4)",
                        border: "1px solid rgba(234, 179, 8, 0.3)",
                        borderRadius: "6px",
                        color: "#eab308",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                    <span style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "0.68rem", color: "#eab308", fontWeight: 700 }}>
                      RT
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSavePrimeDefaultFees}
                  disabled={isSavingPrimeFees}
                  style={{
                    padding: "8px 16px",
                    background: "linear-gradient(135deg, #eab308, #ca8a04)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#000",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 10px rgba(234,179,8,0.2)",
                    opacity: isSavingPrimeFees ? 0.6 : 1,
                    transition: "all 0.2s"
                  }}
                >
                  <i className="fa-solid fa-floppy-disk" /> {isSavingPrimeFees ? "Saving..." : "Save Default Fees"}
                </button>
              </div>
            </div>

            <div className="bulk-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
            
            {/* Left Column: Form Controls */}
            <div className="admin-card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1rem", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <i className="fa-solid fa-crown" style={{ color: "#eab308" }} />
                  Prime Player Console
                </h3>
                <div style={{ display: "flex", background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "3px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <button
                    type="button"
                    onClick={() => setPrimeActiveMode("assign")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: primeActiveMode === "assign" ? "linear-gradient(135deg, #eab308, #ca8a04)" : "transparent",
                      color: primeActiveMode === "assign" ? "#000" : "rgba(255,255,255,0.6)",
                      transition: "all 0.2s"
                    }}
                  >
                    <i className="fa-solid fa-plus" style={{ marginRight: "4px" }} /> Assign
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimeActiveMode("transfer")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: primeActiveMode === "transfer" ? "linear-gradient(135deg, #eab308, #ca8a04)" : "transparent",
                      color: primeActiveMode === "transfer" ? "#000" : "rgba(255,255,255,0.6)",
                      transition: "all 0.2s"
                    }}
                  >
                    <i className="fa-solid fa-repeat" style={{ marginRight: "4px" }} /> Transfer
                  </button>
                </div>
              </div>

              {(() => {
                const selectedClubObj = clubs.find(c => String(c.id) === primeClubId);

                // Available for Assign mode (unprimed players matching filter)
                const availablePlayers = primeAllPlayers.filter((p) => {
                  let matchClub = true;
                  if (primeClubId) {
                    matchClub = String(p.clubId) === primeClubId || p.clubName === selectedClubObj?.name;
                  }
                  let matchSearch = true;
                  if (primeSearchQuery) {
                    const query = primeSearchQuery.toLowerCase();
                    matchSearch = p.name.toLowerCase().includes(query) || (p.clubName && p.clubName.toLowerCase().includes(query)) || p.position.toLowerCase().includes(query);
                  }
                  const isAlreadyPrimed = primedPlayers.some(pp => pp.id === p.id);
                  return matchClub && matchSearch && !isAlreadyPrimed;
                });

                // Source players for Transfer mode (primed players belonging to selected club)
                const transferSourceList = primedPlayers.filter(p => {
                  if (!primeClubId) return true;
                  return String(p.clubId) === primeClubId || p.clubName === selectedClubObj?.name;
                });

                // Destination players for Transfer mode (unprimed players belonging to selected club)
                const transferDestList = primeAllPlayers.filter(p => {
                  let matchClub = true;
                  if (primeClubId) {
                    matchClub = String(p.clubId) === primeClubId || p.clubName === selectedClubObj?.name;
                  }
                  const isAlreadyPrimed = primedPlayers.some(pp => pp.id === p.id);
                  return matchClub && !isAlreadyPrimed;
                });

                const handleTogglePlayer = (playerId: number) => {
                  setPrimeSelectedPlayerIds(prev =>
                    prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
                  );
                };

                const handleSelectAll = () => {
                  const allFilteredIds = availablePlayers.map(p => p.id);
                  const areAllSelected = allFilteredIds.every(id => primeSelectedPlayerIds.includes(id));

                  if (areAllSelected) {
                    setPrimeSelectedPlayerIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                  } else {
                    setPrimeSelectedPlayerIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                  }
                };

                const handlePrimeSubmit = async (e: React.FormEvent) => {
                  e.preventDefault();
                  if (primeSelectedPlayerIds.length === 0) return showToast("Select at least one player to Prime!");

                  const finalVal = primeAssignValidity === "custom" ? primeAssignCustomValidity.trim() : primeAssignValidity;
                  if (primeAssignValidity === "custom" && !finalVal) {
                    return showToast("Please enter a custom validity text!");
                  }

                  startTransition(async () => {
                    try {
                      let count = 0;
                      let lastValidUntil = "1 Season";
                      let lastError = "";

                      for (const pId of primeSelectedPlayerIds) {
                        const res = await primePlayerForTeam(pId, primeClubId ? Number(primeClubId) : undefined, primeRtCost, undefined, finalVal);
                        if (res.success) {
                          count++;
                          if (res.validUntil) lastValidUntil = res.validUntil;
                        } else if (res.error) {
                          lastError = res.error;
                        }
                      }

                      if (count > 0) {
                        showToast(`Successfully Primed ${count} player${count > 1 ? "s" : ""}! (${lastValidUntil})`);
                        setPrimeSelectedPlayerIds([]);
                        loadPrimeData();
                      } else if (lastError) {
                        showToast(`Failed: ${lastError}`);
                      } else {
                        showToast("Failed to prime players.");
                      }
                    } catch (err: any) {
                      showToast(err?.message || "Error priming players!");
                    }
                  });
                };

                const handlePrimeTransferSubmit = async (e: React.FormEvent) => {
                  e.preventDefault();
                  if (!primeClubId) return showToast("Please select a franchise/club first!");
                  if (!primeTransferSourceId) return showToast("Please choose the current Prime player to transfer from!");
                  if (!primeTransferDestId) return showToast("Please choose the target player to receive Prime!");
                  if (primeTransferSourceId === primeTransferDestId) return showToast("Source and target player cannot be the same!");

                  const finalVal = primeTransferValidity === "keep"
                    ? undefined
                    : (primeTransferValidity === "custom" ? primeTransferCustomValidity.trim() : primeTransferValidity);

                  if (primeTransferValidity === "custom" && !finalVal) {
                    return showToast("Please enter a custom validity string!");
                  }

                  startTransition(async () => {
                    try {
                      const res = await transferPlayerPrime(
                        Number(primeTransferSourceId),
                        Number(primeTransferDestId),
                        Number(primeClubId),
                        primeTransferRtCost,
                        undefined,
                        finalVal
                      );
                      if (res.success) {
                        showToast(`Prime transferred successfully! (${res.validUntil})`);
                        setPrimeTransferSourceId("");
                        setPrimeTransferDestId("");
                        loadPrimeData();
                      } else {
                        showToast(res.error || "Failed to transfer Prime status.");
                      }
                    } catch (err: any) {
                      showToast(err?.message || "Error transferring Prime status!");
                    }
                  });
                };

                return primeActiveMode === "assign" ? (
                  <form onSubmit={handlePrimeSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                        1. Select franchise / club
                      </label>
                      <AdminClubDropdown
                        clubs={clubs}
                        selectedClubId={primeClubId}
                        onSelect={(id) => {
                          setPrimeClubId(id);
                          setPrimeSelectedPlayerIds([]);
                          setPrimeTransferSourceId("");
                          setPrimeTransferDestId("");
                        }}
                        placeholder="-- Choose franchise --"
                        showAllOption={true}
                        allOptionLabel="All Clubs / All Players"
                      />
                    </div>

                    {/* Players checklist */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <label style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: 600 }}>
                          2. Select Players ({primeSelectedPlayerIds.length} selected)
                        </label>
                        {availablePlayers.length > 0 && (
                          <button
                            type="button"
                            onClick={handleSelectAll}
                            style={{ background: "none", border: "none", color: "#eab308", cursor: "pointer", fontSize: "0.7rem", fontWeight: 700, padding: 0 }}
                          >
                            {availablePlayers.every(p => primeSelectedPlayerIds.includes(p.id)) ? "Deselect All" : "Select All"}
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Search players to select..."
                        value={primeSearchQuery}
                        onChange={(e) => setPrimeSearchQuery(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff", fontSize: "0.8rem", outline: "none", marginBottom: "8px", boxSizing: "border-box" }}
                      />

                      <div style={{ maxHeight: "240px", overflowY: "auto", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "4px" }}>
                        {availablePlayers.length === 0 ? (
                          <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                            No players matching filters.
                          </div>
                        ) : (
                          availablePlayers.map((p) => {
                            const isChecked = primeSelectedPlayerIds.includes(p.id);
                            return (
                              <div
                                key={p.id}
                                onClick={() => handleTogglePlayer(p.id)}
                                style={{
                                  display: "flex", alignItems: "center", gap: "10px", padding: "7px 10px", cursor: "pointer",
                                  background: isChecked ? "rgba(234,179,8,0.05)" : "transparent",
                                  borderBottom: "1px solid rgba(255,255,255,0.03)"
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // toggled by row click
                                  style={{ cursor: "pointer", accentColor: "#eab308" }}
                                />
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                                  <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.8rem" }}>{p.name}</div>
                                  <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>{p.position} · {p.clubName || "Free Agent"}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Step 3: Prime Duration / Validity Selection */}
                    <div style={{ padding: "12px 14px", background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                        <label style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#eab308", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                          <i className="fa-solid fa-hourglass-half" /> 3. Prime Duration / Validity
                        </label>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                          Preview: <strong style={{ color: "#fbbf24" }}>{computePrimePreview(primeAssignValidity, primeAssignCustomValidity)}</strong>
                        </span>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {[
                          { id: "0.5", label: "0.5 Season (Half)" },
                          { id: "1.0", label: "1 Season" },
                          { id: "1.5", label: "1.5 Seasons" },
                          { id: "2.0", label: "2 Seasons" },
                          { id: "3.0", label: "3 Seasons" },
                          { id: "permanent", label: "Permanent" },
                          { id: "custom", label: "Custom..." }
                        ].map(opt => {
                          const isSelected = primeAssignValidity === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setPrimeAssignValidity(opt.id)}
                              style={{
                                padding: "5px 11px",
                                borderRadius: "6px",
                                border: isSelected ? "1px solid #eab308" : "1px solid rgba(255,255,255,0.1)",
                                background: isSelected ? "rgba(234,179,8,0.2)" : "rgba(0,0,0,0.3)",
                                color: isSelected ? "#facc15" : "rgba(255,255,255,0.7)",
                                fontSize: "0.72rem",
                                fontWeight: isSelected ? 700 : 500,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              {isSelected && <i className="fa-solid fa-check" style={{ fontSize: "0.68rem" }} />}
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      {primeAssignValidity === "custom" && (
                        <div style={{ marginTop: "10px" }}>
                          <input
                            type="text"
                            placeholder="Enter custom validity text (e.g. Season 8.0, 4 Seasons, Tournament Winner)..."
                            value={primeAssignCustomValidity}
                            onChange={(e) => setPrimeAssignCustomValidity(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              background: "rgba(0,0,0,0.5)",
                              border: "1px solid rgba(234,179,8,0.4)",
                              borderRadius: "6px",
                              color: "#fff",
                              fontSize: "0.82rem",
                              outline: "none",
                              boxSizing: "border-box"
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Step 4: RT Cost Configuration */}
                    <div style={{ padding: "12px 14px", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <label style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#eab308", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                          <i className="fa-solid fa-coins" /> 4. RT Deduction Cost Per Player
                        </label>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                          Total: <strong style={{ color: "#eab308" }}>{primeSelectedPlayerIds.length * (Number(primeRtCost) || 0)} RT</strong>
                        </span>
                      </div>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={primeRtCost}
                          onChange={(e) => setPrimeRtCost(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder={`Enter RT cost (default: ${primeFeeConfig.upgradeRtCost})`}
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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", flexWrap: "wrap", gap: "6px" }}>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                          Deducted from the manager's R2G Token wallet. (Current default: <strong style={{ color: "#eab308" }}>{primeFeeConfig.upgradeRtCost} RT</strong>)
                        </div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={handleSavePrimeUpgradeAsDefault}
                            title="Save this cost as the persistent system default fee"
                            style={{
                              padding: "3px 8px",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              background: "rgba(234,179,8,0.15)",
                              border: "1px solid rgba(234,179,8,0.35)",
                              color: "#eab308",
                              borderRadius: "5px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <i className="fa-solid fa-floppy-disk" /> Set {primeRtCost} RT as Default
                          </button>
                          {primeRtCost !== primeFeeConfig.upgradeRtCost && (
                            <button
                              type="button"
                              onClick={() => setPrimeRtCost(primeFeeConfig.upgradeRtCost)}
                              title="Reset to configured default"
                              style={{
                                padding: "3px 8px",
                                fontSize: "0.68rem",
                                fontWeight: 600,
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                color: "rgba(255,255,255,0.7)",
                                borderRadius: "5px",
                                cursor: "pointer"
                              }}
                            >
                              Reset ({primeFeeConfig.upgradeRtCost} RT)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isPending || primeSelectedPlayerIds.length === 0}
                      style={{
                        width: "100%", padding: "12px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
                        fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase",
                        background: "linear-gradient(135deg, #eab308, #ca8a04)", color: "#000",
                        opacity: isPending || primeSelectedPlayerIds.length === 0 ? 0.5 : 1, transition: "all 0.25s ease"
                      }}
                    >
                      Set Prime Selected ({primeSelectedPlayerIds.length})
                    </button>

                  </form>
                ) : (
                  /* TRANSFER PRIME FORM */
                  <form onSubmit={handlePrimeTransferSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                        1. Select franchise / club
                      </label>
                      <AdminClubDropdown
                        clubs={clubs}
                        selectedClubId={primeClubId}
                        onSelect={(id) => {
                          setPrimeClubId(id);
                          setPrimeSelectedPlayerIds([]);
                          setPrimeTransferSourceId("");
                          setPrimeTransferDestId("");
                        }}
                        placeholder="-- Choose franchise (Required) --"
                        showAllOption={false}
                      />
                    </div>

                    {/* Source Prime Player */}
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", color: "#eab308", marginBottom: "6px", fontWeight: 700 }}>
                        2. Current Prime Player (Transfer From)
                      </label>
                      {!primeClubId ? (
                        <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", color: "var(--text-secondary)", fontSize: "0.78rem", textAlign: "center" }}>
                          Select a club first
                        </div>
                      ) : transferSourceList.length === 0 ? (
                        <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", fontSize: "0.78rem", textAlign: "center" }}>
                          No Primed players on this team
                        </div>
                      ) : (
                        <select
                          value={primeTransferSourceId}
                          onChange={(e) => setPrimeTransferSourceId(e.target.value)}
                          style={{
                            width: "100%", padding: "9px 12px", borderRadius: "8px", background: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(234,179,8,0.3)", color: "#fff", fontSize: "0.85rem", outline: "none", boxSizing: "border-box"
                          }}
                        >
                          <option value="" style={{ background: "#18181b" }}>-- Select Prime Player --</option>
                          {transferSourceList.map(p => (
                            <option key={p.id} value={p.id} style={{ background: "#18181b" }}>
                              ⭐ {p.name} ({p.position}) · {p.validUntil}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Arrow indicator */}
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "-6px 0 -2px 0" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(234,179,8,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)", fontSize: "0.75rem" }}>
                        <i className="fa-solid fa-arrow-down" />
                      </div>
                    </div>

                    {/* Destination Player */}
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", color: "#60a5fa", marginBottom: "6px", fontWeight: 700 }}>
                        3. Target Player to Receive Prime (Transfer To)
                      </label>
                      {!primeClubId ? (
                        <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", color: "var(--text-secondary)", fontSize: "0.78rem", textAlign: "center" }}>
                          Select a club first
                        </div>
                      ) : transferDestList.length === 0 ? (
                        <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-secondary)", fontSize: "0.78rem", textAlign: "center" }}>
                          No available squad players
                        </div>
                      ) : (
                        <select
                          value={primeTransferDestId}
                          onChange={(e) => setPrimeTransferDestId(e.target.value)}
                          style={{
                            width: "100%", padding: "9px 12px", borderRadius: "8px", background: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(96,165,250,0.3)", color: "#fff", fontSize: "0.85rem", outline: "none", boxSizing: "border-box"
                          }}
                        >
                          <option value="" style={{ background: "#18181b" }}>-- Select Target Player --</option>
                          {transferDestList.map(p => (
                            <option key={p.id} value={p.id} style={{ background: "#18181b" }}>
                              {p.name} ({p.position}) · Base: {p.value || p.base_value} Coins
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Step 4: Transfer Prime Validity Selection */}
                    <div style={{ padding: "12px 14px", background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                        <label style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#eab308", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                          <i className="fa-solid fa-hourglass-half" /> 4. Target Player Prime Validity
                        </label>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                          Target: <strong style={{ color: "#fbbf24" }}>{computePrimePreview(primeTransferValidity, primeTransferCustomValidity)}</strong>
                        </span>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {[
                          { id: "keep", label: "Keep Existing (Source)" },
                          { id: "0.5", label: "0.5 Season (Half)" },
                          { id: "1.0", label: "1 Season" },
                          { id: "1.5", label: "1.5 Seasons" },
                          { id: "2.0", label: "2 Seasons" },
                          { id: "3.0", label: "3 Seasons" },
                          { id: "permanent", label: "Permanent" },
                          { id: "custom", label: "Custom..." }
                        ].map(opt => {
                          const isSelected = primeTransferValidity === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setPrimeTransferValidity(opt.id)}
                              style={{
                                padding: "5px 11px",
                                borderRadius: "6px",
                                border: isSelected ? "1px solid #eab308" : "1px solid rgba(255,255,255,0.1)",
                                background: isSelected ? "rgba(234,179,8,0.2)" : "rgba(0,0,0,0.3)",
                                color: isSelected ? "#facc15" : "rgba(255,255,255,0.7)",
                                fontSize: "0.72rem",
                                fontWeight: isSelected ? 700 : 500,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              {isSelected && <i className="fa-solid fa-check" style={{ fontSize: "0.68rem" }} />}
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      {primeTransferValidity === "custom" && (
                        <div style={{ marginTop: "10px" }}>
                          <input
                            type="text"
                            placeholder="Enter custom validity text (e.g. Season 8.0, 4 Seasons, End of Phase 1)..."
                            value={primeTransferCustomValidity}
                            onChange={(e) => setPrimeTransferCustomValidity(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              background: "rgba(0,0,0,0.5)",
                              border: "1px solid rgba(234,179,8,0.4)",
                              borderRadius: "6px",
                              color: "#fff",
                              fontSize: "0.82rem",
                              outline: "none",
                              boxSizing: "border-box"
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Transfer RT fee */}
                    <div style={{ padding: "12px 14px", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <label style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#eab308", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                          <i className="fa-solid fa-coins" /> 5. RT Transfer Fee
                        </label>
                        <span style={{ fontSize: "0.75rem", color: "#eab308", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                          {Number(primeTransferRtCost) || 0} RT
                        </span>
                      </div>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={primeTransferRtCost}
                          onChange={(e) => setPrimeTransferRtCost(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder={`Enter RT transfer fee (default: ${primeFeeConfig.transferRtCost})`}
                          style={{
                            width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(234,179,8,0.3)",
                            borderRadius: "8px", color: "#fff", fontSize: "0.9rem", fontWeight: 600, outline: "none", boxSizing: "border-box"
                          }}
                        />
                        <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", fontWeight: 700, color: "#eab308" }}>
                          RT
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", flexWrap: "wrap", gap: "6px" }}>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                          Deducted from the manager's R2G Token wallet to transfer Prime status. (Default: <strong style={{ color: "#eab308" }}>{primeFeeConfig.transferRtCost} RT</strong>)
                        </div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={handleSavePrimeTransferAsDefault}
                            title="Save this fee as the persistent system default fee"
                            style={{
                              padding: "3px 8px",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              background: "rgba(234,179,8,0.15)",
                              border: "1px solid rgba(234,179,8,0.35)",
                              color: "#eab308",
                              borderRadius: "5px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <i className="fa-solid fa-floppy-disk" /> Set {primeTransferRtCost} RT as Default
                          </button>
                          {primeTransferRtCost !== primeFeeConfig.transferRtCost && (
                            <button
                              type="button"
                              onClick={() => setPrimeTransferRtCost(primeFeeConfig.transferRtCost)}
                              title="Reset to configured default"
                              style={{
                                padding: "3px 8px",
                                fontSize: "0.68rem",
                                fontWeight: 600,
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                color: "rgba(255,255,255,0.7)",
                                borderRadius: "5px",
                                cursor: "pointer"
                              }}
                            >
                              Reset ({primeFeeConfig.transferRtCost} RT)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isPending || !primeClubId || !primeTransferSourceId || !primeTransferDestId}
                      style={{
                        width: "100%", padding: "12px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
                        fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase",
                        background: "linear-gradient(135deg, #eab308, #ca8a04)", color: "#000",
                        opacity: isPending || !primeClubId || !primeTransferSourceId || !primeTransferDestId ? 0.5 : 1,
                        transition: "all 0.25s ease"
                      }}
                    >
                      Transfer Prime Status ({primeTransferRtCost} RT)
                    </button>
                  </form>
                );
              })()}
            </div>

            {/* Right Column: List of Active Primed Players */}
            <div className="admin-card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.02rem", color: "#fff", fontWeight: 700 }}>
                  <i className="fa-solid fa-crown" style={{ color: "#eab308" }} />
                  Active Primed Players
                  <span style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)", padding: "1px 7px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    {primedPlayers.length}
                  </span>
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  Configurable Validity Active
                </span>
              </div>

              {/* Primed Players Filter Bar */}
              <div style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: "1rem",
                padding: "8px 10px",
                background: "rgba(0,0,0,0.25)",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.05)"
              }}>
                <div style={{ position: "relative", flex: "1 1 180px", minWidth: "140px" }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: "0.72rem" }} />
                  <input
                    type="text"
                    placeholder="Search primed player, club..."
                    value={primeTabSearch}
                    onChange={(e) => { setPrimeTabSearch(e.target.value); setPrimeTabPage(1); }}
                    style={{
                      width: "100%",
                      padding: "5px 24px 5px 28px",
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.75rem",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  {primeTabSearch && (
                    <button
                      type="button"
                      onClick={() => { setPrimeTabSearch(""); setPrimeTabPage(1); }}
                      style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.7rem", padding: 0 }}
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                </div>

                <select
                  value={primeTabClubFilter}
                  onChange={(e) => { setPrimeTabClubFilter(e.target.value); setPrimeTabPage(1); }}
                  style={{
                    padding: "5px 8px",
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "0.75rem",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="all" style={{ background: "#18181b" }}>All Clubs</option>
                  {clubs.map(c => (
                    <option key={c.id} value={String(c.id)} style={{ background: "#18181b" }}>{c.name}</option>
                  ))}
                </select>
              </div>

              {loadingPrimeData ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading primed players...</div>
              ) : filteredPrimeTabPlayers.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                  {primedPlayers.length === 0 ? "No players are currently Primed in the database." : "No Primed players match the search filters."}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ color: "var(--text-secondary)", fontSize: "0.68rem", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <th style={{ padding: "0.75rem 0.5rem", textAlign: "left" }}>Player</th>
                        <th style={{ padding: "0.75rem 0.5rem", textAlign: "left" }}>Position</th>
                        <th style={{ padding: "0.75rem 0.5rem", textAlign: "left" }}>Franchise / Club</th>
                        <th style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>Prime Duration</th>
                        <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPrimeTabPlayers.map((p) => {
                        const handleRemove = async () => {
                          if (!confirm("Are you sure you want to remove Prime status from this player?")) return;
                          startTransition(async () => {
                            try {
                              const res = await removePlayerPrime(p.id);
                              if (res.success) {
                                showToast("Prime status removed!");
                                loadPrimeData();
                              } else {
                                showToast(res.error || "Failed to remove status");
                              }
                            } catch {
                              showToast("Error removing status");
                            }
                          });
                        };

                        return (
                          <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <td style={{ padding: "0.75rem 0.5rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {p.imagePath ? (
                                  <img src={p.imagePath} alt="" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} />
                                ) : (
                                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(234,179,8,0.15)", color: "#eab308", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700 }}>
                                    {p.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem" }}>{p.name}</div>
                                  <span style={{ fontSize: "0.6rem", background: "rgba(234,179,8,0.15)", color: "#eab308", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>PRIME</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-secondary)", fontWeight: 600 }}>{p.position}</td>
                            <td style={{ padding: "0.75rem 0.5rem", color: "#fff", fontWeight: 600 }}>{p.clubName}</td>
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                                {renderPrimeDurationBadge(p)}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPrimeValidity(p)}
                                  title="Edit validity / duration"
                                  style={{
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    border: "1px solid rgba(234,179,8,0.3)",
                                    background: "rgba(234,179,8,0.1)",
                                    color: "#fbbf24",
                                    cursor: "pointer",
                                    fontSize: "0.68rem"
                                  }}
                                >
                                  <i className="fa-solid fa-pen-to-square" />
                                </button>
                              </div>
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPrimeValidity(p)}
                                  style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(234,179,8,0.3)", background: "rgba(234,179,8,0.1)", color: "#fbbf24", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}
                                >
                                  <i className="fa-solid fa-clock" /> Validity
                                </button>
                                <button
                                  type="button"
                                  onClick={handleRemove}
                                  disabled={isPending}
                                  style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: "#f87171", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 }}
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Prime Tab Pagination Bar */}
              {filteredPrimeTabPlayers.length > 0 && (
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "1rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  fontSize: "0.72rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {primeTabPageSize === -1 ? 1 : Math.min((primeTabPage - 1) * primeTabPageSize + 1, filteredPrimeTabPlayers.length)} - {primeTabPageSize === -1 ? filteredPrimeTabPlayers.length : Math.min(primeTabPage * primeTabPageSize, filteredPrimeTabPlayers.length)} of {filteredPrimeTabPlayers.length}
                    </span>
                    <select
                      value={primeTabPageSize}
                      onChange={(e) => { setPrimeTabPageSize(Number(e.target.value)); setPrimeTabPage(1); }}
                      style={{
                        padding: "2px 6px",
                        background: "rgba(0,0,0,0.35)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "4px",
                        color: "var(--text-secondary)",
                        fontSize: "0.7rem",
                        outline: "none",
                        cursor: "pointer"
                      }}
                    >
                      <option value={10} style={{ background: "#18181b" }}>10 / page</option>
                      <option value={25} style={{ background: "#18181b" }}>25 / page</option>
                      <option value={-1} style={{ background: "#18181b" }}>All</option>
                    </select>
                  </div>

                  {primeTabPageSize !== -1 && totalPrimeTabPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button
                        type="button"
                        disabled={primeTabPage <= 1}
                        onClick={() => setPrimeTabPage(prev => Math.max(1, prev - 1))}
                        style={{
                          padding: "2px 8px",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "4px",
                          color: primeTabPage <= 1 ? "rgba(255,255,255,0.2)" : "#fff",
                          cursor: primeTabPage <= 1 ? "default" : "pointer",
                          fontSize: "0.7rem"
                        }}
                      >
                        <i className="fa-solid fa-chevron-left" /> Prev
                      </button>
                      <span style={{ color: "#fbbf24", padding: "0 4px", fontFamily: "var(--font-mono)" }}>
                        {primeTabPage} / {totalPrimeTabPages}
                      </span>
                      <button
                        type="button"
                        disabled={primeTabPage >= totalPrimeTabPages}
                        onClick={() => setPrimeTabPage(prev => Math.min(totalPrimeTabPages, prev + 1))}
                        style={{
                          padding: "2px 8px",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "4px",
                          color: primeTabPage >= totalPrimeTabPages ? "rgba(255,255,255,0.2)" : "#fff",
                          cursor: primeTabPage >= totalPrimeTabPages ? "default" : "pointer",
                          fontSize: "0.7rem"
                        }}
                      >
                        Next <i className="fa-solid fa-chevron-right" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Edit Prime Validity Modal (Auction Page) */}
          {editingPrimePlayer && typeof document !== "undefined" && createPortal(
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(6px)",
                zIndex: 999999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem"
              }}
              onClick={() => !isSavingEditPrime && setEditingPrimePlayer(null)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#18181b",
                  border: "1px solid rgba(234,179,8,0.3)",
                  borderRadius: "16px",
                  width: "100%",
                  maxWidth: "480px",
                  padding: "1.5rem",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className="fa-solid fa-crown" style={{ color: "#eab308" }} />
                      <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                        Edit Prime Validity
                      </h3>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Updating validity for <strong style={{ color: "#fff" }}>{editingPrimePlayer.name}</strong> ({editingPrimePlayer.position} · {editingPrimePlayer.clubName})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingPrimePlayer(null)}
                    disabled={isSavingEditPrime}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.1rem", padding: "4px" }}
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>

                <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Current Duration & Status:</span>
                  <div>
                    {renderPrimeDurationBadge(editingPrimePlayer)}
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", color: "#eab308", fontWeight: 700, marginBottom: "8px" }}>
                    Select New Validity Duration
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {[
                      { id: "0.5", label: "0.5 Season (Half)" },
                      { id: "1.0", label: "1 Season" },
                      { id: "1.5", label: "1.5 Seasons" },
                      { id: "2.0", label: "2 Seasons" },
                      { id: "3.0", label: "3 Seasons" },
                      { id: "permanent", label: "Permanent" },
                      { id: "custom", label: "Custom..." }
                    ].map(opt => {
                      const isSelected = editPrimeValidity === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setEditPrimeValidity(opt.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: isSelected ? "1px solid #eab308" : "1px solid rgba(255,255,255,0.1)",
                            background: isSelected ? "rgba(234,179,8,0.2)" : "rgba(0,0,0,0.3)",
                            color: isSelected ? "#facc15" : "rgba(255,255,255,0.7)",
                            fontSize: "0.78rem",
                            fontWeight: isSelected ? 700 : 500,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          {isSelected && <i className="fa-solid fa-check" style={{ fontSize: "0.7rem" }} />}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {editPrimeValidity === "custom" && (
                    <div style={{ marginTop: "10px" }}>
                      <input
                        type="text"
                        placeholder="Enter custom validity text (e.g. Season 8.0, 4 Seasons, End of Phase 1)..."
                        value={editPrimeCustomValidity}
                        onChange={(e) => setEditPrimeCustomValidity(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          background: "rgba(0,0,0,0.5)",
                          border: "1px solid rgba(234,179,8,0.4)",
                          borderRadius: "6px",
                          color: "#fff",
                          fontSize: "0.85rem",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div style={{ padding: "10px 14px", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "8px", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "2px" }}>
                    Target New Validity Value
                  </div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fbbf24", fontFamily: "var(--font-mono)" }}>
                    {computePrimePreview(editPrimeValidity, editPrimeCustomValidity)}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setEditingPrimePlayer(null)}
                    disabled={isSavingEditPrime}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditPrimeValidity}
                    disabled={isSavingEditPrime}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      border: "none",
                      background: "linear-gradient(135deg, #eab308, #ca8a04)",
                      color: "#000",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    {isSavingEditPrime ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check" /> Update Validity
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        </div>
        )}

        {/* Tab 7: History & Revert */}
        {activeTab === 'history' && (
          <div className="admin-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 className="admin-card-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: "#38bdf8" }} />
                  Operation History & Revert Hub
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  Review recent operations (auction signs, transfers, swaps, releases, bulk assignments). Any active operation can be cleanly reverted.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={loadHistory}
                  disabled={historyLoading}
                  className="portal-btn btn-secondary"
                  style={{ padding: "6px 14px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <i className={`fa-solid fa-arrows-rotate ${historyLoading ? 'fa-spin' : ''}`} /> Refresh
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "1.25rem", flexWrap: "wrap" }}>
              {[
                { id: "all", label: "All Operations" },
                { id: "transfer_buy", label: "Auction Buys" },
                { id: "bulk_transfer", label: "Transfers" },
                { id: "bulk_swap", label: "Swaps" },
                { id: "release", label: "Releases" },
                { id: "bulk_assign", label: "Bulk Squad Assigns" }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setHistoryFilter(f.id)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1px solid ${historyFilter === f.id ? '#38bdf8' : 'rgba(255,255,255,0.12)'}`,
                    background: historyFilter === f.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                    color: historyFilter === f.id ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                    transition: "all 0.15s ease"
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {historyLoading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "1.8rem", marginBottom: "0.75rem", color: "#38bdf8" }} />
                <p>Loading operation history...</p>
              </div>
            ) : (() => {
              const filtered = historyList.filter(op => historyFilter === "all" || op.operation_type === historyFilter);
              if (filtered.length === 0) {
                return (
                  <div style={{ padding: "3.5rem 1rem", textAlign: "center", color: "var(--text-secondary)", background: "rgba(0,0,0,0.15)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.08)" }}>
                    <i className="fa-solid fa-box-open" style={{ fontSize: "2.2rem", opacity: 0.35, marginBottom: "0.75rem" }} />
                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>No operations found</div>
                    <p style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>No reversible operations match the selected filter.</p>
                  </div>
                );
              }

              const typeBadgeColor: Record<string, { bg: string; text: string; border: string; icon: string }> = {
                transfer_buy: { bg: "rgba(234, 179, 8, 0.15)", text: "#facc15", border: "rgba(234, 179, 8, 0.3)", icon: "fa-gavel" },
                bulk_transfer: { bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.3)", icon: "fa-shuffle" },
                bulk_swap: { bg: "rgba(168, 85, 247, 0.15)", text: "#c084fc", border: "rgba(168, 85, 247, 0.3)", icon: "fa-rotate" },
                release: { bg: "rgba(239, 68, 68, 0.15)", text: "#f87171", border: "rgba(239, 68, 68, 0.3)", icon: "fa-user-minus" },
                bulk_assign: { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)", icon: "fa-file-signature" }
              };

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {filtered.map(op => {
                    const isReverted = op.status === 'reverted';
                    const dt = new Date(op.created_at);
                    const formattedDate = dt.toLocaleString();
                    const detailsObj = typeof op.details === 'string' ? JSON.parse(op.details) : op.details;
                    const typeStyle = typeBadgeColor[op.operation_type] || { bg: "rgba(255,255,255,0.1)", text: "#fff", border: "rgba(255,255,255,0.2)", icon: "fa-circle" };

                    return (
                      <div
                        key={op.id}
                        style={{
                          background: isReverted ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.04)",
                          border: `1px solid ${isReverted ? 'rgba(255, 255, 255, 0.06)' : 'rgba(56, 189, 248, 0.22)'}`,
                          borderRadius: "12px",
                          padding: "1.1rem 1.35rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "1.25rem",
                          flexWrap: "wrap",
                          opacity: isReverted ? 0.6 : 1,
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{ flex: 1, minWidth: "260px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                background: typeStyle.bg,
                                color: typeStyle.text,
                                border: `1px solid ${typeStyle.border}`
                              }}
                            >
                              <i className={`fa-solid ${typeStyle.icon}`} style={{ fontSize: "0.65rem" }} />
                              {op.operation_type.replace('_', ' ')}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: "0.98rem", color: isReverted ? "rgba(255,255,255,0.7)" : "#fff" }}>
                              {op.title}
                            </span>
                            <span
                              style={{
                                fontSize: "0.68rem",
                                padding: "1px 7px",
                                borderRadius: "4px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                background: isReverted ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                                color: isReverted ? "#f87171" : "#34d399",
                                border: `1px solid ${isReverted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                              }}
                            >
                              {isReverted ? "Reverted" : "Active"}
                            </span>
                          </div>

                          {/* Extra details from detailsObj */}
                          {detailsObj?.summaries && Array.isArray(detailsObj.summaries) && (
                            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)", marginBottom: "4px" }}>
                              {detailsObj.summaries.slice(0, 4).join(" • ")}
                              {detailsObj.summaries.length > 4 && ` (+${detailsObj.summaries.length - 4} more)`}
                            </div>
                          )}

                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "flex", gap: "14px", flexWrap: "wrap" }}>
                            <span><i className="fa-solid fa-clock" style={{ marginRight: "4px" }} />{formattedDate}</span>
                            {op.admin_username && <span><i className="fa-solid fa-user-shield" style={{ marginRight: "4px" }} />By: {op.admin_username}</span>}
                            {detailsObj?.rtDeducted > 0 && <span style={{ color: "#fbbf24" }}><i className="fa-solid fa-coins" style={{ marginRight: "4px" }} />{detailsObj.rtDeducted} RT</span>}
                          </div>
                        </div>

                        {!isReverted ? (
                          <button
                            type="button"
                            onClick={() => handleRevert(op.id, op.title)}
                            disabled={revertingId === op.id || isPending}
                            style={{
                              padding: "8px 18px",
                              borderRadius: "8px",
                              background: "rgba(239, 68, 68, 0.15)",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              color: "#fca5a5",
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              cursor: revertingId === op.id ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              transition: "all 0.2s ease"
                            }}
                          >
                            <i className={`fa-solid ${revertingId === op.id ? 'fa-spinner fa-spin' : 'fa-rotate-left'}`} />
                            {revertingId === op.id ? 'Reverting...' : 'Revert Operation'}
                          </button>
                        ) : (
                          <div style={{ fontSize: "0.76rem", color: "rgba(255, 255, 255, 0.4)", fontStyle: "italic", textAlign: "right" }}>
                            Reverted {op.reverted_at ? new Date(op.reverted_at).toLocaleTimeString() : ''}
                            {op.reverted_by ? ` by ${op.reverted_by}` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
