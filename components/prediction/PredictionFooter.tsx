"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PredictionFooter() {
  const pathname = usePathname();

  const segments = pathname.split("/");
  const seasonIdSegment = segments[2];
  const hasSeasonId = seasonIdSegment && /^\d+$/.test(seasonIdSegment);
  const seasonId = hasSeasonId ? seasonIdSegment : "";

  const navLinks = hasSeasonId
    ? [
        { href: "/master-of-prediction", label: "SEASONS ARCHIVE" },
        { href: `/master-of-prediction/${seasonId}`, label: "STANDINGS HUB" },
      ]
    : [
        { href: "/master-of-prediction", label: "SEASONS ARCHIVE" },
      ];

  return (
    <footer className="tech-footer">
      <div className="tech-footer-container">
        
        {/* Connection status tag */}
        <div className="tech-footer-brand">
          <span className="brand-status-dot online"></span>
          <span className="brand-text">SYS.PREDICTION: ACTIVE_MODE // v7.0</span>
        </div>

        {/* Technical navigation links */}
        <nav className="tech-footer-links">
          {navLinks.map((link, idx) => {
            const isActive =
              link.href === `/master-of-prediction/${seasonId}` || link.href === "/master-of-prediction"
                ? pathname === link.href
                : pathname.startsWith(link.href);
            return (
              <span key={link.href} className="tech-footer-link-item">
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
