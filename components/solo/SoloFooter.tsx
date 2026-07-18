"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  
  // Hide the footer entirely on the root portal page
  if (pathname === "/") return null;

  const isTeamTour = pathname.startsWith("/team-tour");
  const isPlayerPage = pathname.startsWith("/members");
  const prefix = isTeamTour ? "/team-tour" : "/solo-tour";

  return (
    <footer className="tech-footer">
      <div className="tech-footer-container">
        <div className="tech-footer-brand">
          <span className="brand-status-dot online"></span>
          <span className="brand-text">
            {isPlayerPage ? "SYS.R2G.MEMBER" : isTeamTour ? "SYS.R2G.TEAM" : "SYS.R2G.SOLO"} // v7.0.2
          </span>
        </div>
        
        {!isPlayerPage && (
          <nav className="tech-footer-links">
            <Link href="/">[ PORTAL ]</Link>
            <span className="sep">//</span>
            <Link href={prefix}>[ HUB ]</Link>
            <span className="sep">//</span>
            <Link href={`${prefix}/tournament-guide`}>[ GUIDE ]</Link>
            <span className="sep">//</span>
            <Link href={`${prefix}/career-mode`}>[ CAREER ]</Link>
          </nav>
        )}

        <div className="tech-footer-info">
          <span>&copy; {new Date().getFullYear()} R2G.SYSTEMS</span>
        </div>
      </div>
    </footer>
  );
}
