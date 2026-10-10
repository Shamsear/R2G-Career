"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "../../../portal.css";
import "./managers.css";
import { fetchManagers } from "@/utils/solo/serverActions";

function getClubLogo(manager: any) {
  if (manager.club_logo && typeof manager.club_logo === "string" && manager.club_logo.trim()) {
    return manager.club_logo;
  }
  const clubName = (manager.club || "").toUpperCase().trim();
  if (!clubName || clubName === "FREE AGENT" || clubName === "NO CLUB") {
    return "/assets/images/club-logos/FREE-AGENT.WEBP";
  }
  const clubSlug = clubName.replace(/\s+/g, "-");
  if (clubSlug === "PSG") return "/assets/images/club-logos/PARIS-SAINT-GERMAIN.webp";
  if (clubSlug === "MAN-UTD" || clubSlug === "MANCHESTER-UTD") return "/assets/images/club-logos/MANCHESTER-UNITED.webp";
  if (clubSlug === "BARCELONA" || clubSlug === "BARCA") return "/assets/images/club-logos/FC-BARCELONA.webp";
  if (clubSlug === "JUVENTUS-FC") return "/assets/images/club-logos/JUVENTUS.webp";
  if (clubSlug === "BAYERN") return "/assets/images/club-logos/BAYERN-MUNICH.webp";
  return `/assets/images/club-logos/${clubSlug}.webp`;
}

function generateStarRating(rating: any) {
  const numRating = parseInt(rating || 0);
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i === 3 && numRating >= 6) {
      stars.push(<i key={i} className="fas fa-sun star" style={{ color: '#fbbf24' }} />);
    } else if (i <= (numRating >= 6 ? 5 : numRating)) {
      stars.push(<i key={i} className="fas fa-star star" />);
    } else {
      stars.push(<i key={i} className="fas fa-star star empty" />);
    }
  }

  return (
    <div className="star-rating" title={`${numRating >= 6 ? 'Special Tier (☆☆ ☆ ☆☆)' : `${numRating} Star`} Manager`}>
      {stars}
    </div>
  );
}

export default function Managers() {
  const [managers, setManagers] = useState<any[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchManagers();
        if (data && data.error) throw new Error(data.error);
        data.sort((a: any, b: any) => {
          const rankA = a.rank ?? a.age ?? 999;
          const rankB = b.rank ?? b.age ?? 999;
          return Number(rankA) - Number(rankB);
        });
        const activeOnly = data.filter((m: any) => m.is_active !== false);
        setManagers(activeOnly);
        setFilteredManagers(activeOnly);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!searchTerm) { setFilteredManagers(managers); return; }
    const term = searchTerm.toLowerCase();
    setFilteredManagers(
      managers.filter(
        (m) =>
          m.name.toLowerCase().includes(term) || m.club.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, managers]);

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
            <i className="fa-solid fa-user-tie" />
            Managers Directory
          </div>
          <h1 className="portal-title">MANAGERS DIRECTORY</h1>
          <p className="portal-subtitle">
            Inspect active team tacticians, overall ratings, total club values, and trophy records.
          </p>
          <div className="onedrive-link" style={{ marginTop: "0.75rem" }}>
            <a
              href="https://1drv.ms/x/s!Al82cgGcN1PEpn6612xvHz2ksboe?e=4fx0yz"
              target="_blank"
              rel="noopener noreferrer"
              className="portal-btn btn-secondary"
            >
              <i className="fas fa-table" /> View Manager Data Ledger
            </a>
          </div>
        </div>

        {/* Search */}
        <div className="search-container">
          <div className="search-box">
            <i className="fas fa-search" />
            <input
              type="text"
              placeholder="Search managers or clubs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <i
                className="fas fa-times search-clear"
                onClick={() => setSearchTerm("")}
                style={{ cursor: "pointer", position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)" }}
              />
            )}
          </div>
        </div>

        {/* Managers grid */}
        <div className="managers-container">
          {loading ? (
            Array(8)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="manager-card skeleton">
                  <div className="skeleton-header" style={{ display: "flex", gap: "1rem", padding: "1.25rem" }}>
                    <div className="skeleton-photo" />
                    <div className="skeleton-info" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div className="skeleton-name" />
                      <div className="skeleton-club" />
                      <div className="skeleton-rating" />
                    </div>
                  </div>
                  <div className="skeleton-stats" style={{ padding: "0 1.25rem 1.25rem" }}>
                    {Array(4).fill(0).map((_, j) => <div key={j} className="skeleton-stat" />)}
                  </div>
                  <div className="skeleton-footer" style={{ padding: "0 1.25rem 1.25rem" }}>
                    <div className="skeleton-button" />
                  </div>
                </div>
              ))
          ) : error ? (
            <div className="no-results-message" style={{ borderStyle: "solid", borderColor: "rgba(239, 68, 68, 0.2)" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: "#ef4444" }} />
              <h3>Error loading managers data</h3>
              <p>{error}</p>
              <button className="portal-btn btn-secondary reset-btn" onClick={() => window.location.reload()}>
                Try Again
              </button>
            </div>
          ) : filteredManagers.length === 0 ? (
            <div className="no-results-message">
              <i className="fa-solid fa-user-slash" />
              <h3>No managers found</h3>
              <p>No tacticians match your search term &ldquo;{searchTerm}&rdquo;</p>
              <button className="portal-btn btn-secondary reset-btn" onClick={() => setSearchTerm("")}>
                Reset Filters
              </button>
            </div>
          ) : (
            filteredManagers.map((manager, i) => (
              <div key={i} className="manager-card active">
                <div className="manager-header">
                  <div
                    className="manager-header-logo-bg"
                    style={{
                      backgroundImage: `url('${getClubLogo(manager)}')`,
                    }}
                  />
                  <div
                    className="manager-photo"
                    style={{
                      backgroundImage: manager.photo 
                        ? `url('${manager.photo}')`
                        : `url('/assets/images/managers/${manager.name.toLowerCase().replace(/\s+/g, "-")}.webp'), url('/assets/images/default-manager.webp')`,
                    }}
                  />
                  <div className="manager-info">
                    <h3 className="manager-name">{manager.name}</h3>
                    <p className="manager-club" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                      <span>{manager.club}</span>
                      {manager.r2g_id && (
                        <span className="manager-id-badge" style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--text-secondary)" }}>
                          {manager.r2g_id}
                        </span>
                      )}
                    </p>
                    <div className="manager-rating">
                      {generateStarRating(manager.star_rating)}
                    </div>
                  </div>
                </div>

                <div className="manager-stats">
                  <div className="stat-group">
                    <span className="stat-label"><i className="fas fa-sort-numeric-up" />Rank</span>
                    <span className="stat-value">#{manager.rank || manager.age}</span>
                  </div>
                  <div className="stat-group">
                    <span className="stat-label"><i className="fas fa-star" />Overall</span>
                    <span className="stat-value">{manager.overall_rating}</span>
                  </div>
                  <div className="stat-group">
                    <span className="stat-label"><i className="fas fa-coins" />Club Value</span>
                    <span className="stat-value">{manager.club_total_value}M</span>
                  </div>
                  <div className="stat-group">
                    <span className="stat-label"><i className="fas fa-trophy" />Trophies</span>
                    <span className="stat-value">{manager.trophies || 0}</span>
                  </div>
                </div>

                <div className="manager-footer">
                  <Link
                    href={`/solo-tour/managers/${encodeURIComponent(manager.name)}`}
                    className="view-profile"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
