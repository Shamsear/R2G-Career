"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Determine which tour we are currently in
  const isTeamTour = pathname.startsWith("/team-tour");
  const prefix = isTeamTour ? "/team-tour" : "/solo-tour";

  // Hide the navbar entirely on the root portal page
  if (pathname === "/") return null;

  const navLinks = [
    { href: prefix, label: "Dashboard" },
    { href: `${prefix}/tournament-guide`, label: "Guide" },
    { href: `${prefix}/career-mode`, label: "Career" },
    { href: `${prefix}/manager-ranking`, label: "Rankings" },
    { href: `${prefix}/trophy-cabinet`, label: "Trophies" },
    { href: `${prefix}/career-tournament`, label: "Tournament" },
  ];

  return (
    <>
      <header className="top-bar-header">
        <div className="top-bar">
          {/* Logo Section */}
          <Link href="/" className="mini-logo">
            <Image 
              src="/assets/images/logo11.webp" 
              alt="Mini Logo" 
              width={42} 
              height={42} 
              className="cursor-pointer logo-img" 
            />
            <span className="logo-text">{isTeamTour ? "R2G TEAM" : "R2G SOLO"}</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`nav-link-item ${isActive ? "active" : ""}`}
                >
                  {link.label}
                  <span className="active-indicator" />
                </Link>
              );
            })}
          </nav>

          {/* Controls / Social / Portal */}
          <div className="controls">
            <div className="social-icons">
              <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
              <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
              <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
              <a href="#" aria-label="Youtube"><i className="fab fa-youtube"></i></a>
            </div>
            
            {/* Return button */}
            <Link href="/" className="portal-back-btn" title="Return to Portal">
              <i className="fa-solid fa-right-from-bracket"></i>
              <span>PORTAL</span>
            </Link>

            {/* Mobile Hamburger */}
            <button 
              className={`hamburger ${isMenuOpen ? "open" : ""}`} 
              aria-label="Toggle menu" 
              onClick={toggleMenu}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Mobile Menu Drawer */}
      <div className={`mobile-menu ${isMenuOpen ? "active" : ""}`}>
        <button className="close-menu" onClick={toggleMenu} aria-label="Close menu">
          <i className="fas fa-times"></i>
        </button>
        
        <div className="mobile-logo-header">
          <Image src="/assets/images/logo11.webp" alt="Logo" width={60} height={60} />
          <span>ROAD TO GLORY</span>
        </div>

        <div className="mobile-menu-links">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                onClick={toggleMenu}
                className={isActive ? "active" : ""}
              >
                {link.label}
              </Link>
            );
          })}
          
          <Link href="/" onClick={toggleMenu} className="mobile-portal-link">
            <i className="fa-solid fa-arrow-left"></i> Return to Portal
          </Link>
        </div>
      </div>
    </>
  );
}
