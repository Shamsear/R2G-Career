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
  releaseMidSeasonContracts,
  releasePlayerContract,
  fetchClubPlayersWithContracts,
  fetchPlayersToBeReleased
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
    const lines = [`ðŸ”´ *${title}*`, ""];
    let lastClub = "";
    for (const p of players) {
      if (p.club_name !== lastClub) {
        if (lastClub !== "") lines.push("");
        lines.push(`ðŸŸï¸ *${p.club_name || "Free Agent"}*`);
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

  const toggleRowSelection = (playerId: number) => {
    setSelectedPlayerIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

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
    showToast(`${sellSelectedPlayer.name} â†’ ${buyingClub?.name} added to queue!`);
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
        await executeBulkTransfers(payload);
        showToast("All transfers executed successfully!");
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
    if (!confirm(`Are you sure you want to release all ${bulkReleases.length} queued player(s)?`)) return;

    startTransition(async () => {
      try {
        let count = 0;
        for (const item of bulkReleases) {
          await releasePlayerContract(
            item.playerId,
            activeSeason.id,
            releaseTiming
          );
          count++;
        }
        showToast(`Successfully released ${count} player(s)!`);
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
        </div>

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
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "8px" }}>
                            {winningClubId && (() => {
                              const c = clubs.find(c => c.id.toString() === winningClubId);
                              return c?.image
                                ? <img src={c.image} alt="" style={{ width: "18px", height: "18px", objectFit: "contain", borderRadius: "2px", flexShrink: 0 }} />
                                : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />;
                            })()}
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
                                    {c.image
                                      ? <img src={c.image} alt="" style={{ width: "22px", height: "22px", objectFit: "contain", borderRadius: "3px", flexShrink: 0 }} />
                                      : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: winningClubId === c.id.toString() ? "#0066ff" : "rgba(255,255,255,0.3)", flexShrink: 0 }} />}
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
                            onClick={() => setSelectedPlayerId(p.id.toString())}
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
                                <strong style={{ color: "#fff", display: "block", fontSize: "0.9rem", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{p.name}</strong>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "3px" }}>
                                  <span style={{ background: `${getPositionColor(p.position)}18`, color: getPositionColor(p.position), border: `1px solid ${getPositionColor(p.position)}40`, borderRadius: "4px", fontSize: "0.65rem", padding: "1px 5px", fontWeight: 700 }}>{p.position}</span>
                                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>{p.star.replace("-", " ")}</span>
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

            {/* â”€â”€ Selling Club â”€â”€ */}
            <div className="sub-card" style={{ marginBottom: "1rem", overflow: "visible" }}>
              <div className="sub-card-title">Selling Club</div>
              <div className="admin-form-group" style={{ position: "relative" }} data-sell-club-dd="true">
                <label>Select Club to Sell From</label>
                <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", background: "rgba(255,255,255,0.04)", cursor: "pointer", padding: "9px 12px", fontSize: "0.85rem", color: sellClubId ? "#fff" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", userSelect: "none" }}
                  onClick={() => setSellClubDDOpen(p => !p)}>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sellClubId && (() => { const c = clubs.find(c => c.id.toString() === sellClubId); return c?.image ? <img src={c.image} alt="" style={{ width: "18px", height: "18px", objectFit: "contain", borderRadius: "2px", flexShrink: 0 }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }} />; })()}
                    {sellClubId ? (clubs.find(c => c.id.toString() === sellClubId)?.name ?? "-- Select Club --") : "-- Select Club --"}
                  </span>
                  <i className={`fa-solid fa-chevron-${sellClubDDOpen ? "up" : "down"}`} style={{ fontSize: "0.7rem", opacity: 0.6, flexShrink: 0 }} />
                </div>
                {sellClubDDOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", overflow: "hidden", marginTop: "4px" }}>
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <input autoFocus type="text" placeholder="Search club..." value={sellClubDDSearch} onChange={e => setSellClubDDSearch(e.target.value)} onClick={e => e.stopPropagation()} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "6px 10px", fontSize: "0.8rem", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                      {clubs.filter(c => sellClubDDSearch === "" || c.name.toLowerCase().includes(sellClubDDSearch.toLowerCase())).map(c => (
                        <div key={c.id} onClick={e => { e.stopPropagation(); setSellClubId(c.id.toString()); setSellClubDDOpen(false); setSellClubDDSearch(""); setSellSelectedPlayer(null); setSellBuyingClubId(""); }}
                          style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: sellClubId === c.id.toString() ? "rgba(0,102,255,0.12)" : "transparent", borderLeft: sellClubId === c.id.toString() ? "3px solid #0066ff" : "3px solid transparent", fontSize: "0.85rem", color: sellClubId === c.id.toString() ? "#0066ff" : "#fff", transition: "background 0.12s" }}
                          onMouseEnter={e => { if (sellClubId !== c.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                          onMouseLeave={e => { if (sellClubId !== c.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                          {c.image ? <img src={c.image} alt="" style={{ width: "22px", height: "22px", objectFit: "contain", borderRadius: "3px", flexShrink: 0 }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />}
                          {c.name}
                        </div>
                      ))}
                      {clubs.filter(c => sellClubDDSearch === "" || c.name.toLowerCase().includes(sellClubDDSearch.toLowerCase())).length === 0 && <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>No clubs found</div>}
                    </div>
                  </div>
                )}
              </div>

              {/* Player table -- appears after club selected */}
              {sellClubId && (
                sellSelectedPlayer ? (
                  // Selected player chip
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", background: "rgba(0,102,255,0.08)", border: "1.5px solid rgba(0,102,255,0.3)", borderRadius: "10px", padding: "10px 14px" }}>
                    <img src={sellSelectedPlayer.imagePath} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ color: "#fff", display: "block", fontSize: "0.9rem" }}>{sellSelectedPlayer.name}</strong>
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
                              {sellClubPlayers.filter(p => sellSearchTerm === "" || p.name.toLowerCase().includes(sellSearchTerm.toLowerCase()) || p.position.toLowerCase().includes(sellSearchTerm.toLowerCase())).map(p => (
                                <tr key={p.id} onClick={() => { setSellSelectedPlayer(p); setSellPrice(Number(p.signedValue) || 80); setSellSearchTerm(""); }} style={{ cursor: "pointer", borderLeft: "3px solid transparent", transition: "background 0.12s" }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                  <td><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><img src={p.imagePath} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as any).src = '/assets/images/players/default.png'; }} /><strong style={{ color: "#fff" }}>{p.name}</strong></div></td>
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

            {/* â”€â”€ Deal Builder (shows only when player is selected) â”€â”€ */}
            {sellSelectedPlayer && (
              <div className="sub-card" style={{ marginBottom: "1rem", overflow: "visible" }}>
                <div className="sub-card-title">Buying Club &amp; Price</div>

                {/* Buying Club Dropdown */}
                <div className="admin-form-group" style={{ position: "relative", marginBottom: "1rem" }} data-sell-buying-dd="true">
                  <label>Buying Club</label>
                  <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", background: "rgba(255,255,255,0.04)", cursor: "pointer", padding: "9px 12px", fontSize: "0.85rem", color: sellBuyingClubId ? "#fff" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", userSelect: "none" }}
                    onClick={() => setSellBuyingDDOpen(p => !p)}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sellBuyingClubId && (() => { const c = clubs.find(c => c.id.toString() === sellBuyingClubId); return c?.image ? <img src={c.image} alt="" style={{ width: "18px", height: "18px", objectFit: "contain", borderRadius: "2px", flexShrink: 0 }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }} />; })()}
                      {sellBuyingClubId ? (clubs.find(c => c.id.toString() === sellBuyingClubId)?.name ?? "-- Select Buying Club --") : "-- Select Buying Club --"}
                    </span>
                    <i className={`fa-solid fa-chevron-${sellBuyingDDOpen ? "up" : "down"}`} style={{ fontSize: "0.7rem", opacity: 0.6, flexShrink: 0 }} />
                  </div>
                  {sellBuyingDDOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", overflow: "hidden", marginTop: "4px" }}>
                      <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        <input autoFocus type="text" placeholder="Search club..." value={sellBuyingDDSearch} onChange={e => setSellBuyingDDSearch(e.target.value)} onClick={e => e.stopPropagation()} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "6px 10px", fontSize: "0.8rem", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {clubs.filter(c => c.id.toString() !== sellClubId && (sellBuyingDDSearch === "" || c.name.toLowerCase().includes(sellBuyingDDSearch.toLowerCase()))).map(c => (
                          <div key={c.id} onClick={e => { e.stopPropagation(); setSellBuyingClubId(c.id.toString()); setSellBuyingDDOpen(false); setSellBuyingDDSearch(""); }}
                            style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: sellBuyingClubId === c.id.toString() ? "rgba(0,102,255,0.12)" : "transparent", borderLeft: sellBuyingClubId === c.id.toString() ? "3px solid #0066ff" : "3px solid transparent", fontSize: "0.85rem", color: sellBuyingClubId === c.id.toString() ? "#0066ff" : "#fff", transition: "background 0.12s" }}
                            onMouseEnter={e => { if (sellBuyingClubId !== c.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                            onMouseLeave={e => { if (sellBuyingClubId !== c.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                            {c.image ? <img src={c.image} alt="" style={{ width: "22px", height: "22px", objectFit: "contain", borderRadius: "3px", flexShrink: 0 }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />}
                            {c.name}
                          </div>
                        ))}
                        {clubs.filter(c => c.id.toString() !== sellClubId && (sellBuyingDDSearch === "" || c.name.toLowerCase().includes(sellBuyingDDSearch.toLowerCase()))).length === 0 && <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>No clubs found</div>}
                      </div>
                    </div>
                  )}
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
                        Contract carried over Â· expires Season {cleanSeason(sellSelectedPlayer.expireSeason)}
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

            {/* â”€â”€ Transfer Queue â”€â”€ */}
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
                          <span style={{ marginLeft: "10px" }}>Â·</span>
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

                <div style={{ flex: 1.5, minWidth: "220px", position: "relative" }} data-release-club-dd="true">
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Select Club</label>
                  <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", background: "rgba(255,255,255,0.04)", cursor: "pointer", padding: "9px 12px", fontSize: "0.85rem", color: releaseClubId ? "#fff" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", userSelect: "none" }}
                    onClick={() => setReleaseClubDDOpen(p => !p)}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {releaseClubId && (() => { const c = clubs.find(c => c.id.toString() === releaseClubId); return c?.image ? <img src={c.image} alt="" style={{ width: "18px", height: "18px", objectFit: "contain", borderRadius: "2px", flexShrink: 0 }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }} />; })()}
                      {releaseClubId ? (clubs.find(c => c.id.toString() === releaseClubId)?.name ?? "-- Select Club --") : "-- Select Club --"}
                    </span>
                    <i className={`fa-solid fa-chevron-${releaseClubDDOpen ? "up" : "down"}`} style={{ fontSize: "0.7rem", opacity: 0.6, flexShrink: 0 }} />
                  </div>
                  {releaseClubDDOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", overflow: "hidden", marginTop: "4px" }}>
                      <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        <input autoFocus type="text" placeholder="Search club..." value={releaseClubDDSearch} onChange={e => setReleaseClubDDSearch(e.target.value)} onClick={e => e.stopPropagation()} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "6px 10px", fontSize: "0.8rem", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {clubs.filter(c => releaseClubDDSearch === "" || c.name.toLowerCase().includes(releaseClubDDSearch.toLowerCase())).map(c => (
                          <div key={c.id} onClick={e => { e.stopPropagation(); setReleaseClubId(c.id.toString()); setReleaseClubDDOpen(false); setReleaseClubDDSearch(""); setReleaseSelectedPlayer(null); }}
                            style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: releaseClubId === c.id.toString() ? "rgba(0,102,255,0.12)" : "transparent", borderLeft: releaseClubId === c.id.toString() ? "3px solid #0066ff" : "3px solid transparent", fontSize: "0.85rem", color: releaseClubId === c.id.toString() ? "#0066ff" : "#fff", transition: "background 0.12s" }}
                            onMouseEnter={e => { if (releaseClubId !== c.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                            onMouseLeave={e => { if (releaseClubId !== c.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                            {c.image ? <img src={c.image} alt="" style={{ width: "22px", height: "22px", objectFit: "contain", borderRadius: "3px", flexShrink: 0 }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />}
                            {c.name}
                          </div>
                        ))}
                        {clubs.filter(c => releaseClubDDSearch === "" || c.name.toLowerCase().includes(releaseClubDDSearch.toLowerCase())).length === 0 && <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>No clubs found</div>}
                      </div>
                    </div>
                  )}
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
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Contract:</span><span style={{ color: "#fff" }}>{cleanSeason(p.startSeason)}–{cleanSeason(p.expireSeason)}</span></div>
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
                                    <td style={{ color: "var(--text-secondary)" }}>{cleanSeason(p.startSeason)}–{cleanSeason(p.expireSeason)}</td>
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
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff", marginBottom: "1.25rem" }}>
                  Queued Releases ({bulkReleases.length})
                </h3>
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
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          Est. Refund: <strong style={{ color: "#ef4444" }}>{r.refundAmount} Coins</strong>
                          <span style={{ marginLeft: "10px" }}>·</span>
                          <span style={{ marginLeft: "10px" }}>Contract expires Season {cleanSeason(r.expireSeason)}</span>
                        </div>
                      </div>
                      <button type="button" className="portal-btn btn-secondary" style={{ padding: "4px 10px", fontSize: "0.8rem", color: "#ef4444", borderColor: "#ef4444", flexShrink: 0 }}
                        onClick={() => setBulkReleases(prev => prev.filter((_, i) => i !== idx))}>
                        <i className="fa-solid fa-trash" /> Remove
                      </button>
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
                <div className="admin-form-group" style={{ position: "relative" }} data-swapa-club-dd="true">
                  <label>Club A</label>
                  <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", background: "rgba(255,255,255,0.04)", cursor: "pointer", padding: "9px 12px", fontSize: "0.85rem", color: swapClubAId ? "#fff" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", userSelect: "none" }}
                    onClick={() => setSwapAClubDDOpen(p => !p)}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {swapClubAId && (() => { const c = clubs.find(c => c.id.toString() === swapClubAId); return c?.image ? <img src={c.image} alt="" style={{ width: "18px", height: "18px", objectFit: "contain", borderRadius: "2px", flexShrink: 0 }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }} />; })()}
                      {swapClubAId ? (clubs.find(c => c.id.toString() === swapClubAId)?.name ?? "-- Select Club --") : "-- Select Club --"}
                    </span>
                    <i className={`fa-solid fa-chevron-${swapAClubDDOpen ? "up" : "down"}`} style={{ fontSize: "0.7rem", opacity: 0.6, flexShrink: 0 }} />
                  </div>
                  {swapAClubDDOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", overflow: "hidden", marginTop: "4px" }}>
                      <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        <input autoFocus type="text" placeholder="Search club..." value={swapAClubDDSearch} onChange={e => setSwapAClubDDSearch(e.target.value)} onClick={e => e.stopPropagation()} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "6px 10px", fontSize: "0.8rem", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                        {clubs.filter(c => c.id.toString() !== swapClubBId && (swapAClubDDSearch === "" || c.name.toLowerCase().includes(swapAClubDDSearch.toLowerCase()))).map(c => (
                          <div key={c.id} onClick={e => { e.stopPropagation(); setSwapClubAId(c.id.toString()); setSwapAClubDDOpen(false); setSwapAClubDDSearch(""); }}
                            style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: swapClubAId === c.id.toString() ? "rgba(0,102,255,0.12)" : "transparent", borderLeft: swapClubAId === c.id.toString() ? "3px solid #0066ff" : "3px solid transparent", fontSize: "0.85rem", color: swapClubAId === c.id.toString() ? "#0066ff" : "#fff", transition: "background 0.12s" }}
                            onMouseEnter={e => { if (swapClubAId !== c.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                            onMouseLeave={e => { if (swapClubAId !== c.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                            {c.image ? <img src={c.image} alt="" style={{ width: "22px", height: "22px", objectFit: "contain", borderRadius: "3px", flexShrink: 0 }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />}
                            {c.name}
                          </div>
                        ))}
                        {clubs.filter(c => c.id.toString() !== swapClubBId && (swapAClubDDSearch === "" || c.name.toLowerCase().includes(swapAClubDDSearch.toLowerCase()))).length === 0 && <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>No clubs found</div>}
                      </div>
                    </div>
                  )}
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
                <div className="admin-form-group" style={{ position: "relative" }} data-swapb-club-dd="true">
                  <label>Club B</label>
                  <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", background: "rgba(255,255,255,0.04)", cursor: "pointer", padding: "9px 12px", fontSize: "0.85rem", color: swapClubBId ? "#fff" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", userSelect: "none" }}
                    onClick={() => setSwapBClubDDOpen(p => !p)}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {swapClubBId && (() => { const c = clubs.find(c => c.id.toString() === swapClubBId); return c?.image ? <img src={c.image} alt="" style={{ width: "18px", height: "18px", objectFit: "contain", borderRadius: "2px", flexShrink: 0 }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }} />; })()}
                      {swapClubBId ? (clubs.find(c => c.id.toString() === swapClubBId)?.name ?? "-- Select Club --") : "-- Select Club --"}
                    </span>
                    <i className={`fa-solid fa-chevron-${swapBClubDDOpen ? "up" : "down"}`} style={{ fontSize: "0.7rem", opacity: 0.6, flexShrink: 0 }} />
                  </div>
                  {swapBClubDDOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", overflow: "hidden", marginTop: "4px" }}>
                      <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        <input autoFocus type="text" placeholder="Search club..." value={swapBClubDDSearch} onChange={e => setSwapBClubDDSearch(e.target.value)} onClick={e => e.stopPropagation()} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "6px 10px", fontSize: "0.8rem", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                        {clubs.filter(c => c.id.toString() !== swapClubAId && (swapBClubDDSearch === "" || c.name.toLowerCase().includes(swapBClubDDSearch.toLowerCase()))).map(c => (
                          <div key={c.id} onClick={e => { e.stopPropagation(); setSwapClubBId(c.id.toString()); setSwapBClubDDOpen(false); setSwapBClubDDSearch(""); }}
                            style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: swapClubBId === c.id.toString() ? "rgba(0,102,255,0.12)" : "transparent", borderLeft: swapClubBId === c.id.toString() ? "3px solid #0066ff" : "3px solid transparent", fontSize: "0.85rem", color: swapClubBId === c.id.toString() ? "#0066ff" : "#fff", transition: "background 0.12s" }}
                            onMouseEnter={e => { if (swapClubBId !== c.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                            onMouseLeave={e => { if (swapClubBId !== c.id.toString()) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                            {c.image ? <img src={c.image} alt="" style={{ width: "22px", height: "22px", objectFit: "contain", borderRadius: "3px", flexShrink: 0 }} /> : <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />}
                            {c.name}
                          </div>
                        ))}
                        {clubs.filter(c => c.id.toString() !== swapClubAId && (swapBClubDDSearch === "" || c.name.toLowerCase().includes(swapBClubDDSearch.toLowerCase()))).length === 0 && <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>No clubs found</div>}
                      </div>
                    </div>
                  )}
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
                    <strong style={{ color: "#fbbf24" }}>{batchPreviewPlayers.filter(p => p.contract_type === 'start').length}</strong> start &nbsp;Â·&nbsp;
                    <strong style={{ color: "#60a5fa" }}>{batchPreviewPlayers.filter(p => p.contract_type === 'mid').length}</strong> mid-season contracts expiring
                  </span>
                )}
              </div>

              {/* â”€â”€ Season Start Sub-section â”€â”€ */}
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

              {/* â”€â”€ Mid-Season Sub-section â”€â”€ */}
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

      </div>
    </div>
  );
}
