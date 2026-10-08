"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "../../../portal.css";
import { POSITIONS } from "@/utils/solo/playerAuctionFetcher";
import { fetchPlayerAuctionData } from "@/utils/solo/serverActions";

function getPlayerValue(baseValue: any) {
  switch (Number(baseValue)) {
    case 150: return "Legend";
    case 120: return "5★ Standard";
    case 100: return "4★ Standard";
    case 80:  return "3★ Standard";
    default:  return "Unknown";
  }
}

function getRatingClass(baseValue: any) {
  switch (Number(baseValue)) {
    case 150: return "five-star-legend";
    case 120: return "five-star-standard";
    case 100: return "four-star-standard";
    case 80:  return "three-star-standard";
    default:  return "unknown-rating";
  }
}

function getTierBadgeLabel(baseValue: any) {
  switch (Number(baseValue)) {
    case 150: return { label: "Legend",    cls: "five-star-legend" };
    case 120: return { label: "5★",        cls: "five-star-standard" };
    case 100: return { label: "4★",        cls: "four-star-standard" };
    case 80:  return { label: "3★",        cls: "three-star-standard" };
    default:  return { label: "—",         cls: "" };
  }
}

function PlayerSigningContent() {
  const searchParams = useSearchParams();

  const [players, setPlayers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "all");
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(() => {
    const p = Number(searchParams.get("page"));
    return !isNaN(p) && p > 0 ? p : 1;
  });
  const itemsPerPage = 50;

  // Fetch auction data from server action
  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchPlayerAuctionData();
        setPlayers(data || []);
      } catch {
        setError("Failed to load auction data from database.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync state from URL search params when navigation/history changes
  useEffect(() => {
    const qSearch = searchParams.get("search");
    const qTab = searchParams.get("tab");
    const qPage = searchParams.get("page");

    if (qSearch !== null && qSearch !== searchTerm) {
      setSearchTerm(qSearch);
    }
    if (qTab !== null && qTab !== activeTab) {
      setActiveTab(qTab);
    }
    if (qPage !== null && !isNaN(Number(qPage))) {
      const pNum = Math.max(1, Number(qPage));
      if (pNum !== currentPage) setCurrentPage(pNum);
    }
  }, [searchParams]);

  // Sync state to URL cleanly without full page refreshes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();
    if (activeTab && activeTab !== "all") params.set("tab", activeTab);
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (currentPage > 1) params.set("page", currentPage.toString());

    const queryString = params.toString();
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;

    if (window.location.search !== (queryString ? `?${queryString}` : "")) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [activeTab, searchTerm, currentPage]);

  // Filter and Sort players
  const filteredPlayers = useMemo(() => {
    let result = [...players];

    // Filter by position tab
    if (activeTab !== "all") {
      result = result.filter((p) => {
        const pos = String(p.position || "").toUpperCase().trim();
        let mapped = pos;
        if (pos.includes("GOALKEEPER") || pos === "G" || pos === "GOALIE" || pos === "GK") mapped = "GK";
        else if (pos.includes("CENTER BACK") || pos === "CD" || pos === "DC" || pos === "CB" || pos.includes("CENTRE BACK")) mapped = "CB";
        else if (pos.includes("LEFT BACK") || pos === "LWB" || pos === "LD" || pos === "LB" || pos === "LFB") mapped = "LB";
        else if (pos.includes("RIGHT BACK") || pos === "RWB" || pos === "RD" || pos === "RB" || pos === "RFB") mapped = "RB";
        else if (pos.includes("CENTER MID") || pos === "CMF" || pos === "MC" || pos === "CM" || pos.includes("CENTRE MID")) mapped = "CM";
        else if (pos.includes("DEFENSIVE MID") || pos === "CDM" || pos === "DMF" || pos === "DM" || pos === "DCM") mapped = "DM";
        else if (pos.includes("ATTACKING MID") || pos === "CAM" || pos === "AMF" || pos === "AM" || pos === "ACM") mapped = "AM";
        else if (pos.includes("STRIKER") || pos === "FW" || pos === "ST" || pos === "CF" || pos.includes("FORWARD")) mapped = "ST";
        else if (pos.includes("RIGHT WING") || pos === "RM" || pos === "RMF" || pos === "RW" || pos === "RF") mapped = "RW";
        else if (pos.includes("LEFT WING") || pos === "LM" || pos === "LMF" || pos === "LW" || pos === "LF") mapped = "LW";
        return mapped === activeTab;
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((p) => {
        const nameMatch = String(p.name || "").toLowerCase().includes(term);
        const teamMatch = String(p.team || "").toLowerCase().includes(term);
        const posMatch = String(p.position || "").toLowerCase().includes(term);
        const contractMatch = String(p.contract || "").toLowerCase().includes(term);
        return nameMatch || teamMatch || posMatch || contractMatch;
      });
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === "valueStr") {
          valA = getPlayerValue(a.rating);
          valB = getPlayerValue(b.rating);
        }

        if (sortConfig.key === "rating" || sortConfig.key === "bidAmount") {
          const numA = Number(valA) || 0;
          const numB = Number(valB) || 0;
          return sortConfig.direction === "asc" ? numA - numB : numB - numA;
        }

        const strA = String(valA ?? "").toLowerCase().trim();
        const strB = String(valB ?? "").toLowerCase().trim();
        return sortConfig.direction === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [players, activeTab, searchTerm, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleTabChange = (pos: string) => {
    setActiveTab(pos);
    setCurrentPage(1);
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <i className="fas fa-sort sort-icon" />;
    return sortConfig.direction === "asc"
      ? <i className="fas fa-sort-up sort-icon" />
      : <i className="fas fa-sort-down sort-icon" />;
  };

  const colCount = activeTab === "all" ? 7 : 6;

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPlayers = filteredPlayers.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/career-mode" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Career Mode
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge">
            <i className="fa-solid fa-gavel" />
            Player Signings
          </div>
          <h1 className="portal-title">PLAYER SIGNINGS</h1>
          <p className="portal-subtitle">
            Inspect active player values, live transfer auction results, and contract payrolls for
            Season 2025-2026.
          </p>
        </div>

        {/* Stats ribbon */}
        <div className="portal-stats-ribbon">
          <div className="stat-pill">
            <i className="fa-solid fa-users" />
            <span>Total Records: {players.length}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <i className="fa-solid fa-filter" />
            <span>Filtered: {filteredPlayers.length}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <span className="live-dot" />
            <span>Ledger: Connected</span>
          </div>
        </div>

        {/* Search */}
        <div className="search-container">
          <div className="search-box">
            <i className="fas fa-search" />
            <input
              type="text"
              placeholder="Search player, team, or position..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  padding: "0 0.5rem"
                }}
                title="Clear search"
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>
        </div>

        {/* Position tabs */}
        <div className="tabs-filter">
          <button
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => handleTabChange("all")}
          >
            All Positions
          </button>
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              className={`tab-btn ${activeTab === pos ? "active" : ""}`}
              onClick={() => handleTabChange(pos)}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="r2g-loading">
            <div className="r2g-spinner" />
            <span>Loading Player Database...</span>
          </div>
        ) : (
          <div className="player-db-table-wrapper">
            <table className="player-db-table">
              <thead>
                <tr>
                  <th
                    onClick={() => requestSort("name")}
                    className={sortConfig?.key === "name" ? "sorted" : ""}
                  >
                    Player Name {renderSortIcon("name")}
                  </th>
                  {activeTab === "all" && (
                    <th
                      onClick={() => requestSort("position")}
                      className={sortConfig?.key === "position" ? "sorted" : ""}
                    >
                      Position {renderSortIcon("position")}
                    </th>
                  )}
                  <th
                    onClick={() => requestSort("rating")}
                    className={sortConfig?.key === "rating" ? "sorted" : ""}
                  >
                    Base Value {renderSortIcon("rating")}
                  </th>
                  <th
                    onClick={() => requestSort("valueStr")}
                    className={sortConfig?.key === "valueStr" ? "sorted" : ""}
                  >
                    Rarity {renderSortIcon("valueStr")}
                  </th>
                  <th
                    onClick={() => requestSort("team")}
                    className={sortConfig?.key === "team" ? "sorted" : ""}
                  >
                    Signing Club {renderSortIcon("team")}
                  </th>
                  <th
                    onClick={() => requestSort("bidAmount")}
                    className={sortConfig?.key === "bidAmount" ? "sorted" : ""}
                  >
                    Signing Value {renderSortIcon("bidAmount")}
                  </th>
                  <th
                    onClick={() => requestSort("contract")}
                    className={sortConfig?.key === "contract" ? "sorted" : ""}
                  >
                    Contract {renderSortIcon("contract")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {error && filteredPlayers.length === 0 && (
                  <tr>
                    <td colSpan={colCount} style={{ textAlign: "center", padding: "2.5rem", color: "var(--red-error)" }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "0.5rem" }} />
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredPlayers.length === 0 && (
                  <tr>
                    <td colSpan={colCount} style={{ textAlign: "center", padding: "2.5rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", color: "var(--text-secondary)" }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ fontSize: "1.5rem", color: "var(--text-muted)" }} />
                        <span>No players found for &ldquo;{searchTerm}&rdquo; in {activeTab === "all" ? "any position" : activeTab}</span>
                        <button
                          className="portal-btn btn-secondary"
                          onClick={() => { setSearchTerm(""); setActiveTab("all"); setCurrentPage(1); }}
                        >
                          Reset Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {currentPlayers.map((player) => {
                  const tier = getTierBadgeLabel(player.rating);
                  return (
                    <tr key={player.rowId} className={getRatingClass(player.rating)}>
                      <td data-label="Player">{player.name}</td>
                      {activeTab === "all" && <td data-label="Position">{player.position}</td>}
                      <td data-label="Base Value">{player.rating}</td>
                      <td data-label="Rarity">
                        <span className={`table-tier-badge ${tier.cls}`}>{tier.label}</span>
                      </td>
                      <td data-label="Signing Club">{player.team || "Unsold"}</td>
                      <td data-label="Signing Value">{player.bidAmount ? player.bidAmount : "Not Bid"}</td>
                      <td data-label="Contract">{player.contract || "N/A"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredPlayers.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredPlayers.length)} of {filteredPlayers.length} players
            </div>
            <div className="pagination-controls">
              <button
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <i className="fas fa-chevron-left" />
              </button>
              
              {getPageNumbers().map((page, idx) =>
                page === "ellipsis" ? (
                  <span className="page-ellipsis" key={`ellipsis-${idx}`}>...</span>
                ) : (
                  <button
                    key={page}
                    className={`page-btn ${currentPage === page ? "active" : ""}`}
                    onClick={() => setCurrentPage(page as number)}
                  >
                    {page}
                  </button>
                )
              )}
              
              <button
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlayerSigning() {
  return (
    <Suspense fallback={
      <div className="portal-root-wrapper" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="r2g-loading">
          <div className="r2g-spinner" />
          <span>Loading Player Database...</span>
        </div>
      </div>
    }>
      <PlayerSigningContent />
    </Suspense>
  );
}
