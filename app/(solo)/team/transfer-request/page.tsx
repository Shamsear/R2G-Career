"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import "../../solo-tour/admin/admin.css";
import "../../../portal.css";

import {
  fetchActiveTransferWindow,
  fetchRegisteredClubs,
  fetchClubPlayersWithContracts,
  submitTransferRequest,
  fetchActiveSeason,
  fetchTransferRequestsList
} from "@/utils/solo/serverActions";

export default function PublicTransferRequestPage() {
  const [activeWindow, setActiveWindow] = useState<any>(null);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);

  // Transfer Type Toggle
  const [transferType, setTransferType] = useState<"sale" | "swap">("sale");

  // Selection states
  const [selectedClubId, setSelectedClubId] = useState<string>(""); // Requester (Seller/Swapper A)
  const [buyerClubId, setBuyerClubId] = useState<string>(""); // Buying club (Sale) or Counterpart (Swap B)

  // Squad rosters
  const [mySquad, setMySquad] = useState<any[]>([]);
  const [otherSquad, setOtherSquad] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Sale player selection
  const [salePlayerId, setSalePlayerId] = useState<string>("");
  const [salePrice, setSalePrice] = useState<number>(80);

  // Swap player selection (Exactly 1-for-1)
  const [swapSelectedMyId, setSwapSelectedMyId] = useState<number | null>(null);
  const [swapSelectedOtherId, setSwapSelectedOtherId] = useState<number | null>(null);
  const [swapAdjustment, setSwapAdjustment] = useState<number>(0);

  // Custom dropdown toggles
  const [myClubDDOpen, setMyClubDDOpen] = useState(false);
  const [myClubSearch, setMyClubSearch] = useState("");
  const [otherClubDDOpen, setOtherClubDDOpen] = useState(false);
  const [otherClubSearch, setOtherClubSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingMySquad, setLoadingMySquad] = useState(false);
  const [loadingOtherSquad, setLoadingOtherSquad] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [windowData, seasonData, clubsData] = await Promise.all([
        fetchActiveTransferWindow(),
        fetchActiveSeason(),
        fetchRegisteredClubs()
      ]);
      setActiveWindow(windowData);
      setActiveSeason(seasonData);
      setClubs(clubsData || []);
    } catch {
      showToast("Error loading transfer portal settings!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // click outside listener
    const clickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-my-club-dd]")) setMyClubDDOpen(false);
      if (!target.closest("[data-other-club-dd]")) setOtherClubDDOpen(false);
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  // Fetch history for the selected team
  const loadHistoryLogs = async (clubId: string) => {
    if (clubId && activeSeason) {
      try {
        const historyData = await fetchTransferRequestsList(activeSeason.id);
        const filtered = (historyData || []).filter((t: any) =>
          String(t.requesting_team_id) === clubId || String(t.target_team_id) === clubId
        );
        setHistory(filtered);
      } catch {
        console.error("Failed to load transfer logs history");
      }
    } else {
      setHistory([]);
    }
  };

  // Load Requesting Squad
  useEffect(() => {
    if (selectedClubId && activeSeason) {
      setLoadingMySquad(true);
      setSalePlayerId("");
      setSwapSelectedMyId(null);
      fetchClubPlayersWithContracts(parseInt(selectedClubId), activeSeason.id)
        .then(setMySquad)
        .catch(() => showToast("Error loading your team roster!"))
        .finally(() => setLoadingMySquad(false));
      loadHistoryLogs(selectedClubId);
    } else {
      setMySquad([]);
      setSalePlayerId("");
      setSwapSelectedMyId(null);
      setHistory([]);
    }
  }, [selectedClubId, activeSeason]);

  // Load Target / Buyer Squad
  useEffect(() => {
    if (buyerClubId && activeSeason) {
      setLoadingOtherSquad(true);
      setSwapSelectedOtherId(null);
      fetchClubPlayersWithContracts(parseInt(buyerClubId), activeSeason.id)
        .then(setOtherSquad)
        .catch(() => showToast("Error loading counterpart roster!"))
        .finally(() => setLoadingOtherSquad(false));
    } else {
      setOtherSquad([]);
      setSwapSelectedOtherId(null);
    }
  }, [buyerClubId, activeSeason]);

  const myClubObj = useMemo(() => clubs.find(c => String(c.id) === selectedClubId), [clubs, selectedClubId]);
  const otherClubObj = useMemo(() => clubs.find(c => String(c.id) === buyerClubId), [clubs, buyerClubId]);

  const filteredMyClubs = useMemo(() => clubs.filter(c => c.name.toLowerCase().includes(myClubSearch.toLowerCase())), [clubs, myClubSearch]);
  const filteredOtherClubs = useMemo(() => clubs.filter(c => c.name.toLowerCase().includes(otherClubSearch.toLowerCase()) && String(c.id) !== selectedClubId), [clubs, otherClubSearch, selectedClubId]);

  // Preview computed text & share text
  const shareText = useMemo(() => {
    if (!myClubObj) return "";
    if (transferType === "sale") {
      const player = mySquad.find(p => String(p.id) === salePlayerId);
      if (!player || !otherClubObj) return "";
      return `*${myClubObj.name.toUpperCase()} - PLAYER SALE REQUEST*\n\nSelling *${player.name}* (${player.position}, Value: ${player.value || player.base_value} Coins) to *${otherClubObj.name}* for *${salePrice} Coins*.\n\n*Submitted via R2G Career Portal*`;
    } else {
      const pMy = mySquad.find(p => p.id === swapSelectedMyId);
      const pOther = otherSquad.find(p => p.id === swapSelectedOtherId);
      if (!pMy || !pOther || !otherClubObj) return "";
      const adjustmentStr = swapAdjustment > 0
        ? `*${myClubObj.name} pays ${swapAdjustment} Coins* to ${otherClubObj.name}`
        : swapAdjustment < 0
          ? `*${otherClubObj.name} pays ${Math.abs(swapAdjustment)} Coins* to ${myClubObj.name}`
          : `No cash adjustments`;

      return `*${myClubObj.name.toUpperCase()} & ${otherClubObj.name.toUpperCase()} - SWAP TRADE REQUEST*\n\n• Swapping *${pMy.name}* (from ${myClubObj.name}) with *${pOther.name}* (from ${otherClubObj.name})\n• Cash Adjustment: ${adjustmentStr}\n\n*Submitted via R2G Career Portal*`;
    }
  }, [transferType, myClubObj, otherClubObj, mySquad, otherSquad, salePlayerId, salePrice, swapSelectedMyId, swapSelectedOtherId, swapAdjustment]);

  const handleCopyToClipboard = () => {
    if (!shareText) return;
    navigator.clipboard.writeText(shareText);
    showToast("Trade details copied to clipboard!");
  };

  // Copy History log
  const handleCopyHistory = () => {
    if (history.length === 0 || !myClubObj) return;
    const lines = history.map((t: any) => {
      const date = new Date(t.submitted_at).toLocaleDateString();
      if (t.request_type === "sale") {
        return `• [${date}] SALE: ${t.players[0]?.playerName} ${t.requesting_team_name} -> ${t.target_team_name} [${t.price} Coins] (${t.status.toUpperCase()})`;
      } else {
        const pReq = t.players.find((p: any) => p.fromTeamId === t.requesting_team_id);
        const pTar = t.players.find((p: any) => p.fromTeamId === t.target_team_id);
        return `• [${date}] SWAP: Swapping ${pReq?.playerName} with ${pTar?.playerName} (${t.status.toUpperCase()})`;
      }
    });
    const txt = `*${myClubObj.name.toUpperCase()} - TRANSACTIONS HISTORY*\n\n${lines.join("\n")}`;
    navigator.clipboard.writeText(txt);
    showToast("History log copied to clipboard!");
  };

  // Submissions
  const handleSendSaleRequest = () => {
    if (!selectedClubId) return showToast("Select your club!");
    if (!salePlayerId) return showToast("Select the player you wish to sell!");
    if (!buyerClubId) return showToast("Select the buying club!");
    if (salePrice <= 0) return showToast("Please set a valid sale price!");

    const player = mySquad.find(p => String(p.id) === salePlayerId);
    if (!player) return showToast("Selected player not found in roster!");

    startTransition(async () => {
      try {
        const payload = [{
          playerId: player.id,
          playerName: player.name,
          playerValue: Number(player.value || player.base_value),
          fromTeamId: Number(selectedClubId),
          toTeamId: Number(buyerClubId)
        }];

        const res = await submitTransferRequest(
          Number(selectedClubId),
          Number(buyerClubId),
          "sale",
          salePrice,
          payload
        );

        if (res.success) {
          showToast("Sale request submitted for counterpart acceptance!");
          setSalePlayerId("");
          setBuyerClubId("");
          loadHistoryLogs(selectedClubId);
        } else {
          showToast(res.error || "Failed to submit sale request.");
        }
      } catch {
        showToast("Error processing sale request!");
      }
    });
  };

  const handleSendSwapRequest = () => {
    if (!selectedClubId) return showToast("Select your club!");
    if (!buyerClubId) return showToast("Select counterpart club!");
    if (!swapSelectedMyId || !swapSelectedOtherId) {
      return showToast("Select 1 player from each team for swap trade!");
    }

    startTransition(async () => {
      try {
        const pMy = mySquad.find(p => p.id === swapSelectedMyId);
        const pOther = otherSquad.find(p => p.id === swapSelectedOtherId);
        if (!pMy || !pOther) return showToast("Invalid players selected!");

        const payload = [
          {
            playerId: pMy.id,
            playerName: pMy.name,
            playerValue: Number(pMy.value || pMy.base_value),
            fromTeamId: Number(selectedClubId),
            toTeamId: Number(buyerClubId)
          },
          {
            playerId: pOther.id,
            playerName: pOther.name,
            playerValue: Number(pOther.value || pOther.base_value),
            fromTeamId: Number(buyerClubId),
            toTeamId: Number(selectedClubId)
          }
        ];

        const res = await submitTransferRequest(
          Number(selectedClubId),
          Number(buyerClubId),
          "swap",
          swapAdjustment,
          payload
        );

        if (res.success) {
          showToast("1-for-1 Swap request submitted successfully!");
          setSwapSelectedMyId(null);
          setSwapSelectedOtherId(null);
          setBuyerClubId("");
          setSwapAdjustment(0);
          loadHistoryLogs(selectedClubId);
        } else {
          showToast(res.error || "Failed to submit swap request.");
        }
      } catch {
        showToast("Error processing swap request.");
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

      <div className="portal-container" style={{ maxWidth: "1050px" }}>
        
        {/* Navigation Breadcrumb */}
        <div className="portal-breadcrumb" style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem" }}>
          <Link href="/team/transfers" className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fa-solid fa-receipt" style={{ marginRight: "6px" }} /> Transfers log
          </Link>
          <Link href="/team/release-request" className="portal-btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fa-solid fa-angles-down" style={{ marginRight: "6px" }} /> Release Page
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero" style={{ marginBottom: "2rem" }}>
          <div className="portal-page-badge" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>
            <i className="fa-solid fa-arrow-right-arrow-left" />
            Team Transfer Portal
          </div>
          <h1 className="rws-hero-title">
            TRANSFER & SWAP PORTAL
          </h1>
          <p className="rws-hero-sub">
            Directly sell players to buying clubs or configure exactly 1-for-1 swap deals. Live outcomes update dynamically as you formulate bids.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            Loading transfer portal...
          </div>
        ) : !activeWindow ? (
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "16px", padding: "2.5rem", textAlign: "center", color: "#f87171" }}>
            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.8 }} />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Window is Closed</h3>
            <p style={{ fontSize: "0.88rem", opacity: 0.8, maxWidth: "420px", margin: "0 auto" }}>
              No transfer / swap windows are currently active for this season. Roster transfers are disabled until admins open the transfer window.
            </p>
          </div>
        ) : (
          <div>
            {/* Window metadata */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>Active Transfer Stage</span>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                  <span style={{ background: "rgba(234,179,8,0.2)", color: "#eab308", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "6px", textTransform: "uppercase" }}>
                    {activeWindow.window_type} Season
                  </span>
                  <span>{activeWindow.name}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>Transfer Limit</span>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#eab308", marginTop: "3px" }}>
                  {activeWindow.is_unlimited ? (
                    <><i className="fa-solid fa-infinity" /> Unlimited Transactions</>
                  ) : (
                    `Max ${activeWindow.transfer_limit} requests per club`
                  )}
                </div>
              </div>
            </div>

            {/* Toggle tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
              <button
                type="button"
                className={`portal-btn ${transferType === "sale" ? "btn-primary" : "btn-secondary"}`}
                style={{ background: transferType === "sale" ? "linear-gradient(135deg, #eab308, #ca8a04)" : "", color: transferType === "sale" ? "#000" : "" }}
                onClick={() => { setTransferType("sale"); setBuyerClubId(""); setSwapSelectedMyId(null); setSwapSelectedOtherId(null); }}
              >
                <i className="fa-solid fa-coins" style={{ marginRight: "6px" }} /> Sell Player
              </button>
              <button
                type="button"
                className={`portal-btn ${transferType === "swap" ? "btn-primary" : "btn-secondary"}`}
                style={{ background: transferType === "swap" ? "linear-gradient(135deg, #eab308, #ca8a04)" : "", color: transferType === "swap" ? "#000" : "" }}
                onClick={() => { setTransferType("swap"); setBuyerClubId(""); setSalePlayerId(""); }}
              >
                <i className="fa-solid fa-shuffle" style={{ marginRight: "6px" }} /> 1-for-1 Swap
              </button>
            </div>

            {/* Step 1: Select Your Club dropdown */}
            <div style={{ marginBottom: "1.5rem", position: "relative" }} data-my-club-dd>
              <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: "6px", fontWeight: 600 }}>
                1. Select Your Club Franchise
              </label>
              <div
                style={{
                  padding: "12px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer"
                }}
                onClick={() => setMyClubDDOpen(prev => !prev)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {myClubObj?.logo_path ? (
                    <img src={myClubObj.logo_path} alt="" style={{ width: "22px", height: "22px", objectFit: "contain" }} />
                  ) : (
                    <i className="fa-solid fa-shield-halved" style={{ color: "#eab308", fontSize: "0.85rem" }} />
                  )}
                  <strong style={{ fontWeight: selectedClubId ? 600 : 400, color: selectedClubId ? "#fff" : "rgba(255,255,255,0.4)" }}>
                    {myClubObj ? myClubObj.name : "-- Select your club --"}
                  </strong>
                </div>
                <i className={`fa-solid fa-chevron-${myClubDDOpen ? "up" : "down"}`} style={{ fontSize: "0.75rem", opacity: 0.6 }} />
              </div>

              {myClubDDOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden", marginTop: "6px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                  <div style={{ padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <input
                      type="text"
                      placeholder="Search club..."
                      value={myClubSearch}
                      onChange={(e) => setMyClubSearch(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                    {filteredMyClubs.map(c => (
                      <div
                        key={c.id}
                        onClick={() => { setSelectedClubId(c.id.toString()); setMyClubDDOpen(false); }}
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

            {selectedClubId && (
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
                
                {/* LEFT COLUMN: Setup Configuration */}
                <div>
                  {/* TAB CONTENT: SALE */}
                  {transferType === "sale" && (
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "1.5rem" }}>
                      <h3 style={{ fontSize: "0.95rem", color: "#fff", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "6px" }}>
                        <i className="fa-solid fa-coins" style={{ color: "#eab308" }} />
                        Configure Direct Sale Details
                      </h3>

                      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {/* Select player to sell */}
                        <div>
                          <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                            Choose player to sell from squad
                          </label>
                          {loadingMySquad ? (
                            <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Loading squad...</div>
                          ) : (
                            <select
                              value={salePlayerId}
                              onChange={(e) => setSalePlayerId(e.target.value)}
                              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem" }}
                            >
                              <option value="">-- Choose squad player --</option>
                              {mySquad.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.position}) &bull; Value: {p.value || p.base_value} Coins</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Select Buyer franchise */}
                        <div style={{ position: "relative" }} data-other-club-dd>
                          <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                            Select Buying franchise
                          </label>
                          <div
                            style={{
                              padding: "10px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
                              color: "#fff", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer"
                            }}
                            onClick={() => setOtherClubDDOpen(prev => !prev)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {otherClubObj?.logo_path && <img src={otherClubObj.logo_path} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                              <span style={{ color: buyerClubId ? "#fff" : "rgba(255,255,255,0.4)", fontWeight: buyerClubId ? 600 : 400 }}>
                                {otherClubObj ? otherClubObj.name : "-- Choose buyer --"}
                              </span>
                            </div>
                            <i className={`fa-solid fa-chevron-${otherClubDDOpen ? "up" : "down"}`} style={{ fontSize: "0.75rem", opacity: 0.6 }} />
                          </div>

                          {otherClubDDOpen && (
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 12, background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden", marginTop: "6px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                              <div style={{ padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <input
                                  type="text"
                                  placeholder="Search buying club..."
                                  value={otherClubSearch}
                                  onChange={(e) => setOtherClubSearch(e.target.value)}
                                  style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div style={{ maxHeight: "160px", overflowY: "auto" }}>
                                {filteredOtherClubs.map(c => (
                                  <div
                                    key={c.id}
                                    onClick={() => { setBuyerClubId(c.id.toString()); setOtherClubDDOpen(false); }}
                                    style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.02)", fontSize: "0.82rem" }}
                                  >
                                    {c.logo_path && <img src={c.logo_path} alt="" style={{ width: "16px", height: "16px", objectFit: "contain" }} />}
                                    <span style={{ color: "#fff" }}>{c.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Transfer Sale fee */}
                        <div>
                          <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                            Transfer Price (fee in Coins)
                          </label>
                          <input
                            type="number"
                            value={salePrice}
                            onChange={(e) => setSalePrice(Math.max(1, parseInt(e.target.value) || 0))}
                            style={{ width: "100%", padding: "9px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isPending || !salePlayerId || !buyerClubId}
                        onClick={handleSendSaleRequest}
                        style={{
                          width: "100%", padding: "12px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
                          fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", marginTop: "1.5rem",
                          background: "linear-gradient(135deg, #eab308, #ca8a04)", color: "#000",
                          opacity: isPending || !salePlayerId || !buyerClubId ? 0.5 : 1, transition: "all 0.25s ease"
                        }}
                      >
                        {isPending ? "Submitting Request..." : "Submit Sale Request"}
                      </button>
                    </div>
                  )}

                  {/* TAB CONTENT: SWAP (Exactly 1-for-1) */}
                  {transferType === "swap" && (
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "1.5rem" }}>
                      
                      {/* Select swap counterpart dropdown */}
                      <div style={{ position: "relative", marginBottom: "1.25rem" }} data-other-club-dd>
                        <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                          2. Select Swap Counterpart Team
                        </label>
                        <div
                          style={{
                            padding: "12px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
                            color: "#fff", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer"
                          }}
                          onClick={() => setOtherClubDDOpen(prev => !prev)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {otherClubObj?.logo_path && <img src={otherClubObj.logo_path} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                            <span style={{ color: buyerClubId ? "#fff" : "rgba(255,255,255,0.4)", fontWeight: buyerClubId ? 600 : 400 }}>
                              {otherClubObj ? otherClubObj.name : "-- Choose counterpart team --"}
                            </span>
                          </div>
                          <i className={`fa-solid fa-chevron-${otherClubDDOpen ? "up" : "down"}`} style={{ fontSize: "0.75rem", opacity: 0.6 }} />
                        </div>

                        {otherClubDDOpen && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 12, background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden", marginTop: "6px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                            <div style={{ padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <input
                                type="text"
                                placeholder="Search club name..."
                                value={otherClubSearch}
                                onChange={(e) => setOtherClubSearch(e.target.value)}
                                style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div style={{ maxHeight: "160px", overflowY: "auto" }}>
                              {filteredOtherClubs.map(c => (
                                <div
                                  key={c.id}
                                  onClick={() => { setBuyerClubId(c.id.toString()); setOtherClubDDOpen(false); }}
                                  style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.02)", fontSize: "0.82rem" }}
                                >
                                  {c.logo_path && <img src={c.logo_path} alt="" style={{ width: "16px", height: "16px", objectFit: "contain" }} />}
                                  <span style={{ color: "#fff" }}>{c.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {buyerClubId && (
                        <div>
                          {/* 1-for-1 side-by-side radio selection */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                            
                            {/* Left: Choose my player (exactly 1) */}
                            <div>
                              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Your Player</label>
                              <div style={{ maxHeight: "220px", overflowY: "auto", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "4px" }}>
                                {loadingMySquad ? (
                                  <div style={{ padding: "1rem", color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Loading...</div>
                                ) : (
                                  mySquad.map(p => (
                                    <div
                                      key={p.id}
                                      onClick={() => setSwapSelectedMyId(p.id)}
                                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px", cursor: "pointer", background: swapSelectedMyId === p.id ? "rgba(234,179,8,0.08)" : "", borderRadius: "6px" }}
                                    >
                                      <input type="radio" checked={swapSelectedMyId === p.id} onChange={() => {}} style={{ accentColor: "#eab308" }} />
                                      <div style={{ fontSize: "0.75rem" }}>
                                        <div style={{ color: "#fff", fontWeight: 600 }}>{p.name}</div>
                                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Value: {p.value || p.base_value} Coins</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Right: Choose counterpart player (exactly 1) */}
                            <div>
                              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Counterpart Player</label>
                              <div style={{ maxHeight: "220px", overflowY: "auto", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "4px" }}>
                                {loadingOtherSquad ? (
                                  <div style={{ padding: "1rem", color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Loading...</div>
                                ) : (
                                  otherSquad.map(p => (
                                    <div
                                      key={p.id}
                                      onClick={() => setSwapSelectedOtherId(p.id)}
                                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px", cursor: "pointer", background: swapSelectedOtherId === p.id ? "rgba(234,179,8,0.08)" : "", borderRadius: "6px" }}
                                    >
                                      <input type="radio" checked={swapSelectedOtherId === p.id} onChange={() => {}} style={{ accentColor: "#eab308" }} />
                                      <div style={{ fontSize: "0.75rem" }}>
                                        <div style={{ color: "#fff", fontWeight: 600 }}>{p.name}</div>
                                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Value: {p.value || p.base_value} Coins</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                          </div>

                          {/* Cash adjustment setting */}
                          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "12px", borderRadius: "10px", marginBottom: "1.25rem" }}>
                            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>
                              Adjustment Price / Coins (Paid by You to Counterpart)
                            </label>
                            <input
                              type="number"
                              placeholder="e.g. 15 or 0"
                              value={swapAdjustment}
                              onChange={(e) => setSwapAdjustment(parseInt(e.target.value) || 0)}
                              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                            />
                            <span style={{ display: "block", fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                              Positive means you pay counterpart coins. Negative means counterpart pays you coins.
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isPending || !swapSelectedMyId || !swapSelectedOtherId}
                            onClick={handleSendSwapRequest}
                            style={{
                              width: "100%", padding: "12px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
                              fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase",
                              background: "linear-gradient(135deg, #eab308, #ca8a04)", color: "#000",
                              opacity: isPending || !swapSelectedMyId || !swapSelectedOtherId ? 0.5 : 1, transition: "all 0.25s ease"
                            }}
                          >
                            {isPending ? "Submitting Request..." : "Submit 1-for-1 Swap Trade"}
                          </button>
                        </div>
                      )}

                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Live Previews & History */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  
                  {/* Live Outcome Preview panel */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: "16px", padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "0.9rem", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "1rem" }}>
                      <i className="fa-solid fa-calculator" style={{ color: "#eab308" }} />
                      Live Trade Preview
                    </h3>

                    {transferType === "sale" && (!salePlayerId || !buyerClubId) && (
                      <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "1rem 0" }}>
                        Configure the player sale details on the left to see transaction outcomes.
                      </p>
                    )}

                    {transferType === "swap" && (!swapSelectedMyId || !swapSelectedOtherId) && (
                      <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "1rem 0" }}>
                        Select exactly one player from each side to preview the swap deal.
                      </p>
                    )}

                    {/* Preview details */}
                    {transferType === "sale" && salePlayerId && buyerClubId && (
                      <div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem", background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.02)" }}>
                          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>
                            Selling <strong>{mySquad.find(p => String(p.id) === salePlayerId)?.name}</strong> &rarr; <strong>{otherClubObj?.name}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                            <span style={{ color: "rgba(255,255,255,0.5)" }}>Transfer price:</span>
                            <strong style={{ color: "#10b981" }}>+{salePrice} Coins</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "6px" }}>
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>New Buyer Salary:</span>
                            <span style={{ color: "#fbbf24" }}>{Number(salePrice) * 0.05} Coins/season</span>
                          </div>
                        </div>

                        <div style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "8px", padding: "10px", fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", lineHeight: "1.4", marginBottom: "1rem" }}>
                          <i className="fa-solid fa-circle-info" style={{ marginRight: "6px", color: "#eab308" }} />
                          Selling will shift the player to the buyer's squad. Once counterpart accepts and admin approves, coins will swap.
                        </div>

                        <button
                          type="button"
                          onClick={handleCopyToClipboard}
                          style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#fff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                        >
                          <i className="fa-brands fa-whatsapp" style={{ marginRight: "5px" }} /> Copy WhatsApp Text
                        </button>
                      </div>
                    )}

                    {transferType === "swap" && swapSelectedMyId && swapSelectedOtherId && (
                      <div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem", background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.02)" }}>
                          <div style={{ fontSize: "0.78rem" }}>
                            Swapping <strong>{mySquad.find(p => p.id === swapSelectedMyId)?.name}</strong> &harr; <strong>{otherSquad.find(p => p.id === swapSelectedOtherId)?.name}</strong>
                          </div>
                          
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "6px" }}>
                            <span style={{ color: "rgba(255,255,255,0.5)" }}>Cash adjustment:</span>
                            <strong style={{ color: swapAdjustment >= 0 ? "#ef4444" : "#10b981" }}>
                              {swapAdjustment >= 0 ? `-${swapAdjustment} Coins` : `+${Math.abs(swapAdjustment)} Coins`}
                            </strong>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem" }}>
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>New carrying value:</span>
                            <span>{Math.max(Number(mySquad.find(p => p.id === swapSelectedMyId)?.value || mySquad.find(p => p.id === swapSelectedMyId)?.base_value || 0), Number(otherSquad.find(p => p.id === swapSelectedOtherId)?.value || otherSquad.find(p => p.id === swapSelectedOtherId)?.base_value || 0))} Coins</span>
                          </div>
                        </div>

                        <div style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "8px", padding: "10px", fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", lineHeight: "1.4", marginBottom: "1rem" }}>
                          <i className="fa-solid fa-circle-info" style={{ marginRight: "6px", color: "#eab308" }} />
                          Both players will trade squads. Adjustment coins will be processed once counterpart accepts and admin approves.
                        </div>

                        <button
                          type="button"
                          onClick={handleCopyToClipboard}
                          style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#fff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                        >
                          <i className="fa-brands fa-whatsapp" style={{ marginRight: "5px" }} /> Copy WhatsApp Text
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Team Transfer Requests Logs History */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <h3 style={{ fontSize: "0.9rem", color: "#fff", margin: 0 }}>Team Transfer History</h3>
                      {history.length > 0 && (
                        <button
                          type="button"
                          onClick={handleCopyHistory}
                          style={{ background: "none", border: "none", color: "#eab308", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}
                        >
                          <i className="fa-solid fa-copy" /> Copy Log
                        </button>
                      )}
                    </div>

                    {history.length === 0 ? (
                      <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "1rem 0" }}>
                        No transfers or swaps submitted yet this season.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: "180px", overflowY: "auto" }}>
                        {history.map((t: any) => {
                          let badgeBg = "rgba(234,179,8,0.15)";
                          let badgeColor = "#fbbf24";
                          if (t.status === "approved") {
                            badgeBg = "rgba(16,185,129,0.15)";
                            badgeColor = "#34d399";
                          } else if (t.status === "rejected") {
                            badgeBg = "rgba(239,68,68,0.15)";
                            badgeColor = "#f87171";
                          }

                          return (
                            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", background: "rgba(0,0,0,0.15)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.02)", fontSize: "0.75rem" }}>
                              <div>
                                <div style={{ color: "#fff", fontWeight: 600 }}>
                                  {t.request_type === "sale" ? `Sale: ${t.players[0]?.playerName}` : `Swap Deal`}
                                </div>
                                <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>
                                  {t.request_type === "sale" ? `${t.price} Coins` : `${t.players.length} players`}
                                </span>
                              </div>
                              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: badgeBg, color: badgeColor, textTransform: "uppercase" }}>
                                {t.status}
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

          </div>
        )}

      </div>
    </div>
  );
}
