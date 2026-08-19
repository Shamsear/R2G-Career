"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchSoloTrophyCabinetItems } from "@/utils/solo/serverActions";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";
import "../../../portal.css";

export default function TrophyCabinet() {
  const [expandedSeasons, setExpandedSeasons] = useState<Record<string, boolean>>({});
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [seasonsData, setSeasonsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const items = await fetchSoloTrophyCabinetItems();
        if (items && items.length > 0) {
          const grouped: Record<string, { trophies: string[], awards: string[] }> = {};
          items.forEach((item: any) => {
            const key = item.season_key;
            if (!grouped[key]) {
              grouped[key] = { trophies: [], awards: [] };
            }
            if (item.category === 'trophy') {
              grouped[key].trophies.push(item.image_url);
            } else if (item.category === 'award') {
              grouped[key].awards.push(item.image_url);
            }
          });

          const allSeasonKeys = Object.keys(grouped);

          allSeasonKeys.sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
            return numB - numA;
          });

          const formatted = allSeasonKeys.map(key => {
            const seasonNum = key.replace(/\D/g, "");
            const name = `SEASON ${seasonNum}`;
            
            return {
              id: key,
              name,
              trophies: grouped[key]?.trophies || [],
              awards: grouped[key]?.awards || [],
            };
          });

          const filtered = formatted.filter(s => s.trophies.length > 0 || s.awards.length > 0);
          setSeasonsData(filtered);
          if (filtered.length > 0) {
            setExpandedSeasons({ [filtered[0].id]: true });
          }
        }
      } catch (err) {
        console.error("Error loading dynamic trophies:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleSeason = (seasonId: string) => {
    setExpandedSeasons((prev) => ({ ...prev, [seasonId]: !prev[seasonId] }));
  };

  const openModal = (src: string) => setModalImage(src);
  const closeModal = () => setModalImage(null);

  if (loading) {
    return (
      <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <RwsFullPageLoading text="Loading legacy trophy cabinet..." />
      </div>
    );
  }

  // Calculate totals across all dynamic seasons for the header stats block
  const totalTrophies = seasonsData.reduce((acc, curr) => acc + curr.trophies.length, 0);
  const totalAwards = seasonsData.reduce((acc, curr) => acc + curr.awards.length, 0);

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
              <div className="stat-value">{totalTrophies}</div>
              <div className="stat-label">Major Trophies</div>
            </div>
            <div className="stat-item animate-stat" style={{ animationDelay: "0.1s" }}>
              <div className="stat-value">{totalAwards}</div>
              <div className="stat-label">Individual Awards</div>
            </div>
            <div className="stat-item animate-stat" style={{ animationDelay: "0.2s" }}>
              <div className="stat-value">{totalTrophies + totalAwards}</div>
              <div className="stat-label">Total Cabinet Items</div>
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
                    <div className="season-box-left">
                      <div className="season-number">Season</div>
                      <h1>{season.name}</h1>
                    </div>
                    
                    <div className="season-box-right">
                      <div className="season-stats-badges">
                        {season.trophies.length > 0 && (
                          <span className="season-stat-badge trophies-badge">
                            <i className="fa-solid fa-trophy" /> {season.trophies.length} Trophies
                          </span>
                        )}
                        {season.awards.length > 0 && (
                          <span className="season-stat-badge awards-badge">
                            <i className="fa-solid fa-award" /> {season.awards.length} Awards
                          </span>
                        )}
                      </div>
                      <div className="season-arrow">
                        <i className={`fas fa-chevron-down ${isOpen ? "rotate-up" : ""}`} />
                      </div>
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
      </div>

      {/* Lightbox modal */}
      <div
        className={`guide-modal ${modalImage ? "active" : ""}`}
        onClick={closeModal}
        style={{ zIndex: 9999 }}
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
