"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchManagerRanking } from "@/utils/solo/serverActions";

export default function ManagerRanking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchManagerRanking();
        setManagers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleViewRankings = () => {
    alert("Manager rankings detail will be available soon! Check back for updates.");
  };

  const filteredManagers = managers.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  if (loading) {
      return <div style={{ color: 'white', textAlign: 'center', marginTop: '20vh' }}>Loading rankings...</div>;
  }

  return (
    <div className="portal-root-wrapper">
      {/* Background Grids and Glow Orbs */}
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {/* Main Container */}
      <div className="portal-container">
        {/* Navigation / Back Button */}
        <div style={{ width: "100%" }}>
          <Link href="/solo-tour" className="portal-btn btn-secondary back-link-btn" style={{ marginBottom: "2rem" }}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
        </div>

        {/* Header Section */}
        <header className="portal-header">
          <h1 className="portal-title">MANAGER RANKINGS</h1>
          <p className="portal-subtitle">
            Performance standings, tactical ratings, and legacy statistics for all active R2G managers.
          </p>
        </header>

        {/* Stats Summary Block */}
        <div className="club-info intro-block">
          <h2>Season 7 Rankings</h2>
          <p>
            Manager ratings calculated based on match result streaks, cup tournament runs, and achievements.
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

        {/* Search Bar */}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search managers by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search"></i>
        </div>

        {/* Managers Grid */}
        <div className="ranking-gallery" style={{ width: "100%", minHeight: "350px" }}>
          {filteredManagers.length > 0 ? (
            <ul className="moze-gallery pictures animate-gallery">
              {filteredManagers.map((manager, index) => {
                return (
                  <li 
                    key={manager.rank} 
                    className="manager-card animate-stat" 
                    style={{ animationDelay: `${(index % 8) * 0.05}s` }}
                  >
                    <div className="manager-img-frame">
                      <img src={manager.img} alt={manager.name} loading="lazy" />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="no-results-message">
              <i className="fas fa-user-slash"></i>
              <p>No managers found matching "{searchTerm}"</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="gallery-loader" style={{ marginTop: "3rem" }}>
          <button id="viewRankings" className="portal-btn btn-primary" onClick={handleViewRankings}>
            <i className="fas fa-trophy"></i> View Details Archive
          </button>
        </div>

        {/* Footer */}
        <footer className="portal-footer">
          <div className="portal-status-bar">
            <div className="status-item">
              <span className="status-indicator online"></span>
              Rankings: Live Update
            </div>
            <div className="status-item">
              R2G Career Mode
            </div>
          </div>
          <div className="portal-copyright">
            &copy; 2026 Road to Glory. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
}
