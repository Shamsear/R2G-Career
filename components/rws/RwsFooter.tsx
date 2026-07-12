"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RwsFooter() {
  const pathname = usePathname();

  const segments = pathname.split("/");
  const yearSegment = segments[2];
  const hasYear = yearSegment && /^\d+$/.test(yearSegment);
  const year = hasYear ? yearSegment : "";

  const navLinks = hasYear ? [
    { href: `/rws/${year}`, label: "DASHBOARD" },
    { href: `/rws/${year}/selected-candidates`, label: "CANDIDATES" },
    { href: `/rws/${year}/tournament`, label: "TOURNAMENT" },
    { href: `/rws/${year}/album`, label: "ALBUM" },
  ] : [
    { href: "/rws", label: "DASHBOARD" },
  ];

  return (
    <footer className="tech-footer">
      <div className="tech-footer-container">
        
        {/* Connection status tag */}
        <div className="tech-footer-status">
          <span className="tech-status-dot pulse"></span>
          <span className="tech-status-text">SYS.RWS: ACTIVE_MODE</span>
        </div>

        {/* Technical navigation links */}
        <div className="tech-footer-links">
          {navLinks.map((link, idx) => {
            const isActive = link.href === `/rws/${year}` || link.href === "/rws"
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <span key={link.href}>
                {idx > 0 && <span className="tech-divider">//</span>}
                <Link 
                  href={link.href}
                  className={`tech-footer-link ${isActive ? "active" : ""}`}
                >
                  [ {link.label} ]
                </Link>
              </span>
            );
          })}
        </div>

        {/* System copyright/info */}
        <div className="tech-footer-info">
          <span>&copy; {new Date().getFullYear()} R2G.WORLD_SERIES // V7.0</span>
        </div>

      </div>
    </footer>
  );
}
