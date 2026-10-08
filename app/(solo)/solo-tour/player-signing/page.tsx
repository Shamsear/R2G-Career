"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "../../../portal.css";
import "./player-signing.css";
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
  // Multi-column sort state
  const [sortConfigs, setSortConfigs] = useState<Array<{ key: string; direction: "asc" | "desc" }>>([]);
  const [multiSortMode, setMultiSortMode] = useState(false);
  
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

  // Filter and Multi-Sort players
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

    // Multi-column sorting
    if (sortConfigs.length > 0) {
      const posOrder: Record<string, number> = { GK: 1, CB: 2, LB: 3, RB: 4, DM: 5, CM: 6, AM: 7, LW: 8, RW: 9, ST: 10 };

      result.sort((a, b) => {
        for (const sort of sortConfigs) {
          let diff = 0;

          if (sort.key === "rating" || sort.key === "bidAmount") {
            const numA = Number(a[sort.key]) || 0;
            const numB = Number(b[sort.key]) || 0;
            diff = sort.direction === "asc" ? numA - numB : numB - numA;
          } else if (sort.key === "valueStr") {
            const numA = Number(a.rating) || 0;
            const numB = Number(b.rating) || 0;
            diff = sort.direction === "asc" ? numA - numB : numB - numA;
          } else if (sort.key === "position") {
            const ordA = posOrder[String(a.position || "").toUpperCase()] || 99;
            const ordB = posOrder[String(b.position || "").toUpperCase()] || 99;
            if (ordA !== ordB) {
              diff = sort.direction === "asc" ? ordA - ordB : ordB - ordA;
            } else {
              diff = sort.direction === "asc"
                ? String(a.position || "").localeCompare(String(b.position || ""))
                : String(b.position || "").localeCompare(String(a.position || ""));
            }
          } else if (sort.key === "contract") {
            const matchA = String(a.contract || "").match(/(\d+)/);
            const matchB = String(b.contract || "").match(/(\d+)/);
            const numA = matchA ? parseInt(matchA[1], 10) : 0;
            const numB = matchB ? parseInt(matchB[1], 10) : 0;
            if (numA !== numB && (numA > 0 || numB > 0)) {
              diff = sort.direction === "asc" ? numA - numB : numB - numA;
            } else {
              const strA = String(a.contract || "").toLowerCase().trim();
              const strB = String(b.contract || "").toLowerCase().trim();
              diff = sort.direction === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
            }
          } else {
            const strA = String(a[sort.key] ?? "").toLowerCase().trim();
            const strB = String(b[sort.key] ?? "").toLowerCase().trim();
            diff = sort.direction === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
          }

          if (diff !== 0) return diff;
        }
        return 0;
      });
    }

    return result;
  }, [players, activeTab, searchTerm, sortConfigs]);

  // Request sort handler with Shift-Click or Multi-Sort Mode support
  const requestSort = (key: string, isShiftPressed = false) => {
    const isMulti = isShiftPressed || multiSortMode;
    const existingIndex = sortConfigs.findIndex((s) => s.key === key);

    if (isMulti) {
      if (existingIndex > -1) {
        const current = sortConfigs[existingIndex];
        if (current.direction === "asc") {
          // Flip to desc
          const updated = [...sortConfigs];
          updated[existingIndex] = { key, direction: "desc" };
          setSortConfigs(updated);
        } else {
          // Remove from multi-sort
          setSortConfigs(sortConfigs.filter((s) => s.key !== key));
        }
      } else {
        // Append as secondary/tertiary sort
        setSortConfigs([...sortConfigs, { key, direction: "asc" }]);
      }
    } else {
      if (existingIndex > -1 && sortConfigs.length === 1) {
        const current = sortConfigs[0];
        if (current.direction === "asc") {
          setSortConfigs([{ key, direction: "desc" }]);
        } else {
          setSortConfigs([]);
        }
      } else {
        setSortConfigs([{ key, direction: "asc" }]);
      }
    }
    setCurrentPage(1);
  };

  const removeSortKey = (key: string) => {
    setSortConfigs((prev) => prev.filter((s) => s.key !== key));
    setCurrentPage(1);
  };

  const toggleSortDirection = (key: string) => {
    setSortConfigs((prev) =>
      prev.map((s) => (s.key === key ? { ...s, direction: s.direction === "asc" ? "desc" : "asc" } : s))
    );
    setCurrentPage(1);
  };

  const clearAllSorts = () => {
    setSortConfigs([]);
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

  const getSortMeta = (key: string) => {
    const idx = sortConfigs.findIndex((s) => s.key === key);
    if (idx === -1) return null;
    return {
      direction: sortConfigs[idx].direction,
      priority: idx + 1,
      total: sortConfigs.length,
    };
  };

  const renderSortIndicator = (key: string) => {
    const meta = getSortMeta(key);
    if (!meta) {
      return <i className="fas fa-sort sort-icon" />;
    }

    return (
      <span className="sort-indicator-badge">
        <i className={`fas ${meta.direction === "asc" ? "fa-sort-up" : "fa-sort-down"} sort-icon-active`} />
        {meta.total > 1 && <span className="sort-priority-num">{meta.priority}</span>}
      </span>
    );
  };

  const COLUMN_LABELS: Record<string, string> = {
    name: "Player Name",
    position: "Position",
    rating: "Base Value",
    valueStr: "Rarity",
    team: "Signing Club",
    bidAmount: "Signing Value",
    contract: "Contract",
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
            <i className="fas fa-search search-icon" />
            <input
              type="text"
              placeholder="Search player, team, or position..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => handleSearchChange("")}
                title="Clear search"
                aria-label="Clear search"
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

        {/* Multi-Sort Controls & Active Sort Chips */}
        <div className="multi-sort-container">
          <div className="multi-sort-left">
            <button
              type="button"
              className={`multi-sort-mode-btn ${multiSortMode ? "active" : ""}`}
              onClick={() => setMultiSortMode((prev) => !prev)}
              title="When enabled, clicking headers adds them to multi-sort criteria without needing to hold Shift"
            >
              <i className="fa-solid fa-layer-group" />
              <span>Multi-Sort Mode: {multiSortMode ? "ON" : "OFF"}</span>
            </button>
            <span className="multi-sort-hint">
              <i className="fa-solid fa-circle-info" />
              <span>Hold <strong>Shift + Click</strong> on table headers to sort by multiple columns</span>
            </span>
          </div>

          {sortConfigs.length > 0 && (
            <div className="active-sort-pills">
              <span className="active-sort-label">Active Sorts:</span>
              {sortConfigs.map((sort, idx) => (
                <div key={sort.key} className="sort-chip">
                  <button
                    type="button"
                    className="sort-chip-toggle"
                    onClick={() => toggleSortDirection(sort.key)}
                    title={`Priority #${idx + 1}: ${COLUMN_LABELS[sort.key] || sort.key} (${sort.direction.toUpperCase()}). Click to flip.`}
                  >
                    <span className="sort-chip-priority">#{idx + 1}</span>
                    <span className="sort-chip-name">{COLUMN_LABELS[sort.key] || sort.key}</span>
                    <i className={`fas ${sort.direction === "asc" ? "fa-arrow-up-long" : "fa-arrow-down-long"}`} />
                  </button>
                  <button
                    type="button"
                    className="sort-chip-remove"
                    onClick={() => removeSortKey(sort.key)}
                    title={`Remove ${COLUMN_LABELS[sort.key] || sort.key} sort`}
                    aria-label={`Remove ${COLUMN_LABELS[sort.key] || sort.key} sort`}
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="clear-sorts-btn"
                onClick={clearAllSorts}
                title="Reset all column sorting"
              >
                <i className="fa-solid fa-rotate-left" /> Clear
              </button>
            </div>
          )}
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
                    onClick={(e) => requestSort("name", e.shiftKey)}
                    className={getSortMeta("name") ? "sorted" : ""}
                    title="Click to sort, Shift+Click to add secondary sort"
                  >
                    Player Name {renderSortIndicator("name")}
                  </th>
                  {activeTab === "all" && (
                    <th
                      onClick={(e) => requestSort("position", e.shiftKey)}
                      className={getSortMeta("position") ? "sorted" : ""}
                      title="Click to sort, Shift+Click to add secondary sort"
                    >
                      Position {renderSortIndicator("position")}
                    </th>
                  )}
                  <th
                    onClick={(e) => requestSort("rating", e.shiftKey)}
                    className={getSortMeta("rating") ? "sorted" : ""}
                    title="Click to sort, Shift+Click to add secondary sort"
                  >
                    Base Value {renderSortIndicator("rating")}
                  </th>
                  <th
                    onClick={(e) => requestSort("valueStr", e.shiftKey)}
                    className={getSortMeta("valueStr") ? "sorted" : ""}
                    title="Click to sort, Shift+Click to add secondary sort"
                  >
                    Rarity {renderSortIndicator("valueStr")}
                  </th>
                  <th
                    onClick={(e) => requestSort("team", e.shiftKey)}
                    className={getSortMeta("team") ? "sorted" : ""}
                    title="Click to sort, Shift+Click to add secondary sort"
                  >
                    Signing Club {renderSortIndicator("team")}
                  </th>
                  <th
                    onClick={(e) => requestSort("bidAmount", e.shiftKey)}
                    className={getSortMeta("bidAmount") ? "sorted" : ""}
                    title="Click to sort, Shift+Click to add secondary sort"
                  >
                    Signing Value {renderSortIndicator("bidAmount")}
                  </th>
                  <th
                    onClick={(e) => requestSort("contract", e.shiftKey)}
                    className={getSortMeta("contract") ? "sorted" : ""}
                    title="Click to sort, Shift+Click to add secondary sort"
                  >
                    Contract {renderSortIndicator("contract")}
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
              Showing <span className="highlight">{startIndex + 1}–{Math.min(endIndex, filteredPlayers.length)}</span> of <span className="highlight">{filteredPlayers.length}</span> players
            </div>
            <div className="pagination-controls">
              <button
                className="page-btn nav-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <i className="fas fa-chevron-left" />
                <span>Prev</span>
              </button>
              
              {getPageNumbers().map((page, idx) =>
                page === "ellipsis" ? (
                  <span className="page-ellipsis" key={`ellipsis-${idx}`}>•••</span>
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
                className="page-btn nav-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                title="Next Page"
              >
                <span>Next</span>
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
