"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SpecialTourFooter() {
  const pathname = usePathname();

  const segments = pathname.split("/");
  const tourneyIdSegment = segments[2];
  const hasTourneyId = tourneyIdSegment && /^\d+$/.test(tourneyIdSegment);
  const tourneyId = hasTourneyId ? tourneyIdSegment : "";

  const navLinks = hasTourneyId ? [
    { href: `/special-tour/${tourneyId}`, label: "HUB" },
    { href: `/special-tour/${tourneyId}/fixtures`, label: "SERIES PORTAL" },
    { href: `/special-tour/${tourneyId}/nominees`, label: "NOMINEES" },
    { href: `/special-tour/${tourneyId}/album`, label: "ALBUM" },
  ] : [
    { href: "/special-tour", label: "DASHBOARD" },
  ];

  return (
    <footer className="tech-footer">
      <div className="tech-footer-container">
        
        {/* Connection status tag */}
        <div className="tech-footer-brand">
          <span className="brand-status-dot online"></span>
          <span className="brand-text">SYS.SPECIAL_TOUR: ACTIVE_MODE // v7.0</span>
        </div>

        {/* Technical navigation links */}
        <nav className="tech-footer-links" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {navLinks.map((link, idx) => {
            const isActive = link.href === `/special-tour/${tourneyId}` || link.href === "/special-tour"
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <span key={link.href} style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem" }}>
                {idx > 0 && <span className="sep">//</span>}
                <Link 
                  href={link.href}
                  className={isActive ? "active" : ""}
                >
                  [ {link.label} ]
                </Link>
              </span>
            );
          })}
        </nav>

        {/* System copyright/info */}
        <div className="tech-footer-info">
          <span>&copy; {new Date().getFullYear()} R2G.SYSTEMS</span>
        </div>

      </div>
    </footer>
  );
}
