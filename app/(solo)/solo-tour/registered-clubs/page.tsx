"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import "../../../portal.css";
import { fetchRegisteredClubs } from "@/utils/solo/serverActions";

export default function RegisteredClubs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchRegisteredClubs();
        setClubs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredClubs = clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.manager.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        {/* Header + search in one row */}
        <div className="clubs-header-container">
          <h1 className="portal-section-title">
            <i className="fas fa-shield-alt" /> Registered Clubs
          </h1>
          <div className="clubs-search-wrapper">
            <i className="fas fa-search search-icon" />
            <input
              type="text"
              className="clubs-search-input"
              placeholder="Search by club or manager..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Stats ribbon */}
        <div className="portal-stats-ribbon" style={{ alignSelf: "flex-start" }}>
          <div className="stat-pill">
            <i className="fa-solid fa-shield-halved" />
            <span>Total Clubs: {clubs.length}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <span className="live-dot" />
            <span>Season Active</span>
          </div>
        </div>

        {/* Clubs grid */}
        {loading ? (
          <div className="clubs-grid">
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="club-card portal-glass-card skeleton" style={{ minHeight: 120 }} />
              ))}
          </div>
        ) : (
          <div className="clubs-grid">
            {filteredClubs.length > 0 ? (
              filteredClubs.map((club, index) => (
                <div key={index} className="club-card portal-glass-card">
                  <div className="club-card-top">
                    <div className="club-manager-img">
                      <img
                        src={club.image || "/assets/images/placeholder.webp"}
                        alt={club.manager}
                      />
                    </div>
                    <div className="club-info">
                      <h3 className="club-name">{club.name}</h3>
                      <p className="club-manager">
                        <i className="fas fa-user-tie" /> {club.manager} {club.r2g_id && `(${club.r2g_id})`}
                      </p>
                    </div>
                  </div>
                  <div className="club-card-bottom">
                    <div className="club-number">#{club.number || index + 1}</div>
                    <Link
                      href={`/solo-tour/managers/${encodeURIComponent(club.manager)}`}
                      className="portal-btn btn-primary view-manager-btn"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-clubs-found">
                <i className="fas fa-search-minus" />
                <p>No clubs found matching &ldquo;{searchTerm}&rdquo;</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="portal-footer">
          <div className="portal-status-bar">
            <div className="status-item">
              <span className="status-indicator online" />
              System Online
            </div>
            <div className="status-item">Total Clubs: {clubs.length}</div>
          </div>
          <div className="portal-copyright">&copy; 2026 Road to Glory. All rights reserved.</div>
        </footer>
      </div>
    </div>
  );
}
