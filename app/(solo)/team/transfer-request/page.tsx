"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import "../../solo-tour/admin/admin.css";
import "../../portal.css";

import {
  fetchActiveTransferWindow,
  fetchRegisteredClubs,
  fetchClubPlayersWithContracts,
  submitTransferRequest,
  fetchActiveSeason
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

  // Selected players
  const [salePlayerId, setSalePlayerId] = useState<string>("");
  const [salePrice, setSalePrice] = useState<number>(80);

  const [swapSelectedMyIds, setSwapSelectedMyIds] = useState<number[]>([]);
  const [swapSelectedOtherIds, setSwapSelectedOtherIds] = useState<number[]>([]);
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

  // Load Requesting Squad
  useEffect(() => {
    if (selectedClubId && activeSeason) {
      setLoadingMySquad(true);
      setSalePlayerId("");
      setSwapSelectedMyIds([]);
      fetchClubPlayersWithContracts(parseInt(selectedClubId), activeSeason.id)
        .then(setMySquad)
        .catch(() => showToast("Error loading your team roster!"))
        .finally(() => setLoadingMySquad(false));
    } else {
      setMySquad([]);
      setSalePlayerId("");
      setSwapSelectedMyIds([]);
    }
  }, [selectedClubId, activeSeason]);

  // Load Target / Buyer Squad
  useEffect(() => {
    if (buyerClubId && activeSeason) {
      setLoadingOtherSquad(true);
      setSwapSelectedOtherIds([]);
      fetchClubPlayersWithContracts(parseInt(buyerClubId), activeSeason.id)
        .then(setOtherSquad)
        .catch(() => showToast("Error loading counterpart roster!"))
        .finally(() => setLoadingOtherSquad(false));
    } else {
      setOtherSquad([]);
      setSwapSelectedOtherIds([]);
    }
  }, [buyerClubId, activeSeason]);

  const myClubObj = useMemo(() => clubs.find(c => String(c.id) === selectedClubId), [clubs, selectedClubId]);
  const otherClubObj = useMemo(() => clubs.find(c => String(c.id) === buyerClubId), [clubs, buyerClubId]);

  const filteredMyClubs = useMemo(() => clubs.filter(c => c.name.toLowerCase().includes(myClubSearch.toLowerCase())), [clubs, myClubSearch]);
  const filteredOtherClubs = useMemo(() => clubs.filter(c => c.name.toLowerCase().includes(otherClubSearch.toLowerCase()) && String(c.id) !== selectedClubId), [clubs, otherClubSearch, selectedClubId]);

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
    if (swapSelectedMyIds.length === 0 || swapSelectedOtherIds.length === 0) {
      return showToast("Select players from both teams to configure swap!");
    }
    if (swapSelectedMyIds.length !== swapSelectedOtherIds.length) {
      return showToast("Swap deals must contain an equal number of players from both sides.");
    }

    startTransition(async () => {
      try {
        const payload: any[] = [];
        // Add requesting team players
        swapSelectedMyIds.forEach(id => {
          const p = mySquad.find(pl => pl.id === id);
          if (p) {
            payload.push({
              playerId: p.id,
              playerName: p.name,
              playerValue: Number(p.value || p.base_value),
              fromTeamId: Number(selectedClubId),
              toTeamId: Number(buyerClubId)
            });
          }
        });
        // Add target team players
        swapSelectedOtherIds.forEach(id => {
          const p = otherSquad.find(pl => pl.id === id);
          if (p) {
            payload.push({
              playerId: p.id,
              playerName: p.name,
              playerValue: Number(p.value || p.base_value),
              fromTeamId: Number(buyerClubId),
              toTeamId: Number(selectedClubId)
            });
          }
        });

        const res = await submitTransferRequest(
          Number(selectedClubId),
          Number(buyerClubId),
          "swap",
          swapAdjustment,
          payload
        );

        if (res.success) {
          showToast("Swap trade request submitted successfully!");
          setSwapSelectedMyIds([]);
          setSwapSelectedOtherIds([]);
          setBuyerClubId("");
          setSwapAdjustment(0);
        } else {
          showToast(res.error || "Failed to submit swap request.");
        }
      } catch {
        showToast("Error processing swap request.");
      }
    });
  };

  const toggleSwapMyPlayer = (id: number) => {
    setSwapSelectedMyIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleSwapOtherPlayer = (id: number) => {
    setSwapSelectedOtherIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
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
            Transfer & Swap Requests Hub
          </div>
          <h1 className="rws-hero-title">
            TEAM TRANSFER PORTAL
          </h1>
          <p className="rws-hero-sub">
            Sell players to other franchises or configure player swap trades. Adjust adjustment coins, select squads, and request team-to-team transfers.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            Loading transfer windows...
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
                    `Max ${twLimitText(activeWindow.transfer_limit)} requests per club`
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
                onClick={() => { setTransferType("sale"); setBuyerClubId(""); setSwapSelectedMyIds([]); setSwapSelectedOtherIds([]); }}
              >
                <i className="fa-solid fa-coins" style={{ marginRight: "6px" }} /> Sell Player
              </button>
              <button
                type="button"
                className={`portal-btn ${transferType === "swap" ? "btn-primary" : "btn-secondary"}`}
                style={{ background: transferType === "swap" ? "linear-gradient(135deg, #eab308, #ca8a04)" : "", color: transferType === "swap" ? "#000" : "" }}
                onClick={() => { setTransferType("swap"); setBuyerClubId(""); setSalePlayerId(""); }}
              >
                <i className="fa-solid fa-shuffle" style={{ marginRight: "6px" }} /> Swap Trade
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

            {/* TAB CONTENT: SALE */}
            {transferType === "sale" && selectedClubId && (
              <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "1.5rem" }}>
                <h3 style={{ fontSize: "0.95rem", color: "#fff", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  <i className="fa-solid fa-coins" style={{ color: "#eab308" }} />
                  Configure Direct Sale Details
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                  
                  {/* Select player to sell */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                      Choose player to sell
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
                          <option key={p.id} value={p.id}>{p.name} ({p.position}) - Value: {p.value || p.base_value} Coins</option>
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
                    fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase",
                    background: "linear-gradient(135deg, #eab308, #ca8a04)", color: "#000",
                    opacity: isPending || !salePlayerId || !buyerClubId ? 0.5 : 1, transition: "all 0.25s ease"
                  }}
                >
                  {isPending ? "Submitting Request..." : "Submit Sale Request"}
                </button>
              </div>
            )}

            {/* TAB CONTENT: SWAP */}
            {transferType === "swap" && selectedClubId && (
              <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "1.5rem" }}>
                
                {/* Select swap counterpart dropdown */}
                <div style={{ position: "relative", marginBottom: "1.5rem" }} data-other-club-dd>
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
                    {/* Dual squad selector columns */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                      
                      {/* Left: My Squad */}
                      <div>
                        <h4 style={{ fontSize: "0.8rem", color: "#fff", marginBottom: "8px", display: "flex", alignItems: "center", justifySpace: "between" }}>
                          <span>Your Squad ({swapSelectedMyIds.length} selected)</span>
                        </h4>
                        <div style={{ maxHeight: "250px", overflowY: "auto", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "4px" }}>
                          {loadingMySquad ? (
                            <div style={{ padding: "1.5rem", textAlignment: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Loading...</div>
                          ) : (
                            mySquad.map(p => {
                              const isChecked = swapSelectedMyIds.includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => toggleSwapMyPlayer(p.id)}
                                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", cursor: "pointer", background: isChecked ? "rgba(234,179,8,0.05)" : "", borderBottom: "1px solid rgba(255,255,255,0.02)" }}
                                >
                                  <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ accentColor: "#eab308" }} />
                                  <div style={{ fontSize: "0.78rem" }}>
                                    <div style={{ color: "#fff", fontWeight: 600 }}>{p.name}</div>
                                    <span style={{ color: "rgba(255,255,255,0.4)" }}>{p.position} &bull; {p.value || p.base_value} Coins</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Right: Counterpart Squad */}
                      <div>
                        <h4 style={{ fontSize: "0.8rem", color: "#fff", marginBottom: "8px" }}>
                          Counterpart Squad ({swapSelectedOtherIds.length} selected)
                        </h4>
                        <div style={{ maxHeight: "250px", overflowY: "auto", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "4px" }}>
                          {loadingOtherSquad ? (
                            <div style={{ padding: "1.5rem", textAlignment: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Loading...</div>
                          ) : (
                            otherSquad.map(p => {
                              const isChecked = swapSelectedOtherIds.includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => toggleSwapOtherPlayer(p.id)}
                                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", cursor: "pointer", background: isChecked ? "rgba(234,179,8,0.05)" : "", borderBottom: "1px solid rgba(255,255,255,0.02)" }}
                                >
                                  <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ accentColor: "#eab308" }} />
                                  <div style={{ fontSize: "0.78rem" }}>
                                    <div style={{ color: "#fff", fontWeight: 600 }}>{p.name}</div>
                                    <span style={{ color: "rgba(255,255,255,0.4)" }}>{p.position} &bull; {p.value || p.base_value} Coins</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Swap Cash Adjustment Settings */}
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "10px", marginBottom: "1.5rem" }}>
                      <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                        Adjustment Price / Coins (Paid by Requesting Team to Counterpart)
                      </label>
                      <input
                        type="number"
                        placeholder="Adjustment coins (e.g. 10 or 0)..."
                        value={swapAdjustment}
                        onChange={(e) => setSwapAdjustment(parseInt(e.target.value) || 0)}
                        style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.85rem", boxSizing: "border-box" }}
                      />
                      <span style={{ display: "block", fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                        Enter a positive value if you are paying additional coins, or negative if you are receiving coins.
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isPending || swapSelectedMyIds.length === 0 || swapSelectedOtherIds.length === 0 || swapSelectedMyIds.length !== swapSelectedOtherIds.length}
                      onClick={handleSendSwapRequest}
                      style={{
                        width: "100%", padding: "12px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
                        fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase",
                        background: "linear-gradient(135deg, #eab308, #ca8a04)", color: "#000",
                        opacity: isPending || swapSelectedMyIds.length === 0 || swapSelectedOtherIds.length === 0 || swapSelectedMyIds.length !== swapSelectedOtherIds.length ? 0.5 : 1, transition: "all 0.25s ease"
                      }}
                    >
                      {isPending ? "Submitting Request..." : `Submit Swap Request (${swapSelectedMyIds.length}-for-${swapSelectedOtherIds.length})`}
                    </button>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

function twLimitText(limit: number) {
  return limit === 0 ? "unlimited" : limit.toString();
}
