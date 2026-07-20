"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function SpecialTourNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const segments = pathname.split("/");
  const tourneyIdSegment = segments[2];
  const hasTourneyId = tourneyIdSegment && /^\d+$/.test(tourneyIdSegment);
  const tourneyId = hasTourneyId ? tourneyIdSegment : "";

  const navLinks = hasTourneyId ? [
    { href: `/special-tour/${tourneyId}`, label: "01//HUB" },
    { href: `/special-tour/${tourneyId}/fixtures`, label: "02//SERIES PORTAL" },
    { href: `/special-tour/${tourneyId}/nominees`, label: "03//NOMINEES" },
    { href: `/special-tour/${tourneyId}/album`, label: "04//ALBUM" },
  ] : [
    { href: "/special-tour", label: "01//DASHBOARD" },
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
            <span className="logo-text">R2G.SPECIAL</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="tech-nav">
            {navLinks.map((link) => {
              const isActive = link.href === `/special-tour/${tourneyId}` || link.href === "/special-tour"
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
            <span>SYS.SPECIAL.NAV</span>
          </div>
          <button className="tech-close-menu" onClick={toggleMenu} aria-label="Close menu">
            [ CLOSE ]
          </button>
        </div>

        <div className="tech-mobile-links">
          {navLinks.map((link) => {
            const isActive = link.href === `/special-tour/${tourneyId}` || link.href === "/special-tour"
              ? pathname === link.href
              : pathname.startsWith(link.href);
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
