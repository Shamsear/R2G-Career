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
  transferPlayerPrime,
  removePlayerPrime,
  updatePlayerPrimeValidity,
  formatPrimeValidity,
  parsePrimeDurationInfo,
  fetchPrimedPlayersList,
  fetchPrimeFeeConfig,
  updatePrimeFeeConfig,
  type PrimeFeeConfig
} from "@/utils/solo/serverActions";

export default function AdminPrimeManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [primedPlayers, setPrimedPlayers] = useState<any[]>([]);

  // Configurable Fee State
  const [feeConfig, setFeeConfig] = useState<PrimeFeeConfig>({
    upgradeRtCost: 50,
    upgradeRcCost: 0,
    transferRtCost: 50,
    transferRcCost: 0
  });
  const [configUpgradeRt, setConfigUpgradeRt] = useState<number>(50);
  const [configTransferRt, setConfigTransferRt] = useState<number>(50);
  const [isSavingFees, setIsSavingFees] = useState<boolean>(false);

  // Active Primed Players Table Search, Filter & Pagination
  const [primedSearch, setPrimedSearch] = useState<string>("");
  const [primedClubFilter, setPrimedClubFilter] = useState<string>("all");
  const [primedDurationFilter, setPrimedDurationFilter] = useState<string>("all");
  const [primedPage, setPrimedPage] = useState<number>(1);
  const [primedPageSize, setPrimedPageSize] = useState<number>(10);

  // Unprimed Players Checklist Pagination (Assign Mode)
  const [checklistPage, setChecklistPage] = useState<number>(1);
  const checklistPageSize = 12;

  // Mode: Assign new Prime vs Transfer existing Prime
  const [activeMode, setActiveMode] = useState<"assign" | "transfer">("assign");

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

  // Assign Mode State
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [playerSearch, setPlayerSearch] = useState<string>("");
  const [rtCost, setRtCost] = useState<number>(50);
  const [assignValidity, setAssignValidity] = useState<string>("1.0");
  const [assignCustomValidity, setAssignCustomValidity] = useState<string>("");

  // Transfer Mode State
  const [transferSourcePlayerId, setTransferSourcePlayerId] = useState<string>("");
  const [transferDestPlayerId, setTransferDestPlayerId] = useState<string>("");
  const [transferRtCost, setTransferRtCost] = useState<number>(50);
  const [transferValidity, setTransferValidity] = useState<string>("keep");
  const [transferCustomValidity, setTransferCustomValidity] = useState<string>("");

  // Edit Validity Modal State
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);
  const [editValidity, setEditValidity] = useState<string>("1.0");
  const [editCustomValidity, setEditCustomValidity] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

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
      const [season, clubsData, playersData, primedData, primeFees] = await Promise.all([
        fetchActiveSeason(),
        fetchRegisteredClubs(),
        fetchAdminPlayersList(),
        fetchPrimedPlayersList(),
        fetchPrimeFeeConfig()
      ]);

      setActiveSeason(season);
      setClubs(clubsData || []);
      setAllPlayers(playersData || []);
      setPrimedPlayers(primedData || []);
      if (primeFees) {
        setFeeConfig(primeFees);
        setConfigUpgradeRt(primeFees.upgradeRtCost);
        setConfigTransferRt(primeFees.transferRtCost);
        setRtCost(primeFees.upgradeRtCost);
        setTransferRtCost(primeFees.transferRtCost);
      }
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

  // Reset checklist page on search / club change
  useEffect(() => {
    setChecklistPage(1);
  }, [playerSearch, selectedClubId]);

  const totalChecklistPages = Math.ceil(filteredPlayers.length / checklistPageSize) || 1;
  const paginatedChecklistPlayers = useMemo(() => {
    const start = (checklistPage - 1) * checklistPageSize;
    return filteredPlayers.slice(start, start + checklistPageSize);
  }, [filteredPlayers, checklistPage, checklistPageSize]);

  // Filter primed players by search, club, and duration preset
  const filteredPrimedPlayers = useMemo(() => {
    return primedPlayers.filter((p) => {
      // Club filter
      if (primedClubFilter !== "all") {
        if (String(p.clubId) !== primedClubFilter && p.clubName !== primedClubFilter) {
          return false;
        }
      }

      // Duration preset filter
      if (primedDurationFilter !== "all") {
        const dur = (p.durationLabel || p.validUntil || "").toLowerCase();
        if (primedDurationFilter === "half" && !dur.includes("0.5") && !dur.includes("half")) return false;
        if (primedDurationFilter === "1" && !dur.includes("1 season") && !dur.includes("1.0")) return false;
        if (primedDurationFilter === "2+" && !dur.includes("2") && !dur.includes("3")) return false;
        if (primedDurationFilter === "permanent" && !dur.includes("permanent")) return false;
      }

      // Search text
      if (primedSearch.trim()) {
        const q = primedSearch.toLowerCase().trim();
        const matchName = (p.name || "").toLowerCase().includes(q);
        const matchClub = (p.clubName || "").toLowerCase().includes(q);
        const matchPos = (p.position || "").toLowerCase().includes(q);
        const matchDur = (p.durationLabel || p.validUntil || "").toLowerCase().includes(q);
        const matchExp = (p.expiryLabel || "").toLowerCase().includes(q);
        return matchName || matchClub || matchPos || matchDur || matchExp;
      }

      return true;
    });
  }, [primedPlayers, primedClubFilter, primedDurationFilter, primedSearch]);

  // Reset primed page to 1 on filter changes
  useEffect(() => {
    setPrimedPage(1);
  }, [primedSearch, primedClubFilter, primedDurationFilter, primedPageSize]);

  const totalPrimedPages = primedPageSize === -1 ? 1 : Math.ceil(filteredPrimedPlayers.length / primedPageSize) || 1;
  const paginatedPrimedPlayers = useMemo(() => {
    if (primedPageSize === -1) return filteredPrimedPlayers;
    const start = (primedPage - 1) * primedPageSize;
    return filteredPrimedPlayers.slice(start, start + primedPageSize);
  }, [filteredPrimedPlayers, primedPage, primedPageSize]);

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
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 8px",
            borderRadius: "6px",
            background: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
            fontSize: "0.74rem",
            fontWeight: 700,
            fontFamily: "var(--font-display)",
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
            style={{ fontSize: "0.65rem" }}
          />
          {durInfo.durationLabel}
        </span>
        {durInfo.expiryLabel && (
          <span
            style={{
              fontSize: "0.68rem",
              color: "rgba(255,255,255,0.55)",
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

  const computePreview = (val: string, customText: string) => {
    if (val === "keep") return "Keep source player's existing validity";
    if (val === "custom") return customText.trim() ? customText.trim() : "(Enter custom text)";
    const curNum = activeSeason?.season_number || 9;
    const isMid = !!activeSeason?.is_mid_season;
    return formatPrimeValidity(val, curNum, isMid);
  };

  const handlePrimeSelected = async () => {
    if (selectedPlayerIds.length === 0) return showToast("No players selected!");

    const finalVal = assignValidity === "custom" ? assignCustomValidity.trim() : assignValidity;
    if (assignValidity === "custom" && !finalVal) {
      return showToast("Please enter a custom validity string!");
    }

    startTransition(async () => {
      try {
        let successCount = 0;
        let lastValidUntil = "1 Season";
        let lastError = "";

        for (const pId of selectedPlayerIds) {
          const res = await primePlayerForTeam(
            pId,
            selectedClubId ? Number(selectedClubId) : undefined,
            rtCost,
            undefined,
            finalVal
          );
          if (res.success) {
            successCount++;
            if (res.validUntil) lastValidUntil = res.validUntil;
          } else if (res.error) {
            lastError = res.error;
          }
        }

        if (successCount > 0) {
          const previewText = computePreview(assignValidity, assignCustomValidity);
          showToast(`Successfully Primed ${successCount} player${successCount > 1 ? "s" : ""}! (${previewText})`);
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

  const handleOpenEditValidity = (p: any) => {
    setEditingPlayer(p);
    const vStr = String(p.validUntil || "").toLowerCase();
    if (vStr.includes("0.5") || vStr.includes("half") || vStr.endsWith("9.5")) {
      setEditValidity("0.5");
      setEditCustomValidity("");
    } else if (vStr.includes("1.5") || vStr.endsWith("10.5")) {
      setEditValidity("1.5");
      setEditCustomValidity("");
    } else if (vStr.includes("2 season") || vStr.includes("2.0") || vStr.endsWith("11.0")) {
      setEditValidity("2.0");
      setEditCustomValidity("");
    } else if (vStr.includes("3 season") || vStr.includes("3.0") || vStr.endsWith("12.0")) {
      setEditValidity("3.0");
      setEditCustomValidity("");
    } else if (vStr.includes("permanent")) {
      setEditValidity("permanent");
      setEditCustomValidity("");
    } else if (vStr.includes("1 season") || vStr.includes("1.0") || vStr.endsWith("10.0") || vStr === "1") {
      setEditValidity("1.0");
      setEditCustomValidity("");
    } else {
      setEditValidity("custom");
      setEditCustomValidity(p.validUntil || "");
    }
  };

  const handleSaveEditValidity = async () => {
    if (!editingPlayer) return;
    const finalVal = editValidity === "custom" ? editCustomValidity.trim() : editValidity;
    if (editValidity === "custom" && !finalVal) {
      return showToast("Please enter a valid validity text!");
    }

    try {
      setIsSavingEdit(true);
      const res = await updatePlayerPrimeValidity(editingPlayer.id, finalVal);
      if (res.success) {
        showToast(`Updated Prime validity for ${editingPlayer.name}: ${res.validUntil}`);
        setEditingPlayer(null);
        loadData();
      } else {
        showToast(res.error || "Failed to update validity.");
      }
    } catch (err: any) {
      showToast(err?.message || "Error updating Prime validity.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Transfer Mode: Source players (primed players belonging to the selected club)
  const transferSourcePlayers = useMemo(() => {
    if (!selectedClubId) return primedPlayers;
    return primedPlayers.filter(p => String(p.clubId) === selectedClubId || p.clubName === selectedClub?.name);
  }, [primedPlayers, selectedClubId, selectedClub]);

  // Transfer Mode: Destination players (unprimed players belonging to the selected club)
  const transferDestPlayers = useMemo(() => {
    return allPlayers.filter((p) => {
      let matchClub = true;
      if (selectedClubId) {
        matchClub = String(p.clubId) === selectedClubId || p.clubName === selectedClub?.name;
      }
      const isAlreadyPrimed = primedPlayers.some(pp => pp.id === p.id);
      return matchClub && !isAlreadyPrimed;
    });
  }, [allPlayers, selectedClubId, selectedClub, primedPlayers]);

  const handleTransferPrime = async () => {
    if (!selectedClubId) return showToast("Please select a franchise/club first!");
    if (!transferSourcePlayerId) return showToast("Please choose the current Prime player to transfer from!");
    if (!transferDestPlayerId) return showToast("Please choose the target player to receive Prime!");
    if (transferSourcePlayerId === transferDestPlayerId) return showToast("Source and destination cannot be the same player!");

    const finalVal = transferValidity === "keep"
      ? undefined
      : (transferValidity === "custom" ? transferCustomValidity.trim() : transferValidity);

    if (transferValidity === "custom" && !finalVal) {
      return showToast("Please enter a custom validity string!");
    }

    startTransition(async () => {
      try {
        const res = await transferPlayerPrime(
          Number(transferSourcePlayerId),
          Number(transferDestPlayerId),
          Number(selectedClubId),
          transferRtCost,
          undefined,
          finalVal
        );
        if (res.success) {
          showToast(`Prime transferred successfully! (${res.validUntil})`);
          setTransferSourcePlayerId("");
          setTransferDestPlayerId("");
          loadData();
        } else {
          showToast(res.error || "Failed to transfer Prime status.");
        }
      } catch (err: any) {
        showToast(err?.message || "Error transferring Prime status!");
      }
    });
  };

  const handleSaveDefaultFees = async () => {
    try {
      setIsSavingFees(true);
      const res = await updatePrimeFeeConfig({
        upgradeRtCost: configUpgradeRt,
        transferRtCost: configTransferRt
      });
      if (res.success) {
        setFeeConfig(prev => ({
          ...prev,
          upgradeRtCost: configUpgradeRt,
          transferRtCost: configTransferRt
        }));
        showToast("Default Prime fees successfully updated!");
      } else {
        showToast(res.error || "Failed to update Prime fee settings.");
      }
    } catch (err: any) {
      showToast(err?.message || "Error updating Prime fees.");
    } finally {
      setIsSavingFees(false);
    }
  };

  const handleSaveUpgradeAsDefault = async () => {
    try {
      const res = await updatePrimeFeeConfig({ upgradeRtCost: rtCost });
      if (res.success) {
        setFeeConfig(prev => ({ ...prev, upgradeRtCost: rtCost }));
        setConfigUpgradeRt(rtCost);
        showToast(`Default Prime Upgrade fee saved as ${rtCost} RT!`);
      } else {
        showToast(res.error || "Failed to update default fee.");
      }
    } catch (err: any) {
      showToast(err?.message || "Error updating default fee.");
    }
  };

  const handleSaveTransferAsDefault = async () => {
    try {
      const res = await updatePrimeFeeConfig({ transferRtCost });
      if (res.success) {
        setFeeConfig(prev => ({ ...prev, transferRtCost }));
        setConfigTransferRt(transferRtCost);
        showToast(`Default Prime Transfer fee saved as ${transferRtCost} RT!`);
      } else {
        showToast(res.error || "Failed to update default fee.");
      }
    } catch (err: any) {
      showToast(err?.message || "Error updating default fee.");
    }
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
        <div className="rws-page-hero" style={{ marginBottom: "1.5rem" }}>
          <div className="portal-page-badge" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>
            <i className="fa-solid fa-crown" />
            Player Priming & Validity Console
          </div>
          <h1 className="rws-hero-title">
            BULK PRIME MANAGER
          </h1>
          <p className="rws-hero-sub">
            Configure Prime upgrades, transfers, and custom validity durations (0.5 season, 1 season, 2 seasons, permanent, etc.) for club players.
          </p>
        </div>

        {/* Persistent Prime Fee Configuration Card */}
        <div style={{
          background: "rgba(255, 255, 255, 0.02)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(234, 179, 8, 0.25)",
          borderRadius: "14px",
          padding: "1rem 1.4rem",
          marginBottom: "1.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(234, 179, 8, 0.15)",
              border: "1px solid rgba(234, 179, 8, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#eab308",
              fontSize: "1.1rem"
            }}>
              <i className="fa-solid fa-sliders" />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                Prime Fee Configuration
                <span style={{ fontSize: "0.68rem", color: "#eab308", background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.25)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  SAVED IN DATABASE
                </span>
              </div>
              <div style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.78rem" }}>
                Configurable default fees for Prime Upgrades and Transfers across all admin panels.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Default Upgrade:</span>
              <div style={{ position: "relative", width: "95px" }}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={configUpgradeRt}
                  onChange={(e) => setConfigUpgradeRt(Math.max(0, parseInt(e.target.value) || 0))}
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
              <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Default Transfer:</span>
              <div style={{ position: "relative", width: "95px" }}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={configTransferRt}
                  onChange={(e) => setConfigTransferRt(Math.max(0, parseInt(e.target.value) || 0))}
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
              onClick={handleSaveDefaultFees}
              disabled={isSavingFees}
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
                opacity: isSavingFees ? 0.6 : 1,
                transition: "all 0.2s"
              }}
            >
              <i className="fa-solid fa-floppy-disk" /> {isSavingFees ? "Saving..." : "Save Default Fees"}
            </button>
          </div>
        </div>

        {/* Console layout */}
        <div className="bulk-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
          
          {/* Left Column: Selector Form & Player Checklist */}
          <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "16px", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.05rem", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-display)" }}>
                <i className="fa-solid fa-square-plus" style={{ color: "#eab308" }} />
                Prime Player Console
              </h3>
              <div style={{ display: "flex", background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "3px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <button
                  type="button"
                  onClick={() => setActiveMode("assign")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: activeMode === "assign" ? "linear-gradient(135deg, #eab308, #ca8a04)" : "transparent",
                    color: activeMode === "assign" ? "#000" : "rgba(255,255,255,0.6)",
                    transition: "all 0.2s"
                  }}
                >
                  <i className="fa-solid fa-plus" style={{ marginRight: "4px" }} /> Assign
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode("transfer")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: activeMode === "transfer" ? "linear-gradient(135deg, #eab308, #ca8a04)" : "transparent",
                    color: activeMode === "transfer" ? "#000" : "rgba(255,255,255,0.6)",
                    transition: "all 0.2s"
                  }}
                >
                  <i className="fa-solid fa-repeat" style={{ marginRight: "4px" }} /> Transfer
                </button>
              </div>
            </div>

            {/* Step 1: Franchise custom dropdown */}
            <div style={{ marginBottom: "1.25rem", position: "relative" }} data-club-dropdown>
              <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: "6px", fontWeight: 600 }}>
                1. Select franchise / club
              </label>
              <div
                ref={clubTriggerRef}
                style={{
                  padding: "12px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: "10px"
                }}
                onClick={() => {
                  updateClubPosition();
                  setClubDropdownOpen(prev => !prev);
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0, overflow: "hidden" }}>
                  {selectedClub?.logo_path ? (
                    <img src={selectedClub.logo_path} alt="" style={{ width: "22px", height: "22px", objectFit: "contain", flexShrink: 0 }} />
                  ) : (
                    <i className="fa-solid fa-shield-halved" style={{ color: "#eab308", fontSize: "0.85rem", flexShrink: 0 }} />
                  )}
                  <strong style={{ fontWeight: selectedClubId ? 600 : 400, color: selectedClubId ? "#fff" : "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedClub ? selectedClub.name : (activeMode === "transfer" ? "-- Choose franchise (Required) --" : "-- Choose franchise --")}
                  </strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  {selectedClub && (
                    <span style={{ fontSize: "0.72rem", color: "#eab308", background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)", padding: "2px 6px", borderRadius: "4px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      🪙 {Number(selectedClub.coins || 0).toLocaleString()} | 🟡 {selectedClub.tokens || 0} RT
                    </span>
                  )}
                  <i className={`fa-solid fa-chevron-${clubDropdownOpen ? "up" : "down"}`} style={{ fontSize: "0.75rem", opacity: 0.6 }} />
                </div>
              </div>

              {selectedClub && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.15)", borderRadius: "8px", padding: "8px 12px", marginTop: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-solid fa-wallet" style={{ color: "#eab308", fontSize: "0.85rem" }} />
                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>Club Wallet:</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.72rem", color: "#eab308", background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.25)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                      🪙 {Number(selectedClub.coins || 0).toLocaleString()} Coins
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#38bdf8", background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.25)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                      🟡 {selectedClub.tokens || 0} RT Balance
                    </span>
                  </div>
                </div>
              )}

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
                    {activeMode !== "transfer" && (
                      <div
                        onClick={() => { setSelectedClubId(""); setClubDropdownOpen(false); setSelectedPlayerIds([]); }}
                        style={{ padding: "10px 14px", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: "0.82rem" }}
                      >
                        All Clubs / All Players
                      </div>
                    )}
                    {filteredClubs.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedClubId(c.id.toString());
                          setClubDropdownOpen(false);
                          setSelectedPlayerIds([]);
                          setTransferSourcePlayerId("");
                          setTransferDestPlayerId("");
                        }}
                        style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.02)", fontSize: "0.82rem" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0, overflow: "hidden" }}>
                          {c.logo_path && <img src={c.logo_path} alt="" style={{ width: "18px", height: "18px", objectFit: "contain", flexShrink: 0 }} />}
                          <span style={{ color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
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
                    ))}
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* ASSIGN MODE */}
            {activeMode === "assign" ? (
              <>
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
                      paginatedChecklistPlayers.map((p) => {
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

                  {/* Checklist Pagination Controls */}
                  {filteredPlayers.length > checklistPageSize && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", padding: "4px 8px", background: "rgba(0,0,0,0.2)", borderRadius: "6px" }}>
                      <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>
                        {Math.min((checklistPage - 1) * checklistPageSize + 1, filteredPlayers.length)} - {Math.min(checklistPage * checklistPageSize, filteredPlayers.length)} of {filteredPlayers.length}
                      </span>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <button
                          type="button"
                          disabled={checklistPage <= 1}
                          onClick={() => setChecklistPage(prev => Math.max(1, prev - 1))}
                          style={{
                            padding: "2px 8px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "4px",
                            color: checklistPage <= 1 ? "rgba(255,255,255,0.2)" : "#fff",
                            fontSize: "0.68rem",
                            cursor: checklistPage <= 1 ? "default" : "pointer"
                          }}
                        >
                          <i className="fa-solid fa-chevron-left" /> Prev
                        </button>
                        <span style={{ fontSize: "0.7rem", color: "#fbbf24", padding: "0 4px", fontFamily: "var(--font-mono)" }}>
                          {checklistPage} / {totalChecklistPages}
                        </span>
                        <button
                          type="button"
                          disabled={checklistPage >= totalChecklistPages}
                          onClick={() => setChecklistPage(prev => Math.min(totalChecklistPages, prev + 1))}
                          style={{
                            padding: "2px 8px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "4px",
                            color: checklistPage >= totalChecklistPages ? "rgba(255,255,255,0.2)" : "#fff",
                            fontSize: "0.68rem",
                            cursor: checklistPage >= totalChecklistPages ? "default" : "pointer"
                          }}
                        >
                          Next <i className="fa-solid fa-chevron-right" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Prime Duration / Validity Selection */}
                <div style={{ marginBottom: "1.5rem", padding: "12px 14px", background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                    <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#eab308", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="fa-solid fa-hourglass-half" /> 3. Prime Duration / Validity
                    </label>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-mono)" }}>
                      Preview: <strong style={{ color: "#fbbf24" }}>{computePreview(assignValidity, assignCustomValidity)}</strong>
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
                      const isSelected = assignValidity === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setAssignValidity(opt.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: isSelected ? "1px solid #eab308" : "1px solid rgba(255,255,255,0.1)",
                            background: isSelected ? "rgba(234,179,8,0.2)" : "rgba(0,0,0,0.3)",
                            color: isSelected ? "#facc15" : "rgba(255,255,255,0.7)",
                            fontSize: "0.75rem",
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

                  {assignValidity === "custom" && (
                    <div style={{ marginTop: "10px" }}>
                      <input
                        type="text"
                        placeholder="Enter custom validity text (e.g. Season 8.0, 4 Seasons, Tournament Winner)..."
                        value={assignCustomValidity}
                        onChange={(e) => setAssignCustomValidity(e.target.value)}
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
                <div style={{ marginBottom: "1.5rem", padding: "12px 14px", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#eab308", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="fa-solid fa-coins" /> 4. RT Deduction Cost Per Player
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
                        placeholder={`Enter RT cost (default: ${feeConfig.upgradeRtCost})`}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>
                      Deducted from the manager's R2G Token wallet. (Current default: <strong style={{ color: "#eab308" }}>{feeConfig.upgradeRtCost} RT</strong>)
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={handleSaveUpgradeAsDefault}
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
                        <i className="fa-solid fa-floppy-disk" /> Set {rtCost} RT as Default
                      </button>
                      {rtCost !== feeConfig.upgradeRtCost && (
                        <button
                          type="button"
                          onClick={() => setRtCost(feeConfig.upgradeRtCost)}
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
                          Reset ({feeConfig.upgradeRtCost} RT)
                        </button>
                      )}
                    </div>
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
                  <i className="fa-solid fa-crown" style={{ marginRight: "6px" }} /> Prime Selected Players ({selectedPlayerIds.length}) · {computePreview(assignValidity, assignCustomValidity)}
                </button>
              </>
            ) : (
              /* TRANSFER MODE */
              <div>
                {/* Source Prime Player */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "#eab308", marginBottom: "6px", fontWeight: 700 }}>
                    2. Select Current Primed Player (Transfer From)
                  </label>
                  {!selectedClubId ? (
                    <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textAlign: "center" }}>
                      Please select a franchise first.
                    </div>
                  ) : transferSourcePlayers.length === 0 ? (
                    <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", fontSize: "0.8rem", textAlign: "center" }}>
                      This club currently has no Primed players to transfer from.
                    </div>
                  ) : (
                    <select
                      value={transferSourcePlayerId}
                      onChange={(e) => setTransferSourcePlayerId(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.4)",
                        border: "1px solid rgba(234,179,8,0.3)", color: "#fff", fontSize: "0.88rem", outline: "none", boxSizing: "border-box"
                      }}
                    >
                      <option value="" style={{ background: "#18181b" }}>-- Select Prime Player --</option>
                      {transferSourcePlayers.map(p => (
                        <option key={p.id} value={p.id} style={{ background: "#18181b" }}>
                          ⭐ {p.name} ({p.position}) · {p.validUntil}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Transfer Arrow Indicator */}
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "-6px 0 10px 0" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(234,179,8,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>
                    <i className="fa-solid fa-arrow-down" />
                  </div>
                </div>

                {/* Destination Player */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "#60a5fa", marginBottom: "6px", fontWeight: 700 }}>
                    3. Select New Player to Receive Prime (Transfer To)
                  </label>
                  {!selectedClubId ? (
                    <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textAlign: "center" }}>
                      Please select a franchise first.
                    </div>
                  ) : transferDestPlayers.length === 0 ? (
                    <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textAlign: "center" }}>
                      No available squad players found for this club.
                    </div>
                  ) : (
                    <select
                      value={transferDestPlayerId}
                      onChange={(e) => setTransferDestPlayerId(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.4)",
                        border: "1px solid rgba(96,165,250,0.3)", color: "#fff", fontSize: "0.88rem", outline: "none", boxSizing: "border-box"
                      }}
                    >
                      <option value="" style={{ background: "#18181b" }}>-- Select Destination Player --</option>
                      {transferDestPlayers.map(p => (
                        <option key={p.id} value={p.id} style={{ background: "#18181b" }}>
                          {p.name} ({p.position}) · Base: {p.value || p.base_value} Coins
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 4: Transfer Prime Validity Selection */}
                <div style={{ marginBottom: "1.25rem", padding: "12px 14px", background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                    <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#eab308", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="fa-solid fa-hourglass-half" /> 4. Target Player Prime Validity
                    </label>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-mono)" }}>
                      Target: <strong style={{ color: "#fbbf24" }}>{computePreview(transferValidity, transferCustomValidity)}</strong>
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
                      const isSelected = transferValidity === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTransferValidity(opt.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: isSelected ? "1px solid #eab308" : "1px solid rgba(255,255,255,0.1)",
                            background: isSelected ? "rgba(234,179,8,0.2)" : "rgba(0,0,0,0.3)",
                            color: isSelected ? "#facc15" : "rgba(255,255,255,0.7)",
                            fontSize: "0.75rem",
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

                  {transferValidity === "custom" && (
                    <div style={{ marginTop: "10px" }}>
                      <input
                        type="text"
                        placeholder="Enter custom validity text (e.g. Season 8.0, 4 Seasons, End of Phase 1)..."
                        value={transferCustomValidity}
                        onChange={(e) => setTransferCustomValidity(e.target.value)}
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

                {/* RT Transfer Fee */}
                <div style={{ marginBottom: "1.5rem", padding: "12px 14px", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#eab308", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="fa-solid fa-coins" /> 5. RT Transfer Fee
                    </label>
                    <span style={{ fontSize: "0.75rem", color: "#eab308", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                      {Number(transferRtCost) || 0} RT
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={transferRtCost}
                      onChange={(e) => setTransferRtCost(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder={`Enter RT transfer fee (default: ${feeConfig.transferRtCost})`}
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
                    <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>
                      Deducted from the manager's R2G Token wallet to reassign Prime status. (Default: <strong style={{ color: "#eab308" }}>{feeConfig.transferRtCost} RT</strong>)
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={handleSaveTransferAsDefault}
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
                        <i className="fa-solid fa-floppy-disk" /> Set {transferRtCost} RT as Default
                      </button>
                      {transferRtCost !== feeConfig.transferRtCost && (
                        <button
                          type="button"
                          onClick={() => setTransferRtCost(feeConfig.transferRtCost)}
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
                          Reset ({feeConfig.transferRtCost} RT)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Transfer Button */}
                <button
                  type="button"
                  onClick={handleTransferPrime}
                  disabled={isPending || !selectedClubId || !transferSourcePlayerId || !transferDestPlayerId}
                  style={{
                    width: "100%", padding: "12px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
                    fontWeight: 700, fontSize: "0.85rem", fontFamily: "var(--font-display)", textTransform: "uppercase",
                    background: "linear-gradient(135deg, #eab308, #ca8a04)", color: "#000",
                    opacity: isPending || !selectedClubId || !transferSourcePlayerId || !transferDestPlayerId ? 0.5 : 1,
                    transition: "all 0.25s ease",
                    boxShadow: selectedClubId && transferSourcePlayerId && transferDestPlayerId ? "0 4px 20px rgba(234,179,8,0.2)" : "none"
                  }}
                >
                  <i className="fa-solid fa-repeat" style={{ marginRight: "6px" }} /> Transfer Prime Status ({transferRtCost} RT)
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Active Primed Players List */}
          <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <i className="fa-solid fa-crown" style={{ color: "#eab308", fontSize: "0.95rem" }} />
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "#fff" }}>
                  Active Primed Players
                </span>
                <span style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)", padding: "1px 7px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  {primedPlayers.length}
                </span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}>
                Configurable Validity Active
              </span>
            </div>

            {/* Primed Players Filter Bar */}
            <div style={{
              padding: "0.75rem 1.25rem",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
              background: "rgba(0,0,0,0.2)"
            }}>
              {/* Search input */}
              <div style={{ position: "relative", flex: "1 1 180px", minWidth: "150px" }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", fontSize: "0.72rem" }} />
                <input
                  type="text"
                  placeholder="Search primed player, club, position..."
                  value={primedSearch}
                  onChange={(e) => setPrimedSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 26px 6px 28px",
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "0.78rem",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                {primedSearch && (
                  <button
                    type="button"
                    onClick={() => setPrimedSearch("")}
                    style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.72rem", padding: 0 }}
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}
              </div>

              {/* Club Filter */}
              <select
                value={primedClubFilter}
                onChange={(e) => setPrimedClubFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.78rem",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all" style={{ background: "#18181b" }}>All Clubs</option>
                {clubs.map(c => (
                  <option key={c.id} value={String(c.id)} style={{ background: "#18181b" }}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Duration Preset Filter */}
              <select
                value={primedDurationFilter}
                onChange={(e) => setPrimedDurationFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.78rem",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all" style={{ background: "#18181b" }}>All Durations</option>
                <option value="half" style={{ background: "#18181b" }}>0.5 Season (Half)</option>
                <option value="1" style={{ background: "#18181b" }}>1 Season</option>
                <option value="2+" style={{ background: "#18181b" }}>2+ Seasons</option>
                <option value="permanent" style={{ background: "#18181b" }}>Permanent</option>
              </select>
            </div>

            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
                Loading Primed players...
              </div>
            ) : filteredPrimedPlayers.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                <i className="fa-solid fa-crown" style={{ fontSize: "2rem", marginBottom: "1rem", display: "block", opacity: 0.2 }} />
                {primedPlayers.length === 0 ? "No players are currently Primed." : "No Primed players match the selected filters."}
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
                    {paginatedPrimedPlayers.map((p) => (
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
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                            {renderPrimeDurationBadge(p)}
                            <button
                              type="button"
                              onClick={() => handleOpenEditValidity(p)}
                              title="Edit Prime Validity"
                              style={{
                                padding: "4px 7px",
                                borderRadius: "5px",
                                border: "1px solid rgba(234,179,8,0.3)",
                                background: "rgba(234,179,8,0.1)",
                                color: "#fbbf24",
                                cursor: "pointer",
                                fontSize: "0.7rem",
                                display: "inline-flex",
                                alignItems: "center"
                              }}
                            >
                              <i className="fa-solid fa-pen-to-square" />
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1.25rem", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditValidity(p)}
                              disabled={isPending}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "1px solid rgba(234,179,8,0.3)",
                                background: "rgba(234,179,8,0.08)",
                                color: "#fbbf24",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <i className="fa-solid fa-clock" /> Validity
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePrime(p.id)}
                              disabled={isPending}
                              style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, transition: "all 0.2s" }}
                            >
                              Remove Prime
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls Bar */}
            {filteredPrimedPlayers.length > 0 && (
              <div style={{
                padding: "0.75rem 1.25rem",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
                background: "rgba(0,0,0,0.2)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                    Showing <strong style={{ color: "#fff" }}>{primedPageSize === -1 ? 1 : Math.min((primedPage - 1) * primedPageSize + 1, filteredPrimedPlayers.length)}</strong> - <strong style={{ color: "#fff" }}>{primedPageSize === -1 ? filteredPrimedPlayers.length : Math.min(primedPage * primedPageSize, filteredPrimedPlayers.length)}</strong> of <strong style={{ color: "#eab308" }}>{filteredPrimedPlayers.length}</strong>
                    {filteredPrimedPlayers.length !== primedPlayers.length && (
                      <span> (filtered from {primedPlayers.length})</span>
                    )}
                  </span>

                  <select
                    value={primedPageSize}
                    onChange={(e) => setPrimedPageSize(Number(e.target.value))}
                    style={{
                      padding: "4px 8px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px",
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "0.72rem",
                      outline: "none",
                      cursor: "pointer"
                    }}
                  >
                    <option value={10} style={{ background: "#18181b" }}>10 / page</option>
                    <option value={25} style={{ background: "#18181b" }}>25 / page</option>
                    <option value={50} style={{ background: "#18181b" }}>50 / page</option>
                    <option value={-1} style={{ background: "#18181b" }}>Show All</option>
                  </select>
                </div>

                {primedPageSize !== -1 && totalPrimedPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <button
                      type="button"
                      disabled={primedPage <= 1}
                      onClick={() => setPrimedPage(1)}
                      title="First Page"
                      style={{
                        padding: "4px 8px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "5px",
                        color: primedPage <= 1 ? "rgba(255,255,255,0.2)" : "#fff",
                        fontSize: "0.72rem",
                        cursor: primedPage <= 1 ? "default" : "pointer"
                      }}
                    >
                      <i className="fa-solid fa-angles-left" />
                    </button>
                    <button
                      type="button"
                      disabled={primedPage <= 1}
                      onClick={() => setPrimedPage(prev => Math.max(1, prev - 1))}
                      title="Previous Page"
                      style={{
                        padding: "4px 10px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "5px",
                        color: primedPage <= 1 ? "rgba(255,255,255,0.2)" : "#fff",
                        fontSize: "0.72rem",
                        cursor: primedPage <= 1 ? "default" : "pointer"
                      }}
                    >
                      <i className="fa-solid fa-chevron-left" /> Prev
                    </button>

                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", padding: "0 6px", fontFamily: "var(--font-mono)" }}>
                      Page <strong style={{ color: "#fbbf24" }}>{primedPage}</strong> of {totalPrimedPages}
                    </span>

                    <button
                      type="button"
                      disabled={primedPage >= totalPrimedPages}
                      onClick={() => setPrimedPage(prev => Math.min(totalPrimedPages, prev + 1))}
                      title="Next Page"
                      style={{
                        padding: "4px 10px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "5px",
                        color: primedPage >= totalPrimedPages ? "rgba(255,255,255,0.2)" : "#fff",
                        fontSize: "0.72rem",
                        cursor: primedPage >= totalPrimedPages ? "default" : "pointer"
                      }}
                    >
                      Next <i className="fa-solid fa-chevron-right" />
                    </button>
                    <button
                      type="button"
                      disabled={primedPage >= totalPrimedPages}
                      onClick={() => setPrimedPage(totalPrimedPages)}
                      title="Last Page"
                      style={{
                        padding: "4px 8px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "5px",
                        color: primedPage >= totalPrimedPages ? "rgba(255,255,255,0.2)" : "#fff",
                        fontSize: "0.72rem",
                        cursor: primedPage >= totalPrimedPages ? "default" : "pointer"
                      }}
                    >
                      <i className="fa-solid fa-angles-right" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Edit Validity Modal */}
        {mounted && editingPlayer && createPortal(
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
            onClick={() => !isSavingEdit && setEditingPlayer(null)}
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
              {/* Modal Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-solid fa-crown" style={{ color: "#eab308" }} />
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                      Edit Prime Validity
                    </h3>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                    Updating validity for <strong style={{ color: "#fff" }}>{editingPlayer.name}</strong> ({editingPlayer.position} · {editingPlayer.clubName})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  disabled={isSavingEdit}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.1rem", padding: "4px" }}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              {/* Current Validity Display */}
              <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>Current Duration & Status:</span>
                <div>
                  {renderPrimeDurationBadge(editingPlayer)}
                </div>
              </div>

              {/* Target Validity Selector */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "#eab308", fontWeight: 700, marginBottom: "8px" }}>
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
                    const isSelected = editValidity === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEditValidity(opt.id)}
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

                {editValidity === "custom" && (
                  <div style={{ marginTop: "10px" }}>
                    <input
                      type="text"
                      placeholder="Enter custom validity text (e.g. Season 8.0, 4 Seasons, End of Phase 1)..."
                      value={editCustomValidity}
                      onChange={(e) => setEditCustomValidity(e.target.value)}
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

              {/* Live New Preview */}
              <div style={{ padding: "10px 14px", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "8px", marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: "2px" }}>
                  Target New Validity Value
                </div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fbbf24", fontFamily: "var(--font-mono)" }}>
                  {computePreview(editValidity, editCustomValidity)}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  disabled={isSavingEdit}
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
                  onClick={handleSaveEditValidity}
                  disabled={isSavingEdit}
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
                  {isSavingEdit ? (
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
    </div>
  );
}
