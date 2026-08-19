"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { fetchCareerTournaments } from "@/utils/solo/serverActions";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";
import "../../../portal.css";

export default function CareerTournament() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [tournamentsData, setTournamentsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const openModal = (src: string) => setModalImage(src);
  const closeModal = () => setModalImage(null);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchCareerTournaments();
        setTournamentsData(data || []);
      } catch (e) {
        console.error("Failed to load career tournaments:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Intersection observer for scroll-triggered reveals
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    if (!loading) {
      setTimeout(() => {
        document
          .querySelectorAll(".tournament-display-card, .tournament-category-title")
          .forEach((el) => observerRef.current?.observe(el));
      }, 100);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observerRef.current?.disconnect();
    };
  }, [loading]);

  const tournaments = tournamentsData.filter(t => t.category === "division");
  const europeanLeague = tournamentsData.filter(t => t.category === "european");
  const specialTour = tournamentsData.filter(t => t.category === "special");

  const renderSection = (title: string, icon: string, items: typeof tournaments) => (
    <div className="tournament-category-block" style={{ marginBottom: "3rem" }}>
      <div className="tournament-category-title" style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <i className={icon} style={{ color: "var(--rose)", fontSize: "1.25rem" }} />
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "1px" }}>{title}</h2>
      </div>
      <div className="tournament-cards-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.5rem" }}>
        {items.map((t, i) => (
          <div
            key={i}
            className="tournament-display-card"
            style={{
              transitionDelay: `${i * 0.06}s`,
              background: "rgba(255, 255, 255, 0.02)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "16px",
              overflow: "hidden"
            }}
          >
            <div className="tournament-card-header" style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", background: "rgba(255, 255, 255, 0.02)" }}>
              <h3 style={{ fontSize: "0.95rem", color: "#ffffff", fontWeight: 700, margin: 0, letterSpacing: "0.5px" }}>{t.name}</h3>
            </div>
            <div className="tournament-card-body" style={{ padding: "1.25rem" }}>
              <div className="tournament-pair-images" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div className="tournament-img-wrapper" onClick={() => openModal(t.img1)} style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", cursor: "zoom-in" }}>
                  <img src={t.img1} alt={t.name} style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
                <div className="tournament-img-wrapper" onClick={() => openModal(t.img2)} style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", cursor: "zoom-in" }}>
                  <img src={t.img2} alt={`${t.name} Standings`} style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <RwsFullPageLoading text="Loading career showcase details..." />
      </div>
    );
  }

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div style={{ maxWidth: "1500px", width: "95%", margin: "0 auto", padding: "1.5rem 1rem 4rem", position: "relative", zIndex: 2 }}>
        {/* Breadcrumb */}
        <div className="portal-breadcrumb" style={{ marginBottom: "1rem" }}>
          <Link href="/solo-tour" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header" style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="portal-page-badge">
            <i className="fa-solid fa-sitemap" />
            Career Tournaments
          </div>
          <h1 className="portal-title" style={{ fontSize: "2.25rem", margin: "0.5rem 0" }}>CAREER TOURNAMENTS</h1>
          <p className="portal-subtitle" style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            Compete in division leagues and cup championships to earn rewards and build your
            manager legacy.
          </p>
        </div>

        {/* Stats summary */}
        <div className="portal-stats-ribbon" style={{ marginBottom: "2.5rem" }}>
          <div className="stat-pill">
            <i className="fa-solid fa-layer-group" />
            <span>{tournaments.length} Divisions</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <i className="fa-solid fa-earth-europe" />
            <span>{europeanLeague.length} European Cups</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <i className="fa-solid fa-star" />
            <span>{specialTour.length} Special Tours</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <span className="live-dot" />
            <span>Live</span>
          </div>
        </div>

        {/* Tournament sections */}
        <div className="tournament-grid-layout">
          {renderSection("DIVISION LEAGUE", "fa-solid fa-layer-group", tournaments)}
          {renderSection("R2G EUROPEAN LEAGUE", "fa-solid fa-earth-europe", europeanLeague)}
          {renderSection("R2G SPECIAL TOUR", "fa-solid fa-star", specialTour)}
        </div>

        {/* Tip note */}
        <div className="glass-panel" style={{ textAlign: "center", padding: "1.5rem 2rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", marginTop: "1rem" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", margin: 0 }}>
            <i className="fa-solid fa-magnifying-glass-plus" style={{ color: "var(--rose)" }} />
            Click any image to expand it in full view
          </p>
        </div>
      </div>

      {/* Back to top */}
      <button
        className={`back-to-top-btn ${showBackToTop ? "visible" : ""}`}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <i className="fas fa-arrow-up" />
      </button>

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
              alt="Tournament Image Enlarged"
              style={{ maxWidth: "100%", maxHeight: "85vh", display: "block" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
