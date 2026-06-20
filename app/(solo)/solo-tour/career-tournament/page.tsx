"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function CareerTournament() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  useEffect(() => {
    // Scroll event for Back to top
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Scroll animations
    const animatedElements = document.querySelectorAll(
      ".tournament-display-card, .tournament-category-title"
    );

    const checkElements = () => {
      animatedElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const isInViewport =
          rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.9 &&
          rect.bottom >= 0;

        if (isInViewport) {
          el.classList.add("animate-in");
        }
      });
    };

    // Run on initial load
    setTimeout(checkElements, 100);
    window.addEventListener("scroll", checkElements);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", checkElements);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const openModal = (src: string) => setModalImage(src);
  const closeModal = () => setModalImage(null);

  const tournaments = [
    { name: "DIVISION ONE", img1: "/assets/images/tournaments/car1.webp", img2: "/assets/images/tournaments/car2.webp" },
    { name: "DIVISION TWO", img1: "/assets/images/tournaments/car3.webp", img2: "/assets/images/tournaments/car4.webp" },
    { name: "DIVISION THREE", img1: "/assets/images/tournaments/car5.webp", img2: "/assets/images/tournaments/car6.webp" },
    { name: "DIVISION FOUR", img1: "/assets/images/tournaments/car7.webp", img2: "/assets/images/tournaments/car8.webp" },
    { name: "DIVISION FIVE", img1: "/assets/images/tournaments/car9.webp", img2: "/assets/images/tournaments/car10.webp" },
    { name: "KINGS CUP", img1: "/assets/images/tournaments/car23.webp", img2: "/assets/images/tournaments/car24.webp" }
  ];

  const europeanLeague = [
    { name: "R2G CHAMPIONS LEAGUE", img1: "/assets/images/tournaments/car11.webp", img2: "/assets/images/tournaments/car12.webp" },
    { name: "R2G EUROPA LEAGUE", img1: "/assets/images/tournaments/car13.webp", img2: "/assets/images/tournaments/car14.webp" },
    { name: "R2G CONFERENCE LEAGUE", img1: "/assets/images/tournaments/car15.webp", img2: "/assets/images/tournaments/car16.webp" },
    { name: "R2G SUPER LEAGUE", img1: "/assets/images/tournaments/car17.webp", img2: "/assets/images/tournaments/car18.webp" }
  ];

  const specialTour = [
    { name: "R2G AUTHENTIC TOUR", img1: "/assets/images/tournaments/car19.webp", img2: "/assets/images/tournaments/car20.webp" },
    { name: "R2G INTER CLASH", img1: "/assets/images/tournaments/car21.webp", img2: "/assets/images/tournaments/car22.webp" }
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
          <h1 className="portal-title">CAREER TOURNAMENTS</h1>
          <p className="portal-subtitle">
            Compete in division leagues and cup championships to earn rewards and build your manager legacy.
          </p>
        </header>

        {/* Sections Wrapper */}
        <div className="tournament-grid-layout">
          {/* Section 1: Division Leagues */}
          <div className="tournament-category-block">
            <div className="tournament-category-title">
              <h2>DIVISION LEAGUE</h2>
            </div>
            
            <div className="tournament-cards-grid">
              {tournaments.map((t, index) => (
                <div 
                  key={index} 
                  className="tournament-display-card" 
                  style={{ transitionDelay: `${0.05 * index}s` }}
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

          {/* Section 2: European League */}
          <div className="tournament-category-block">
            <div className="tournament-category-title">
              <h2>R2G EUROPEAN LEAGUE</h2>
            </div>
            
            <div className="tournament-cards-grid">
              {europeanLeague.map((t, index) => (
                <div 
                  key={index} 
                  className="tournament-display-card" 
                  style={{ transitionDelay: `${0.05 * index}s` }}
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

          {/* Section 3: Special Tours */}
          <div className="tournament-category-block">
            <div className="tournament-category-title">
              <h2>R2G SPECIAL TOUR</h2>
            </div>
            
            <div className="tournament-cards-grid">
              {specialTour.map((t, index) => (
                <div 
                  key={index} 
                  className="tournament-display-card" 
                  style={{ transitionDelay: `${0.05 * index}s` }}
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
        </div>

        {/* Footer */}
        <footer className="portal-footer">
          <div className="portal-status-bar">
            <div className="status-item">
              <span className="status-indicator online"></span>
              Tournaments: Active
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

      {/* Floating Scroll to Top button */}
      <button
        className={`back-to-top-btn ${showBackToTop ? "visible" : ""}`}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <i className="fas fa-arrow-up"></i>
      </button>

      {/* High-Fidelity Blurred Backdrop Modal */}
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
              alt="Tournament Image Enlarged" 
              style={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
