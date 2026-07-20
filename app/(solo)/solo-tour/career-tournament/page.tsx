"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import "../../../portal.css";

export default function CareerTournament() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const openModal = (src: string) => setModalImage(src);
  const closeModal = () => setModalImage(null);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

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

    setTimeout(() => {
      document
        .querySelectorAll(".tournament-display-card, .tournament-category-title")
        .forEach((el) => observerRef.current?.observe(el));
    }, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observerRef.current?.disconnect();
    };
  }, []);

  const tournaments = [
    { name: "DIVISION ONE",   img1: "/assets/images/tournaments/car1.webp",  img2: "/assets/images/tournaments/car2.webp" },
    { name: "DIVISION TWO",   img1: "/assets/images/tournaments/car3.webp",  img2: "/assets/images/tournaments/car4.webp" },
    { name: "DIVISION THREE", img1: "/assets/images/tournaments/car5.webp",  img2: "/assets/images/tournaments/car6.webp" },
    { name: "DIVISION FOUR",  img1: "/assets/images/tournaments/car7.webp",  img2: "/assets/images/tournaments/car8.webp" },
    { name: "DIVISION FIVE",  img1: "/assets/images/tournaments/car9.webp",  img2: "/assets/images/tournaments/car10.webp" },
    { name: "KINGS CUP",      img1: "/assets/images/tournaments/car23.webp", img2: "/assets/images/tournaments/car24.webp" },
  ];

  const europeanLeague = [
    { name: "R2G CHAMPIONS LEAGUE",  img1: "/assets/images/tournaments/car11.webp", img2: "/assets/images/tournaments/car12.webp" },
    { name: "R2G EUROPA LEAGUE",     img1: "/assets/images/tournaments/car13.webp", img2: "/assets/images/tournaments/car14.webp" },
    { name: "R2G CONFERENCE LEAGUE", img1: "/assets/images/tournaments/car15.webp", img2: "/assets/images/tournaments/car16.webp" },
    { name: "R2G SUPER LEAGUE",      img1: "/assets/images/tournaments/car17.webp", img2: "/assets/images/tournaments/car18.webp" },
  ];

  const specialTour = [
    { name: "R2G AUTHENTIC TOUR", img1: "/assets/images/tournaments/car19.webp", img2: "/assets/images/tournaments/car20.webp" },
  ];

  const renderSection = (title: string, icon: string, items: typeof tournaments) => (
    <div className="tournament-category-block">
      <div className="tournament-category-title">
        <i className={icon} style={{ color: "var(--rose)", marginRight: "0.35rem" }} />
        <h2>{title}</h2>
      </div>
      <div className="tournament-cards-grid">
        {items.map((t, i) => (
          <div
            key={i}
            className="tournament-display-card"
            style={{ transitionDelay: `${i * 0.06}s` }}
          >
            <div className="tournament-card-header">
              <h3>{t.name}</h3>
            </div>
            <div className="tournament-card-body">
              <div className="tournament-pair-images">
                <div className="tournament-img-wrapper" onClick={() => openModal(t.img1)}>
                  <Image src={t.img1} alt={t.name} width={300} height={200} style={{ width: "100%", height: "auto" }} />
                </div>
                <div className="tournament-img-wrapper" onClick={() => openModal(t.img2)}>
                  <Image src={t.img2} alt={`${t.name} Standings`} width={300} height={200} style={{ width: "100%", height: "auto" }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
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
            <i className="fa-solid fa-sitemap" />
            Career Tournaments
          </div>
          <h1 className="portal-title">CAREER TOURNAMENTS</h1>
          <p className="portal-subtitle">
            Compete in division leagues and cup championships to earn rewards and build your
            manager legacy.
          </p>
        </div>

        {/* Stats summary */}
        <div className="portal-stats-ribbon">
          <div className="stat-pill">
            <i className="fa-solid fa-layer-group" />
            <span>5 Divisions</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <i className="fa-solid fa-earth-europe" />
            <span>4 European Cups</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <i className="fa-solid fa-star" />
            <span>2 Special Tours</span>
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
        <div className="glass-panel" style={{ textAlign: "center", padding: "1.5rem 2rem" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <i className="fa-solid fa-magnifying-glass-plus" style={{ color: "var(--rose)" }} />
            Click any image to expand it in full view
          </p>
        </div>

        {/* Footer */}
        <footer className="portal-footer">
          <div className="portal-status-bar">
            <div className="status-item">
              <span className="status-indicator online" />
              Tournaments: Active
            </div>
            <div className="status-item">R2G Career Mode</div>
          </div>
          <div className="portal-copyright">&copy; 2026 Road to Glory. All rights reserved.</div>
        </footer>
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
