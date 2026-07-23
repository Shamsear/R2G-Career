"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchManagerRanking, fetchActiveSeason } from "@/utils/solo/serverActions";
import "../../../portal.css";

export default function ManagerRanking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonNum, setSeasonNum] = useState<number>(7);

  useEffect(() => {
    async function loadData() {
      try {
        const [rankingData, seasonData] = await Promise.all([
          fetchManagerRanking(),
          fetchActiveSeason()
        ]);
        setManagers(rankingData);
        if (seasonData && seasonData.season_number) {
          setSeasonNum(seasonData.season_number);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredManagers = managers.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
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
            Manager Rankings
          </div>
          <h1 className="portal-title">MANAGER RANKINGS</h1>
          <p className="portal-subtitle">
            Performance standings, tactical ratings, and legacy statistics for all active R2G
            managers.
          </p>
        </div>

        {/* Stats block */}
        <div className="club-info intro-block">
          <h2>Season {seasonNum} Rankings</h2>
          <p>
            Manager ratings calculated based on match result streaks, cup tournament runs, and
            achievements.
          </p>
          <div className="stats-preview">
            <div className="stat-item animate-stat">
              <div className="stat-value">50+</div>
              <div className="stat-label">Active Matches</div>
            </div>
            <div className="stat-item animate-stat" style={{ animationDelay: "0.1s" }}>
              <div className="stat-value">15</div>
              <div className="stat-label">Criteria Metrics</div>
            </div>
            <div className="stat-item animate-stat" style={{ animationDelay: "0.2s" }}>
              <div className="stat-value">28</div>
              <div className="stat-label">Ranked Managers</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="search-box" style={{ maxWidth: "480px", alignSelf: "center" }}>
          <i className="fas fa-search" />
          <input
            type="text"
            placeholder="Search managers by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Gallery */}
        <div className="ranking-gallery">
          {loading ? (
            <div className="r2g-loading">
              <div className="r2g-spinner" />
              <span>Loading rankings...</span>
            </div>
          ) : filteredManagers.length > 0 ? (
            <ul className="moze-gallery pictures animate-gallery">
              {filteredManagers.map((manager, index) => (
                <li
                  key={manager.rank || index}
                  className="manager-card-rank animate-stat"
                  style={{ animationDelay: `${(index % 8) * 0.05}s` }}
                >
                  <Link href={`/solo-tour/managers/${encodeURIComponent(manager.name)}`} style={{ textDecoration: 'none', width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="manager-img-frame">
                      <img src={manager.img} alt={manager.name} loading="lazy" />
                      <span className="manager-rank-badge">#{manager.rank || index + 1}</span>
                    </div>
                    <div className="manager-card-info">
                      <span className="manager-card-name" title={manager.name}>{manager.name}</span>
                      <span className="manager-card-score">{manager.score || 0} PTS</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-results-message">
              <i className="fas fa-user-slash" />
              <p>No managers found matching &ldquo;{searchTerm}&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
