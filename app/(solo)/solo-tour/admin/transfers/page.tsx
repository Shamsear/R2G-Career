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
  executeTransferSale,
  executeBulkTransfers,
  executeTransferSwap,
  executeBulkSwaps,
  releaseExpiredContractsForSeason,
  releaseMidSeasonContracts,
  fetchActivePlayerContract,
  releasePlayerContract,
  fetchClubPlayersWithContracts
} from "@/utils/solo/serverActions";

export default function TransfersManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [freeAgents, setFreeAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"buy" | "sell" | "release" | "swap" | "window">("buy");
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Buy state
  const [buyClubId, setBuyClubId] = useState<string>("");
  const [buyPlayerId, setBuyPlayerId] = useState<string>("");
  const [buyPrice, setBuyPrice] = useState<number>(80);
  const [buyExpireSeason, setBuyExpireSeason] = useState<string>("");

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
  const [refundPercentage, setRefundPercentage] = useState<number>(75);
  const [loadingReleasePlayers, setLoadingReleasePlayers] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Swap state
  const [swapClubAId, setSwapClubAId] = useState<string>("");
  const [swapClubBId, setSwapClubBId] = useState<string>("");
  const [swapClubAPlayers, setSwapClubAPlayers] = useState<any[]>([]);
  const [swapClubBPlayers, setSwapClubBPlayers] = useState<any[]>([]);
  const [swapPlayerAId, setSwapPlayerAId] = useState<string>("");
  const [swapPlayerBId, setSwapPlayerBId] = useState<string>("");
  const [swapAdjustmentAtoB, setSwapAdjustmentAtoB] = useState<number>(0);
  const [swapNewValueA, setSwapNewValueA] = useState<number>(80);
  const [swapNewValueB, setSwapNewValueB] = useState<number>(80);
  const [bulkSwaps, setBulkSwaps] = useState<any[]>([]);

  const cleanSeason = (s: string) => s.replace(/[^\d.]/g, '');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const season = await fetchActiveSeason();
      setActiveSeason(season);

      const clubsData = await fetchRegisteredClubs();
      setClubs(clubsData || []);

      const agents = await fetchFreeAgents();
      setFreeAgents(agents || []);

      if (season) {
        setBuyExpireSeason((season.season_number + 1).toString());
      }
    } catch {
      showToast("Error loading transfers data!");
    }
  };

  useEffect(() => {
    loadData();
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch players for sell tab
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
          showToast("Error loading club players");
          setLoadingSellPlayers(false);
        });
    } else {
      setSellClubPlayers([]);
      setSelectedSellPlayerIds([]);
      setTransferTargets({});
    }
  }, [sellClubId, activeSeason]);

  const filteredSellPlayers = useMemo(() => {
    return sellClubPlayers.filter(p => 
      p.name.toLowerCase().includes(sellSearchTerm.toLowerCase()) ||
      p.position.toLowerCase().includes(sellSearchTerm.toLowerCase())
    );
  }, [sellClubPlayers, sellSearchTerm]);

  // Fetch players with contracts for release tab
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

  // Roster filtering via search input
  const filteredReleasePlayers = useMemo(() => {
    return releasePlayersWithRefunds.filter(p => 
      p.name.toLowerCase().includes(releaseSearchTerm.toLowerCase()) ||
      p.position.toLowerCase().includes(releaseSearchTerm.toLowerCase())
    );
  }, [releasePlayersWithRefunds, releaseSearchTerm]);

  // Fetch players for swap tab
  useEffect(() => {
    if (swapClubAId) {
      fetchClubPlayers(swapClubAId).then(setSwapClubAPlayers).catch(() => showToast("Error loading Club A players"));
    } else {
      setSwapClubAPlayers([]);
    }
  }, [swapClubAId]);

  useEffect(() => {
    if (swapClubBId) {
      fetchClubPlayers(swapClubBId).then(setSwapClubBPlayers).catch(() => showToast("Error loading Club B players"));
    } else {
      setSwapClubBPlayers([]);
    }
  }, [swapClubBId]);

  const handleBuy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyClubId || !buyPlayerId || buyPrice <= 0 || !buyExpireSeason) {
      return showToast("Please fill in all buy options correctly!");
    }
    startTransition(async () => {
      try {
        await executeTransferBuy(
          parseInt(buyClubId),
          parseInt(buyPlayerId),
          buyPrice,
          buyExpireSeason
        );
        showToast("Player bought successfully!");
        setBuyPlayerId("");
        loadData();
      } catch (err: any) {
        showToast(`Transaction failed: ${err.message || "Insufficient balance"}`);
      }
    });
  };

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
        // Re-load data
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
        const defaultValue = playerObj ? Number(playerObj.signedValue) || 40 : 40;
        setTransferTargets(prevTargets => ({
          ...prevTargets,
          [playerId]: { buyingClubId: "", price: defaultValue }
        }));
        return [...prev, playerId];
      }
    });
  };

  const getPositionColor = (pos: string) => {
    const colors: Record<string, string> = {
      GK: "#eab308", CB: "#3b82f6", LB: "#3b82f6", RB: "#3b82f6",
      CM: "#10b981", DM: "#14b8a6", AM: "#a855f7",
      RW: "#f97316", LW: "#f97316", ST: "#ef4444", FW: "#ef4444"
    };
    return colors[pos] || "#6b7280";
  };

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
      newValueA: swapNewValueA,
      newValueB: swapNewValueB
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
    setSwapNewValueA(80);
    setSwapNewValueB(80);
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
          cashAdjustmentAtoB: s.cashAdjustmentAtoB,
          newValueA: s.newValueA,
          newValueB: s.newValueB
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

  const triggerMidSeasonReleases = () => {
    if (!activeSeason) return;
    if (!confirm(`Release all contracts ending at mid of Season ${activeSeason.season_number}?`)) return;
    startTransition(async () => {
      try {
        const res = await releaseMidSeasonContracts(activeSeason.season_number);
        showToast(`Released ${res.releasedCount} players whose mid-season contracts expired.`);
        loadData();
      } catch {
        showToast("Error triggering mid-season releases!");
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
          <div className="portal-page-badge"><i className="fa-solid fa-arrow-right-arrow-left" /> Transfer Window</div>
          <h1 className="portal-title">TRANSFER WINDOW</h1>
          <p className="portal-subtitle">
            Transfer players between squads via purchase, sale, or swap. Process seasonal contract releases.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="tab-menu" style={{ display: "flex", gap: "10px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <button className={`portal-btn ${activeTab === 'buy' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('buy')}>
            <i className="fa-solid fa-cart-shopping" /> Buy Free Agent
          </button>
          <button className={`portal-btn ${activeTab === 'sell' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('sell')}>
            <i className="fa-solid fa-shuffle" /> Transfer Squad Player
          </button>
          <button className={`portal-btn ${activeTab === 'release' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('release')}>
            <i className="fa-solid fa-file-contract" /> Release Squad Player
          </button>
          <button className={`portal-btn ${activeTab === 'swap' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('swap')}>
            <i className="fa-solid fa-rotate" /> Swap Deal
          </button>
          <button className={`portal-btn ${activeTab === 'window' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('window')}>
            <i className="fa-solid fa-calendar-minus" /> Season Releases
          </button>
        </div>

        {/* Tab 1: Buy */}
        {activeTab === 'buy' && (
          <div className="admin-card">
            <h2 className="admin-card-title"><i className="fa-solid fa-cart-shopping" /> Sign Free Agent to Squad</h2>
            <form onSubmit={handleBuy}>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Select Buying Club</label>
                  <select className="admin-select" value={buyClubId} onChange={(e) => setBuyClubId(e.target.value)} required>
                    <option value="">-- Select Club --</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Select Free Agent</label>
                  <select className="admin-select" value={buyPlayerId} onChange={(e) => setBuyPlayerId(e.target.value)} required>
                    <option value="">-- Select Player --</option>
                    {freeAgents.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.position} - {p.star.replace("-", " ")})</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Signed Value / Buy Price (Coins)</label>
                  <input type="number" className="admin-input" value={buyPrice} onChange={(e) => setBuyPrice(parseInt(e.target.value) || 0)} required />
                </div>
                <div className="admin-form-group">
                  <label>Contract Expiration Season</label>
                  <select className="admin-select" value={buyExpireSeason} onChange={(e) => setBuyExpireSeason(e.target.value)} required>
                    {activeSeason && (
                      <>
                        <option value={activeSeason.season_number.toString()}>Start of Season {activeSeason.season_number}</option>
                        <option value={(activeSeason.season_number + 0.5).toString()}>Mid of Season {activeSeason.season_number}</option>
                        <option value={(activeSeason.season_number + 1).toString()}>Start of Season {activeSeason.season_number + 1}</option>
                        <option value={(activeSeason.season_number + 1.5).toString()}>Mid of Season {activeSeason.season_number + 1}</option>
                        <option value={(activeSeason.season_number + 2).toString()}>Start of Season {activeSeason.season_number + 2}</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="admin-btn-row" style={{ marginTop: "1rem" }}>
                <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                  Confirm Purchase & Sign
                </button>
              </div>
            </form>
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
                                          updated[p.id] = { buyingClubId: "", price: Number(p.signedValue) || 40 };
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

                      const target = transferTargets[playerId] || { buyingClubId: "", price: 40 };

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

        {/* Tab 2.5: Release */}
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

        {/* Tab 3: Swap */}
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
                  <div className="admin-form-group">
                    <label>New Value for Player A at Club B (Coins)</label>
                    <input type="number" className="admin-input" value={swapNewValueA} onChange={(e) => setSwapNewValueA(parseInt(e.target.value) || 0)} required />
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
                  <div className="admin-form-group">
                    <label>New Value for Player B at Club A (Coins)</label>
                    <input type="number" className="admin-input" value={swapNewValueB} onChange={(e) => setSwapNewValueB(parseInt(e.target.value) || 0)} required />
                  </div>
                </div>
              </div>

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
                          Val A: <strong>{deal.newValueA} Coins</strong> | Val B: <strong>{deal.newValueB} Coins</strong>
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

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem" }}>
                <h3><i className="fa-solid fa-calendar-week" /> Release Mid-Season Contracts</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                  Triggers releases for contracts whose expiration is set to <strong>Season {activeSeason?.season_number || ""}.5</strong>.
                </p>
                <button className="portal-btn btn-danger" style={{ marginTop: "0.75rem" }} onClick={triggerMidSeasonReleases} disabled={isPending}>
                  Release Season {activeSeason?.season_number || ""}.5 Mid-Season Contracts
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
