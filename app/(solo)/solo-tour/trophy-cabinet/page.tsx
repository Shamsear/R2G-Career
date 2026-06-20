"use client";

import { useState } from "react";
import Link from "next/link";

export default function TrophyCabinet() {
  // Track open/collapsed state of seasons. Season 7 is open by default.
  const [expandedSeasons, setExpandedSeasons] = useState<Record<string, boolean>>({
    season7: true,
  });
  
  // Track image url for zoom modal
  const [modalImage, setModalImage] = useState<string | null>(null);

  const toggleSeason = (seasonId: string) => {
    setExpandedSeasons((prev) => ({
      ...prev,
      [seasonId]: !prev[seasonId],
    }));
  };

  const openModal = (src: string) => setModalImage(src);
  const closeModal = () => setModalImage(null);

  const seasonsData = [
    {
      id: "season7",
      name: "SEASON 7",
      trophies: [
        "/assets/images/trophy/s7t1.webp",
        "/assets/images/trophy/s7t2.webp",
        "/assets/images/trophy/s7t3.webp",
        "/assets/images/trophy/s7t4.webp",
        "/assets/images/trophy/s7t5.webp",
        "/assets/images/trophy/s7t6.webp",
        "/assets/images/trophy/s7t7.webp",
        "/assets/images/trophy/s7t8.webp",
        "/assets/images/trophy/s7t9.webp",
        "/assets/images/trophy/s7t10.webp",
        "/assets/images/trophy/s7t11.webp",
        "/assets/images/trophy/s7t12.webp",
      ],
      awards: [
        "/assets/images/trophy/s7a1.webp",
        "/assets/images/trophy/s7a2.webp",
        "/assets/images/trophy/s7a3.webp",
        "/assets/images/trophy/s7a4.webp",
        "/assets/images/trophy/s7a5.webp",
        "/assets/images/trophy/s7a6.webp",
        "/assets/images/trophy/s7a7.webp",
      ]
    },
    {
      id: "season6",
      name: "SEASON 6",
      trophies: [
        "/assets/images/trophy/s6t1.webp",
        "/assets/images/trophy/s6t12.webp",
        "/assets/images/trophy/s6t2.webp",
        "/assets/images/trophy/s6t3.webp",
        "/assets/images/trophy/s6t4.webp",
        "/assets/images/trophy/s6t5.webp",
        "/assets/images/trophy/s6t6.webp",
        "/assets/images/trophy/s6t7.webp",
        "/assets/images/trophy/s6t8.webp",
        "/assets/images/trophy/s6t9.webp",
        "/assets/images/trophy/s6t10.webp",
        "/assets/images/trophy/s6t11.webp",
      ],
      awards: [
        "/assets/images/trophy/s6a1.webp",
        "/assets/images/trophy/s6a2.webp",
        "/assets/images/trophy/s6a3.webp",
        "/assets/images/trophy/s6a4.webp",
        "/assets/images/trophy/s6a5.webp",
        "/assets/images/trophy/s6a6.webp",
        "/assets/images/trophy/s6a7.webp",
      ]
    },
    {
      id: "season5",
      name: "SEASON 5",
      trophies: [
        "/assets/images/trophy/3t1.webp",
        "/assets/images/trophy/3t2.webp",
        "/assets/images/trophy/3t3.webp",
        "/assets/images/trophy/3t4.webp",
        "/assets/images/trophy/3t5.webp",
        "/assets/images/trophy/3t6.webp",
        "/assets/images/trophy/3t7.webp",
        "/assets/images/trophy/3t8.webp",
        "/assets/images/trophy/3t9.webp",
        "/assets/images/trophy/3t10.webp",
        "/assets/images/trophy/3t11.webp",
        "/assets/images/trophy/3t12.webp",
      ],
      awards: [
        "/assets/images/trophy/3a1.webp",
        "/assets/images/trophy/3a2.webp",
        "/assets/images/trophy/3a3.webp",
        "/assets/images/trophy/3a4.webp",
        "/assets/images/trophy/3a5.webp",
        "/assets/images/trophy/3a6.webp",
        "/assets/images/trophy/3a7.webp",
        "/assets/images/trophy/3a8.webp",
      ]
    },
    {
      id: "season4",
      name: "SEASON 4",
      trophies: [
        "/assets/images/trophy/t1.webp",
        "/assets/images/trophy/t2.webp",
        "/assets/images/trophy/t3.webp",
        "/assets/images/trophy/t4.webp",
        "/assets/images/trophy/t5.webp",
        "/assets/images/trophy/t6.webp",
        "/assets/images/trophy/t7.webp",
        "/assets/images/trophy/t8.webp",
      ],
      awards: [
        "/assets/images/trophy/ta1.webp",
        "/assets/images/trophy/ta2.webp",
        "/assets/images/trophy/ta3.webp",
        "/assets/images/trophy/ta4.webp",
        "/assets/images/trophy/ta5.webp",
        "/assets/images/trophy/ta6.webp",
        "/assets/images/trophy/ta7.webp",
      ]
    },
    {
      id: "season2",
      name: "SEASON 2",
      trophies: [
        "/assets/images/trophy/elitet2.webp",
        "/assets/images/trophy/div1t2.webp",
        "/assets/images/trophy/div2t2.webp",
        "/assets/images/trophy/uclt.webp",
        "/assets/images/trophy/uelt.webp",
        "/assets/images/trophy/ueclt.webp",
        "/assets/images/trophy/trio.webp",
        "/assets/images/trophy/special.webp",
        "/assets/images/trophy/divcup.webp",
        "/assets/images/trophy/tos.webp",
      ],
      awards: [
        "/assets/images/trophy/best.webp",
        "/assets/images/trophy/ballen.webp",
        "/assets/images/trophy/muller.webp",
        "/assets/images/trophy/yashin.webp",
        "/assets/images/trophy/golden.webp",
        "/assets/images/trophy/maldini.webp",
      ]
    },
    {
      id: "season1",
      name: "SEASON 1",
      trophies: [
        "/assets/images/trophy/elitet.webp",
        "/assets/images/trophy/div1t.webp",
        "/assets/images/trophy/div2t.webp",
        "/assets/images/trophy/kingt.webp",
        "/assets/images/trophy/supert.webp",
        "/assets/images/trophy/divg.webp",
        "/assets/images/trophy/eurot.webp",
        "/assets/images/trophy/team.webp",
      ],
      awards: [
        "/assets/images/trophy/a1.webp",
        "/assets/images/trophy/a2.webp",
        "/assets/images/trophy/gerd.webp",
        "/assets/images/trophy/a4.webp",
        "/assets/images/trophy/a5.webp",
        "/assets/images/trophy/a6.webp",
      ]
    }
  ];

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
          <h1 className="portal-title">TROPHY CABINET</h1>
          <p className="portal-subtitle">
            All trophies, honors, individual awards, and historical achievements in Road to Glory.
          </p>
        </header>

        {/* Achievements stats preview block */}
        <div className="club-info intro-block">
          <h2>Career Achievements</h2>
          <p>
            Secured across multiple competitive seasons of the Road to Glory tournament.
          </p>

          <div className="stats-preview">
            <div className="stat-item animate-stat">
              <div className="stat-value">15</div>
              <div className="stat-label">Major Trophies</div>
            </div>
            <div className="stat-item animate-stat" style={{ animationDelay: "0.1s" }}>
              <div className="stat-value">8</div>
              <div className="stat-label">International Cups</div>
            </div>
            <div className="stat-item animate-stat" style={{ animationDelay: "0.2s" }}>
              <div className="stat-value">25</div>
              <div className="stat-label">Achievement Badges</div>
            </div>
          </div>
        </div>

        {/* Accordion List of Seasons */}
        <div style={{ width: "100%", marginTop: "2rem" }}>
          {seasonsData.map((season) => {
            const isOpen = !!expandedSeasons[season.id];
            return (
              <div key={season.id} style={{ marginBottom: "1.5rem", width: "100%" }}>
                {/* Accordion Toggle Header */}
                <div className="centered-box">
                  <button
                    className={`season-box ${isOpen ? "active" : ""}`}
                    onClick={() => toggleSeason(season.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="season-number">Season</div>
                    <h1>{season.name}</h1>
                    <div className="season-arrow">
                      <i className={`fas fa-chevron-down ${isOpen ? "rotate-up" : ""}`}></i>
                    </div>
                  </button>
                </div>

                {/* Collapsible Content */}
                <div className={`season-content-wrapper ${isOpen ? "expanded" : "collapsed"}`}>
                  <div className={`season-content ${isOpen ? "active" : ""}`}>
                    {/* Trophies Sub-Section */}
                    {season.trophies && season.trophies.length > 0 && (
                      <div className="trophy-section">
                        <div className="club-info sub-heading">
                          <div className="textbox season-heading">
                            <h2>TROPHIES</h2>
                          </div>
                          <p>Major trophies won during {season.name} of the Road to Glory tournament.</p>
                        </div>
                        <div className="trophy-gallery">
                          <ul className="moze-gallery pictures">
                            {season.trophies.map((imgSrc, idx) => (
                              <li 
                                key={idx} 
                                onClick={() => openModal(imgSrc)}
                                style={{ animationDelay: `${idx * 0.05}s` }}
                              >
                                <div className="trophy-frame">
                                  <img src={imgSrc} alt={`${season.name} Trophy`} loading="lazy" />
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Awards Sub-Section */}
                    {season.awards && season.awards.length > 0 && (
                      <div className="trophy-section" style={{ marginTop: "2.5rem" }}>
                        <div className="club-info sub-heading">
                          <div className="textbox season-heading">
                            <h2>INDIVIDUAL AWARDS</h2>
                          </div>
                          <p>Prestigious individual awards won by players in {season.name}.</p>
                        </div>
                        <div className="trophy-gallery">
                          <ul className="moze-gallery pictures">
                            {season.awards.map((imgSrc, idx) => (
                              <li 
                                key={idx} 
                                onClick={() => openModal(imgSrc)}
                                style={{ animationDelay: `${(idx + (season.trophies?.length || 0)) * 0.05}s` }}
                              >
                                <div className="trophy-frame">
                                  <img src={imgSrc} alt={`${season.name} Award`} loading="lazy" />
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="portal-footer">
          <div className="portal-status-bar">
            <div className="status-item">
              <span className="status-indicator online"></span>
              Trophy Archive: Fully Synchronized
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

      {/* Backdrop Zoom Modal */}
      <div 
        className={`guide-modal ${modalImage ? "active" : ""}`}
        onClick={closeModal}
      >
        <button className="close-guide-modal" onClick={closeModal}>
          <i className="fas fa-times"></i>
        </button>
        {modalImage && (
          <div className="guide-modal-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={modalImage} 
              alt="Trophy Enlarged View" 
              style={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
