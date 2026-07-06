"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RwsFooter() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/rws", label: "DASHBOARD" },
    { href: "/rws/selected-candidates", label: "CANDIDATES" },
    { href: "/rws/fixtures", label: "FIXTURES" },
    { href: "/rws/album", label: "ALBUM" },
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
            const isActive = link.href === "/rws" ? pathname === "/rws" : pathname.startsWith(link.href);
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
