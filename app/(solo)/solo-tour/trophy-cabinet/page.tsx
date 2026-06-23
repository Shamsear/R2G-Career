"use client";

import { useState } from "react";
import Link from "next/link";
import "../../../portal.css";

export default function TrophyCabinet() {
  const [expandedSeasons, setExpandedSeasons] = useState<Record<string, boolean>>({
    season7: true,
  });
  const [modalImage, setModalImage] = useState<string | null>(null);

  const toggleSeason = (seasonId: string) => {
    setExpandedSeasons((prev) => ({ ...prev, [seasonId]: !prev[seasonId] }));
  };

  const openModal = (src: string) => setModalImage(src);
  const closeModal = () => setModalImage(null);

  const seasonsData = [
    {
      id: "season7",
      name: "SEASON 7",
      trophies: Array.from({ length: 12 }, (_, i) => `/assets/images/trophy/s7t${i + 1}.webp`),
      awards: Array.from({ length: 7 }, (_, i) => `/assets/images/trophy/s7a${i + 1}.webp`),
    },
    {
      id: "season6",
      name: "SEASON 6",
      trophies: [
        "/assets/images/trophy/s6t1.webp",
        "/assets/images/trophy/s6t12.webp",
        ...Array.from({ length: 10 }, (_, i) => `/assets/images/trophy/s6t${i + 2}.webp`),
      ],
      awards: Array.from({ length: 7 }, (_, i) => `/assets/images/trophy/s6a${i + 1}.webp`),
    },
    {
      id: "season5",
      name: "SEASON 5",
      trophies: Array.from({ length: 12 }, (_, i) => `/assets/images/trophy/3t${i + 1}.webp`),
      awards: Array.from({ length: 8 }, (_, i) => `/assets/images/trophy/3a${i + 1}.webp`),
    },
    {
      id: "season4",
      name: "SEASON 4",
      trophies: Array.from({ length: 8 }, (_, i) => `/assets/images/trophy/t${i + 1}.webp`),
      awards: Array.from({ length: 7 }, (_, i) => `/assets/images/trophy/ta${i + 1}.webp`),
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
      ],
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
      ],
    },
  ];

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
            <i className="fa-solid fa-trophy" />
            Legacy Archive
          </div>
          <h1 className="portal-title">TROPHY CABINET</h1>
          <p className="portal-subtitle">
            All trophies, honors, individual awards, and historical achievements in Road to Glory.
          </p>
        </div>

        {/* Stats summary */}
        <div className="club-info intro-block">
          <h2>Career Achievements</h2>
          <p>Secured across multiple competitive seasons of the Road to Glory tournament.</p>
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

        {/* Accordion seasons */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {seasonsData.map((season) => {
            const isOpen = !!expandedSeasons[season.id];
            return (
              <div key={season.id} style={{ width: "100%" }}>
                <div className="centered-box">
                  <button
                    className={`season-box ${isOpen ? "active" : ""}`}
                    onClick={() => toggleSeason(season.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="season-number">Season</div>
                    <h1>{season.name}</h1>
                    <div className="season-arrow">
                      <i className={`fas fa-chevron-down ${isOpen ? "rotate-up" : ""}`} />
                    </div>
                  </button>
                </div>

                <div className={`season-content-wrapper ${isOpen ? "expanded" : "collapsed"}`}>
                  <div className={`season-content ${isOpen ? "active" : ""}`}>
                    {/* Trophies */}
                    {season.trophies.length > 0 && (
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
                                style={{ animationDelay: `${idx * 0.04}s` }}
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

                    {/* Awards */}
                    {season.awards.length > 0 && (
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
                                style={{ animationDelay: `${(idx + season.trophies.length) * 0.04}s` }}
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
              <span className="status-indicator online" />
              Trophy Archive: Synchronized
            </div>
            <div className="status-item">R2G Career Mode</div>
          </div>
          <div className="portal-copyright">&copy; 2026 Road to Glory. All rights reserved.</div>
        </footer>
      </div>

      {/* Lightbox modal */}
      <div
        className={`guide-modal ${modalImage ? "active" : ""}`}
        onClick={closeModal}
      >
        <button className="close-guide-modal" onClick={closeModal}>
          <i className="fas fa-times" />
        </button>
        {modalImage && (
          <div className="guide-modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={modalImage}
              alt="Trophy Enlarged View"
              style={{ maxWidth: "100%", maxHeight: "85vh", display: "block" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
