"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function PredictionNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const segments = pathname.split("/");
  const seasonIdSegment = segments[2];
  const hasSeasonId = seasonIdSegment && /^\d+$/.test(seasonIdSegment);
  const seasonId = hasSeasonId ? seasonIdSegment : "";

  const navLinks = hasSeasonId
    ? [
        { href: "/master-of-prediction", label: "01//SEASONS" },
        { href: `/master-of-prediction/${seasonId}`, label: "02//STANDINGS" },
        { href: "/solo-tour/admin/prediction", label: "03//ADMIN CONSOLE" },
      ]
    : [
        { href: "/master-of-prediction", label: "01//SEASONS ARCHIVE" },
        { href: "/solo-tour/admin/prediction", label: "02//ADMIN CONSOLE" },
      ];

  return (
    <>
      <header className="tech-header">
        <div className="tech-header-container">
          
          {/* Logo Section */}
          <Link href="/" className="tech-logo">
            <Image 
              src="/assets/images/logo11.webp" 
              alt="Logo" 
              width={26} 
              height={26} 
              className="logo-img" 
            />
            <span className="logo-text" style={{ color: "#c084fc" }}>R2G.PREDICTION</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="tech-nav">
            {navLinks.map((link) => {
              const isActive =
                link.href === `/master-of-prediction/${seasonId}` || link.href === "/master-of-prediction"
                  ? pathname === link.href
                  : pathname.startsWith(link.href);
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`tech-nav-item ${isActive ? "active" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Section */}
          <div className="tech-controls">
            <Link href="/" className="tech-portal-btn" title="Back to Portal">
              <span>[ ESC_PORTAL ]</span>
            </Link>

            {/* Mobile Hamburger Trigger */}
            <button 
              className={`tech-hamburger ${isMenuOpen ? "open" : ""}`} 
              aria-label="Toggle menu" 
              onClick={toggleMenu}
            >
              <span></span>
              <span></span>
            </button>
          </div>

        </div>
      </header>

      {/* Top Slide-Down Mobile Menu */}
      <div className={`tech-mobile-menu ${isMenuOpen ? "active" : ""}`}>
        <div className="tech-mobile-header">
          <div className="tech-mobile-logo">
            <Image src="/assets/images/logo11.webp" alt="Logo" width={24} height={24} />
            <span style={{ color: "#c084fc" }}>SYS.PREDICTION.NAV</span>
          </div>
          <button className="tech-close-menu" onClick={toggleMenu} aria-label="Close menu">
            [ CLOSE ]
          </button>
        </div>

        <div className="tech-mobile-links">
          {navLinks.map((link) => {
            const isActive =
              link.href === `/master-of-prediction/${seasonId}` || link.href === "/master-of-prediction"
                ? pathname === link.href
                : pathname.startsWith(link.href);
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`tech-mobile-link-item ${isActive ? "active" : ""}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <span>{link.label}</span>
                <i className="fa-solid fa-chevron-right arrow-icon" />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
