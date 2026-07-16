"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function PortalNavbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Hide the navbar entirely on the root portal page
  if (pathname === "/") return null;

  const isPlayerPage = pathname.startsWith("/player");

  // Extract player id if we are on a profile page
  let playerId = "";
  if (isPlayerPage) {
    const parts = pathname.split("/");
    if (parts.length > 2 && parts[2]) {
      playerId = parts[2];
    }
  }

  const navLinks = isPlayerPage
    ? [
        { href: "/player", label: "01//DIRECTORY" },
        ...(playerId ? [{ href: `/player/${playerId}`, label: "02//PROFILE" }] : [])
      ]
    : [];

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
            <span className="logo-text">R2G.PLAYER</span>
          </Link>

          {/* Desktop Navigation Links (Monospace, Tech Style) */}
          <nav className="tech-nav">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/player" && pathname.startsWith(link.href));
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
            {navLinks.length > 0 && (
              <button 
                className={`tech-hamburger ${isMenuOpen ? "open" : ""}`} 
                aria-label="Toggle menu" 
                onClick={toggleMenu}
              >
                <span></span>
                <span></span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Top Slide-Down Mobile Menu */}
      {navLinks.length > 0 && (
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
              const isActive = pathname === link.href || (link.href !== "/player" && pathname.startsWith(link.href));
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
      )}
    </>
  );
}
