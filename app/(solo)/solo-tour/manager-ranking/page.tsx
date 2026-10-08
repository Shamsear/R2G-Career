"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { fetchManagerRanking } from "@/utils/solo/serverActions";
import "../../../portal.css";

export default function ManagerRanking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load: fetch all-time manager rankings
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const rankingData = await fetchManagerRanking();
        setManagers(rankingData || []);
      } catch (err) {
        console.error("Error loading manager rankings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredManagers = useMemo(() => {
    return managers.filter((m) =>
      (m.name || "").toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      (m.club_name || "").toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [managers, searchTerm]);

  // Dynamic statistics for all managers
  const overallStats = useMemo(() => {
    const totalRanked = managers.length;
    const totalMatches = managers.reduce((acc, m) => acc + (m.matches_played || 0), 0);
    const topManager = managers.length > 0 ? managers[0] : null;
    const topScore = topManager ? topManager.score : 0;
    return {
      totalRanked,
      totalMatches,
      topScore,
      topManagerName: topManager?.name || "N/A"
    };
  }, [managers]);

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge">
            <i className="fa-solid fa-ranking-star" />
            Solo Career Rankings
          </div>
          <h1 className="portal-title">MANAGER RANKINGS</h1>
          <p className="portal-subtitle">
            Overall career standings, tactical ratings, and official points leaderboard for all active R2G managers.
          </p>
        </div>

        {/* Stats Summary Block */}
        <div className="club-info intro-block" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#fff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>
                Official Manager Standings
              </h2>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Career ratings calculated across league campaigns, knockout cups, tournament trophies, and managerial achievements.
              </p>
            </div>
            {overallStats.topManagerName !== "N/A" && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(244, 63, 94, 0.15) 100%)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                borderRadius: "10px",
                padding: "6px 14px",
                fontSize: "0.8rem",
                color: "#fbbf24",
                fontWeight: 700
              }}>
                <i className="fa-solid fa-crown" /> Leader: <span style={{ color: "#fff" }}>{overallStats.topManagerName}</span> ({overallStats.topScore} PTS)
              </div>
            )}
          </div>

          <div className="stats-preview" style={{ marginTop: "1.5rem" }}>
            <div className="stat-item animate-stat">
              <div className="stat-value">{overallStats.totalRanked}</div>
              <div className="stat-label">Ranked Managers</div>
            </div>
            <div className="stat-item animate-stat" style={{ animationDelay: "0.1s" }}>
              <div className="stat-value">{overallStats.totalMatches > 0 ? `${overallStats.totalMatches}+` : "Active"}</div>
              <div className="stat-label">Career Matches</div>
            </div>
            <div className="stat-item animate-stat" style={{ animationDelay: "0.2s" }}>
              <div className="stat-value">{overallStats.topScore}</div>
              <div className="stat-label">Top Points Score</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="search-box" style={{ maxWidth: "480px", alignSelf: "center", marginBottom: "2rem" }}>
          <i className="fas fa-search" />
          <input
            type="text"
            placeholder="Search managers by name or club..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Gallery */}
        <div className="ranking-gallery">
          {loading ? (
            <div className="r2g-loading" style={{ padding: "4rem 0", textAlign: "center" }}>
              <div className="r2g-spinner" />
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>Loading manager rankings...</span>
            </div>
          ) : filteredManagers.length > 0 ? (
            <ul className="moze-gallery pictures animate-gallery" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1.25rem" }}>
              {filteredManagers.map((manager, index) => {
                const rankNum = manager.rank != null ? manager.rank : index + 1;
                const isGold = rankNum === 1;
                const isSilver = rankNum === 2;
                const isBronze = rankNum === 3;
                const isPodium = isGold || isSilver || isBronze;

                const rankBadgeBg = isGold 
                  ? "linear-gradient(135deg, #fbbf24, #d97706)"
                  : isSilver
                  ? "linear-gradient(135deg, #e2e8f0, #94a3b8)"
                  : isBronze
                  ? "linear-gradient(135deg, #f97316, #c2410c)"
                  : "rgba(244, 63, 94, 0.9)";

                const cardBorder = isGold
                  ? "1px solid rgba(251, 191, 36, 0.45)"
                  : isSilver
                  ? "1px solid rgba(226, 232, 240, 0.35)"
                  : isBronze
                  ? "1px solid rgba(249, 115, 22, 0.35)"
                  : "1px solid rgba(255, 255, 255, 0.07)";

                const cardBg = isGold
                  ? "linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(14, 16, 26, 0.85) 100%)"
                  : isSilver
                  ? "linear-gradient(135deg, rgba(226, 232, 240, 0.05) 0%, rgba(14, 16, 26, 0.85) 100%)"
                  : isBronze
                  ? "linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(14, 16, 26, 0.85) 100%)"
                  : "rgba(14, 16, 26, 0.75)";

                const initials = (manager.name || "M").slice(0, 2).toUpperCase();

                return (
                  <li
                    key={manager.id || manager.rank || index}
                    className="manager-card-rank animate-stat"
                    style={{
                      animationDelay: `${(index % 12) * 0.04}s`,
                      background: cardBg,
                      border: cardBorder,
                      boxShadow: isGold ? "0 6px 20px rgba(251, 191, 36, 0.15)" : undefined,
                      padding: "0.75rem",
                      borderRadius: "14px",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <Link
                      href={`/solo-tour/managers/${encodeURIComponent(manager.name)}`}
                      style={{
                        textDecoration: "none",
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%"
                      }}
                    >
                      {/* Image Frame */}
                      <div
                        className="manager-img-frame"
                        style={{
                          aspectRatio: "1 / 1",
                          borderRadius: "10px",
                          overflow: "hidden",
                          position: "relative",
                          background: "rgba(0, 0, 0, 0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: isPodium ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)"
                        }}
                      >
                        {manager.img ? (
                          <img
                            src={manager.img}
                            alt={manager.name}
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.5rem",
                            fontWeight: 800,
                            fontFamily: "var(--font-display)",
                            color: isGold ? "#fbbf24" : "rgba(255,255,255,0.6)",
                            background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.4))"
                          }}>
                            {initials}
                          </div>
                        )}

                        {/* Rank Badge */}
                        <span
                          className="manager-rank-badge"
                          style={{
                            background: rankBadgeBg,
                            color: isSilver ? "#0f172a" : "#ffffff",
                            fontWeight: 900,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            letterSpacing: "0.5px"
                          }}
                        >
                          {isGold && <i className="fa-solid fa-crown" style={{ marginRight: "3px" }} />}
                          #{rankNum}
                        </span>

                        {/* Trophies Badge if available */}
                        {manager.trophies > 0 && (
                          <span
                            style={{
                              position: "absolute",
                              bottom: "6px",
                              right: "6px",
                              background: "rgba(0,0,0,0.65)",
                              backdropFilter: "blur(4px)",
                              border: "1px solid rgba(251, 191, 36, 0.4)",
                              color: "#fbbf24",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: "4px"
                            }}
                            title={`${manager.trophies} Major Competitions / Trophies`}
                          >
                            🏆 {manager.trophies}
                          </span>
                        )}
                      </div>

                      {/* Card Info */}
                      <div className="manager-card-info" style={{ marginTop: "0.6rem", textAlign: "center" }}>
                        <span
                          className="manager-card-name"
                          title={manager.name}
                          style={{
                            fontSize: "0.92rem",
                            fontWeight: 700,
                            color: isGold ? "#fbbf24" : "#ffffff",
                            fontFamily: "var(--font-display)"
                          }}
                        >
                          {manager.name}
                        </span>

                        {manager.club_name && manager.club_name !== manager.name && (
                          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {manager.club_name}
                          </span>
                        )}

                        <div style={{ marginTop: "4px" }}>
                          <span className="manager-card-score" style={{ fontSize: "0.85rem", fontWeight: 800 }}>
                            {manager.score || 0} <span style={{ fontSize: "0.65rem", opacity: 0.75 }}>PTS</span>
                          </span>
                        </div>

                        {/* Match Stats row if played */}
                        {manager.matches_played > 0 && (
                          <div style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "6px",
                            fontSize: "0.62rem",
                            color: "rgba(255,255,255,0.4)",
                            marginTop: "4px",
                            fontFamily: "var(--font-mono)"
                          }}>
                            <span style={{ color: "#4ade80" }}>{manager.wins}W</span>
                            <span>{manager.draws}D</span>
                            <span style={{ color: "#f87171" }}>{manager.losses}L</span>
                            {manager.clean_sheets > 0 && <span style={{ color: "#38bdf8" }}>{manager.clean_sheets}CS</span>}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="no-results-message" style={{ padding: "4rem 2rem", textAlign: "center" }}>
              <i className="fas fa-user-slash" style={{ fontSize: "2.5rem", opacity: 0.3, marginBottom: "1rem" }} />
              <h3 style={{ color: "#fff", fontSize: "1.1rem" }}>No Rankings Found</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                {searchTerm ? `No managers found matching "${searchTerm}".` : "No manager rankings available."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
