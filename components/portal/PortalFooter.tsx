"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PortalFooter() {
  const pathname = usePathname();
  
  // Hide the footer entirely on the root portal page
  if (pathname === "/") return null;

  const isPlayerPage = pathname.startsWith("/members");

  return (
    <footer className="tech-footer">
      <div className="tech-footer-container">
        <div className="tech-footer-brand">
          <span className="brand-status-dot online"></span>
          <span className="brand-text">
            SYS.R2G.MEMBER // v7.0.2
          </span>
        </div>
        
        {isPlayerPage && (
          <nav className="tech-footer-links">
            <Link href="/">[ PORTAL ]</Link>
            <span className="sep">//</span>
            <Link href="/members">[ DIRECTORY ]</Link>
          </nav>
        )}

        <div className="tech-footer-info">
          <span>&copy; {new Date().getFullYear()} R2G.SYSTEMS</span>
        </div>
      </div>
    </footer>
  );
}
