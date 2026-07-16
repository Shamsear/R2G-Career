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
        <div className="tech-footer-brand">
          <span className="brand-status-dot online"></span>
          <span className="brand-text">SYS.RWS: ACTIVE_MODE // v7.0</span>
        </div>

        {/* Technical navigation links */}
        <nav className="tech-footer-links" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {navLinks.map((link, idx) => {
            const isActive = link.href === `/rws/${year}` || link.href === "/rws"
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
