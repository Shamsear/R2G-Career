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
    { href: prefix, label: "01//HUB" },
    { href: `${prefix}/tournament-guide`, label: "02//GUIDE" },
    { href: `${prefix}/career-mode`, label: "03//CAREER" },
    { href: `${prefix}/manager-ranking`, label: "04//RANK" },
    { href: `${prefix}/trophy-cabinet`, label: "05//TROPHY" },
    { href: `${prefix}/career-tournament`, label: "06//TOUR" },
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
            <span className="logo-text">{isTeamTour ? "SYS.TEAM" : "R2G.CAREER"}</span>
          </Link>

          {/* Desktop Navigation Links (Monospace, Tech Style) */}
          <nav className="tech-nav">
            {navLinks.map((link) => {
              const isActive = link.href === prefix ? pathname === prefix : pathname.startsWith(link.href);
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
            {/* Return Button */}
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
            <span>SYS.R2G.NAV</span>
          </div>
          <button className="tech-close-menu" onClick={toggleMenu} aria-label="Close menu">
            [ CLOSE ]
          </button>
        </div>

        <div className="tech-mobile-links">
          {navLinks.map((link) => {
            const isActive = link.href === prefix ? pathname === prefix : pathname.startsWith(link.href);
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
          
          <Link href="/" onClick={toggleMenu} className="tech-mobile-portal">
            [ EXIT TO PORTAL ]
          </Link>
        </div>
      </div>
    </>
  );
}
