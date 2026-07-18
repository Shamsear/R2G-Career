"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
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
  releasePlayerContract,
  fetchClubPlayersWithContracts
} from "@/utils/solo/serverActions";

export default function AuctionManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [freeAgents, setFreeAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"auction" | "sell" | "release" | "swap" | "window">("auction");
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMobile, setIsMobile] = useState<boolean>(false);

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

  // Custom club dropdown state
  const [clubDropdownOpen, setClubDropdownOpen] = useState<boolean>(false);
  const [clubDropdownSearch, setClubDropdownSearch] = useState<string>("");

  // Sell state
  const [sellClubId, setSellClubId] = useState<string>("");
  const [sellClubPlayers, setSellClubPlayers] = useState<any[]>([]);
  const [selectedSellPlayerIds, setSelectedSellPlayerIds] = useState<number[]>([]);
  const [transferTargets, setTransferTargets] = useState<Record<number, { buyingClubId: string; price: number }>>({});
  const [sellSearchTerm, setSellSearchTerm] = useState<string>("");
  const [loadingSellPlayers, setLoadingSellPlayers] = useState<boolean>(false);

  // Release state
  const [releaseClubId, setReleaseClubId] = useState<string>("");
  const [releaseClubPlayers, setReleaseClubPlayers] = useState<any[]>([]);
  const [releaseSearchTerm, setReleaseSearchTerm] = useState<string>("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [releaseTiming, setReleaseTiming] = useState<"start" | "mid">("start");
  const [loadingReleasePlayers, setLoadingReleasePlayers] = useState<boolean>(false);

  // Swap state
  const [swapClubAId, setSwapClubAId] = useState<string>("");
  const [swapClubBId, setSwapClubBId] = useState<string>("");
  const [swapClubAPlayers, setSwapClubAPlayers] = useState<any[]>([]);
  const [swapClubBPlayers, setSwapClubBPlayers] = useState<any[]>([]);
  const [swapPlayerAId, setSwapPlayerAId] = useState<string>("");
  const [swapPlayerBId, setSwapPlayerBId] = useState<string>("");
  const [swapAdjustmentAtoB, setSwapAdjustmentAtoB] = useState<number>(0);
  const [bulkSwaps, setBulkSwaps] = useState<any[]>([]);

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

    // Close player dropdown on outside click
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-player-dropdown]")) {
        setPlayerDropdownOpen(false);
      }
      if (!target.closest("[data-club-dropdown]")) {
        setClubDropdownOpen(false);
      }
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
          setSelectedSellPlayerIds([]);
          setTransferTargets({});
          setLoadingSellPlayers(false);
        })
        .catch(() => {
          showToast("Error loading squad roster");
          setLoadingSellPlayers(false);
        });
    } else {
      setSellClubPlayers([]);
      setSelectedSellPlayerIds([]);
      setTransferTargets({});
    }
  }, [sellClubId, activeSeason]);

  // Loading release squad players
  useEffect(() => {
    if (releaseClubId && activeSeason) {
      setLoadingReleasePlayers(true);
      fetchClubPlayersWithContracts(parseInt(releaseClubId), activeSeason.id)
        .then((data) => {
          setReleaseClubPlayers(data || []);
          setSelectedPlayerIds([]);
          setLoadingReleasePlayers(false);
        })
        .catch(() => {
          showToast("Error loading club players");
          setLoadingReleasePlayers(false);
        });
    } else {
      setReleaseClubPlayers([]);
      setSelectedPlayerIds([]);
    }
  }, [releaseClubId, activeSeason]);

  // Loading swap club A squad players
  useEffect(() => {
    if (swapClubAId) {
      fetchClubPlayers(swapClubAId).then(setSwapClubAPlayers).catch(() => showToast("Error loading Club A players"));
    } else {
      setSwapClubAPlayers([]);
    }
  }, [swapClubAId]);

  // Loading swap club B squad players
  useEffect(() => {
    if (swapClubBId) {
      fetchClubPlayers(swapClubBId).then(setSwapClubBPlayers).catch(() => showToast("Error loading Club B players"));
    } else {
      setSwapClubBPlayers([]);
    }
  }, [swapClubBId]);

  // Roster filtering via search input (Sell tab)
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

  const toggleRowSelection = (playerId: number) => {
    setSelectedPlayerIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const toggleSellRowSelection = (playerId: number) => {
    setSelectedSellPlayerIds(prev => {
      const isSelected = prev.includes(playerId);
      if (isSelected) {
        const updated = prev.filter(id => id !== playerId);
        setTransferTargets(prevTargets => {
          const updatedTargets = { ...prevTargets };
          delete updatedTargets[playerId];
          return updatedTargets;
        });
        return updated;
      } else {
        const playerObj = sellClubPlayers.find(p => p.id === playerId);
        const defaultValue = playerObj ? Number(playerObj.signedValue) || 80 : 80;
        setTransferTargets(prevTargets => ({
          ...prevTargets,
          [playerId]: { buyingClubId: "", price: defaultValue }
        }));
        return [...prev, playerId];
      }
    });
  };

  // WhatsApp Auction Handler
  const handleRapidAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) return showToast("Select a player!");
    if (!winningClubId) return showToast("Select winning club!");
    if (bidAmount <= 0) return showToast("Enter a valid bid amount!");

    startTransition(async () => {
      try {
        await executeTransferBuy(
          parseInt(winningClubId),
          parseInt(selectedPlayerId),
          bidAmount,
          auctionTiming
        );
        
        const playerObj = freeAgents.find(p => p.id.toString() === selectedPlayerId);
        showToast(`Assigned ${playerObj?.name || 'Player'} to club successfully!`);
        
        setSelectedPlayerId("");
        setWinningClubId("");
        setBidAmount(80);
        loadData();
      } catch (err: any) {
        showToast(`Assignment failed: ${err.message || "Insufficient balance"}`);
      }
    });
  };

  // Bulk Transfer Handler
  const handleSell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellClubId || selectedSellPlayerIds.length === 0) {
      return showToast("Please select selling club and at least one player to transfer!");
    }
    
    try {
      const transfersList = selectedSellPlayerIds.map(playerId => {
        const target = transferTargets[playerId];
        const playerObj = sellClubPlayers.find(p => p.id === playerId);
        const pName = playerObj ? playerObj.name : `#${playerId}`;

        if (!target || !target.buyingClubId) {
          throw new Error(`Please specify buying club for ${pName}`);
        }
        if (target.price < 0) {
          throw new Error(`Transfer price for ${pName} cannot be negative!`);
        }
        if (target.buyingClubId === sellClubId) {
          throw new Error(`Buying club for ${pName} cannot be the same as the selling club!`);
        }

        const prevValue = playerObj ? Number(playerObj.signedValue) || 0 : 0;

        // Validation 1: No odd numbers allowed
        if (target.price % 2 !== 0) {
          throw new Error(`Transfer price for ${pName} must be an even number. Odd values like ${target.price} are not allowed.`);
        }

        // Validation 2: Price must be between 50% and 200% of current contract value
        const minPrice = 0.5 * prevValue;
        const maxPrice = 2.0 * prevValue;
        if (target.price < minPrice || target.price > maxPrice) {
          throw new Error(`Transfer price for ${pName} must be between 50% (${minPrice}) and 200% (${maxPrice}) of current value (${prevValue}).`);
        }

        return {
          sellingClubId: parseInt(sellClubId),
          playerId,
          price: target.price,
          buyingClubId: parseInt(target.buyingClubId)
        };
      });

      if (!confirm(`Are you sure you want to execute transfers for ${selectedSellPlayerIds.length} player(s)?`)) {
        return;
      }

      startTransition(async () => {
        try {
          await executeBulkTransfers(transfersList);
          showToast("Transfers executed successfully!");
          setSelectedSellPlayerIds([]);
          setTransferTargets({});
          loadData();
        } catch (err: any) {
          showToast(`Operation failed: ${err.message || "Failed to execute"}`);
        }
      });
    } catch (err: any) {
      showToast(err.message || "Invalid transfer settings");
    }
  };

  // Bulk Release Handler
  const handleBulkRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseClubId || selectedPlayerIds.length === 0) {
      return showToast("Please select at least one player to release!");
    }
    
    if (!confirm(`Are you sure you want to release the ${selectedPlayerIds.length} selected player(s)?`)) return;

    startTransition(async () => {
      try {
        let count = 0;
        for (const playerId of selectedPlayerIds) {
          await releasePlayerContract(
            playerId,
            activeSeason.id,
            releaseTiming
          );
          count++;
        }
        showToast(`Successfully released ${count} player(s)!`);
        setSelectedPlayerIds([]);
        if (releaseClubId && activeSeason) {
          const data = await fetchClubPlayersWithContracts(parseInt(releaseClubId), activeSeason.id);
          setReleaseClubPlayers(data || []);
        }
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

        await executeBulkSwaps(payload);
        showToast("All swap deals executed successfully!");
        setBulkSwaps([]);
        loadData();
      } catch (err: any) {
        showToast(`Bulk swap failed: ${err.message || "Verify parameters or balances"}`);
      }
    });
  };

  const triggerSeasonStartReleases = () => {
    if (!activeSeason) return;
    if (!confirm(`Release all contracts ending at start of Season ${activeSeason.season_number}?`)) return;
    startTransition(async () => {
      try {
        const res = await releaseExpiredContractsForSeason(activeSeason.season_number);
        showToast(`Released ${res.releasedCount} players whose contracts expired.`);
        loadData();
      } catch {
        showToast("Error triggering releases!");
      }
    });
  };

  return (
    <div className="portal-root-wrapper">
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
        <div className="tab-menu" style={{ display: "flex", gap: "10px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <button className={`portal-btn ${activeTab === 'auction' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('auction')}>
            <i className="fa-solid fa-gavel" /> WhatsApp Auction
          </button>
          <button className={`portal-btn ${activeTab === 'sell' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('sell')}>
            <i className="fa-solid fa-shuffle" /> Transfer Squad Players
          </button>
          <button className={`portal-btn ${activeTab === 'release' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('release')}>
            <i className="fa-solid fa-file-contract" /> Release Squad Players
          </button>
          <button className={`portal-btn ${activeTab === 'swap' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('swap')}>
            <i className="fa-solid fa-rotate" /> Swap Deal
          </button>
          <button className={`portal-btn ${activeTab === 'window' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('window')}>
            <i className="fa-solid fa-calendar-minus" /> Season Releases
          </button>
        </div>

        {/* Tab 1: WhatsApp Auction */}
        {activeTab === 'auction' && (
          <div>
            {/* Config Timing Bar */}
            <div className="admin-card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Active Season: </span>
                  <strong style={{ color: "#fff" }}>Season {activeSeason?.season_number || "9"}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
              <div className="financial-sidebar" style={{ minWidth: "340px" }}>
                <div className="admin-card" style={{ marginTop: 0, padding: "1.5rem" }}>
                  <h2 className="admin-card-title">
                    <i className="fa-solid fa-file-signature" style={{ color: "var(--solo-primary)", marginRight: "8px" }} />
                    Assign Auction Winner
                  </h2>
                  <form onSubmit={handleRapidAssign}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                      <div className="admin-form-group" style={{ position: "relative" }} data-player-dropdown="true">
                        <label>Select Player</label>
                        {/* Custom searchable player dropdown */}
                        <div
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
                          onClick={() => setPlayerDropdownOpen(prev => !prev)}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {selectedPlayerId
                              ? (() => { const p = freeAgents.find(x => x.id.toString() === selectedPlayerId); return p ? `${p.name} (${p.position})` : "-- Choose Player --"; })()
                              : "-- Choose Player --"}
                          </span>
                          <i className={`fa-solid fa-chevron-${playerDropdownOpen ? "up" : "down"}`} style={{ fontSize: "0.7rem", opacity: 0.6, flexShrink: 0 }} />
                        </div>

                        {playerDropdownOpen && (
                          <div style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            zIndex: 100,
                            background: "#1a1f2e",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "10px",
                            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                            overflow: "hidden",
                            marginTop: "4px"
                          }}>
                            {/* Position filter chips */}
                            <div style={{ padding: "10px 10px 6px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", flexWrap: "wrap", gap: "5px" }}>
                              {["ALL", "GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST", "FW"].map(pos => (
                                <button
                                  key={pos}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setPlayerPositionFilter(pos); }}
                                  style={{
                                    padding: "3px 9px",
                                    borderRadius: "20px",
                                    fontSize: "0.7rem",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    border: `1px solid ${playerPositionFilter === pos ? getPositionColor(pos === "ALL" ? "CM" : pos) : "rgba(255,255,255,0.15)"}`,
                                    background: playerPositionFilter === pos ? `${getPositionColor(pos === "ALL" ? "CM" : pos)}22` : "transparent",
                                    color: playerPositionFilter === pos ? getPositionColor(pos === "ALL" ? "CM" : pos) : "rgba(255,255,255,0.5)",
                                    transition: "all 0.15s ease"
                                  }}
                                >
                                  {pos}
                                </button>
                              ))}
                            </div>

                            {/* Search bar */}
                            <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                              <input
                                type="text"
                                autoFocus
                                placeholder="Search player name..."
                                value={playerDropdownSearch}
                                onChange={(e) => setPlayerDropdownSearch(e.target.value)}
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
                            <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                              {freeAgents
                                .filter(p =>
                                  (playerPositionFilter === "ALL" || p.position === playerPositionFilter) &&
                                  (playerDropdownSearch === "" || p.name.toLowerCase().includes(playerDropdownSearch.toLowerCase()))
                                )
                                .map(p => (
                                  <div
                                    key={p.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPlayerId(p.id.toString());
                                      setPlayerDropdownOpen(false);
                                      setPlayerDropdownSearch("");
                                    }}
                                    style={{
                                      padding: "9px 12px",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                      background: selectedPlayerId === p.id.toString() ? "rgba(0,102,255,0.12)" : "transparent",
                                      borderLeft: selectedPlayerId === p.id.toString() ? "3px solid #0066ff" : "3px solid transparent",
                                      transition: "background 0.12s ease"
                                    }}
                                    onMouseEnter={(e) => { if (selectedPlayerId !== p.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                                    onMouseLeave={(e) => { if (selectedPlayerId !== p.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
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
                                    <span style={{ flex: 1, fontSize: "0.85rem", color: selectedPlayerId === p.id.toString() ? "#0066ff" : "#fff" }}>
                                      {p.name}
                                    </span>
                                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>
                                      {p.star.replace("-", " ")}
                                    </span>
                                  </div>
                                ))}
                              {freeAgents.filter(p =>
                                (playerPositionFilter === "ALL" || p.position === playerPositionFilter) &&
                                (playerDropdownSearch === "" || p.name.toLowerCase().includes(playerDropdownSearch.toLowerCase()))
                              ).length === 0 && (
                                <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>
                                  No players found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="admin-form-group" style={{ position: "relative" }} data-club-dropdown="true">
                        <label>Select Bidding Club</label>
                        {/* Custom searchable club dropdown */}
                        <div
                          style={{
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "8px",
                            background: "rgba(255,255,255,0.04)",
                            cursor: "pointer",
                            padding: "9px 12px",
                            fontSize: "0.85rem",
                            color: winningClubId ? "#fff" : "rgba(255,255,255,0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            userSelect: "none"
                          }}
                          onClick={() => setClubDropdownOpen(prev => !prev)}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {winningClubId
                              ? (clubs.find(c => c.id.toString() === winningClubId)?.name ?? "-- Select Winner --")
                              : "-- Select Winner --"}
                          </span>
                          <i className={`fa-solid fa-chevron-${clubDropdownOpen ? "up" : "down"}`} style={{ fontSize: "0.7rem", opacity: 0.6, flexShrink: 0 }} />
                        </div>

                        {clubDropdownOpen && (
                          <div style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            zIndex: 100,
                            background: "#1a1f2e",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "10px",
                            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                            overflow: "hidden",
                            marginTop: "4px"
                          }}>
                            {/* Search bar */}
                            <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                              <input
                                type="text"
                                autoFocus
                                placeholder="Search club name..."
                                value={clubDropdownSearch}
                                onChange={(e) => setClubDropdownSearch(e.target.value)}
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

                            {/* Club list */}
                            <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                              {clubs
                                .filter(c =>
                                  clubDropdownSearch === "" ||
                                  c.name.toLowerCase().includes(clubDropdownSearch.toLowerCase())
                                )
                                .map(c => (
                                  <div
                                    key={c.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setWinningClubId(c.id.toString());
                                      setClubDropdownOpen(false);
                                      setClubDropdownSearch("");
                                    }}
                                    style={{
                                      padding: "9px 14px",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                      background: winningClubId === c.id.toString() ? "rgba(0,102,255,0.12)" : "transparent",
                                      borderLeft: winningClubId === c.id.toString() ? "3px solid #0066ff" : "3px solid transparent",
                                      fontSize: "0.85rem",
                                      color: winningClubId === c.id.toString() ? "#0066ff" : "#fff",
                                      transition: "background 0.12s ease"
                                    }}
                                    onMouseEnter={(e) => { if (winningClubId !== c.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                                    onMouseLeave={(e) => { if (winningClubId !== c.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                                  >
                                    <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: winningClubId === c.id.toString() ? "#0066ff" : "rgba(255,255,255,0.3)" }} />
                                    {c.name}
                                  </div>
                                ))}
                              {clubs.filter(c =>
                                clubDropdownSearch === "" ||
                                c.name.toLowerCase().includes(clubDropdownSearch.toLowerCase())
                              ).length === 0 && (
                                <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>
                                  No clubs found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

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
                          <span>Salary (5%): <strong>{(bidAmount * 0.05).toFixed(2)} Coins</strong></span>
                          <span>Contract: <strong>2 Seasons</strong></span>
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

              {/* Right List: Free agent directory */}
              <div className="financial-main">
                <div className="admin-card" style={{ marginTop: 0, padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
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

                  <div className="table-responsive" style={{ maxHeight: "480px", overflowY: "auto" }}>
                    <table className="admin-list-table">
                      <thead>
                        <tr>
                          <th>Player Card</th>
                          <th>Position</th>
                          <th>Tier</th>
                          <th>Base Value</th>
                          <th style={{ textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFreeAgents.map(p => (
                          <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setSelectedPlayerId(p.id.toString())}>
                            <td>
                              <strong style={{ color: selectedPlayerId === p.id.toString() ? "var(--solo-primary)" : "#fff" }}>
                                {p.name}
                              </strong>
                            </td>
                            <td>{p.position}</td>
                            <td>{p.star.replace("-", " ")}</td>
                            <td>{p.value} Coins</td>
                            <td style={{ textAlign: "right" }}>
                              <button 
                                className={`portal-btn ${selectedPlayerId === p.id.toString() ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: "3px 10px", fontSize: "0.75rem" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPlayerId(p.id.toString());
                                }}
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Sell */}
        {activeTab === 'sell' && (
          <div className="admin-card">
            <h2 className="admin-card-title"><i className="fa-solid fa-shuffle" /> Transfer Squad Players</h2>
            <form onSubmit={handleSell}>
              {/* Selling Club Selection */}
              <div className="admin-form-grid" style={{ marginBottom: "1.5rem" }}>
                <div className="admin-form-group">
                  <label>Select Selling Club</label>
                  <select className="admin-select" value={sellClubId} onChange={(e) => setSellClubId(e.target.value)} required>
                    <option value="">-- Select Club --</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Squad Players Table/List (only if selling club is selected) */}
              {sellClubId && (
                <div style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#fff", margin: 0 }}>Squad Players</h3>
                    
                    {/* Search bar inside transfer tab */}
                    <input
                      type="text"
                      className="admin-input"
                      style={{ maxWidth: "250px", fontSize: "0.8rem", padding: "6px 12px" }}
                      placeholder="Search player name/position..."
                      value={sellSearchTerm}
                      onChange={(e) => setSellSearchTerm(e.target.value)}
                    />
                  </div>

                  {loadingSellPlayers ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                      <i className="fa-solid fa-spinner fa-spin" /> Loading squad players...
                    </div>
                  ) : filteredSellPlayers.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      No players found matching your criteria.
                    </div>
                  ) : isMobile ? (
                    /* Mobile Card View */
                    <div className="release-mobile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                      {filteredSellPlayers.map(p => {
                        const isChecked = selectedSellPlayerIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            style={{
                              background: isChecked ? "rgba(0, 102, 255, 0.05)" : "rgba(255, 255, 255, 0.02)",
                              border: isChecked ? "1px solid rgba(0, 102, 255, 0.3)" : "1px solid rgba(255, 255, 255, 0.06)",
                              borderRadius: "10px",
                              padding: "1rem",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                              transition: "all 0.2s ease"
                            }}
                            onClick={() => toggleSellRowSelection(p.id)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Handled by container click
                                style={{ width: "16px", height: "16px" }}
                              />
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                                  <img
                                    src={p.imagePath}
                                    alt=""
                                    style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                                    onError={(e) => { (e.target as any).src = '/assets/images/players/default.png' }}
                                  />
                                  <div>
                                    <strong style={{ color: "#fff", display: "block", fontSize: "0.9rem" }}>{p.name}</strong>
                                    <span className="badge-info" style={{ 
                                      background: `${getPositionColor(p.position)}18`, 
                                      color: getPositionColor(p.position), 
                                      borderColor: `${getPositionColor(p.position)}40`,
                                      fontSize: "0.7rem",
                                      padding: "1px 6px"
                                    }}>
                                      {p.position}
                                    </span>
                                  </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.5rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ color: "var(--text-secondary)" }}>Contract Terms:</span>
                                  <span>{cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ color: "var(--text-secondary)" }}>Contract Value:</span>
                                  <span>{p.signedValue} Coins</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Desktop Table View */
                    <div className="table-responsive">
                      <table className="admin-list-table" style={{ fontSize: "0.85rem" }}>
                        <thead>
                          <tr onClick={(e) => e.stopPropagation()}>
                            <th style={{ width: "40px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={filteredSellPlayers.length > 0 && filteredSellPlayers.every(p => selectedSellPlayerIds.includes(p.id))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const allIds = filteredSellPlayers.map(p => p.id);
                                    setSelectedSellPlayerIds(prev => Array.from(new Set([...prev, ...allIds])));
                                    setTransferTargets(prev => {
                                      const updated = { ...prev };
                                      filteredSellPlayers.forEach(p => {
                                        if (!updated[p.id]) {
                                          updated[p.id] = { buyingClubId: "", price: Number(p.signedValue) || 80 };
                                        }
                                      });
                                      return updated;
                                    });
                                  } else {
                                    const filteredIds = filteredSellPlayers.map(p => p.id);
                                    setSelectedSellPlayerIds(prev => prev.filter(id => !filteredIds.includes(id)));
                                    setTransferTargets(prev => {
                                      const updated = { ...prev };
                                      filteredIds.forEach(id => {
                                        delete updated[id];
                                      });
                                      return updated;
                                    });
                                  }
                                }}
                              />
                            </th>
                            <th>Player</th>
                            <th>Position</th>
                            <th>Contract Terms</th>
                            <th style={{ textAlign: "right" }}>Contract Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSellPlayers.map(p => {
                            const isChecked = selectedSellPlayerIds.includes(p.id);
                            return (
                              <tr
                                key={p.id}
                                style={{ background: isChecked ? "rgba(0, 102, 255, 0.05)" : "transparent", cursor: "pointer" }}
                                onClick={() => toggleSellRowSelection(p.id)}
                              >
                                <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSellRowSelection(p.id)}
                                  />
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <img
                                      src={p.imagePath}
                                      alt=""
                                      style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }}
                                      onError={(e) => { (e.target as any).src = '/assets/images/players/default.png' }}
                                    />
                                    <strong>{p.name}</strong>
                                  </div>
                                </td>
                                <td>{p.position}</td>
                                <td>
                                  {cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}
                                </td>
                                <td style={{ textAlign: "right" }}>{p.signedValue} Coins</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Bulk Transfer Setup List */}
              {sellClubId && selectedSellPlayerIds.length > 0 && (
                <div style={{ marginTop: "2rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#fff", marginBottom: "1.25rem" }}>
                    Configure Transfers ({selectedSellPlayerIds.length} player(s) selected)
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {selectedSellPlayerIds.map(playerId => {
                      const player = sellClubPlayers.find(p => p.id === playerId);
                      if (!player) return null;

                      const target = transferTargets[playerId] || { buyingClubId: "", price: 80 };

                      return (
                        <div
                          key={playerId}
                          style={{
                            background: "linear-gradient(135deg, rgba(0, 102, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
                            border: "1px solid rgba(0, 102, 255, 0.2)",
                            borderRadius: "12px",
                            padding: "1.25rem",
                            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)"
                          }}
                        >
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center" }}>
                            {/* Left: Player info card */}
                            <div style={{ display: "flex", gap: "12px", alignItems: "center", minWidth: "250px", flex: "1 1 300px" }}>
                              <img
                                src={player.imagePath}
                                alt={player.name}
                                style={{
                                  width: "60px",
                                  height: "60px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  border: "2px solid #0066ff"
                                }}
                                onError={(e) => { (e.target as any).src = '/assets/images/players/default.png' }}
                              />
                              <div>
                                <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "#fff", margin: "0 0 4px 0" }}>{player.name}</h4>
                                <span className="badge-info" style={{
                                  background: `${getPositionColor(player.position)}18`,
                                  color: getPositionColor(player.position),
                                  borderColor: `${getPositionColor(player.position)}40`,
                                  fontSize: "0.7rem",
                                  padding: "1px 6px",
                                  marginRight: "8px"
                                }}>
                                  {player.position}
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                  Val: <strong>{player.signedValue} Coins</strong> | Exp: <strong>Season {cleanSeason(player.expireSeason)}</strong>
                                </span>
                              </div>
                            </div>

                            {/* Middle: Flow arrow */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <i className="fa-solid fa-arrow-right-long" style={{ color: "#0066ff", fontSize: "1.5rem" }} />
                            </div>

                            {/* Right: Destination options */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", flex: "2 1 400px", alignItems: "center" }}>
                              <div className="admin-form-group" style={{ margin: 0, flex: 1, minWidth: "180px" }}>
                                <label style={{ fontSize: "0.8rem", marginBottom: "4px" }}>Buying Club</label>
                                <select
                                  className="admin-select"
                                  style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                                  value={target.buyingClubId}
                                  onChange={(e) => setTransferTargets(prev => ({
                                    ...prev,
                                    [playerId]: { ...target, buyingClubId: e.target.value }
                                  }))}
                                  required
                                >
                                  <option value="">-- Select Buying Club --</option>
                                  {clubs.filter(c => c.id.toString() !== sellClubId).map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="admin-form-group" style={{ margin: 0, width: "120px" }}>
                                <label style={{ fontSize: "0.8rem", marginBottom: "4px" }}>Price (Coins)</label>
                                <input
                                  type="number"
                                  className="admin-input"
                                  style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                                  value={target.price}
                                  onChange={(e) => setTransferTargets(prev => ({
                                    ...prev,
                                    [playerId]: { ...target, price: parseInt(e.target.value) || 0 }
                                  }))}
                                  required
                                />
                              </div>

                              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", minWidth: "150px" }}>
                                <i className="fa-solid fa-circle-check" style={{ color: "#22c55e", marginRight: "4px" }} />
                                Contract carried over (Season {cleanSeason(player.expireSeason)})
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="admin-btn-row" style={{ marginTop: "2rem" }}>
                    <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                      Confirm Bulk Transfer
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Tab 3: Release */}
        {activeTab === 'release' && (
          <div className="admin-card">
            <h2 className="admin-card-title"><i className="fa-solid fa-file-contract" /> Bulk Release Squad Players</h2>
            <form onSubmit={handleBulkRelease}>
              <div className="admin-form-grid" style={{ marginBottom: "1.5rem" }}>
                <div className="admin-form-group">
                  <label>Select Club</label>
                  <select className="admin-select" value={releaseClubId} onChange={(e) => setReleaseClubId(e.target.value)} required>
                    <option value="">-- Select Club --</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {releaseClubId && (
                <div style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#fff", margin: 0 }}>Squad Players</h3>
                    
                    {/* Search bar inside release tab */}
                    <input
                      type="text"
                      className="admin-input"
                      style={{ maxWidth: "250px", fontSize: "0.8rem", padding: "6px 12px" }}
                      placeholder="Search player name/position..."
                      value={releaseSearchTerm}
                      onChange={(e) => setReleaseSearchTerm(e.target.value)}
                    />
                  </div>

                  {loadingReleasePlayers ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                      <i className="fa-solid fa-spinner fa-spin" /> Loading squad players...
                    </div>
                  ) : filteredReleasePlayers.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      No players found matching your criteria.
                    </div>
                  ) : isMobile ? (
                    /* Mobile Card View */
                    <div className="release-mobile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                      {filteredReleasePlayers.map(p => {
                        const isChecked = selectedPlayerIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            style={{
                              background: isChecked ? "rgba(56, 189, 248, 0.05)" : "rgba(255, 255, 255, 0.02)",
                              border: isChecked ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid rgba(255, 255, 255, 0.06)",
                              borderRadius: "10px",
                              padding: "1rem",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                              transition: "all 0.2s ease"
                            }}
                            onClick={() => toggleRowSelection(p.id)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Handled by container click
                                style={{ width: "16px", height: "16px" }}
                              />
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                                  <img
                                    src={p.imagePath}
                                    alt=""
                                    style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                                    onError={(e) => { (e.target as any).src = '/assets/images/players/default.png' }}
                                  />
                                  <div>
                                    <strong style={{ color: "#fff", display: "block", fontSize: "0.9rem" }}>{p.name}</strong>
                                    <span className="badge-info" style={{ 
                                      background: `${getPositionColor(p.position)}18`, 
                                      color: getPositionColor(p.position), 
                                      borderColor: `${getPositionColor(p.position)}40`,
                                      fontSize: "0.7rem",
                                      padding: "1px 6px"
                                    }}>
                                      {p.position}
                                    </span>
                                  </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.5rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-secondary)" }}>Contract Terms:</span>
                                <span>{cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-secondary)" }}>Base Value:</span>
                                <span>{p.value} Coins</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-secondary)" }}>Est. Refund:</span>
                                <span style={{ color: "#22c55e", fontWeight: "bold" }}>{p.refundAmount} Coins</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Desktop Table View */
                    <div className="table-responsive">
                      <table className="admin-list-table" style={{ fontSize: "0.85rem" }}>
                        <thead>
                          <tr onClick={(e) => e.stopPropagation()}>
                            <th style={{ width: "40px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={filteredReleasePlayers.length > 0 && filteredReleasePlayers.every(p => selectedPlayerIds.includes(p.id))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const allIds = filteredReleasePlayers.map(p => p.id);
                                    setSelectedPlayerIds(prev => Array.from(new Set([...prev, ...allIds])));
                                  } else {
                                    const filteredIds = filteredReleasePlayers.map(p => p.id);
                                    setSelectedPlayerIds(prev => prev.filter(id => !filteredIds.includes(id)));
                                  }
                                }}
                              />
                            </th>
                            <th>Player</th>
                            <th>Position</th>
                            <th>Contract Terms</th>
                            <th style={{ textAlign: "right" }}>Base Value</th>
                            <th style={{ textAlign: "right" }}>Est. Refund</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReleasePlayers.map(p => {
                            const isChecked = selectedPlayerIds.includes(p.id);
                            return (
                              <tr
                                key={p.id}
                                style={{ background: isChecked ? "rgba(56, 189, 248, 0.03)" : "transparent", cursor: "pointer" }}
                                onClick={() => toggleRowSelection(p.id)}
                              >
                                <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleRowSelection(p.id)}
                                  />
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <img
                                      src={p.imagePath}
                                      alt=""
                                      style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }}
                                      onError={(e) => { (e.target as any).src = '/assets/images/players/default.png' }}
                                    />
                                    <strong>{p.name}</strong>
                                  </div>
                                </td>
                                <td>{p.position}</td>
                                <td>
                                  {cleanSeason(p.startSeason)}-{cleanSeason(p.expireSeason)}
                                </td>
                                <td style={{ textAlign: "right" }}>{p.value} Coins</td>
                                <td style={{ textAlign: "right", color: "#22c55e", fontWeight: "bold" }}>{p.refundAmount} Coins</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedPlayerIds.length > 0 && (
                    <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Selected <strong>{selectedPlayerIds.length}</strong> player(s) for release.
                    </div>
                  )}
                </div>
              )}

              <div className="admin-btn-row">
                <button
                  type="submit"
                  className="portal-btn btn-danger"
                  disabled={isPending || selectedPlayerIds.length === 0}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {isPending ? (
                    <><i className="fa-solid fa-spinner fa-spin" /> Releasing...</>
                  ) : (
                    <><i className="fa-solid fa-user-minus" /> Release Selected Player(s) ({selectedPlayerIds.length})</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Swap */}
        {activeTab === 'swap' && (
          <div className="admin-card">
            <h2 className="admin-card-title"><i className="fa-solid fa-rotate" /> Execute Player Swap Deal</h2>
            <form onSubmit={addSwapToQueue}>
              <div className="sub-card" style={{ marginBottom: "1rem" }}>
                <div className="sub-card-title">Club A Setup</div>
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>Club A</label>
                    <select className="admin-select" value={swapClubAId} onChange={(e) => setSwapClubAId(e.target.value)} required>
                      <option value="">-- Select Club --</option>
                      {clubs.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Swapped Player (from Club A)</label>
                    <select className="admin-select" value={swapPlayerAId} onChange={(e) => setSwapPlayerAId(e.target.value)} required>
                      <option value="">-- Select Player --</option>
                      {swapClubAPlayers.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="sub-card" style={{ marginBottom: "1rem" }}>
                <div className="sub-card-title">Club B Setup</div>
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>Club B</label>
                    <select className="admin-select" value={swapClubBId} onChange={(e) => setSwapClubBId(e.target.value)} required>
                      <option value="">-- Select Club --</option>
                      {clubs.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Swapped Player (from Club B)</label>
                    <select className="admin-select" value={swapPlayerBId} onChange={(e) => setSwapPlayerBId(e.target.value)} required>
                      <option value="">-- Select Player --</option>
                      {swapClubBPlayers.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {swapPlayerAId && swapPlayerBId && (() => {
                const playerAObj = swapClubAPlayers.find(p => p.id.toString() === swapPlayerAId);
                const playerBObj = swapClubBPlayers.find(p => p.id.toString() === swapPlayerBId);
                if (!playerAObj || !playerBObj) return null;
                const valA = Number(playerAObj.signedValue) || 0;
                const valB = Number(playerBObj.signedValue) || 0;
                const swapValue = Math.max(valA, valB);
                return (
                  <div className="sub-card" style={{ marginBottom: "1rem" }}>
                    <div className="sub-card-title">Value & Contract Summary</div>
                    <div style={{ padding: "10px", background: "rgba(0, 102, 255, 0.05)", border: "1px solid rgba(0, 102, 255, 0.2)", borderRadius: "8px", fontSize: "0.85rem" }}>
                      <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>
                        Highest value in deal: <strong>{swapValue} Coins</strong> ({valB >= valA ? `${playerBObj.name}: ${valB}` : `${playerAObj.name}: ${valA}`})
                      </div>
                      <div style={{ color: "#fff" }}>
                        Both players' new contract values will be set to: <strong style={{ color: "#22c55e" }}>{swapValue} Coins</strong>
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

        {/* Tab 4: Season Transition Contract Releases */}
        {activeTab === 'window' && (
          <div className="admin-card">
            <h2 className="admin-card-title"><i className="fa-solid fa-calendar-minus" /> Batch Contract Release Controls</h2>
            <div className="admin-empty" style={{ padding: "2rem", textAlign: "left", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h3><i className="fa-solid fa-calendar-day" /> Release Season-End Contracts</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                  Triggers releases for contracts whose expiration is set to <strong>Season {activeSeason?.season_number || ""}</strong>.
                </p>
                <button className="portal-btn btn-danger" style={{ marginTop: "0.75rem" }} onClick={triggerSeasonStartReleases} disabled={isPending}>
                  Release Season {activeSeason?.season_number || ""} Start Contracts
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
